# model-launch: the look

A launch reveal for one model, on a dark stage. It must not look like the Monolith use-case
films (white page, near-black ink) or the print look of `lib/film.mjs` (paper and dither).

**Colour.** Stage `#0B0B0D`, ink `#F4F4F1`, muted `#A1A19C`, hairlines `#2A2A2F`, card `#131316`.
One accent per maker, picked to read at 4.5:1 or more on the stage: DeepSeek `#8EA2FF`, MiniMax
`#FF6B86`, NVIDIA `#8FCF2A`, inclusionAI `#B9A4FF`, any other maker the house orange `#F0915A`.
The playground bubble keeps the site's own `#BB4D00`.

**Type.** Geist 800 for the name, set huge (136 px landscape, 108 px portrait, smaller when it
takes three rows) and broken only at spaces or after hyphens, each row its own line. Geist
Mono for the kicker, labels, ids and code. Nothing under 32 px.

**Layout.** Identity on the left (top in portrait): maker mark, kicker (`NEW ON ANYROUTER` only
inside the 45-day window, else `ON ANYROUTER`), the name, a rule, and once the price is said the
pill (`Free on AnyRouter` solid, `Bring your own key` dashed). A card on the right (below in
portrait) changes pane with each beat: spec sheet, price stamp, playground reply (only from a
real capture), request and command. The close is the AnyRouter mark and
`anyrouter.dev/model/` over the id.

**Motion.** Rings in the accent expand from the mark and keep turning; the camera pushes in for
the whole film, so no frame rests. The name rises out of its rows (expo.out). Panes turn in and
out on a hinge (rotationY). Spec rows press in one by one. The price lands as a rubber stamp,
scaled down from 1.9 with a small rotation. Code is typed character by character.

**Sound.** A CC0 synthwave bed (120 bpm) that steps down 9 dB under the voice. Effects, one per
event: mark → pop, name → short whoosh, card → whoosh, pane → short whoosh (repitched), spec
row → thump (six pitches), price → rubber stamp (big hit), reply → ping, typing → keyboard,
close → chime (big hit). Voice: Kokoro `af_heart`. Mixed to -14 LUFS, true peak under -1 dBTP.
