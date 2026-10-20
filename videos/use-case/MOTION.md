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

Mixed in `mix.mjs`. Voice is the reference at 0 dB. Music sits 18 to 25 dB under the voice
while it speaks and comes up 6 to 8 dB between lines, with 80 ms attack and 450 ms release
([CapCut ducking](https://www.capcut.com/create/audio-ducking-for-clear-dialogue-in-video),
[Pixflow mixing](https://pixflow.net/blog/audio-mixing-premiere-pro/)). Three sound families
only, pitch and gain varied on repeats ([skills directory](https://www.skillsdirectory.com/skills/razee4315-sound-design)).

| Motion event | Sound | Level vs voice | Rule |
|---|---|---|---|
| Camera travel | air whoosh | -16 dB | peak on the fastest frame of the travel |
| Card or window tilts in | soft short whoosh | -20 dB | first card of a group only |
| Step marker lights | tonal tick, up a step per step | -18 dB | pitch rises with the step number |
| Command typed | key press | -24 dB | only while text is typed, one every 2 to 3 characters |
| Response or result arrives | soft pop | -18 dB | once per arrival |
| End card | chime | -14 dB | the loudest effect, once |

Never two effects of -18 dB or louder within 0.3 s. The mix is normalised to -14 LUFS
integrated with a true peak at or under -1 dBTP ([Youlean on YouTube loudness](https://youlean.co/?p=30813),
[Soundbridge](https://www.soundbridge.io/loudness-normalization-a-mixing-and-mastering-guide)).

## Portrait (1080 x 1920)

Portrait is its own layout, not a crop. YouTube Shorts covers the top, the right edge and
the bottom third with its own UI; sources disagree on how much, so we take the strict end
([Adaptly](https://adaptlypost.com/blog/social-media-safe-zones-2026-complete-guide),
[Poster.ly checker](https://www.poster.ly/tools/youtube-shorts-safe-zone-checker),
[Blitzcut captions](https://blitzcutai.com/blog/best-caption-size-youtube-shorts-2026)).

- Content sits in x 60 to 960, y 200 to 1300 (`PORTRAIT_SAFE`). The full height of that box
  is used: the headline leaves when the steps begin.
- Captions sit in the band y 1320 to 1500, centred, one phrase on one row, 60 px.
- Nothing is drawn under 32 px. Code is one row a line (`reflow.mjs`), never split inside a
  word, an id or a URL.
- Sideways rotation is halved; panels stack vertically, never side by side.
