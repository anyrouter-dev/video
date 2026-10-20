/**
 * reflow: a window's code reset so every line sits on one row of `cols`
 * characters, and is still valid code. Never a soft wrap: a line too wide for
 * its row is rewritten the way a person would format it narrower.
 *
 *   indents     halved, then quartered, across the window, which keeps its structure
 *   shell       a command continued onto the next row with " \", a quoted
 *               word kept whole, a pipe kept with what it feeds
 *   arrays      a JSON or JS array one item per row
 *   objects     an object literal written on one line, one field per row
 *   paths       a "A → B → C" path one step per row
 *
 * A line no rewrite fits is dropped when it is context that stands alone (a
 * whole field, a whole shell option), context after the command, or leading
 * context before it; otherwise the window does not fit at this width. Indents
 * are halved first, then quartered.
 * A line is { text, focus?, keep?, cont? }: rows a rewrite makes keep its
 * focus and keep, and a shell row that continues a command is `cont`.
 */
const indentOf = text => text.match(/^ */)[0].length;
const sp = n => ' '.repeat(n);

/** Words of a shell line, a quoted string one word, a "|" joined to the word after it. */
function shellWords(text) {
  const words = [];
  for (const m of text.trim().matchAll(/(?:"[^"]*"|'[^']*'|[^\s"'])+/g)) words.push(m[0]);
  for (let i = words.length - 2; i >= 0; i--) if (words[i] === '|') words.splice(i, 2, `| ${words[i + 1]}`);
  return words;
}

/** Items of a list split at its top-level commas: none inside quotes, brackets or braces. */
function topLevel(s) {
  const out = [];
  let depth = 0, quote = null, from = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote && s[i - 1] !== '\\') quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if ('[{('.includes(c)) depth++;
    else if (']})'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { out.push(s.slice(from, i).trim()); from = i + 1; }
  }
  const last = s.slice(from).trim();
  if (last) out.push(last);
  return out;
}

/** The rewrites of one line, narrowest last; each a list of row texts. */
function rewrites(text, { shell }) {
  const ind = indentOf(text), body = text.trim(), out = [];
  const shellish = shell || /\s\\$/.test(text) || /^(curl|-[A-Za-z])\b/.test(body);
  if (shellish) {
    const words = shellWords(body), tail = words.at(-1) === '\\' ? words.pop() : null;
    // continuation rows sit two in, or at the line's own indent when a word needs those two
    for (const next of shell ? [2, 0] : [ind + 2, ind]) out.push(cols => {
      const rows = [];
      let row = '';
      for (const w of words) {
        const cand = row ? `${row} ${w}` : `${sp(rows.length ? next : ind)}${w}`;
        const limit = cols - 2 - (shell && !rows.length ? 2 : 0);
        if (row && cand.length > limit) { rows.push(`${row} \\`); row = `${sp(next)}${w}`; }
        else row = cand;
      }
      rows.push(tail ? `${row} ${tail}` : row);
      return rows;
    });
  }
  const arr = body.match(/^(.*?)\[(.*)\](,?)$/);
  if (arr && !/^\{/.test(arr[2].trim())) {
    const items = topLevel(arr[2]);
    if (items.length > 1) out.push(() => [`${sp(ind)}${arr[1]}[`, ...items.map((it, i) => `${sp(ind + 2)}${it}${i < items.length - 1 ? ',' : ''}`), `${sp(ind)}]${arr[3]}`]);
  }
  const obj = body.match(/^(.*?)(\[?)\{\s*(.*?)\s*\}(\]?)(,?)$/);
  if (obj) {
    const fields = topLevel(obj[3]);
    if (fields.length > 1) out.push(() => [`${sp(ind)}${obj[1]}${obj[2]}{`, ...fields.map((f, i) => `${sp(ind + 2)}${f}${i < fields.length - 1 ? ',' : ''}`), `${sp(ind)}}${obj[4]}${obj[5]}`]);
  }
  if (body.includes(' → ')) {
    const steps = body.split(' → ');
    out.push(() => steps.map((s, i) => `${sp(i ? ind + 2 : ind)}${s}${i < steps.length - 1 ? ' →' : ''}`));
  }
  return out;
}

/**
 * The window's lines with every one on a row of `cols` characters, or null.
 * `width(line, text)` is how many characters `text` takes on its row as that
 * line: its prompt, the widest id that rolls into it, the caret.
 */
export function reflow(lines, cols, { shell = false, width = (l, t) => t.length } = {}) {
  const fits = (l, t) => width(l, t) <= cols;
  if (lines.every(l => fits(l, l.text))) return lines;
  // indents halved first, quartered if that is not enough
  for (const scale of [1 / 2, 1 / 4]) {
    const set = rewrite(lines.map(l => ({ ...l, text: sp(Math.floor(indentOf(l.text) * scale)) + l.text.trimStart() })), cols, { shell, fits });
    if (set) return set;
  }
  return null;
}

function rewrite(lines, cols, { shell, fits }) {
  const out = [];
  for (const l of lines) {
    if (fits(l, l.text)) { out.push(l); continue; }
    const rows = rewrites(l.text, { shell }).map(make => make(cols)).find(rs => rs.every((t, i) => fits({ ...l, cont: i > 0 }, t)));
    if (rows) { rows.forEach((t, i) => out.push({ ...l, text: t, cont: i > 0 })); continue; }
    // context that stands alone goes, and the code around it is still whole
    if (!l.focus && !l.keep && !shell && standsAlone(l.text)) continue;
    out.push({ ...l, text: null });
  }
  // a line that cannot be set otherwise is dropped as context: trailing context, or context leading the window
  const at = out.findIndex(l => l.focus), bad = out.map((l, i) => (l.text === null ? i : -1)).filter(i => i >= 0);
  if (bad.some(i => out[i].focus || out[i].keep || shell)) return null;
  const tail = bad.filter(i => i > at), head = bad.filter(i => i < at);
  let kept = tail.length ? out.slice(0, Math.min(...tail)) : out;
  if (head.length) {
    const cut = Math.max(...head);
    if (out.slice(0, cut).some(l => l.keep)) return null;
    kept = kept.slice(cut + 1);
  }
  return kept;
}

/**
 * Whether a line of context can go and leave the code around it valid: one
 * whole field of an object ("state": "…", or key: value) ending in a comma, or
 * one whole option of a continued shell command (-H "…" \).
 */
export function standsAlone(text) {
  const t = text.trim();
  const balanced = [...t.replace(/"[^"]*"|'[^']*'/g, '')].reduce((d, c) => d + ('[{('.includes(c) ? 1 : ']})'.includes(c) ? -1 : 0), 0) === 0;
  return balanced && (/^("[^"]*"|[A-Za-z_$][\w$]*)\s*:\s*\S.*,$/.test(t) || /^-[A-Za-z]\s+("[^"]*"|'[^']*')\s*\\$/.test(t));
}
