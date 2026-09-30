/**
 * release :: feed
 *
 * Parses the AnyRouter changelog RSS into releases. Pure functions, Node
 * builtins only — CI calls collect() before `npm ci`, so no dependencies.
 *
 * Each <item> is one release. Its <description> is XML-escaped HTML:
 *   <p>summary</p><ul><li><strong>Theme:</strong> <a href="…">line</a></li>…</ul>
 * where the theme and the link are each optional.
 */

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Unescape in ONE pass so "&amp;lt;" becomes "&lt;", not "<". */
export const unescapeXml = s => String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  if (e[0] === '#') {
    const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  }
  return NAMED[e.toLowerCase()];
});

const stripTags = s => s.replace(/<[^>]+>/g, '');
const clean = s => unescapeXml(stripTags(s)).replace(/\s+/g, ' ').trim();
const tag = (block, name) => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(block);
  if (!m) return null;
  // A CDATA-wrapped value is already literal text.
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(m[1]);
  return cdata ? cdata[1] : unescapeXml(m[1]);
};

const isoDate = s => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/** The version is the last path segment of the release link: …/changelog/1.6.0 → 1.6.0. */
export const versionOf = link => link.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop();

/** <li> items of the description HTML → { theme|null, line, href|null }. */
export function parseHighlights(html) {
  return [...html.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(([, li]) => {
    const strong = /<strong>([\s\S]*?)<\/strong>/i.exec(li);
    const a = /<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(li);
    const theme = strong ? clean(strong[1]).replace(/:$/, '').trim() : null;
    const line = clean(a ? a[2] : li.replace(/<strong>[\s\S]*?<\/strong>/i, ''));
    return { theme: theme || null, line, href: a ? unescapeXml(a[1]) : null };
  }).filter(h => h.line);
}

/** RSS text → releases, newest first (feed order). */
export function parseFeed(xml) {
  return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(([, item]) => {
    const link = clean(tag(item, 'link') ?? '');
    const html = tag(item, 'description') ?? '';
    const summary = /<p>([\s\S]*?)<\/p>/i.exec(html);
    return {
      version: versionOf(link),
      headline: clean(tag(item, 'title') ?? ''),
      link,
      date: isoDate(tag(item, 'pubDate') ?? ''),
      summary: summary ? clean(summary[1]) : '',
      highlights: parseHighlights(html),
    };
  }).filter(r => r.version && r.headline);
}
