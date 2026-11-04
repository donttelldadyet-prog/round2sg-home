# Round2 Picks – fortnightly Instagram movie post

Marketing & design only. **Nothing here is used by the live site** – it lives on branch `ig-movie-picks` and only
*reads* `menu/img/round2-logo.png`. Don't merge into `main` unless the owners ask (it would be harmless, but it isn't needed).

- Format: Instagram carousel, 1080 × 1350 (4:5). Slides: cover → one per pick → "Book at round2.sg".
- Look: same tokens as www.round2.sg – background `#06050a`, text `#f4f1fb`/`#d6d0e3`/`#a79fbd`, accent `#F2C21B`,
  Press Start 2P (labels) + Chakra Petch (headings/body), game-menu wording (MOVIE SELECT, INSERT COIN, PRESS START).
- Each pick takes the colour of the room we recommend for it (room colours copied from the site's room list).
- Each pick slide has the "screen" box above the title for the movie's poster. Put the file in `posters/` with the name set
  in `ISSUE` (`posters/heartland.jpg` …). Landscape key art fills the box; a portrait poster sits centred on a blurred copy of itself. No file → an 8-bit placeholder
  (`SPRITES`) shows, so the slide never breaks. Use official key art the studio/streamer releases for promotion.
- Room panel = "Best room to watch in <room>" + tier + specs only – no room description, so fortnightly posts don't repeat the same copy. The footer always says the service
  plays in other rooms too, so it reads as a suggestion, not a restriction.

## New issue (every 2 weeks)
1. Edit `ISSUE` at the top of the script in `index.html` (issue no., dates, 3–5 picks: title, service, when, genre, year, why, room, poster, sprite),
   and drop the posters into `posters/`.
2. `python3 render.py` → PNGs in `out/`. Open `index.html` in a browser to preview.
3. Check every title is actually on the **Singapore** Netflix / Prime Video / HBO Max apps that day (release lists online are US).

## Rules to keep
- HBO Max is only in Deluxe (Kai, Bella, Atlas) and VIP (Maximillion) – an HBO Max pick must recommend one of those rooms.
- Netflix + Prime Video are in every room.
- Kaeden is under renovation (from ~30 Oct 2026) – don't recommend it until it reopens.
- Blurbs in our own words; no quotes from reviews.

## Issue 01 (6–19 Nov 2026)
You (Netflix series, poster in posters/you.jpg) → Scarlett · Possible Love (Netflix, 6 Nov) → Kai · Madden (Prime Video, 18 Nov) → Maximillion ·
Dune (HBO Max) → Atlas. Rooms picked to suit each film; no room descriptions on the slides. Posters not added yet. Dates from US release lists – confirm in the SG apps before posting.
