#!/usr/bin/env node
/**
 * video — one driver for every kind of film.
 *
 *   node lib/cli.mjs kinds                     what kinds exist
 *   node lib/cli.mjs run <kind>                collect → build → check → render → cover → record
 *   node lib/cli.mjs run <kind> --publish --accept      …then release it and advance the baseline
 *   node lib/cli.mjs pending [kind…]           which kinds have something unreleased (default: scheduled ones)
 *
 *   node lib/cli.mjs collect <kind>            the facts only → .build/<kind>/data.json
 *   node lib/cli.mjs gen <kind>                facts → HyperFrames project
 *   node lib/cli.mjs check|dev|render <kind>   the hyperframes command, against that kind's project
 *   node lib/cli.mjs publish <kind> [id]       GitHub Release (+ YouTube when configured)
 *   node lib/cli.mjs accept <kind>             promote what was collected to the baseline
 *   node lib/cli.mjs ledger [kind]             what has been released
 *
 * Flags for run:  --force (render even if released)   --dry-run (decide, render nothing)
 *                 --reuse (use the collected data.json instead of collecting again)
 *                 --quality=draft|looks|delivery   --workers=N
 * Anything else (--limit, --seconds, --from, …) is passed to the kind.
 *
 * A release is identified by WHAT it is about, not by when it ran: same facts →
 * same fingerprint → already in the ledger → nothing to do. That is what lets
 * this run every night without burning a render every night.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, RENDERS, parseArgs, rel } from './paths.mjs';
import { loadKind, loadKinds, kindIds } from './kinds.mjs';
import { writeFilm, IGNITE } from './film.mjs';
import * as ledger from './ledger.mjs';
import * as hf from './hyperframes.mjs';
import { publish } from './publish.mjs';

const out = m => console.log(m);
const readJson = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const dataFile = k => path.join(k.work, 'data.json');
const planOf = k => readJson(path.join(k.work, 'plan.json')) ?? {};

async function collect(kind, flags) {
  out(`── ${kind.id}: collecting`);
  const data = await kind.collect({ flags, dir: kind.dir, work: kind.work });
  fs.mkdirSync(kind.work, { recursive: true });
  fs.writeFileSync(dataFile(kind), JSON.stringify(data, null, 2) + '\n');
  return data;
}

/** A release is settled once it is out, was declined, or its film is still on disk. */
function settled(entry) {
  if (!entry) return false;
  return !!(entry.declined || entry.published?.github || (entry.artifact && fs.existsSync(path.join(ROOT, entry.artifact))));
}

function build(kind, data, flags) {
  if (!kind.film) return staticFilm(kind);
  const film = writeFilm(kind.project, kind.id, kind.film(data, { plan: planOf(kind), flags }));
  for (const s of film.scenes) if (s.warn) out(`  clamped  ${s.id}: ${s.warn}`);
  out(`  film      ${film.summary ?? film.title}`);
  out(`  duration  ${film.duration}s @30fps = ${Math.round(film.duration * 30)} frames`);
  out(`  scenes    ${film.scenes.length} sub-compositions → ${rel(kind.project)}/`);
  return film;
}

/** A hand-authored film: nothing to generate, the length is read off its root. */
function staticFilm(kind) {
  const html = fs.readFileSync(path.join(kind.project, 'index.html'), 'utf8');
  const duration = parseFloat(/data-duration="([\d.]+)"/.exec(html)?.[1]);
  if (!duration) throw new Error(`${rel(kind.project)}/index.html has no data-duration on its root`);
  return { title: kind.title, duration, scenes: [] };
}

/** Where the first content scene has settled: a third of the way into it. */
function coverAt(kind, film) {
  if (kind.coverAt) return kind.coverAt(film);
  const first = film.scenes.find(s => s.start >= IGNITE - 1e-6);
  return first ? first.start + first.dur / 3 : film.duration / 3;
}

async function run(kind, flags) {
  const data = flags.reuse && readJson(dataFile(kind)) || await collect(kind, flags);
  if (!data.notable) { out(`\n${kind.id}: nothing shipped — nothing to render`); return 'none'; }

  const hash = ledger.fingerprint(data.parts);
  const prior = ledger.findByHash(kind.id, hash);
  const id = prior?.id ?? ledger.makeId(ledger.nextSeq(kind.id), data.label, hash);
  const plan = planOf(kind);
  out(`\n── release ${kind.id} / ${id}`);
  out(`   claim     ${kind.headline(data, plan)}`);

  if (settled(prior) && !flags.force) {
    out(`\nalready released as ${prior.id} — skipping   (pass --force to render it again)`);
    return 'skipped';
  }
  if (flags['dry-run']) { out(`\n[dry-run] would render ${id}`); return 'dry-run'; }

  const row = { id, hash, kind: kind.id, label: data.label, title: kind.headline(data, plan) };
  // The agent may veto a release it judges not worth filming.
  if (Number(plan.limit) === 0) {
    out('\nplan declined this release — recording the decision, no render');
    ledger.snapshot(kind.id, { ...row, declined: true }, { data, plan });
    return 'declined';
  }

  out('── build');
  const film = build(kind, data, flags);

  // check is a HARD GATE. A film that fails it is not rendered and not recorded.
  out('── check');
  hf.check(kind.project);

  out('── render');
  const tag = ledger.tagOf(kind.id, id);
  const mp4 = path.join(RENDERS, `${tag}.mp4`);
  const probe = hf.render(kind.project, mp4, { quality: flags.quality, workers: flags.workers });
  // Verify the artifact before believing it.
  if (!(Math.abs(probe.seconds - film.duration) < 0.25)) {
    throw new Error(`rendered ${probe.seconds}s, expected ${film.duration}s`);
  }

  out('── cover');
  const png = hf.cover(kind.project, coverAt(kind, film).toFixed(2), path.join(RENDERS, `${tag}.png`));

  // The generated composition travels with the film. A hand-authored film's
  // source is already in git.
  let source = null;
  if (kind.film) {
    source = path.join(RENDERS, `${tag}-source.tar.gz`);
    execFileSync('tar', ['-czf', source, '-C', kind.project, 'index.html', 'compositions']);
  }

  ledger.snapshot(kind.id, {
    ...row,
    seconds: film.duration,
    renderedAt: new Date().toISOString(),
    commit: gitHead(),
    artifact: rel(mp4), cover: rel(png), source: source && rel(source),
  }, { data, plan });

  out(`\nDONE  ${tag}`);
  out(`  film     ${rel(mp4)}   (${probe.seconds}s, ${probe.frames} frames)`);
  out(`  cover    ${rel(png)}`);
  out(`  record   releases/${kind.id}/${id}/`);
  return 'rendered';
}

function gitHead() {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return null; }
}

/** Newest rendered release that is not out yet and whose film is still on disk. */
const unpublished = kind => [...ledger.list(kind.id)].reverse()
  .find(r => r.renderedAt && !r.published?.github && fs.existsSync(path.join(ROOT, r.artifact)));

async function publishKind(kind, id, flags) {
  const entry = id ? ledger.find(kind.id, id) : unpublished(kind);
  if (id && !entry) throw new Error(`no ${kind.id} release "${id}"`);
  if (!entry) { out(`${kind.id}: nothing to publish`); return; }
  await publish(kind, entry, { dry: !!flags['dry-run'], youtube: !flags['no-youtube'] });
}

function printLedger(ids) {
  for (const id of ids) {
    const rows = ledger.list(id);
    out(`${id}  [${rows.length} release${rows.length === 1 ? '' : 's'}]`);
    for (const r of rows) {
      const state = r.published?.github ? 'published' : r.declined ? 'declined' : r.renderedAt ? 'rendered' : 'recorded';
      out(`  ${r.id.padEnd(46)} ${state.padEnd(10)} ${r.title ?? ''}`);
    }
  }
}

const USAGE = `usage: node lib/cli.mjs <kinds|run|pending|collect|gen|check|dev|render|publish|accept|ledger> [kind] [flags]
kinds: ${kindIds().join(', ')}`;

async function main() {
  const [cmd, ...argv] = process.argv.slice(2);
  const { flags, rest } = parseArgs(argv);
  const kind = async () => {
    if (!rest[0]) throw new Error(`which kind?\n${USAGE}`);
    return loadKind(rest[0]);
  };

  switch (cmd) {
    case 'kinds':
      for (const k of await loadKinds()) {
        out(`${k.id.padEnd(12)} ${k.title.padEnd(16)} ${k.film ? 'generated' : 'authored '}  ${k.scheduled ? 'nightly' : 'on demand'}`);
      }
      break;

    case 'run': {
      const k = await kind();
      const result = await run(k, flags);
      if (flags.publish) await publishKind(k, null, flags);
      // Only after everything above succeeded, so a failed render can never
      // silently swallow the next release's diff.
      if (flags.accept && k.accept && result !== 'dry-run') k.accept({ dir: k.dir, work: k.work });
      break;
    }

    case 'pending': {
      const kinds = rest.length ? await Promise.all(rest.map(loadKind)) : await loadKinds({ scheduledOnly: true });
      const pending = [];
      for (const k of kinds) {
        const data = await collect(k, flags);
        const prior = data.notable && ledger.findByHash(k.id, ledger.fingerprint(data.parts));
        const todo = data.notable && !settled(prior);
        out(`   → ${todo ? 'PENDING' : data.notable ? `already released as ${prior.id}` : 'nothing new'}\n`);
        if (todo) pending.push(k.id);
        // A release that is out but whose baseline never advanced (the run died
        // between publish and accept) would otherwise be re-diffed forever.
        else if (prior && k.accept) k.accept({ dir: k.dir, work: k.work });
      }
      out(`pending: ${pending.join(' ') || '(none)'}`);
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `kinds=${pending.join(' ')}\n`);
      break;
    }

    case 'collect': await collect(await kind(), flags); break;

    case 'gen': {
      const k = await kind();
      const data = readJson(dataFile(k)) ?? await collect(k, flags);
      build(k, data, flags);
      break;
    }

    case 'check': case 'dev': case 'render': case 'snapshot': case 'inspect': {
      const k = await kind();
      const passed = argv.filter(a => a.startsWith('-'));
      hf.passthrough(cmd === 'dev' ? 'preview' : cmd, k.project, passed);
      break;
    }

    case 'publish': await publishKind(await kind(), rest[1], flags); break;

    case 'accept': {
      const k = await kind();
      if (!k.accept) { out(`${k.id} has no baseline to accept`); break; }
      k.accept({ dir: k.dir, work: k.work });
      break;
    }

    case 'ledger': printLedger(rest.length ? rest : kindIds()); break;

    default: out(USAGE); process.exit(cmd ? 1 : 0);
  }
}

main().catch(e => { console.error(`FAIL: ${e.message}`); process.exit(1); });
