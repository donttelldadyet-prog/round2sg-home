# Round2 design files

These files decide how Round2 **looks** to guests. The booking engine reads them, so a change here shows up without anyone touching the code that makes things work.

| File | What it changes | Where guests see it |
|---|---|---|
| `rooms.json` | Each room's name, accent colour, text colour on the accent, and character picture | Phone member page (book.round2.sg/m) **and** the Round2 tile on the room PS4s (the colours) |
| `member.css` | The look of the phone member page: fonts, sizes, spacing, cards, buttons, backgrounds | book.round2.sg/m |
| `tile.json` | The PS4 tile's words and timings (tile 0.14+, added 24 Nov): scan screen, the three cards' labels/notes, the "Welcome back, {crew}" screen, "What happens next", and how long the ready burst / closing screen last | The Round2 tile on the room PS4s (Kaeden first) |
| `member-v2.css` | The look of the **new** member page (book.round2.sg/m?v=2 – the membership design, preview until the owners switch it on) | book.round2.sg/m?v=2 |

**tile.json rules:** plain letters only (no – ’ “ … · – the TV can't draw them; the engine turns – into -, ’ into ' and drops the rest). `{crew}` is replaced by the crew's name. Each text has a length limit (longer is cut). Card notes (`c1n`–`c3n`) and the bottom line `s_foot` may be empty = not drawn – that's where prices go once the owners decide (on hold, 24 Nov). Times: `t_burst` 0.5–5 s, `t_next` 3–20 s (outside = clamped). A broken file = the tile keeps its own words. Preview the words without a PS4: `https://round2-book.donttelldadyet.workers.dev/ps4/tilecfg?design=<branch>` shows what the tile would get. The tile asks again every 10 minutes.

## How to change something safely

1. **You can publish straight to `main`** – no pull request, no approval needed (owner, 22 Nov 2026). The engine reads `main`, so a push is live for guests within about 5 minutes. Pull first: other people push to this repo too.
2. **Good habit: preview first** on your phone with a branch:
   `https://book.round2.sg/m?room=kaeden&design=<your-branch-name>`
   (branch names: lowercase letters, numbers and dashes only). The preview updates about 15 seconds after you push. Then merge it into `main` yourself.
3. **Tell the owner** in plain words what you changed after it's live.
4. If a file has a mistake, nothing breaks: the engine ignores a file it can't read and keeps the built-in look. You'll just see the old design. Check the preview.

## Rules for these files

- **Only edit files inside `design/`.** Everything else in this repo is live business code (the booking engine in `worker/`, the website, email). See the rules at the top of `HANDOFF.md`.
- `member.css`: style only. Don't add `<script>`, `@import` or anything with `</` – the engine refuses the whole file then and uses the built-in look.
- Keep the class and id names the page already uses (`.card`, `.tabs`, `#jb` …). They are how the page's functions find things; renaming them in CSS just means your style no longer applies.
- `var(--ac)` is the room colour and `var(--ink)` the text colour on it – use them instead of fixed colours, so every room keeps its own colour.
- `rooms.json`: colours must be `#rrggbb` (6 hex digits). Only the 7 room keys are read: vale, kaeden, scarlett, bella, kai, atlas, maximillion.
- Fonts: Chakra Petch and Press Start 2P are what the TV tile uses too – keep them, or tell the owner, because the PS4 tile has the fonts built in.
