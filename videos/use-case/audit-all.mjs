// Builds every use-case film in every rendition and runs the stage audit on each: text outside
// the safe area, cut by a box, past its card, broken inside a token, or under the floor. Each
// portrait also goes through the fill gate (shared/authoring/portrait-fill.mjs): a real screen
// cropped through its text, the phone's height left empty, or ink under the Shorts UI.
// `check use-case` gates one film; this is the sweep over all of them.
//
//   node videos/use-case/audit-all.mjs [--from=FILE] [--models-from=FILE] [--data=FILE] [--slug=a,b]
//     [--out=DIR] [--jobs=3] [--only=stage|fill]
//
// --data builds from a saved collect (the data.json `collect use-case` writes) instead of collecting,
// each film's script read again from narration.json.
// Writes DIR/report.json and, for each failing film, screenshots under DIR/<slug>-<rendition>/.
// Exits 1 when any film has a problem.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs, BUILD } from '../../lib/paths.mjs';
import { RENDITIONS } from '../../lib/renditions.mjs';
import { auditStage } from '../../shared/authoring/stage-audit.mjs';
import { auditFill } from '../../shared/authoring/portrait-fill.mjs';
import kind, { narrate } from './kind.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const out = path.resolve(flags.out ?? path.join(BUILD, 'use-case', 'audit'));
const jobs = Number(flags.jobs ?? Math.max(1, Math.min(3, os.cpus().length >> 2)));
const only = flags.slug ? new Set(String(flags.slug).split(',')) : null;

const saved = flags.data && JSON.parse(fs.readFileSync(path.resolve(flags.data), 'utf8'));
const data = saved ? { ...saved, useCases: narrate(saved.useCases.map(({ narration, ...u }) => u)) } : await kind.collect({ flags: { ...flags, slug: undefined } });
const releases = kind.split(data).filter(r => !only || only.has(r.label));
const films = releases.flatMap(rel => {
  const dir = path.join(BUILD, 'use-case', 'all', rel.label);
  const film = kind.write(path.join(dir, 'landscape'), kind.id, kind.film(rel));
  return RENDITIONS.map(r => ({ slug: rel.label, r, seconds: film.duration, dir: r.write(path.join(dir, 'landscape'), path.join(dir, r.id)) }));
});

fs.rmSync(out, { recursive: true, force: true });
const results = [];
const queue = [...films];
await Promise.all(Array.from({ length: jobs }, async () => {
  for (let f; (f = queue.shift()); ) {
    const safe = f.r.safe && [f.r.safe.left, f.r.safe.top, f.r.safe.right, f.r.safe.bottom];
    const { problems } = flags.only === 'fill' ? { problems: [] } : await auditStage(f.dir, { safe, shots: path.join(out, `${f.slug}-${f.r.id}`) });
    const fill = f.r.id === 'portrait' && kind.portraitFill && flags.only !== 'stage' ? await auditFill(f.dir) : null;
    const n = problems.length + (fill?.problems.length ?? 0);
    results.push({ slug: f.slug, rendition: f.r.id, seconds: f.seconds, problems, ...(fill && { fill: { problems: fill.problems, median: fill.fill.median, shortShare: fill.fill.shortShare } }) });
    const fillNote = fill ? `  fill median ${Math.round(fill.fill.median * 100)}%, ${Math.round(fill.fill.shortShare * 100)}% short` : '';
    console.log(`${n ? 'FAIL' : 'ok  '}  ${f.slug.padEnd(32)} ${f.r.id.padEnd(9)} ${String(f.seconds).padStart(5)}s  ${n} problem(s)${fillNote}`);
    for (const p of problems.slice(0, 6)) console.log(`        ${p.at.toFixed(1).padStart(5)}s  ${p.kind.padEnd(5)} ${JSON.stringify(p.what)}  ${p.why}`);
    for (const p of fill?.problems ?? []) console.log(`        ${p}`);
  }
}));

results.sort((a, b) => a.slug.localeCompare(b.slug) || a.rendition.localeCompare(b.rendition));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(results, null, 1) + '\n');
const failing = results.filter(r => r.problems.length || r.fill?.problems.length);
console.log(`\n${results.length - failing.length} of ${results.length} films pass. Report: ${path.join(out, 'report.json')}`);
process.exit(failing.length ? 1 : 0);
