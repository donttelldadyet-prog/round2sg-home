# Round2 design files

These files decide how Round2 **looks** to guests. The booking engine reads them, so a change here shows up without anyone touching the code that makes things work.

| File | What it changes | Where guests see it |
|---|---|---|
| `rooms.json` | Each room's name, accent colour, text colour on the accent, and character picture | Phone member page (book.round2.sg/m) **and** the Round2 tile on the room PS4s (the colours) |
| `member.css` | The look of the phone member page: fonts, sizes, spacing, cards, buttons, backgrounds | book.round2.sg/m |

Coming next (not yet read from here): the PS4 tile's wording and timings (loading screen, "What happens next").

## How to change something safely

1. **Work on your own branch** (for example `design-gf-colours`), never straight on `main`. The engine reads `main`, so a push to `main` is live for guests within about 5 minutes.
2. **Preview your branch** on your phone before it goes live:
   `https://book.round2.sg/m?room=kaeden&design=<your-branch-name>`
   (branch names: lowercase letters, numbers and dashes only). The preview updates about 15 seconds after you push.
3. **When it looks right**, open a pull request into `main`. The owner (or his Claude) merges it.
4. If a file has a mistake, nothing breaks: the engine ignores a file it can't read and keeps the built-in look. You'll just see the old design. Check the preview.

## Rules for these files

- **Only edit files inside `design/`.** Everything else in this repo is live business code (the booking engine in `worker/`, the website, email). See the rules at the top of `HANDOFF.md`.
- `member.css`: style only. Don't add `<script>`, `@import` or anything with `</` – the engine refuses the whole file then and uses the built-in look.
- Keep the class and id names the page already uses (`.card`, `.tabs`, `#jb` …). They are how the page's functions find things; renaming them in CSS just means your style no longer applies.
- `var(--ac)` is the room colour and `var(--ink)` the text colour on it – use them instead of fixed colours, so every room keeps its own colour.
- `rooms.json`: colours must be `#rrggbb` (6 hex digits). Only the 7 room keys are read: vale, kaeden, scarlett, bella, kai, atlas, maximillion.
- Fonts: Chakra Petch and Press Start 2P are what the TV tile uses too – keep them, or tell the owner, because the PS4 tile has the fonts built in.
