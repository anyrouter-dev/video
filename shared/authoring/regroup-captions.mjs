// Regroups the caption words that captions.mjs wrote into compositions/captions.html into
// longer phrases. captions.mjs caps a group at 2–4 words and splits at every comma, so
// captions flip several times a second and pull the eye off the picture (both newcomer
// reviews of the explainer said so). Here a group runs to a sentence end, a pause after at
// least MIN_WORDS, a frame change, or MAX_WORDS / MAX_CHARS (breaking at a comma when it
// can), whichever comes first.
//
// Run from the film's folder after captions.mjs build. Rewrites the GROUPS array in
// captions.html and caption_groups.json; reads only the words, so it is idempotent.
import fs from 'node:fs';

const MAX_WORDS = 7;
const MAX_CHARS = 42;
const PAUSE_S = 0.35;
const MIN_WORDS = 3;
const SENT_END = /[.?!]$/;

const HTML = 'compositions/captions.html';
const JSON_OUT = 'caption_groups.json';
const html = fs.readFileSync(HTML, 'utf8');
const m = /var GROUPS = (\[.*?\]);\n/s.exec(html);
if (!m) throw new Error(`${HTML}: no "var GROUPS = [...]" to regroup`);

const words = JSON.parse(m[1]).flatMap(g => g.words.map(w => ({ ...w, frame: g.frame })));
const groups = [];
let cur = null;
const textOf = ws => ws.map(x => x.text).join(' ');
for (const w of words) {
  const prev = cur?.words.at(-1);
  // A pause splits a phrase, except right before the word (or two) that ends the sentence.
  const endsSoon = SENT_END.test(w.text) || SENT_END.test(words[words.indexOf(w) + 1]?.text ?? '');
  const pause = prev && w.start - prev.end > PAUSE_S && cur.words.length >= MIN_WORDS && !endsSoon;
  if (cur && (w.frame !== cur.frame || pause)) cur = null;
  // A word that closes its clause may run one past the cap rather than be left dangling.
  const closes = /[.,!?;:]$/.test(w.text);
  const over = cur && (cur.words.length >= MAX_WORDS + (closes ? 1 : 0)
    || textOf([...cur.words, w]).length > MAX_CHARS + (closes ? 8 : 0));
  if (over) {
    // Over the cap: break after the group's last comma if there is one, not mid-phrase.
    const k = cur.words.findLastIndex((x, i) => i < cur.words.length - 1 && /,$/.test(x.text));
    const carried = k >= 0 ? cur.words.splice(k + 1) : [];
    groups.push(cur = { frame: w.frame, words: carried });
  }
  if (!cur) groups.push(cur = { frame: w.frame, words: [] });
  cur.words.push(w);
  if (SENT_END.test(w.text)) cur = null;
}

const out = groups.filter(Boolean).map((g, gi) => ({
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
