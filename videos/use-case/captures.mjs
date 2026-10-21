/**
 * captures: the real screens a use-case film shows, from shared/captures/. Each is a file the
 * capture run recorded with its source (a URL, or the command whose output it is) in a
 * manifest.json; steps.json maps every step of every use case to the captures that show it.
 * narration.json names, per step, the one capture its film shows (`capture`), and each film's
 * claims ledger carries that capture's source.
 *
 *   node videos/use-case/captures.mjs clean     write the dashboard screens with the mouse cursor removed
 *   node videos/use-case/captures.mjs pick      propose a capture for every step that shows no code
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SHARED } from '../../lib/paths.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const DAY = '2026-10-21';
const ROOT = path.join(SHARED, 'captures');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const manifests = { [DAY]: () => read(path.join(ROOT, DAY, 'manifest.json')), '2026-10-19': () => read(path.join(ROOT, '2026-10-19', 'manifest.json')) };
const rows = new Map();
const rowsOf = day => {
  if (!rows.has(day)) rows.set(day, new Map(manifests[day]().map(r => [r.file, r])));
  return rows.get(day);
};

// The dashboard screens were taken with the mouse over the page. Where its tip sits, in the
// screenshot's own pixels; `clean` paints it out from the pixels around it (ffmpeg delogo).
const CURSORS = {
  'byok.png': [1568, 752], 'credits.png': [1568, 752], 'keys.png': [1568, 707], 'logs.png': [1568, 756],
  'mcp.png': [1568, 757], 'pool.png': [1568, 757], 'presets.png': [1568, 758], 'usage.png': [2560, 1154],
};
const DASH = path.join(ROOT, DAY, 'shared/dashboard'), CLEAN = path.join(DASH, 'clean');

/**
 * A capture by the reference steps.json gives it: its file on disk, the name it is published
 * under in a film, and its source. Dashboard screens resolve to their copy without the cursor.
 */
export function captureOf(ref) {
  const old = /^video-usecase-v3\/shared\/captures\/(\d{4}-\d\d-\d\d)\/(.+)$/.exec(ref);
  const [day, file] = old ? [old[1], old[2]] : [DAY, ref];
  const row = rowsOf(day).get(file);
  if (!row) throw new Error(`captures: ${ref} is in no manifest`);
  const dash = day === DAY && file.startsWith('shared/dashboard/');
  const disk = dash ? path.join(CLEAN, path.basename(file)) : path.join(ROOT, day, file);
  if (!fs.existsSync(disk)) throw new Error(`captures: ${disk} is missing${dash ? ': run node videos/use-case/captures.mjs clean' : ''}`);
  return {
    ref, disk, name: `${day}-${file.replace(/\//g, '-')}`,
    kind: row.kind === 'terminal-render' ? 'terminal' : 'page',
    url: row.url ?? null, command: row.command ?? null, shows: row.shows, redacted: row.redacted,
  };
}

/** Where a capture came from, as its film's claims ledger records it. */
export const sourceOf = c => c.url ?? `the output of \`${c.command}\` (${c.ref})`;

function clean() {
  fs.mkdirSync(CLEAN, { recursive: true });
  for (const [file, [x, y]] of Object.entries(CURSORS)) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(DASH, file), '-vf', `delogo=x=${x - 8}:y=${y - 8}:w=42:h=56`, path.join(CLEAN, file)]);
    console.log(`  ${file}: cursor at ${x},${y} removed`);
  }
}

/** For every step that shows no code, the first capture steps.json gives its page step that the film has not shown yet. */
function pick() {
  const steps = read(path.join(ROOT, DAY, 'steps.json'));
  const narration = read(path.join(DIR, 'narration.json'));
  const useCases = read(process.argv[3] ?? path.join(DIR, 'fixtures/use-cases.json')).useCases;
  const words = t => new Set(t.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  for (const [slug, film] of Object.entries(narration.films)) {
    const page = useCases.find(u => u.slug === slug).steps, used = new Set();
    film.steps.forEach((st, i) => {
      if (st.shows) return;
      const mine = words(st.text), k = page.map((t, j) => [j, [...words(t)].filter(w => mine.has(w)).length]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      const ref = steps[slug][k].captures.filter(c => c.ok && c.file.endsWith('.png')).map(c => c.file).find(f => !used.has(f));
      if (ref) used.add(ref);
      console.log(`${slug.padEnd(30)} step ${i + 1}  page step ${k + 1}  ${ref ?? '(none)'}`);
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const run = { clean, pick }[process.argv[2]];
  if (run) run(); else console.log('usage: captures.mjs clean | pick [use-cases.json]');
}
