# Launch film: concept

A 70 to 80 second narrated launch film for someone who has never heard of AnyRouter. It explains
three things in order, each with one machine drawn in the anatomy light style, then closes on
`anyrouter.dev`. Designed from a blank page: no structure or look is taken from `explainer`.

## The look

White paper, near-black ink, the anatomy light ramp (four close greys on every solid, a lighter
top, 0.6 px lines). One accent, the brand's burnt orange `#BB4D00`, on the one part the viewer
should watch: a lamp that lights, the key that serves, the station in use. Type is Geist and
Geist Mono, flat and sharp, set beside the machine, never on it. Each machine sits on a hairline
card that follows the anatomy card: `Fig. n` and a short title at the top, a live readout at the
bottom right. The readout is computed from the same state that moves the parts, so it is always
true to what is on screen. No gradients, no gloss, no drop shadows (the soft halo under a machine
is its contact shadow, part of the anatomy look).

## The three machines

Each one is a real thing you could build. What moves is the idea.

| Fig | Machine | What moves | What that means |
|---|---|---|---|
| 1 | **The transfer table.** A railway traverser: one entry track with a key switch, a sliding bridge on rails across a pit, six exit tracks ending at buffer stops with signal lamps. A small request car rides across. | The bridge slides sideways to line its track up with one exit; the car runs out to the buffer and back. When an exit's lamp stays dark, the car comes back, the bridge slides one exit over, and the car goes again. | One key and one endpoint reach many routes. Changing the model id only changes where the bridge stops. If one upstream fails, the request moves to the next; it is still one trip, billed once. |
| 2 | **The key carousel.** A round table on a geared base with twelve key slots on its rim, a fixed service arm at the front where requests are served, a token cup under each slot. | Keys drop into empty slots (donated). Each request turns the table by the shortest way to the key that has rested longest. A token drops into the cup of the key that served. One key lifts out of its slot (taken back). | The pool: members donate spare provider keys, the gateway sends each request through the key idle longest, donors earn credit back, and anyone can withdraw at any time. |
| 3 | **The turret head.** A capstan turret on a fixed drive housing: a hexagonal head with five tool stations on a horizontal axis, an index plunger, and a drive shaft whose coupling carries the key and the model. | The head indexes one station at a time with a detent; the drive shaft and its coupling never move. | `anyr` swaps the agent and keeps the key and the model: Claude Code, Pi, OpenCode, then Codex and Grok Build, on one drive. |

Each machine is about 50 to 70 parts, built with the anatomy kit (`tools/anatomy/`, vendored, MIT)
and proved by its audit and line check. The motion inside a frame is a pure function of film time
(`drawAt(t)`), so every frame is seek-safe and the render is deterministic.

Real captures prove two points where a real screen is stronger than a drawing: the playground
answering one prompt with three models through `/api/v1/chat/completions` (`$0 cost` on each),
and the BYOK dialog's provider list. No key, balance or account detail appears anywhere.

## Beat sheet

The voice sets the timing. Lines are the locked script in `SCRIPT.md`; every claim is in the
ledger there.

| Frame | Beat | Picture | Voice |
|---|---|---|---|
| 1 | Hook | Fig. 1 builds in; the key turns in the switch, the entry lamp lights. Readout: 271 models, 17 providers. | AnyRouter puts hundreds of AI models behind one key and one endpoint. |
| 2 | Switch models | The car runs; the bridge slides to one exit. The model id in the readout rolls to another; the bridge slides to a new exit. | It works with OpenAI and Anthropic clients. To switch models, you change one id. |
| 3 | Proof | The card steps back; the real playground capture rises: one prompt, three models, three answers. | Here is one prompt, answered by three models. |
| 4 | Failover | The car runs to an exit whose lamp stays dark (readout `429`), returns, the bridge slides one exit over, the lamp lights (`200`). | If one provider fails, it tries the next. You are billed once. |
| 5 | Pool, why | Fig. 2 builds in: the carousel with keys standing in its slots. | Free models run on someone's quota. The AnyRouter pool spreads that load. |
| 6 | Pool, how | Two keys drop into empty slots. Requests arrive; the table turns each time to the key that rested longest. | Members donate spare provider keys. Each request takes the key that has rested longest. |
| 7 | Pool, fair | One key is the viewer's (accent): a request of its owner goes to it first; then it lifts out of its slot. Readout: who can draw. | Your own requests come first, and you can take your key back any time. Only donors and paid plans draw from the pool. |
| 8 | Reward | Tokens drop into the cups of the keys that served. Type: Go free, $4 credit a month, 5% back (8% on Pro and Max), up to $1 per key per day. | Donors get Go free, four dollars of credit a month, and five percent back. |
| 9 | BYOK | The real BYOK provider list rises beside a key kept in a private slot. | Or add your own keys just for you, at zero markup. |
| 10 | Install | An ink terminal card shows the whole install line at once. | For coding agents, install the anyr CLI with one command. |
| 11 | Swap agents | Fig. 3 builds in. `anyr login`, then the turret indexes station by station while the command beside it reads `anyr claude`, `anyr pi`, `anyr opencode`. The drive coupling stays lit. | Sign in once. Then run Claude Code, Pi or OpenCode on the same key and model. |
| 12 | And more | Two more index steps: `anyr codex`, `anyr grok`. | Codex and Grok Build work too. |
| 13 | Close | The three figures settle side by side as small plates; the AnyRouter mark and `anyrouter.dev`. | One key, many models. Start at anyrouter.dev. |

## Motion language

- Machines move like machines: a slide accelerates and settles with no overshoot (critically
  damped), a detent snaps in with one small settle, a dropped part lands and stops. Nothing
  bounces for show.
- Each frame's camera drifts slowly (scale 1.00 to 1.03), continuous across the frames of one act,
  so the machine never holds still and never jumps at a cut inside its act.
- Between acts, the outgoing card leaves up and the next card rises into place on a beat.
- Text rises 24 px into place with `expo.out`; ids and numbers that change roll in their slot.
- One accent at a time. When the accent moves to a new part, the old one returns to ink.

## Sound language

One event-to-sound table, generated from the same timing spec as the motion (`sfx-cues.json`):

| Event | Sound |
|---|---|
| A contact: bridge locks, car meets a buffer, a key seats in a slot, the turret detent | a short hit (`click-soft`, `pop`), pitch varied on repeats |
| Travel: the bridge slides, the table turns, the turret swings | air (`whoosh-short`), low |
| A reveal: a machine builds in, the close | a riser or a soft chime |
| A UI or readout tick: a lamp lights, `200`, a token drops | a tonal `ping`, pitch varied |
| A failure: the dark lamp, `429` | one muted `error`, low |

Never two big hits within 0.3 s, never on top of a stressed word. The music is a CC0 bed ducked
under the voice (`audio/LICENSES.md`). The master is measured at -14 LUFS integrated with a true
peak at or under -1 dBTP.

## Two sizes

Landscape 1920x1080 and portrait 1080x1920 are composed separately from the same frames. Each
figure is built twice from one world model: a wide camera fit for landscape, a taller fit for
portrait. Portrait stacks the card over the type, keeps every caption in a band clear of the
Shorts controls, and keeps every id and URL on one line.
