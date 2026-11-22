# Round2 – notes for Claude

- **Two kinds of work happen in this repo – read the "READ FIRST" box at the top of `HANDOFF.md`.** DESIGN work (the admin/
  design team, looks only) stays inside `design/` on its own branch with a pull request – never `worker/`, never deploys.
  **The homepage `index.html` is the exception: the design team edits it freely and publishes straight to `main`, no pull
  request or owner approval (owner, 22 Nov 2026).** Function work: pull before touching `index.html` – she changes it often.
  FUNCTION work follows every rule below and leaves `design/` files to the design team.
  **Design finds a functional problem → it goes in HANDOFF "DESIGN → FUNCTION CONCERNS" (owner, 22 Nov 2026); function work
  reads that list before touching a screen it names, and ticks items off with date + commit when fixed.**

- **Run the System check before and after any change** (control centre at staff.round2.sg › Tests & systems › System
  check; code: round2-tv-launcher `manager/index.html`, `SysCheck`). Add a step for every new feature that touches another
  part. Why and how: round2-tv-launcher `docs/system-check.md`. This is the owner's standing rule.
  **Two sizes (owner, 16 Nov 2026):** **Light check** (no SimplyBook requests) for changes that can't touch bookings (PS4
  helper, TV app, control centre screens); **Full check** (~650 SimplyBook requests a run; guideline ~5,000 a day, hard stop
  ~10,000) for anything touching bookings, notes, messages, payments or this engine's booking code. Check "SimplyBook requests
  today" before a full run.
- Read `HANDOFF.md` and `docs/booking-times.md` before touching anything time-based. Times are Singapore time; the shop
  night runs to 7am (before 7am belongs to the night before; every screen switches at 7am); guest end = SimplyBook end − 15 min cleaning.
- `worker/round2-book.js` is the live Cloudflare engine `round2-book`. Deploy carefully (keep bindings), then run the check.
- **Kaeden is under renovation (since ~30 Oct 2026, open-ended).** Its long "room blocked" note in SimplyBook stays – don't
  remove it or "fix" Kaeden having no free slots. Its TV should still run and report in like the others, ready for reopening.
- **Telegram is only for the Madd Pizza ↔ Round2 food workflow** (kitchen slip, pickup button). Owner, 14 Nov 2026: never send
  anything about bookings to Telegram – Madd Pizza doesn't need to know them. Booking alerts go to staff phones (control centre) only.
- Deploying the engine: `keep_bindings` must list secret_text, kv_namespace, plain_text, durable_object_namespace **and r2_bucket**
  (27 settings; without r2_bucket the PS4 game-save storage is cut off). Check the count after every deploy.
- **Background jobs run in three timers** (14 Nov 2026; Cloudflare free plan = 50 outside requests per run): `now` */5
  (reminders, tonight's calendar), `side` minutes 1,6,… (TV OKs, payments, keys), `sweep` minutes 3,13,… (look-aheads). A new
  background job goes in side or sweep or gets its own timer (5 allowed, 3 used) – never bulk up `now`. HANDOFF "THREE TIMERS".
- **Durable Object calls are capped: 100,000 a day on the free plan** (resets 8am SGT; over it the engine's bookings/payments
  error). Every `hb.*` call from the worker is one. Read several keys with ONE `hb.kvMany` / `hbSnap` (17 Nov), never a kvGet
  per key in a loop or per poll. HANDOFF "DURABLE OBJECT CALLS".
- **Exploratory PS4 work (owner, 20 Nov 2026): log everything** – every probe result, crash and each room's PS4 quirks go into
  HANDOFF + docs (ps4-shellui.md / ps4-network-and-wake.md). Probe ALL PS4s in a one-time sweep (owner turns each on), never one
  per firmware by assumption. Menu add-ons: read-only probe first, guarded so they cannot abort the menu (round2_pwrprobe1 crashed
  Kaeden 20 Nov 5:50am), with a breadcrumb file per step.
