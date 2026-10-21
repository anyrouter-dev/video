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
 *                                              (check: every rendition, plus the stage audit where the
 *                                              rendition has a safe area or the kind is audited,
 *                                              and the fill gate on a portrait of a kind that asks;
 *                                              the others: landscape)
 *   node lib/cli.mjs publish <kind> [id]       GitHub Release (+ YouTube when configured)
 *   node lib/cli.mjs plan <kind> [id]          what an agent may pick: the facts, the item ids, the schema
 *   node lib/cli.mjs regen <kind> <id>|--all   re-render released films from their frozen facts
 *   node lib/cli.mjs accept <kind>             promote what was collected to the baseline
 *   node lib/cli.mjs ledger [kind]             what has been released
 *
 * Flags for run:  --force (render even if released)   --dry-run (decide, render nothing)
 *                 --reuse (use the collected data.json instead of collecting again)
 *                 --quality=draft|looks|delivery   --workers=N
 * Flags for regen: --publish (replace the Release assets)   --plan=FILE (a new plan to freeze)
 *                 --dry-run (build only)   --quality   --workers
 * --rendition=landscape|portrait: one rendition only. For run and regen that is a
 *                 dev run: it renders, and records and publishes nothing.
 * Flags for publish: --replace (swap the assets of an existing Release; never YouTube)
 *                 --no-youtube   --dry-run
 * Anything else (--limit, --seconds, --from, …) is passed to the kind.
 *
 * A release is identified by WHAT it is about, not by when it ran: same facts →
 * same fingerprint → already in the ledger → nothing to do. That is what lets
 * this run every night without burning a render every night.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, filmsDir, parseArgs, rel } from './paths.mjs';
import { loadKind, loadKinds, kindIds } from './kinds.mjs';
import { writeFilm, OPEN } from './film.mjs';
import * as ledger from './ledger.mjs';
import * as hyperframes from './hyperframes.mjs';
import { publish } from './publish.mjs';
import { checkPlan, SCHEMA } from './plan.mjs';
import { RENDITIONS, IDS, rendition } from './renditions.mjs';

const out = m => console.log(m);
const readJson = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const dataFile = k => path.join(k.work, 'data.json');
const planFile = k => path.join(k.work, 'plan.json');
const warn = (title, m) => out(process.env.GITHUB_ACTIONS ? `::warning title=${title}::${m}` : `  WARNING   ${m}`);

/** A rendition a kind does not make is a gap. Say so on every run, so it stays visible. */
function warnGaps(kinds) {
  for (const k of kinds) {
    for (const r of RENDITIONS.filter(r => !k.renditions.includes(r.id))) {
      warn(`${k.id}: no ${r.id}`, `${k.id} ships ${k.renditions.join(' and ')} only: no ${r.id} ${r.width}x${r.height} ${r.label}`);
    }
  }
  return kinds;
}

/**
 * The plan for these facts with everything that breaks the contract removed.
 * Each removal is printed: a quietly ignored plan looks exactly like an agent
 * that had nothing to say.
 */
function planFor(kind, data, raw) {
  const items = kind.items?.(data) ?? [];
  const { plan, problems } = checkPlan(raw, { ids: items.map(i => i.id), facts: { data, items } });
  for (const p of problems) warn(`${kind.id} plan`, p);
  return plan;
}

async function collect(kind, flags) {
  out(`── ${kind.id}: collecting`);
  const data = await kind.collect({ flags, dir: kind.dir, work: kind.work });
  fs.mkdirSync(kind.work, { recursive: true });
  fs.writeFileSync(dataFile(kind), JSON.stringify(data, null, 2) + '\n');
  return data;
}

/** The releases one collect holds: each part of a kind with `split`, else the whole. */
const releasesOf = (kind, data) => (kind.split ? kind.split(data) : [data]);

/** `gen` and `plan` build one film, so a split kind must have collected exactly one release. */
function oneRelease(kind, data) {
  const all = releasesOf(kind, data);
  if (all.length !== 1) {
    throw new Error(`${kind.id} collected ${all.length} releases (${all.map(d => d.label).join(', ')}). Collect one with the kind's flag.`);
  }
  return all[0];
}


/**
 * The renditions a release still lacks: each one the kind makes that has no film
 * on disk and no Release that is out. A declined release lacks nothing.
 */
function lacking(kind, entry) {
  if (entry?.declined) return [];
  return kind.renditions.filter(r => {
    const film = entry?.renditions?.[r];
    return !film || !(entry.published?.github || fs.existsSync(path.join(ROOT, film.artifact)));
  });
}

/** Every rendition the kind makes, or with --rendition just that one (a dev run). */
function renditionsFor(kind, flags) {
  if (!flags.rendition) return kind.renditions.map(rendition);
  if (flags.publish || flags.accept) throw new Error('--rendition is a dev run: it records and publishes nothing');
  return [rendition(flags.rendition)];
}

/** Each rendition's project: the landscape project itself, or a copy written from it under scratch. */
const shapesOf = (renditions, project, scratch) => renditions.map(r => ({ r, dir: r.write(project, path.join(scratch, r.id)) }));

/** New films keep their YouTube links: a video there cannot be replaced, only duplicated. */
function withUploads(fresh, prior = {}) {
  return Object.fromEntries(IDS.filter(r => fresh[r] || prior[r]).map(r => [r,
    fresh[r] ? { ...fresh[r], ...(prior[r]?.youtube && { youtube: prior[r].youtube }) } : prior[r]]));
}

function build(kind, data, plan, flags, project = kind.project) {
  if (!kind.film) return staticFilm(kind);
  const film = (kind.write ?? writeFilm)(project, kind.id, kind.film(data, { plan, flags }));
  for (const s of film.scenes) if (s.warn) out(`  clamped  ${s.id}: ${s.warn}`);
  out(`  film      ${film.summary ?? film.title}`);
  out(`  duration  ${film.duration}s @30fps = ${Math.round(film.duration * 30)} frames`);
  out(`  scenes    ${film.scenes.length} sub-compositions → ${rel(project)}/`);
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
  const first = film.scenes.find(s => s.start >= OPEN - 1e-6);
  return first ? first.start + first.dur / 3 : film.duration / 3;
}

/**
 * check → render → cover for each rendition, then the source, for a landscape
 * project that is already built. Every rendition passes the check before any is
 * rendered. The files are named by the release tag and the rendition, so no two
 * films share one.
 */
function produce(kind, { project, shapes, film, id, flags, hf }) {
  // check is a HARD GATE. A film that fails it is not rendered and not recorded.
  for (const { r, dir } of shapes) {
    out(`── check ${r.id}`);
    hf.check(dir, { safe: r.safe, audited: !!kind.audited, filled: r.id === 'portrait' && !!kind.portraitFill });
  }

  const tag = ledger.tagOf(kind.id, id);
  const outDir = filmsDir(kind.id);
  const films = {};
  for (const { r, dir } of shapes) {
    out(`── render ${r.id}`);
    const mp4 = path.join(outDir, `${tag}${r.fileSuffix}.mp4`);
    const probe = hf.render(dir, mp4, { quality: flags.quality, workers: flags.workers });
    // Verify the artifact before believing it.
    if (!(Math.abs(probe.seconds - film.duration) < 0.25)) {
      throw new Error(`${r.id} rendered ${probe.seconds}s, expected ${film.duration}s`);
    }
    if (probe.width !== r.width || probe.height !== r.height) {
      throw new Error(`${r.id} rendered ${probe.width}x${probe.height}, expected ${r.width}x${r.height}`);
    }
    out(`── cover ${r.id}`);
    const png = hf.cover(dir, coverAt(kind, film).toFixed(2), path.join(outDir, `${tag}${r.fileSuffix}.png`));
    films[r.id] = { artifact: rel(mp4), cover: rel(png) };
    out(`  film     ${rel(mp4)}   (${probe.width}x${probe.height}, ${probe.seconds}s, ${probe.frames} frames)`);
    out(`  cover    ${rel(png)}`);
  }

  // The generated composition travels with the film. A hand-authored film's
  // source is already in git.
  let source = null;
  if (kind.film) {
    source = path.join(outDir, `${tag}-source.tar.gz`);
    // Fonts are shared/ and already in git; the score is made for this film.
    execFileSync('tar', ['-czf', source, '-C', project, 'index.html', 'compositions', 'audio']);
  }

  out(`\nDONE  ${tag}   ${Object.keys(films).join(' + ')}`);
  return {
    seconds: film.duration,
    renderedAt: new Date().toISOString(),
    commit: gitHead(),
    renditions: films,
    source: source && rel(source),
  };
}

export async function run(kind, flags, { hf = hyperframes } = {}) {
  const data = flags.reuse && readJson(dataFile(kind)) || await collect(kind, flags);
  // One release failing must not stop the others from rendering.
  const results = [], failed = [];
  for (const one of releasesOf(kind, data)) {
    try { results.push(await runOne(kind, one, flags, hf)); }
    catch (err) { failed.push(`${one.label}: ${err.message}`); }
  }
  if (failed.length) throw new Error(failed.join('\n'));
  if (!results.length) out(`\n${kind.id}: nothing to film`);
  return results;
}

async function runOne(kind, data, flags, hf) {
  if (!data.notable) { out(`\n${kind.id}: nothing shipped — nothing to render`); return { state: 'none' }; }

  const hash = ledger.fingerprint(data.parts);
  const prior = ledger.findByHash(kind.id, hash);
  const id = prior?.id ?? ledger.makeId(ledger.nextSeq(kind.id), data.label, hash);
  const plan = planFor(kind, data, readJson(planFile(kind)));
  out(`\n── release ${kind.id} / ${id}`);
  out(`   claim     ${kind.headline(data, plan)}`);

  const renditions = renditionsFor(kind, flags);
  const missing = lacking(kind, prior);
  if (prior && !missing.length && !flags.force && !flags.rendition) {
    out(`\nalready released as ${prior.id} — skipping   (pass --force to render it again)`);
    return { state: 'skipped' };
  }
  // A release is rendered whole, so its films all come from one build.
  if (prior?.renderedAt && missing.length) out(`   ${prior.id} has no ${missing.join(' or ')} film — rendering every rendition`);
  if (flags['dry-run']) { out(`\n[dry-run] would render ${id}: ${renditions.map(r => r.id).join(' + ')}`); return { state: 'dry-run' }; }

  const row = { id, hash, kind: kind.id, label: data.label, title: kind.headline(data, plan) };
  // The agent may veto a release it judges not worth filming.
  if (Number(plan.limit) === 0) {
    out('\nplan declined this release — recording the decision, no render');
    ledger.snapshot(kind.id, { ...row, declined: true }, { data, plan });
    return { state: 'declined' };
  }

  out('── build');
  const film = build(kind, data, plan, flags);
  const shapes = shapesOf(renditions, kind.project, kind.work);
  const made = produce(kind, { project: kind.project, shapes, film, id, flags, hf });
  if (flags.rendition) { out(`\n--rendition=${flags.rendition} is a dev run — nothing recorded`); return { state: 'dev' }; }
  ledger.snapshot(kind.id, { ...row, ...made, renditions: withUploads(made.renditions, prior?.renditions) }, { data, plan });
  out(`  record   releases/${kind.id}/${id}/`);
  return { state: 'rendered', id };
}

/**
 * Re-render a release that is already out, from the facts it was frozen with:
 * same id, hash, tag and createdAt, a new film. This is how every past release
 * picks up a new look. Each release builds in its own scratch dir, so several
 * regens of one kind can run at once.
 */
export async function regen(kind, entry, flags, { hf = hyperframes } = {}) {
  out(`\n── regen ${kind.id} / ${entry.id}`);
  if (!entry.renderedAt) { out('   never rendered (declined or only recorded) — nothing to redo'); return 'skipped'; }
  const frozen = ledger.load(kind.id, entry.id);
  if (!frozen.data) throw new Error(`releases/${kind.id}/${entry.id}/data.json is missing — cannot rebuild`);
  let raw = frozen.plan;
  if (flags.plan) {
    raw = readJson(path.resolve(flags.plan));
    if (!raw) throw new Error(`--plan=${flags.plan}: no such file`);
  }
  const plan = planFor(kind, frozen.data, raw);
  // Declining is a decision about a release that is not out yet. This one is.
  if (plan.limit === 0) throw new Error(`the plan declines ${entry.id}, but it is already released — drop "limit": 0`);
  const title = kind.headline(frozen.data, plan);
  out(`   claim     ${title}`);

  out('── build');
  const scratch = path.join(kind.work, `regen-${entry.id}`);
  const project = kind.film ? path.join(scratch, 'film') : kind.project;
  const film = build(kind, frozen.data, plan, flags, project);
  const shapes = shapesOf(renditionsFor(kind, flags), project, scratch);
  if (flags['dry-run']) {
    out(`\n[dry-run] ready — would check, render and update the row:`);
    for (const { r, dir } of shapes) out(`  ${r.id.padEnd(10)} ${rel(dir)}`);
    return 'dry-run';
  }

  const made = produce(kind, { project, shapes, film, id: entry.id, flags, hf });
  if (flags.rendition) { out(`\n--rendition=${flags.rendition} is a dev run — nothing recorded`); return 'dev'; }
  // The plan is frozen with the film it made: the record never describes a film that does not exist.
  const updated = ledger.snapshot(kind.id,
    { ...entry, title, ...made, renditions: withUploads(made.renditions, entry.renditions) }, { data: frozen.data, plan });
  out(`  record   releases/${kind.id}/${entry.id}/`);
  // A Release that is out gets its assets replaced. YouTube never: a video there
  // cannot be replaced, only duplicated. A rendition this regen added stays
  // without a link, so youtube.yml uploads it.
  if (flags.publish) await publish(kind, updated, { replace: true });
  return 'rendered';
}

async function regenKind(kind, id, flags) {
  if (!id && !flags.all) throw new Error(`which release? regen ${kind.id} <id> or --all\n${ledger.list(kind.id).map(r => `  ${r.id}`).join('\n')}`);
  if (id && flags.all) throw new Error('pass an id or --all, not both');
  const entries = id ? [ledger.find(kind.id, id)] : ledger.list(kind.id);
  if (id && !entries[0]) throw new Error(`no ${kind.id} release "${id}"`);
  if (flags.all && flags.plan) throw new Error('--plan belongs to one release, not --all');
  // One release failing must not stop the rest from picking up the new film.
  const failed = [];
  for (const e of entries) {
    try { await regen(kind, e, flags); }
    catch (err) { console.error(`FAIL: ${kind.id}/${e.id}: ${err.message}`); failed.push(e.id); }
  }
  if (failed.length) throw new Error(`regen failed for ${failed.join(', ')}`);
}

/** Everything an agent needs to write a plan, and nothing else. */
function brief(kind, id) {
  const dir = id ? ledger.recordDir(kind.id, id) : kind.work;
  const collected = readJson(path.join(dir, 'data.json'));
  if (!collected) throw new Error(id ? `no ${kind.id} record "${id}"` : `nothing collected — run: node lib/cli.mjs collect ${kind.id}`);
  const data = oneRelease(kind, collected);
  const items = kind.items?.(data) ?? [];
  out(`kind     ${kind.id} (${kind.title})`);
  out(`facts    ${rel(path.join(dir, 'data.json'))}`);
  out(`plan     ${id ? `any file, then: node lib/cli.mjs regen ${kind.id} ${id} --plan=FILE` : rel(planFile(kind))}`);
  out(`default  ${kind.headline(data, {})}`);
  out(`\nitems (${items.length}) — the only ids "picks" and "lines" may use`);
  if (!items.length) out('  (none: this kind takes no picks or lines)');
  for (const i of items) {
    out(`  ${i.id}${i.label ? `  —  ${i.label}` : ''}`);
    // The detail is fact too: show it, or the agent cannot quote what the gate would accept.
    if (i.detail && i.detail !== i.label) out(`      ${i.detail}`);
  }
  out(`\nschema\n${SCHEMA}`);
  const current = id ? ledger.load(kind.id, id).plan : readJson(planFile(kind));
  if (current && Object.keys(current).length) out(`\ncurrent plan\n${JSON.stringify(current, null, 2)}`);
}

function gitHead() {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return null; }
}

/** Newest rendered release that is not out yet and whose film is still on disk. */
const unpublished = kind => [...ledger.list(kind.id)].reverse()
  .find(r => r.renderedAt && !r.published?.github
    && Object.values(r.renditions).every(f => fs.existsSync(path.join(ROOT, f.artifact))));

async function publishKind(kind, id, flags) {
  const entry = id ? ledger.find(kind.id, id) : unpublished(kind);
  if (id && !entry) throw new Error(`no ${kind.id} release "${id}"`);
  if (!entry) { out(`${kind.id}: nothing to publish`); return; }
  await publish(kind, entry, { dry: !!flags['dry-run'], youtube: !flags['no-youtube'], replace: !!flags.replace });
}

function printLedger(ids) {
  for (const id of ids) {
    const rows = ledger.list(id);
    out(`${id}  [${rows.length} release${rows.length === 1 ? '' : 's'}]`);
    for (const r of rows) {
      const state = r.published?.github ? 'published' : r.declined ? 'declined' : r.renderedAt ? 'rendered' : 'recorded';
      const films = Object.keys(r.renditions ?? {}).join('+');
      out(`  ${r.id.padEnd(46)} ${state.padEnd(10)} ${films.padEnd(19)} ${r.title ?? ''}`);
    }
  }
}

const USAGE = `usage: node lib/cli.mjs <kinds|run|pending|collect|gen|check|dev|render|publish|plan|regen|accept|ledger> [kind] [flags]
kinds: ${kindIds().join(', ')}`;

async function main() {
  const [cmd, ...argv] = process.argv.slice(2);
  const { flags, rest } = parseArgs(argv);
  const kind = async () => {
    if (!rest[0]) throw new Error(`which kind?\n${USAGE}`);
    return warnGaps([await loadKind(rest[0])])[0];
  };

  switch (cmd) {
    case 'kinds':
      for (const k of warnGaps(await loadKinds())) {
        out(`${k.id.padEnd(18)} ${k.title.padEnd(30)} ${k.film ? 'generated' : 'authored '}  ${(k.scheduled ? 'nightly' : 'on demand').padEnd(9)}  ${k.renditions.join(' + ')}`);
      }
      break;

    case 'run': {
      const k = await kind();
      const results = await run(k, flags);
      // What was just rendered; otherwise the newest film still waiting to go out.
      if (flags.publish) {
        const ids = results.map(r => r.id).filter(Boolean);
        for (const id of ids.length ? ids : [null]) await publishKind(k, id, flags);
      }
      // Only after everything above succeeded, so a failed render can never
      // silently swallow the next release's diff.
      if (flags.accept && k.accept && !results.some(r => r.state === 'dry-run')) k.accept({ dir: k.dir, work: k.work });
      break;
    }

    case 'pending': {
      const kinds = warnGaps(rest.length ? await Promise.all(rest.map(loadKind)) : await loadKinds({ scheduledOnly: true }));
      const pending = [];
      for (const k of kinds) {
        let todo = false;
        for (const data of releasesOf(k, await collect(k, flags))) {
          const prior = data.notable && ledger.findByHash(k.id, ledger.fingerprint(data.parts));
          const missing = data.notable ? lacking(k, prior) : [];
          const name = k.split ? `${data.label}  ` : '';
          out(`   → ${name}${missing.length ? `PENDING${prior ? `: ${prior.id} has no ${missing.join(' or ')} film` : ''}`
            : data.notable ? `already released as ${prior.id}` : 'nothing new'}`);
          todo ||= missing.length > 0;
          // A release that is out but whose baseline never advanced (the run died
          // between publish and accept) would otherwise be re-diffed forever.
          if (!missing.length && prior && k.accept) k.accept({ dir: k.dir, work: k.work });
        }
        out('');
        if (todo) pending.push(k.id);
      }
      out(`pending: ${pending.join(' ') || '(none)'}`);
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `kinds=${pending.join(' ')}\n`);
      break;
    }

    case 'collect': await collect(await kind(), flags); break;

    case 'gen': {
      const k = await kind();
      const data = oneRelease(k, readJson(dataFile(k)) ?? await collect(k, flags));
      build(k, data, planFor(k, data, readJson(planFile(k))), flags);
      break;
    }

    case 'check': case 'dev': case 'render': case 'snapshot': case 'inspect': {
      const k = await kind();
      const passed = argv.filter(a => a.startsWith('-') && !a.startsWith('--rendition'));
      // check gates every rendition the kind makes. The others look at one, landscape
      // unless asked, and --rendition works for a kind that does not make it yet.
      const renditions = cmd === 'check' && !flags.rendition ? k.renditions.map(rendition) : [rendition(flags.rendition ?? 'landscape')];
      for (const { r, dir } of shapesOf(renditions, k.project, k.work)) {
        out(`── ${cmd} ${k.id} ${r.id}   ${rel(dir)}`);
        hyperframes.passthrough(cmd === 'dev' ? 'preview' : cmd, dir, passed);
        if (cmd === 'check' && (r.safe || k.audited)) hyperframes.audit(dir, r.safe, { inherit: true });
        if (cmd === 'check' && r.id === 'portrait' && k.portraitFill) hyperframes.fill(dir, { inherit: true });
      }
      break;
    }

    case 'publish': await publishKind(await kind(), rest[1], flags); break;

    case 'plan': brief(await kind(), rest[1]); break;

    case 'regen': await regenKind(await kind(), rest[1], flags); break;

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

// Run as a command; imported (by the tests), it only exports run and regen.
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  main().catch(e => { console.error(`FAIL: ${e.message}`); process.exit(1); });
}
