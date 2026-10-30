# round2sg-home

The Round2 game-screen homepage, embedded on www.round2.sg through Wix "Embed HTML → Website address".

- Homepage: `https://donttelldadyet-prog.github.io/round2sg-home/`
- Book now page: `...?start=book`
- Contact us page: `...?start=find`
- Also available: `?start=rooms`, `?start=loadout`, `?start=how`
- Help popup tabs: `?start=faq`, `?start=rules`, `?start=about`, `?start=privacy`
- A specific room: `?room=vale` (kaeden, scarlett, bella, kai, atlas, maximillion)

Media (videos, images) is served from Wix Media; this repo only holds the page itself.

## Visitor stats (branch `site-stats`, not merged yet)

The last `<script>` in `index.html` counts what visitors do in the menu (screens, rooms, booking form steps, WhatsApp/Telegram clicks)
and who's on it right now, and saves only numbers to the Round2 Firebase database under `/web`. The control centre's Website tab shows them.
Full explanation, data layout and the one-time Firebase rule: `docs/site-stats.md` in **round2-tv-launcher**.
Turn it off for one load with `?notrack`. It never blocks or changes the page.

## How Round2's automation fits together (read first) – updated 30 Oct 2026

**Rule: Cloudflare first, Make.com last.** Make has a hard monthly budget (10,000 operations, shared by everything), so
nothing that runs often, polls, or waits may live in Make. Anything fast or frequent runs in the **Round2 engine on
Cloudflare** (free, instant). Make only does the few jobs that need its Google connections, and only when something real
happened (a paid order). Pages must never poll Make, and Make webhook addresses must not appear in public pages – they
go through the engine.

**The Round2 engine** = Cloudflare Worker `round2-book` (`https://round2-book.donttelldadyet.workers.dev`), source
`worker/round2-book.js` in **round2sg-home** . One Durable Object (`HoldBook`) holds its
state (SQLite) and wakes itself with alarms. Deploy = upload that file through the Cloudflare API with `keep_bindings`
(see round2sg-home `HANDOFF.md`). Secrets live only in Cloudflare (names: `HITPAY_KEY`, `HITPAY_SALT`, `HITPAY_API` (sandbox), `HITPAY_LIVE_KEY`, `HITPAY_LIVE_SALT`, `TEST_CODE`, `SWITCH_PASS`, `SWITCH_PIN`,
`SB_COMPANY`, `SB_USER`, `SB_PASS`, `GM_STAFF`, `GM_HOOK_URL`, `MENU_MAKE_K`, `TV_KEY`, `TG_BOT_TOKEN`, `STAFF_CHAT`).

| Job | Where it runs | Notes |
|---|---|---|
| Booking page (`slots/`): free times, prices, holds, HitPay, writing into SimplyBook | Engine | SimplyBook is the calendar. Bookings end 15 min after the session (cleaning) – `docs/booking-times.md` |
| Room food menu (`menu/`): pricing check, HitPay payment, payment check | Engine | Guests pay live (once `HITPAY_LIVE_*` are in), test tools always the sandbox – same as bookings |
| Food order → room TV alert + kitchen Telegram slip | Engine | Instantly after payment |
| Food order → accounting sheet + Drive slip (kitchen phone prints it) | Make `[BACKEND] ROOM MENU PAID ORDER` | Called once per paid order by the engine |
| Telegram pickup button, Madd nightly settlement | Make (`[CONTROL] MADD PAYOUT TELEGRAM`, `[BACKEND] MADD NIGHTLY SETTLEMENT LOG`) | |
| Guest/Round2 TV messages: every page talks to the engine's `/gm` front door | Engine → Make `[BACKEND] GUEST MESSAGE LINKS` | Engine checks codes, caches, caps edits; Make keeps the message records |
| Message timer (send each message to its TV on time) | Engine (alarm, 1 min before) | Make's old 15-min timer is OFF |
| Vale ↔ Atlas mirror bookings | Make `[BACKEND] SYSTEM BLOCKS MIRROR ROOMS` | Runs only on SimplyBook changes |
| TVs ⇄ control centre (messages, OKs, food alerts, website stats) | Firebase Realtime Database | Pages listen live (EventSource); no Make |

Docs: round2-tv-launcher `docs/guest-messages.md` (front door, timer), `docs/booking-times.md`, `docs/site-stats.md`;
round2sg-home `HANDOFF.md`, `docs/own-booking-plan.md`.

## Own booking system (`slots/` + `worker/`) – live since 30 Oct 2026
Start with [HANDOFF.md](HANDOFF.md) – status, how to deploy, open to-dos and the owners' decisions.
