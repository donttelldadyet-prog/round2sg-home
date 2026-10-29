# Round2 own booking page – plan (test build)

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

## Open questions before going live
- Does admin `book()` accept an end time past 3 h (extensions) on these services? Test with one real booking on a quiet far-off date, then cancel.
- SimplyBook's booking price stays the service price; the HitPay amount is the real total – put the paid amount in the booking comment.
- Staff alert when "paid but slot taken" (Telegram, like the room-menu scenarios).

## Later
- Optional: a separate SimplyBook user for the Worker (the shared login also sits in the Make scenario).
