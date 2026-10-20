// The film's choreography as data: for each frame, what the machine does when, what the card
// says, and the sound each event makes. Times are seconds into the frame, read off the voice's
// word times, so motion lands on the word. frames.mjs turns this into compositions/frames/ and
// sfx-cues.json; nothing else times the picture.
import fs from "node:fs";
import path from "node:path";
import { EXITS, CAR_HOME, CAR_STOP, ENTRY_Y } from "./figures/traverser.mjs";

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
    return { n, ...spec, dur: voice.duration_s, tracks, events, readout };
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
  out.push(frame(1, { id: "01-key", fig: "traverser", cardIn: true, statement: "One key. One endpoint." }, (a) => {
    a.say(0, `${facts.models} models · ${facts.providers} providers`);
    const turn = a.w("key") - 0.15;
    a.sound(turn, "click", 0.28);
    a.move("key", turn, 0.5, 1);
    a.move("lamp:key", turn + 0.45, 0.25, 1);
    a.sound(turn + 0.5, "ping", 0.14, 2);
    const ent = a.w("endpoint.");
    a.move("lamp:entry", ent, 0.25, 1);
    a.say(ent, ep);
    a.sound(ent, "ping", 0.14, 5);
  }));
  out.push(frame(2, { id: "02-switch", fig: "traverser", statement: "Works with OpenAI and Anthropic clients." }, (a) => {
    a.say(0, ep);
    a.say(1.2, `${m1}`);
    let t = car(a, 0.15, ONBRIDGE);
    a.sound(t - 0.05, "click-soft", 0.2, -2);
    a.move("lamp:bridge", t, 0.2, 1);
    t = slide(a, t + 0.1, EXITS[4]);
    const sw = a.w("switch");
    a.say(sw, `${m2}`);
    a.sound(sw, "click", 0.2, 3);
    t = slide(a, Math.max(t + 0.1, sw + 0.1), EXITS[1]);
    t = car(a, t + 0.05, CAR_STOP);
    a.sound(t - 0.04, "pop", 0.22);
    a.move("lamp:exit1", t, 0.2, 1);
    a.sound(t + 0.05, "ping", 0.14, 7);
    a.say(t, `${m2} · 200`);
  }));
  return { frame, out, car, slide };
}

const IDS = ["01-key", "02-switch", "03-proof", "04-failover", "05-pool", "06-donate", "07-fair", "08-reward", "09-byok", "10-install", "11-agents", "12-more", "13-close"];

export function frames() {
  const T = traverserFrames();
  const done = new Set(T.out.map((f) => f.n));
  const blank = act({});
  const rest = IDS.map((id, i) => i + 1).filter((n) => !done.has(n)).map((n) => blank(n, { id: IDS[n - 1], fig: null, statement: IDS[n - 1] }, () => {}));
  return [...T.out, ...rest].sort((a, b) => a.n - b.n);
}
