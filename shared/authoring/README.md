# Authoring tools for narrated films

Scripts shared by the hand-authored, narrated kinds (`explainer`, `openrouter-unblock`).
Run each from the film's own folder: they read and write that folder's
`audio_meta.json` and `.hyperframes/frame-packets/`.

| Script | Does |
|---|---|
| `pad-voices.mjs` | Pads each narration line with a breath, and the last line with an end-card hold. Idempotent. |
| `fix-transcript.mjs` | Rewrites Whisper's spellings of product names ("any router") to the real ones before captions are built. Idempotent. |
| `align-words.mjs` | Snaps Whisper's word times to the pauses measured in the audio. Whisper drifts up to a second on synthetic speech. Idempotent. |
| `sfx-cues.mjs` | Resolves the film's `sfx-cues.json` (sounds anchored to spoken words) into `audio_meta.json` `sfx`, using the bundled media-use library. Owns the list; idempotent. |
| `regroup-captions.mjs` | Regroups captions into readable phrases (captions.mjs caps groups at 2–4 words). Idempotent. |
| `finish.mjs` | One command after any change: captions build + regroup, sound cues, assemble, transitions, voice group, music carve. |
| `frame-words.mjs` | Writes each frame's spoken word times next to its worker packet, so reveals land on the word. |
| `type-audit.mjs` | Seeks the film every `--step` seconds (0.5) in headless Chrome and measures the size each piece of text renders at, transforms and SVG scaling included. Fails when text visible for 0.8s or more never reaches `--floor` px (32). Also lists each screenshot's largest scale. `--json` for machines. |

Order after `audio.mjs` generates the voice:

```bash
node ../../shared/authoring/pad-voices.mjs
node ~/.claude/skills/product-launch-video/scripts/audio.mjs sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md
node ../../shared/authoring/fix-transcript.mjs
node ../../shared/authoring/align-words.mjs      # before captions and frame-words
node ../../shared/authoring/frame-words.mjs      # after frame-packets.mjs
node ../../shared/authoring/finish.mjs           # captions, sound cues, assemble, transitions, carve
```
