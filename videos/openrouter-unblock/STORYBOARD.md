---
format: 1920x1080
duration: 99s
message: "Your OpenRouter free models stop at your account's limit. Add your key to AnyRouter and share it with the pool, and when you hit the limit your requests keep going through keys other members shared."
arc: The wall → Why → The fix → Step 1 → Step 2 → Step 3 → Step 4 → How it works → Close
audience: someone already using OpenRouter's free models, technical or not
mode: autonomous
music: none
---

## Video direction

- **Palette system** (from `frame.md`, shared with the explainer). White `bg` on every frame. `ink` for headlines and marks. `primary` burnt orange is the one accent per moment: your key, the active step, the control about to be clicked. `free` green only means works / 200 OK / done. `danger` only on `429` and the limit tick. The request log in Frame 1 is the one dark surface.
- **Type.** Geist for spoken words, Geist Mono for anything typed (ids, URLs, keys, status codes). Sentence case. Nothing below 24px inside the safe area, including rebuilt UI: show a zoomed crop of the UI region, never a whole page shrunk. Footnotes are 24px `muted` or they are cut.
- **Rebuilt UI.** AnyRouter dashboard screens are rebuilt in HTML from the product source with exact labels (`tools/ui-labels.md`). OpenRouter's Keys page is a clean reconstruction. Real captures: `openrouter-home.png`, `anyrouter-pool.png`, `anyrouter-signin.png`.
- **Browser frame geometry (Frames 4, 5, 6).** One card at x 384, y 164, width 1152, height 700 (top bar 52, content 1152×648). Identical in all three.
- **Step rail (Frames 3–7).** The shared component with FOUR steps: `Create a key`, `Add it to AnyRouter`, `Share with the pool`, `Use it in your app`. Centred, top y 72, circles 40px, label 26px, gap between steps 40, hairline 48×2. Each frame starts in the previous frame's end state.
- **Layering.** When a dialog or overlay fully covers text, set the covered layer to opacity 0 once the cover lands (no ghost text, no `content_overlap`). A frame never shows two dialogs at once.
- **Motion grammar.** `power3.out` entrances, `power2.inOut` moves. Every reveal and click lands on its spoken word (each worker has corrected word times). Holds stay still. No bounce, no `repeat` / `yoyo`, no randomness, no CSS animation.
- **Continuity spine.** The redacted OpenRouter key pill `sk-or-v1-••••••••••••` is the recurring object. The AnyRouter key `sk-ar-v1-••••••••` appears only in Frame 7 and is visibly a different key.
- **Claims.** Every number on screen is in BRIEF.md's claims ledger (20, 50, 1000, $10, 429, 200, 74, step numbers 1–4, the UI's "1/1"). No earnings percentages in this cut. No other numbers. No "unlimited". No "no daily cap" and no 2,400 anywhere in this cut.
- **Negative list.** No gradients, glows, bokeh, noise, dither, halftone, neon, emoji. No front-load-then-freeze. Do not imitate the repo's older films.
- **Caption band.** Nothing below y 880.

## Frame 1 — The wall
- src: compositions/frames/01-wall.html

- scene: A request log to an OpenRouter free model: 200 OK lines, then 429 Too Many Requests stacks up; the definition of rate limit; OpenRouter's 20 a minute, 50 a day, per account
- duration: 13.499s
- transition_in: cut
- type: problem
- beat: frustration
- voiceover: "You're using OpenRouter's free models. Then the errors start. Too many requests. That's a rate limit. Your account gets twenty requests a minute, and fifty a day. A thousand, once you've bought ten dollars of credits."
- asset_candidates: assets/provider-openrouter.svg — OpenRouter mark for the log's title bar
- blueprint: overwhelm-surround (Adapt)
- focal: the request log
- roles: provider-openrouter.svg = small mark in the terminal title bar
- sfx: error ×3 on the first 429 lines
- status: outline

Keep the built frame's look and structure (log, definition card, stats). Changes:
Scene 3 ("That's a rate limit"): the definition card body reads `A cap on how many requests you can send.` (was "one key can send").
Scene 4 ("Your account gets twenty a minute, and fifty a day"): an eyebrow `Your OpenRouter account` lands on "account" above the stats; `20` + `requests a minute` on "twenty", `50` + `requests a day` on "fifty". On "thousand": a third stat lands beside them, smaller but readable (number 56px, label 26px): `1000` + `a day after $10 of credits`. No footnote. Hold.

r4: the log numbers each request (`#45`…); `#45`–`#50` answer 200, `#51` on gets 429, so the 50-a-day wall reads before the first error.

## Frame 2 — Why: the limit is per account
- src: compositions/frames/02-one-account.html

- scene: One OpenRouter account card holding two keys; both feed one shared meter that is full; headline "One account. One limit."
- duration: 4.368s
- transition_in: crossfade
- type: problem
- beat: understanding
- voiceover: "The limit belongs to your OpenRouter account, so another key won't help."
- asset_candidates: assets/provider-openrouter.svg — OpenRouter mark on the account card
- blueprint: titlecard-reveal (Adapt)
- focal: the account card and its one meter
- roles: provider-openrouter.svg = account card header mark
- sfx: none
- status: outline

Scene 1 ("The limit belongs to your OpenRouter account"): a white `card` centred (~760×330, centre (960, 470)) rises: header OpenRouter mark + `Your OpenRouter account`; inside, the key pill `sk-or-v1-••••••••••••` (glyph `primary`), and under the card body one 600×14 meter already full in `danger` with a `limit` tick and label (24px danger). Headline h1 `One account. One limit.` above (top ~200) on "account".
Scene 2 ("so another key won't help"): on "another" a second key pill `sk-or-v1-••••••••••••` (glyph muted) slides into the card under the first; a hairline from each pill joins the SAME meter; the meter does not change (still full, still red). Small label under the meter, 24px muted: `Every key on the account shares it`. Hold.
handoff_out: the first key pill (primary glyph) at its card position; the card fades out over the last 0.3s, the first pill stays at scale 1, opacity 1. State the exact centre you used in your reply.

## Frame 3 — The fix
- src: compositions/frames/03-the-fix.html

- scene: Your key moves into AnyRouter; a request hits your limited key, then goes through a key another member shared; "Their quota, not yours."; the real pool page shows 74 OpenRouter keys; the four-step rail appears
- duration: 7.76s
- transition_in: cut
- type: product_intro
- beat: relief
- voiceover: "AnyRouter keeps your key. When it hits the limit, the request goes through a key another member shared. Their quota, not yours."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter mark; assets/anyrouter-pool.png — real anyrouter.dev/pool page (crop to the OpenRouter row only: 74 keys); assets/provider-openrouter.svg — OpenRouter mark
- blueprint: constellation-hub (Adapt)
- focal: your key inside AnyRouter, a shared key answering
- roles: anyrouter mark = card header; anyrouter-pool.png = evidence in a small browser frame
- sfx: whoosh-short on the key move, error on the limit, ping on the shared key answering
- status: outline

Reuse the built frame's AnyRouter card, pool grid and pool screenshot crop. Changes:
Scene 1 ("AnyRouter keeps your key"): the key pill (from Frame 2's hand-off position) glides into the card's top slot, label `Your key`.
Scene 2 ("When it hits the limit"): a small orange request dot arrives at your key; your key flashes a `429` chip (danger) and dims to 40%.
Scene 3 ("goes through a key another member shared"): the `Shared pool` grid is already in the card under your key (12 muted pills); on "another member" one pool pill lights (glyph primary), the request dot hops to it and a `200 OK` chip (free green) appears; the browser frame with the pool crop and the callout `OpenRouter · 74 keys in the pool` slides in on the right on "shared".
Scene 4 ("Their quota, not yours."): a chip under the card, 26px ink on `surface-2`: `Their quota, not yours`. Then the four-step rail draws on at top (all todo). Hold.
handoff_out: four-step rail at its shared position, all four todo, opacity 1, still.

## Frame 4 — Step 1: create a key on OpenRouter
- src: compositions/frames/04-step-1-key.html

- scene: openrouter.ai, then the Keys page with the viewer's existing key; Create Key, name it AnyRouter, the new redacted key appears, Copy
- duration: 4.667s
- transition_in: cut
- type: tutorial_step
- beat: doing
- voiceover: "Step one. On OpenRouter, create a new key for AnyRouter, and copy it."
- asset_candidates: assets/openrouter-home.png — real openrouter.ai home; assets/provider-openrouter.svg — OpenRouter mark
- blueprint: cursor-ui-demo (Adapt)
- focal: the Create Key button, then the new key row
- roles: openrouter-home.png = screenshot in the browser frame
- sfx: click on Create Key, click on Copy
- status: outline

handoff_in: four-step rail, all todo. Step 1 becomes active at 0.2s.
Changes to the built frame: the rail has four steps. The Keys list is NOT empty: it already holds one row `my-app` with `sk-or-v1-••••••••••••` (the key the viewer already uses). Remove "No keys yet".
Scene ("create a new key for AnyRouter"): cursor clicks `Create Key`; a small name field shows `AnyRouter` typed in; a second row `AnyRouter` with a new key pill `sk-or-v1-••••••••••••` appears, highlighted `primary-tint`.
Scene ("copy it"): cursor clicks that row's `Copy`; toast `Copied`; the new key pill lifts to its parked spot at (960, 790). Hold.
handoff_out: rail with step 1 active; browser frame at shared geometry; key pill centred at (960, 790), scale 1, opacity 1, still.

## Frame 5 — Step 2: add it to AnyRouter
- src: compositions/frames/05-step-2-add.html

- scene: Sign in to AnyRouter (real capture), BYOK = Bring Your Own Key, Add a provider → OpenRouter → paste → Test key (its own click) → Key valid → Add key (its own click) → Key verified and saved
- duration: 8.848s
- transition_in: cut
- type: tutorial_step
- beat: doing
- voiceover: "Step two. Sign in to AnyRouter and open the Bring Your Own Key page. Pick OpenRouter, paste the key, click Test key, then Add key."
- asset_candidates: assets/anyrouter-signin.png — real "Continue to AnyRouter" sign-in dialog; assets/provider-openrouter.svg — OpenRouter mark; assets/anyrouter-logo-black.svg — AnyRouter mark
- blueprint: cursor-ui-demo (Adapt)
- focal: the API key field, then the two separate clicks, then the dialog
- roles: anyrouter-signin.png = sign-in screenshot in the browser frame
- sfx: click on sign-in, click on OpenRouter, click on Test key, ping on Key valid, click on Add key, chime on Key verified and saved
- status: outline

handoff_in: rail with step 1 active; browser frame; key pill at (960, 790). Step 1 done and step 2 active at 0.2s.
Keep the built frame's sign-in crop, dashboard, form and dialog. Changes:
- No blank browser: the sign-in screen is on screen from 0.2s (URL `anyrouter.dev`), not after a pause. The cursor clicks `Continue with GitHub` on "Sign in"+~0.8s.
- On "BYOK" the dashboard appears (H1 `BYOK & Shared Pool`) and a callout chip pinned next to the H1 reads `BYOK = Bring Your Own Key` (lands on "bring").
- "Pick OpenRouter" → chip click; "paste" → pill flies into `API key`.
- "click Test key": the cursor goes to `Test key` and clicks it (ripple) ON "Test"; the button shows `Checking with OpenRouter…`; the chip turns `Key valid`. Only then, ON "Add", a second, separate cursor move and click on `Add key`. The two clicks are at least 0.8s apart and each has its own ripple.
- Action bar: status text `Key valid. Ready to add.` on the left with at least 32px clear space before `Cancel` (shorten nothing; move the buttons or the text so they never touch).
- Dialog `Key verified and saved` (+ `Your OpenRouter key passed a live check and is ready to route requests.` + `Continue`): once it lands, the form text it covers goes to opacity 0 (no ghost text through the dialog).
- Keep `Keys are encrypted at rest` visible while the form shows.
handoff_out: rail with step 1 done, step 2 active; browser frame; dialog open.

r4: BYOK is spoken as "Bring Your Own Key"; the underline lands on "Bring" and the callout on "Your".

## Frame 6 — Step 3: share it with the pool
- src: compositions/frames/06-step-3-share.html

- scene: The OpenRouter key panel: the Share with pool switch is ringed, then clicked → consent dialog with all four "In short" lines → checkbox ticked → Donate key → Key verified
- duration: 21.157s
- transition_in: cut
- type: tutorial_step
- beat: payoff
- voiceover: "Step three. Leave the other switches as they are, and turn on Share with pool. The dialog calls it donating. On the free plan, sharing is what lets you use the pool. Other members' requests can run on your key, and they use your OpenRouter quota too. Yours are tried first. Check that OpenRouter's terms allow sharing. You can turn it off any time."
- asset_candidates: assets/provider-openrouter.svg — OpenRouter mark
- blueprint: cursor-ui-demo (Adapt)
- focal: the Share with pool switch, then the consent dialog, then Key verified
- roles: provider-openrouter.svg = panel header and dialog logo
- sfx: click on the switch, click on the checkbox, click on Donate key, chime on Key verified
- status: outline

handoff_in: rail with step 1 done, step 2 active; browser frame. Step 2 done and step 3 active at 0.2s.
Keep the built frame's panel and dialogs. Changes:
- On "Turn on": a `primary` 3px ring draws around the `Share with pool` row's switch BEFORE the click; the click lands on "pool".
- Consent dialog `Donate your OpenRouter key` rises; its `In short` list shows ALL FOUR lines, readable (24px), revealed in step with the voice: (1) `Other users' requests run on your key, and the usage appears on your OpenRouter account.` on "Other members'", (2) `You are responsible for your provider's terms. You may withdraw at any time.` on "turn it off", (3) `You can price each paid model, from $0 up to 10% over its catalog price. On those models you receive what callers pay minus a 10% platform fee.` and (4) `Models left at the catalog price earn your usual reward, based on the catalog price.` may appear with line 1 or 2 but must be legible while on screen. If four lines plus the checkbox do not fit legibly, the dialog may scroll its list (a clean upward move), but nothing may overlap: the checkbox row sits fully below the last line with ≥16px clear.
  Note: "$0" and "10%" are in this real dialog text; they are allowed here only as part of the quoted dialog line.
- On "free plan": chip `On the Free plan, sharing unlocks the pool` (outside the dialog, inside the safe area; it may sit beside the panel before the dialog opens).
- On "Yours always go first": chip `Your own requests always come first` (outside the dialog, inside the safe area).
- On "turn it off any time": chip `Turn sharing off any time`.
- After the chips: the cursor ticks the checkbox `I have read this and authorize AnyRouter to use my key to serve other users' requests.` (the box shows its check) and only then clicks `Donate key` (it is disabled until ticked) → `Verifying key…` → the consent dialog fades out fully → result `Key verified` + `Key is live and working` + `Got it`. Step 3 checks. Hold ≥0.6s.
- Once a dialog covers panel text, that text goes to opacity 0. Never two dialogs at once.
handoff_out: rail with steps 1–3 done; clean cut to Frame 7.

r4: a box and the note `Leave these as they are` mark Use my key / Only my key on "Leave"; the earnings hint under Share with pool is cropped. The dialog shows two "In short" lines (the paid-model pricing lines are cropped); both arrive with the dialog and each is tinted while spoken. `Donate` underlines on "donating". Notes: `Their requests use your OpenRouter quota` on "quota", `Your requests are tried first` on "Yours", `Turn sharing off any time` on "turn". The checkbox ticks on "sharing", Donate key just before "You".

## Frame 7 — Step 4: use it in your app
- src: compositions/frames/07-step-4-app.html

- scene: A code/config card for the viewer's app: the AnyRouter key (a different key, from anyrouter.dev/dashboard/keys), base URL https://anyrouter.dev/api/v1, and model openrouter/free
- duration: 15.248s
- transition_in: cut
- type: tutorial_step
- beat: doing
- voiceover: "Step four. In AnyRouter, open API Keys and create a key for your app. Then, in your app's settings, swap in that key and the AnyRouter address. Keep the model, open router slash free. AnyRouter now runs it on your OpenRouter key."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter mark
- blueprint: panel-edit-live-sync (Adapt)
- focal: the three settings lines
- roles: anyrouter mark = small header mark
- sfx: key-press on each swap, pop on the model line
- status: outline

handoff_in: rail with steps 1–3 done. Step 4 active at 0.2s; step 4 done at the end of the line.
Layout: the shared `terminal` card centred (x 290, y 200, 1340×520), title `my-app/.env`. Three lines, Geist Mono 34px, each shown first in its OLD OpenRouter value (dim) and then swapped in place to the AnyRouter value (`terminal-ink`), each on its spoken words:
1. `API_KEY=sk-or-v1-••••••••••••` → `API_KEY=sk-ar-v1-••••••••` on "AnyRouter key"; a 24px `terminal-dim` note at the right: `from anyrouter.dev/dashboard/keys`.
2. `BASE_URL=https://openrouter.ai/api/v1` → `BASE_URL=https://anyrouter.dev/api/v1` on "base URL".
3. `MODEL=` line: old value `MODEL=your-model:free` (dim) → `MODEL=openrouter/free` on "open router slash free" (the model id in `#F0915A`), then a `free`-green check and a 24px `terminal-dim` note `uses your OpenRouter key in BYOK`.
Lines 1 and 2 swap on "AnyRouter key" and "base URL"; each gets a `free`-green check after its swap. Under the card, 26px ink: `Your AnyRouter key is a separate key. Your OpenRouter key stays in BYOK.` reveals right after line 1's swap. Step 4 checks on the last word. Hold.

r4: two phases. On anyrouter.dev/dashboard/keys: `API Keys` underlines, `Create key`, `Key name` = `my-app`, `Your new API key` with `sk-ar-v1-••••••••` and Copy → Copied. On "Then": eyebrow `Your app's settings` and the .env card. API_KEY swaps on "that key", BASE_URL on "address", MODEL stays `openrouter/free` (dim → lit and checked on "Keep", note `unchanged · now runs on your OpenRouter key in BYOK`). Under the card: `Your AnyRouter key goes in your app. Your OpenRouter key stays in BYOK.`

## Frame 8 — How it works
- src: compositions/frames/08-how-it-works.html

- scene: Requests flow one at a time: your key first → 200 OK; your key is limited → 429 → rests; the next requests each go to one shared key (one request per key, over time) → 200 OK; requests keep going; your key comes back
- duration: 10.555s
- transition_in: cut
- type: key_feature
- beat: understanding
- voiceover: "Now each request tries your key first. When it hits the limit, your key takes a short break, and the next requests go to keys other members shared. Then your key comes back."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter monogram for the hub; assets/provider-openrouter.svg — OpenRouter mark on the key pills
- blueprint: constellation-hub (Adapt)
- focal: the request path
- roles: anyrouter mark = hub node; OpenRouter mark = key glyphs
- sfx: ping on the first 200, error on the 429, ping on each shared-key answer, chime when your key returns
- status: outline

Keep the built frame's layout and ring. Changes:
- Requests are sequential: request 1 → your key → `200 OK`. Request 2 → your key → `429`, your key dims, ring + `resting`. Then requests 3, 4, 5, 6 leave the app ONE AFTER ANOTHER (≥0.45s apart, each dot visibly separate on the path) and each goes to a DIFFERENT shared key (pool key 1, 2, 3, 4), each answering `200 OK` when it arrives. Never two dots at the same key, never one dot splitting.
- A label near the pool keys, 24px muted, `each request → a different shared key` appears on "each to a different one".
- Remove the footnote about credits.
- Headline `Your requests keep going.` on "keep"; ring completes and your key returns; a last request goes to your key → `200 OK`.

r4: `resting` is now `short break`; the `each request → a different shared key` label is gone; headline `Your key first. Shared keys next.` on "comes back".

## Frame 9 — Close
- src: compositions/frames/09-close.html

- scene: The honest summary: your key counts toward OpenRouter's limit; past it, the pool keeps you going; AnyRouter lockup and anyrouter.dev
- duration: 12.121s
- transition_in: crossfade
- type: cta
- beat: resolve
- voiceover: "With the pool on, you get more room past OpenRouter's limit. Shared keys have their own limits too, so the extra room can vary. Start at any router dot dev."
- asset_candidates: assets/anyrouter-logo-black.svg — AnyRouter wordmark and monogram
- blueprint: logo-assemble-lockup (Adapt)
- focal: the AnyRouter lockup
- roles: anyrouter-logo-black.svg = hero lockup
- sfx: sparkle on the lockup
- status: outline

Keep the built frame's lockup end. Replace the first two scenes:
Scene 1 ("Your own key still counts toward OpenRouter's limit"): row 1, your key pill (OpenRouter glyph) + `Your key counts toward OpenRouter's limit`, on "own key".
Scene 2 ("Past it, the pool keeps you going"): row 2, a small stack of three muted pills + `Past it, shared keys keep you going`, on "Past". No h2, no earnings line, no "no daily cap", no 2,400.
Scene 3 ("Start at anyrouter.dev"): rows clear upward; the AnyRouter lockup and `anyrouter.dev` (Geist Mono, primary) settle; completely still for the last ≥2.5s.

r4: row 1 is three shared-key pills + `More room past OpenRouter's limit` on "pool"; row 2 is an info mark + `Shared keys have limits too, so it can vary` on "Shared".
