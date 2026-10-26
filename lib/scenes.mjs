/**
 * scenes — a film cut as a row of scene SLOTS, each filled by one of several
 * interchangeable TEMPLATES. A kind lists its templates as a table:
 *
 *   { id, slot,
 *     fits(rel, ctx) → bool            whether the facts can carry it
 *     minDur: seconds | ctx → seconds  the shortest it can be read in
 *     scene(ctx, { start, dur, line }) → scene | scene[]   (lib/film.mjs scenes)
 *     line(facts, ctx) → string | string[] }   its voice-over line, from the facts;
 *                                      several in order of preference, the first that passes the gate
 *
 *   pick()        which template fills each slot. Seeded, so a release always
 *                 gets the same film; never the previous release's template
 *                 for a slot when another one fits.
 *   classicPicks() the first template that fits each slot: the look before slots.
 *   timeSlots()   when each slot starts and how long it runs.
 */
import { BEAT } from './film.mjs';

export const SLOTS = ['hook', 'news', 'compare', 'howto', 'cta'];

/** Where a voice-over line starts inside its slot: after the cut's wipe has cleared. */
export const VO_LEAD = 0.2;
/** A slot outlasts its line by this much: the lead-in, then a breath before the next cut. */
export const VO_PAD = 0.6;

const r3 = v => +v.toFixed(3);

/** FNV-1a: a string seed → 32 bits. */
function hash32(s) {
  let h = 0x811c9dc5;
  for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 0x01000193);
  return h >>> 0;
}

/** mulberry32 over the seed's hash: the same seed draws the same numbers on every machine. */
function random(seed) {
  let a = hash32(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fitting = (slot, templates, rel, ctx) => templates.filter(t => t.slot === slot && t.fits(rel, ctx));

function fittingOrThrow(slot, templates, rel, ctx) {
  const fit = fitting(slot, templates, rel, ctx);
  if (!fit.length) throw new Error(`no template fits the ${slot} slot`);
  return fit;
}

/**
 * One template per slot. Each slot draws from its own seed (`<seed>/<slot>`),
 * so a template added to one slot never reshuffles the others.
 */
export function pick({ seed, slots, templates, rel, ctx, previous = {} }) {
  return Object.fromEntries(slots.map(slot => {
    const fit = fittingOrThrow(slot, templates, rel, ctx);
    const fresh = fit.length > 1 ? fit.filter(t => t.id !== previous[slot]) : fit;
    return [slot, fresh[Math.floor(random(`${seed}/${slot}`)() * fresh.length)].id];
  }));
}

export function classicPicks({ slots, templates, rel, ctx }) {
  return Object.fromEntries(slots.map(slot => [slot, fittingOrThrow(slot, templates, rel, ctx)[0].id]));
}

export function templateOf(templates, slot, id) {
  const t = templates.find(x => x.slot === slot && x.id === id);
  if (!t) throw new Error(`no ${slot} template "${id}"`);
  return t;
}

/**
 * Each slot's start and length. A slot runs for its template's minimum or its
 * voice-over line plus VO_PAD, whichever is longer, rounded UP to the beat: a
 * line is never cut to fit. A film shorter than `seconds` shares the difference
 * out to the `stretch` slots in whole beats; a fraction of a beat goes to the
 * last slot, so every cut before it stays on the grid. `duration` is the exact
 * sum of the slots.
 */
export function timeSlots({ slots, picks, templates, ctx, voice = [], seconds = 0, stretch = [] }) {
  const up = v => Math.ceil(v / BEAT - 1e-9) * BEAT;
  const timed = slots.map(slot => {
    const template = templateOf(templates, slot, picks[slot]);
    const line = voice.find(v => v.slot === slot) ?? null;
    const min = typeof template.minDur === 'function' ? template.minDur(ctx) : template.minDur;
    return { slot, template, line, dur: up(Math.max(min, line ? line.seconds + VO_PAD : 0)) };
  });
  const spare = seconds - timed.reduce((a, s) => a + s.dur, 0);
  if (spare > 1e-9) {
    const grow = timed.filter(s => stretch.includes(s.slot));
    const beats = Math.floor(spare / BEAT + 1e-9) * BEAT;
    if (grow.length) {
      const each = Math.floor(beats / BEAT / grow.length) * BEAT;
      grow.forEach(s => { s.dur += each; });
      grow[0].dur += beats - each * grow.length;
    } else timed.at(-1).dur += beats;
    timed.at(-1).dur += spare - beats;
  }
  let at = 0;
  const out = timed.map(s => {
    const placed = { ...s, start: r3(at), dur: r3(s.dur) };
    at += s.dur;
    return placed;
  });
  return { slots: out, duration: r3(at) };
}
