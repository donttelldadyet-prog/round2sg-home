# Round2 – notes for Claude

- **Run the System check before and after any change** (control centre at staff.round2.sg › Tests & systems › System
  check; code: round2-tv-launcher `manager/index.html`, `SysCheck`). Add a step for every new feature that touches another
  part. Why and how: round2-tv-launcher `docs/system-check.md`. This is the owner's standing rule.
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
