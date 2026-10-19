/**
 * use-case: one short silent film per use case on anyrouter.dev/use-cases,
 * embedded on that page above the steps. A viewer gets, in seconds: what the
 * use case does, the one command, the steps, and how a request flows.
 *
 * Facts come only from https://anyrouter.dev/use-cases.json. Every word on
 * screen is a fact taken verbatim (a field, or its first sentence), with API
 * keys redacted. The film is built in the Clear look of frame.md v2 by
 * project.mjs, not by lib/film.mjs, and carries its portrait layout so
 * shared/authoring/portrait.mjs can cut the 1080x1920 rendition.
 *
 * One collect holds every use case; `split` makes each its own release, whose
 * identity is the hash of the facts its film shows. Editing one use case
 * re-renders that film only.
 *
 *   --slug=SLUG   collect just this use case
 *   --from=FILE   build from a saved use-cases.json instead of the live site
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { markFor } from '../../lib/marks.mjs';
import { writeProject } from './project.mjs';
import { CSS, READ_WPS, setIn, titleScene, problemScene, commandScene, stepScene, flowScene, endScene } from './scenes.mjs';

export const API = 'https://anyrouter.dev/use-cases.json';
export const FILM = { min: 15, max: 25 };
const MAX_STEPS = 3;
// The fastest a film may ask a viewer to read when its facts do not fit at READ_WPS.
// The page under the film carries every word, so the film may be brisk, never unreadable.
export const MAX_WPS = 5;

// ── facts: parsed at the boundary, trusted after ───────────────────────────
const fail = (where, what) => { throw new Error(`use-cases.json: ${where}: ${what}`); };
const str = (v, where) => (typeof v === 'string' && v.trim() ? v : fail(where, 'expected a non-empty string'));
const list = (v, where) => (Array.isArray(v) ? v : fail(where, 'expected an array'));

function parseUseCase(u, i) {
  const at = `useCases[${i}]${u?.slug ? ` (${u.slug})` : ''}`;
  const slug = str(u?.slug, `${at}.slug`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`${at}.slug`, `"${slug}" is not a page slug`);
  const diagram = u.diagram && {
    nodes: list(u.diagram.nodes, `${at}.diagram.nodes`).map((n, k) => ({
      id: str(n.id, `${at}.diagram.nodes[${k}].id`),
      kind: ['tool', 'gateway', 'provider', 'fallback'].includes(n.kind) ? n.kind : fail(`${at}.diagram.nodes[${k}].kind`, `unknown kind "${n.kind}"`),
      label: str(n.label, `${at}.diagram.nodes[${k}].label`),
      note: n.note ?? null,
      provider: n.provider ?? null,
    })),
    edges: list(u.diagram.edges, `${at}.diagram.edges`).map(e => ({ from: e.from, to: e.to, dashed: !!e.dashed })),
  };
  return {
    slug,
    url: str(u.url, `${at}.url`),
    kicker: str(u.kicker, `${at}.kicker`),
    title: str(u.title, `${at}.title`),
    summary: str(u.summary, `${at}.summary`),
    problem: typeof u.problem === 'string' ? u.problem : '',
    logos: list(u.logos ?? [], `${at}.logos`),
    command: u.command?.text ? { text: str(u.command.text, `${at}.command.text`), shell: !!u.command.shell } : null,
    snippets: list(u.snippets ?? [], `${at}.snippets`).map(s => ({ code: String(s.code ?? ''), title: s.title ?? null })),
    steps: list(u.steps, `${at}.steps`).map((s, k) => str(s, `${at}.steps[${k}]`)),
    diagram,
  };
}

export function parseDoc(doc) {
  if (doc?.version !== 1) fail('version', `expected 1, got ${JSON.stringify(doc?.version)}`);
  const useCases = list(doc.useCases, 'useCases').map(parseUseCase);
  const dup = useCases.find((u, i) => useCases.findIndex(v => v.slug === u.slug) !== i);
  if (dup) fail('useCases', `slug "${dup.slug}" appears twice`);
  return useCases;
}

// ── copy: what of the facts reaches the screen ─────────────────────────────
// API keys are the one thing on screen that is not verbatim: past its prefix a
// key is bullets. The site's copy only ever shows prefixes; this guards the day it doesn't.
const KEY = /\b(sk-ar-v1-|sk-ar-|sk-or-v1-|sk-ant-|sk-proj-|sk-|nvapi-|xai-|gsk_|ghp_|AIza)[A-Za-z0-9_-]{8,}/g;
export const redact = s => String(s).replace(KEY, (_, prefix) => `${prefix}••••••••`);

/** The first sentence, cut at a stop followed by a space. Never rewritten. */
export const firstSentence = s => String(s).match(/^.*?[.!?](?=\s)/s)?.[0] ?? String(s);

/** The command's snippet title: the snippet whose code holds the command line, if it is titled. */
const commandTitle = u => u.snippets.find(s => s.title && s.code.split('\n').some(l => l.trim() === u.command.text.trim()))?.title ?? null;

/** Diagram nodes by longest-path depth from the nodes nothing points at, as on the site. */
export function levelsOf(diagram) {
  const ids = new Set(diagram.nodes.map(n => n.id));
  for (const e of diagram.edges) if (!ids.has(e.from) || !ids.has(e.to)) fail('diagram', `edge ${e.from} -> ${e.to} names a missing node`);
  const depth = new Map();
  const visit = (id, d, seen) => {
    if (seen.has(id)) fail('diagram', `cycle at "${id}"`);
    if ((depth.get(id) ?? -1) >= d) return;
    depth.set(id, d);
    for (const e of diagram.edges) if (e.from === id) visit(e.to, d + 1, new Set(seen).add(id));
  };
  const targets = new Set(diagram.edges.map(e => e.to));
  for (const n of diagram.nodes) if (!targets.has(n.id)) visit(n.id, 0, new Set());
  const levels = [];
  for (const n of diagram.nodes) {
    if (!depth.has(n.id)) fail('diagram', `node "${n.id}" is unreachable`);
    (levels[depth.get(n.id)] ??= []).push(n);
  }
  return levels;
}

/** Every string the film can show, before pacing picks how much of each. Throws when one cannot be set legibly. */
export function copyOf(u) {
  const set = (role, text, where) => setIn(role, text) ?? fail(`${u.slug}.${where}`, `"${text}" does not fit the ${role} type in either frame`);
  const steps = u.steps.slice(0, MAX_STEPS).map(redact).map((full, i) => {
    const short = firstSentence(full);
    // a step that cannot be set in two lines is cut to its first sentence
    const text = setIn('step', full) ? full : short;
    return { full, short, text, type: set('step', text, `steps[${i}]`) };
  });
  const levels = u.diagram && levelsOf(u.diagram);
  if (levels && (levels.length > 3 || levels.some(l => l.length > 2))) {
    fail(`${u.slug}.diagram`, 'the film draws at most three levels of at most two nodes');
  }
  const title = redact(u.title);
  // the problem is optional, so one too long to set legibly is left out rather than failing the film
  const problem = u.problem && redact(firstSentence(u.problem));
  const problemType = problem ? setIn('problem', problem) : null;
  return {
    slug: u.slug,
    url: u.url,
    kicker: redact(u.kicker),
    title,
    problem: problemType ? problem : null,
    marks: [...new Set(u.logos.map(markFor).filter(Boolean))],
    command: u.command && { text: redact(u.command.text), shell: u.command.shell, title: commandTitle(u) && redact(commandTitle(u)) },
    steps,
    diagram: levels && {
      levels: levels.map((lvl, d) => lvl.map(n => {
        set('label', n.label, `diagram.${n.id}.label`);
        if (n.note) set('note', n.note, `diagram.${n.id}.note`);
        return { ...n, label: redact(n.label), note: n.note && redact(n.note), mark: markFor(n.provider), depth: d };
      })),
      edges: u.diagram.edges,
    },
    type: { title: set('title', title, 'title'), problem: problemType },
    wps: READ_WPS,
    endHold: 3,
  };
}

// ── the film: a table of scenes, keyed by which facts are present ──────────
const SCENES = [
  { key: 'title', has: () => true, build: c => [titleScene(c)] },
  { key: 'problem', has: c => !!c.problem, build: c => [problemScene(c)] },
  { key: 'command', has: c => !!c.command, build: c => [commandScene(c)] },
  { key: 'step', has: c => c.steps.length > 0, build: c => c.steps.map((_, i) => stepScene(c, i)) },
  { key: 'flow', has: c => !!c.diagram, build: (c, id) => [flowScene(c, id)] },
  { key: 'end', has: () => true, build: c => [endScene(c)] },
];

/** The scenes these copy facts make, in order, each with its own reading length. */
function scenesOf(copy) {
  const out = [];
  for (const s of SCENES.filter(s => s.has(copy))) {
    // the flow needs its id up front: its SVG masks are named after it
    const first = out.length + 1;
    const id = n => `s${String(first + n).padStart(2, '0')}-${s.key}`;
    s.build(copy, id(0)).forEach((scene, n) => out.push({ ...scene, id: id(n), key: s.key }));
  }
  return out;
}

// Scene lengths are kept in tenths of a second: three frames, so every cut
// lands on a frame and scenes sit exactly back to back.
const tenths = seconds => Math.round(seconds * 10);
const total = scenes => scenes.reduce((sum, s) => sum + tenths(s.seconds), 0) / 10;

// What gives way when a film runs past FILM.max, in order. Each returns a
// lighter copy, or null when it has nothing left to give. A viewer must get
// what the use case does, the command, the steps and the flow; the problem is
// why, so it goes first.
const SQUEEZE = [
  copy => (copy.problem ? { ...copy, problem: null } : null),
  // then the longest step still shown in full is cut to its first sentence
  copy => {
    const long = copy.steps.filter(s => s.text !== s.short).sort((a, b) => b.text.length - a.text.length)[0];
    if (!long) return null;
    return { ...copy, steps: copy.steps.map(s => (s === long ? { ...s, text: s.short, type: setIn('step', s.short) } : s)) };
  },
  // then everything reads a little faster, up to MAX_WPS
  copy => (copy.wps < MAX_WPS ? { ...copy, wps: Math.min(MAX_WPS, copy.wps + 0.25) } : null),
  // last, the end card holds two seconds instead of three
  copy => (copy.endHold > 2 ? { ...copy, endHold: 2 } : null),
];

/** Copy and scenes that fit FILM: squeezed when long, held longer when short. */
export function storyOf(u) {
  let copy = copyOf(u);
  let scenes = scenesOf(copy);
  for (const squeeze of SQUEEZE) {
    for (let next; total(scenes) > FILM.max && (next = squeeze(copy));) { copy = next; scenes = scenesOf(copy); }
  }
  const seconds = total(scenes);
  if (seconds > FILM.max) fail(u.slug, `the film needs ${seconds.toFixed(1)}s even squeezed (max ${FILM.max})`);
  // a short film holds every scene a little longer, in proportion
  const stretch = Math.max(1, FILM.min / seconds);
  let at = 0;
  const timed = scenes.map(s => {
    const dur = tenths(s.seconds * stretch);
    const scene = { ...s, start: at / 10, dur: dur / 10 };
    at += dur;
    return scene;
  });
  return { copy: { ...copy, steps: copy.steps.map(s => s.text) }, scenes: timed, duration: at / 10 };
}

// ── identity ───────────────────────────────────────────────────────────────
const stable = v => (Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  : JSON.stringify(v ?? null));
/** The facts a film and its release notes are cut from. Fields the film never shows (hook, notes, limits) are left out. */
const filmed = u => ({
  slug: u.slug, url: u.url, kicker: u.kicker, title: u.title, summary: u.summary, logos: u.logos, problem: u.problem,
  command: u.command && { ...u.command, title: commandTitle(u) }, steps: u.steps, diagram: u.diagram,
});
const partsOf = u => [`${u.slug}:${crypto.createHash('sha256').update(stable(filmed(u))).digest('hex')}`];

/** Collected facts in the shape every release has, for one use case or many. */
const releaseOf = useCases => ({
  notable: useCases.length > 0,
  label: useCases.length === 1 ? useCases[0].slug : 'use-cases',
  parts: useCases.flatMap(partsOf),
  useCases,
});
const one = data => data.useCases[0];

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export default {
  id: 'use-case',
  title: 'Use case',
  scheduled: false,

  async collect({ flags }) {
    let doc;
    if (flags.from) doc = readJson(path.resolve(flags.from));
    else {
      const r = await fetch(API);
      if (!r.ok) throw new Error(`${API} answered HTTP ${r.status}`);
      doc = await r.json();
    }
    const all = parseDoc(doc);
    const useCases = flags.slug ? all.filter(u => u.slug === flags.slug) : all;
    if (flags.slug && !useCases.length) throw new Error(`no use case "${flags.slug}". The use cases are: ${all.map(u => u.slug).join(', ')}`);
    for (const u of useCases) console.log(`  ${u.slug.padEnd(32)} ${u.title}`);
    return releaseOf(useCases);
  },

  split: data => data.useCases.map(u => releaseOf([u])),

  film(data) {
    const u = one(data);
    const { scenes, duration } = storyOf(u);
    return {
      title: u.title,
      duration,
      palette: 'intro',
      volume: 0.5,
      css: CSS,
      scenes,
      summary: `${u.slug}: ${scenes.map(s => `${s.key} ${s.dur}s`).join(' · ')}`,
    };
  },

  write: writeProject,

  headline: data => one(data).title,

  notes: data => [one(data).summary, one(data).url],

  link: data => one(data).url,

  /** The title card once its words have risen: the marks, the kicker and the title. */
  coverAt: film => {
    const t = film.scenes[0];
    return t.start + Math.max(1.4, t.dur - 0.5);
  },
};
