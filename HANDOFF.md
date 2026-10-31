**LIVE since 30 Oct 2026, on `main`.** Work on `main` from now on (the `own-booking` branch is merged and retired). The website's Book screen loads `slots/?embed=1` inside itself; payment opens in a new tab.

> ## Guest links are on round2.sg (DONE 31 Oct 2026) – never put "donttelldadyet" in anything guests see
> - **book.round2.sg** (repo `round2-book`, GitHub Pages): shows the engine's guest pages (`/done?ref=…`, `/find`, `/b/<code>`) inside a
>   full-page frame. HitPay sends guests back to `book.round2.sg/done?ref=…` (worker `PUBLIC_BOOK`). The engine's pages post their path to
>   the frame so the address bar follows, and open outside links (WhatsApp, cue.round2.sg, round2.sg) outside the frame.
> - **menu.round2.sg** (repo `round2-menu`): loads `round2sg-home/menu/` and runs it as the whole page (no frame, HitPay opens normally).
>   `menu.round2.sg/vale` = `?room=vale`. HitPay returns food orders there (worker `MENU_RETURN = PUBLIC_MENU`). The menu itself is still
>   edited ONLY in round2sg-home `menu/` (and `menu/admin.html`).
> - **cue.round2.sg** (repo `round2-cue`): TV message links (unchanged).
> - DNS stays in **Wix** (Domains › round2.sg › Manage DNS): CNAMEs `book`, `menu`, `cue` → `donttelldadyet-prog.github.io`. Domain is
>   registered at **Vodien**; the only round2.sg email is hello@round2.sg – don't touch its records. No Cloudflare DNS move needed.
> - Engine API calls and webhooks (HitPay `/hitpay`, SimplyBook `/sb/notify`, `/gm`, `/day`…) stay on `workers.dev` – guests never see them.
>   Old `workers.dev` / `github.io` links keep working.
> - **Still to do:** owner points each room's Wix links page (valelinks etc.) food button at `https://menu.round2.sg/<room>`;
>   SimplyBook's confirmation-email line (control centre › Systems, "Confirmation email link") should use `https://book.round2.sg/b/<code>`;
>   one real sandbox test booking + food order via the Test bench to see the return pages on the new addresses.

# HANDOFF – Round2 own booking system (read this first)

Last session: 30 Oct 2026, ~6:30am SGT (co-owner who handles WhatsApp bookings). Branch: **`own-booking`** in `round2sg-home`.
Nothing here is live for guests yet. Detailed notes: `docs/own-booking-plan.md`, `docs/simplybook-early-bird.md`.
Working rule from the owners: work on your own branch, never merge without approval, leave a handoff note.

## What it is
Guests book on our own page instead of the SimplyBook widget:
`slots/index.html` (board) → **Cloudflare Worker `round2-book`** (`worker/round2-book.js`) → HitPay → booking written into SimplyBook.
- URL of the engine: `https://round2-book.donttelldadyet.workers.dev` (`/day`, `/quote`, `/checkout`, `/release`, `/done`, `/hitpay`, `/test`, `/selftest`, `/ph`).
- Board preview: `https://raw.githack.com/donttelldadyet-prog/round2sg-home/own-booking/slots/index.html`
- Cloudflare account: the Round2 Google login (donttelldadyet). Deploy = upload `worker/round2-book.js` via the Cloudflare API MCP
  (`PUT /accounts/{id}/workers/scripts/round2-book`, multipart, `keep_bindings: [secret_text, kv_namespace, plain_text, durable_object_namespace]`).
  The repo file is the source of truth – commit first, then deploy the same file.
- Secrets in the Worker: `HITPAY_KEY`, `HITPAY_SALT`, `HITPAY_API` (all **sandbox** now), `SB_COMPANY`, `SB_USER`, `SB_PASS`
  (SimplyBook user "Booking Bot", made for this). Vars: `DRY_RUN=1`, `SB_PUBLIC_KEY`. Durable Object `HOLDBOOK` (class `HoldBook`) holds unpaid slots.

## Status
Done and tested (sandbox):
- Own price table `PRICES` at the top of the Worker (NOT read from SimplyBook). Early Bird = 11:00 start, $35 + day rate ÷ 3 per extra hour.
- Peak = Fri–Sun + Singapore public holidays incl. in-lieu days (Google public holiday calendar; `EXTRA_PH` for days Google adds late).
- Free time = SimplyBook gaps of the day's service ∪ Early Bird service (off-peak/peak open 11:15; Early Bird owns 11:00), minus our holds.
- 10-min hold in a Durable Object (no two guests can hold the same time; Vale/Atlas holds block each other).
  Released on back button / "Change booking" / unpaid return / same phone-or-email starting again / timer. HitPay link is cancelled whenever a hold ends.
- Only the first of webhook/redirect creates the booking (`claim()`).
- `DRY_RUN=1`: after payment it does NOT write to SimplyBook yet – it records what it would book.

Not done (in order):
1. **One real booking test with the owner** (`DRY_RUN=0`): does admin `book()` accept end times past 3 h (extensions)? Use a quiet far-off date, then cancel.
2. Write the paid amount + "booked online" in the SimplyBook booking note (SimplyBook will show the base service price).
3. Staff alert (Telegram, like the room-menu scenarios) when a payment couldn't be booked ("refund needed").
4. HitPay sandbox webhook: Developers › Webhook Endpoints › `…workers.dev/hitpay`, event `payment_request.completed` (owner may have done this – check).
5. Board design changes the owner asked for (below).
6. Go-live: owner pastes the live HitPay key/salt into `HITPAY_LIVE_KEY` / `HITPAY_LIVE_SALT` (the sandbox ones stay in `HITPAY_KEY` / `HITPAY_SALT` / `HITPAY_API`), put the board behind the menu's Book button, merge only on approval.

## Payments: live for guests, sandbox for tests – no switch (30 Oct, owner's decision)
- Two HitPay accounts in Cloudflare: sandbox `HITPAY_KEY`/`HITPAY_SALT`/`HITPAY_API`, live `HITPAY_LIVE_KEY`/`HITPAY_LIVE_SALT`.
- Guests always pay live once the live key is in (before that everything is sandbox). Test tools send `TEST_CODE`
  (= the menu's sim code) → that one request uses the sandbox: booking page `?test=CODE` (control centre › Systems › Test
  bench), menu `?sim=CODE` + "Full flow: HitPay sandbox". Each hold/order stores `pay` and is checked/cancelled with those keys.
- Safe mode (control centre › Systems › Switches, needs `SWITCH_PASS` + `SWITCH_PIN`): the booking page shows the SimplyBook
  widget embedded instead, and the engine refuses new holds.

## Food menu payment via Cloudflare (30 Oct) – ONE HitPay setting for booking + menu (superseded by the section above for which keys)
The engine's secrets `HITPAY_KEY` / `HITPAY_SALT` / `HITPAY_API` are used by BOTH the booking page and the room menu (sandbox now;
put the live account's values in those three to take both live together). `menu/index.html` (on main) posts to `/menu/checkout`
(re-prices from menu.json like the old Make checkout, keeps the order in the engine, creates the HitPay payment with webhook
`/menu/hitpay`). `/menu/hitpay` and `/menu/return` ask HitPay whether it's paid, then once POST `order`, `details`, `k` (secret
`MENU_MAKE_K`) to Make's [BACKEND] ROOM MENU PAID ORDER, which now reads those instead of its data store + HitPay (filter on `k`)
and does the Drive slip (the kitchen phone syncs that folder and prints it) and the accounting sheet. The engine itself sends the
TV alert (secret `TV_KEY`) and the kitchen Telegram slip (secret `TG_BOT_TOKEN`; until it's set, Make still sends the slip –
Make skips each when the engine says `tv`/`tg` = sent). Pickup-button presses still go to Make's [CONTROL] MADD PAYOUT TELEGRAM. Sandbox orders go with base 0 → slip says
"TEST PAYMENT - DO NOT MAKE", sheet says TEST. Make's ROOM MENU CHECKOUT is switched off (not needed).
Guest messages: all pages go through `/gm` (front door) and the timer is the engine's alarm – see round2-tv-launcher docs/guest-messages.md.

## Booking times – read docs/booking-times.md (30 Oct)
A SimplyBook booking's end = the guest's session end **+ 15 min cleaning** (that's how SimplyBook's own bookings look: 11:00–14:15 for 3 h).
Since 30 Oct the engine books the same way and notes "Guest session HH:MM–HH:MM" in the booking comment. Anything guest-facing
("10 minutes left", "That's a wrap", receipts) uses the SESSION end, before the cleaning time. The engine also confirms each booking
(SimplyBook's own guest bookings are confirmed) and logs in as hello@round2.sg (set 30 Oct) – both to get staff push notifications; not yet re-tested.

## Owner's design feedback (30 Oct) – DONE 30 Oct afternoon (slots/index.html): tier boxes, Early Bird chip (and 'taken'), hour lines, BY ROOM / BY TIME / EARLIEST views
- Early Bird bar is a thin sliver (it's one start time). Show it as its own clear block/chip ("Early bird 11am") that's easy to see.
- Make the bars nicer in the Round2 theme and make different times easier to tell apart (tick marks, hour labels, tier colours).
- If Early Bird is taken, show it clearly (e.g. greyed "Early bird taken") – today you can't tell at a glance.
- Offer more than one view for different guests, e.g. **by time** ("what's free at 8pm?"), **by room** (current bars), **earliest available**.
- Group by tier in boxed, colour-coded sections and say which rooms are in each: Netflix (Vale, Kaeden, Scarlett), Deluxe (Kai, Bella, Atlas), VIP (Maximillion).

## Answers to the owner's questions (so you don't re-ask)
- **Is it dependent on SimplyBook?** Yes, as the calendar/database: free times are read live from SimplyBook, paid bookings are written into it,
  and SimplyBook keeps sending staff app alerts and guest confirmation emails. Prices, holds, payment and the guest page are ours.
- **If we edit/move/cancel a booking in SimplyBook, does the board follow?** Yes – the board asks SimplyBook for free time every time it loads.
- **Vale/Atlas (Atlas is above Vale, wooden floor):** before payment, our system holds BOTH rooms in its own hold store only (nothing written
  to SimplyBook), so it can't clash with Make. After payment the booking is written to SimplyBook on the normal services (28/29/32 Netflix,
  33/35/37 Deluxe) and the existing Make scenario "[BACKEND] SYSTEM BLOCKS MIRROR ROOMS" (id 6990225) blocks the other room as today.
  That scenario hard-codes service ids – any new service must be added there. If mirroring is ever moved into the Worker, turn that Make branch off first.

## Decision 30 Oct: Early Bird extensions WITHOUT new SimplyBook services
The Worker books Early Bird on the existing live services 32/33/34 with an explicit end time (e.g. 11:00–15:00 for 3 h + 1 h),
the same way the Make mirror scenario creates its blocker bookings (admin `book()` with start AND end, no payment step).
Make already mirrors 32 (Vale) and 33 (Atlas) and copies the booking's start/end, so the extended time is blocked too.
So the hidden services 39–44 and add-ons 38–55 are NOT needed – leave hidden, delete later with the owner.
To confirm in to-do #1 (real test booking): SimplyBook accepts the longer end time on 32/33/34.

## Related, already live
- Guest TV messages + control centre (repo `round2-tv-launcher`, Make scenarios 8249444/8251356, `cue.round2.sg`), site stats in Firebase `/web`.
- Hidden SimplyBook Early Bird services 39–44 + add-ons 38–55 exist but were NOT switched on (guest page ignored the 11:00 fixed time).
  Old Early Bird 32/33/34 are live as before. See `docs/simplybook-early-bird.md`.

## SimplyBook callback goes through the engine (30 Oct 2026)
SimplyBook's callback URL (Custom features › API) should be `https://round2-book.donttelldadyet.workers.dev/sb/notify/<SB_NOTIFY_KEY>`
(the full address is with the owner; the key is a Cloudflare secret). The engine passes every callback on unchanged to Make's
"[BACKEND] SYSTEM BLOCKS MIRROR ROOMS" (secret `MIRROR_HOOK_URL`), then: cancelled → the online booking drops off "View your
booking" and its pages say "cancelled"; any create/change/cancel → guest messages follow their booking straight away.
The engine's own SimplyBook check is now only a 6-hour backstop plus a check right before each message shows.
"View your booking" also asks SimplyBook for cancellations when a guest searches, so bookings cancelled before this existed
don't show either. To undo: put the Make address (hook.eu1.make.com/qqeq…) back as SimplyBook's callback URL.

## Room food menu: how guests get to it (owner's plan, 31 Oct 2026)
Each room has its own QR code. It opens that room's links page on Wix (e.g. **round2.sg/valelinks**), whose food-menu button
must open the menu **already set to that room**: `https://menu.round2.sg/vale` (same as `https://menu.round2.sg/?room=vale`)
(`kaeden`, `scarlett`, `bella`, `kai`, `atlas`, `max`/`maximillion`). With `?room=` the menu shows in that room's
character colour, is locked to that room (guests can't switch rooms; only test mode `?sim=` can), and the room goes with
the order all the way through: the room TV's "order locked in" alert, the kitchen Telegram slip and the Drive slip that
the kitchen phone prints. Madd Pizza staples that printed slip to the food bag and **drops the bag off on the rack outside
the Round2 entrance** (the shoe rack) – nobody brings food to the room. The TV alert and the menu's thank-you page tell the
guest to collect it there; the room name on the slip is how guests (and staff) find the right bag. Never describe Round2
food as "delivered to your room" (website, blog, menu, TV). Without `?room=` the menu can be browsed but not ordered from ("scan the QR code in your room").
Check each room's Wix links page uses its own `?room=` before printing QR codes.
