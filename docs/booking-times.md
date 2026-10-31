# Booking times: guest session end vs SimplyBook end (read this before touching anything time-based)

Written 30 Oct 2026. Applies to every Round2 system that reads or writes a booking's times: the booking engine
(round2sg-home `worker/round2-book.js`), the Make mirror scenario, guest message links, the control centre, the TVs,
and any future automation (for example an automatic "That's a wrap" message).

## The rule

Every room needs **15 minutes of cleaning after each booking**. SimplyBook handles this with each service's
"buffer time after" = 15 min (`buffertime_after: 15` on services 28, 29, 32, 33, 34, 35, 36, 37, 38), and it **stores the
buffer inside the booking**:

| | Guest session (what the guest paid for) | SimplyBook booking (`start_date` – `end_date`) |
|---|---|---|
| 3 h from 11am | 11:00 – 14:00 | 11:00 – **14:15** |
| 5 h from 4pm | 16:00 – 21:00 | 16:00 – **21:15** |
| 3 h from 8:15pm (last start) | 20:15 – 23:15 (closing) | 20:15 – **23:30** |

So: **guest end = SimplyBook `end_date` − 15 min** (or `end_date − event_buffertime_after` minutes; admin
`getBookings` returns `event_buffertime_after` on every booking, so read it from there, don't hard-code it).

## Which end to use

| Use the GUEST SESSION end (end_date − buffer) | Use the SIMPLYBOOK end (with cleaning) |
|---|---|
| "10 minutes left" (`wrapup`) → guest end − 10 min | Whether the room is free / availability |
| "That's a wrap" (`timeup`) → **at the guest end, before the cleaning time, never after** | Mirror bookings (Vale ↔ Atlas) – copy `end_date` as is, so the cleaning time is blocked in both |
| What the guest sees: booking page, receipts, confirmations, TV "ends at" | Creating a booking through the API (end must include the 15 min) |
| Guest message links: when a message stops showing / the link closes | |
| Hours played, prices, extensions | |

## Where each system stands (30 Oct 2026)

- **Booking engine** (`worker/round2-book.js`, `finalize`): the guest picks a session (e.g. 15:00–20:00). The engine books
  SimplyBook to session end **+ 15 min** (`eB = start + hours*60 + BUF`), like SimplyBook's own bookings, and writes a
  booking comment "Guest session 15:00–20:00 (the SimplyBook end, 20:15, includes 15 min cleaning)". Everything the
  engine shows the guest uses the session times (`q.time`–`q.end`). Before this date the engine booked without the
  buffer (test booking 3066 was 11:00–16:00) – only test bookings were affected.
- **Free-slot board** (`/day`, `gapsFor`): SimplyBook's free intervals already exclude the cleaning of existing bookings;
  the engine also requires 15 min after the NEW session (`bufTo`), except a session ending at closing (23:15), which is
  why 8:15pm is a valid last start.
- **Make mirror** (scenario 6990225): copies `start_date`/`end_date` unchanged – correct, the mirror must block the
  cleaning time too.
- **Guest message links** (Make "GUEST MESSAGE LINKS", docs/guest-messages.md): `end`/`until` = start + 3 h. That is the
  guest end of a standard 3 h session (it ignores extensions; a 5 h booking's message link closes after 3 h – fine for
  birthday messages that pop up in the first hour, but **not** a basis for "time's up").
- **Control centre "10 minutes left" / "Time's up"** (manager › Round2 messages): staff pick the time by hand today.

## Extensions as calendar notes – how the owner does it (31 Oct 2026, from the owner)

**Read this before building anything that works out when a session ends.**

When a guest extends (usually on WhatsApp), staff often don't stretch the booking. They add a **calendar note** in the
same room that **starts after the cleaning time** (= at the SimplyBook booking's `end_date`), in **1-hour chunks**,
stacked one after another. Each 1-hour chunk **already includes the 15 min cleaning** at its end.

| | Times |
|---|---|
| Booking (guest 16:00–19:00) | SimplyBook 16:00 – 19:15 |
| + 1 h extension note | 19:15 – 20:15 |
| + another 1 h note | 20:15 – 21:15 |
| → guest really ends | **21:00** (last note end − 15 min); 21:00–21:15 is cleaning |

So: **guest end = end of the last stacked note − 15 min**, exactly like a booking (each +1 h note moves the guest end
by +1 h). Don't treat the gap 19:00–19:15 as a break; the guest plays straight through it.

## For a future automatic "That's a wrap"

1. Read the booking (SimplyBook admin `getBookings` / `getBookingDetails`, or the mirror's webhook data).
2. `guestEnd = end_date − event_buffertime_after minutes` (Singapore time; SimplyBook dates are SG local).
3. Queue `wrapup` at `guestEnd − 10 min` and `timeup` at `guestEnd` for that room (control centre action `r2`,
   docs/guest-messages.md). The 15 min after `guestEnd` is the cleaning time; nothing for guests is scheduled in it.
4. Skip mirror bookings (client 2472 / the twin room) so one session doesn't get two sets of messages.
5. If the booking is changed or cancelled, move or cancel the queued messages.
6. **Late-night sessions (past 11:15 pm).** Online booking never goes past 11:15 pm (the engine clips SimplyBook's free
   time at `CLOSE`, even if SimplyBook's opening hours are extended). Late sessions are arranged on WhatsApp; staff then
   either stretch the booking's end time or add a calendar note that blocks the time. SimplyBook's JSON-RPC API has no
   method to read calendar notes, **but the REST API v2 does** (checked 30 Oct 2026): `POST https://user-api-v2.simplybook.asia/admin/auth`
   {company, login, password} → token; `GET /admin/calendar-notes?filter[date_from]=…&filter[date_to]=…` with headers
   `X-Company-Login`, `X-Token` → each note with `provider_id` (room), times and text. The time a note blocks also shows up as unavailable
   (`getAvailableTimeIntervals` / `getReservedTimeIntervals` for that room). So for "time's up" use: the room is busy
   until X (booking end or the last extension note, whichever is later) → guest end = X − 15 min (extension notes
   include the cleaning, see "Extensions as calendar notes" below). Check this against a real late note before building.
7. **Extension or something else?** A note next to a booking can't be told apart by timing (an extension and a
   back-to-back late-night group look the same). Plan agreed 31 Oct: notes that ARE extensions start with `EXT`; if an
   untagged note touches a booking, ask staff on Telegram (Extension / Separate). When unsure, never send "That's a
   wrap" at the booking's own end – a late wrap is better than telling paying guests to leave.

## Built: control centre › In session (31 Oct 2026)

The admin no longer adds EXT notes by hand: **In session › +1h/+2h/+3h** does it the way above (1-hour notes from the
SimplyBook end, tagged `EXT +1h (1/2) · <guest> · control centre`). Vale/Atlas: the twin room gets the same notes tagged
`SYSTEM BLOCK · EXT …`, so both sides stay blocked (the Make mirror only copies bookings, not notes). Mirror blocks
(SYSTEM BLOCK clients 2472/2476) are hidden from the tab. It also moves/adds "About 10 minutes to go" and "That's a
wrap!" and shows "+N CREDITS ADDED" on the TV. Details: round2-tv-launcher docs/guest-messages.md "In session".
