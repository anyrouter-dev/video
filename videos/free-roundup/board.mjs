/**
 * board: what the split-flap board shows on each page, as a grid of characters, and when each
 * cell flips. Pure: kind.mjs builds the pages from the facts, scene.mjs draws them.
 *
 * Each orientation has its own grid. Landscape gives an entry one row (date, maker, model,
 * type); portrait gives it two (date, maker and type, then the model). Both grids flip on the
 * same beats, so one timeline and one soundtrack serve both renditions.
 */

export const GRID = {
  landscape: { rows: 6, perEntry: 1 },
  portrait: { rows: 12, perEntry: 2 },
};
export const PER_PAGE = 6;
// Columns the model name gets, at most: a longer name does not fit a row of the portrait board.
export const NAME_MAX = 31;
const COL = { date: 6, maker: 12, type: 8 };

const pad = (s, n) => (s.length > n ? s.slice(0, n) : s + ' '.repeat(n - s.length));

/** The columns of each grid for a list whose longest name is `nameCols` wide. */
export function colsOf(nameCols) {
  return {
    landscape: COL.date + 1 + COL.maker + 1 + nameCols + 1 + COL.type,
    portrait: Math.max(COL.date + 1 + COL.maker + 1 + COL.type, nameCols),
  };
}

/** One entry as rows of text in each grid. */
export function entryRows(e, nameCols) {
  const maker = e.maker.toUpperCase().slice(0, COL.maker);
  const type = e.type.toUpperCase();
  return {
    landscape: [`${pad(e.date, COL.date)} ${pad(maker, COL.maker)} ${pad(e.name.toUpperCase(), nameCols)} ${pad(type, COL.type)}`],
    portrait: [`${pad(e.date, COL.date)} ${pad(maker, COL.maker)} ${pad(type, COL.type)}`, e.name.toUpperCase()],
  };
}

/** A page of free-form rows: each [landscape rows, portrait rows], centred in its grid. */
export function textPage(rows, cols) {
  const centre = (s, n) => pad(' '.repeat(Math.max(0, Math.floor((n - s.length) / 2))) + s, n);
  return {
    landscape: rows.flatMap(r => r.landscape).map(s => centre(s, cols.landscape)),
    portrait: rows.flatMap(r => r.portrait).map(s => centre(s, cols.portrait)),
  };
}

/** Every page as full grids of characters: each orientation rows × cols, padded with spaces. */
export function gridsOf(pages, cols) {
  return pages.map(p => Object.fromEntries(['landscape', 'portrait'].map(o => {
    const rows = p[o].map(s => pad(s, cols[o]));
    if (rows.length > GRID[o].rows) throw new Error(`a page has ${rows.length} rows; the ${o} board has ${GRID[o].rows}`);
    while (rows.length < GRID[o].rows) rows.push(' '.repeat(cols[o]));
    for (const r of rows) if (r.length > cols[o]) throw new Error(`"${r.trim()}" is wider than the ${o} board (${cols[o]})`);
    return [o, rows];
  })));
}

// A small seeded generator, so the flips land the same on every build.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A page flips from the left: each column a little after the one before, each row a little
// after the one above, and a few hundredths either way so the board does not move as one sheet.
export const FLIP = { col: 0.011, row: 0.045, jitter: 0.07, dur: 0.16 };

/**
 * When each cell of one orientation's grid changes, over a film: [{ r, c, at, from, to }].
 * `starts` is when each page begins to flip. A cell that keeps its character does not flip.
 */
export function flipsOf(grids, starts, o) {
  const out = [];
  const rand = rng(o === 'portrait' ? 7 : 3);
  let prev = grids[0][o].map(r => ' '.repeat(r.length));
  grids.forEach((g, k) => {
    g[o].forEach((row, r) => [...row].forEach((ch, c) => {
      const from = prev[r][c];
      if (from === ch) return;
      out.push({ r, c, at: +(starts[k] + r * FLIP.row + c * FLIP.col + rand() * FLIP.jitter).toFixed(3), from, to: ch });
    }));
    prev = g[o];
  });
  return out;
}

/** How long a page takes to flip in, in each orientation: the last cell lands then. */
export function flipSpan(cols) {
  return Math.max(...['landscape', 'portrait'].map(o => (GRID[o].rows - 1) * FLIP.row + (cols[o] - 1) * FLIP.col + FLIP.jitter + FLIP.dur));
}
