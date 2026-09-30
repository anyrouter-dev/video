/**
 * changelog — one film per day of AnyRouter changelog entries.
 *
 * Facts come from the hand-written "Model releases" section of
 * anyrouter.dev/llms.txt (see entries.mjs). Unlike model-drop this is not a
 * mechanical catalog diff: each entry is a note somebody wrote.
 *
 *   1 entry      hero     one card, date kicker, big title, first sentence
 *   2..4         cards    one card per entry, back-to-back
 *   >= 5         cards    capped at --limit (default 4); the CTA says "+N more"
 *
 *   --from=FILE   read a saved llms.txt instead of the network
 *   --date=DAY    film that day (YYYY-MM-DD); default is the newest day
 *   --limit=N     cap the entries shown        --seconds=N   film length
 *
 * A retirement must not look like a launch: `disabled` entries get a quiet,
 * dashed, muted card with a "Disabled" tag.
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, slug, igniteScene, ctaScene, IGNITE, CTA } from '../../lib/film.mjs';
import { sectionOf, parseEntries, latestBatch } from './entries.mjs';

const LLMS = 'https://anyrouter.dev/llms.txt';
const SCORE = { short: { file: 'audio/score.wav', max: 20 }, long: { file: 'audio/score-30s.wav', max: 30 } };
const WORD_SECONDS = 0.3;   // reading time per on-screen word
const CARD_SECONDS = 1;     // plus this much per card for the entrance and exit
const DEFAULT_LIMIT = 4;

const CSS = `
  .card{width:min(1440px,90vw);background:linear-gradient(180deg,#171717,#101010);
    border:1px solid var(--line);border-radius:32px;padding:64px 80px;
    box-shadow:0 60px 150px rgba(0,0,0,.72);transform-style:preserve-3d}
  .card.compact{width:min(1320px,86vw);padding:56px 68px}
  .krow{display:flex;align-items:center;gap:20px;margin-bottom:28px}
  .date{font-family:'ArMono',monospace;font-size:28px;color:var(--gold)}
  .tag{font-size:18px;letter-spacing:.26em;text-transform:uppercase;font-weight:600;
    padding:8px 18px;border-radius:999px;border:1px solid var(--primary);color:var(--primary)}
  .pos{margin-left:auto;font-family:'ArMono',monospace;font-size:26px;color:var(--muted)}
  .ttl{font-weight:700;letter-spacing:-.04em;line-height:1.2;max-width:34ch;overflow-wrap:anywhere}
  .ttl.t1{font-size:96px}.ttl.t2{font-size:76px}.ttl.t3{font-size:60px}.ttl.t4{font-size:50px}
  .card.compact .ttl.t1{font-size:92px}.card.compact .ttl.t2{font-size:74px}
  .card.compact .ttl.t3{font-size:60px}.card.compact .ttl.t4{font-size:50px}
  .ex{font-size:30px;line-height:1.45;color:var(--muted);margin-top:34px;max-width:52ch}
  .card.compact .ex{font-size:32px;margin-top:30px}
  .card.off{background:linear-gradient(180deg,#141414,#0F0F0F);border:2px dashed rgba(161,161,161,.45)}
  .card.off .date{color:var(--muted)}
  .card.off .tag{border-color:var(--muted);color:var(--muted)}
  .card.off .ttl{color:var(--muted)}`;

/** First sentence of a summary, cut at a word boundary if it still runs long. */
export function firstSentence(text, max = 240) {
  const s = String(text).trim();
  const m = /[.!?](?=\s|$)/.exec(s);
  const one = m ? s.slice(0, m.index + 1) : s;
  if (one.length <= max) return one;
  const cut = one.slice(0, max).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '');
  return `${cut}…`;
}

const titleClass = t => `t${t.length <= 28 ? 1 : t.length <= 48 ? 2 : t.length <= 72 ? 3 : 4}`;
const words = s => String(s).split(/\s+/).filter(Boolean).length;
// The slug only says whether an entry is a retirement. Everything else is an
// update — a feature note is not a model that was "added".
const tagOf = e => (e.type === 'disabled' ? 'Disabled' : 'Update');
const cls = e => (e.type === 'disabled' ? ' off' : '');

const heroScene = (e, duration) => ({
  id: `s01-${slug(e.slug)}`, start: IGNITE, dur: +(duration - CTA - IGNITE).toFixed(3),
  body: `<div class="card${cls(e)}">
    <div class="krow"><span class="date">${esc(e.date)}</span><span class="tag">${tagOf(e)}</span></div>
    <h1 class="ttl ${titleClass(e.title)}">${esc(e.title)}</h1>
    <p class="ex">${esc(firstSentence(e.summary, 260))}</p>
  </div>`,
  inner: `tl.from("#content > .card",{scale:.84,rotateY:-32,z:-460,duration:.44,ease:"expo.out"},0);
     tl.from("#content .ttl",{y:56,duration:.38,ease:"power3.out"},.10);
     tl.from("#content .krow,#content .ex",{opacity:0,y:30,stagger:.06,duration:.32,ease:"power3.out"},.18);`,
});

const cardScenes = (list, duration) => {
  const ctaAt = +(duration - CTA).toFixed(3);
  const slot = +((ctaAt - IGNITE) / list.length).toFixed(3);
  return list.map((e, i) => ({
    id: `s${String(i + 1).padStart(2, '0')}-${slug(e.slug)}`,
    start: +(IGNITE + i * slot).toFixed(3),
    dur: slot,                       // back-to-back: end == next start
    body: `<div class="card compact${cls(e)}">
      <div class="krow"><span class="date">${esc(e.date)}</span><span class="tag">${tagOf(e)}</span>
        <span class="pos">${String(i + 1).padStart(2, '0')}</span></div>
      <h2 class="ttl ${titleClass(e.title)}">${esc(e.title)}</h2>
      <p class="ex">${esc(firstSentence(e.summary, 130))}</p>
    </div>`,
    inner: `tl.from("#content > .card",{scale:.82,rotateY:-34,z:-440,duration:.40,ease:"expo.out"},0);
       tl.from("#content .krow,#content .ttl,#content .ex",{opacity:0,y:26,stagger:.05,duration:.30,ease:"power3.out"},.12);
       tl.to("#content > .card",{scale:1.10,rotateY:22,duration:.16,ease:"power2.in"},
          ${Math.max(0, slot - 0.16).toFixed(3)});`,
  }));
};

export default {
  id: 'changelog',
  title: 'Changelog',
  scheduled: true,

  async collect({ flags }) {
    let text;
    if (flags.from) {
      text = fs.readFileSync(path.resolve(flags.from), 'utf8');
    } else {
      const r = await fetch(LLMS);
      if (!r.ok) throw new Error(`${LLMS} → HTTP ${r.status}`);
      text = await r.text();
    }
    if (sectionOf(text) === null) throw new Error('llms.txt has no "## Model releases" section — refusing to film nothing');
    if (flags.date && !/^\d{4}-\d{2}-\d{2}$/.test(flags.date)) throw new Error(`--date must be YYYY-MM-DD, got "${flags.date}"`);

    const all = parseEntries(text);
    const entries = latestBatch(all, flags.date);
    const date = entries[0]?.date ?? flags.date ?? null;
    console.log(entries.length
      ? `changelog ${date} — ${entries.length} of ${all.length} entries\n${entries.map(e => `  [${e.type}] ${e.title}`).join('\n')}`
      : `changelog — no entries${flags.date ? ` on ${flags.date}` : ''} (${all.length} in the section)`);
    return {
      notable: entries.length > 0, label: date, parts: entries.map(e => e.slug),
      date, entries, total: entries.length,
    };
  },

  film(data, { plan = {}, flags = {} }) {
    const limit = parseInt(flags.limit ?? plan.limit ?? 0, 10) || DEFAULT_LIMIT;
    const shown = data.entries.slice(0, limit);
    if (!shown.length) throw new Error('no changelog entries to film');
    const layout = shown.length === 1 ? 'hero' : 'cards';

    // Length: 20s unless the words need more; an explicit --seconds always wins.
    const cap = layout === 'hero' ? 260 : 130;
    const need = shown.reduce((t, e) =>
      t + WORD_SECONDS * (words(e.title) + words(firstSentence(e.summary, cap))) + CARD_SECONDS, 0);
    const explicit = flags.seconds ?? plan.seconds;
    const duration = explicit != null ? parseFloat(explicit)
      : need + IGNITE + CTA <= SCORE.short.max ? SCORE.short.max : SCORE.long.max;
    if (!(duration > IGNITE + CTA)) throw new Error(`--seconds=${explicit} is too short for a film`);
    if (duration > SCORE.long.max) throw new Error(`--seconds=${explicit} is longer than the ${SCORE.long.max}s score`);
    const music = duration <= SCORE.short.max ? SCORE.short.file : SCORE.long.file;

    const content = layout === 'hero' ? [heroScene(shown[0], duration)] : cardScenes(shown, duration);
    const more = data.total - shown.length;
    const n = data.total;
    const cta = ctaScene(duration, {
      kicker: n === 1 ? 'Changelog' : `${n} changelog updates${more > 0 ? ` · +${more} more` : ''}`,
      big: esc(data.date),
      sub: `<b>${n}</b> update${n === 1 ? '' : 's'} · anyrouter.dev/blog/releases`,
    });

    return {
      title: 'AnyRouter — changelog',
      duration, music, css: CSS,
      scenes: [igniteScene(), ...content, cta],
      summary: `${layout}  (${shown.length} of ${n} entr${n === 1 ? 'y' : 'ies'}, ${duration}s, needs ~${need.toFixed(1)}s)`,
    };
  },

  headline(data, plan = {}) {
    if (plan.headline) return plan.headline;
    const { entries } = data;
    if (entries.length === 1) return entries[0].title;
    const rest = entries.length - 2;
    return `${entries.length} changelog updates: ${entries.slice(0, 2).map(e => e.title).join(', ')}${rest > 0 ? ` +${rest} more` : ''}`;
  },

  notes(data, plan = {}) {
    return [
      plan.share,
      ...data.entries.map(e => `- **${e.title}** — ${e.summary} ([link](${e.link}))`),
    ].filter(Boolean);
  },
};
