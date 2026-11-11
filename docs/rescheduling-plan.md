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
