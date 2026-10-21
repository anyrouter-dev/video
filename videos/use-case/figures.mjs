/**
 * figures: the films built around an anatomy figure (tools/figures/), and what each machine does
 * on each spoken word. A film here shows its machine in place of the problem's and the result's
 * diagrams, and under each step's label before that step's proof (its code or its real screen)
 * comes in. One machine state runs the whole film, so the copies in the three panels agree.
 *
 * A choreography is a script over an act: `w(line, word)` is when a word of a line is said, on
 * the film's clock; `move(key, at, dur, to)` eases one pose key there; `spin(key, at, rate)` turns
 * one at a steady rate from then on; `sound(at, kind)` is a sound event mix.mjs knows. It runs at
 * build time, so the page only evaluates the tracks it returns.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitSource } from './tools/figures/shop.mjs';
import * as traverser from './tools/figures/traverser.mjs';
import * as carousel from './tools/figures/carousel.mjs';
import * as turret from './tools/figures/turret.mjs';
import * as reader from './tools/figures/reader.mjs';
import * as flywheel from './tools/figures/flywheel.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The machines: the module, its live global, and the words on its card. */
export const MACHINES = {
  traverser: { mod: traverser, live: 'TRAVERSER', title: 'Transfer table' },
  carousel: { mod: carousel, live: 'CAROUSEL', title: 'Key carousel' },
  turret: { mod: turret, live: 'TURRET', title: 'Turret head' },
  reader: { mod: reader, live: 'READER', title: 'Cartridge reader' },
  flywheel: { mod: flywheel, live: 'FLYWHEEL', title: 'Changeover drive' },
};

/**
 * How long a step's machine works under its label before the step's proof comes in: the line
 * "Step 2. Turn on donate." says its verb a second or so after the step starts.
 */
export const LEAD = 2.0;

// ── the act ────────────────────────────────────────────────────────────────
const bare = s => String(s).toLowerCase().replace(/[^a-z0-9/$.:-]+/g, '').replace(/[.:]+$/, '');

function act(init, said, timing) {
  const state = { ...init }, tracks = {}, cues = [], spins = {};
  const track = key => (tracks[key] ??= { init: init[key], segs: [] });
  const lineOf = name => {
    const m = /^(step|more)(\d)$/.exec(name);
    const l = m ? said.find(x => x.beat === 'step' && x.step === +m[2] && !!x.more === (m[1] === 'more')) : said.find(x => x.beat === name);
    if (!l) throw new Error(`figures: no line "${name}"`);
    return l;
  };
  const a = {
    T: timing,
    /** When `word` of a line starts, the nth time it is said, on the film's clock. */
    w(name, word, nth = 1) {
      const l = lineOf(name), hits = l.words.filter(x => bare(x.text) === bare(word));
      if (!hits[nth - 1]) throw new Error(`figures: "${word}" is not said in ${name} (${l.words.map(x => x.text).join(' ')})`);
      return +(l.at + hits[nth - 1].start).toFixed(3);
    },
    /** When a line's last word ends. */
    said(name) { const l = lineOf(name); return +(l.at + l.words.at(-1).end).toFixed(3); },
    now: key => state[key],
    move(key, at, dur, to) {
      if (spins[key]) throw new Error(`figures: ${key} is spinning; stop it first`);
      track(key).segs.push([+at.toFixed(3), +dur.toFixed(3), to]);
      state[key] = to;
      return at + dur;
    },
    set(key, at, to) { return a.move(key, at, 0, to); },
    /** Turns `key` at `rate` a second from `at`, ramping from its last rate over `ramp`: a flywheel, a turntable. */
    spin(key, at, rate, ramp = 0.6) { (spins[key] ??= { from: state[key], marks: [] }).marks.push([at, rate, ramp]); },
    sound(at, kind, extra = {}) { cues.push({ at: +at.toFixed(2), kind, ...extra }); },
  };
  const finish = end => {
    // a spin is sampled every tenth of a second as straight segments: rate × time, ramps integrated
    for (const [key, { from, marks }] of Object.entries(spins)) {
      const rateAt = t => {
        let r = 0, prev = 0;
        for (const [at, rate, ramp] of marks) {
          if (t < at) break;
          r = t >= at + ramp ? rate : prev + (rate - prev) * ((t - at) / ramp);
          prev = rate;
        }
        return r;
      };
      const t0 = marks[0][0], tr = track(key);
      let v = from;
      for (let t = t0; t < end; t += 0.1) {
        const next = v + 0.1 * (rateAt(t) + rateAt(t + 0.1)) / 2;
        tr.segs.push([+t.toFixed(3), 0.1, +next.toFixed(3), 1]);
        v = next;
      }
    }
    // every key the machine starts in is posed, moved or not
    for (const key of Object.keys(init)) track(key);
    return { tracks, cues: cues.sort((x, y) => x.at - y.at) };
  };
  return { a, finish };
}

// ── the machines' moves ────────────────────────────────────────────────────
const CAR_SPEED = 240, BRIDGE_SPEED = 100, ONBRIDGE = -54;
const runTime = (from, to, speed) => Math.max(0.4, Math.abs(to - from) / speed + 0.2);
const norm = (from, goal) => from + ((((goal - from) % 360) + 540) % 360) - 180;

function traverserMoves(a) {
  const { EXITS, CAR_HOME, CAR_STOP, ENTRY_Y } = traverser;
  const LAMPS = ['lamp:key', 'lamp:entry', 'lamp:bridge', ...EXITS.map((_, i) => `lamp:exit${i}`)];
  const light = (t, lamp) => {
    for (const l of LAMPS) if (l !== lamp && a.now(l) > 0) a.move(l, t, 0.2, 0);
    if (lamp && a.now(lamp) < 1) a.move(lamp, t, 0.2, 1);
  };
  const car = (t, to, speed = CAR_SPEED) => { a.sound(t, 'move'); return a.move('carX', t, runTime(a.now('carX'), to, speed), to); };
  const slide = (t, to) => { a.sound(t, 'move', { n: 1 }); const end = a.move('yc', t, runTime(a.now('yc'), to, BRIDGE_SPEED), to); a.sound(end - 0.05, 'seat'); return end; };
  /** A request out to exit i and its answer; a failing exit lights its fault lamp and sends the car back. */
  const run = (t, i, { fail = false } = {}) => {
    if (a.now('carX') !== ONBRIDGE) t = car(t, ONBRIDGE) + 0.05;
    if (a.now('yc') !== EXITS[i]) t = slide(t, EXITS[i]) + 0.05;
    t = car(t, CAR_STOP, 320);
    if (fail) {
      a.move(`lamp:fault-exit${i}`, t, 0.1, 1);
      a.sound(t, 'seat', { n: 3 });
      a.move(`lamp:fault-exit${i}`, t + 0.55, 0.3, 0);
      return car(t + 0.35, ONBRIDGE, 320);
    }
    light(t, `lamp:exit${i}`);
    a.sound(t, 'arrive');
    return t + 0.2;
  };
  const home = t => {
    light(t, null);
    if (a.now('carX') !== ONBRIDGE && a.now('carX') !== CAR_HOME) t = car(t, ONBRIDGE, 320);
    if (a.now('yc') !== ENTRY_Y) t = slide(t, ENTRY_Y);
    return a.now('carX') === CAR_HOME ? t : car(t, CAR_HOME, 320);
  };
  return { light, car, slide, run, home, EXITS, ONBRIDGE, CAR_HOME };
}

function carouselMoves(a) {
  const { SLOTS, SERVE } = carousel;
  let pitch = 0;
  /** Turns slot i to the service arm, dips onto its key, and drops a credit token in its cup if asked. */
  const serve = (t0, i, { token = false, turnD = 0.55 } = {}) => {
    const goal = norm(a.now('turn'), SERVE - (360 / SLOTS) * i);
    const turning = Math.abs(goal - a.now('turn')) > 0.5;
    if (turning) { a.sound(t0, 'move'); a.move('turn', t0, turnD, goal); }
    const at = t0 + (turning ? turnD + 0.05 : 0);
    a.move('dip', at, 0.18, 1);
    a.set('lit', at + 0.18, i);
    a.move('lamp:serve', at + 0.18, 0.12, 1);
    a.sound(at + 0.16, 'seat', { n: pitch++ });
    if (token) {
      a.set(`token${i}`, at + 0.2, 0.001);
      a.move(`token${i}`, at + 0.22, 0.42, 1);
      a.sound(at + 0.62, 'arrive', { n: pitch });
    }
    a.move('dip', at + 0.42, 0.25, 0);
    a.move('lamp:serve', at + 0.45, 0.25, 0);
    a.set('lit', at + 0.67, -1);
    return at + 0.7;
  };
  return { serve };
}

function turretMoves(a) {
  let n = 0;
  /** Pulls the index pin, turns the head to station j, and locks it there. */
  const index = (t0, j) => {
    const goal = norm(a.now('rot'), -60 * j);
    a.move('pull', t0, 0.14, 1);
    a.set('lit', t0 + 0.14, -1);
    a.move('rot', t0 + 0.14, 0.38, goal);
    a.sound(t0 + 0.14, 'move');
    a.move('pull', t0 + 0.52, 0.12, 0);
    a.set('lit', t0 + 0.6, j);
    a.sound(t0 + 0.6, 'seat', { n: n++ });
    return t0 + 0.65;
  };
  return { index };
}

// ── the films ──────────────────────────────────────────────────────────────
// Each script reads the film's own lines: what the machine does is what the voice says.
const FILMS = {
  // The pool's carousel: keys idle on the table at month end; one is added, donated, served, and
  // a credit drops into its cup each time it serves.
  'donate-keys': {
    machine: 'carousel',
    init: (() => {
      const s = { turn: 0, dip: 0, lit: -1, 'lamp:serve': 0 };
      for (let i = 0; i < carousel.SLOTS; i++) { s[`key${i}`] = [4, 7, 10].includes(i) ? 0 : 1; s[`lift${i}`] = 0; s[`token${i}`] = 0; }
      return s;
    })(),
    script(a) {
      const { serve } = carouselMoves(a);
      // the keys go round and round, and nothing is served: the arm stays up
      a.move('turn', a.T.problem.at - 0.6, a.said('problem') - a.T.problem.at + 1.4, -40);
      // step 1: the key drops into an empty slot
      const add = a.w('step1', 'key');
      a.move('turn', a.T.steps[0].at - 0.2, 0.7, norm(-40, carousel.SERVE - 30 * 4 + 60));
      a.set('lift4', add - 0.2, 26);
      a.move('key4', add - 0.2, 0.25, 1);
      a.move('lift4', add - 0.15, 0.45, 0);
      a.sound(add + 0.3, 'seat');
      // step 2: donated, it turns to the arm and is served
      serve(a.w('step2', 'donate') - 0.55, 4);
      // step 3: pool traffic earns it credits
      serve(a.w('step3', 'credits') - 0.55, 4, { token: true });
      // the result: it serves other people's requests, and pays back in credits
      let t = serve(a.w('result', 'serves') - 0.55, 5);
      t = serve(Math.max(t + 0.05, a.w('result', 'requests') - 0.6), 6);
      t = serve(Math.max(t + 0.05, a.w('result', 'credits') - 0.6), 4, { token: true });
      for (const i of [8, 9, 11, 0, 1]) { if (t + 1.4 > a.T.end - 0.6) break; t = serve(t + 0.35, i); }
    },
  },
  // The transfer table: a request runs to its :free exit, which is rate limited; the bridge
  // slides it to another free model's exit, which answers.
  'openrouter-free-fallback': {
    machine: 'traverser',
    init: { yc: 0, carX: traverser.CAR_HOME, key: 1, 'lamp:key': 1, 'lamp:entry': 0, 'lamp:bridge': 0, ...Object.fromEntries(traverser.EXITS.flatMap((_, i) => [[`lamp:exit${i}`, 0], [`lamp:fault-exit${i}`, 0]])) },
    script(a) {
      const m = traverserMoves(a);
      // a free model on one route runs out at busy hours, and the same route again fails again
      let t = m.run(a.T.problem.at - 0.2, 2, { fail: true });
      t = m.run(Math.max(t + 0.1, a.w('problem', 'busy') - 0.9), 2, { fail: true });
      m.home(t + 0.2);
      // step 1: the call goes in with its free model's id
      m.light(a.w('step1', 'call') - 0.1, 'lamp:entry');
      t = m.car(a.w('step1', 'free'), m.ONBRIDGE);
      m.slide(Math.max(t + 0.05, a.w('step1', 'id') - 0.3), m.EXITS[2]);
      // step 2: the route is limited, so another free model answers, and the header says which
      t = m.run(a.T.steps[1].at + 0.1, 2, { fail: true });
      m.run(t + 0.05, 4);
      // the result: every request that meets the limit is answered by a different free model
      t = Math.max(a.w('result', 'when') - 0.2, a.T.result.at);
      while (t + 3.2 < a.T.end - 0.4) {
        t = m.run(t, 2, { fail: true });
        t = m.run(t + 0.05, 4) + 0.5;
      }
    },
  },
  // The turret head: every agent is a station on one head, turned by one drive that carries the
  // key and the model.
  'coding-agents': {
    machine: 'turret',
    init: { rot: 0, pull: 0, lit: -1, 'lamp:drive': 0 },
    script(a) {
      const { index } = turretMoves(a);
      // each agent, set up on its own: the head turns past each, the drive dark
      index(a.w('problem', 'coding') - 0.3, 1);
      index(a.w('problem', 'key') - 0.3, 3);
      index(a.w('problem', 'url') - 0.2, 0);
      // step 1: one key, in the drive
      const key = a.w('step1', 'mint');
      a.move('lamp:drive', key - 0.1, 0.3, 1);
      a.sound(key, 'seat', { n: 4 });
      // step 2: Claude Code takes the Anthropic env vars
      index(a.w('step2', 'anthropic') - 0.3, 0);
      // step 3: the same drive, on anyrouter/auto
      a.move('lamp:drive', a.w('step3', 'start') - 0.1, 0.2, 0.35);
      a.move('lamp:drive', a.w('step3', 'anyrouter/auto') - 0.05, 0.3, 1);
      a.sound(a.w('step3', 'anyrouter/auto'), 'seat', { n: 2 });
      // the result: every agent turns to the same drive
      let t = index(a.w('result', 'every') - 0.3, 1);
      for (const j of [3, 4, 2, 0, 1, 3]) { if (t + 0.9 > a.T.end - 0.5) break; t = index(t + 0.25, j); }
    },
  },
  // The transfer table for one client: Claude Code's requests take the default exit until anyr
  // switches its key on and the bridge is set to the model you pin.
  'claude-code': {
    machine: 'traverser',
    init: { yc: 0, carX: traverser.CAR_HOME, key: 0, 'lamp:key': 0, 'lamp:entry': 0, 'lamp:bridge': 0, ...Object.fromEntries(traverser.EXITS.flatMap((_, i) => [[`lamp:exit${i}`, 0], [`lamp:fault-exit${i}`, 0]])) },
    script(a) {
      const m = traverserMoves(a);
      // by default every request takes the one exit
      let t = m.run(a.T.problem.at - 0.2, 0);
      t = m.run(Math.max(t + 0.3, a.w('problem', 'audit') - 0.8), 0);
      m.home(Math.max(t + 0.2, a.w('problem', 'custom') - 0.4));
      // step 1: anyr installed, the key is turned
      const on = a.w('step1', 'anyr');
      a.move('key', on - 0.3, 0.5, 1);
      a.sound(on - 0.3, 'seat');
      m.light(on + 0.2, 'lamp:key');
      // step 2: anyr claude sets the base URL and the key: the entry lights and the request goes in
      m.light(a.w('step2', 'run') - 0.1, 'lamp:entry');
      m.car(a.w('step2', 'claude') - 0.2, m.ONBRIDGE);
      // step 3: pin a model: the bridge slides to its exit
      m.slide(a.w('step3', 'pin') - 0.1, m.EXITS[3]);
      // the result: Claude Code works as before, its requests out on the model you picked
      t = Math.max(a.w('result', 'works') - 0.4, a.T.result.at);
      while (t + 2 < a.T.end - 0.4) {
        t = m.run(t, 3) + 0.5;
        if (t + 2 >= a.T.end - 0.4) break;
        t = m.car(t, m.ONBRIDGE, 320) + 0.1;
      }
    },
  },
  // The cartridge reader: one head on one shuttle, held to one vendor's cartridge until the
  // provider frees it; then a catalog id sends the same head to any cartridge.
  'ai-sdk': {
    machine: 'reader',
    init: { slot: 0, dip: 1, lock: 0, lit: 0, 'lamp:head': 1 },
    script(a) {
      // one vendor: the head pulls against the lock and stays on the first cartridge
      const one = a.w('problem', 'one');
      a.move('dip', a.w('problem', 'providers') - 0.2, 0.25, 0);
      a.move('slot', one - 0.25, 0.25, 0.04);
      a.move('slot', one + 0.05, 0.2, -0.03);
      a.move('slot', one + 0.3, 0.2, 0);
      a.move('dip', a.w('problem', 'vendor') + 0.2, 0.25, 1);
      a.sound(a.w('problem', 'vendor') + 0.45, 'seat');
      // step 1: the AnyRouter provider frees the shuttle
      const free = a.w('step1', 'provider');
      a.move('lock', free - 0.5, 0.6, 1);
      a.sound(free - 0.5, 'move');
      a.sound(free + 0.1, 'seat', { n: 2 });
      // step 2: a catalog id sends the head to its cartridge
      const id = a.w('step2', 'id');
      a.move('dip', id - 0.9, 0.2, 0);
      a.set('lit', id - 0.7, -1);
      a.move('lamp:head', id - 0.9, 0.2, 0);
      a.sound(id - 0.7, 'move');
      a.move('slot', id - 0.7, 0.6, 2);
      a.move('dip', id - 0.05, 0.2, 1);
      a.set('lit', id + 0.15, 2);
      a.move('lamp:head', id + 0.15, 0.2, 1);
      a.sound(id + 0.12, 'seat', { n: 3 });
      // the result: switching models is a new id; the same head reads another cartridge
      const go = (t, slot) => {
        a.move('dip', t, 0.2, 0);
        a.set('lit', t + 0.2, -1);
        a.move('lamp:head', t, 0.2, 0);
        a.sound(t + 0.2, 'move');
        const d = 0.3 + 0.15 * Math.abs(slot - a.now('slot'));
        a.move('slot', t + 0.2, d, slot);
        a.move('dip', t + 0.25 + d, 0.2, 1);
        a.set('lit', t + 0.45 + d, slot);
        a.move('lamp:head', t + 0.45 + d, 0.2, 1);
        a.sound(t + 0.43 + d, 'seat', { n: slot });
        return t + 0.7 + d;
      };
      let t = go(a.w('result', 'switching') - 0.3, 4);
      for (const s of [1, 5, 3, 0, 2]) { if (t + 1.6 > a.T.end - 0.5) break; t = go(t + 0.5, s); }
    },
  },
  // The changeover drive: the tool loop is a flywheel; one motor stops and the loop stops with
  // it, until the plugin is seated and keyed, and a live motor is slid in each time one stops.
  'hermes-agent': {
    machine: 'flywheel',
    init: { spin: 0, sled: 0, plug: 0, key: 0, lit: 0, 'lamp:m0': 1, 'lamp:m1': 1, 'lamp:m2': 1, 'lamp:plug': 0 },
    script(a) {
      const RATE = 150;
      a.spin('spin', 0, RATE, 0.01);
      // one upstream model: its outage stops the loop
      const out = a.w('problem', 'outages');
      a.move('lamp:m0', out - 0.1, 0.3, 0);
      a.set('lit', out, -1);
      a.sound(out, 'seat', { n: 3 });
      a.spin('spin', out, 0, 1.4);
      // step 1: the plugin comes down onto its mount
      const plug = a.w('step1', 'plugin');
      a.move('plug', plug - 0.6, 0.7, 1);
      a.sound(plug - 0.6, 'move');
      a.sound(plug + 0.1, 'seat');
      // step 2: the key, turned in the plugin
      const key = a.w('step2', 'anyrouter');
      a.move('key', key - 0.4, 0.45, 1);
      a.sound(key - 0.4, 'seat', { n: 2 });
      a.move('lamp:plug', key + 0.05, 0.25, 1);
      // step 3: a model is picked, a motor drives, and the loop runs again
      const pick = a.w('step3', 'pick');
      a.move('lamp:m0', pick - 0.1, 0.3, 1);
      a.set('lit', pick, 0);
      a.sound(pick, 'arrive');
      a.spin('spin', pick, RATE, 1.0);
      // the result: the motor in line stops, the next live one slides in, and the loop never stops
      const swap = (t, from, to) => {
        a.move(`lamp:m${from}`, t, 0.25, 0);
        a.set('lit', t + 0.2, -1);
        a.sound(t + 0.2, 'move');
        a.move('sled', t + 0.25, 0.7, to);
        a.set('lit', t + 0.95, to);
        a.sound(t + 0.95, 'seat', { n: to + 2 });
        return t + 1.0;
      };
      let t = swap(a.w('result', 'hermes') - 0.2, 0, 1);
      if (t + 2.4 < a.T.end) swap(t + 1.4, 1, 2);
    },
  },
};

/** Whether a use case's film is built around a figure. */
export const hasFigure = slug => slug in FILMS;
export const machineOf = slug => FILMS[slug]?.machine ?? null;

/** The figure's moves and sounds for one film, on its clock: { machine, tracks, cues }. */
export function choreograph(slug, { said, timing, duration }) {
  const f = FILMS[slug];
  if (!f) return null;
  const { a, finish } = act(f.init, said, timing);
  f.script(a);
  return { machine: f.machine, ...finish(duration) };
}

const cache = {};
/** The machine's static art, landscape and portrait, with its projections. */
export function artOf(machine) {
  if (cache[machine]) return cache[machine];
  const { mod } = MACHINES[machine];
  const land = mod.figure('landscape'), port = mod.figure('portrait');
  return (cache[machine] = { land: { svg: land.svg, P: land.P, W: land.W, H: land.H }, port: { svg: port.svg, P: port.P, W: port.W, H: port.H } });
}

/** The page script that carries the kit and one machine's live code, as window.UCF. */
export function scriptOf(machine) {
  const { mod, live } = MACHINES[machine], art = artOf(machine);
  return `// generated by videos/use-case/figures.mjs: the anatomy kit (MIT, tools/anatomy/LICENSE) and the ${machine}'s live code
window.UCF = (() => {
${kitSource()}
${mod.liveSource()}
return { k, G, live: ${live}, svg: ${JSON.stringify({ land: art.land.svg, port: art.port.svg })}, P: ${JSON.stringify({ land: art.land.P, port: art.port.P })}, size: ${JSON.stringify({ land: [art.land.W, art.land.H], port: [art.port.W, art.port.H] })} };
})();
`;
}

/** The anatomy look on the film's white page: the kit's light tokens, no halo, the film's accent. */
export const FIG_CSS = fs.readFileSync(path.join(HERE, 'tools/anatomy/iso.css'), 'utf8').replace('filter:blur(9px);', '')
  + `.iso.lf-fig{--anatomy-paper:#ffffff;--anatomy-card:#ffffff;--anatomy-face:#ffffff;--anatomy-top:#ffffff;--anatomy-lit-top:#ffffff;--anatomy-weight:1.5px;--lf-accent:#BB4D00}
.iso.lf-fig .iso-halo{display:none}
.iso.lf-fig .lf-lamp{fill:var(--lf-accent);stroke:none}
.iso.lf-fig .lf-ink{fill:var(--anatomy-hi);stroke:none}`;
