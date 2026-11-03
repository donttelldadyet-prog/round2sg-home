# Round2 own booking page – plan (test build)

> **Booking times:** SimplyBook bookings end 15 min after the guest session (cleaning). Read [booking-times.md](booking-times.md) before anything time-based.

Status 30 Oct 2026: planning. Nothing live changed. Branch: `own-booking` (round2sg-home).

## Why
SimplyBook's guest page can't do what we sell: Early Bird locked to 11:00 *with* extensions, any 15-min start,
our own extension prices. Flexible timeline ignores "fixed time"; Modern timeline forces 3-h blocks on every service.
Make.com can't carry the load (10,000 ops/month plan, already used by room blocking + TV messages).

## Shape
```
Guest ─ round2.sg booking page (our HTML, GitHub Pages / Wix embed)
          │  1. read free times (SimplyBook public API, as the availability board does now)
          ▼
        Cloudflare Worker  round2-book  (https://round2-book.donttelldadyet.workers.dev, free plan)
          │  2. POST /hold    → re-check slot, store a 10-min hold (Workers KV), create HitPay payment request
          │  3. guest pays on HitPay (sandbox while testing)
          │  4. POST /hitpay  ← HitPay webhook (HMAC checked) → create the booking in SimplyBook (admin API)
          │                    → Vale/Atlas mirror block created in the same step
          ▼
        SimplyBook stays the calendar: staff app alerts, guest confirmation e-mails, existing reports.
```
Secrets (HitPay API key + salt, SimplyBook admin user API key) live only as Worker secrets – never in page code.

## Prices (all in the Worker, one table)
- Base 3 h: Off-peak Mon–Thu / Peak Fri–Sun & PH, per room type; Early Bird $35 at 11:00 only.
- Extensions: Off-peak/Peak use today's discounted add-on prices; Early Bird = day rate ÷ 3 per hour, no discount.
- PH list kept in the Worker (one line per date).

## Safety
- Slot re-checked at hold time and again before booking; if taken after payment → auto-refund via HitPay + staff alert.
- Holds expire after 10 min (same as today's SimplyBook payment timer).
- Mirror block: booking Vale blocks Atlas for the same time and vice-versa, for every service (no hard-coded service list).
  The old Make scenario keeps covering bookings made directly in SimplyBook / WhatsApp until switch-over.

## Steps
1. ✅ Cloudflare account + connector; test worker `round2-book` deployed.
2. HitPay sandbox keys → Worker secrets. SimplyBook admin API user key → Worker secret.
3. Worker: /quote, /hold, /hitpay webhook, booking create, mirror block. Tested with sandbox cards + a hidden test service.
4. Booking page on `own-booking` branch (built from the availability board).
5. Phone run-through with both owners → decide switch-over.

## Done 30 Oct
- Worker secrets: HITPAY_KEY, HITPAY_SALT, HITPAY_API (sandbox), SB_COMPANY, SB_USER, SB_PASS.
- SimplyBook login copies the Make room-blocking scenario exactly:
  `POST user-api.simplybook.asia/login/ getUserToken [company, user, pass]` →
  `POST /admin` with headers `X-Company-Login`, `X-User-Token`; booking = `book [eventId, unitId, clientId, startDate, startTime, endDate, endTime, 0, {intakeField: value}]`.
  `/selftest` on the Worker logs in and lists rooms – passed.
- Public holidays: Google's public SG calendar (`en.singapore#holiday`), entries whose description starts "Public holiday"
  (includes "Day off for …" / "… observed" in-lieu days). Mon–Thu PH → peak. Plus a manual extra list for in-lieu days Google adds late.

## Test build deployed 30 Oct (DRY_RUN = 1 → pays in HitPay sandbox, does NOT write to SimplyBook)
Code: `worker/round2-book.js` (deployed by pasting into Cloudflare via the Cloudflare MCP; KV `round2-book-holds`).
- `/test` – simple phone form (room, date, 15-min start, 3–6 h, guest details → HitPay sandbox checkout).
- `/quote` – price + free check. Prices come from the PRICES table at the top of `worker/round2-book.js` (not SimplyBook) – edit there. Early Bird = 11:00 start, $35 + its own extension rates (default day rate ÷ 3 per hour).
  Checked: Vale Tue 3 Nov 15:30 4h = 49 + 16.30; Max Fri 6 Nov 11:00 4h = 35 + 43; Kai Mon 9 Nov (Deepavali in lieu) 11:00 6h = 35 + 99; Bella Thu 16:00 6h = 79 + 47.40.
- `/checkout` – re-checks the slot, then holds it for **10 min** in the `HoldBook` Durable Object (one strongly-consistent store, so two guests
  can never hold the same time; Vale/Atlas holds block each other), then creates the HitPay payment request.
- Hold release (fixes "paid but not in SimplyBook" / double bookings caused by SimplyBook timing out while guests type card details):
  1. guest taps back / "Change booking" / returns from HitPay unpaid → `/release` frees the slot at once;
  2. same phone or email starting a new checkout → their old hold is dropped;
  3. hold is 10 min (same as the old SimplyBook timer);
  4. whenever a hold ends (timer alarm, release, replaced) its **HitPay link is cancelled** (DELETE /payment-requests/{id}) – verified: link shows 404;
  5. the page shows a countdown "We're holding this for you for 9:59" with the Pay button.
- `claim()` in HoldBook lets only the first of webhook/redirect create the SimplyBook booking (no double booking from both firing).
- `/done?ref=` – HitPay redirect; confirms payment with HitPay, then finalize (once).
- `/hitpay` – webhook (Hitpay-Signature = HMAC-SHA256 of raw body with salt). Register in HitPay sandbox: Developers › Webhook Endpoints › `https://round2-book.donttelldadyet.workers.dev/hitpay`, event `payment_request.completed`.
- finalize (when DRY_RUN off): admin `getClientList(email,1)` / `addClient`, then `book(...)` with the pax intake field.
  The Make room-blocking scenario still mirrors Vale↔Atlas for services 28/29/32 and 33/35/37 – the Worker books on those same services.

## Guest board (slots/index.html on this branch)
Preview: https://raw.githack.com/donttelldadyet-prog/round2sg-home/own-booking/slots/index.html
- Reads `/day?date=` from the Worker: per room, free starts in 15-min steps, longest stay (max 6 h) and price per length.
  Free time = SimplyBook gaps of the day's service ∪ the Early Bird service (off-peak/peak open at 11:15, Early Bird owns 11:00), minus holds.
- Flow: day → room → start → length (lengths that don't fit are greyed) → details (remembered on the phone) → HOLD & PAY
  (countdown + Pay) → HitPay → back. Back button / Change booking / timer → slot released. No SimplyBook widget, no SimplyBook key on the page.
- `slots/book.html` (SimplyBook widget step) removed.

## Open questions before going live
- Does admin `book()` accept an end time past 3 h (extensions) on these services? Test with one real booking on a quiet far-off date, then cancel.
- SimplyBook's booking price stays the service price; the HitPay amount is the real total – put the paid amount in the booking comment.
- Staff alert when "paid but slot taken" (Telegram, like the room-menu scenarios).

## Later
- Optional: a separate SimplyBook user for the Worker (the shared login also sits in the Make scenario).

## Failsafe: paid must always mean booked (3 Nov 2026)
Why: Denzel (ref R2BAD1CAE9AF, Bella early bird 3 Nov) paid $35 but got no booking – he typed `gmail.con`, SimplyBook refused the
contact, the "needs a human" alert went to a Telegram group that was never set up, and the page still said "You're booked!".
Now:
- **Before payment** (checkout): obvious email typos are refused ("did you mean …@gmail.com?", `MAIL_FIX`), and the SimplyBook
  contact is made then (`sbContact`). If SimplyBook won't take the details, the guest is told and **pays nothing**.
- **After payment** (`finalize`), in order: the contact from checkout → make it now → typo-fixed email → their existing contact (by
  email, then phone) → the shared "Round2 online guest" contact → `book` (tried twice) → **last resort: a time-blocked calendar
  note** (name, pax, PAID $, ref, phone, email; twin room blocked too). Any fallback is recorded in `done.fallback`.
- **The guest's page** only says "You're booked!" when it really is (a note counts – the room is held). Still working → "Confirming
  your booking…" (refreshes). Failed → "Payment received … our team will WhatsApp you", with the ref.
- **Needs a human** (`humanAlert`): push to every phone with alerts on, a red card on the control centre's Home (gm `human`,
  "Sorted ✓"), and Telegram if `STAFF_CHAT` is ever set. Sent for: not booked, booked by a fallback, guest email refused.
- Staff tools (gm, staff code): `holdinfo` (one ref, read only), `holdproblems` (last N days).
- **Root cause, confirmed 3 Nov** (gm `sbdiag`, a real retry with Denzel's details): SimplyBook answered `addClient: Client email
  value is wrong` both without an email and with `@gmail.con`; with `@gmail.com` it was accepted at once (contact 3175). All 19 other
  online bookings since 31 Oct also needed the email (SimplyBook never takes a contact without one), so the "contact without email
  first" step always falls through to the normal way. SimplyBook checks that the email is well-formed with a real ending – it does
  not check the mailbox exists – so any provider (company domains too) works, and whatever SimplyBook refuses is now caught before
  payment. SimplyBook's own error messages are now kept (`done.fallback`, checkout log).
- **Tested end to end 3 Nov** (sandbox, Atlas Tue 5 Jan 2027, gm `testbook` – runs the after-payment steps on sandbox holds only;
  `fail=book` / `fail=book,note` make SimplyBook "refuse" on purpose; `do=cleanup` cancels the booking / deletes the notes):
  typo email, made-up email ending (SimplyBook refused → told before paying, hold let go), bad phone, no name, broken email →
  all stopped before payment with a clear message. Normal booking ✓ (twice = still one booking). Booking refused → note on Atlas
  + twin Vale ✓, page says "We'll WhatsApp you". Note refused too → "Payment received… we'll WhatsApp you" page + red alert ✓.
  Found and fixed: vague message for a broken email / no name; "confirmation email is on its way" on a note-only booking;
  `confirmBooking` doesn't exist for our SimplyBook account (bookings are confirmed already) – the call is gone.
- **The 10-minute gap is closed (3 Nov):** while a guest pays, the room and its twin are blocked in SimplyBook with a time-blocked
  note `SYSTEM BLOCK · ONLINE HOLD · a guest is paying for <room> right now · ref … · removed automatically` (`holdNotesMake`).
  It goes: the moment they pay (just before the real booking), when they come back without paying (/release, /done), when the
  hold runs out (the hold book's alarm), and a 10-minute sweep (`holdSweep`) catches any left behind. The same guest picking again
  lets their old hold + block go first. Because it says SYSTEM BLOCK, In session / Tonight / Auto wrap-up / 1-hour alert / guest
  links / Late session list / after-midnight markers skip it; Late session and +1h clash checks show "online guest paying (held
  ~10 min)"; a twin's hold is never deleted along with a late session. Tested live in sandbox (Atlas, 5 Jan 2027): blocked in
  SimplyBook for Atlas + Vale, other guests and staff refused, block gone on pay (real booking made), on leave, on picking again.
- **Cut short in SimplyBook (3 Nov, Andrew L, Vale 5 h):** moving an online booking's time in SimplyBook resets it to the service's
  standard 3 h. `paidLengthCheck` runs on every SimplyBook change: an online booking shorter than what was paid → every phone + a
  red card ("set the SimplyBook end to …"); put right → the card ticks itself off. Auto wrap-up also looks again ~2–5 min after
  any SimplyBook change (kv `autoAgain`, 5-min tick). Tested in sandbox (gm testbook do=length): cut to 3 h → card; back to 5 h → ✓.
