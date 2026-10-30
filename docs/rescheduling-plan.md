# Rescheduling online bookings – plan (NOT switched on)

Status 30 Oct 2026: guests **cannot** change or move a booking online. The "View your booking" page only shows the
booking and the TV-message button. Rescheduling stays on WhatsApp until the owner signs off the rules below.

## What the engine already keeps per booking (enough to price a reschedule later)
`worker/round2-book.js`, Durable Object `holds` row (`data` JSON):
- `q`: room/unit, date, start, hours, `peak` (Fri–Sun + public holidays), `earlyBird`, `base`, `ext`, `total` paid
- `done.bookingId` / `done.code`: the SimplyBook booking (move it with admin `editBook`)
- `agreed`: when the guest ticked T&C + "non-cancellable, non-refundable"
- To add when building: `reschedules` (count), `history` [{from, to, fee, diff, paidAt, pr}]

## Rules proposed (owner to confirm)
1. **Off-peak → peak:** guest pays the price difference + the reschedule fee.
2. **Peak → off-peak:** no refund of the difference (and no credit, unless the owner wants goodwill F&B credit).
   Guest pays only the reschedule fee.
3. **Fee ladder:** 1st reschedule $15, 2nd $35. Suggest a **cap of 2**; after that it's a new booking.
   (If no cap: +$20 each time: $15, $35, $55 …)
4. **Notice:** only up to 24 h before the original start (closer than that the room can't be resold).
5. **Window:** new date within 60 days of the original date.
6. **Early bird:** leaving the 11 am early-bird start → pay the normal price difference; moving into an early-bird start →
   cheaper, so no refund (rule 2).
7. **Extensions** priced at the new day's rate; fewer hours than paid → no refund.
8. **Room change:** upgrade (Netflix → Deluxe → VIP) pays the difference; downgrade no refund.
9. **Order of events:** quote → hold the new slot (10 min, same as booking) → one HitPay link (fee + difference) →
   paid → `editBook` the SimplyBook booking → release the old slot → email/confirmation page updated.
   The old slot is never released before the new payment lands.
10. Who: staff first (WhatsApp, a staff page that does steps 9 for them), self-serve on "View your booking" later.
