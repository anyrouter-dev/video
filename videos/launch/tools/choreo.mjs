// The film's choreography as data: for each frame, what the machine does when, what the card
// says, and the sound each event makes. Times are seconds into the frame, read off the voice's
// word times, so motion lands on the word. frames.mjs turns this into compositions/frames/ and
// sfx-cues.json; nothing else times the picture.
import fs from "node:fs";
import path from "node:path";
import { EXITS, CAR_HOME, CAR_STOP, ENTRY_Y } from "./figures/traverser.mjs";
import { SLOTS, SERVE } from "./figures/carousel.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const FILM = path.join(HERE, "..");
const meta = JSON.parse(fs.readFileSync(path.join(FILM, "audio_meta.json"), "utf8"));
const facts = JSON.parse(fs.readFileSync(path.join(FILM, "facts.json"), "utf8"));

const bare = (s) => s.toLowerCase().replace(/[^\w$./-]+/g, "").replace(/\.$/, "");

/** One act: the machine's state carries from frame to frame, so a cut inside an act never jumps. */
function act(initial) {
  const state = structuredClone(initial);
  return function frame(n, spec, script) {
    const voice = meta.voices.find((v) => Number(v.frame) === n);
    const tracks = {};
    const events = [];
    const readout = [];
    const track = (key) => (tracks[key] ??= { init: state[key], segs: [] });
    const api = {
      dur: voice.duration_s,
      /** When a spoken word starts (the nth time it is said). */
      w(word, nth = 1) {
        const hits = voice.words.filter((x) => bare(x.text) === bare(word));
        if (!hits[nth - 1]) throw new Error(`frame ${n}: "${word}" not spoken (have ${voice.words.map((x) => x.text).join(" ")})`);
        return hits[nth - 1].start;
      },
      move(key, t0, d, to) { track(key).segs.push([+t0.toFixed(3), +d.toFixed(3), to]); state[key] = to; return t0 + d; },
      set(key, t, to) { return api.move(key, t, 0, to); },
      now: (key) => state[key],
      sound(t, sound, volume = 0.3, pitch = 0) { events.push({ t: +t.toFixed(3), sound, volume, pitch }); },
      say(t, text) { readout.push([+t.toFixed(3), text]); },
    };
    script(api);
    for (const key of Object.keys(state)) track(key);
    const statement = (Array.isArray(spec.statement) ? spec.statement : [[0, spec.statement ?? ""]])
      .map(([t, text]) => [typeof t === "string" ? +(api.w(t) - 0.1).toFixed(3) : t, text]);
    return { n, ...spec, statement, dur: voice.duration_s, tracks, events, readout };
  };
}

// a car runs at about 220 units a second, the bridge at 60; both accelerate and settle
const CAR_SPEED = 220;
const BRIDGE_SPEED = 90;
const ONBRIDGE = -54;
const runTime = (from, to, speed) => Math.max(0.45, Math.abs(to - from) / speed + 0.25);

function traverserFrames() {
  const frame = act({ yc: ENTRY_Y, carX: CAR_HOME, key: 0, "lamp:key": 0, "lamp:entry": 0, "lamp:bridge": 0, ...Object.fromEntries(EXITS.map((_, i) => [`lamp:exit${i}`, 0])) });
  const ep = "POST /api/v1/chat/completions";
  const [m1, m2] = facts.routeModels;
  const car = (a, t0, to) => {
    const d = runTime(a.now("carX"), to, CAR_SPEED);
    a.sound(t0, "whoosh-short", 0.12);
    return a.move("carX", t0, d, to);
  };
  const slide = (a, t0, to) => {
    const d = runTime(a.now("yc"), to, BRIDGE_SPEED);
    a.sound(t0, "whoosh-short", 0.1, -3);
    const end = a.move("yc", t0, d, to);
    a.sound(end - 0.05, "click-soft", 0.24, 0);
    return end;
  };
  const out = [];
  // one lit lamp at a time: lighting one puts the others out
  const LAMPS = ["lamp:key", "lamp:entry", "lamp:bridge", ...EXITS.map((_, i) => `lamp:exit${i}`)];
  const light = (a, t, lamp) => {
    for (const l of LAMPS) if (l !== lamp && a.now(l) > 0) a.move(l, t, 0.2, 0);
    if (lamp) a.move(lamp, t, 0.2, 1);
  };
  out.push(frame(1, { id: "01-key", fig: "traverser", cardIn: true, statement: "One key. One endpoint." }, (a) => {
    a.say(0, `${facts.models} models · ${facts.providers} providers`);
    a.sound(0.05, "whoosh-short", 0.14, -5);
    const turn = a.w("key") - 0.15;
    a.sound(turn, "click", 0.28);
    a.move("key", turn, 0.5, 1);
    light(a, turn + 0.45, "lamp:key");
    a.sound(turn + 0.55, "ping", 0.12, 2);
    const ent = a.w("endpoint.");
    light(a, ent, "lamp:entry");
    a.say(ent, ep);
    a.sound(ent + 0.05, "ping", 0.12, 5);
  }));
  out.push(frame(2, { id: "02-switch", fig: "traverser", statement: "Works with OpenAI and Anthropic clients." }, (a) => {
    a.say(0, m1);
    let t = car(a, 0.15, ONBRIDGE);
    a.sound(t - 0.05, "click-soft", 0.2, -2);
    light(a, t, "lamp:bridge");
    t = slide(a, t + 0.1, EXITS[4]);
    const sw = a.w("switch");
    a.say(sw, m2);
    a.sound(sw - 0.02, "click", 0.18, 3);
    t = slide(a, Math.max(t + 0.15, sw + 0.15), EXITS[1]);
    t = car(a, t + 0.05, CAR_STOP);
    a.sound(t - 0.04, "pop", 0.22);
    light(a, t, "lamp:exit1");
    a.sound(t + 0.14, "ping", 0.12, 7);
    a.say(t, `${m2} · 200`);
  }));
  out.push(frame(3, { id: "03-proof", fig: "traverser", statement: "One prompt. Three models.", overlay: { type: "capture", src: "assets/captures/playground-three-models.png", w: 1568, h: 528, panels: 3 } }, (a) => {
    a.say(0, ep);
    a.sound(0.08, "whoosh-short", 0.12, 2);
    // out of sight under the capture: the car comes back and the bridge lines up the next request
    let t = car(a, 0.9, ONBRIDGE);
    light(a, t, null);
    slide(a, t + 0.1, EXITS[2]);
  }));
  out.push(frame(4, { id: "04-failover", fig: "traverser", statement: "If a provider fails, the next one answers." }, (a) => {
    a.say(0, `${m2} · route 1`);
    const fast = (t0, to) => { const d = runTime(a.now("carX"), to, 320); a.sound(t0, "whoosh-short", 0.1); return a.move("carX", t0, d, to); };
    let t = fast(0.05, CAR_STOP);
    a.sound(t - 0.03, "pop", 0.2, -3);
    a.say(t, `${m2} · 429 → fallback`);
    a.sound(t + 0.12, "error", 0.1);
    t = fast(t + 0.25, ONBRIDGE);
    t = slide(a, t + 0.05, EXITS[3]);
    t = fast(t + 0.05, CAR_STOP);
    a.sound(t - 0.03, "pop", 0.22);
    light(a, t, "lamp:exit3");
    a.sound(t + 0.14, "ping", 0.13, 9);
    a.say(t, "200 · billed once");
  }));
  return { frame, out, car, slide };
}

const norm = (from, goal) => from + ((((goal - from) % 360) + 540) % 360) - 180;

function carouselFrames() {
  const init = { turn: 0, dip: 0, lit: -1, "lamp:serve": 0 };
  const EMPTY = [4, 7, 10];
  for (let i = 0; i < SLOTS; i++) { init[`key${i}`] = EMPTY.includes(i) ? 0 : 1; init[`lift${i}`] = 0; init[`token${i}`] = 0; }
  const frame = act(init);
  let pitch = 0;
  /** Turn slot `i` to the service head, dip onto its key, and drop a token if asked. */
  const serve = (a, t0, i, { token = false, turnD = 0.55 } = {}) => {
    const goal = norm(a.now("turn"), SERVE - (360 / SLOTS) * i);
    const turning = Math.abs(goal - a.now("turn")) > 0.5;
    if (turning) { a.sound(t0, "whoosh-short", 0.08, -4); a.move("turn", t0, turnD, goal); }
    const at = t0 + (turning ? turnD + 0.05 : 0);
    a.move("dip", at, 0.18, 1);
    a.set("lit", at + 0.18, i);
    a.move("lamp:serve", at + 0.18, 0.12, 1);
    a.sound(at + 0.16, "click-soft", 0.22, [0, 2, -2, 3, 1][pitch++ % 5]);
    if (token) {
      a.set(`token${i}`, at + 0.2, 0.001);
      a.move(`token${i}`, at + 0.22, 0.42, 1);
      a.sound(at + 0.62, "ping", 0.1, [4, 7, 9][pitch % 3]);
    }
    a.move("dip", at + 0.42, 0.25, 0);
    a.move("lamp:serve", at + 0.45, 0.25, 0);
    return at + 0.7;
  };
  const out = [];
  out.push(frame(5, { id: "05-pool", fig: "carousel", cardIn: true, statement: "Free models run on someone's quota." }, (a) => {
    a.say(0, "the shared pool");
    a.sound(0.05, "whoosh-short", 0.14, -5);
    const p = a.w("pool");
    serve(a, p - 0.5, 1);
    serve(a, p + 0.5, 2);
  }));
  out.push(frame(6, { id: "06-donate", fig: "carousel", statement: "Members donate spare provider keys." }, (a) => {
    a.say(0, "keys donated · 9");
    for (const [slot, word] of [[4, "donate"], [7, "spare"]]) {
      const t = a.w(word);
      a.set(`lift${slot}`, t - 0.01, 26);
      a.move(`key${slot}`, t - 0.01, 0.25, 1);
      a.move(`lift${slot}`, t, 0.45, 0);
      a.sound(t + 0.43, "pop", 0.2, slot === 4 ? 0 : 3);
    }
    a.say(a.w("spare") + 0.45, "keys donated · 11");
    const e = a.w("Each");
    a.say(e, "each request → the key idle longest");
    let t = serve(a, e, 3);
    t = serve(a, t + 0.05, 4);
    serve(a, t + 0.05, 5);
  }));
  out.push(frame(7, { id: "07-fair", fig: "carousel", statement: [[0, "Your requests come first."], ["back", "Take your key back any time."], ["Only", "Donors and paid plans draw from it."]] }, (a) => {
    a.say(0, "your key · served first");
    serve(a, a.w("first,") - 0.6, 9);
    const b = a.w("back") - 0.1;
    a.move("lift9", b, 0.6, 30);
    a.move("key9", b + 0.3, 0.5, 0);
    a.sound(b, "whoosh-short", 0.12, 3);
    a.say(b + 0.4, "your key · withdrawn");
    const o = a.w("Only");
    a.say(o, "donors · Go · Pro · Pro+ · Max · Enterprise");
    serve(a, o + 0.3, 6);
  }));
  out.push(frame(8, { id: "08-reward", fig: "carousel", statement: "Go free · $4 credit a month · 5% back" }, (a) => {
    a.say(0, "8% on Pro and Max · up to $1 per key per day");
    serve(a, a.w("Go") - 0.55, 7, { token: true });
    serve(a, a.w("four") - 0.45, 8, { token: true });
    serve(a, a.w("five") - 0.55, 9 - 1 + 3, { token: true });
  }));
  out.push(frame(9, { id: "09-byok", fig: "carousel", statement: "Your own keys: $0 markup.", overlay: { type: "capture", src: "assets/captures/byok-add-provider-list.png", w: 1156, h: 826 } }, (a) => {
    a.say(0, "BYOK · private to your account");
    a.sound(0.08, "whoosh-short", 0.12, 2);
  }));
  return out;
}

function turretFrames() {
  const frame = act({ rot: 0, pull: 0, lit: 0, "lamp:drive": 0 });
  let n = 0;
  const index = (a, t0, j) => {
    const goal = norm(a.now("rot"), -60 * j);
    a.move("pull", t0, 0.14, 1);
    a.sound(t0, "click-soft", 0.16, -3);
    a.set("lit", t0 + 0.14, -1);
    a.move("rot", t0 + 0.14, 0.38, goal);
    a.sound(t0 + 0.14, "whoosh-short", 0.07, 5);
    a.move("pull", t0 + 0.52, 0.12, 0);
    a.set("lit", t0 + 0.6, j);
    a.sound(t0 + 0.6, "click", 0.2, [0, 2, 4, 5, 7][n++ % 5]);
    return t0 + 0.65;
  };
  const out = [];
  out.push(frame(10, { id: "10-install", fig: null, statement: "Install anyr with one command.", overlay: { type: "term", lines: ["curl -fsSL https://anyrouter.dev/setup.sh | bash"], title: "Install · macOS and Linux" } }, (a) => {
    a.say(0, "macOS and Linux");
    a.sound(a.w("install") - 0.05, "click", 0.16, 2);
  }));
  out.push(frame(11, { id: "11-agents", fig: "turret", cardIn: true, mono: true, statement: [[0, "anyr login"], ["Claude", "anyr claude"], ["Pi", "anyr pi"], ["OpenCode", "anyr opencode"]] }, (a) => {
    a.sound(0.05, "whoosh-short", 0.14, -5);
    a.say(0, "signed in once");
    a.move("lamp:drive", 0.4, 0.25, 1);
    a.sound(0.45, "ping", 0.12, 3);
    a.say(a.w("Then"), `same key · ${facts.routeModels[0]}`);
    a.set("lit", a.w("Claude") - 0.1, 0);
    a.sound(a.w("Claude") - 0.1, "click", 0.16, 0);
    index(a, a.w("Pi") - 0.45, 4);
    index(a, a.w("OpenCode") - 0.4, 3);
  }));
  out.push(frame(12, { id: "12-more", fig: "turret", mono: true, statement: [[0, "anyr codex"], ["Grok", "anyr grok"]] }, (a) => {
    a.say(0, `same key · ${facts.routeModels[0]}`);
    index(a, 0.0, 1);
    index(a, a.w("Grok") + 0.1, 2);
  }));
  return out;
}

const IDS = ["01-key", "02-switch", "03-proof", "04-failover", "05-pool", "06-donate", "07-fair", "08-reward", "09-byok", "10-install", "11-agents", "12-more", "13-close"];

export function frames() {
  const T = traverserFrames();
  const close = act({})(13, { id: "13-close", fig: null, statement: "One key, many models.", overlay: { type: "close" } }, (a) => {
    a.say(0, "anyrouter.dev");
    a.sound(a.w("Start") - 0.05, "chime", 0.14);
  });
  const all = [...T.out, ...carouselFrames(), ...turretFrames(), close];
  const done = new Set(all.map((f) => f.n));
  const blank = act({});
  const rest = IDS.map((id, i) => i + 1).filter((n) => !done.has(n)).map((n) => blank(n, { id: IDS[n - 1], fig: null, statement: IDS[n - 1] }, () => {}));
  return [...all, ...rest].sort((a, b) => a.n - b.n);
}
