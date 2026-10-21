/**
 * weekly: "This week on AnyRouter", one narrated film per ISO week, set as a news page
 * (STYLE.md): the week on a calendar strip, the number of the week (models in the catalog
 * created that week) on an odometer, those models labelled free, BYOK or credits, the week's
 * changelog entries, then anyrouter.dev/changelog.
 *
 * A release is its week: the identity is the week alone, so the scheduled run makes one film a
 * week and a second run that week is already released. It films the last week that has ended
 * unless --week says otherwise, so the film always sees a whole week.
 *
 *   --week=YYYY-Www    the ISO week (default: the last full week before today, UTC)
 *   --from=FILE        a saved /api/v1/models?all=1 response
 *   --llms-from=FILE   a saved /llms.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHARED } from '../../lib/paths.mjs';
import { MODELS_API, lastFullWeek } from '../../lib/models.mjs';
import { writeProject } from '../../shared/authoring/film-project.mjs';
import { voicedLine, captionsOf } from '../../shared/authoring/narrate.mjs';
import { cueSheet } from '../../shared/authoring/mixdown.mjs';
import { weekOf, scriptOf, spanWords } from './week.mjs';
import { css, body, inner, C } from './scene.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const VOICE_DIR = path.join(DIR, 'voice');
const AUDIO = f => path.join(DIR, 'audio', f);
const LLMS = 'https://anyrouter.dev/llms.txt';
/** A news reader's voice: Kokoro's bf_emma, British English. */
export const VOICE = { engine: 'kokoro', id: 'bf_emma', speed: 1.0, lang: 'en-gb' };

// ── timing ─────────────────────────────────────────────────────────────────
const tenths = s => Math.round(s * 10) / 10;
const LEAD = 0.6, BETWEEN = 0.4, AFTER = 0.7, END_HOLD = 2.4;
// Each section shows at least this long: long enough to read what it puts on the page.
const MIN = { masthead: 5.2, number: 4.6, models: 4.0, changelog: 4.6, close: 4.4 };

export function storyOf(w, lines) {
  const order = ['masthead', 'number', 'models', 'changelog', 'close'];
  const beats = [], said = [];
  let t = 0;
  for (const key of order) {
    const mine = lines.filter(l => l.beat === key);
    if (!mine.length) continue;
    // a section with a list holds a beat longer per row so each row is read
    const rows = key === 'models' ? Math.min(w.models.length, 7) : key === 'changelog' ? Math.min(w.entries.length, 5) : 0;
    let at = t + LEAD + (key === 'masthead' ? 0.6 : key === 'close' ? 0.8 : 0);
    for (const l of mine) { said.push({ ...l, at: +at.toFixed(2) }); at += l.end + BETWEEN; }
    const dur = tenths(Math.max(MIN[key] + rows * 0.35, at - BETWEEN - t + (key === 'close' ? END_HOLD : AFTER)));
    beats.push({ key, at: tenths(t), dur });
    t = tenths(t + dur);
  }
  const at = k => beats.find(b => b.key === k);
  const sections = [{ sel: '.s-cal', at: 1.2 }];
  if (at('number')) sections.push({ sel: '.s-num', at: at('number').at });
  if (at('models')) sections.push({ sel: '.s-new', at: at('models').at });
  sections.push({ sel: '.s-log', at: at('changelog').at }, { sel: '.end', at: at('close').at });
  const marks = {
    tiles: [...Array(7).keys()].map(k => +(1.6 + k * 0.32).toFixed(2)),
    odo: at('number') ? +(at('number').at + 0.45).toFixed(2) : 0,
    rows: at('models') ? +(at('models').at + 0.7).toFixed(2) : 0,
    entries: +(at('changelog').at + 0.7).toFixed(2),
    end: +(at('close').at + 0.4).toFixed(2),
  };
  return { duration: t, beats, said, sections, at: marks, captions: said.flatMap(l => captionsOf(l.text, { at: l.at, start: l.start, end: l.end })) };
}

// ── sound ──────────────────────────────────────────────────────────────────
export const SOUNDS = {
  turnA: { file: AUDIO('page-turn-a.mp3'), gain: -9 },
  turnB: { file: AUDIO('page-turn-b.mp3'), gain: -9 },
  tile: { file: AUDIO('click-soft.mp3'), gain: -17, pitch: [1, 1.06, 1.12, 1.19, 1.26, 1.33, 1.41] },
  settle: { file: AUDIO('pop.mp3'), gain: -16 },
  close: { file: AUDIO('notification.mp3'), gain: -18, big: true },
};

export function cuesOf(s, w) {
  const ev = [];
  s.sections.slice(1).forEach((x, k) => ev.push({ event: k % 2 ? 'turnB' : 'turnA', at: x.at - 0.3 }));
  s.at.tiles.forEach(at => ev.push({ event: 'tile', at }));
  if (s.at.odo) ev.push({ event: 'settle', at: s.at.odo + 1.0 + (String(w.models.length).length - 1) * 0.2 });
  ev.push({ event: 'close', at: s.at.end - 0.1 });
  return cueSheet(ev, SOUNDS);
}

const MUSIC = { file: AUDIO('music.mp3'), offset: 0, gain: -13, duck: 10, fadeIn: 1.2, fadeOut: 2.8 };

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} answered HTTP ${r.status}`);
  return r.text();
}

export const voicedOf = w => scriptOf(w).map(l => ({ ...l, ...voicedLine(VOICE_DIR, VOICE, l.text, l.say, { kind: 'weekly' }) }));

export default {
  id: 'weekly',
  title: 'This week on AnyRouter',
  scheduled: false,
  audited: true,
  // the portrait fills the phone's height and keeps clear of the Shorts UI
  portraitFill: true,

  async collect({ flags }) {
    const week = flags.week ? String(flags.week) : lastFullWeek(Date.now());
    const doc = flags.from ? readJson(path.resolve(flags.from)) : JSON.parse(await fetchText(MODELS_API));
    const llms = flags['llms-from'] ? fs.readFileSync(path.resolve(flags['llms-from']), 'utf8') : await fetchText(LLMS);
    const w = weekOf(doc, llms, week);
    console.log(`  ${w.week}: ${w.from} to ${w.to}, ${w.models.length} models, ${w.entries.length} changelog entries`);
    for (const m of w.models) console.log(`    ${m.day}  ${m.id.padEnd(42)} ${m.billing}`);
    for (const e of w.entries) console.log(`    ${e.date}  ${e.type.padEnd(8)} ${e.title}`);
    // one film a week, however the week's facts change after it is made
    return { notable: true, label: w.week, parts: [`week:${w.week}`], ...w };
  },

  film(w) {
    const lines = voicedOf(w);
    const s = storyOf(w, lines);
    const t = { n: w.models.length, sections: s.sections, at: s.at, captions: s.captions, spanLabel: spanWords(w).toUpperCase() };
    return {
      title: `This week on AnyRouter: ${spanWords(w)}`,
      duration: s.duration,
      bg: C.paper,
      css: css(),
      fonts: [{ family: 'Newsreader', file: 'newsreader.woff2', weight: '200 800' }, { family: 'Inter', file: 'inter.woff2', weight: '100 900' }],
      assets: [{ from: path.join(SHARED, 'assets/brand/anyrouter-logo-black.svg'), to: 'assets/brand/anyrouter-logo-black.svg' }],
      scenes: [{ id: 's01-week', start: 0, dur: s.duration, body: body(w, t), inner: inner(t) }],
      sound: { music: MUSIC, voice: s.said.map(l => ({ file: l.file, at: l.at, start: l.start, end: l.end })), sfx: cuesOf(s, w) },
      beats: s.beats,
      claims: s.said.map(l => ({ says: l.text, at: l.at, from: l.from })),
      summary: `weekly ${w.week}: ${s.beats.map(b => `${b.key} ${b.dur}s`).join(' · ')}`,
    };
  },

  write: writeProject,

  headline: w => `This week on AnyRouter: ${spanWords(w)}`,

  notes: w => [
    `${w.models.length} models in the catalog created ${spanWords(w)}: ${['free', 'byok', 'credits'].map(b => `${w.models.filter(m => m.billing === b).length} ${b}`).join(', ')}.`,
    ...w.models.map(m => `${m.day}  ${m.id}  (${m.billing === 'byok' ? 'BYOK' : m.billing})`),
    `${w.entries.length} changelog entries.`,
    ...w.entries.map(e => `${e.date}  ${e.title}  ${e.link}`),
    'https://anyrouter.dev/changelog',
  ],

  link: () => 'https://anyrouter.dev/changelog',

  asset: entry => entry.label,

  /** The number of the week, settled. */
  coverAt: film => { const b = film.beats.find(x => x.key === 'number') ?? film.beats[0]; return +(b.at + b.dur - 0.4).toFixed(2); },
};
