// The explainer kit's motion helpers. tools/kit.mjs pastes this between the kit:js markers.
const K = {
  /** An element rises into place. */
  rise(tl, el, t, { y = 40, d = 0.6 } = {}) {
    tl.fromTo(el, { y, opacity: 0 }, { y: 0, opacity: 1, duration: d, ease: "power3.out" }, t);
  },
  /** The orange wash on a value that just changed: 0.6s in all, or `span` when the next one comes sooner. */
  wash(tl, el, t, span = 0.6) {
    const on = { backgroundColor: "rgba(240,145,90,0.32)", boxShadow: "0 0 0 4px rgba(240,145,90,0.32)" };
    const off = { backgroundColor: "rgba(240,145,90,0)", boxShadow: "0 0 0 4px rgba(240,145,90,0)" };
    const hold = Math.min(0.25, span * 0.4);
    tl.set(el, on, t);
    tl.fromTo(el, on, { ...off, duration: span - hold, ease: "power2.out", immediateRender: false }, t + hold);
  },
  /** Roll a .k-roll slot to its next value at each time in `at`, washing each new value. */
  roll(tl, slot, at) {
    const items = [...slot.children];
    slot.style.width = items[0].offsetWidth + "px";
    at.forEach((t, i) => {
      const out = items[i], into = items[i + 1];
      tl.fromTo(out, { y: 0, opacity: 1 }, { y: "-0.7em", opacity: 0, duration: 0.3, ease: "power2.in", immediateRender: false }, t);
      tl.fromTo(into, { y: "0.7em", opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out", immediateRender: false }, t + 0.1);
      tl.to(slot, { width: into.offsetWidth, duration: 0.35, ease: "power2.inOut" }, t + 0.05);
      const gap = (at[i + 1] ?? Infinity) - t;
      K.wash(tl, slot, t + 0.1, Math.min(0.6, gap - 0.05));
    });
  },
  /** Where a ring around `el` goes, in the coordinates of the ring's offset parent: tween to it, or set it. */
  box(ring, el, pad = 12) {
    const a = el.getBoundingClientRect(), p = ring.offsetParent.getBoundingClientRect();
    const k = ring.offsetParent.offsetWidth / p.width;
    return { left: (a.left - p.left) * k - pad, top: (a.top - p.top) * k - pad, width: a.width * k + 2 * pad, height: a.height * k + 2 * pad };
  },
  /** The transform that shows rectangle `r` (capture px) of a .k-shot centred in its view at `scale`. */
  fit(view, r, scale) {
    const w = view.clientWidth, h = view.clientHeight;
    return { scale, x: w / 2 - (r.x + r.w / 2) * scale, y: h / 2 - (r.y + r.h / 2) * scale };
  },
  /** The largest scale (up to `max`) at which rectangle `r` fits its view with a margin. */
  scaleFor(view, r, max, margin = 48) {
    return Math.min(max, (view.clientWidth - margin) / r.w, (view.clientHeight - margin) / r.h);
  },
  /** The camera: a slow push for the whole frame, so the picture never holds still. Portrait pushes
      half as far, about the middle of its safe area, so text set on the safe edge stays inside it. */
  push(tl, cam, dur, { from = 1, to = 1.05, x = 0, y = 0, x0 = 0, y0 = 0, ease = "sine.inOut" } = {}) {
    const k = matchMedia("(orientation: portrait)").matches ? 0.5 : 1;
    const s = (v) => 1 + (v - 1) * k;
    tl.fromTo(cam, { scale: s(from), x: x0 * k, y: y0 * k }, { scale: s(to), x: x * k, y: y * k, duration: dur, ease }, 0);
  },
};
