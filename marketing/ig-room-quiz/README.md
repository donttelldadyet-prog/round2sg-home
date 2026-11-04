# "Which Round2 room are you?" – Instagram carousel

Marketing only, on branch `ig-room-quiz`. Nothing here is used by the live site; it only reads `menu/img/round2-logo.png`.
Why: movie-recommendation posts are already done by a competitor. This sells what only Round2 has – the room characters –
and asks people to comment a letter and tag friends (shares + comments, which push the post further).

- 8 slides, 1080 × 1350: cover with options A–F → one "You are …" card per room → "Drop your letter" + book.
- Rooms, colours, specs and personalities come from the live site's room list. Kaeden is left out while under renovation –
  add it back (option G, sprite, copy) when it reopens.
- Edit `QUIZ` in `index.html` (night, type, copy, sprite), then `python3 render.py` → PNGs in `out/`.
- Sprites are our own 8-bit drawings in `SPRITES` (`C` = room colour).
- Caption idea: "Which Round2 room are you? 👀 Comment your letter and tag your squad. Book at round2.sg"
