# free-roundup: the look

A split-flap departures board hung on a light wall: the free models arrive like flights.
Light where model-launch is dark; mechanical where weekly is editorial.

**Colour.** Wall `#ECE8DF`, ink `#17171A`, muted `#55524B`, board frame `#141416`, flaps
`#26262A` with cream glyphs `#F3EFE4`, the word FREE on a signal yellow `#F2C230`, rods `#9C978C`.

**Type.** Barlow Condensed (OFL) everywhere: 600 on the flaps, 700 for the wall sign, 500 for
the sign's subtitle. Each flap is one character in a fixed cell. Nothing under 32 px.

**Layout.** The sign "FREE MODELS ON ANYROUTER", with "created in the last 30 days, as of" the
run day, above a board on two rods. Landscape gives each model one row (date, maker, model,
chat or decision); portrait gives it two. Six models a page, then a page on how to use one
(`anyr claude --model`, `anyr decision --model`, with real ids), then `ANYROUTER.DEV/MODELS`.
The foot of the board counts free, chat and decision models and names the page.

**Motion.** The board drops in on its rods and settles. Every page flips cell by cell: each
flap folds its top half down over the next character, left to right and row by row with a few
hundredths of jitter, so the board ripples rather than moving as one sheet. The camera eases in
and keeps drifting. The flap halves are drawn from a data attribute and only the settled
character is text, so a half cut by its hinge is never read as text by the stage audit.

**Sound.** A CC0 percussive tonal bed (boomwhackers, about 117 bpm) that steps down 10 dB under
the voice. Each page flip plays a stretch of a real split-flap board recording (CC0), as long
as the flip and repitched a little each time; the board landing is a soft click, the close a
chime. Voice: Kokoro `am_michael`, a touch slower. -14 LUFS, true peak under -1 dBTP.
