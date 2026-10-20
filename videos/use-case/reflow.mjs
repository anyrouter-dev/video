/**
 * reflow: a window's code reset so every line sits on one row of `cols`
 * characters, and is still valid code. Never a soft wrap: a line too wide for
 * its row is rewritten the way a person would format it narrower.
 *
 *   indents     two spaces a level across the window, then none: never a stray space
 *   shell       a command continued onto the next row with " \", a quoted
 *               word kept whole, a pipe kept with what it feeds
 *   arrays      a JSON or JS array one item per row
 *   objects     an object literal written on one line, one field per row
 *   paths       a "A → B → C" path one step per row
 *
 * A line no rewrite fits is dropped when it is context that stands alone (a
 * whole field, a whole shell option), context after the command, or leading
 * context before it; otherwise the window does not fit at this width. Indents
 * stay as written, then become two spaces a level, then none.
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
  // indents as written, then two spaces a level, then none: an indent is always whole levels of two
  const levels = [...new Set(lines.filter(l => l.text.trim()).map(l => indentOf(l.text)))].sort((a, b) => a - b);
  const at = unit => (unit === null ? lines : lines.map(l => ({ ...l, text: sp(Math.max(0, levels.indexOf(indentOf(l.text))) * unit) + l.text.trimStart() })));
  // a narrower indent before any line is rewritten
  for (const unit of [2, 0]) if (at(unit).every(l => fits(l, l.text))) return at(unit);
  for (const unit of [null, 2, 0]) {
    const set = rewrite(at(unit), cols, { shell, fits });
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

const CLOSE = { '{': '}', '[': ']', '(': ')', "'": "'" };
/**
 * The window's lines made whole: where they stop inside a request or a call,
 * a "…" row says the rest is left out, and the brackets still open close on
 * rows of their own, each at the indent of the line that opened it, as the
 * page's code closes them ("}'" for a curl's JSON body, "})" for a call).
 * A shell's single quote counts as an opener only around a curl body (-d '…').
 */
export function closed(lines) {
  const open = [];
  lines.forEach((l, k) => {
    const t = l.text;
    for (let i = 0, quote = null; i < t.length; i++) {
      const c = t[i];
      if (quote) { if (c === quote && t[i - 1] !== '\\') quote = null; continue; }
      if (c === '"') { quote = c; continue; }
      if (c === "'" && /-d\s+'/.test(t) && !open.some(o => o.c === "'")) { open.push({ c, k }); continue; }
      if (c === "'" && open.at(-1)?.c === "'") { open.pop(); continue; }
      if ('{[('.includes(c)) open.push({ c, k });
      else if ('}])'.includes(c)) open.pop();
    }
  });
  if (!open.length) return lines;
  const rows = [];
  for (let i = open.length - 1; i >= 0;) {
    const k = open[i].k;
    let text = '';
    for (; i >= 0 && open[i].k === k; i--) text += CLOSE[open[i].c];
    rows.push({ text: sp(indentOf(lines[k].text)) + text, closer: true });
  }
  const at = lines.at(-1);
  return [...lines, { text: `${sp(indentOf(at.text))}…`, closer: true }, ...rows];
}

/**
 * The window's lines with what leads into the command's call or request left
 * out: the lines above the one that opens the outermost bracket the command
 * sits in (imports, a client set up before the call) become one "…" row. Null
 * when nothing leads in, or a line that sets what the page changes would go.
 */
export function headless(lines) {
  const at = lines.findIndex(l => l.focus);
  if (at < 0) return null;
  const opens = [];
  lines.slice(0, at).forEach((l, k) => {
    for (const c of l.text.replace(/"[^"]*"|'[^']*'/g, '""')) {
      if ('{[('.includes(c)) opens.push(k);
      else if ('}])'.includes(c)) opens.pop();
    }
  });
  const start = opens.length ? opens[0] : at;
  const lead = lines.slice(0, start);
  if (!lead.length || lead.some(l => l.keep) || lead.every(l => !l.text.trim())) return null;
  return [{ text: '…', closer: true }, ...lines.slice(start)];
}
