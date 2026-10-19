// Regroups the caption words that captions.mjs wrote into compositions/captions.html into
// longer phrases. captions.mjs caps a group at 2–4 words and splits at every comma, so
// captions flip several times a second and pull the eye off the picture (both newcomer
// reviews of the explainer said so). Here a group runs to a sentence end, a pause or a
// frame change, and a run longer than one line splits at its most natural break.
//
// Run from the film's folder after captions.mjs build. Rewrites the GROUPS array in
// captions.html and caption_groups.json; reads only the words, so it is idempotent.
import fs from 'node:fs';

// one line of the 48px caption chip holds about 64 characters (two lines in portrait)
const MAX_WORDS = 12;
const MAX_CHARS = 60;
const ORPHAN_WORDS = 2;
const MIN_SHOW_S = 1.0;
const PAUSE_S = 0.35;
const LONG_PAUSE_S = 1.2;
const MIN_WORDS = 3;
const SENT_END = /[.?!]$/;

const HTML = 'compositions/captions.html';
const JSON_OUT = 'caption_groups.json';
const html = fs.readFileSync(HTML, 'utf8');
const m = /var GROUPS = (\[.*?\]);\n/s.exec(html);
if (!m) throw new Error(`${HTML}: no "var GROUPS = [...]" to regroup`);

const words = JSON.parse(m[1]).flatMap(g => g.words.map(w => ({ ...w, frame: g.frame })));
const textOf = ws => ws.map(x => x.text).join(' ');
const fits = ws => ws.length <= MAX_WORDS && textOf(ws).length <= MAX_CHARS;

// 1. Runs: a run ends at a sentence end, a frame change, or a pause at a clause boundary.
// Whisper hears short pauses inside clauses ("its own | key"); a subtitle stays up through
// those, so only a pause after a comma or before a joining word splits, or a long silence.
const JOINERS = /^(and|but|or|so|then|while|when|if|because|to|with|for|from|on|in|at|into|than|that|which)$/i;
const runs = [];
let cur = null;
words.forEach((w, i) => {
  const prev = cur?.words.at(-1);
  const endsSoon = SENT_END.test(w.text) || SENT_END.test(words[i + 1]?.text ?? '');
  const gap = prev ? w.start - prev.end : 0;
  const atClause = prev && (/[,;:]$/.test(prev.text) || JOINERS.test(w.text));
  const pause = prev && cur.words.length >= MIN_WORDS && !endsSoon
    && ((gap > PAUSE_S && atClause) || gap > LONG_PAUSE_S);
  if (!cur || w.frame !== cur.frame || pause) runs.push(cur = { frame: w.frame, words: [] });
  cur.words.push(w);
  if (SENT_END.test(w.text)) cur = null;
});

// 2. A run too long for one line splits where a reader would pause: after a comma first,
// then before a joining word, never inside a phrase like "no daily | cap". Among equal
// breaks the most even split wins, and each side splits again until it fits.
const breakCost = (ws, i) => {
  const kind = /[,;:]$/.test(ws[i - 1].text) ? 0 : JOINERS.test(ws[i].text) ? 1 : 3;
  const left = textOf(ws.slice(0, i)).length;
  const right = textOf(ws.slice(i)).length;
  return kind + 1.5 * Math.abs(left - right) / (left + right);
};
const split = ws => {
  if (fits(ws) || ws.length < 4) return [ws];
  let best = 2;
  for (let i = 2; i <= ws.length - 2; i++) if (breakCost(ws, i) < breakCost(ws, best)) best = i;
  return [...split(ws.slice(0, best)), ...split(ws.slice(best))];
};
const groups = runs.flatMap(r => split(r.words).map(ws => ({ frame: r.frame, words: ws })));

// A phrase of one or two words, or one spoken in under a second ("Use three,"), flashes by.
// It joins the next phrase of its sentence, or else the one before when that one has not
// ended its sentence, as long as the two still fit about one line.
const spoken = ws => ws.at(-1).end - ws[0].start;
const short = g => g.words.length <= ORPHAN_WORDS || spoken(g.words) < MIN_SHOW_S;
const joinable = (a, b) => a.frame === b.frame && !SENT_END.test(a.words.at(-1).text)
  && b.words[0].start - a.words.at(-1).end < 0.6
  && textOf([...a.words, ...b.words]).length <= MAX_CHARS + 10;
const merged = groups.filter(x => x.words.length);
for (let i = 0; i < merged.length; i++) {
  const g = merged[i];
  if (!short(g)) continue;
  const next = merged[i + 1];
  const prev = merged[i - 1];
  if (next && joinable(g, next)) { next.words.unshift(...g.words); merged.splice(i--, 1); }
  else if (prev && joinable(prev, g)) { prev.words.push(...g.words); merged.splice(i--, 1); }
}

const out = merged.map((g, gi) => ({
  id: `caption-group-${gi}`,
  frame: g.frame,
  start: g.words[0].start,
  end: g.words.at(-1).end,
  text: g.words.map(w => w.text).join(' '),
  words: g.words.map((w, wi) => ({ id: `caption-word-${gi}-${wi}`, text: w.text, start: w.start, end: w.end })),
}));

fs.writeFileSync(HTML, html.replace(m[0], `var GROUPS = ${JSON.stringify(out).replace(/</g, '\\u003c')};\n`));
const meta = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8'));
fs.writeFileSync(JSON_OUT, JSON.stringify({ ...meta, groups: out }, null, 2));
console.log(`✓ captions regrouped: ${words.length} words → ${out.length} groups (was ${JSON.parse(m[1]).length})`);
