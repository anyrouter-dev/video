/**
 * entries — parse the "Model releases" changelog out of anyrouter.dev/llms.txt.
 *
 * Pure functions, Node builtins only: CI imports this before `npm ci`.
 *
 * The section looks like
 *   ## Model releases
 *   - [Model releases](https://anyrouter.dev/blog/releases): Changelog of …   ← index link, no slug
 *   - [Title](https://anyrouter.dev/blog/releases/2026-09-30-suffix): Summary.
 */

// Anchored on the link shape, not on brackets or colons: a title may contain
// "]" and a summary may contain "): ". The title is greedy, so it runs to the
// LAST "](…/blog/releases/<date>…)" on the line — and only an entry has a date.
const ENTRY = /^- \[(.+)\]\((\S*?\/blog\/releases\/(\d{4}-\d{2}-\d{2}[^\s)]*))\):\s*(.*)$/;

const SECTION = '## Model releases';

/** The lines of the "## Model releases" section, or null when it is missing. */
export function sectionOf(text) {
  const lines = String(text).split(/\r?\n/);
  const at = lines.findIndex(l => l.trim() === SECTION);
  if (at < 0) return null;
  const rest = lines.slice(at + 1);
  const end = rest.findIndex(l => l.startsWith('## '));
  return end < 0 ? rest : rest.slice(0, end);
}

/** A retirement is not a launch: `-disabled` and `-upstream` slugs are kept apart. */
export const typeOf = slug => (/-(disabled|upstream)$/.test(slug) ? 'disabled' : 'added');

/** Every changelog entry, in the order llms.txt lists them (newest first). */
export function parseEntries(text) {
  const section = sectionOf(text) ?? [];
  const out = [];
  for (const line of section) {
    const m = ENTRY.exec(line);
    if (!m) continue;                       // the index link and blank lines fall out here
    const [, title, link, slug, summary] = m;
    out.push({ slug, date: slug.slice(0, 10), title: title.trim(), summary: summary.trim(), link, type: typeOf(slug) });
  }
  return out;
}

/** The entries of one day: the newest day in the list, or the given `date`. */
export function latestBatch(entries, date) {
  const day = date ?? entries.reduce((a, e) => (e.date > a ? e.date : a), '');
  return day ? entries.filter(e => e.date === day) : [];
}
