# MOTION.md: how a use-case film moves and sounds

One page for the `use-case` kind. Every timing, camera move and sound in `scenes.mjs`
and `mix.mjs` comes from a row here. Sources are pages opened on 2026-10-21 (dossier:
research notes kept outside the repo). A value marked *(tuned)* is ours, set by eye on
the prototypes, not taken from a source.

## Principles

1. **One idea per beat, then a hold.** A beat shows one thing: what this is, the problem,
   a step, the result, the link. Buck holds quiet moments up to a second and keeps big
   movement for the moments that matter ([It's Nice That on Buck](https://www.itsnicethat.com/features/buck-all-in-a-days-work-animation-mailchimp-130121)).
   Ordinary Folk: block the big moves and the camera first, and cut any detail that takes
   away from the main thing ([School of Motion](https://schoolofmotion.com/podcast/ordinary-folk-interview)).
2. **Motion lands on the word.** Each reveal finishes on the spoken word it belongs to,
   using the voice's own word timings. Markers lock animation to the voice
   ([School of Motion, kinetic type](https://schoolofmotion.com/blog/kinetic-typography-after-effects-part-3)).
3. **Enter decelerated, leave accelerated.** Entrances ease out, exits ease in, and longer
   travel takes longer ([Material motion tokens](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md),
   [Carbon motion](https://carbondesignsystem.com/elements/motion/overview/)). Nothing that
   enters is linear ([IxDF on the 12 principles](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design)).
4. **Overshoot only on small things.** A marker or a chip may overshoot and settle; text
   never does. Follow-through: the lead element moves first, its label follows
   ([Figma, principles in motion](https://www.figma.com/blog/principles-in-motion/)).
5. **Brief and precise.** Motion supports the explanation and never makes the viewer wait
   ([Apple HIG, motion](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json)).
   Film transitions sit in the 200 to 600 ms band of interface motion, longer only for
   camera travel ([Dribbble, Disney principles in UI](https://dribbble.com/stories/2020/07/27/disney-principles-of-animation-ui-interactions)).
6. **Text is flat and still while it is read.** Depth comes from the camera and from the
   planes behind the text, never from blur on text. The camera rests square to the panel
   being read, so its type renders at 1:1.

## Easing and timing (30 fps)

| Event | Frames | GSAP ease | Basis |
|---|---|---|---|
| Headline word rises out of its mask | 18, stagger 2 to 3 | expo.out | GSAP SplitText masked reveal, 0.6 s ([docs](https://gsap.com/docs/v3/Plugins/SplitText/)) |
| Problem chip or node lands on its word | 15 | expo.out | same, scaled down |
| Step marker lights | 15 | back.out(1.6) | small element, overshoot allowed (tuned) |
| Step label flips in, old label flips out | 21 in, 12 out | expo.out / power3.in | Material: enter decelerate, exit accelerate |
| Card or window tilts in and settles flat | 33 | expo.out | (tuned) |
| Camera travel between beats | 33 to 39 | power3.inOut | longer travel takes longer (Carbon) |
| Camera drift during a hold | whole hold | none (even speed) | a resting frame reads as dead air; drift moves the back planes, not the text |
| Code line highlight | 6 | power2.out | Carbon 110 to 240 ms |
| Typing | 1 character a frame or faster, at most 1.4 s a block | stepped | ([skills directory, sound design](https://www.skillsdirectory.com/skills/razee4315-sound-design)) |
| Response arrives | 12 | expo.out | (tuned) |
| Hold after an idea | 12 to 24 | none | Buck holds up to 30 |
| End card in, then hold | 18, hold 60+ | expo.out | (tuned) |

## 3D camera language

The film is a world of full-frame panels (intro, problem, steps, result, end). The camera
is a transform on the world: at rest it is the exact inverse of the panel it reads, so
that panel sits at 1:1. Between beats it travels, pulling back in depth on the way.

| Move | Values | Use |
|---|---|---|
| Stage | `perspective` 1600 px landscape, 1400 px portrait | always; apparent scale is p / (p - z) ([MDN perspective](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective), [parallax depth](https://www.skills.sh/avnehsbhatia/ultraui/parallax-depth-systems)) |
| Travel | pose to pose, pulled back 420 to 700 px at the midpoint | every beat change |
| Tilt in, settle flat | rotateX 18 to 26 deg, z -300 to -480 px, to 0 | step cards, the code window, the flow nodes |
| Parallax planes | back plane z -400 (dot field), mid 0, front +60 | every panel: the back plane drifts while text stays |
| Orbit | rotateY at most 12 deg landscape, 6 deg portrait, only in travel | portrait halves sideways rotation (narrow frame) |
| Push in | z +30 to +60 px over a step | slow emphasis on the code being typed |

## Sound events

Mixed in `mix.mjs`, whose `SFX` table is the one source for these numbers. Voice is the
reference at 0 dB. Music sits 24 dB under the voice's loudness while it speaks and comes up
to 17 dB under between lines, with 80 ms attack and 450 ms release
([CapCut ducking](https://www.capcut.com/create/audio-ducking-for-clear-dialogue-in-video),
[Pixflow mixing](https://pixflow.net/blog/audio-mixing-premiere-pro/)). Few sound families,
pitch and gain varied on repeats, never the same sample twice in a row at the same pitch
([skills directory](https://www.skillsdirectory.com/skills/razee4315-sound-design)).

| Motion event | Sound | Peak vs voice peak | Rule |
|---|---|---|---|
| Camera travel | air whoosh, 3 semitones down | -17 dB | starts 0.12 s early so its peak meets the fastest frame |
| Card or window tilts in | short whoosh, 2 up | -24 dB | the film's first card and the code window |
| A diagram card lands | soft click | -19 dB | the problem's first card, and the AnyRouter card |
| Step marker lights | tonal ping, 2 semitones higher each step | -21 dB | on the step's voice |
| Command typed | key press, pitch wandering by a semitone | -25 dB | only while text is typed, one every 3 characters |
| Response or result arrives | soft pop, alternating a semitone up and down | -20 dB | the fallback header, each rolled id, the first request reaching its model |
| End card | chime | -13 dB | the loudest effect, once |

Of two effects marked big (travel, step, arrive, end) closer than 0.3 s, the later goes.
The mix is normalised to -14 LUFS integrated with a true peak at -2 dBTP, so it stays under
-1 dBTP after a re-encode ([Youlean on YouTube loudness](https://youlean.co/?p=30813),
[Soundbridge](https://www.soundbridge.io/loudness-normalization-a-mixing-and-mastering-guide)).

## Portrait (1080 x 1920)

Portrait is its own layout, not a crop. YouTube Shorts covers the top, the right edge and
the bottom third with its own UI; sources disagree on how much, so we take the strict end
([Adaptly](https://adaptlypost.com/blog/social-media-safe-zones-2026-complete-guide),
[Poster.ly checker](https://www.poster.ly/tools/youtube-shorts-safe-zone-checker),
[Blitzcut captions](https://blitzcutai.com/blog/best-caption-size-youtube-shorts-2026)).

- Shorts covers y > 1540 and x > 960 below y 900. Content sits in x 60 to 960, y 200 to 1360
  (`PORTRAIT_SAFE`); captions sit in the band y 1380 to 1540, centred, one phrase on one row, 60 px.
- Each beat fills that height (`shared/authoring/portrait-fill.mjs` gates it: content spans at
  least 70% of y 200 to 1540 in 80% of the frames, nothing in the Shorts zones). The intro is a
  poster, marks at the top and the headline at the foot; the problem and the result set their line
  under the badge and their picture at the foot; a code window reaches the foot of the safe area.
- Read text is 40 px or more; labels and chrome 32 px or more. Code goes under 40 px only where a
  whole token (a URL) needs the row. Code is one row a line (`reflow.mjs`), never split inside a
  word, an id or a URL.
- A real screen is shown cropped to the column its line sits in, every edge in whitespace, its
  rows cut between lines (`captures.mjs crops`), and held still while it is read: no push in
  that would carry an edge through text. Where its text draws under 28 px, the line is marked on
  it and set again as live text under it.
- The camera breathes by rising 18 px, not by pushing in, so nothing that spans the safe width
  grows into the Shorts strip.
- Sideways rotation is halved; panels stack vertically, never side by side.
