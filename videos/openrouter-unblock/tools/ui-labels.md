# AnyRouter BYOK dashboard: exact UI labels (OpenRouter unblock video)

Source repo: `/Users/duet/project/anyrouter-wt-public-shared` (read 2026-10-18).
Path shorthands:
- `D` = `apps/dashboard/src/app/byok`
- `C` = `apps/dashboard/src/app/byok/-components`
- `UI` = `packages/ui/src/components`
- `DOCS` = `src/content/docs`

## WHICH CODE IS LIVE (read first)

`anyrouter.dev/dashboard/*` is forwarded whole to the `dash` spoke (`src/route-classify.ts:245-259`), which strips `/dashboard` (`packages/lib/src/dashboard-apex.ts:74-77`). So **the live page at `/dashboard/byok` is `apps/dashboard/src/app/byok/index.tsx`**.

The files named in the brief are not that page:
- `src/app/dashboard/byok/**` (`pool-section.tsx`, `available-providers.tsx`, `key-row.tsx`, `new.tsx`) is the old hub copy. It is shadowed and never served. It still contains the "Available" grid, the "Donate to pool" empty-state copy and a "Key Donation Pool / Coming soon" section. **Do not copy from it.**
- `UI/byok-page/byok-page.tsx` is the public marketing page `anyrouter.dev/byok` ("Bring your own keys"), not the dashboard.
- `UI/byok-badge/byok-manage-key-row.tsx` is the row inside the "OpenRouter keys" dialog that opens from **model pages**, not the dashboard. It does have a "Donate to pool" button (line 336). Notes are in section 3c.

## MISMATCHES (plan or docs vs live UI)

1. **No "Available" heading or grid on the live page.** For a new user with zero keys, the list area is the "Add a provider" chip grid (`C/add-provider-panel.tsx:116`). After the first key, the list is "Your keys" and new providers come from the "Add key" header button. "Available" exists only in the dead hub copy (`src/app/dashboard/byok/index.tsx:276`). The docs still say "Find OpenRouter under Available" (`DOCS/guides/unblock-free-model-rate-limits-openrouter-key.md:43`, `DOCS/features/byok-providers/openrouter.md:28`, `DOCS/features/shared-pool.md:36`).
2. **There is no "Save" button.** The add form's primary button says **"Add key"**. While it runs it says **"Checking with OpenRouter…"** (`C/add-key-form.tsx:1057-1060`). The docs say "click Save" (guide :43, openrouter.md:33). "Save changes" appears only in edit mode.
3. **"Add key" is locked until a test passes.** The bar under the form reads "Test the key before adding it. Add key unlocks once the test passes." (`C/add-source-parts.tsx:70`), with gating at `C/add-key-form.tsx:384-388`. The real flow is: paste key → **Test key** → "Key valid" → **Add key**. The docs skip the Test step.
4. **No Base URL field for OpenRouter.** OpenRouter has no `supportsBaseUrl` flag (`packages/lib/src/byok-providers.ts:569-576`). `defaultByokBaseUrl` therefore returns `""` (:999-1002), and the field is hidden (`C/add-key-form.tsx:217`, `baseUrl={supportsBaseUrl ? baseUrl : null}` at :915). The base URL appears only as read-only grey text, `https://openrouter.ai/api/v1`, under the provider name in the form header (`C/add-source-parts.tsx:215-218`, value from `byok-providers.ts:941`). The provider detail panel says "Official endpoint — not editable." (`C/provider-detail.tsx:363`). The docs line "Default base URL (editable on the key form)" (openrouter.md:31) and the guide line "The default … is filled in for you" (guide :52) are both wrong for the UI.
5. **No "Donate to pool" toggle on the saved key row in the dashboard.** The live labels are:
   - On the add form: switch **"Donate to the shared pool"** (`C/add-key-form.tsx:938`).
   - On a saved key in the provider panel: switch whose text is **"Not shared" / "Shared"** (`C/key-line.tsx:174`), with aria-label "Share {label} with the pool".
   - Provider settings row: **"Share with pool"** (`C/provider-detail.tsx:249`).

   "Donate to pool" is only (a) a button in the model-page dialog (`UI/byok-badge/byok-manage-key-row.tsx:336`) and (b) dead-code copy. The docs say "flip Donate to pool" (shared-pool.md:39-40, :58, :89; guide :89).
6. **"Key verified" is the title of a result dialog, not an inline badge.** It appears after the consent dialog's **"Donate key"** confirm, as the dialog title **"Key verified"** (or "Key verified — Go plan unlocked") (`UI/byok-page/donate-result-dialog.tsx:89-94`). The add-key success dialog says **"Key verified and saved"** (`C/add-key-result-dialog.tsx:116`). The inline chip on the form says **"Key valid"** (`C/add-source-parts.tsx:72`).
7. **The donate switch shows only while the pool is live.** The switch and the "Share with pool" row render only when `GET /api/v1/byok/donated` answers (`D/index.tsx:146`, `C/key-line.tsx:165`, `C/provider-detail.tsx:246`). While it is paused, the strip shows "Paused" and "Sharing is paused for everyone right now — your keys keep serving you." (`C/pool-strip.tsx:40`).
8. **Earn-rate copy is inconsistent in the product.** The add form says flat **"Earn 5% credits back when others route through this key."** (`C/add-key-form.tsx:156`, tooltip :961-963). The pool tab, model-page row and docs say **"up to 8%"** (8% Pro/Max, 5% Go). Pick one per scene and do not mix.
9. **"$1 per key per UTC day" is not in the dashboard UI.** It is docs-only (`DOCS/features/shared-pool.md:21`, :79).
10. **Free tier HAS a daily cap.** It is 10 requests/day on Free and 1000/day on Go and up (`DOCS/features/free-tier.md:19`, :32). The "no daily cap" claim holds only for **BYOK and paid traffic** (free-tier.md:32, :49; rate-limits.md:18).
11. **"2400 rpm per key" is the Enterprise plan only.** BYOK is **600 req/min** (`DOCS/features/free-tier.md:33`). Free-tier models are 240/min (60/min on Go) (`DOCS/features/rate-limits.md:26`, :30, :42).
12. **The OpenRouter free limits "20/min, 50/day, 1000/day with $10 credits" appear nowhere in the docs.** I found no sentence stating them. Cite openrouter.ai if you need them.
13. The health badge component `UI/byok-page/byok-key-health-badge.tsx` is used **only by admin** (`apps/admin/src/app/-users/byok-keys-card.tsx:93`). The dashboard uses `HealthChip` (`C/provider-row-cells.tsx:34`) and the row status word instead.
14. `UI/byok-page/featured-providers.ts:37-40` holds an OpenRouter tagline, "Hundreds of models, including free ones". `FEATURED_PROVIDERS` has no importer outside its own file, so **no screen shows that tagline**.

---

## 1. BYOK page (`/dashboard/byok`), top to bottom

Route `D/index.tsx`. The tab title is "BYOK & Shared Pool" (:50). Layout is `PageContainer` with `gap-4` (:209).

1. **Page header** (`C/byok-chrome.tsx:93-170`, keys page passes `tabs={false}` so no tab strip, `D/index.tsx:212`)
   - H1: **"BYOK & Shared Pool"** (:94), 2xl semibold (`UI/dashboard-print/dash-page-header.tsx:35`)
   - Description (:95): "Bring your own provider keys and let AnyRouter balance load across them — or lend an idle key to the shared pool and earn credits back. Combine multiple keys per provider, route by priority, weight, or round-robin, and stay under rate limits."
   - Actions on the right, in order:
     - `?` icon button (outline, aria "Help and links") opening a menu: "Public page", "Learn more", "How to get a key" (:100-140)
     - Outline button with gift icon: **"Donate a key"** (:141-154)
     - Primary button with plus icon: **"Add key"** (:155-168)
2. **Shared pool strip** (`C/pool-strip.tsx:74-121`)
   - Line: gift icon, **"Shared pool"** (:78), status chip **"Live"** / **"Paused"** (:83-85), a one-line summary, and on the right the link **"Pool details →"** (:98)
   - Summary when live: `"{n} of {total} key(s) shared · ${earned} earned · {donors} donor(s) · {k} providers"`, built from parts (:43-49). The "earned" part appears only when n > 0. The donors/providers part appears only once stats load.
   - Summary when paused: "Sharing is paused for everyone right now — your keys keep serving you." (:40)
   - KPI band of 4 cells: **"Pool keys"**, **"Donors"**, **"You share"** (value "n / total", context "$x earned"), **"Pool requests today"** (:103-119). A value that has not loaded shows "—".
3. **Attention rows** (failing or paused items), only if any exist (`D/index.tsx:242-250`)
4. **Split view** (`DetailDrawer`): list on the left, context panel on the right, pane width `min(32rem, 48%)` (`D/index.tsx:254-280`). On phones the panel is a full-screen drawer.
   - **New user (0 keys): the list area is the "Add a provider" panel** (`D/index.tsx:203-206`, `C/add-provider-panel.tsx`)
     - Header: **"Add a provider"** with **"{N} available"** right-aligned (:116-117)
     - Search: placeholder **"Find a provider…"** (:139)
     - Grid: **2 columns** of compact chips, first **12** shown (:31, :152). Order is free-tier first, then by catalog model count (`C/available-providers-sort.ts:48-57`).
     - **OpenRouter chip** (:53-83): a mono provider logo (18px), the text **"OpenRouter"**, a small filled sparkle icon in primary color (free tier, `freeTier: true` at `byok-providers.ts:575`), and the model count right-aligned in mono xs. A narrow divider holds a `?` button (help dialog). **There is no "Add" button text and no description.** The whole chip is the button, aria-label "Add OpenRouter key" (:57), tooltip "OpenRouter · Free tier · {n} models" (:58-60). Clicking goes to `/byok/new?provider=openrouter`.
     - "Show all {N}" outline button (:171)
     - Footer: "One click opens the key form." with links "How" and "Docs" (:177-194)
   - **After the first key: "Your keys" card** (`C/provider-list.tsx:367-455`)
     - Title **"Your keys"**. Meta: `"{p} provider(s) · {k} key(s)"`, plus `" · {n} failing"` in red when any fail (:369-377)
     - Search icon and filter icon on the right (:381-400)
     - One row per provider (:242-310), each `min-h-12`:
       - 20px logo
       - name (sm, medium)
       - colored dot + status word + `"· {detail}"`
       - right side: "Last used {date}" (mono, md+), a ghost ▶ **Test** icon, and a switch (aria "Use my key for OpenRouter")
     - Status word and detail (`C/provider-list.tsx:95-129`):
       - "Failing · key rejected", which adds a **"Replace key"** outline button (:286)
       - "Off · every key is off"
       - "Plan low"
       - "No data · no traffic in 7d"
       - otherwise the health label: **"Healthy"**, **"Unused"**, **"Failing"**, or "{n} recent failure(s)" (`packages/lib/src/byok-key-health-signal.ts:188-233`)
       - traffic detail `"{n} req in 7d · {x}% OK"` (:84-88)
     - Dot colors (:55-60): ok = green `bg-success`, warn = amber, bad = red, neutral = grey
     - Empty search: "No provider matches this search or filter." (:443)
   - Clicking **"Add key"** in the header opens the add form in the right panel. The drawer title is **"Add a provider key"** (`D/index.tsx:58`).

## 2. Add-key form (OpenRouter)

Component `C/add-key-form.tsx`, used both as the full page `/dashboard/byok/new` (`D/new.tsx`) and as the right panel (`layout="panel"`). **It is a page or panel, not a dialog.**

- Page mode only:
  - H1 **"Add Source Account"**, description "Add your own provider API key as a source account. Secrets are encrypted at rest and used only for routing." (:397-402)
  - Actions: book icon (tooltip "Learn more about BYOK"), outline button **"Back"** (:769-786)
- Layout: page mode is 2 columns, `20rem` rail plus form (:810-813). Panel mode is one column with the rail above the form.
- **Provider rail** (`C/add-source-parts.tsx:127-197`)
  - Header: "Provider" with "{N} available"
  - Search: placeholder **"Search providers…"**
  - Filter chip: **"Free tier"**
  - Radio list rows (44px): logo, name, and a grey **"Free tier"** badge. The selected row has a muted background and a 3px dark left bar.
  - Footer: lock icon, "Keys are encrypted at rest"
  - Phones get a "Provider" select instead (:822-841)
- **Provider header** (`C/add-source-parts.tsx:201-249`)
  - 28px color logo, **"OpenRouter"** (base semibold), grey **"Free tier"** badge
  - Under the name: `https://openrouter.ai/api/v1` (xs muted, read-only)
  - Right side: outline button **"Get an API key ↗"** (to `https://openrouter.ai/keys`), book icon (tooltip "API docs")
- Section **"Source details"** (:856)
  - **"API key"** label (:870), password input, mono font, placeholder **`sk-or-...`** (from `byok-providers.ts:572`). No hint text for OpenRouter (no `keyHint`).
  - Status chip right of the input (`C/add-source-parts.tsx:63-83`):
    - **"Not tested"** (outline)
    - **"Key valid"** (grey filled)
    - **"Not confirmed"** (outline)
    - **"Rejected"** (red)
  - Test model picker: **"Models (3)"** with "3 of N selected (max …)", collapsed. Presets "Select none", "Top 3", "Free". Filter placeholder "Filter models" (`UI/byok-test-key/test-key-model-picker.tsx:49-70`).
  - Live checklist after a test: **"Running checks…"** while running (`UI/byok-test-key/test-key-checklist.tsx:76`). Rows: "Key auth", "Chat", "Streaming (first token)", "Tool calling", … (`test-key-checklist-state.ts:43-48`). Each row is "Pass" / "Fail" / "n/a". Tabs: "Checks" and "Raw".
  - **"Source alias"**, hint "A name you will recognize in logs.", placeholder "e.g. prod primary" (:898-903)
  - Collapsed **"Advanced routing"** with summary "Priority 0 · Weight 1" (:191). Inside: "Priority" (hint "0 is tried first."), "Weight" (hint "Share of traffic at the same priority."). **No Base URL for OpenRouter** (see MISMATCH 4).
- Section **"Options"**, rows of switch + label + hint (:921-990)
  - **"Enabled"**, "Route eligible requests through this source." Default ON.
  - **"Always use this source"**, "Never fall back to shared capacity for this provider." Default OFF.
  - **"Donate to the shared pool"**, hint "Earn 5% credits back when others route through this key." (:156). An `ⓘ` tooltip reads "Lend this key to the shared pool when it's idle and earn 5% of each request's token cost back as credits. Opt-in and withdrawable any time from the Shared Pool tab. Usage appears on your provider account — make sure your provider's terms allow it." with the link "How the pool works". Flipping it ON opens the consent dialog (section 3b). After you confirm, the hint becomes e.g. "Free models · {n} routed" plus a **"Change"** link (:157-169, `C/add-source-parts.tsx:93`).
  - Collapsed **"OpenRouter routing"**, summary "All models" (default) or "Free models only". Body: "Restrict this key to :free wires, or allow every OpenRouter model." Radios "Free models only" / "All models", each with "{n} routed" (:973-989, `UI/byok-page/donate-coverage-picker.tsx:330-357`).
  - Collapsed **"What this key unlocks"**, "{f} free · {p} paid" (`C/add-source-parts.tsx:321`)
- **Action bar** (sticky bottom, `C/add-key-form.tsx:240-302`). Status text is on the left; buttons are on the right.
  - Status text (`C/add-source-parts.tsx:67-82`):
    - untested: "Test the key before adding it. Add key unlocks once the test passes."
    - valid: "Key valid. Ready to add."
    - unconfirmed: "The provider did not confirm this key. You can still add it."
    - rejected: "The provider rejected this key. Fix it and test again."
  - Buttons: ghost **"Cancel"**, outline **"Test key"**, primary **"Add key"** with a key icon (:1057, :1065)
  - **While a call is in flight:** both Test and Add show **"Checking with OpenRouter…"** with a spinner (:1060, :1066). With donate ON, Add then shows **"Adding to shared pool…"** (:1059).
- **Test result dialog** (test only; nothing saved) (`C/add-key-result-dialog.tsx:278-336`)
  - Title (with logo): **"Key works"** / **"Provider rejected this key"** / **"No verdict yet"**
  - Description: "This was a test only — nothing has been saved yet."
  - Success alert: **"Key authenticated successfully"**, "OpenRouter accepted this credential. Save it below to start using it — saving runs its own independent check, so this result isn't just trusted blindly."
  - Invalid: "OpenRouter rejected this credential", "Double-check the key was copied correctly before saving it."
  - Button **"Close"**
- **Add result dialog, success** (:113-181)
  - Title (with logo): **"Key verified and saved"** (or "Key saved" if unconfirmed)
  - Description: "Your OpenRouter key passed a live check and is ready to route requests."
  - Alert: **"Key is live and working"**, "AnyRouter proved it with a real request — it's enabled and eligible for routing right away."
  - If donate was ON: green banner **"Added to the shared pool"** ("… — Go plan unlocked" when granted), "It's now eligible to serve pool requests and earn credits back."
  - Button **"Continue"**
  - **No toast.** A success dialog is used instead.
- **Add result dialog, invalid key** (:187-257)
  - Title (red warning icon): **"Provider rejected this key"** (or "Couldn't save this key")
  - Description: "The key was **not** saved."
  - Red alert: "The provider actively rejected this credential — see its response below. It will not work until you replace it." and "Verify it still works in your BYOK settings and replace it if not."
  - Without diagnostics: the server message plus "Double-check the key and provider, then try again."
  - Button **"Close"**

## 3. Saved key and donate

### 3a. Provider detail panel (right side, after clicking the OpenRouter row)

Source: `C/provider-detail.tsx`.

- Header (:432-459): logo, **"OpenRouter"**, a health chip (e.g. "Healthy", or "No data"), outline button **"Test"** (magnifier), close X
- Settings rows (:214-296):
  - **"Use my key"**, "Route OpenRouter models through this key" (switch)
  - **"Only my key"**, "No fallback to platform credits" (switch)
  - **"Share with pool"** (pool live only). Hint "Earn credits back when others route through this key", which changes to "Others can route through this key · earns credits back" once shared (:193-196). A single key gets a switch plus a coverage badge ("Free · {n}" / "All · {n}", blue tint, `C/key-line.tsx:42-44`).
  - **"Strategy"**, "How traffic is split across this provider's keys", showing "Needs 2+ keys" for one key
- Keys section: **"Keys · 1/1 active"**, outline button **"+ Add key"**, help line "To rotate a key, add the new one, test it, then delete the old one. The secret itself is never shown or edited." (:470-488)
- **Key line** (`C/key-line.tsx:120-226`)
  - Top: a green dot (grey when off), then the name. The name is the label if set, otherwise the masked key. Masked format is `makeKeyPreview` = first 4 chars + `****` + last 3, e.g. **`sk-o****xyz`** (`packages/lib/src/byok-providers.ts:1038-1044`). When a label exists, the mask shows beside it in mono.
  - Badges:
    - **"validated"** (green) / **"rejected"** (red) / dashed **"not validated"**
    - **"always"**
    - **"free only"**
    - donation status when not active (e.g. "paused") (:62-90)
  - Right side: mono "P0 · W1", then ›
  - Second line:
    - switch **"On"** / **"Off"**
    - switch **"Not shared"** / **"Shared"** + coverage badge + spinner while busy (pool live only)
    - icon buttons: ✓ "Validate with the provider", ✎ "Edit label and base URL", 🗑 "Delete key" (red)
- Panel also shows "Base URL" `https://openrouter.ai/api/v1`, "Official endpoint — not editable." (:357-364), and the "OpenRouter routing" picker (:380-396).
- Footer: "Turn every key off with Use my key; removing deletes them." with a red outline remove button.
- Toast on Validate (`C/use-byok-state.ts:496-507`): "{name} is valid" / "The provider accepted this key." or "{name} was rejected".

### 3b. Flipping the share switch ON

The donate switch never fires directly; it parks until consent (`C/use-byok-state.ts:705-711`). It opens **PoolConsentDialog** (`UI/byok-page/pool-consent-dialog.tsx`):

- Title: **"Donate your OpenRouter key"** (:121), display font, xl, color logo on the left
- Description: "Choose what the shared pool may run on this OpenRouter key. Optional." (:124-127)
- Coverage radios "Free models" (default) / "All models", each "{n} routed".
  - Free: "The pool may route {n} free / :free catalog models through this key. Paid SKUs never hit it." (`donate-coverage-picker.tsx:415-420`)
- **"In short"** list of 4 check-marked lines (:40-43):
  - "Other users' requests run on your key, and the usage appears on your OpenRouter account."
  - "You are responsible for your provider's terms. You may withdraw at any time."
  - "You can price each paid model, from $0 up to 10% over its catalog price. On those models you receive what callers pay minus a 10% platform fee."
  - "Models left at the catalog price earn your usual reward, based on the catalog price."
- **"Full terms"** with "Scroll to read all": a scroll box holding `POOL_CONSENT_TEXT` (`packages/lib/src/byok-pool-consent.ts:64-76`), which starts "By donating this key, you authorize AnyRouter to use it to serve requests from other users. Usage will appear on your provider account. You may withdraw at any time. …"
- Checkbox: **"I have read this and authorize AnyRouter to use my key to serve other users' requests."** (:189)
- Buttons: outline **"Cancel"**, primary **"Donate key"**, which becomes **"Verifying key…"** while busy (:193-210). Confirm stays disabled until the box is checked.

### 3c. After confirm: DonateResultDialog

Source: `UI/byok-page/donate-result-dialog.tsx`.

- Title (with logo):
  - **"Key verified"** (:91)
  - "Key verified — Go plan unlocked" (:90) when the server grants Go
  - "Key donated" (:94) if the provider has no pre-check
- Description: "Your OpenRouter key passed a live check and is now serving requests from the shared pool." (:98)
- Inset: **"Key is live and working"**, "AnyRouter proved it with a real request before adding it to the pool — you'll start earning credits back as it serves traffic." (:110-114)
- When granted: **"You've been upgraded to Go"**, "Donating a working key unlocks the Go plan for free — no card required, for as long as this key keeps serving the pool." (:125-130)
- Button **"Got it"** (:155)
- Failure title: "Provider rejected this key" / "Key couldn't be verified" with "This key was **not** added to the shared pool." (:195-201). Other failures toast "Couldn't add key to the shared pool" (`C/use-byok-state.ts:161-164`).
- Withdraw toast: "Key withdrawn from the shared pool" (`C/use-byok-state.ts:683`). For the last donated key, a revoke-warning dialog appears first.

### Model-page dialog (not the dashboard; for reference only)

Source: `UI/byok-badge/byok-manage-dialog.tsx`, `UI/byok-badge/byok-manage-key-row.tsx`.

- Title "OpenRouter keys"
- Description "Your keys answer first, billed by OpenRouter. If none can, the donated pool answers from AnyRouter credits." (:567-570)
- Tabs "Add key" / "Saved keys (N)"
- Add panel buttons "Test"/"Testing…" and "Add"/"Adding…" (`byok-add-key-panel.tsx:176`, :190)
- Toast on add: "Key added · serves N models" (:275)
- Row: "Active"/"Paused" badge, "Pooled" badge, text "Your requests: all models · Pool: off", mini switches "Pool" and "On"
- Flipping Pool shows a coverage toggle and a **"Donate to pool"** button (row :336), then the same consent dialog
- Pool tooltip: "Share this key to the pool to earn credits" / "Shared to the pool — earns up to 8% credits per served request" (row :160-163)

### Earn copy

| Copy | Source |
|---|---|
| "Earn 5% credits back when others route through this key." | `C/add-key-form.tsx:156` |
| "Donate idle keys, earn up to 8% back as credits" | `C/pool-panel.tsx:398` (Shared Pool tab) |
| "Every request your pooled key serves rebates up to 8% of its token cost to your AnyRouter balance (8% on Pro/Max, 5% on Go)." | `C/pool-panel.tsx:401-402` |
| "Go free, $4 credit a month and 5% back (8% on Pro and Max)." | `UI/byok-page/donate-key-dialog.tsx:45` (`DONATE_PERKS`; GO_CREDIT_USD = Go plan credit, used in the "Donate a key" dialog) |
| "$1 per key per UTC day" | **Docs only** (MISMATCH 9) |

## 4. Pool section on the BYOK page

The live page has **no `pool-section.tsx`**. The pool block on `/dashboard/byok` is the **pool strip** described in section 1, item 2 (`C/pool-strip.tsx`). The full pool lives at `/dashboard/byok/pool` (`D/pool.tsx`, tab title "Shared Key Pool"):

- Heading (uppercase small) **"Shared Key Pool"** with a "Live" (green) / "Paused" (grey) badge (`C/pool-panel.tsx:378-383`)
- Card **"Donate idle keys, earn up to 8% back as credits"** (:398)
- Stats: **"Active donors"**, **"Requests today"**, **"Credits rewarded"** (primary color), **"Eligible providers"** (:427-436)
- **"Your donations"** section (:445) with "Your pooled keys", "Requests served", "Credits earned"
- Empty state: "Add a BYOK key first, then flip its switch here to start earning credits." (:467)
- The dead hub `src/app/dashboard/byok/-components/pool-section.tsx` ("Key Donation Pool", "Coming soon", "Earn up to 8% back") is **not served**.

## 5. Visual cues, in plain terms

- **Style.** Flat "Style C": 1px hairline borders, small radius, hardly any shadows, dense text-xs meta. Cards are `SectionCard` with a title bar.
- **Status chips** (`UI/dashboard-print/status-chip.tsx:15-18`):
  - ok = grey filled pill
  - warn and neutral = outlined pill
  - bad = red-tinted pill

  So "Key valid" and the "Live" chip are **grey**, not green.
- **Badges** (`UI/ui/badge.tsx:13-23`):
  - success = light green tint + green text ("validated", "Active in pool", the pool-tab "Live")
  - destructive = red tint ("rejected")
  - blue = light blue tint (coverage "Free · 25")
  - outline = thin border ("always", "free only", "not validated" dashed)
- **Switches.** Standard shadcn pill switches. The add form puts the switch on the left of the label (`C/add-key-form.tsx:118`). Panel rows put the switch on the right.
- **Buttons.**
  - Primary (solid, dark/ink): "Add key", "Donate key", "Got it", "Continue"
  - Outline: "Donate a key", "Test key", "Get an API key", "Replace key", "+ Add key"
  - Ghost: "Cancel", icon buttons
  - Red text: delete
- **Dots.** A green dot means the key is enabled. Row status dots are green, amber, red or grey.
- **Free tier.** A small primary-color sparkle on chips; a grey "Free tier" badge on the rail and header.
- **Fonts.** Mono for keys, base URL, counts and "P0 · W1".

## 6. Doc sentences, verbatim

(a) BYOK key tried first
- `DOCS/features/credential-selection.md:30` "Using your own key is always attempted before AnyRouter reaches for anything else."
- `DOCS/guides/unblock-free-model-rate-limits-openrouter-key.md:56` "When a request needs a model your OpenRouter key can serve, AnyRouter tries **your key first**, before the shared pool and before your AnyRouter credits."
- `DOCS/features/credential-selection.md:51` "If you've added a BYOK key for the provider a request needs, AnyRouter tries it before anything else."

(b) 429 cooldown and automatic return
- `DOCS/features/credential-selection.md:89` "**Rate limited.** A key that gets rate limited by its provider is set aside for a short cooldown and skipped by the router, then automatically returns to rotation once the cooldown passes. Being throttled doesn't mark a key as broken."
- `DOCS/guides/unblock-free-model-rate-limits-openrouter-key.md:56` "If your key is rate limited or fails, AnyRouter sets it aside for a short time and moves on to the next option."

(c) Pool eligibility
- `DOCS/features/credential-selection.md:66` "If you don't have a working key for the provider — or your own keys are temporarily unavailable — and you're eligible for the shared pool (you've donated a key, or you're on a paid plan), AnyRouter can route the request through a donated key from another user's account instead of billing your credits."
- `DOCS/features/credential-selection.md:27` "| Shared pool | A donor's provider account | You've [donated a key](/features/shared-pool) or hold a paid plan |"
- `DOCS/guides/unblock-free-model-rate-limits-openrouter-key.md:91` "On the Free plan, donating an eligible key also unlocks the shared pool's free models for you, the same as subscribing to Go."

(d) Credits last; BYOK never charged
- `DOCS/features/credential-selection.md:30` "Credits are the catch-all: if nothing else served the request, it's billed against your AnyRouter balance. **BYOK requests are never charged to your credits, whether they succeed or fail.**"
- `DOCS/features/credential-selection.md:70` "If none of the above apply — no BYOK key, not eligible for the pool, or every attempt above failed — the request is billed against your AnyRouter credits at the provider's list price, with no AnyRouter markup."
- `DOCS/guides/unblock-free-model-rate-limits-openrouter-key.md:67` "**AnyRouter charges nothing** for requests served by your key. No markup, no per-request fee, and no credits are deducted."

(e) anyrouter/free fallback header
- `DOCS/features/free-tier.md:91` "If every route for a `:free` model fails, AnyRouter answers through `anyrouter/free` instead of returning an error. The response then carries `x-anyrouter-fallback: anyrouter/free`, and the `model` field names the free model that actually answered."

(f) Daily cap and rpm (see MISMATCHES 10 and 11; the brief's claim is wrong as stated)
- `DOCS/features/free-tier.md:19` "The Free plan includes **10 requests per day**. Paid plans (Go and up, including donation-backed Go) include **1000 requests per day**."
- `DOCS/features/free-tier.md:49` "The cap doesn't apply to paid models, requests served through a BYOK key (even for `:free` models), or requests that consume credits."
- `DOCS/features/free-tier.md:32-33` table: BYOK "Daily cap … None", "Per-minute cap … 600 req/min"
- `DOCS/features/rate-limits.md:18` "Paid and BYOK traffic has no daily quota (except the Go plan's per-request-window cap below)"
- `DOCS/features/rate-limits.md:30` "| API key, plan = `enterprise` (any model) | enterprise | **2400 req / 60s** |" (the only 2400 figure; Enterprise plan, not per BYOK key)
- `DOCS/guides/unblock-free-model-rate-limits-openrouter-key.md:29` "You used your daily free-tier allowance: **10 requests/day** on Free, **1,000 requests/day** on Go and up. Resets at 00:00 UTC."

(g) OpenRouter free limits 20/min, 50/day, 1000/day with $10: **not found in any doc** (MISMATCH 12). The closest sentence:
- `DOCS/guides/unblock-free-model-rate-limits-openrouter-key.md:68` "**`:free` models stay free.** They run under OpenRouter's own limits for free models on your account."

Shared-pool earn and cap, for reference:
- `DOCS/features/shared-pool.md:21` "Every request served through your donated key adds to a pending balance: **8% on Pro and Max, 5% on Go (or with no plan)** of the notional token cost. … Credits are capped at $1 per key per UTC day; a key that hits the cap pauses until the next day."
