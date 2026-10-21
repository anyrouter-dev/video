(function () {
  /*DATA*/
  const root = document.querySelector('[data-composition-id="machine"]');
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const PORTRAIT = matchMedia('(orientation: portrait)').matches;
  const C = PORTRAIT ? D.CAMS.portrait : D.CAMS.landscape;
  const T = D.T;
  const mc = $('.mc');
  const cam = $('.cam');

  const tl = gsap.timeline({ paused: true });

  // The camera: a shot is a fit of a box of the figure; a drift scales it about the frame centre.
  const centre = PORTRAIT ? [510, 748] : [960, 480];
  const grown = (shot, k) => ({ s: shot.s * k, x: centre[0] - (centre[0] - shot.x) * k, y: centre[1] - (centre[1] - shot.y) * k });
  const to = (shot, at, dur, ease = 'power2.inOut') => tl.to(cam, { x: shot.x, y: shot.y, scale: shot.s, duration: dur, ease }, at);
  const drift = (shot, from, until, k) => tl.fromTo(cam, { x: shot.x, y: shot.y, scale: shot.s }, { ...(({ s, x, y }) => ({ scale: s, x, y }))(grown(shot, k)), duration: until - from, ease: 'sine.inOut', immediateRender: false }, from);
  gsap.set(cam, { x: C.intro.x, y: C.intro.y, scale: C.intro.s, transformOrigin: '0 0' });

  drift(C.intro, 0, T.pull, 1.06);
  const introEnd = grown(C.intro, 1.06);
  tl.fromTo(cam, { x: introEnd.x, y: introEnd.y, scale: introEnd.s }, { x: C.wide.x, y: C.wide.y, scale: C.wide.s, duration: 1.0, ease: 'power2.inOut', immediateRender: false }, T.pull);
  drift(C.wide, T.pull + 1.0, T.install - 0.36, 1.01);
  const wideEnd = grown(C.wide, 1.01);
  tl.fromTo(cam, { x: wideEnd.x, y: wideEnd.y, scale: wideEnd.s }, { x: C.screen.x, y: C.screen.y, scale: C.screen.s, duration: 0.34, ease: 'power3.inOut', immediateRender: false }, T.install - 0.36);
  drift(C.screen, T.install - 0.02, T.lampOn - 0.55, 1.04);
  const screenEnd = grown(C.screen, 1.04);
  tl.fromTo(cam, { x: screenEnd.x, y: screenEnd.y, scale: screenEnd.s }, { x: C.lamp.x, y: C.lamp.y, scale: C.lamp.s, duration: 1.0, ease: 'power2.inOut', immediateRender: false }, T.lampOn - 0.55);
  drift(C.lamp, T.lampOn + 0.45, T.claude - 0.45, 1.03);
  const lampEnd = grown(C.lamp, 1.03);
  tl.fromTo(cam, { x: lampEnd.x, y: lampEnd.y, scale: lampEnd.s }, { x: C.swap.x, y: C.swap.y, scale: C.swap.s, duration: 0.85, ease: 'power2.inOut', immediateRender: false }, T.claude - 0.45);
  // The swap shot holds the screen and the stage; for each turn the camera rises to the turret
  // and comes back down once the new objective has landed.
  const [t1, t2] = D.TURNS;
  const up = (turn) => turn.at - 0.42;
  const down = (turn) => turn.lands + 0.32;
  const swapAt = (k) => grown(C.swap, k);
  const legs = [[T.claude + 0.4, up(t1)], [down(t1) + 0.6, up(t2)], [down(t2) + 0.6, T.three - 0.3]];
  legs.forEach(([from, until], i) => {
    const start = swapAt(1 + i * 0.012);
    const end = swapAt(1 + i * 0.012 + 0.012);
    tl.fromTo(cam, { x: start.x, y: start.y, scale: start.s }, { x: end.x, y: end.y, scale: end.s, duration: until - from, ease: 'sine.inOut', immediateRender: false }, from);
  });
  [t1, t2].forEach((turn, i) => {
    const from = swapAt(1 + i * 0.012 + 0.012);
    const back = swapAt(1 + (i + 1) * 0.012);
    const close = grown(C.turret, 0.94);
    tl.fromTo(cam, { x: from.x, y: from.y, scale: from.s }, { x: close.x, y: close.y, scale: close.s, duration: 0.42, ease: 'power3.inOut', immediateRender: false }, up(turn));
    tl.fromTo(cam, { x: close.x, y: close.y, scale: close.s }, { x: C.turret.x, y: C.turret.y, scale: C.turret.s, duration: down(turn) - up(turn) - 0.42, ease: 'sine.out', immediateRender: false }, up(turn) + 0.42);
    tl.fromTo(cam, { x: C.turret.x, y: C.turret.y, scale: C.turret.s }, { x: back.x, y: back.y, scale: back.s, duration: 0.6, ease: 'power2.inOut', immediateRender: false }, down(turn));
  });
  const swapEnd = swapAt(1.036);
  tl.fromTo(cam, { x: swapEnd.x, y: swapEnd.y, scale: swapEnd.s }, { x: C.turret.x, y: C.turret.y, scale: C.turret.s, duration: 1.0, ease: 'power2.inOut', immediateRender: false }, T.three - 0.3);
  drift(C.turret, T.three + 0.7, T.end - 0.3, 1.06);
  const turretEnd = grown(C.turret, 1.06);
  tl.fromTo(cam, { x: turretEnd.x, y: turretEnd.y, scale: turretEnd.s }, { x: C.end.x, y: C.end.y, scale: C.end.s, duration: 1.3, ease: 'power3.inOut', immediateRender: false }, T.end - 0.3);
  drift(C.end, T.end + 1.0, D.DURATION, 1.03);


  // The turret: one prebuilt frame per angle, shown on the video frame that needs it.
  const frames = $$('.tf');
  const detent = $('[data-part="detent"]');
  let shown = 0;
  for (const [t, index] of D.SCHEDULE) {
    if (index === shown) continue;
    tl.set(frames[shown], { display: 'none' }, t);
    tl.set(frames[index], { display: 'inline' }, t);
    tl.set(detent, { attr: { transform: D.DETENT[index] } }, t);
    shown = index;
  }
  gsap.set(detent, { attr: { transform: D.DETENT[0] } });

  // What is lit: one word per part in .mc[data-on].
  const lights = [
    [0, ''],
    [T.names[0], 'name-claude'], [T.names[1], 'name-claude name-pi'], [T.names[2], 'name-claude name-pi claude pi'],
    [T.namesOff, ''],
    [T.lampOn, 'lamp'], [T.lampOn + 0.07, ''], [T.lampOn + 0.14, 'lamp'],
    [T.claudeLit, 'claude name-claude'],
    [T.model, 'claude name-claude slide'], [T.model + 1.1, 'claude name-claude'],
    [D.TURNS[0].at, ''], [D.TURNS[0].lands, 'pi name-pi'],
    [D.TURNS[1].at, ''], [D.TURNS[1].lands, 'opencode name-opencode'],
    [T.sameKey, 'opencode name-opencode lamp'], [T.sameKey + 0.5, 'opencode name-opencode'],
    [T.sameModel, 'opencode name-opencode slide'], [T.sameModel + 0.7, 'opencode name-opencode'],
    [T.three, 'opencode name-opencode claude'], [T.three + 0.16, 'opencode name-opencode claude pi'],
    [D.TURNS[2].at, ''], [D.TURNS[2].lands, 'name-codex'], [T.grok, 'name-codex name-grok'],
    [T.end, ''],
  ];
  for (const [t, on] of lights) tl.set(mc, { attr: { 'data-on': on } }, t);

  // The lamp's light: it flickers on with the lamp and stays on.
  const beam = $('.beam');
  const lens = $('.cs-lamp');
  tl.set(lens, { opacity: 0.6 }, T.lampOn);
  tl.set(lens, { opacity: 0 }, T.lampOn + 0.07);
  tl.fromTo(lens, { opacity: 0.4 }, { opacity: 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, T.lampOn + 0.14);
  tl.set(beam, { opacity: 0.6 }, T.lampOn);
  tl.set(beam, { opacity: 0 }, T.lampOn + 0.07);
  tl.fromTo(beam, { opacity: 0.4 }, { opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, T.lampOn + 0.14);

  // The screen.
  const glow = $('.cs-glow');
  tl.to(glow, { opacity: 0.8, duration: 0.3 }, T.install - 0.1);
  const pane = (name) => $('.pane-' + name);
  tl.set(pane('install'), { opacity: 1 }, T.install);
  const out = $('.row.out');
  gsap.set(out, { opacity: 0 });
  tl.set(out, { opacity: 1 }, T.installed);
  tl.set(pane('install'), { opacity: 0 }, T.login - 0.3);
  tl.set(pane('login'), { opacity: 1 }, T.login);
  tl.to(pane('login'), { opacity: 0, duration: 0.2 }, T.lampOn - 0.3);
  tl.set(pane('run'), { opacity: 1 }, T.claude);
  for (const turn of [t1, t2]) {
    tl.to(pane('run'), { opacity: 0, duration: 0.12 }, up(turn));
    tl.to(pane('run'), { opacity: 1, duration: 0.25 }, down(turn) + 0.35);
  }
  tl.to(pane('run'), { opacity: 0, duration: 0.25 }, T.three - 0.3);

  const typeWord = (id, from, step) => $$('.c-' + id).forEach((c, i) => tl.set(c, { attr: { class: `ch c-${id} on` } }, from + i * step));
  const eraseWord = (id, at) => $$('.c-' + id).forEach((c) => tl.set(c, { attr: { class: `ch c-${id}` } }, at));
  const select = (id, on, at) => tl.set($('.sel-' + id), { attr: { class: `sel sel-${id}${on ? ' is-on' : ''}` } }, at);
  typeWord('claude', T.claude + 0.12, 0.055);
  select('claude', true, T.select1);
  eraseWord('claude', T.select1 + 0.32);
  select('claude', false, T.select1 + 0.32);
  typeWord('pi', T.select1 + 0.36, 0.1);
  select('pi', true, T.select2);
  eraseWord('pi', T.select2 + 0.12);
  select('pi', false, T.select2 + 0.12);
  typeWord('opencode', T.select2 + 0.14, 0.05);

  const model = $('.row.model');
  for (const t of [T.model, T.sameModel]) {
    tl.set(model, { attr: { class: 'row model is-on' } }, t);
    tl.set(model, { attr: { class: 'row model' } }, t + 0.9);
  }
  const note = (id, on, off) => {
    tl.fromTo($('.note-' + id), { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', immediateRender: false }, on);
    tl.to($('.note-' + id), { opacity: 0, duration: 0.2 }, off);
  };
  note('claude', T.claudeNote, T.change);
  note('pi', Math.max(T.piNote, down(t1) + 0.45), T.select2 - 0.05);
  note('opencode', Math.max(T.ocNote, down(t2) + 0.45), T.three - 0.3);

  const caret = $('.caret');
  for (let t = T.claude; t < T.three; t += 0.5) {
    const typing = [[T.claude, T.claude + 0.5], [T.select1, T.select1 + 0.6], [T.select2, T.select2 + 0.6]].some(([a, b]) => t >= a && t < b);
    tl.set(caret, { opacity: typing || Math.round((t - T.claude) / 0.5) % 2 === 0 ? 1 : 0 }, t);
  }

  // The readout: what is in the light path, and on which model.
  const readout = (id, on, off) => {
    tl.fromTo($('.ro-' + id), { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', immediateRender: false }, on);
    tl.to($('.ro-' + id), { opacity: 0, duration: 0.2 }, off);
  };
  readout('key', T.lampOn + 0.4, T.claudeLit - 0.05);
  readout('claude', T.claudeLit, D.TURNS[0].at);
  readout('pi', D.TURNS[0].lands, D.TURNS[1].at);
  readout('opencode', D.TURNS[1].lands, T.three);
  readout('more', T.codex, T.end);

  // The end card.
  const card = $('.endcard');
  tl.fromTo(card, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', immediateRender: false }, T.url - 0.15);
  tl.to(card, { y: -12, duration: D.DURATION - T.url - 0.8, ease: 'sine.inOut' }, T.url + 0.75);

  tl.set({}, {}, D.DURATION);
  window.__timelines = window.__timelines || {};
  window.__timelines['machine'] = tl;
})();
