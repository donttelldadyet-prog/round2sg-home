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

## Needs from owners
- HitPay **sandbox**: API key + salt (Settings › Payment gateway › API keys).
- SimplyBook: Settings › API › admin "Secret key" is not needed – the Worker logs in with an admin user's login/password (store as secret) – pick which admin user.
- PH dates for 2026–2027.
