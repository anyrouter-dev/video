// Builds every use-case film in every rendition and runs the stage audit on each: text outside
// the safe area, cut by a box, past its card, broken inside a token, or under the floor.
// `check use-case` gates one film; this is the sweep over all of them.
//
//   node videos/use-case/audit-all.mjs [--from=FILE] [--models-from=FILE] [--slug=a,b]
//     [--out=DIR] [--jobs=3]
//
// Writes DIR/report.json and, for each failing film, screenshots under DIR/<slug>-<rendition>/.
// Exits 1 when any film has a problem.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs, BUILD } from '../../lib/paths.mjs';
import { RENDITIONS } from '../../lib/renditions.mjs';
import { auditStage } from '../../shared/authoring/stage-audit.mjs';
import kind from './kind.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const out = path.resolve(flags.out ?? path.join(BUILD, 'use-case', 'audit'));
const jobs = Number(flags.jobs ?? Math.max(1, Math.min(3, os.cpus().length >> 2)));
const only = flags.slug ? new Set(String(flags.slug).split(',')) : null;

const releases = kind.split(await kind.collect({ flags: { ...flags, slug: undefined } })).filter(r => !only || only.has(r.label));
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
    const { problems } = await auditStage(f.dir, { safe, shots: path.join(out, `${f.slug}-${f.r.id}`) });
    results.push({ slug: f.slug, rendition: f.r.id, seconds: f.seconds, problems });
    console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${f.slug.padEnd(32)} ${f.r.id.padEnd(9)} ${String(f.seconds).padStart(5)}s  ${problems.length} problem(s)`);
    for (const p of problems.slice(0, 6)) console.log(`        ${p.at.toFixed(1).padStart(5)}s  ${p.kind.padEnd(5)} ${JSON.stringify(p.what)}  ${p.why}`);
  }
}));

results.sort((a, b) => a.slug.localeCompare(b.slug) || a.rendition.localeCompare(b.rendition));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(results, null, 1) + '\n');
const failing = results.filter(r => r.problems.length);
console.log(`\n${results.length - failing.length} of ${results.length} films pass. Report: ${path.join(out, 'report.json')}`);
process.exit(failing.length ? 1 : 0);
