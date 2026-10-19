// The film kit's motion (frame.md v3, Motion). tools/kit.mjs pastes this between the kit:js markers.
const K = {
  INK: "#0A0A0A", ON_INK: "#FFFFFF", ON_INK_MUTED: "#A3A3A3", HAIR: "#E7E7E7", MUTED: "#6B6B6B", ACCENT: "#BB4D00",

  /** One object arrives: up 50px from 1.04, expo.out. */
  rise(tl, el, t, { y = 50, d = 1.0, scale = 1.04 } = {}) {
    tl.fromTo(el, { y, opacity: 0, scale }, { y: 0, opacity: 1, scale: 1, duration: d, ease: "expo.out" }, t);
  },
  /** A headline settles from a push of 1.08 while its .k-line children rise in a stagger. */
  headline(tl, el, t) {
    const lines = el.querySelectorAll('[class~="k-line"]');
    tl.fromTo(el, { scale: 1.08 }, { scale: 1, duration: 2.2, ease: "expo.out" }, t);
    tl.fromTo(lines.length ? lines : el, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.4, ease: "expo.out", stagger: 0.14 }, t);
  },
  /** A card set arrives: the group eases out of a 1.1 close-up while the cards rise in a stagger. */
  cards(tl, group, cards, t) {
    tl.fromTo(group, { scale: 1.1 }, { scale: 1, duration: 2.1, ease: "power4.inOut" }, t);
    tl.fromTo(cards, { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 1.3, ease: "expo.out", stagger: 0.14 }, t + 0.05);
  },
  /** A beat leaves, up and out, before the next one arrives. */
  exit(tl, el, t, { y = -80, d = 0.75 } = {}) {
    tl.to(el, { y, opacity: 0, duration: d, ease: "power4.inOut" }, t);
  },
  /** A card becomes (or stops being) the one ink card: fill, border, text and marks together. */
  ink(tl, card, t, on = true, d = 0.6) {
    const ease = "power2.inOut";
    tl.to(card, { backgroundColor: on ? K.INK : "#FFFFFF", borderColor: on ? K.INK : K.HAIR, color: on ? K.ON_INK : K.INK, duration: d, ease }, t);
    const muted = card.querySelectorAll('[class~="k-muted"]');
    if (muted.length) tl.to(muted, { color: on ? K.ON_INK_MUTED : K.MUTED, duration: d, ease }, t);
    const marks = card.querySelectorAll('[class~="k-mark"]');
    if (marks.length) tl.fromTo(marks, { filter: `brightness(0) invert(${on ? 0 : 1})` }, { filter: `brightness(0) invert(${on ? 1 : 0})`, duration: d, ease, immediateRender: false }, t);
  },
  /** The accent on a value that just changed, for `span` seconds, then back to its own colour. */
  wash(tl, el, t, span = 0.6) {
    const own = getComputedStyle(el).color;
    tl.set(el, { color: K.ACCENT }, t);
    tl.to(el, { color: own, duration: Math.min(0.4, span * 0.5), ease: "power2.inOut" }, t + span * 0.5);
  },
  /** Roll a .k-roll slot to its next value at each time in `at`: the old value leaves up, the
      new one comes up from below in the slot, power4.inOut, 0.7s or less when the next is sooner. */
  roll(tl, slot, at) {
    const items = [...slot.children];
    slot.style.overflow = "hidden";
    slot.style.width = items[0].offsetWidth + "px";
    at.forEach((t, i) => {
      const out = items[i], into = items[i + 1];
      const d = Math.min(0.7, (at[i + 1] ?? Infinity) - t - 0.05);
      tl.fromTo(out, { yPercent: 0, opacity: 1 }, { yPercent: -100, opacity: 0, duration: d, ease: "power4.inOut", immediateRender: false }, t);
      tl.fromTo(into, { yPercent: 100, opacity: 1 }, { yPercent: 0, opacity: 1, duration: d, ease: "power4.inOut", immediateRender: false }, t);
      tl.to(slot, { width: into.offsetWidth, duration: d, ease: "power4.inOut" }, t);
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
  /** The camera drift: a slow push across a span, so a long beat never holds still. Portrait
      pushes half as far, about the middle of its safe area, so text on the safe edge stays in it. */
  push(tl, cam, dur, { from = 1, to = 1.03, x = 0, y = 0, x0 = 0, y0 = 0, ease = "sine.inOut", at = 0 } = {}) {
    const k = matchMedia("(orientation: portrait)").matches ? 0.5 : 1;
    const s = (v) => 1 + (v - 1) * k;
    tl.fromTo(cam, { scale: s(from), x: x0 * k, y: y0 * k }, { scale: s(to), x: x * k, y: y * k, duration: dur, ease }, at);
  },
};
