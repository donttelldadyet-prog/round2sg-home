**LIVE since 30 Oct 2026, on `main`.** Work on `main` from now on (the `own-booking` branch is merged and retired). The website's Book screen loads `slots/?embed=1` inside itself; payment opens in a new tab.

> ## 16 Nov 2026, ~4:40pm – engine a912159 DEPLOYED (27 bindings, 3 timers): ONE SIMPLYBOOK CONTACT PER MOBILE NUMBER
> - Owner: "register contact using phone number and name… if they rebook and provide their email we replace the placeholder…
>   our contact list stays unique with that person and contact number". Chose: rename to the newest name; online + Add a session.
> - `sbContact` (both checkout-before-payment and Add a session): `getClientList(<last 8 digits>, 25)` → newest contact whose phone
>   ends in those 8 digits (never SYS_CLIENTS / "Round2 online guest") → `editClient` name + phone + email (real one typed, else
>   keep its email, else `phEmail`); if the real email is refused (already on another contact) → reuse keeping its email. None →
>   `addClient` with the real email or `noemail.<8 digits>.<4>@example.com`. The no-email-first "late" attempt is gone (this
>   account always refused it). REPLACES the 3 Nov rule "every booking its own contact, never reuse". Old numbers may have several
>   contacts from before – the newest is used, the rest are left alone.

> ## 16 Nov 2026, ~5pm – engine a5bfcc5 DEPLOYED (27 bindings, 3 timers): NO EMAIL = STILL A REAL BOOKING; NOTES USE THE 4-BOX PAGE
> - Owner: "why is it still showing the old page type? then how can they reschedule themselves" + "just give a random placeholder
>   email that lets the function through… I don't want to be notified". Add a session: no email / bad email → `sbEmail` =
>   `noemail.<10 hex>@example.com` (never delivers; SimplyBook's own email goes nowhere). Stored nowhere else (`gEmail` ''; record
>   `standIn: true`; SimplyBook comment says "no email (stand-in …)"). `plan.standIn` / `plan.badEmail`, result `standIn`. So daytime
>   sessions with a mobile are real bookings → `/b/<code>` → the 4-box page with self-rescheduling. Notes now only: late, odd
>   length, clash, no mobile, Change, refused.
> - Notes: `/c/<code>` now REDIRECTS to `/move?ref=<code>`; `gApi` → `noteApi` (empty calendar, `info.note`); move/index.html
>   `noteMode()`: no Paid row, no moves chips, Reschedule box disabled "Booked with our team – WhatsApp us", Receipt box → WhatsApp us,
>   TV message → `/c/<code>/tv`. The 3:49pm bookedPage version for notes is gone.
> - System check step 1 now expects no email → booking with placeholder. Owner's earlier rule (15 Nov: no email → note → shared
>   contact) is REPLACED by this.

> ## 16 Nov 2026, 3:49pm – engine 67e1073 DEPLOYED (27 bindings, 3 timers): NOTES GET A BOOKING LINK (owner: "why limit it to real SimplyBook bookings")
> - Add a session → saved as a note (no email, late, clash, Change…) now returns `link` = `book.round2.sg/c/<code>` (code `N` + 7).
>   DO kv `nconf:<code>` = {nid, day, unit, name, pax, phone, t, tv}, `nlink:<note id>` = code. `/c/<code>` (`notePage`) = the same
>   `bookedPage` ticket as online bookings (no "Paid" line, "WhatsApp us to change"), read LIVE from the note via `lateFind` (so +1h
>   and EXT follow; deleted note → "changed or cancelled – WhatsApp us"). `/c/<code>/tv` makes the guest's cue.round2.sg link on first
>   use and ties it to the note (`lPair {nid}`). Change keeps the code (`noteLinkMove`). `latelist` rows carry `link`; gm `latelink`
>   (id, day) makes one for older notes ("Get booking link" button). round2-book wrapper allows `/c/` (3fa4b3c).
> - Control centre (round2-tv-launcher d2a25eb): result card + list rows Copy link / WhatsApp it; System check step "Add a session (late,
>   3–5am)" now must get a `/c/` link and see it in the list. NOT yet run live (no staff code here) – run the System check.

> ## 15–16 Nov 2026 – website booking page (desktop), stats, reschedule page, PC toolkit finds the TVs (no engine change; live engine still 86ed06b)
> - **Booking page on desktop** (`slots/index.html`, `index.html`; mobile untouched – owner: "mobile view is fine"). One scroll bar
>   (the website's desktop stage is a fixed 1440×900 box scaled to the screen, so the booking frame must FILL its section –
>   `<r2-simplybook fill="1">`, never 100vh). Two columns from 900px: calendar left (sticky), rooms right; "2 · BROWSE BY" bar
>   (ROOM / START TIME / EARLIEST FREE) sticks while scrolling the rooms, desktop only. Lessons: a sticky bar shows a hairline of
>   the page under it unless it has an 8px background box-shadow above; the bottom padding must sit inside the right column
>   (`.colR`), not on `.wrap`, or the sticky parts slide up at the bottom of the page. "Already booked? View your booking" line
>   REMOVED everywhere (owner: guests get their link by email / after booking / from Add a session).
> - **Click sounds (Kai bamboo), desktop only** – real mouse devices only (`(min-width:900px) and (hover:hover) and (pointer:fine)`).
>   Owner said "sounds dont play"; the code was seen running on his machine, so: louder, booking frame allowed `autoplay`, and the
>   frame's address carries `&v=<10-minute number>` so a stale copy can't linger. **Owner has NOT confirmed they play now**, nor
>   that the sticky slide is gone – ask.
> - **Website stats:** `room_<name>` counts a room only when it is CHOSEN (Vale was inflated – Rooms opens on Vale). `deepRoom` keeps
>   ?room= links counting. round2-tv-launcher `docs/site-stats.md`.
> - **Reschedule page** (`move/index.html`, mobile): week arrows no longer drag the page down (cause: `scrollIntoView` on the hour
>   strip – use `scrollLeft` only) and the week now slides left/right (`wkSlide`, off for reduced-motion). Commit 21230d3.
> - **PC toolkit `connect <room>` uses the TV's own reported address** (round2-tv-launcher d7e7530 + e266f96, TV app **1.0.286**):
>   Android check-in (`helper`) now has `ip`; TV tile shows "ADB x.x.x.x:5555"; `round2tv.ps1 connect kai` reads Firebase with the
>   TV messages key (asked once on the PC, kept in its round2-tv folder as `tv-key` – never in chat), falls back to the Theme
>   manager address. NOT yet run on a real PC (no PowerShell in Claude's container). Kai updated to 1.0.286 (16 Nov 12:56am);
>   other Android TVs (Atlas 1.0.280, Max/Kaeden 1.0.278) not yet. Atlas: `connect usb` now also TRIES to open network debugging
>   (`adb tcpip 5555`) – untested, see round2-tv-launcher README "Atlas network debugging – TRIAL".
> - **How to read the TVs' versions without the owner's browser:** KV `diag:req` = `[{"action":"tvmsgs"}]` → `diag:res` (side
>   timer, minute 1/6/…) gives each room's `tv.v`, `tv.t`, `front`, `pw`. It does not pass `ip` through (add it with the next
>   engine change if wanted).
> - **16 Nov 4:30am, engine 4c1a117 DEPLOYED (27 bindings, 3 timers):** diag channel may read `ps4list` (KV `diag:req` =
>   `[{"action":"ps4list"}]`); one-off `oneoffLinks` and its side-lane call removed. (Live was 3832c29 from the other chat –
>   checked identical before patching.) First reading 4:31am: all 6 PS4s silent – Vale 1.1.13 last in ~1:44am, Kai 1.1.13 ~1:15am,
>   Max 1.1.8 ~10:35pm (ACC was running), Scarlett 1.1.10 ~7pm, Bella 1.1.9 ~3pm, Atlas helper 1.0.7 (!) ~1:45pm. Helpers stop in
>   rest mode, so the engine can't tell rest mode from off / jailbreak lost – only "last check-in".
>   4:38am owner: Kai's PS4 light is ORANGE → the 1:15am remote `/_rest` (other chat's wake test) really put it in rest mode.
> - **Still open:** System check NOT run since the 14–16 Nov engine changes (needs the staff code on the owner's device);
>   remove `oneoffLinks` + its side-lane call with the next engine change; Kai remote/helper options ON HOLD (launcher README);
>   unanswered: Atlas Home-6× rule + HomeGuard leftovers and "Send log" (branch `send-log`) for a next TV update; old alert
>   sign-up hGptkT drops itself ~18 Nov 1:40pm; SimplyBook request count was 7,680 on 13 Nov (guideline ~5,000) – only noted.

> ## 14 Nov 2026, 10:25am – ⚠️ the 5-minute timer's run hits the free plan's 50-outside-requests limit (engine 810c91d DEPLOYED, 27 bindings)
> - **What happened:** at 10:00 two of the four 1-hour reminders failed for EVERY phone: `failed Too many subrequests by single
>   Worker invocation` (KV `diag:push` › phones › last). One cron run = one invocation = 50 outside requests in all (SimplyBook
>   calls + every push to Apple). The new ~50 s re-send (runs in the DO) got them out 48 s and 112 s late.
> - **Fix:** alerts are now sent from INSIDE the DO (`pushAll` → `hb.pushRun` → `pushAllHere`; the cron's re-send backstop too,
>   `pushRetryRun`) – each has its own allowance. Falls back to sending from the caller if the DO call fails.
> - **Measured and eased (engine 6afa1f9 DEPLOYED 12:37pm, 27 bindings):** every outside request is now counted
>   (`NET`, a wrapper round `fetch`) and each cron run's total is kept in DO kv `cronNet` {last, max of 24 h, fails} – read it with
>   gm `cronnet` (also allowed over the KV `diag:req` channel). First reading: the :40 run with the week-ahead noise sweep AND the
>   after-midnight notes = **24** (7 Firebase + 17 SimplyBook). So 10:00 was ≈ 24 + ~10 reminder look-ups + 20 pushes > 50.
>   Heavy sweeps are now OFF minutes 0 and 30 (week-ahead noise :40, after-midnight notes :10/:40), alerts are out of the cron's
>   allowance, and a reminder whose SimplyBook read failed is retried on the next 5-min tick (`soonAgain`). Each job is still
>   wrapped in `go(…catch)`, so a refused request fails silently – `cronNet.fails` is where it shows.
> - **1:15pm, first real alerts through the DO (2 reminders):** all 5 phones `ok`, no "topic refused" – Apple accepts `Topic`.
>   Shown: one phone +1–3 s, one +57–60 s (first re-send), one +235 s (second re-send). So re-sends now come about every minute
>   at first (`PUSH_RETRY_GAPS` 50 s, 2, 3, 4½, 9 min; engine deployed 1:28pm, 27 bindings).
> - **2:08pm, engine 774e2cf DEPLOYED (27 bindings): silent sign-ups clear themselves** (owner: yes). `pushPrune()` in the DO,
>   hourly at minute 25: a phone that signed up 7+ days ago and hasn't reported showing ANY alert for 7 days is deleted from
>   `push` – only while another phone reported in the last 2 days. Last report per phone = DO kv `pshown` (built from `pseen`).
>   The dropped row's choices stay 60 days in kv `pushDropped`; `/push/state` answers `{on:false, dropped, kinds}` and the
>   control centre signs that phone up again by itself at start-up (`Alerts.wake`). gm `pushsubs` now also returns `shown`,
>   `dropDays`, `dropped`. System check has a reading-only step for it. Docs: round2-tv-launcher `docs/staff-alerts.md`
>   (item 6, and a new plain-words section "How an alert travels").
> - **2:24pm, engine 9a10564 DEPLOYED (27 bindings) – THREE TIMERS** (owner: "lets try 1", with the PS4 save feature and the
>   other planned jobs in mind). Cloudflare › round2-book › Triggers now has 3 schedules; each fires its own run with its own
>   50 outside requests. `scheduled()` picks the lane from the scheduled minute:
>   - **now** `*/5 * * * *` – heartbeat (`cronLast`), 1-hour reminders (`soonRun`, + `soonAgain` retry), alert re-sends /
>     hourly prune / `diag:push` (all in the DO), `noiseAgain` / `autoAgain` rechecks; on the 10-min ticks tonight's calendar
>     work that shares one read of today + tomorrow: `autoRun`, `msgOrphans`, `waitWarn`, `holdSweep`, `noiseSync([t, t+1])`.
>   - **side** `1,6,11,16,21,26,31,36,41,46,51,56 * * * *` – TV OKs (7 Firebase reads), `paidSweep`, the paid-moves sweep,
>     `diagReq` (so a KV question is now answered at minute 1/6/…), `keyDaily`.
>   - **sweep** `3,13,23,33,43,53 * * * *` – `shadowSync` (:13, :43), noise rule days +2…+6 (:43, `'cron week'`), one far day
>     (:23, :53).
>   - Self-healing: "now" reads kv `cronNet.lanes`; if side hasn't run for 12 min / sweep for 25 min it does that lane's jobs
>     itself (exactly the old behaviour) and writes `fb: [...]` into its run record. So a deploy needs no order, and a deleted
>     trigger costs nothing but the shared allowance.
>   - Counters per lane: kv `cronNet` = {last, max, fails, limit, lanes: {now|side|sweep: {last, max}}} (gm / diag `cronnet`);
>     SimplyBook counter names the lane (`cron`, `cron side`, `cron sweep`). System check step "Background jobs: 3 timers…".
>   - **RULE for new background jobs** (PS4: daily prep from SimplyBook, parked-save expiry, version checks; membership renewal
>     reminders; Madd payout; food menu off Make): put them in **side** (no calendar) or **sweep** (calendar look-ahead), or give
>     them a **4th/5th timer** (5 per account on the free plan, 3 used) at a free minute (2/7 or 4/9) and a new lane name in
>     `scheduled()`. Never in "now" unless it needs tonight's calendar and is small. Things a PS4 helper or a page asks for
>     (`/ps4/…`, uploads to R2) are their own requests with their own allowance; R2/KV/DO calls count against a separate
>     1,000, not the 50. Still one budget to watch everywhere: SimplyBook's ~5,000 requests a day (the split re-reads tomorrow
>     twice an hour in sweep, about +100 a day).
>   - A script upload (deploy) does not touch the triggers; check `GET …/workers/scripts/round2-book/schedules` shows 3.
>   - First readings (2:31–2:46pm): new triggers took ~7 min to start firing (side first ran 2:31, sweep 2:33; until then "now"
>     covered, `fb` as designed). Outside requests per run: now 0–2 on its own (12 while covering for side), side 8 (7 Firebase +
>     1 HitPay), sweep 16 at :43 (the heaviest: after-midnight notes + 5 noise days). 0 refused. Not yet seen: a busy :00 with
>     several reminders. System check NOT run yet after today's engine changes (needs the staff code in a browser).
>   - Seen on the way (not fixed): SimplyBook requests today 4,469 by 2:30pm, yesterday 7,680 (guideline ~5,000). Biggest:
>     booking page `/day › getAvailableTimeIntervals` 1,162, cron 656, `gm late` (Add a session page) 523, `/mode` 252.
>   - Old sign-up hGptkT last showed an alert 11 Nov 1:40pm (owner re-added the app 1:45pm) → the prune takes it ~18 Nov 1:40pm.
> - **3:40pm, engine 8ded960 DEPLOYED (27 bindings, 3 timers) – DECLARATIVE WEB PUSH TRIAL on the owner's phone.** 3:30pm
>   Scarlett reminder: sent 15:30:16, phones showed it +3 s / +53 s / owner +115 s **as 3 copies** (original + 2 re-sends).
>   iPhones ignore the alert `tag` (WebKit 258922), refuse `close()` in an alert's first ~30 s, and Apple's `Topic` didn't
>   merge them – so "one copy" can't be promised while we re-send. Root-cause candidate: a locked iPhone puts off STARTING the
>   control centre's service worker. Declarative Web Push (iOS 18.4+) lets the phone show the alert itself:
>   `pushOne` sends `declBody(msg)` (`{web_push: 8030, notification: {title, body, navigate, tag, data: {url, kind}}, mutable:
>   true}`) when `declOn(env, endpoint)`: KV `HOLDS` › **`push:decl`** = `{"ids": ["GGAmdj"]}` (set now; `{"all": true}` later;
>   delete = off) AND the phone's worker reported version 2+ (KV `push:swv`, written by `/push/seen` field `v`). Such a phone
>   gets one re-send at most (`pushRetry`). gm `pushsubs` returns `decl`. Control centre 14ee38b: `sw.js` `SWV = 2` (three
>   alert shapes, reports `v`, test alerts report as `a: "test"`), `r2TidyAlerts` closes extra copies when the app is opened.
>   The trial starts by itself once the owner opens the control centre on his phone and it shows one alert (Test alert).
>   How to read it and what to do next: round2-tv-launcher `docs/staff-alerts.md` "Declarative Web Push".
>   **4:06pm:** owner confirmed on his iPhone that opening the app dropped the 3 Scarlett copies to 1 (`r2TidyAlerts` works on
>   a real iPhone), and his phone reported worker version 2 (KV `push:swv` = {GGAmdj: 2}) → it is on the trial from here on.
>   **5:35pm, engine 396b1f9 DEPLOYED (27 bindings, 3 timers):** first reading of the trial – 4 alerts since 4:05pm, owner saw
>   each on time and once; his phone reported none. On his iPhone a declarative alert is shown by the system WITHOUT starting
>   the worker (`mutable` doesn't bring it in), so a trial phone never reports: `pushPrune` now skips phones named in
>   `push:decl` (it would have dropped his sign-up after a silent week), the control centre shows n/a for it, the System
>   check's clean-up step ignores it. Not proven yet (the other phones were fast on those four too). No Vale/Atlas booking has
>   come in since the 4:43pm switch to notes, so the note path is still untested on real SimplyBook.
>   **9:20pm – trial did not fix the lateness.** Max booking alert sent 21:10:44, staff phones +3/+4 s, owner's phone (on the
>   trial) showed 2 copies only when the one re-send arrived (~50 s). HitPay's native alert was on time on the same phone, so
>   the hold is specific to web alerts on that phone. Nothing merges copies (tag, Topic, declarative). A "no re-sends on the
>   trial" change was committed and reverted WITHOUT deploying (9ea5b1c / 6282673) – live engine is still 396b1f9
>   (sha d7571fa2…). Owner asked whether to end the trial (delete KV `push:decl`); not changed yet. Still no Vale/Atlas booking
>   since the switch to notes. Details: round2-tv-launcher docs/staff-alerts.md "Second reading".
>   **11:00pm – trial ENDED (owner: ok):** KV `push:decl` deleted; all phones on ordinary delivery again, re-sends as before.
>   Code for it stays in the engine, off. Live engine still 396b1f9.
> - **15 Nov 12:44am, engine 2056b5e DEPLOYED (27 bindings, 3 timers) – name-only contact before the shared one.** Max booking
>   #3241 (22 Nov 11am, "kikay", Add a session) landed on "Round2 online guest": SimplyBook refused a contact with the number
>   +63 9153455204 (Philippine mobile, 12 digits – valid, so not "too long"; SimplyBook's own reason wasn't kept). New
>   `sbNameOnly`: before the shared contact, both paths (online `finalize`, staff `lateBooking`) try a contact with the name
>   only; `lateBooking` now passes `cErr` to `sbContact` and adds "SimplyBook said: …" to `how` (booking comment). Add a
>   session page (manager/late, db11f40) shows a ⚠️ Contact line when `how` isn't empty. Untested against SimplyBook (whether
>   it takes a contact without phone for this account is unknown – if not, it falls to the shared contact as before, now
>   with the reason in the comment). Also: the first new-style twin note went in for a real booking (Jennie, Vale 22 Nov
>   2:45–6pm, note 2647 in Atlas). Booking #3241 itself left as is (owner can swap the contact in SimplyBook).
>   **12:50am – real cause found, and the 12:44am fix does NOT cover it:** kikay was booked with NO email (comment line has
>   none). SimplyBook refuses every contact without an email ("Client email value is wrong" – found 3 Nov with Denzel,
>   docs/own-booking-plan.md; the account's mandatory registration fields include email). So since Add a session made real
>   bookings with "email optional" (12 Nov), every booking without an email lands on the guest's old contact (found by the
>   last 8 digits – their old name) or on the shared "Round2 online guest". The phone was probably fine. `sbNameOnly` (no
>   email either) fails the same way – harmless, but useless. Proposed to the owner: when no email is typed, give SimplyBook
>   a stand-in email (e.g. the shared contact's online-guest@round2.sg) with the guest's real name and number; or make email
>   optional in SimplyBook's settings (Settings › Email and SMS › Mandatory registration fields – also affects SimplyBook's own
>   booking page).
>   **1:39am, engine 53e166c DEPLOYED (27 bindings, 3 timers) – owner's order for Add a session:** 1) real booking with the
>   guest's own contact; 2) no email, or SimplyBook refuses the contact → a NOTE (`noteWhy` "no email – SimplyBook only makes
>   a booking with one"; `lateBooking` throws → the existing note fallback); 3) the shared Round2 contact only if the note is
>   refused too (`lateBooking({generic: true})` in the note's catch, new daytime sessions only, `bookable`). The old-contact-
>   by-phone lookup and `sbNameOnly` are gone from this path; online path unchanged (name-only step removed). Add a session
>   page: Email field no longer "(optional)", hint says email is needed for a real booking. System check step "Add a session…"
>   now also expects no email → note (tv-launcher cb98ec2).
>   **2:21am, one-off DONE (engine 7548df7, deployed 2:16am):** kikay's Max booking #3241 (22 Nov 11am, shared contact 3321)
>   → time-blocked note 2680 in Max 11:00–14:15 "kikay 2 pax · till 2pm · control centre · +639153455204 (was booking #3241…)",
>   then #3241 cancelled with no phone alert (kv `quietcancel:3241`). Result in KV `oneoff:res`. **Remove `oneoffKikay` and its
>   call in the side lane with the next engine change** (the `quietcancel:` check in `bookingPush` can stay). → removed in 86ed06b.
>   **2:24am, engine 86ed06b DEPLOYED (27 bindings, 3 timers) – booking link in SimplyBook comments** (owner): online
>   bookings' comment now ends "Booking page: https://book.round2.sg/b/<code>"; the last-resort note of a paid online booking
>   carries "confirmation: …/done?ref=<ref>" (Add a session bookings already had the link; Add a session notes have no page).
>   One-off `oneoffLinks` (KV oneoff:go = links) ran 2:26am: link appended to 21 upcoming online bookings; 7 skipped because
>   their comment isn't the engine's any more (no "ref <ref>" – edited by staff or moved), nothing overwritten. Result in KV
>   `oneoff:res`. **Remove `oneoffLinks` and its side-lane call with the next engine change.**
> - **4:43pm, engine eee2f10 DEPLOYED (27 bindings, 3 timers) – NEW Vale/Atlas TWIN BLOCKS ARE NOTES** (owner: "switch to
>   notes … make them consistent … just use the time blocked notes from now onwards"). `mirrorOnSb`: no record yet → POST a
>   time-blocked note in the twin, text `SYSTEM BLOCK · TWIN · <room> is booked (<first name>) · removed automatically · src
>   b<booking>` (`mirText`; `MIR_RE`), kv `mir:<booking>` = {note, s, e, u}. Booking changes → the same note is PUT to the new
>   room/time (404 = deleted by hand → a new one); cancelled / left Vale-Atlas → DELETE. **Records with `blk` (blocks that are
>   bookings, clients 2472/2476) keep the old path** (editBook / cancelBooking) – nothing existing was converted; a move through
>   Round2 (`mvExecute`) removes the old block and the re-made one is a note. A note can't be refused for "room taken", so
>   `mirClash` looks at the twin after making/moving one: real guests there at the same time → humanAlert "<twin> is already
>   taken – check". SimplyBook sends no callback for notes: a note deleted by hand is caught by `mirAdopt` (System check step
>   "Moves and Vale/Atlas blocks…", now reads the notes too; `fix=1` re-makes it), not at once.
>   Also: own-block skips know the note (`mvQuote`, `gLogic`, staff move times; `mirMine` matches `src b<booking>`), clash texts
>   say "twin room booking" for these notes, and long note reads are paged 200 at a time (`notesRange`: `latelist` 46 days,
>   guest calendar `gCalItems` 31 days – with one note per Vale/Atlas booking a range can pass 200). Diag (`diag:req`) may ask
>   `mirror` (forced to status, or `do: adopt` without fix). Make fallback: Make only knows bookings – going back to Make means
>   new blocks are bookings again; note blocks made meanwhile stay and still block.
>   Noise-rule header comment fixed (alerts never go to Telegram).

> ## 14 Nov 2026, 6am – second chat (TVs / control centre): review follow-ups, engine ed9d0be DEPLOYED (27 bindings, cron */5)
> - **A moved booking's noise block follows at once** (`mvExecute` → `noiseSync` old day + new day).
> - **Phone alerts late / in threes:** the delivery log (KV `diag:push`) showed late alerts appearing within 2 s of a re-send, so
>   the first re-send now goes after ~50 s (DO kv `pushchk` on the hold timer's alarm, `pushChk`, `pushRetry` – then ~4 and ~9 min,
>   5-min cron as backstop); `Topic` header so a newer copy replaces an undelivered one; VAPID pass reused 2 h (KV `vapid:<service>`,
>   Apple's once-an-hour rule). Full write-up: round2-tv-launcher docs/staff-alerts.md.
> - **Telegram = the Madd Pizza food workflow only (owner's rule).** Nothing about bookings goes to Telegram; `staffAlert` never
>   sends since engine ed9d0be (it never did – `STAFF_CHAT` was never set). Booking alerts = staff phones only.
> - **Guest links:** "Fix this link's room or start" (was "Change booking time or room" – it never moved the booking); the guest's
>   message page now keeps and shows a pop-up time set by staff (`retimed`).
> - My deploys patch the live script through the Cloudflare API (hash of live checked before, hash of result checked after,
>   keep_bindings with r2_bucket) – same file as the commit, no deploy helper needed.

> ## 14 Nov 2026, 5am – review of the notes + three fixes (owner + Claude). READ: sections below marked SUPERSEDED are history only
> - **Bug fixed:** since 12 Nov the booking board's free-time memory (`gapc`) was wiped on every SimplyBook notes READ (missing
>   braces in `sb2`) – the cause of ~7,000 requests/day. Now wiped only when a note changes. Watch the System check's request count.
> - **Fee rule (owner):** ADD HOURS (same day, room, start – just longer) = no change fee, only the extra hours, doesn't use a move.
>   $5 only for a real upgrade: bigger kind of room (UPGRADE) or same kind at a dearer rate (PEAK TIME). Longer hours alone, or a
>   smaller room, = MOVE $15. Same rule in `gLogic.feeOf` (guests) and `mvQuote` (staff). Wix T&C clause 2.4 gets a line (d).
> - **Guest moves now HOLD the new slot** like a new booking (owner): 10 min, room + twin, SimplyBook "ONLINE HOLD" notes, HitPay
>   page expires with it. DO kv `mvholds` (`mvHoldAdd/Drop/Notes`, counted by `clash()` and `list()`); the guest's own booking never
>   conflicts; one hold per booking; back from HitPay unpaid (`/move/api?…&back=1`) or the 5-min sweep closes it (`released` /
>   `expired`). Staff QR/link moves do NOT hold (staff are at the screen).
> - **Staff moves don't count** toward the guest's 2 moves (owner confirmed). Add a session bookings count as paid at full price (owner: fine).
> - System check has: "Guest rescheduling" (now also the add-hours rule) and "Moves and Vale/Atlas blocks can run" (now also the hold).

> ## Guest booking page + rescheduling + Add a session bookings (LIVE 12 Nov 2026, beta) – the whole flow
> Full rules, fees and the reasoning: docs/rescheduling-plan.md ("LIVE 12 Nov" section at the end).
> **1. Booking.** Online: HitPay → `/done?ref=` → (real or test) redirect to the ONE guest booking page `/move?ref=…&new=1`
>   ("SAVE FILE CREATED · YOU'RE BOOKED!" for 30 min after booking, then "YOUR BOOKING"). WhatsApp/walk-in: control centre ›
>   Add a session (`late`): start 11am–8:15pm, guest out by 11:15pm, 3–6 whole hours, nothing in the way, MOBILE typed → `lateBooking`
>   makes a real SimplyBook booking (own contact with the typed name, pax, twin, noise rule, Auto wrap-up) + a booking record
>   (`addPaid`, `pay:'staff'`, email stored lowercase) and shows **Copy link / WhatsApp it** (`book.round2.sg/b/<code>`). Anything
>   else (late, odd length, clash, no mobile, Change) = a note as before (no link). The link is also in the SimplyBook booking comment.
> **2. Ways in (all land on `/move?ref=`):** email MANAGE YOUR BOOKING button (`/b/[code]` → 302), the link staff send, View your
>   booking (`/find`, email + mobile must match the same booking), the receipt's "Back to your booking". There is NO login: the link
>   (ref) is the key. A homepage LOAD SAVE / SAVE FOUND (phone remembers the booking) was built and REMOVED the same day (owner:
>   a forwarded link would show on someone else's phone – more risk than reward). Old `/done` page: only with `&classic=1`.
> **3. The booking page** (round2sg-home `move/index.html`, served by the engine from GitHub main, 60 s cache; framed at
>   book.round2.sg – `/move` is in the round2-book wrapper's allowed paths): ticket (room colour, name, date, time, length,
>   guests, paid, ref, chips), tiles RESCHEDULE (beta) · TV MESSAGE (cue link or `/done/message`) · RECEIPT (`/receipt`) ·
>   CALENDAR (.ics), reschedule rules, save history (every move + its receipt), when you arrive + WhatsApp, address.
>   Test bookings: yellow TEST BOOKING banner; a sandbox run never put in SimplyBook can go up to payment, then is told it can't move.
> **4. Rescheduling.** ONE rules file `gLogic(C)` in the engine: it charges with it and serves the same function as
>   `/move/logic.js` to the page (price shown = price charged; a moved calendar → "price changed, tap again"). `gCtx` builds C
>   (booking as SimplyBook has it now + a month calendar from ONE getBookings + ONE calendar-notes read, kept 3 min in kv `gcal`,
>   wiped with `gapc` on any change; + online holds). `gApi` = `/move/api` (read · pay · `mv=` status). Pay: fresh check (gLogic +
>   `mvQuote`), HitPay payment request `MV…G` (sandbox for test bookings), redirect back `/move?ref&mv=`, webhook `/move/hitpay` →
>   `mvComplete` → `mvExecute` (SimplyBook editBook, twin, EXT, TV messages follow, `holdMove` adds the move with `guest:true`,
>   `d.paid` += difference). The new slot is HELD 10 min while they pay (14 Nov); if it still can't be moved after paying → staff alerted to move or refund. Nothing to pay → moved at once.
>   Switch off: engine mode `gResched = false` (page says "WhatsApp us").
> **5. Staff.** Bookings › Move a booking (same $5-step fee, can lower/waive with a reason; shows each booking's 🔗 guest link to
>   copy). Add a session › Upcoming lists bookings made there with Copy link / WhatsApp it (change them via Move a booking).
> **6. Emails/Terms.** SimplyBook templates: MANAGE YOUR BOOKING button (email/btn-manage.png), big Name row, "Tap Manage your
>   booking above to reschedule…", receipt line `/r/[code]`. SimplyBook's own Client Rescheduling/Client login OFF, cancellation
>   "Do not allow". Wix T&C (page NEW TNC, HTML block) clause 2.4 + "Before you pay": 2 moves, until 3 hours before.
> **7. Checks.** System check steps: "Guest rescheduling: page, rules and fees" and "Add a session: daytime with a mobile = real
>   booking, late = note". Deploy: see "How to deploy the engine" in the PS4 block below (the helper's cron is gone – open its link).

> **PS4 network wake (14–16 Nov):** helper 1.1.10 has `/_ddp.<ip>` (on/standby), `/_ddpall` (broadcast), `/_wake.<ip>.<key>`,
>   `/_wkey`. A PS4 in rest answers only with "Stay Connected" on and ~2 min after sleeping (Kai yes; Bella, Scarlett silent).
>   **A home-made key (SHA-256 of an account ID) does NOT wake it** – clean test on Kai with an ID'd empty profile, both byte
>   orders. Needs a registered device. HDMI-CEC on Kai (T-Link on, 16 Nov): PS4 on → TV on; TV off → PS4 rests; TV on does
>   NOT wake the PS4 (it drops off the CEC list when asleep); WoL to the TCL TV didn't wake it. → Remote WAKE parked (staff
>   switch rooms on at opening). **Room OFF works:** `adb shell input keyevent 223` to Kai's TV → TV + PS4 both sleep. Next:
>   a "Room off" command in the TV app (Kai first). Detail: project doc ps4-game-saves.md.

>   **16 Nov 1am:** engine 3832c29 (staff `ps4list g=1` → game versions). **The live module is named `worker.js` now** – deploy
>   with main_module "worker.js". Game versions differ in 21 of 45 shared games (It Takes Two 01.03 on Vale/Bella vs 01.00
>   elsewhere, God of War / Outer Wilds unpatched on Max…); helper 1.1.12 reads extended-drive patches. **System check: "side"
>   timer made 57 outside requests in one run (limit 50) – bad before and after this change; someone should look.**

> ## PS4 game saves – WHERE IT STANDS (14 Nov 2026, 4:30am) – read this first, detail in the session log below
> **Proven remotely (Max):** profile rename · sign-in/out · open a save decrypted · backup to R2 · restore into another profile
>   (GT Sport Max → User4, owner saw it on the TV) · rest mode. **Not proven:** 9.00 ↔ 11.00 restore · restore where no save
>   exists yet · helper frozen by rest mode mid-job · helper resuming after a *remote* rest (check /data/round2/rest.log).
> **Versions:** helper 1.1.8 on Max, Scarlett, Kai; Vale + Bella 1.1.1 (asleep, update when idle); **Atlas 1.0.7** – check it
>   self-updates (1.0.7 is the first that can). Engine 1ec01c9 live, 27 bindings.
> **How to deploy the engine:** KV `deploy:want` = commit → open the r2-deploy-helper link in the owner's built-in browser →
>   verify SHA-256 of `deploy:src` → PUT with keep_bindings **secret_text, kv_namespace, plain_text,
>   durable_object_namespace, r2_bucket** (leave r2_bucket out and the save storage is cut off) → 27 bindings, cron `*/5` →
>   System check.
> **Left as is:** Max User4 holds a COPY of the unlocked GT Sport save (its own GT progress is in R2: …/14a1e947/CUSA02168/
>   local-data/1794592769 + sce_sdmemory/1794592784) – owner to say keep or put back. Kai has User1 + User4 signed in.
>   Test backups are filed by console/profile; member saves will be filed by member.
> **Owner decisions 14 Nov:** park non-members' saves (don't wipe) · saves prepared on the PS4 before the day's bookings, live
>   fetch as fallback · member profiles never activated · never update PS4 firmware for any feature · morning wake by TV on →
>   HDMI device link (to check at the shop) · cloud is the one true copy (2nd outlet), a Pi disk only a local cache.
> **Owner still to answer:** other house saves besides GT Sport? · park window (end of day vs 14 days).
> **Next, in order:** 1) game versions per room 2) 9.00 ↔ 11.00 restore 3) restore with no existing save (create + register,
>   Apollo's way) 4) member profile start to end 5) parking + proper delete 6) backup during session + on-disk to-do list, rest
>   mode mid-job test 7) daily prep from SimplyBook 8) QR login 9) morning wake.
> **Also open (not PS4):** SimplyBook requests were 7,110 on 13 Nov (guideline ~5,000; mostly /day getAvailableTimeIntervals)
>   – find out why. TVs: Bella not reporting 3 days (Kaeden = renovation).

> ## Session log – 13 Nov 2026 (owner + Claude): room PS4s report to the engine, one-tap clean-up, self-updating helper
> Plan + full detail: project doc `ps4-game-saves.md` and round2-tv-launcher branch `ps4-helper` folder `ps4/` (README).
> **Engine (all on main, deployed):** `/ps4/in` (report every 15 min, header `x-r2-ps4` = secret **PS4_KEY**, added 13 Nov),
>   `/ps4/games` (public games list from the PS4s, by room tier; PS Vue + names set to '-' hidden; lobby discs from kv
>   `ps4discs`), `/ps4/cmd` (helper asks every minute for a job), `/ps4/done`, `/ps4/app` (newest helper file, SHA-256 checked).
>   Staff gm actions (GM_STAFF): `ps4list`, `ps4map` (console ID → room; Vale = a24af9cb275fa9472848ce070b7ef1e8), `ps4discs`,
>   `ps4names`, `ps4clean`, `ps4update`. kv: `ps4:<id>`, `ps4ids`, `ps4map`, `ps4poll:<id>`, `ps4cmd:<id>`, `ps4play:<night>`,
>   `ps4rel`, `ps4auto` (false = no quiet-time updates), `ps4autoTry:<id>`, `ps4autoChk:<id>`.
> **Helper releases:** round2-tv-launcher branch **`ps4-release`** (round2d.elf + round2d.json {v, sha256, size} + round2-boot.elf).
>   Not GitHub releases (this session can't create them; the TV apps read releases/latest, so PS4 files stay off releases).
> **Busy-room rule changed (owner, 13 Nov 1:40pm):** Clean up on Vale was refused "session until 2pm" – it was Atlas's guests:
>   Atlas's booking puts a SYSTEM BLOCK *booking* in Vale (the engine mirror makes bookings, clients 2472/2476; noise blocks are
>   notes), and the rule also counted the twin. Vale and Atlas are separate rooms (Atlas upstairs), so now `roomBusy` counts only
>   the room's OWN guests: skips SYSTEM BLOCK sessions (`S.sys`), the twin, and notes longer than 12 h (Kaeden renovation).
>   Used by PS4 Clean up / Update now / quiet-time updates AND the TVs' Update now (`tvUpdate`, same twin issue). The mirror
>   itself is unchanged (still bookings) – owner asked "notes instead, or treat system blocks differently"; we did the second
>   (no change to how rooms are sold/blocked). If the mirror ever moves to notes, nothing here needs changing.
> **Deploys today:** r2-deploy-helper had NO cron schedule any more (why it "stopped firing"); a 1-min schedule added for a test
>   didn't fire either and was removed. Working way: set KV `deploy:want` = commit, open
>   `https://r2-deploy-helper.donttelldadyet.workers.dev/?k=<deploy:key>` in a normal browser (this cloud machine is blocked from
>   it), then verify SHA-256 of `deploy:src` and PUT with keep_bindings. Bindings were 26; **27 since 14 Nov** (R2 `SAVES`) – see below.
> **Self-updating helper (evening):** starter round2-boot.elf in AutoRun launches the helper via GoldHEN BinLoader. First live
>   update (Max 1.0.5→1.0.6) got stuck: the old helper's `_exit` ended in signal 12 and it kept its lock, so the starter never
>   swapped. Fixed with helper 1.0.7 (never exits – lets go of the lock and sleeps) + starter 2; engine `PS4_SELFUP='1.0.7'`
>   (no updates offered to older helpers – FTP once). **Max 1.0.7→1.0.8 by Update now worked (~20 s).** Releases: branch
>   `ps4-release`, read by commit (staff gm `ps4rel` checks). Read-only `ps4look`/`ps4lookres` lists PS4 folders.
>   PS4 FTP (192.168.x, port 2121): Vale .88.21, Kai .88.18, Max .88.6, Scarlett .88.16, Atlas .88.19, Bella .88.23.
> **Game saves – tests 13 Nov evening (full findings + rules: project doc ps4-game-saves.md "Save-transfer tests"):** PS4's own
>   USB save copy is blocked (wants a system update). Apollo's copy works between Kai and Max, into activated AND unactivated
>   profiles, because it re-stamps the save (param.sfo user ID + account ID + PSID) for the receiving profile → member profiles
>   stay unactivated, main profiles untouched. Changing a profile's ID after saves are in it = "save corrupted". Encrypted copies
>   are firmware-bound (11.00 vs 9.00 rooms) → cloud copies decrypted. Helper 1.1.0 has staff gm `ps4prof` (rename / activate /
>   undo, one change per job, read back; refused while signed in or a game is open). Kai + Max User4 renamed back to "User4" (9pm).
> **Late 13 Nov:** helper 1.1.1 (prof ops logout/login, never the main profile) released; all PS4s self-updated except Scarlett
>   1.0.9 / Atlas 1.0.7. Engine bb2049e (ps4prof allows logout|login) – Cloudflare's script upload returned HTTP 500 (code 10002,
>   Workers incident open on their status page) 3x 11:23–11:30pm, went through 11:45pm; live engine was never half-changed.
>   System check fix (round2-tv-launcher cd14388): the guest-rescheduling step's "under 3h" test moved the clock after building
>   the rules (they read it once), so it always failed – it now builds them again. After: 36 ok / 0 bad. Warn: SimplyBook
>   requests 7,110 today (guideline ~5,000; biggest user /day getAvailableTimeIntervals) – look into it. Next: sign-out test on
>   **Max** User4 (Kai has Scarlett's guests – leaky aircon in Scarlett).
>   **14 Nov 1:20am – done:** remote sign-in AND sign-out of Max User4 both worked (helper `prof` login/logout, result 0, read
>   back "Max" → "Max, User4" → "Max"). Main profile untouched. The 12:15am try missed because the shop's internet dropped
>   (~12:07–1:10am, ISP); the helper resumed by itself. → end-of-session clean slate can be automated.
>   **14 Nov 1:35am:** helper 1.1.2 (released, Max only so far – others get it in quiet time) opens a save **decrypted,
>   read-only** Apollo's way (key service + sceFsMountSaveData), lists it, closes it – tested on Max User1 CUSA34284: real data
>   ~10 KB + icons. Staff `ps4look` paths `/_save.<user>.<title>.<save>|3`. Cloud storage (R2) not enabled on the Cloudflare
>   account – owner switched it on 1:44am; bucket **round2-saves** (APAC) created, not yet bound to the engine. Next: pack +
>   upload + restore.
> **RULE (owner, 14 Nov): Gran Turismo Sport on Max (CUSA02168).** The save in the main **Max** profile is fully unlocked,
>   only on Max, the racing-sim USP. It may be READ (backed up, copied into another profile) but is **never written to,
>   restored over or deleted**, and that profile is never removed. Helper 1.1.4+ refuses (first version 1.1.3 refused reads too).
> **14 Nov 2:15am – PS4 save backup + restore working.** Engine 1ec01c9 (deployed, 27 bindings incl. R2 `SAVES` →
>   round2-saves; keep_bindings must now include "r2_bucket"): `/ps4/sput`, `/ps4/sget`, staff `ps4saves`. Helper 1.1.7 (Max;
>   others in quiet time): `ps4look` paths `/_sback.<user>.<title>.<save>` and `/_srest.<user>.<title>.<save>.<backup>` (into
>   an existing save of the same game, its own sce_sys kept, each file staged on /data/round2/stage first). Max's unlocked GT
>   Sport save is backed up; a copy was restored into User4's GT save (User4's own GT progress backed up first). System check
>   after: 38 ok / 0 bad (new step "PS4 helpers + game-save storage"). Owner's daily plan: prepare the day's members' saves on
>   each PS4 from SimplyBook ahead of time (works offline), live fetch at login as fallback. Full log: project doc
>   ps4-game-saves.md.
>   **2:32am owner confirmed: User4 on Max has the GT Sport save – restore works end to end.** Clean slate (owner): all
>   non-member saves go at session end (main + User1–4 profiles) except a per-room house baseline (GT Sport on Max).
>   Owner 2:38am: PARK (keep on the PS4 + cloud, tied to the booking) rather than wipe, so a guest who signs up can still get
>   their progress back. **2:55am: remote rest mode works** – helper 1.1.8 `ps4look` paths `/_rest` (only if rest mode is
>   enabled and no game is open); Max, then Scarlett + Kai (self-updated to 1.1.8) went to sleep on command.
> **Vale PS4 (owner):** sometimes kernel-panics while jailbreaking (11.00) – before Round2's helper starts (AutoRun runs after
>   the jailbreak). Noted in the PS4 plan; watch whether it gets worse once more payloads run.

> ## INCIDENT 13 Nov 2am – first real guest move didn't run; Atlas not blocked (FIXED)
> - Ranen Tan paid $15 (PayNow, 2:04am, MV39355CBD) to move Vale Tue 17 Nov 3:30pm 4h → 4pm 3h. Nothing moved, no alert, Atlas free.
> - Cause: the HoldBook class had TWO methods named `claim` – the kv lock `claim(k, ms)` (added 11 Nov with the engine mirror) and
>   the holds `claim(ref)` further down, which silently replaced it. Every lock returned "busy": `mvExecute` ("Someone is moving
>   this booking"), `mvComplete`, and `mirrorOnSb` (Vale/Atlas twin blocks gave up). Renamed the kv lock to `lock(k, ms)`.
> - Done: move finished by staff action `mvfinish` (recorded as paid online); missing twin block added (izzati, Vale 13 Nov 2:15pm,
>   via `mirror adopt fix=1`); all 9 Vale/Atlas bookings now blocked.
> - Added: a 5-min sweep that finishes paid moves still pending (or alerts); staff actions `mvrecent`, `mvpaycheck`, `mvfinish`;
>   System check step "Moves and Vale/Atlas blocks can run" (`mvselftest`: lock locks, no missing twin blocks, no stuck moves).
>   System check after the fix: 35 ✅ (the red was the check's own under-3h test time – fixed).
> - Deploys: the helper's cron had stopped firing for hours. r2-deploy-helper now ALSO fetches on demand:
>   GET https://r2-deploy-helper.donttelldadyet.workers.dev/?k=<KV deploy:key> → pulls `deploy:want` into `deploy:src`.
> - Lesson: never reuse a method name in HoldBook; the self-test now proves the lock works.

> ## Session log – 12 Nov 2026 (owner + Claude): guest rescheduling launch, start to finish
> In order, so the next person sees why things are the way they are:
> 1. **SimplyBook emails** (Settings › Email & SMS › templates, edited in the browser): Booking confirmation, Booking change and
>    Reminder (client email) now use the MANAGE YOUR BOOKING button picture (email/btn-manage.png) and a big **Name** row at the top
>    of the details box. Confirmation also says "Tap Manage your booking above to reschedule – up to 2 times, until 3 hours before
>    your session. A small change fee applies." + "Your receipt: book.round2.sg/r/[code]". (A WhatsApp link was tried first and
>    removed – owner: it made rescheduling look WhatsApp-only.) Checked: SimplyBook's Client Rescheduling and Client login are OFF,
>    Cancellation Policy = "Do not allow to cancel appointment".
> 2. **Fee decision:** the demo's fee goes live (MOVE $15 / UPGRADE $5 / PEAK TIME $5 + difference + POPULAR +$5…+$20 in $5 steps,
>    "$5 OFF", Vale/Atlas twin rule, 2nd move +$10, free first 15 min). Launch **fully open, BETA tag kept** (no first-month cap).
> 3. **Engine** (worker/round2-book.js): `gLogic` (one rules file, also served as /move/logic.js), `gCtx`/`gCalItems` (month calendar
>    from 1 getBookings + 1 notes read, 3-min memory `gcal`), `gApi` (/move/api), guest pay via HitPay `MV…G` → `/move/hitpay` →
>    `mvExecute`; `holdMove` keeps `paid` and each move (`guest`, `moveNo`, `cost`); staff Move a booking fee now in $5 steps too.
> 4. **Add a session = real booking first** (owner corrected me: I first said it only made notes – it did, the booking path was new).
>    Needs the guest's mobile (email optional); daytime 3–6 h, nothing in the way. Shows Copy link / WhatsApp it. Late/clash/odd
>    length/no mobile → note as before. Email stored in small letters so "View your booking" (email + mobile) finds it.
> 5. **T&Cs** (Wix, page "NEW TNC", HTML block html1 in section46, round2.sg/tnc): clause 2.4 + "Before you pay" = 2 moves, until
>    3 hours before; then (owner, 12 Nov 8pm, CCCS price-transparency) the price STRUCTURE spelled out: change fee S$5/S$15 (+S$10
>    2nd move), popular-time add-on S$5–S$20 by demand, price difference, itemised total shown before paying, free first 15 min.
>    The demand model, twin rule and "$5 OFF" stay internal. Keep this clause in step with gLogic if fees change. The older "t&c" page (/r2tnc) was NOT changed.
> 6. **Homepage LOAD SAVE / SAVE FOUND** (phone remembers the booking) – built, then REMOVED the same hour (owner: a forwarded link
>    would show on someone else's phone; more risk than reward). Homepage clears anything it stored (`r2.saves`).
> 7. **One booking page everywhere** (owner: "keep everything consistent"): the 4-button page `/move?ref=` (Reschedule · TV message ·
>    Receipt · Calendar, rules, save history, when you arrive, address). `/b/<code>`, `/find`, payment return (`/done` → "YOU'RE
>    BOOKED!" for 30 min), receipt "back" all land there; test bookings too (TEST banner). Old `/done` only with `&classic=1`.
>    No login – the link is the key (a "last 4 digits before rescheduling" check was offered, not built).
> 8. **The page keeps itself current**: free-change countdown ticks on the engine clock (/time); when it ends, or the tab comes back /
>    is 5 min stale, prices reload and the screen redraws; reopened under 3 h or with no moves left → back to the booking, closed.
> 9. **Staff**: Bookings › Move a booking shows each booking's 🔗 guest link (Copy / Open); Add a session › Upcoming lists the
>    bookings made there with Copy link / WhatsApp it. Every move sends a staff push "🔁 RESCHEDULED online by the guest / by <staff> ·
>    was · now · paid $X (fee + difference)" (opens Rescheduling) and SimplyBook's plain "MOVED" alert is skipped for those.
> 10. **Rescheduling page** (Bookings › Rescheduling): trip-wires for the last 4 weeks – % of online bookings moved (≤15%), % moved
>    under 3 days (≤50%), % into Fri–Sun evenings (≤33%), % freed slots rebooked (≥15%), average gain per move (>$0); red after 5+
>    moves → one push alert a day per wire (`mvStats`). Demo with made-up moves: staff.round2.sg/?rsdemo=1&tab=resched.
> 11. **System check** (before: 33 ✅; after: 34 ✅) – new steps "Guest rescheduling: page, rules and fees" and "Add a session:
>    daytime with a mobile = real booking, late = note". Red both times: **SimplyBook requests 12.9k–13.5k today** (mostly the
>    booking page's /day before the 12 Nov caching; watch tomorrow's number).
> **Still open (12 Nov evening) – all closed since except the last two:** the owner's real test move (not needed: a real guest move ran 13 Nov) (test booking "test", Scarlett Thu 19 Nov 11:15am, ref R2BEE8C55C26 –
>    pay with 4242…, then cancel it in SimplyBook; earlier test bookings got cancelled before the test – the "CANCEL IT" note);
>    engine commit 1620aed (move alerts + live trip-wires) DEPLOYED 12 Nov ~8pm (mvstats answers: 0 moves, 111 online bookings in 4 weeks); the old /r2tnc T&C page; the optional "last 4 digits" check.

> ## TV notifications (31 Oct 2026) – read round2-tv-launcher `docs/notifications.md` first
> Flow charts of every timer and priority on the room TVs (guest > Round2 > +N CREDITS ADDED; food first), the 10 → 5 min → That's a wrap
> sequence, cut-offs, In session extensions (EXT notes, Vale/Atlas SYSTEM BLOCK) and a code map. The engine parts are in this repo's
> `worker/round2-book.js`: `qRun` (queue), `follow` (messages follow bookings), `nudgeRun` (5-min reminder), `sessBanner`/`bqRun`
> (credit banner waits in line), `insess`/`extend`/`extUndo` (In session).

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
>   (DONE 12 Nov: the SimplyBook emails use `https://book.round2.sg/b/[code]`);
>   one real sandbox test booking + food order via the Test bench to see the return pages on the new addresses.

> ## SEO optimisation (new department, 31 Oct 2026) – read docs/seo-optimisation.md first
> Owner's rules: no visible SEO text on round2.sg, no hidden text, no keyword stuffing; the game homescreen look stays.
> Next up: business details code (structured data) on the Wix homepage – drafted in that doc, owner to OK before publishing.

# HANDOFF – Round2 own booking system: the ORIGINAL 30 Oct note (SUPERSEDED where it says not live / sandbox / DRY_RUN / own-booking branch – it has been live on `main` since 30 Oct; kept for the how and why)

Written 30 Oct 2026, ~6:30am SGT (co-owner who handles WhatsApp bookings), on branch `own-booking` (merged, retired).
At that time nothing was live for guests. Detailed notes: `docs/own-booking-plan.md`, `docs/simplybook-early-bird.md`.
Working rule from the owners: work on your own branch, never merge without approval, leave a handoff note.

## What it is
Guests book on our own page instead of the SimplyBook widget:
`slots/index.html` (board) → **Cloudflare Worker `round2-book`** (`worker/round2-book.js`) → HitPay → booking written into SimplyBook.
- URL of the engine: `https://round2-book.donttelldadyet.workers.dev` (`/day`, `/quote`, `/checkout`, `/release`, `/done`, `/hitpay`, `/test`, `/selftest`, `/ph`).
- Board preview: `https://raw.githack.com/donttelldadyet-prog/round2sg-home/own-booking/slots/index.html`
- Cloudflare account: the Round2 Google login (donttelldadyet). Deploy = upload `worker/round2-book.js` via the Cloudflare API MCP
  (`PUT /accounts/{id}/workers/scripts/round2-book`, multipart, `keep_bindings: [secret_text, kv_namespace, plain_text, durable_object_namespace, r2_bucket]` – **r2_bucket is needed since 14 Nov or the game-save storage is cut off**; current way to deploy: "How to deploy the engine" near the top).
  The repo file is the source of truth – commit first, then deploy the same file.
- Secrets in the Worker: `HITPAY_KEY`, `HITPAY_SALT`, `HITPAY_API` (all **sandbox** now), `SB_COMPANY`, `SB_USER`, `SB_PASS`
  (SimplyBook user "Booking Bot", made for this). Vars: `DRY_RUN=1`, `SB_PUBLIC_KEY`. Durable Object `HOLDBOOK` (class `HoldBook`) holds unpaid slots.

## Status (as of 30 Oct – SUPERSEDED: all of "Not done" below was finished by the 30 Oct launch or since)
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

## Food menu payment via Cloudflare (30 Oct) – which keys: see the section above (live = `HITPAY_LIVE_*`, sandbox = `HITPAY_KEY/SALT/API`; never swap them)
Both the booking page and the room menu use the same pair of HitPay accounts. `menu/index.html` (on main) posts to `/menu/checkout`
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
  to SimplyBook). After payment the booking is written to SimplyBook on the normal services (28/29/32 Netflix,
  33/35/37 Deluxe) and the engine blocks the other room – see "Vale ↔ Atlas mirror runs in the engine" below.

## Decision 30 Oct: Early Bird extensions WITHOUT new SimplyBook services
The Worker books Early Bird on the existing live services 32/33/34 with an explicit end time (e.g. 11:00–15:00 for 3 h + 1 h),
the same way the mirror creates its blocker bookings (admin `book()` with start AND end, no payment step).
The mirror (Make until 11 Nov, now the engine) copies the booking's start/end, so the extended time is blocked too.
So the hidden services 39–44 and add-ons 38–55 are NOT needed – leave hidden, delete later with the owner.
To confirm in to-do #1 (real test booking): SimplyBook accepts the longer end time on 32/33/34.

## Related, already live
- Guest TV messages + control centre (repo `round2-tv-launcher`, Make scenarios 8249444/8251356, `cue.round2.sg`), site stats in Firebase `/web`.
- Hidden SimplyBook Early Bird services 39–44 + add-ons 38–55 exist but were NOT switched on (guest page ignored the 11:00 fixed time).
  Old Early Bird 32/33/34 are live as before. See `docs/simplybook-early-bird.md`.

## Noise rule (8 Nov 2026, owner) – live
- **4+ guests in Max or Atlas → Bella blocked; 4 guests in Bella → Atlas blocked.** Max is never blocked. Reason: noise between the rooms.
- The block is a SimplyBook time-blocked note `SYSTEM BLOCK · NOISE · Max: 5 guests (name) · removed automatically · src b123`
  over the session's whole time (cleaning + extensions included). Screens skip it like every SYSTEM BLOCK.
- Everywhere: online bookings, SimplyBook bookings (guest-count field), control-centre sessions ("5 pax" in the note text).
  A 4+ group paying online also holds the noise room with its ONLINE HOLD note.
- **Other room already booked → the booking still goes ahead (owner's choice) and staff get an alert** (control-centre phone
  alert only – nothing about bookings ever goes to Telegram, owner's rule 14 Nov), once per clash. Cleaning-time overlap alone doesn't count. ZZTEST sessions never alert.
- Engine `noiseSync`: runs on every SimplyBook callback (and again 3–5 min later – a new booking's guest count is saved a
  moment after the callback), straight after an online booking, after In session / Add a session actions, **straight after a
  move (`mvExecute`, 14 Nov)**, every 10 min (tonight + tomorrow), hourly (week ahead) and one day per half hour for 8–91 days
  ahead (10 Nov). 10 Nov bug: a booking's guest count was looked up under the wrong key, so real bookings never blocked. Read-out: gm action `noise` (day, sync=1). System check step "Noise rule".

## Vale ↔ Atlas mirror runs in the engine (LIVE since 11 Nov 2026) – Make is off
- Make "[BACKEND] SYSTEM BLOCKS MIRROR ROOMS" (6990225) was switched off 11 Nov 2026, 8:18pm SGT; kept, not deleted (fallback).
- **Since 14 Nov 4:43pm a NEW twin block is a time-blocked note, not a booking – see the 14 Nov entry at the top.** What follows describes the blocks made before that (still bookings):
- Engine `mirrorOnSb` (worker/round2-book.js), run from `/sb/notify` when engine mode `mirror === 'engine'`: a guest booking in Vale
  makes a SYSTEM BLOCK booking in Atlas (client 2472) and the other way round (client 2476), with the booking's exact SimplyBook
  start and end (cleaning included). It moves and cancels with the booking. Any service: the same kind (off-peak / peak / early
  bird) in the twin, else its off-peak service (`mirSvc`) – no hard-coded service list any more. A failed block alerts staff phones.
- Record per booking: kv `mir:<booking>` = { blk }; Make's old blocks were adopted at switch-over (`mirAdopt`).
- gm action `mirror`: do=status (mode + last 20 log lines) · adopt (fix=1 makes missing blocks) · run&bid= · on / off.
  **Going back to Make = do=off AND switch the Make scenario on again** – with the mode on `make` and Make off, nothing mirrors.

## SimplyBook callback goes through the engine (30 Oct 2026)
SimplyBook's callback URL (Custom features › API) should be `https://round2-book.donttelldadyet.workers.dev/sb/notify/<SB_NOTIFY_KEY>`
(the full address is with the owner; the key is a Cloudflare secret). Since 11 Nov the engine mirrors Vale ↔ Atlas itself (section
above); it only passes the callback on to Make's mirror scenario (secret `MIRROR_HOOK_URL`) when engine mode `mirror` is `make`. Then: cancelled → the online booking drops off "View your
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

### 14 Nov 2026 (night) – "why is it only am??" (guest screenshot, Vale Sun 15 → Sun 22)
- Cause: guest was under 24 h before their session (stage `day`: same-day upgrades only), so Sun 22 had **no allowed start**.
  `move/index.html` drew that empty state (`sel.t == null`) as "12am – 3am", "taken from 12:01am" and a wrong total. Continue was
  disabled, so nobody could pay for it – display bug only.
- Fix (page only, commit 527412c): empty state now says why – under 24 h → "only same-day upgrades online, WhatsApp us to move
  to another day" (prefilled WhatsApp link); otherwise "<room> has no free time on <day>" + which rooms are free. No engine change.
- Not done: System check not re-run (session wasn't linked to the browser) – run it next time. Idea: grey out other days in stage `day`.
- Same night, owner: "grey them out and explain why they can't move, find any other bugs" + two screenshots. Page-only (`move/index.html`):
  - Under 24 h: other days are greyed ("locked"), week arrows/Month off, and the note at the top says why + WhatsApp link.
    Under 3 days: a day whose only free times are before 2:15pm says "3+ days" instead of "full"; rooms say why they have
    nothing ("Before 2:15pm only", "Not an upgrade", "Fully booked").
  - The room the guest wants is remembered (`sel.rw`): if it has nothing that day the page says it switched ("Vale has no time
    on Sun 22 – showing Scarlett") and goes back to their room on the next day they tap; it prefers the same kind of room.
  - Hours: the guest's own length (`sel.hw`) comes back whenever it fits – before, one tap on a "max 3h" time left a 4h guest on
    3h for every later time (Ranen's case again). "min 4h" label where only longer fits.
  - "Starts in -2h" during/after a session → "On now · until 5:45pm" / "Session ended". Early-bird bookings no longer read
    "$5 for a bigger room" (theirs is always $15). Done screen no longer says "1 move left / free for 15 min" after ADD HOURS.
    Receipt's "(2nd move +$10 included)" only when it was the guest's 2nd move. Calendar file works for yesterday's booking.
    Back from HitPay unpaid (status ≠ completed, or the hold expired/released) → "That change wasn't paid" instead of
    "Your payment came through… confirming" for 2 minutes.
  - Home button title "RESCHEDULE / ADD HOURS" overlapped itself on phones → "RESCHEDULE + HOURS", proper line height.
- Control centre (round2-tv-launcher `manager/index.html`): a reschedule alert's page said "NEW BOOKING · NO NAME" (the engine
  sends it without `ctx`). The page now reads the alert's own lines: Rescheduled · room, name, Now / Was / Moved by / Paid,
  "Open Rescheduling"; the list row gets the "Changed" tag.
- **Found, NOT changed (engine = needs a deploy + System check; owner to decide):**
  1. `gLogic.why`: ADD HOURS is refused by the 2:15pm lock when the booking itself starts before 2:15pm and is under 3 days
     away (11am early birds included) – adding hours to your own slot shouldn't be "a new time before 2:15pm".
  2. ADD HOURS is refused by the "don't leave an unsellable gap" rule (`deadGap`) – e.g. 3pm–6pm with the next booking at
     9:45pm can't add an hour online. Probably should be allowed: they're paying for the hour.
  3. After 2 moves the page hides the button entirely, though the engine would still allow ADD HOURS (doesn't use a move).
  4. The reschedule push has no `ctx` (bid/ref/times) → its alert page can't show phone/email or "Open In session"; and an
     add-hours alert still says "RESCHEDULED" (page is ready for "HOURS ADDED").
  5. Room cards price the guest's own length even where only a shorter one fits (the ticket below is right).
- System check NOT run for any of this (no browser link this session). Tested on a mock copy with Playwright only.
- 11pm, owner: the receipt must say whether they **moved or added hours**. Page (`move/index.html`, `isAdd(m)` = same day, room
  and start, just longer): booking history line "Hours added: 3h → 4h … no move used"; its receipt is "ADD HOURS RECEIPT" with
  one row "Extra hour (3h → 4h) · no change fee"; the receipt tile says "moved once · hours added"; review screen says "▼ ADDING
  HOURS ▼" and "adding hours doesn't use a move"; done screen "HOURS ADDED!". After 2 moves the button stays hidden (owner: intended).

### 14 Nov 2026, 11:45pm – rescheduling rules, owner's decisions (engine + page + System check)
- **Early birds (owner: "we WANT the early birder to come, but not to reschedule to another day – the slots are prized"):**
  under 3 days an 11am booking is **own day only** (`why` → `sameday`; page greys the other days like under 24 h, with the reason
  and a WhatsApp link). On their own day they can start later (any room) or add hours – $15 + difference to full price; add hours
  no fee. 3+ days away: unchanged (any day, incl. another early-bird slot for $15) – owner hasn't objected, not explicitly confirmed.
- **Everyone:** the 2:15pm rule no longer blocks a time at/after your own start on your own day (it was already allowed under 24 h).
- **ADD HOURS vs the gap rule (owner: option C, "adapt from the room's real bookings"):** `packAfter(e)` packs 3h bookings after
  an end time up to the next real booking; same count after extending → always offered (before, a 2pm booking on an open day
  couldn't add an hour at all); one fewer → offered only if the extra hours ≥ the expected value lost; else `gapadd`: hour button
  says "WhatsApp us" + a note with a prefilled WhatsApp link.
- **Alerts:** adding hours pushes "➕ HOURS ADDED … was … 3h / now … 4h"; reschedule/add-hours alerts carry `ctx` (bid, room, name)
  so the alert page finds phone/email. `/move/api` moves carry `add`.
- **Under-24h wording (owner picked):** "We're getting your room ready! This slot has been kept for you and it's too late for
  another guest to take it, so the day can't be changed online – but you can still upgrade on <day>…".
- System check step "Guest rescheduling: page, rules and fees" tests the three new rules.
- **Engine 0c96804 DEPLOYED 11:50pm** by patching the live script through the Cloudflare API (live hash checked before = 6282673's file, after = this commit's file; module `worker.js`, compatibility 2026-06-01, 27 bindings, 3 timers).
- Booking page "See all rules" now lists the early-bird rule and add-hours; an early bird 3+ days away sees the rule in yellow under their stage.

### 16 Nov 2026, 11:30am – PS4 helpers silent while the PS4s are ON (Bella, Atlas) → helper 1.1.14 released
- Facts (engine `ps4list` through the diag channel, 11:16am): Bella took the quiet-time update 1.1.10 → 1.1.13 at ~10:34am, reported once
  as 1.1.13, last poll ~2 min later, then silent – owner confirmed the PS4 is ON. Atlas (still 1.0.7, last full report 21 h
  earlier) stopped polling at the same time, also ON. Max updated 1.1.8 → 1.1.10 at ~10:36am and stays online (guest playing).
  Vale 1.1.13 silent since ~1:50am, Kai 1.1.13 put to rest by command 1:15am, Scarlett 1.1.10 off since 15 Nov evening.
- NOT known: why. Atlas fits the old wake bug (1.0.7 steps aside on SIGCONT, starter relaunch fails). Bella's 1.1.13 going quiet
  inside the starter's 3-minute trial window is suspicious (roll-back whose relaunch failed?) – only `/data/round2/app/boot.log`
  on the PS4 can say. Nobody has read it.
- **Helper 1.1.14** (branch ps4-helper a199ec7, released on ps4-release; built in this chat with ps4/build.sh – my build of
  1.1.13 had the same size as the released one but not the same hash): each report now carries `up` (helper start, PS4 clock),
  `woke` {n, at, sleptS} (a 2 s sleep that returns >90 s late = the PS4 was in rest mode; reports ~12 s after the wake) and
  `log` {boot: last 8 lines of boot.log, stopped: last 3 of helper-stopped.txt}. No signal handler added. The engine stores
  the whole report, so no engine change. **Untested on a real PS4** – first one to take it: watch its tile.
- Control centre › TVs › PS4s: a helper that went silent right after our own `/_rest` job shows "😴 Rest mode · sent by us";
  other silent ones say what it can be and what to do; 1.1.14 tiles show "Last woke from rest … slept …", "Helper running
  since …" and a fold-out "Helper log".
- Still can't be told apart from far away: rest mode by controller/auto-timer vs. power off vs. helper stopped (the helper is
  frozen before it can say anything). Idea not built: when a helper goes silent, have a live one ask it with `/_ddp.<ip>`
  (on / standby) automatically.
- **16 Nov midday, results.** Bella (restart + jailbreak 11:36) and Scarlett took 1.1.14 and stay online. Bella's log (first use
  of the new `log` field): 10:33:02 "helper 1.1.9 stopped by signal 19" (the wake), and the starter's hourly line at 11:33 said
  "helper running" while nothing had polled for an hour → 1.1.13 was **alive but stuck**, not dead (cause unproven; guess: a
  network call that never returned, right after the wake, weak Wi-Fi). Idea not built: a time limit on every network call (1.1.15).
- **Kai wake test (owner woke it ~12:00 from the rest mode sent at 1:15am):** helper 1.1.13 kept running through the wake – no
  restart, no jailbreak (starter 12:00:26 "hourly: helper running") → **the 1.1.13 wake fix works on a real PS4.** It polled
  from 12:00 but sent its first full report only at 12:14 (reports every 15 loop-minutes; a wake didn't trigger one before
  1.1.14), then took 1.1.14 by itself at once ("said hello – kept"). Auto-update needs a report < 20 min old – that is the delay.
- **Clean-up sizes (owner: "why do they grow back, nanoDNS blocks updates"):** Kai idle for 30+ min after waking: downloads
  (1 stuck patch CUSA52342, 1,074 MB), captures (104 files, 136 MB) and free space (140.4 GB) identical to 1:15am → an idle PS4
  doesn't grow. Stuck downloads are mostly exactly 1,074 or 268 MB → looks like reserved space for queued patches that never
  arrive (unconfirmed). Owner says automatic downloads and trophy clips are OFF on all PS4s. Next test: open games on Kai and
  see whether a new stuck download appears.
- Control centre › PS4s tiles redone (owner: "too convoluted"): one long tile per room, state + one line of numbers + problems
  on the left, buttons on the right, everything else under "More".
- **Max 2:12pm: update 1.1.10 → 1.1.14 stuck on "switching"** (owner). Max's log (1.1.14's `log` field): the old helper downloaded
  1.1.14 and wrote the switch, but never let go – starter 14:14:20 "switch waiting: the old helper still holds the lock after 2
  minutes". Owner restarted Max → 14:15:43 starter 2 started, finished the half-done switch, 1.1.14 said hello. One starter
  (restart, not a hand-sent payload). Same family as Bella (alive but stuck); also seen on Max 13 Nov.
- **Helper 1.1.15** (ps4-helper 2d724b6, released ps4-release e5c4297, built with ps4/build.sh, sha 4ede8fac…): (1) when switching it
  writes the switch and LETS GO of the lock first, then reports + pop-up (before: report + pop-up while still holding on);
  (2) every network connect has a 10 s limit per address and sends 20 s (tls/r2tls.c `r2_connect`; reads already 15 s).
  No signal changes (1.1.13's wake fix kept). Owner: "push an update, the auto-updater picks them up in quiet time" – no
  room updated by hand. Note: rooms still on 1.1.10–1.1.14 may stick once more on THIS hand-over (old code); a restart clears
  it. System check before and after: 39 passed, 2 to look at (watchdog 7am-rule places, Kaeden TV offline), 0 failed – the
  earlier "side timer 57 requests" bad no longer shows.
- **Kai game test (owner, 3:29pm):** opened FC 26 + Overcooked 2. No new stuck download; FC 26's old one (CUSA52342,
  download0.dat exactly 1 GiB, queued 13 Nov 9:47pm) got its time touched at 3:29pm = the PS4 retries the queued patch when the
  game opens and the blocker stops it. Notifications › Downloads on Kai shows NO entry. Clean-up test (does it come back after
  Clean up + opening FC 26?) still to do – owner presses Clean up (my ps4clean call wasn't approved here). Max: CUSA48576 =
  WWE 2K25 (11.5 GB stuck), GT Sport 5.4 GB (patch 01.69 is its last – a leftover; leave alone).
### 16 Nov 2026, 3:40–4:30pm – helper 1.1.16: read a file on a PS4 + remote blocker (nanoDNS) settings (owner: "do both in 1.1.16")
- **Helper 1.1.16** (ps4-helper 2f67eff, ps4-release 78bc916, sha 79c095fe…, 1,142,096 B): look `/_tail.<file>|<lines>`
  (read-only, last ≤200 lines/24 KB, lines ≤280 chars, only .log/.txt/.ini/.prev/.ver under /data/round2, /data/nanodns,
  /data/GoldHEN) · look `/_ps` (pid → comm|thread name – tells us the blocker's process name, unknown so far on PS4) · job
  `dns` {sha}: refuses (changes NOTHING) unless exactly one process named *nanodns* is found, nanodns.elf is found (GoldHEN
  payloads.ini, else /data/payloads/) and BinLoader 9090 answers; downloads POST /ps4/dnsini, checks SHA-256 + the same rules
  as the engine, keeps nanodns.ini.prev, writes via .new + rename, SIGTERM (then SIGKILL) the old nanoDNS, launches it through
  BinLoader, tests ≤25 s (Sony update name must be 0.0.0.0 AND engine resolves + /time 200); else copies .prev back, restarts,
  retests, reports "rolled back" (+ "CHECK THIS PS4" if the old one isn't confirmed). Report has `dns:{sha (12), prev}`.
  r2tls: remembers each host's last good address in /data/round2/addr-<host>.txt and uses it when DNS fails or answers
  0.0.0.0 (a bad blocker file can't cut the helper off). **Untested on a real PS4.** First real use: read a file + /_ps on one
  room; only then try a dns change on a free room (Kai) with the Round2 standard file (sha 3eeb2b5a…).
- **Engine d8156e8 DEPLOYED** (27 bindings incl. R2 SAVES, 3 timers; live source hash = main): staff `ps4dns` (ini, dry=1 check;
  send needs confirm=SEND, ids comma list, refused per PS4 if offline / helper < 1.1.16 / guests within 10 min), `ps4dnsget`
  (last sent + change log, kv ps4dns:cur / ps4dnslog / ps4dnsini:<sha16>), POST `/ps4/dnsini` (PS4 key). Look values for
  `tail/…` and `dns/…` keys keep 300 chars (others 40). No owner-only key exists – staff code + typed SEND is the gate.
  Rules (both sides): 40–8192 bytes, no control chars (UTF-8 comments OK – the standard file has "–"), [overrides] only
  =0.0.0.0 and must include `*=0.0.0.0`, [exceptions] nothing with playstation/sony/psn/akamai/akadns/edgesuite/edgekey/llnw/
  scea/scee/sie-, no catch-alls (*, *.com), must include round2-book.donttelldadyet.workers.dev, bind=127.0.0.1, bind6 ::1/off,
  log path fixed, upstream servers as numbers. Tested on 8 files (helper C + engine JS agree).
- **Control centre (round2-tv-launcher 90766ae)** › PS4s: "📄 Read a file on a PS4" (room, file, lines → shows the lines) and
  "🛡️ Blocker settings" (Load last sent / Round2 standard, Check, tick rooms, type SEND, change log); tile More shows the
  blocker settings sha. New System check step "PS4 blocker settings: bad files refused, nothing sent (dry run)". systems.json:
  save steps done 16 Nov + "PS4 remote tools" (test).
- System check before: 37 passed · 3 to look at · 1 failed; after: 38 · 3 · 1 (the new step passes). The failed one = "side"
  timer at 50 outside requests (pre-existing, not from this); new warning today: SimplyBook 6,805 requests (biggest
  /day › getAvailableTimeIntervals) – from the booking-page work in the other chat? needs a look.
- **4:45pm first real 1.1.16 reads (Kai, took 1.1.16 at 3:50pm):** `/_ps` lists ~60 system processes but **no nanoDNS, no
  helper, no starter** – payloads sent to BinLoader don't get their own named process (GoldHEN's loader shows as threads
  "GoldHENLoader" in ScePartyDaemon pid 45 and "GoldHEN_BinLoade" in SceCloudClientDaemo pid 49; our payloads probably live
  inside such a host process – unproven). So the `dns` job will safely refuse ("its program not found by name", nothing
  changed). Kai payloads.ini: `/user/data/payloads/nanodns-ps4.elf = 1`, `/user/data/payloads/round2-boot.elf = 1`.
  nanodns.log 289 KB; last 200 lines = only Sony names, all blocked (event.api.np.km, ps4-system.sec.np.dl, ps4updptl.uk.np.
  community, rnps-crl.dl – all *.playstation.net → 0.0.0.0) + the engine allowed. The 3:29pm game-test lines are too far back for
  a 24 KB tail → idea: a search/filter option on "Read a file". Remote blocker change needs another way (proposed: apply at the
  next restart + helper tests at start and reverts by itself) – owner to choose.
### 16 Nov 2026, 5pm – where the payloads live, why the blocker can't be restarted, and two ways out (owner: "B first", then "yes lets try" + "own program?")
- **Helper 1.1.17** (released, on Kai; clean hand-over): look `/_sock` (which program holds which port) and `/_thr.<pid>`
  (threads; returned errno 2 for pid 45 – not working yet). **Result on Kai (9.00, GoldHEN 2.4b18.12):** DNS 127.0.0.1:53 is
  held by **pid 45 = ScePartyDaemon** – and so is the helper (getpid 45) → **nanoDNS, round2d and round2-boot all run as
  threads inside ScePartyDaemon** (GoldHEN's payload host). BinLoader 9090, FTP 2121 and klog 3232 are in pid 49
  (SceCloudClientDaemo). So: no own pid, signals hit all three (this is why SIGCONT at wake stopped the helper), and the
  blocker can't be stopped alone. nanoDNS re-opens its socket if it is closed (read in its code) → no live restart possible.
- **GoldHEN is closed source** (README: source private) – nothing to read; only its behaviour can be measured, as above.
- **Own program IS possible in principle:** ps4-payload-dev/elfldr (John Törnblom, GPLv3, same family as the SDK we build
  with) starts each payload in its OWN process: rfork → execve of a system daemon binary (SceSpZeroConf) → ptrace attach →
  load the ELF into it → raise its rights (authid 3801000000000013, as our helper has). SDK has 9.00 + 11.00 offsets;
  elfldr.c + pt.c compile with our toolchain (tried). Unproven under GoldHEN on our PS4s; a wrong step can crash
  ScePartyDaemon (helper + blocker + starter gone until restart + jailbreak) or panic the PS4 → test only on a free room with
  the owner there. If it works: starter spawns helper and blocker as own programs → live blocker restart (kill + start),
  helper can be restarted remotely, a crash in one doesn't take the others. **It does NOT give remote wake:** in rest mode
  every program is frozen whichever process it is in; only the PS4's standby chip listens (paired-device wake, power button).
- **Round2 blocker built (ps4-helper bbb5756, `ps4/nanodns/main.c`, out `nanodns-r2.elf` 108,792 B, NOT released, on no PS4):**
  nanoDNS 0.4 (upstream fc48a51) + settings reload: checks the file once a second, change must be stable for two checks,
  refused (current settings stay) if unreadable or no override rule or no upstream; bind/log changes need a restart.
  Computer test (Makefile.host, port 5354): add an exception → applied in ~3 s; file without the block rule → refused; file
  deleted / random bytes → refused, still blocking; good file back → applied. Still to build: delivery (helper downloads it,
  sha-checked, swaps the AutoRun file `/user/data/payloads/nanodns-ps4.elf` keeping the old one; active after the next
  restart + jailbreak) and making the `dns` job use "write file → wait for reload → test" when the blocker is the Round2 one.
- Nothing live changed in this block except helper 1.1.17 (read-only additions).
- **5:12pm – OWN PROGRAM WORKS on Kai (9.00, GoldHEN 2.4b18.12), owner chose "1".** Helper **1.1.18** (ps4-helper, released
  ps4-release 6f66139, sha e556a000…, 1,242,120 B): `ps4/spawn/` = elfldr.c + pt.c from ps4-payload-dev/elfldr a481740
  (GPLv3+; pt_attach retry and every waitpid bounded, log → /data/round2/own-spawn.log) + `r2spawn.c` (bootstrap-elf.c's
  preparation: find the ptrace check pattern "48b836…0f84190200004c8b" (+22) and NOP it, QA flags[1] |= 3, raise this
  program's caps/prison/rootdir/jaildir for the spawn, then put them back). Look `/_own` spawns the built-in test payload
  (`ps4/own/main.c`, writes /data/round2/own-test.txt every 5 s for 3 min); `/_kill.<pid>` only for that pid.
  **Result:** log: ptrace check found + switched off, QA flags 0x00 → 0x03, "spawn returned 208", rights put back. `/_ps`:
  208 = "Payload|SceSpZeroConfMai" (helper still 45, parent 38). own-test.txt counted 5 s … 120 s. `/_kill.208` → gone; helper
  kept polling, port 53 still held in 45, Sony blocked. In-memory changes on Kai until its next restart: ptrace check off,
  QA flags[1]=3 (GoldHEN had them at 0). Not tested: 11.00 · a payload that uses PS4 system libraries (our helper: UserService,
  RegMgr, SystemService, NetCtl, FsInternalForVsh – a spawned program is a "daemon" and may not load app libraries) · nanoDNS
  as own program · rest mode → wake with an own program running · a game starting while one runs.
  **Next (proposed):** `/_own` variants on Kai: (a) stock nanoDNS can't run twice (port 53) → build "starter 3" that spawns
  the blocker and the helper as own programs, tried first by hand-loading on Kai (AutoRun untouched), then rest/wake + game
  tests, then 11.00 (Vale), only then AutoRun. All rooms take 1.1.18 in quiet time – its spawn code only runs on `/_own`.
  System check before and after: 38 passed · 3 to look at · 1 failed (same; the failed one = side timer at 50 requests, not from this).
- **5:26pm – THE REAL HELPER RUNS AS ITS OWN PROGRAM on Kai (helper 1.1.19, ps4-release 4139036).** Owner said ok to
  "starter 3"; first a cheaper test with no owner work: look `/_selfown` → the helper (pid 45) reads app/current.elf, spawns
  it as an own program, writes /data/round2/own-helper.pid, lets go of the lock and watches 3 min for /data/round2/own-ok
  (written by the copy after its first 200 report; else it kills the copy and the starter relaunches a normal helper).
  Helper knows it is "own" when own-helper.pid = its pid (`g_own`; then step_aside really exits). Report has `pid`, `own`.
  **Result:** own-spawn.log: spawn returned 209 → "the copy reported to the engine - hand-over done" (15 s). ps4list: pid 209,
  own 1, full report (temp, Wi-Fi, 40 games, Sony blocked). In own mode also OK: `/_profiles` (registry + user service, all
  6 profiles), `/_save.12ae5b2a.CUSA34284.SaveData` (key service + save mount read-only: opened, listed, closed 0), `/_tail`.
  → the "spawned programs can't load app libraries" worry did NOT bite for our helper on 9.00.
  To check: report said captures 21 MB / 104 files (earlier 136 MB / 104) – real change or a counting difference in own mode?
  Kai now: helper = pid 209 (own) until the next helper update or PS4 restart (then back to the shared way); an idle old
  helper thread sleeps in 45; blocker + starter still in 45. Still to test with the owner at Kai: a game opened/closed, remote
  rest (`/_rest` from own mode) → wake. Then: starter 3 (spawns blocker + helper as own programs; falls back to BinLoader),
  11.00 (Vale). System check after 1.1.19 + the test: 38 passed · 3 to look at · 1 failed (unchanged).
- **5:33–5:37pm own-program helper (pid 209) on Kai: game + rest/wake PASSED.** Owner opened/closed God of War → still pid
  209, polling. `/_rest` from own mode worked (Kai silent 5:33:44pm); owner woke it 5:37pm → pid 209 polling again, no
  payload. BUT the wake wasn't flagged (no `woke` in the report): after our own remote rest the freeze isn't inside the
  measured 2 s sleep. → **Helper 1.1.20** (ps4-release fcbeaf9): wake also detected by wall clock vs CLOCK_MONOTONIC drift
  (> 60 s; `woke.via` = "sleep" | "clock" – unproven that the monotonic clock stands still in rest mode), and a **pop-up after
  every wake** (owner asked): "Round2 helper <v>: awake after rest mode - running and connected" / "... can't reach Round2
  yet". Kai took 1.1.20 at 5:39pm: the own-program helper exited cleanly on the update, starter relaunched it the shared way
  (pid 45, own 0). Pop-up not seen yet – owner to rest/wake Kai by controller.
- ⚠️ **5:45pm – SimplyBook requests today: 10,161 (yesterday 5,100; guideline ~5,000, "hard stop" ~10,000).** System check
  now fails on it. Breakdown (gm auto › sbBy): /day getAvailableTimeIntervals 2,002 · **gm late 984 + 925 · gm latecancel
  434 + 386 · gm extend 305 + 275 · gm insess 234** (= the System check's test-night steps) · cron ~800. Count went
  6,805 (4:27pm) → 9,584 (5:43pm) across 4 System check runs ≈ **~650 SimplyBook requests per run**. This chat ran the check
  8 times today (before/after each helper/engine change: 2:25, 2:28, 3:42, 4:27, 5:08, 5:14, 5:29, 5:41pm) ≈ half of today's
  total. No refusal from SimplyBook seen yet (5:43pm run's add/cancel steps passed; engine `auto.last.problems` empty).
  **Decision here: NO more System check runs today from this chat; PS4 jobs kept to a minimum.** To fix (owner to agree):
  the "before and after every change" rule + ~650 requests a run doesn't fit SimplyBook's allowance → (a) a light System check
  for changes that can't touch bookings (PS4 helper, control-centre-only): skip the test-night steps; (b) the test-night steps
  reuse one bookings/notes fetch; (c) the check shows "today's runs: n" and warns before a run that would pass ~5,000.
### 16 Nov 2026, 6–6:30pm – LIGHT CHECK built (owner: "yes build a mini system check that doesnt ping simplybook") + remote-wake research
- **Control centre › System check has two buttons** (round2-tv-launcher f91b69a, c665b89, 373f0eb): **Light check (no
  SimplyBook)** runs only the steps named in `LIGHT_OK` (engine + keys, one clock, 7am rule + watchdog, timers, today's
  SimplyBook count, food menu, TVs, PS4 helpers + storage, PS4 blocker settings, TV setup save, key expiry, public pages) and
  ends with "Light check: no SimplyBook requests made by this run" (compares the engine's per-caller counts `sbBy` before and
  after; timers' own requests are set aside). No clean-up call in light mode. **Full check** unchanged, but asks first when
  the day is past 4,000 SimplyBook requests and says it costs ~650. New steps are NOT in the light check until added to
  `LIGHT_OK`. Rule written into both CLAUDE.md files + round2-tv-launcher docs/system-check.md: light for changes that can't
  touch bookings (PS4 helper, TV app, control centre), full for bookings/notes/messages/payments/engine booking code.
- Found by the light check's own last step: staff `auto` cost 2 SimplyBook requests a call (it loads the session list) →
  **engine 6a0cf81 DEPLOYED** (27 bindings incl. R2, 3 timers; live was = main a912159 before): `auto` with `lite=1` returns
  heartbeat + counters only. And the 7am-rule step opens late/ hidden, which loaded its list (1 request) → late/index.html
  skips the list when opened with check=1. Engine's SimplyBook day count = `sbn:<SG date>` (resets at Singapore midnight; when
  SimplyBook's own allowance resets is not known). 6:20pm: 10,273 today.
- **Remote wake – how the references really do it (read: dhleong/ps4-waker, dhleong/playactor, chiaki-ng lib/src/regist.c +
  discovery.c; owner: "willing to commit to this feature"):**
  - Two kinds of wake key, both only accepted from a device the PS4 has REGISTERED:
    (C) Second Screen: ps4-waker pretends to be a PS4 so Sony's phone app hands over the account's credential, then logs in
    to the real PS4 on TCP 997 with the PIN from Settings › Mobile App Connection Settings › Add Device (LOGIN result 20 =
    PIN needed). Needs Sony's app + a PSN account → not for us.
    (R) **Remote Play: chiaki registers straight with the PS4** – HTTP POST to the PS4's port 9295 (`/sce/rp/regist` up to
    firmware 9.x, `/sie/ps4/rp/sess/rgst` from 10.00), body encrypted with a key made from the 8-digit PIN the PS4 shows at
    Settings › Remote Play Connection Settings › Add Device, carrying the profile's account ID (base64 of the 8 bytes,
    little-endian). The PS4 answers with RP-RegistKey. Wake = UDP 987 `WAKEUP * HTTP/1.1 / client-type:vr / auth-type:R /
    user-credential:<regist key as a number>`. **No Sony server is involved** – only the PS4 and the registering device.
  - Why it should work on our PS4s: GoldHEN lists "Remote Play Enabler"; a public guide registers chiaki on jailbroken 9.00
    with an Apollo offline-activated account (no PSN) by exactly this route; Kai's SceRemotePlay already listens on 9295
    (seen in `/_sock`). Our 15 Nov test failed because we sent a type-C key that no device had ever registered.
  - Plan: (1) owner checks on Kai, signed into User5 (the profile with an ID): Remote Play Connection Settings › Enable
    Remote Play on, Add Device shows an 8-digit number. (2) Helper learns to register (port of chiaki's regist + rpcrypt,
    AGPL-3.0, on our mbedTLS) from another PS4: `/_rpreg.<ip>.<account id>.<pin>` → regist key kept by the engine; and
    `/_wake` type R. (3) Test: Vale registers with Kai, Kai to rest, Vale wakes it. (4) If it works: helper makes the PIN
    itself (PS4 library call sceRemoteplayGeneratePinCode – to try) so no typing; a wake-key profile per PS4 (mains without an
    ID stay untouched); and decide the always-on sender for mornings (all PS4s asleep = nobody to send): candidates = a room
    TV app that stays alive in standby, one PS4 left on, or a small always-on device.
- **6pm owner on Kai (User5): Remote Play Connection Settings › Add Device SHOWS the 8-digit number** (no PSN demand) → gate
  passed. "Connect Directly with PS Vita/PS TV" stays off (not needed).
- **Helper 1.1.21** (ps4-helper, ps4-release 2ed6105; Kai on it 6:05pm): `ps4/rp/` = chiaki-ng `rpcrypt.c` unchanged
  (43728af, AGPL-3.0-only + OpenSSL exception, built with CHIAKI_LIB_ENABLE_MBEDTLS on our mbedTLS) + `r2rp.c` (regist.c's
  steps: UDP 9295 "SRC2" → "RES2"; POST /sie/ps4/rp/sess/rgst, RP-Version 10.0 = chiaki target PS4_10 for firmware 7+;
  0x1e0 filler with the aeropause at 0xc7/0x191, inner header "Client-Type: dabfa2ec…\r\nNp-AccountId: <base64 of the 8
  registry bytes>" encrypted with the PIN-derived key; reply decrypted → PS4-RegistKey (hex of the text key), RP-Key,
  PS4-Nickname, PS4-Mac). Look jobs: `/_rpreg.<ip>.<16-hex account id as in the registry>.<8-digit number>` → rpreg/key …
  (full line in /data/round2/rp.log); `/_wakerp.<ip>.<key>` → SRCH, WAKEUP ×3 (client-type vr, auth-type R, model w,
  app-type r, user-credential = key as a decimal number), SRCH after 25 s. Untested. Kai User5 account bytes
  523261706f6c6c6f. Not built yet: PIN made by the helper (sceRemoteplayGeneratePinCode), storing keys in the engine,
  control-centre buttons. Wake test needs a 2nd awake PS4 on 1.1.21 as sender: Scarlett refused the update (guests till 8pm),
  Vale/Bella off, Max/Atlas guests.
- 1.1.20's wake pop-up/detection: Kai's report shows woke n=1, slept 134 s, via "sleep" at 5:46pm (owner rested/woke it by
  controller).
- **6:07pm first try (number 43988587): helper 1.1.21 DIED with signal 10 (SIGBUS) the second it took `/_rpreg`** –
  starter relaunched it 5 s later (owner saw GoldHEN "payload received" = that relaunch) and Kai's Add Device screen showed
  error CE-35398-8 (Sony: "could not connect to your Remote Play device" = our half-made attempt). Cause: stack alignment –
  the new files were built without `-mstackrealign` (the spawn files had it). **1.1.22** (ps4-release c3fc1ee): every Round2
  helper file built with -mstackrealign, registration logs each step to /data/round2/own-spawn.log.
- **6:13pm – REGISTERED. Kai (9.00, GoldHEN, offline-activated User5, no PSN) accepted the Remote Play registration from our
  own helper** (to itself, 192.168.88.18, number 63771066): search answered → sent 157 + 587 bytes → "HTTP/1.1 200 OK", 305
  bytes → decrypted 239 → **PS4-RegistKey 83ba890f** (wake credential as a number = 2210040079), RP-Key
  0865941891647e3801071a134368530b, nickname PS4-545, MAC bc60a7e246e8. So chiaki's method + our mbedTLS port are right, the
  account ID is the 8 registry bytes as stored (523261706f6c6c6f → base64), and a PS4 can register with ITSELF.
  Kai rested by `/_rest` at 6:14pm for the wake test. No second PS4 free as sender → owner sends the WAKEUP from his laptop
  (PowerShell UdpClient, 3× to 192.168.88.18:987: "WAKEUP * HTTP/1.1\nclient-type:vr\nauth-type:R\nmodel:w\napp-type:r\n
  user-credential:2210040079\ndevice-discovery-protocol-version:00020020\n"). Result: see next entry.
- chiaki-ng's "console must be on the latest firmware" (owner's link, setup/remoteconnection) is only for connecting from
  outside through PSN – not for local registration.
- **6:22pm – REMOTE WAKE WORKS.** Kai in rest since 6:14pm (461 s); owner pasted the PowerShell line on the laptop → Kai
  switched itself on. Helper resumed by itself (woke via "sleep", report 6:22:53pm). After a network wake NOBODY is signed in
  (report users []): the PS4 waits at "press the PS button", then offers the profiles (User5 first = last used). Main
  profiles do NOT need activating for this.
- **Helper 1.1.23** (ps4-release ff651c4, on Kai 6:26pm): after a wake, if nobody is signed in, `sceUserServiceLogin(auto_login
  profile)`; report `woke.login` = result (1 = someone already in). Kai rested again 6:27pm for wake test 2 (owner pastes the
  line again). Result: next entry.
- Owner asked (6:27pm): (a) activate the main profiles so they can register? → no need (any one profile with an ID per PS4
  is enough – the key wakes the console, not a profile) and it would harm: a profile's saves are stamped with its account
  ID, changing it makes the game call them corrupted (13 Nov test on Max) – never on Max/Kai/Atlas mains (GT Sport!).
  (b) sync saves in rest mode? → not while resting (helper frozen), but wake → helper prepares → the guest presses PS and
  sees "Kai, Aliff, Karen": remote wake makes the member-profile prep triggerable from the booking (needs the always-on
  sender).
- **6:32pm wake test 2 (laptop sends): Kai woke, helper 1.1.23 signed the main profile in by itself** – report woke.login 0,
  users ["Kai"]. **6:38pm wake test 3 – FULLY REMOTE, PS4 → PS4:** Kai rested by `/_rest` (6:35pm); Vale (updated 1.1.13 →
  1.1.23 by Update now, clean) ran `/_wakerp.192.168.88.18.83ba890f`: before "620 Server Standby", WAKEUP ×3, after 25 s
  "200 Ok"; Kai's helper: woke 6:38:29pm (slept 151 s), login 0, users ["Kai"]. No laptop, no controller.
  State: Kai awake on 1.1.23, registered (key 83ba890f via User5). Vale awake on 1.1.23. Atlas (1.0.7) + Bella (1.1.14) are
  switched on per the owner but their helpers have been silent since ~6:21 / 6:23pm (Atlas 1.0.7 = old wake bug; Bella 1.1.14
  = the "alive but stuck" one, fixed from 1.1.15) → need a restart + jailbreak to pick up the new helper.
- Owner 6:31pm asks for a save test between an activated profile (User5) and a new "game save test" profile on Kai, because
  Bella's main is activated. Facts: activated → not activated is already proven with OUR method (16 Nov: Vale's Valentine,
  activated, → Kai User3, not activated – the restore keeps the receiving save's own sce_sys/param.sfo, so the stamp always
  matches the receiver). User5 has no saves; the helper can't create profiles (owner makes "User6" on the PS4, helper renames
  it); restore still needs an existing save of the game in the receiving profile (step 3 not built).
- ⚠️ **6:42pm BUG from 1.1.23's auto sign-in (owner):** after the remote wake the helper signed "Kai" in (login 0) while the
  PS4 still showed its own "press the PS button" screen; when the owner switched the controller on, that screen could not be
  left. `sceUserServiceLogin` at the login screen = profile in at service level, shell UI stuck. **Helper 1.1.24** (ps4-release
  2725793; Kai + Vale on it 6:45pm): no automatic sign-in after a wake (`woke.login` −2). Only Kai and Vale ever ran 1.1.23.
  Un-stick: Kai rested by `/_rest` 6:46pm → owner wakes it by controller. To do properly later: get past the shell's login
  screen the shell's own way (find what the PS button press calls), or sign the wake-key profile out before rest and test
  what the PS4 shows; until then a remotely woken PS4 waits at "press the PS button" – fine for prep work (helper runs,
  nobody signed in), a guest/staff presses PS and picks the profile.
- 6:55pm owner woke Kai by controller → normal again (1.1.24).
- **Owner decisions 6:55–7:02pm (change earlier rules):** each PS4 = **main profile + 4 others** (5 in all; 4 controllers,
  friends get their own names in co-op); the helper can't create profiles, so the 4 others are permanent slots that get
  renamed. **The wake key should sit on the MAIN profile** (consistent, no extra profile) → main profiles get an account ID
  after all; **all main profiles may share ONE ID** (offline anyway). Guest saves on the room PS4s may be wiped ("clean
  slate"; "kai's ps4 can delete all saves if needed") – back up a session's saves to the cloud first. The earlier rule "main
  profiles are never activated" is lifted by the owner for this; still untouched until proven: **Max (unlocked GT Sport save)**
  and the three Vue rooms' existing IDs (Vale/Scarlett/Bella – their Vue jailbreak used an Apollo-activated account).
- **7:10pm test on Kai started:** main "Kai" 12ae5b27 has 139 saves in 45 games (3.6 GB of images). Backed up (0 failed):
  Overcooked 2 CUSA10870 METASAVE, CAMPAIGNSAVE0/1/2, DLC8CAMPAIGNSAVE0 and Moving Out 2 CUSA34284 SaveData + sce_bu_SaveData
  → saves/f6ed105a…/12ae5b27/<title>/<save>/<stamp>. Then `ps4prof acct` on the main profile: **account ID
  52326d61696e3031 ("R2main01") set, result 0** (proposed shared ID for every main). Kai still signed in. Next: owner
  restarts Kai + jailbreak (the PS4 may keep the old ID until then) → open Overcooked 2 as Kai: loads or "corrupted"? If
  corrupted: try restoring the backup into it / delete + new save + restore. Then register the wake key through the main
  profile (Add Device as Kai) and repeat the wake.
- **7:15pm owner asked for a remote restart of Kai.** Helper **1.1.25** (ps4-release 843decc): look `/_reboot` →
  `sceSystemStateMgrReboot()` 3 s after the reply (refused with a game open; logged in rest.log). **Not run:** Kai could not
  take 1.1.25 – twice "download size 1047979, expected 1260864" (GitHub serves the full file, sha ok). 1,047,979 + headers
  = the 1 MB step of the download buffer → growing it to 2 MB failed = **the shared program on Kai is out of memory**: every
  helper update leaves the old helper asleep inside ScePartyDaemon (step_aside never exits there) and Kai has had ~14 updates
  since its last restart. A PS4 restart clears it. Lesson: many updates in one sitting exhaust the host; the own-program
  starter (helper really exits) is the cure; until then restart a PS4 after ~10 helper updates. `/_reboot` untested.
- **7:19pm owner restarted Kai + jailbreak; 7:21pm: "Overcooked 2 doesn't throw me a corrupted game save error".** Checked:
  starter + helper fresh since 7:19pm, main profile still has account ID 52326d61696e3031 (login flag 6, np), Overcooked 2
  (CUSA10870) was played. → **Giving a main profile an ID does NOT break its existing saves (no ID → ID), even after a
  restart.** (13 Nov's "corrupted" was the other way: a save made/stamped under an ID, then the ID removed.) So Kai/Atlas/Max
  mains can get the shared ID without wiping – still test GT Sport on Max with its cloud backup at hand before relying on it.
  Next: wake key through the main profile (Add Device signed in as Kai), wake test, then decide what to do with User5's key.
- 7:25pm owner: Overcooked 2 shows the OLD progress (about stage 2-6) → confirmed, saves intact under the new main ID.
- **7:26pm Kai registered through the MAIN profile** (Add Device as "Kai", number 72806180, account 52326d61696e3031):
  **regist key e55667bb** (RP-Key ec18392dd5814c1f0c7c877f87452535). **7:33pm wake with it, Bella → Kai** (Vale's job was
  refused – guests till 10pm; Atlas + Bella were restarted by the owner and took 1.1.25 by themselves): 620 Standby →
  WAKEUP ×3 → 200 Ok; Kai's helper woke 7:33:15pm (slept 276 s), nobody signed in (as expected without auto sign-in).
  Kai now holds two keys (User5's 83ba890f, main's e55667bb); whether the old one still works was not checked.
  Kai on 1.1.25 (updates work again after the restart). Rooms on 1.1.25: Kai, Atlas, Bella; Vale 1.1.24; Scarlett 1.1.15,
  Max 1.1.14 (guests).
### 16 Nov 2026, 7:40–8pm – remote wake becomes a feature (trial): keys in the engine, buttons, early-bird morning wake
- Owner: wake ONLY works from rest mode (a PS4 switched off / power cut needs a manual start + jailbreak). Trial rule (7:40pm):
  "in the morning we turn on the first room that has bookings" → that PS4 wakes the rooms with an EARLY-BIRD booking.
  Also asked: phone as the wake sender when on the shop Wi-Fi → NOT possible (a browser page can't send the UDP wake);
  wakes go through an awake PS4. Buttons wanted: wake all, wake early-bird, sleep all.
- **Engine 5e7a1bc DEPLOYED** (27 bindings incl. R2, 3 timers; only my two commits since 6a0cf81): kv `ps4wake`
  {console: {key, mac, acct, at}} – filled automatically when a `/_rpreg` look job returns `rpreg/key` (matched by the address
  in the job) or by staff `ps4wakekey`; staff `ps4wake` id=<console> | `all` | `early` → picks an awake, linked PS4 with helper
  ≥ 1.1.21 as sender, look job `/_wakerp.<sender subnet>.255.<key>;…` (broadcast, so DHCP changes don't matter; job skips the
  guests check – `nobusy`); `early` = sessions today starting 11:00 (one sessDay look = 2 SimplyBook requests per press).
  **Morning trial** `ps4MorningWake` in the helper poll: 7:00–11:15am, once a day (kv `ps4wakeRun` {day, by, rooms, booked,
  note}), only from a PS4 whose helper started or woke within 15 min (so one left on overnight doesn't fire at 7am), wakes
  early-bird rooms that have a key and are asleep. ps4list carries `wake` per PS4 and `wakeRun`.
- **Control centre 6368df4:** PS4s › buttons "⏰ Wake early-bird rooms", "⏰ Wake all", "😴 Sleep all" (rest mode to every PS4
  that is on; rooms with guests / a game open stay on), "⏰ Wake" on an offline registered tile, wake status under More, last
  morning wake line. System check step "PS4 remote wake: refuses without a key, nothing sent" (also in the Light check).
- Kai's key stored (e55667bb, main profile). **Only Kai is registered** – the others need the one-time registration
  (Add Device number, or the helper making it: not built). Light check after: 13 passed · 2 to look at · 2 failed (the same
  two: side timer at 50, SimplyBook count today). Not tested end to end: the group buttons and the morning trigger.
- **7:53pm ATLAS registered.** Main "Atlas" 17d81365 had no ID (5 profiles: Atlas, User1–4, none activated) → `ps4prof acct`
  52326d61696e3031 (the shared main ID, result 0), then `/_rpreg` with the owner's number 81519385 straight away – accepted
  WITHOUT a restart: **key 357299b3**, nickname PS4-401, MAC 2ccc441e241f; stored by the engine automatically (ps4list wake:
  atlas, kai). Atlas's existing main saves not checked after the ID change (Kai's were fine). Not woken yet.
- **7:55pm BELLA not registered:** owner sent number 84363859, but Bella's helper (1.1.25, started 7:10pm) has been silent
  since 7:36:32pm while the PS4 is on (last job: the wake of Kai at 7:33pm, done). Tried registering it from ATLAS instead
  (`/_rpreg.192.168.88.6.284561706f6c6c6f.…` – a PS4 can register another one over the network): "no answer to the Remote
  Play search" → Bella doesn't answer on 192.168.88.6 at all. Same picture as 14 Nov evening and this morning: **Bella drops
  off the network** (Wi-Fi 56%, the weakest room) rather than a helper fault – or its address changed. To check at the PS4:
  Settings › Network › View Connection Status (address, signal) / Test Internet Connection.
- **8:05pm Bella, owner at the PS4:** address still 192.168.88.6, signal 54% on 5 GHz, Test Internet Connection passes.
  The helper checked in ONCE at ~7:58pm (while he ran the test), then silent again; a look job sent at 7:59 was never
  collected, and Atlas again got no answer from 88.6. So the helper is alive – Bella's Wi-Fi link stalls and only wakes
  briefly when the PS4 itself re-tests it. Suggested to the owner: put Bella on 2.4 GHz (Scarlett is, at 100%) via Set Up
  Internet Connection › Custom, keeping the DNS exactly as now (not "Easy" – that would reset the blocker's DNS), or cable.
  Number 84363859 not used (expired when he left the Add Device screen).
- **8:06pm BELLA REGISTERED.** Owner moved Bella to 2.4 GHz (now channel 6, signal 94–96%, was 54–56% on 5 GHz) and sent
  number 95610423. Bella's helper answered at once and registered with itself: wake key `c203a687`, nickname PS4-878,
  MAC 78c8810636c1, main profile's existing ID 284561706f6c6c6f left unchanged. Engine `ps4wake` now holds kai, atlas,
  bella. Still to watch: that Bella stays connected on 2.4 GHz (the silences were the weak 5 GHz link). Not woken yet.
- **8:10pm HELPERS GO SILENT WHILE THE PS4 IS ON (open, not solved).** Owner asked to rest Kai/Atlas/Bella for a wake
  test; the rest jobs (8:08:09) were never collected. Last check-ins: Kai 8:02:41, Atlas 8:06:14, Bella 8:06:26 – owner
  is looking at all three, on their home screens, nobody put them to rest. Vale (1.1.24) keeps checking in every 60 s.
  Earlier the same evening: Max 7:35:12, Bella 7:36:32, Scarlett 7:38:36 (Bella came back for one check-in at 7:58 when
  the owner ran Test Internet Connection, and again 8:04–8:06 after its Wi-Fi was set up anew). So **Bella's silences are
  not (only) its weak Wi-Fi** – Kai (74%) and Atlas (60%) do it too, in clusters a few minutes apart. Best guess: the
  helper is alive but stuck in a network call with no time limit – in r2tls only `getaddrinfo` (the name lookup, which
  goes through nanoDNS) has none; connect/send/read all have limits since 1.1.15. Not proven. Next: owner runs Test
  Internet Connection on Kai only; if Kai's helper comes back, read `/_ps`, `/_thr`, the nanoDNS log and rest.log, then
  fix (use the remembered engine address first / put the lookup under a time limit / a watchdog that restarts the loop).
  Remote wake is NOT reliable until this is fixed – a silent helper can't be the sender or take a rest command.
  **8:13–8:18pm:** owner ran Test Internet Connection on Bella (passed) – helper did NOT come back within 5 minutes, so
  the "connection test shakes it loose" idea is not confirmed (7:58 may have been chance). Kai/Atlas still silent, Vale
  fine. Other candidates read from the code, none proven: (1) a stop signal anywhere in the shared GoldHEN process
  (SIGSEGV/SIGBUS/… from ANY payload thread runs the helper's `on_sig` → that thread sleeps for good; the record is
  /data/round2/helper-stopped.txt), (2) a step in the main loop that blocks (running_title, update_guard, check_cmd).
  Evidence is on the PS4s' disks and survives a restart: after a restart + jailbreak read
  `/_tail.helper-stopped.txt|12;/_tail.rest.log|5;/_tail.own-spawn.log|8` and the starter's log BEFORE anything else.
  **8:20–8:25pm Bella restarted + jailbroken by the owner:** helper 1.1.25 started 8:20:08, reported and checked in at
  8:20:24 ("connected" pop-up seen) – and then NOTHING: no check-in at 8:21:25 or after, a look job sent 8:21 never
  collected. So it now freezes within the first minute, reproducibly. Its report carried the records: starter log has
  no relaunch and no stop since 7:10pm ("19:45:04 hourly: helper running"), helper-stopped.txt has nothing after 10:33am
  → **the helper is not stopped by a signal; it holds its lock and hangs** (or its thread died quietly). Not the
  own-program route (`own:0`, pid 46 = normal shared process; only Kai ever ran `/_selfown`, as a test). 1.1.24→1.1.25
  differs only by `/_reboot` (checked the diff) – so not a 1.1.25 code fault as such. What the three silent PS4s share
  and Vale (fine, 1.1.24) lacks: **Remote Play enabled + registered tonight** (Kai main key ~7:30 → silent 8:02; Atlas
  ~7:50 → 8:06; Bella 8:05 → 8:06, and after the restart within a minute). Unproven. Next test asked of the owner:
  Bella – untick Enable Remote Play, restart + jailbreak, see whether the helper keeps checking in for 5+ minutes.
  **9:30pm – picture changed, Remote Play suspicion weakened.** Owner walked into Kai's room; Kai and Bella both check in
  again (Bella NOT restarted in between – same start 8:20:08).
  · **Kai:** report says `woke {via:"sleep", sleptS:5121}` at 9:28:53 – the whole payload process stood still from ~8:03:30
  to 9:28:53 (the starter's hourly line is missing for 8:19 and came at 9:28:56 too). That is what REST MODE looks like.
  Kai had been woken over the network at 7:33pm (Bella → Kai test) – 8:03 is 30 minutes later. Reading: **a PS4 woken
  over the network that nobody uses goes back to rest by itself after ~30 min** (to confirm with the owner: was Kai's
  light orange / did he wake it with the controller at 9:28?). So Kai was probably never "silent while on".
  · **Bella:** different – its starter wrote "21:20:11 hourly: helper running" exactly on the hour, so the process was
  running, but the helper made no check-in from 8:20:24 until ~9:27. Helper thread alone stuck for an hour, then carried
  on by itself. Bella's Wi-Fi is back down to 58% (2.4 GHz, was 94% right after the change). Fits the old reading: weak
  link + a network step without a time limit (`getaddrinfo`). Fix to build: time limit / remembered address first.
  · **Atlas:** silent since 8:06:14, not looked at yet (rest? stuck?).
- **9:32pm owner confirmed Kai:** light was orange, it came up straight into the Kai profile without a PS-button press,
  and the "awake after rest mode" pop-up showed → **Kai WAS in rest mode** from ~8:03pm. Rule learnt: a PS4 woken over
  the network that nobody uses goes back to rest after ~30 min (so a morning wake must not be sent too early).
- **9:37pm HELPER 1.1.26 released** (ps4-helper 3067903, ps4-release 36a48d6) – for Bella's hour-long standstill:
  · `ps4/tls/r2dns.c`: our own DNS question over UDP, 2.5 s per server (the PS4's own servers from its network settings,
  then 127.0.0.1, then 1.1.1.1), instead of `getaddrinfo`, which had no time limit. Remembered address still the fallback.
  "Sony blocked?" in the report uses it too, against the PS4's own servers only. Computer test: `cd ps4 && cc -Wall -O2
  -Itls -o /tmp/r2dns_test tls/r2dns_test.c tls/r2dns.c && python3 tls/r2dns_test.py` (10 cases, all pass).
  · Evidence for next time: `r2_where()` notes the step the helper is in; any step over a minute gets a line in
  /data/round2/slow.log (report `log.slow`, last 6), and /data/round2/where.txt keeps the current network step so a
  fresh start logs "the run before was last in: …". Report also carries `wifi.dns`.
  · Light check before and after: 13 passed · 2 to look at · 2 failed both times – the same known items (SimplyBook
  count 11,3xx today; side timer at 50 requests; watchdog "24 hours" maths; Kaeden TV).
  · On Kai (updated by hand) and Bella (took it by itself at once): "said hello – kept" within 7 s, DNS servers read as
  127.0.0.1 (the blocker), Sony still "blocked", check-ins every minute since. **Whether it cures Bella is not proven
  yet** – the lookup being the stuck step was a deduction; if Bella goes quiet again, `log.slow` will name the step.
  Vale 1.1.24, Scarlett 1.1.15, Max 1.1.14, Atlas 1.1.25 take it at their next quiet time.
- **9:42–9:50pm FIRST WAKE TEST THROUGH THE ENGINE – Bella did NOT wake.** Bella rested remotely 9:42:45 (job done).
  9:46 staff `ps4wake id=bella` → engine picked Vale as sender (guests there; `nobusy`, only a network message) → Vale
  sent the wake 3× to 192.168.88.255 (job done) → nothing. 9:48 Kai sent it 3× straight to 192.168.88.6 → nothing; Kai's
  status question to .6 before and after: "no answer in 4 s". 9:50 `/_ddpall` from Kai (who is on the network?): Kai .18
  "200 Ok", Vale .11 "200 Ok", **Atlas .15 "200 Ok"**, nothing from Bella, Max (.23), Scarlett (.24).
  → **Bella is not on the network at all while in rest mode** – same as 14 Nov (then on 5 GHz, rest-mode boxes ticked per
  the owner's photo). The engine/button chain itself works (sender chosen, job run). So far only Kai (FW 9.00) has ever
  answered from rest; Bella, Scarlett, Vale (all 11.00) never have → to settle: is it firmware 11.00 / the PS4 model, or
  a setting (Power Save › Set Features Available in Rest Mode: Stay Connected to the Internet + Enable Turning On PS4
  from Network)? Next test: Atlas (9.00, registered) – boxes checked first – rest, then wake.
  Side note: the status question before/after a wake to the .255 address says "send failed -3" (that helper call has no
  broadcast permission) – cosmetic, the wake itself is sent with it.
  → **Atlas is ON (answers "200 Ok") but its helper (1.1.25) has made no check-in since 8:06:14pm** – this one really is
  "silent while on", 1 h 45 min and counting. Bella is left asleep; someone has to press its PS button.
- **9:55pm** owner: Bella's rest-mode boxes are correct (both ticked) – so Bella (11.00) still drops off the network in rest.
  **Max ping from Kai:** status question to .23 "no answer in 4 s", no reply to the broadcast either (answers: Kai, Atlas,
  Vale only). Max's starter wrote its last hourly line at 7:15pm and none at 8:15/9:15 → Max's payload process has stood
  still since ~7:35pm (guests till 7:30) = rest mode or switched off. A resting Kai answers "620 Standby"; Max doesn't →
  either fully off, or its "Stay Connected" box is off (14 Nov: Max also silent in rest). Asked the owner: light orange or off?
  **Atlas came back by itself ~9:54pm** and took 1.1.26 in quiet time. Its starter kept writing "hourly: helper running"
  (8:54, 9:54) and there is no wake record → like Bella: the PS4 ran, the helper alone stood still 8:06–9:54pm (1 h 48 min),
  then carried on. Two rooms, same pattern, both on 1.1.25, both resumed after 1–2 h. Both now on 1.1.26 → next time
  `log.slow` names the step. (Atlas' PS4 clock runs ~8 min fast – display only.)
  **Idle timeout? (owner asked 9:58pm) – probably not:** (1) Bella froze within a minute of a fresh start at 8:20pm with
  the owner at it (not idle); (2) Atlas answered Kai's LAN status question with "200 Ok" at 9:50pm while its helper was
  silent – the PS4's network was up; (3) the starter in the same process kept running (no suspend, no wake record).
  **Stronger clue: Atlas (8:06:14) and Bella (8:06:26) went silent 12 seconds apart** – two PS4s on different Wi-Fi bands
  (ch 36 / ch 6) with their own timers don't line up like that by chance → a shared event on the way OUT (internet,
  upstream DNS 1.1.1.1/8.8.8.8 through nanoDNS, or the engine) at 8:06, after which those two helpers stayed stuck while
  Vale's didn't. 1.1.26 now asks 127.0.0.1 with a 2.5 s limit, then 1.1.1.1 directly, then the remembered address, so a
  stuck nanoDNS/upstream can't hold it. Gap: if checks now FAIL quickly instead of hanging, slow.log won't show it →
  next helper should log failed check-ins (time, step, error, count) and report them on return.
- **10:03pm HELPER 1.1.27 released** (ps4-helper d279ede, ps4-release 7b72b92) and on Kai + Atlas (Bella asleep, takes it
  when woken; others at quiet time): /data/round2/net-fail.log – every failed engine request (time, request, step it
  failed in, error; first 5 then every 10th) + "back after N failures, M s"; in every report as `log.netfail`. Tested on
  the computer; lookup tests still pass. Light check after: same 13 passed / 2 to look at / 2 failed (known items).
  **Owner's point (10:03pm), taken as a rule:** don't make him diagnose. Every report already carries the PS4's own
  records (log.boot, stopped, slow, netfail). When a PS4 comes back after a silence, READ ITS REPORT FIRST, before
  asking the owner anything. What should have been done: step/failure records in 1.1.15 (when the time limits went in),
  and Bella's/Atlas' reports read the minute they came back (9:27 / 9:54pm). Limit: the file reader is a job the helper
  runs, so a STUCK helper can't answer it – the evidence arrives with its next report.
- **10:08pm all awake rooms on 1.1.27:** Kai, Atlas (by hand), Vale (by hand after its guests), Max (1.1.14 → 1.1.27 and
  Scarlett 1.1.15 → 1.1.27 by themselves in quiet time; Max's switch did NOT stick this time). Bella still asleep on 1.1.26.
  **Owner's control group (10:05pm):** some rooms stay NOT registered for Remote Play to isolate the silences → registered:
  Kai, Atlas, Bella; not registered: Vale, Scarlett, Max. Compare `log.netfail` / `log.slow` between the two groups.
- **10:12–10:19pm ATLAS WAKE TEST (owner asked; 9.00, registered key 357299b3) – did NOT wake.** Rested remotely 10:12:24
  (job done). 10:15 Kai asked Atlas (.15) its status: "no answer in 4 s". 10:16 staff `ps4wake id=atlas` → engine chose
  Vale as sender, sent 3× to .255 → nothing. 10:18 Kai sent 3× straight to .15 → nothing, no answer before or after.
  → Atlas, like Bella, is OFF the network in rest mode. So it is NOT firmware 9.00 vs 11.00 – only Kai has ever answered
  from rest. Atlas' rest-mode boxes have never been checked (14 Nov note: "Max + Atlas boxes off?") → owner to check
  Settings › Power Save Settings › Set Features Available in Rest Mode on Atlas (Stay Connected + Turn On from Network)
  and compare with Kai's (Kai also has Supply Power to USB = Always). If Atlas' boxes are on too, the difference is
  something about Kai itself (model, how it joins the Wi-Fi) – ask for the model number (CUH-xxxx) of Kai, Atlas, Bella.
  Bella woken by the owner ~10:13pm and took 1.1.27 by itself. All six on 1.1.27; no `log.netfail` lines anywhere at
  10:19pm. Atlas left asleep (needs its PS button).
- **10:30pm owner: Atlas had "Stay Connected to the Internet" OFF** – he ticked it and "Enable Turning On PS4 from Network".
  **Re-test 10:30–10:39pm: still NOT reachable.** Rested 10:30:35; Kai's status question + broadcast at 2.5, 3.5, 6 and
  8 min in rest: never an answer from .15 or Atlas' hardware id; engine wake via Vale at ~4.5 min (.255, 3×) → not woken.
  So settings were wrong but are not the whole story. Only Kai answers from rest.
  Hardware ids (from the broadcast answers / registration): Kai BC60A7E246E8, Vale BC60A7929148 (same batch as Kai),
  Max F8461C4755FE, Bella 78C8810636C1, Atlas 2CCC441E241F, Scarlett 709E294E9D39 (Scarlett is now at .88.4).
  Next ideas: Vale rest test (same hardware batch as Kai, no registration needed for the status question) · Atlas'
  "Supply Power to USB Ports" (Kai = Always) · model numbers (CUH-) of all six. Atlas asleep again (PS button).
- **10:45pm owner matched ALL rooms' Power Save settings to Kai's. 10:46 rested Vale, Max, Scarlett, Atlas, Bella (Kai
  awake as the listener). At 3.5 and 5 min in rest, Kai's broadcast got "620 Standby" from VALE (.11), MAX (.23) and
  SCARLETT (.4)** – first time any PS4 besides Kai answered from rest. Firmware no factor (Vale/Scarlett 11.00, Max 9.00).
  **ATLAS and BELLA still silent** (status to .15 / .6: no answer). They are the two with the weakest Wi-Fi
  (Atlas 52–62% ch 36, Bella 56–74% ch 6) – but Kai answers at 64–74%, so not proven. Next: which mesh unit / band each
  is on (router app), or a cable test on one of them. Vale/Max/Scarlett are reachable but NOT registered (owner's
  control group) so they can't be woken yet. All five asleep at 10:52pm – PS buttons.
- **11:05pm VALE WOKEN REMOTELY – second room proven.** Owner opened Remote Play Connection Settings › Add Device (NOT
  Mobile App Connection Settings – that one is Sony's phone-app pairing and needs PSN; owner opened it first by mistake).
  Vale registered with itself through its main profile Valentine's EXISTING ID acee61706f6c6c6f (unchanged): wake key
  `b879a329`, PS4-845, MAC bc60a7929148; engine stored it. Rested 11:01:17; Kai's status question at 11:03 → "620 Server
  Standby"; staff `ps4wake id=vale` 11:04:21 → engine picked Kai as sender → 3× to .255 → Vale's report 11:05:46:
  woke (slept 239 s), nobody signed in (the "press the PS button" screen, as expected). Registered now: Kai, Atlas,
  Bella, Vale; unregistered control group: Max, Scarlett. **Rule learnt: a PS4 is wakeable only if Power Save › rest-mode
  settings match Kai's (Stay Connected + Turn On from Network + USB power Always) AND it answers on the network in rest
  (Atlas and Bella don't yet).**
- **11:09pm Scarlett registered** (main's existing ID 526a61706f6c6c6f, key `a2878fc6`, PS4-599). **11:15pm owner chose B:
  Max's MAIN profile got the shared ID 52326d61696e3031** (ps4prof acct, "acct set: 0"; before: no ID, flag 2). Two
  numbers refused ("HTTP 403 reason 80108b0") until the owner RESTARTED Max – then registered (key `f8b9cd46`, PS4-350).
  **Rule: after giving a profile an ID, restart before registering if the PS4 refuses with 403.** GT Sport files in Max
  main (CUSA02168: sdimg_local-data, sdimg_sce_sdmemory, backup copy) still there, untouched – owner to open GT Sport on
  Max once to confirm it still loads with the new ID (cloud backup exists).
- **11:21–11:44pm FULL SLEEP/WAKE CHECK (owner: "make it bulletproof", away):**
  Round 1 – sender Kai: rested Vale, Max (Scarlett already resting) → standby answers from Vale, Max, Scarlett →
  `ps4wake id=all` → Max and Scarlett back within ~2 min. Vale DID wake (starter's line 23:28:01) but its Wi-Fi didn't
  come back – net-fail.log: "connect failed" from 23:28:12 every 8 s (#10 at 23:30:48), Wi-Fi moved from 5 GHz ch 36 to
  2.4 GHz ch 6 – and it went back to rest ~23:33 before reaching the engine.
  Round 2 – sender Scarlett: rested Kai, Max → standby from Kai, Max → `ps4wake id=all` → Kai, Max AND Vale back.
  So all four registered+reachable rooms (Kai, Vale, Max, Scarlett) wake with "Wake all", from two different senders.
  Atlas and Bella: never answered, never woke (Wi-Fi in rest – open). New lesson from net-fail.log: after a wake the
  Wi-Fi can take seconds (Scarlett 9 s) to minutes (Vale) to come back, and a woken PS4 with no network can fall back to
  rest within ~5 min. Light check after: same as before (13 / 2 / 2, known items). systems.json item added (e9e754f).
  Left at 11:44pm: Kai, Vale, Max, Scarlett awake on "press the PS button" (expected to rest by themselves ~30 min);
  Atlas, Bella asleep since 10:47pm.
