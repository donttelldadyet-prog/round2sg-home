# Rescheduling online bookings – plan (NOT switched on)

Status 30 Oct 2026: guests **cannot** change or move a booking online. The "View your booking" page only shows the
booking and the TV-message button. Rescheduling stays on WhatsApp until the owner signs off the rules below.

## What the engine already keeps per booking (enough to price a reschedule later)
`worker/round2-book.js`, Durable Object `holds` row (`data` JSON):
- `q`: room/unit, date, start, hours, `peak` (Fri–Sun + public holidays), `earlyBird`, `base`, `ext`, `total` paid
- `done.bookingId` / `done.code`: the SimplyBook booking (move it with admin `editBook`)
- `agreed`: when the guest ticked T&C + "non-cancellable, non-refundable"
- To add when building: `reschedules` (count), `history` [{from, to, fee, diff, paidAt, pr}]

## Rules (owner decided 30 Oct 2026: 3 h cut-off, same fee for same-day time changes; rest proposed)
1. **Off-peak → peak:** guest pays the price difference + the reschedule fee.
2. **Peak → off-peak:** no refund of the difference (and no credit, unless the owner wants goodwill F&B credit).
   Guest pays only the reschedule fee.
3. **Fee ladder:** 1st reschedule $15, 2nd $35. Suggest a **cap of 2**; after that it's a new booking.
   (If no cap: +$20 each time: $15, $35, $55 …)
4. **Notice (revised after owner feedback):** a move is allowed until **3 h before the original start** (owner, 30 Oct) – also
   same-day time changes, which cost the **same fee** as any other move (no discount). The shop loses nothing (the full price is already paid, no refunds); the fee covers the hassle.
   The **new** slot must start at least **1 h from now** (time to travel + room prep) and be free on the board.
   Moving **earlier** (e.g. to today when the booking was 5 days away) is fine on the same terms.
5. **Window:** new date anywhere from 1 h from now up to 60 days after the original date.
6. **Early bird:** leaving the 11 am early-bird start → pay the normal price difference; moving into an early-bird start →
   cheaper, so no refund (rule 2).
7. **Extensions** priced at the new day's rate; fewer hours than paid → no refund.
8. **Room change:** upgrade (Netflix → Deluxe → VIP) pays the difference; downgrade no refund.
9. **Order of events:** quote → hold the new slot (10 min, same as booking) → one HitPay link (fee + difference) →
   paid → `editBook` the SimplyBook booking → release the old slot → email/confirmation page updated.
   The old slot is never released before the new payment lands.
10. Who: staff first (WhatsApp, a staff page that does steps 9 for them), self-serve on "View your booking" later.

## Decisions with the owner, 11 Nov 2026 (supersede the rules above where they differ)
- Fees: 1st move S$15, 2nd S$25. Max 2 moves (free grace moves count). Then the button greys out ("No moves left").
- Cut-off: 3 h before the current start (so also closed during and after the session; extensions stay with staff In session +1h). Checked in the engine, not only the page. Button greys out with the reason.
- New slot: any free slot (subject to availability), no far-future limit, 15-minute start steps. Room and length changes allowed.
- Price difference: guest pays new price − paid (never below $0); cheaper parts (smaller room, off-peak, fewer hours) are shown as "not refunded". Strict "each dearer part in full" (b) was offered; owner hasn't chosen – demo uses net (a).
- 15-min grace: no change fee within 15 min of booking or of the last move (window restarts after a move); differences still paid.
- WhatsApp/staff bookings: staff copy a guest link from Add a session / Bookings and send it; the guest then reschedules themselves (staff record what was paid). Late sessions past the online hours stay with staff.
- Staff side: Bookings tab (search + day view) with Move; "send the guest a change email" ticked by default; waive fee = owner only.
- Guest side: round2.sg gets "Already booked? ▣ LOAD SAVE ›" under the two buttons, plus a compact room-coloured "SAVE FOUND · Vale · Fri 13 Nov · 4pm–7pm · Manage ›" strip under the header on devices that opened their booking before.
- Manage page: Name first on the ticket; Reschedule / TV message / Receipt / Calendar; save history; step 1 = week view (+ month calendar), all rooms with that day's availability, hour strip + quarter buttons, YOURS marks, live Now → New tickets in room colours with the breakdown; step 2 = review and agree.
- Owner stats: Bookings › Changes (reschedules, fees, grace moves, staff moves, TV message edits, cap hits, reasons).
- Later (keep in mind): put the guest's NAME in the SimplyBook confirmation email; receipt line; new rules text everywhere (T&C, booking page, FAQ, email, Wix terms).
- Demo: branch my-booking-demo, demo/manage.html and index.html?demo=save.

## FINAL RULES (owner + admin, 11 Nov 2026, 11:47pm) – these replace the fee/cut-off lines above
Data behind it (SimplyBook 1 Aug–10 Nov, 655 bookings, notes not included): 69% of bookings are made within 3 days of the
date (44% within 1 day); a slot still free 3 days before sells later ~20–28% of the time; slots sell 24–34% overall,
early bird 33% weekday / 44% weekend (most filled). Engine read: gm `bookstats` (staff, read-only).
- Max 2 moves. Under 3 h before, during and after: closed. Under 24 h: same-day upgrades only (later time, bigger room, more hours).
- Protected window: starts 11am–2pm (early bird + its block). Moving INTO it only 3+ days ahead. 2:15pm+ any time (rules above).
- Fee (12 Nov, replaces 30%/40%): $5 (3+ days ahead) or $10 (under 3 days) + 10% of the 3-hour price of the current booking
  (extra hours not counted), rounded to $5; +$5 if the current booking is Fri–Sun and the move is under 3 days; lowest fee
  $15 (owner, 12 Nov – early bird $15 flat, to discourage early-bird moves); 2nd move +$10. In dollars (3+ days / under 3 days,
  Fri–Sun under 3 days in brackets): Early bird $15/$15 · Netflix $15/$15 ($20) · Deluxe $15/$20 ($25) · VIP $15 (Fri–Sun
  $20)/$20 ($30). Every move profits by the measured resale figures below.
- Price: new slot dearer → pay the difference (net, option a); cheaper → no refund. EB price kept only if it stays at 11am.
- 15-min grace: no fee within 15 min of booking or of the last move; differences still paid.
- Which rule applies is set by how far away the CURRENT booking is at the moment of the change (not where it moves to).
  E.g. booked 9 days out → moves to tomorrow 11am: 3+ days rule (any free slot). The new start must be 3+ h from now.
- No lost sessions (12 Nov, replaces "gap 0 or ≥195 min"): a move is blocked only if it leaves fewer sellable 3 h sessions
  (180 min + 15 cleaning) in that free stretch than it could hold before. E.g. Kai free 11am–3:30pm can hold one session
  either way, so 11am–2pm (or 11am–3pm) is allowed; on an empty day 2pm is blocked (it would cost a session).
- RESALE BY LEAD TIME (measured 12 Nov, SimplyBook 1 Aug–10 Nov, 822 records; a 3h slot still free X before its start that
  later sold): 7 days 38% · 3 days 32% · 2 days 29% · 1 day 24% · 12 h 15% · 6 h 13% · 3 h 8%. Early bird falls fastest
  (1 day 16%, 12 h 7%). Peak ~3–5 points higher than off-peak. Rough (counts any later booking overlapping the slot).
  Cost of a move ≈ (resale chance of the NEW slot − resale chance of the OLD slot) × price: 3+ days ≈ 0–8%,
  under 3 days ≈ 5–14%, under 24 h (same-day only) ≈ 0 – the old and new slots are equally hard to resell.
- Trip-wires (owner stats; review the rules if one is hit): over 15% of bookings moved · over 50% of moves under 3 days ·
  over 33% of moves into Fri–Sun evenings · freed-slot resale under 15% · average profit per move at or below $0.
- Waiting list, S$10 release incentive, 55/45 split fees: discussed and rejected. Flat % fees (30/40, 20/30) replaced by the hybrid.

## DEMAND-BASED FEE (owner, 12 Nov – ON TEST in the demo; replaces the per-room table above once agreed)
Guest sees the fee only (no demand labels – owner, 12 Nov: "quiet/busy" read as predatory): UPGRADE $5 · $15 · $25 · $35,
"Popular times cost more to move into". Internal levels: UPGRADE (pricier slot, move costs the shop ≤ $5 after the difference;
not for early-bird bookings, which stay $15+) · QUIET $15 · BUSY $25 · VERY BUSY $35 (expected cost ≤ $10 / ≤ $20 / more),
2nd move +$10, free within 15 min, price difference on top. Fee shown on each room card and start time before choosing. Guest wording (rules card): fee depends on how likely someone
else would have booked the new slot – from past bookings for that room, day and time, and how full that room already is.
First test (12 Nov): same-room date changes and upgrades come out QUIET; VERY BUSY appears for late moves into busy evenings
on fast-filling dates (e.g. Vale Fri 13 → Sat 14 7:30pm).
Fee depends on the slot they move INTO (and the one they leave): fee ≈ expected lost sale of the new slot − expected resale
of the freed slot − price difference paid, + ~$5, banded into 3 levels (low / medium / high) so guests see round numbers.
Measured 12 Nov (1 Aug–10 Nov, rough): rooms differ a lot – free slot 3 days out still sells: Vale/Scarlett 58%, Kai 42%,
Bella 32%, Max 27%, Atlas 12% (Atlas also blocked by Vale). Max has 2+ bookings on only 18% of days (Scarlett 55%).
Time of day matters in busy rooms: 12 h before, evening (5:15–8:15pm) still sells 38%, 2:15–5pm 29%, 11am 6%; in quiet rooms
~11–12% at any time. So demand level = room × day type × time band. Costliest moves: quiet room → busy room late ($14–35),
busy-room morning → evening same day ($16–32; early bird covered by the price difference). Same room new date: $5–9.
Why it wins (owner, 12 Nov): genuine moves are treated fairly – someone who got busy 2 days before and moves to a quiet date
pays $15; moving into a busier time costs more, automatically. Same-room time changes in quiet rooms (Max, Bella) stay $15.
Demand must follow trends:
- Nightly recalculation from the last ~8 weeks, recent weeks weighted more (last week ≈ 2× week 8).
- Unit: room × day type (Mon–Thu, Fri, Sat, Sun, public holiday + eve; school holidays optional) × time band.
- Live pace PER ROOM: bookings already on that room + date vs normal by now (room's average bookings/day × share usually
  booked by that many hours before: 7 days 15%, 3 days 31%, 1 day 56%, 12 h 70%). About 2× normal → "Kai filling fast"
  (demand ×1.25); well under → "quiet day for Kai" (×0.8). Only within 7 days. Vale + Atlas paced together (they block
  each other). In the demo since 12 Nov.
- Guardrails: 3 levels, change only on a clear shift, at most once a day; new/reopened rooms (Kaeden) start medium until
  ~4 weeks of their own data; owner can pin a slot/date busy or quiet in the control centre.
- Control centre › Bookings › Demand: week grid per room coloured low/medium/high with the reason.

### Engine stress test (demo owner view, 12 Nov)
Every allowed move for made-up bookings (6 rooms × 11 days × 4 start times × 2 clock times → ~400k–740k moves) checks:
never loses more than $5 · no 15-min step jumps two fee levels · Max/Bella never $35 · upgrades cost the shop ≤ $5 · early-bird
bookings never get $5. First run failed (8,624 losing moves, up to $51; 221 quiet-room $35s). Fixes it led to:
- 11:15am–2pm slots valued as part early-bird sale, part full-price afternoon sale, each at its own rate (2pm leans afternoon).
- Vale + Atlas treated as one space (taking either blocks both; freeing either reopens both).
- Upgrade tolerance: a pricier slot counts as an upgrade if the move costs the shop ≤ $5.
After: all checks pass (live calendar, 738k moves): fees $5 29% · $15 61% · $25 6% · $35 4%; 329 moves a few dollars short,
none by more than $5. Build: the same test becomes a System check step for the engine.

### Early bird by room + staff load (owner, 12 Nov – in the demo)
- 11am early bird is the same price in every room, so guests take the big rooms first: filled on Max 74% of days, Kai 57%,
  Atlas 41%, Bella 38%, Scarlett 33%, Vale 15% (Max booked first on most multi-booking mornings). Demand at 11am is per room.
- Vale/Atlas turnaround (owner, 12 Nov – NOT general staggering: the team wants every room full, cleaned in one wave, then rest).
  The twins share one booking calendar. If the session just before (or after) the new one is in the SAME twin room, that room
  must be turned around in 15 min; if it's in the OTHER twin, the used room can be cleaned last, calmly. Rule: same twin
  back-to-back → one fee level up and never an upgrade; other twin → counts as an upgrade more easily (move costs ≤ $10).
  E.g. Sun 15, 11am guest in Vale: 2:15pm Vale $25, Atlas $15 (or Upgrade $5 + $30 for a Netflix guest). Engine reads which
  twin each booking is really in from SimplyBook (the public free-slot feed doesn't say).
- "Quiet rooms" in the stress test are worked out from the data each run (not a fixed list) – if nudging fills Bella, Bella can reach $35.

### SimplyBook request budget – lesson (12 Nov, 5am)
System check failed "SimplyBook requests today": 8,637 by 5am (limit ~5,000; yesterday 5,201). 7,562 were /day
(getAvailableTimeIntervals + getToken) from the reschedule demo's live calendar – each reload pulled 14 days × 7 rooms, and
the engine only remembers a day for 60 s. Demo fixed: live calendar off by default, next 2 weeks only, cached 30 min per
browser. For the build: the reschedule picker must not call /day per day viewed without a longer cache (e.g. 5–10 min for
dates 2+ days out) – one guest browsing a month would cost ~200 requests. The Vale/Atlas "which twin" info (owner chose to
add it now) was postponed until the request count is back to normal; it must come from the engine's own mirror records
(kv mir:<bid>), not extra SimplyBook calls.
- Fix (12 Nov, 5:15am): the demo's default calendar is a snapshot of real bookings from gm `bookstats` – ONE SimplyBook
  request (getBookings) for a whole month, vs ~7 per day per view via /day. It also shows which Vale/Atlas entry is the real
  booking and which is the automatic block (system client), so the twin rule works with no engine change. Most twin bookings
  are really in Atlas (e.g. Sat 14 11am, Fri 13 both, Sat 21 4:30pm). Snapshot = confirmed bookings only (not staff time
  blocks or payments in progress). For the build: the reschedule engine should read one getBookings per day range, cached,
  and take the real twin from it.

### Control centre (owner, 12 Nov) – build with the real reschedule
- Top tab "In session" → "Bookings": Today (was In session) · Add a session · Move a booking (new, staff) · Rescheduling (new,
  owner: switch, beta stats, trip-wires, demand grid, Vale/Atlas view, stress test). Rename lands together with the new pages.
- Move a booking (staff): same picker and the same demand-based fee the guest would see on each slot. Staff may WAIVE or lower
  the fee (owner: staff decide – e.g. goodwill, or a guest who booked the wrong date and turns up at the door). Waive needs a
  one-tap reason (guest mistake / goodwill / our fault / other); every waive is logged with who and why, and shows in
  Rescheduling (count + $ waived this month).
- Staff can move inside the online limits (under 3 h, same-day-only, 11am–2pm lock) with a warning, since they can see the
  room is free – e.g. the wrong-date guest at the door moved into a free room right now.

## Control centre (owner, 12 Nov – for the build)
Top tab "In session" → renamed **Bookings**: Today (was In session) · Add a session · **Move a booking** (new, staff) ·
**Rescheduling** (new, owner: switch, beta stats, trip-wires, demand grid, Vale/Atlas view, stress test). Rename + both pages
ship together.
Move a booking (staff):
- Same picker as guests, showing the same demand-based fee on every room and time.
- Staff decide: charge the fee, or waive it (any staff – owner, 12 Nov). Waives are logged (who, why, amount) and shown in
  the owner's Rescheduling stats.
- Use case: a guest booked the wrong date and turns up at the door.
- Taking payment for fee + difference: (a) show a HitPay QR on the staff screen for the guest to scan and pay, or
  (b) take it on HitPay's Tap to Pay on iPhone, then tick "Paid in shop" with the amount. The move goes through once paid
  (or straight away if waived / nothing to pay).

## LIVE 12 Nov: staff Move a booking (control centre first; guest side stays in the demo)
Engine (gm, staff code): mvday (guest bookings of a shop night) · mvfree (free starts per room for the booking's length; the
day's bookings + notes, no extra availability calls) · mvquote (clash check + demand fee + price difference) · mvpay (HitPay
PayNow QR: payment_methods[]=paynow_online, generate_qr → qr_code_data.qr_code) · mvlink (normal HitPay link for WhatsApp) ·
mvstatus (the page polls; completes the move when paid) · mvnow (waived / nothing to pay / paid in shop) · mvlog.
Webhook /move/hitpay (signed) completes paid moves even if the page is closed. The move: cancel its own Vale/Atlas block →
SimplyBook editBook (new service for off-peak/peak/early bird, unit, times, same guest + fields) → mirror re-blocks → guest
messages follow (onSb) → Auto wrap-up → the guest's online booking record shows the new room/time (paid amount kept) →
mvlog. Paid but failed → staff alert (move by hand or refund). +h (EXT) extensions move with the booking (owner, 12 Nov):
free check covers the extra time, the EXT note moves to the new room/time with its text rewritten ("EXT till … · name"),
the Vale/Atlas twin EXT note is redone; if the note can't follow, the move stands and staff get an alert.
Control centre: top tab "In session" renamed Bookings; pages In session · Add a session · Move a booking · Rescheduling.

### Guest side after a move (owner, 12 Nov – in the demo; for the build)
- Same kind of room, pricier only because it's peak → "PEAK TIME $5" (not "Upgrade"); bigger room → "UPGRADE $5". Staff
  page says "moving to a peak time" / "upgrade to a bigger room".
- After a move the booking page IS the new slot: new room, date, time and the new room's colour (live: holdMove updates the
  booking record the page draws from, so staff moves already do this).
- "Your save history" lists the booking and every move (from → to, when, fee + difference) with a Receipt for each.
- Reschedule receipt: From → To in the room colours, change fee, price difference, total, ref, Save as PDF. The booking's
  own receipt lists the original payment plus each paid move. Build: /receipt and /r/<code> show the moves (d.moves).

### Fee shown in two parts (owner, 12 Nov – demo + live staff page; replaces the $15/$25/$35 levels)
"A $25 fee on a Deluxe room looks random; it should read as an upgrade plus an in-demand fee."
- The move: MOVE $15 · UPGRADE $5 (bigger room, pays the difference) · PEAK TIME $5 (same kind of room at a peak time,
  pays the difference; purple, upgrade blue). Early-bird bookings: always MOVE $15.
- POPULAR TIME +$10 / +$20: what the move part doesn't cover of the expected lost sale (> $5 over → +$10, > $15 over → +$20).
  Vale/Atlas straight after a session in the same twin room +$10; the other twin room −$10 only where that still covers it.
- Totals stay $5–$35. Stress test (821,692 moves): $5 29% · $15 68% · $25 3% · $35 1%; never loses more than $5; all pass.
- Picker rooms grouped by tier like the booking page (sofa / gem / crown, names in room colours, colour bar, room icons).

### Fee methods on the real snapshot (12 Nov, 4pm clock; 14 upcoming guest bookings × every allowed move over 2 weeks = 18,792 moves)
| Method | Average fee | Spread |
|---|---|---|
| A · levels $15/$25/$35 (+$5 upgrade only if ~free) | $14.75 | $5 7% · $15 88% · $25 4% |
| B · move ($15 / $5) + popular +$10/+$20 | $14.38 | $5 7% · $15 92% · $25 1% |
| C · B with popular in $5 steps, $15 floor, $5 off | $14.36 | $5 7% · $15 92% · $20–25 1% |
Most real moves are $15 under every method; the methods differ only on late moves out of / into popular evenings
(e.g. Atlas Fri 13 7:15pm → Scarlett Sat 21 8:15pm: A $25 → C $15; Max Mon 16 2:30pm → Atlas Sat 14 2:45pm: A $35 → C $25).
Early-bird bookings: $15 under all. Best value box shows per room type after a day is picked.
