/**
 * release — one film per AnyRouter product release ("AnyRouter 1.6").
 *
 * Facts come from the public changelog feed; every word on screen is the
 * feed's, escaped. The film is a version hero, one card per highlight, then the
 * shared closing call to action.
 *
 *   --from=FILE      read a saved feed instead of the network
 *   --version=1.6.0  film that release instead of the newest
 *   --limit=N        cap the highlights (default 5)
 *   --seconds=N      film length (default 30; up to 20s uses the 20s score)
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, igniteScene, ctaScene, IGNITE, CTA } from '../../lib/film.mjs';
import { parseFeed } from './feed.mjs';

export const FEED = 'https://anyrouter.dev/changelog/rss.xml';
const DEFAULT_SECONDS = 30;
const DEFAULT_LIMIT = 5;
const SCORE_30 = 'audio/score-30s.wav';   // 30.0s — a film must not outlast its score
const SHORT_FILM = 20;                    // the default score covers this much

/** First sentence: a sentence ends at . ! ? followed by a space and anything ("GPT-6.1 Sol" has no space after its dot). */
export const firstSentence = s => String(s).split(/(?<=[.!?])\s+(?=\S)/)[0].trim();

const words = s => String(s).split(/\s+/).filter(Boolean).length;
/** Seconds a reader needs: about 0.3s a word plus a second to land. */
export const readTime = text => 1 + 0.3 * words(text);

/** "AnyRouter 1.6: name a model…" → { name: "AnyRouter 1.6", tail: "name a model…" } */
export function splitHeadline(rel) {
  const i = rel.headline.indexOf(':');
  if (i < 0) return { name: rel.headline, tail: '' };
  return { name: rel.headline.slice(0, i).trim(), tail: rel.headline.slice(i + 1).trim() };
}

const sizeOf = text => (text.length <= 90 ? 'l' : text.length <= 150 ? 'm' : 's');

const CSS = `
  .card{width:min(1440px,90vw);background:linear-gradient(180deg,#171717,#101010);
    border:1px solid var(--line);border-radius:32px;padding:70px 80px;
    box-shadow:0 60px 150px rgba(0,0,0,.72);transform-style:preserve-3d}
  .lrow{display:flex;align-items:center;gap:18px;margin-bottom:30px}
  .kick{font-size:22px;letter-spacing:.30em;text-transform:uppercase;color:var(--primary);font-weight:600}
  .rank{margin-left:auto;font-family:'ArMono',monospace;font-size:34px;font-weight:700;
    letter-spacing:-.02em;color:var(--muted)}
  .ver{font-size:150px;font-weight:700;letter-spacing:-.05em;line-height:1.02;
    background:linear-gradient(96deg,#FAFAFA,#FFD230);-webkit-background-clip:text;
    background-clip:text;color:transparent}
  .tail{font-size:50px;font-weight:600;letter-spacing:-.02em;line-height:1.25;margin-top:30px;max-width:30ch;text-wrap:balance}
  .date{font-family:'ArMono',monospace;font-size:30px;color:var(--gold);margin-top:34px}
  .line{font-weight:600;letter-spacing:-.025em;line-height:1.25;max-width:34ch;text-wrap:balance}
  .line.l{font-size:64px}.line.m{font-size:54px}.line.s{font-size:46px}
  .src{font-family:'ArMono',monospace;font-size:26px;color:var(--gold);margin-top:34px}`;

/** Scene lengths that fit the window: each gets its reading time, scaled up to fill the window exactly. */
function slots(texts, window) {
  const need = texts.map(readTime);
  const scale = window / need.reduce((a, b) => a + b, 0);
  const durs = need.map(n => +(n * scale).toFixed(3));
  durs[durs.length - 1] = +(window - durs.slice(0, -1).reduce((a, b) => a + b, 0)).toFixed(3);
  return durs;
}

const enter = slot => `tl.from("#content > .card",{scale:.84,rotateY:-32,z:-460,duration:.44,ease:"expo.out"},0);
     tl.from("#content .kick,#content .ver,#content .tail,#content .date,#content .line,#content .src",
        {opacity:0,y:30,stagger:.06,duration:.32,ease:"power3.out"},.14);
     tl.to("#content > .card",{scale:1.06,rotateY:14,duration:.16,ease:"power2.in"},${Math.max(0, slot - 0.16).toFixed(3)});`;

/** Highlights that fit on screen: drop the tail until every one can be read. */
function fit(rel, texts, window) {
  const kept = [...texts];
  while (kept.length > 1 && kept.reduce((a, t) => a + readTime(t), 0) > window) kept.pop();
  return kept;
}

function report(rel) {
  return [
    `version         ${rel.version}   (${rel.date ?? 'undated'})`,
    `headline        ${rel.headline}`,
    `link            ${rel.link}`,
    `highlights      ${rel.highlights.length}`,
    ...rel.highlights.map(h => `  • ${h.theme ? `${h.theme}: ` : ''}${firstSentence(h.line)}`),
  ].join('\n');
}

export default {
  id: 'release',
  title: 'Release',
  scheduled: true,

  async collect({ flags }) {
    let xml;
    if (flags.from) {
      xml = fs.readFileSync(path.resolve(flags.from), 'utf8');
    } else {
      const r = await fetch(FEED);
      if (!r.ok) throw new Error(`${FEED} → HTTP ${r.status}`);
      xml = await r.text();
    }
    const items = parseFeed(xml);
    if (!items.length) {
      if (/<item[\s>]/i.test(xml)) throw new Error('changelog feed has items but none could be parsed');
      return { notable: false, label: 'none', parts: [] };
    }
    const want = flags.version ? String(flags.version) : null;
    const rel = want ? items.find(i => i.version === want) : items[0];
    if (!rel) throw new Error(`no release "${want}" in the feed — have ${items.map(i => i.version).join(', ')}`);
    console.log(report(rel));
    // Identity is the version alone: editing a release's copy later must not re-film it.
    return { notable: true, label: `v${rel.version}`, parts: [`release:${rel.version}`], ...rel };
  },

  film(rel, { plan = {}, flags = {} }) {
    const duration = parseFloat(flags.seconds ?? plan.seconds ?? DEFAULT_SECONDS);
    const limit = parseInt(flags.limit ?? plan.limit ?? DEFAULT_LIMIT, 10);
    const { name, tail } = splitHeadline(rel);
    const heroTail = tail || firstSentence(rel.summary);
    const window = duration - IGNITE - CTA;

    const picked = rel.highlights.slice(0, limit);
    const kept = fit(rel, [heroTail, ...picked.map(h => firstSentence(h.line))], window).slice(1);
    const hl = picked.slice(0, kept.length);
    const durs = slots([heroTail, ...hl.map(h => firstSentence(h.line))], window);

    let at = IGNITE;
    const place = i => { const s = +at.toFixed(3); at += durs[i]; return { start: s, dur: durs[i] }; };

    const hero = {
      id: 's01-release', ...place(0),
      body: `<div class="card">
      <div class="lrow"><span class="kick">New release</span></div>
      <h1 class="ver">${esc(name)}</h1>
      ${heroTail ? `<p class="tail">${esc(heroTail)}</p>` : ''}
      ${rel.date ? `<div class="date">${esc(rel.date)}</div>` : ''}
    </div>`,
      inner: enter(durs[0]),
    };

    const scenes = hl.map((h, i) => {
      const line = firstSentence(h.line);
      return {
        id: `s${String(i + 2).padStart(2, '0')}-highlight`, ...place(i + 1),
        body: `<div class="card">
      <div class="lrow"><span class="kick">${esc(h.theme ?? `v${rel.version}`)}</span>
        <span class="rank">${String(i + 1).padStart(2, '0')} / ${String(hl.length).padStart(2, '0')}</span></div>
      <p class="line ${sizeOf(line)}">${esc(line)}</p>
    </div>`,
        inner: enter(durs[i + 1]),
      };
    });

    return {
      title: `AnyRouter — ${name}`,
      duration,
      css: CSS,
      ...(duration > SHORT_FILM ? { music: SCORE_30 } : {}),
      scenes: [igniteScene(), hero, ...scenes, ctaScene(duration, {
        kicker: 'Out now',
        big: esc(name),
        sub: `<b>${esc(rel.date ?? `v${rel.version}`)}</b> · anyrouter.dev/changelog/${esc(rel.version)}`,
      })],
      summary: `${name} · hero + ${hl.length} of ${rel.highlights.length} highlight${rel.highlights.length === 1 ? '' : 's'}`,
    };
  },

  headline(rel, plan = {}) {
    return plan.headline ?? rel.headline;
  },

  notes(rel, plan = {}) {
    return [
      plan.share,
      rel.summary,
      rel.highlights.length && rel.highlights
        .map(h => `- ${h.theme ? `**${h.theme}:** ` : ''}${h.href ? `[${h.line}](${h.href})` : h.line}`).join('\n'),
      `Full changelog: ${rel.link}`,
    ].filter(Boolean);
  },
};
