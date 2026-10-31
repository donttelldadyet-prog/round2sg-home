**LIVE since 30 Oct 2026, on `main`.** Work on `main` from now on (the `own-booking` branch is merged and retired). The website's Book screen loads `slots/?embed=1` inside itself; payment opens in a new tab.

> ## ⚠️ TO DO (owner, 31 Oct 2026): guest links on round2.sg addresses – no "donttelldadyet" in anything guests see
> Guests still see the GitHub/Cloudflare names in: the **room food menu** (QR → `donttelldadyet-prog.github.io/round2sg-home/menu/?room=…`),
> the **booking confirmation page** after paying (`round2-book.donttelldadyet.workers.dev/done?ref=…`), **"View your booking"**
> (`…workers.dev/find`, `/b/<code>`) and the **TV message pages** behind guest links. (`cue.round2.sg` message links are already done.)
> Plan (not started; status in control centre › Systems, round2-tv-launcher `manager/systems.json`):
> 1. **Pages on GitHub** (menu, and anything else guests open from round2sg-home) → a round2.sg subdomain, e.g. `menu.round2.sg`
>    or `go.round2.sg`, like `cue.round2.sg` (round2-tv-launcher `cue/README.md`): CNAME record in Wix › Domains › Manage DNS
>    → `donttelldadyet-prog.github.io`. A custom domain moves the WHOLE repo, so either give round2sg-home its own subdomain
>    (GitHub redirects the old github.io links, so printed QR codes keep working – but re-test the Wix-embedded homepage, the
>    Book screen iframe, the engine's `MENU_JSON` / `MENU_RETURN`, and anything the TVs load) or publish only the guest pages from
>    a small separate repo, as cue did.
> 2. **Engine pages** (`/done`, `/find`, `/b/`, `/gm`, `/menu/return`) → e.g. `book.round2.sg` as a Cloudflare Workers custom domain.
>    That needs round2.sg's DNS on Cloudflare (free plan). Domain is registered at **Vodien**; DNS is currently managed in **Wix**.
>    Moving it = add round2.sg to Cloudflare, copy EVERY existing record from Wix (www/root for the Wix site, `cue`, and the
>    **MX/SPF/DKIM records for hello@round2.sg** – the only round2.sg email; SimplyBook's engine login also uses it), then change
>    the nameservers at Vodien. Check email still arrives before and after. Do it on a quiet morning with the owner.
>    Webhooks guests never see (HitPay `/hitpay`, SimplyBook `/sb/notify`) can stay on `workers.dev`.
> 3. Then switch every guest-facing address to the new ones: `slots/index.html` (ENGINE, "View your booking"), `menu/index.html`
>    (CHECKOUT_URL, PAID_URL), the worker (`origin` used in HitPay `redirect_url`, `MENU_RETURN`, guest message links), the Wix room
>    links pages (valelinks etc.), the SimplyBook confirmation email line, and the control centre `PUBLIC`/`shareUrl`.
>    Keep the old addresses working (HitPay payments already in flight, old QR codes, old emails).

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
must open the menu **already set to that room**: `https://donttelldadyet-prog.github.io/round2sg-home/menu/?room=vale`
(`kaeden`, `scarlett`, `bella`, `kai`, `atlas`, `max`/`maximillion`). With `?room=` the menu shows in that room's
character colour, is locked to that room (guests can't switch rooms; only test mode `?sim=` can), and the room goes with
the order all the way through: the room TV's "order locked in" alert, the kitchen Telegram slip and the Drive slip that
the kitchen phone prints. Madd Pizza staples that printed slip to the food bag and **drops the bag off on the rack outside
the Round2 entrance** (the shoe rack) – nobody brings food to the room. The TV alert and the menu's thank-you page tell the
guest to collect it there; the room name on the slip is how guests (and staff) find the right bag. Never describe Round2
food as "delivered to your room" (website, blog, menu, TV). Without `?room=` the menu can be browsed but not ordered from ("scan the QR code in your room").
Check each room's Wix links page uses its own `?room=` before printing QR codes.
