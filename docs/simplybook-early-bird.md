# SimplyBook – Early Bird restructure (staged, hidden)

Status 30 Oct 2026: **built and hidden, not switched over.** Live services 28, 29, 32–38 and add-ons 2–19 were not touched.

## Why
Early Bird (11 am start) couldn't be extended: the old services 32/33/34 have a 11:00–2:00 PM schedule and no add-ons.
The owners want Early Bird extensions priced at **the day's rate ÷ 3 per hour, no discount** (the off-peak/peak add-ons 2–19 have built-in discounts).
Public holidays on Mon–Thu should use the peak rate (to be set as overrides at switch-over).

## What exists now (all hidden: is_public 0 / is_visible 0)
| Service | Name | Rooms (unit ids) | Days | Add-ons |
|---|---|---|---|---|
| 39 | [EARLY BIRD] NETFLIX · MON–THU | 5, 7, 8 | Mon–Thu | 38, 39, 40 ($16.33 / $32.67 / $49) |
| 40 | [EARLY BIRD] NETFLIX · FRI–SUN | 5, 7, 8 | Fri–Sun | 41, 42, 43 ($23 / $46 / $69) |
| 41 | [EARLY BIRD] DELUXE · MON–THU | 9, 10, 12 | Mon–Thu | 44, 45, 46 ($26.33 / $52.67 / $79) |
| 42 | [EARLY BIRD] DELUXE · FRI–SUN | 9, 10, 12 | Fri–Sun | 47, 48, 49 ($33 / $66 / $99) |
| 43 | [EARLY BIRD] VIP · MON–THU | 11 | Mon–Thu | 50, 51, 52 ($36.33 / $72.67 / $109) |
| 44 | [EARLY BIRD] VIP · FRI–SUN | 11 | Fri–Sun | 53, 54, 55 ($43 / $86 / $129) |

All six: $35, 3 h, buffer after 15 min, category 1 (Early bird), schedule 11:00–17:00 on their days,
"Appointment at fixed time" = 11:00 only (set per service, not "All services"), intake form 1, description and picture copied from 32/33/34.
Add-ons are +1/+2/+3 h (60/120/180 min), named `+N Hour(s) Extension [Early Bird · Off Peak|Peak - Netflix|Deluxe|VIP]`,
and each is connected only to its own hidden service (an add-on connected to no service would show on every service without add-ons, i.e. live 32/33/34).

Checked through the public API (getStartTimeMatrix 2–8 Nov): each new service offers only 11:00 and only on its days; availability matches the live 32/33/34 on shared days.

## Switch-over (do together with the owners)
1. Public-holiday overrides: on Mon–Thu PHs, close the MON–THU services and open the FRI–SUN ones (Service schedule › Show advanced settings / special days).
2. Make 39–44 visible and hide 32, 33, 34 in the same sitting.
3. Update the availability board (`slots/index.html`): pick the early-bird service by weekday (and PH), and drop the `cat==='1'` no-buffer special case – the new services carry the normal 15-min buffer inside the 11:00–17:00 window.
4. Regenerate the SimplyBook public API key (it is in the public `availability` branch).

## Rollback
Nothing live changed. To undo: delete services 39–44 and add-ons 38–55 (or just leave them hidden).

## Admin internals used (for the next Claude)
Session cookie + header `X-CSRF-Token` from the admin page.
- `GET/PUT /v2/rest/service/item/id/{id}`, clone: `POST /v2/rest/service/item/id` with `"clone":"<id>"`
- `GET/POST/PUT /v2/rest/product/item/id[/{id}]` – product body has `services:[{service_id,qty}]`, so create add-ons already attached
- `GET /v2/rest/worktime/index/service/{id}`, `PUT /v2/rest/worktime/day/service/{id}/index/{1-7}` body `{start_time:"11:00",end_time:"17:00",is_day_off:0,breaktime:[],…}` (toggling days in the UI saves instantly)
