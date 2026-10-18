// Rewrites the transcribed narration words in audio_meta.json to the product's real
// spellings before captions are built. Whisper hears "AnyRouter" as "any router" and
// "anyr login" as "any Rlogin"; captions must show the names exactly as the product writes
// them. A rule matches consecutive words (case- and punctuation-insensitive) and replaces
// them, spreading the matched time span across the new words. Idempotent: the corrected
// spellings never match a rule again.
import fs from 'node:fs';

const RULES = [
  [['any', 'router.dev'], ['anyrouter.dev']],
  [['any', 'router'], ['AnyRouter']],
  [['any', 'rlogin'], ['anyr', 'login']],
  [['any', 'r', 'claude'], ['anyr', 'claude']],
  [['any', 'r', 'cloud'], ['anyr', 'claude']],
  [['any', 'r', 'clod'], ['anyr', 'claude']],
  [['clod'], ['Claude']],
  [['go', 'plan'], ['Go', 'plan']],
  [['open', 'router'], ['OpenRouter']],
  [['open', 'routers'], ["OpenRouter's"]],
  [['b', 'y', 'o', 'k'], ['BYOK']],
  [['step', '3'], ['Step', 'three']],
];

const bare = s => s.toLowerCase().replace(/^[^\w$]+|[^\w$.]+$/g, '').replace(/\.$/, '');
const trailing = s => /[.,!?;:]+$/.exec(s)?.[0] ?? '';

function fix(words) {
  const out = [];
  for (let i = 0; i < words.length;) {
    const rule = RULES.find(([from]) => from.every((f, k) => words[i + k] && bare(words[i + k].text) === f));
    if (!rule) { out.push(words[i++]); continue; }
    const [from, to] = rule;
    const span = words.slice(i, i + from.length);
    const start = span[0].start, end = span.at(-1).end, step = (end - start) / to.length;
    to.forEach((text, k) => out.push({
      ...span[0],
      id: `${span[0].id}-${k}`,
      text: k === to.length - 1 ? text + trailing(span.at(-1).text) : text,
      start: +(start + k * step).toFixed(3),
      end: +(start + (k + 1) * step).toFixed(3),
    }));
    i += from.length;
  }
  return out;
}

const meta = JSON.parse(fs.readFileSync('audio_meta.json', 'utf8'));
for (const v of meta.voices) {
  v.words = fix(v.words);
  const first = v.words[0];
  first.text = first.text[0].toUpperCase() + first.text.slice(1);
}
fs.writeFileSync('audio_meta.json', JSON.stringify(meta, null, 2));
for (const v of meta.voices) console.log(v.frame, v.words.map(w => w.text).join(' '));
