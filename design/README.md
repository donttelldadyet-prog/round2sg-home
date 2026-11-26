# Round2 design files

These files decide how Round2 **looks** to guests. The booking engine reads them, so a change here shows up without anyone touching the code that makes things work.

| File | What it changes | Where guests see it |
|---|---|---|
| `rooms.json` | Each room's name, accent colour, text colour on the accent, and character picture | Phone member page (book.round2.sg/m) **and** the Round2 tile on the room PS4s (the colours) |
| `member.css` | The look of the phone member page: fonts, sizes, spacing, cards, buttons, backgrounds | book.round2.sg/m |
| `tile.json` | The PS4 tile's words and timings (tile 0.16+, Karen's save screen v2, 27 Nov): Scan, Loading ("Hey, {crew}!"), Ready ("{crew} is all set."), What happens next, and how long the all-set / closing screens last. Groups in the file say which screen each word is on (some keys keep 0.15 names) | The Round2 tile on the room PS4s (Kaeden first) |
| `member-v2.css` | The look of the **new** member page (book.round2.sg/m?v=2 – the membership design, preview until the owners switch it on) | book.round2.sg/m?v=2 |
| `member-v3.css` | The look of the member page **live since 27 Nov** (book.round2.sg/m – Karen's welcome flow v3: save orb, crew card, passport, players, Saves loaded TV). Same rules as member.css; keep the ids/classes the page uses (`#s-wel`, `.orb`, `.cd`, `.pl`, `.bd` …). The page's words and screens are in the engine; ask function for changes there (HANDOFF concerns) | book.round2.sg/m (?v=2 = the 24 Nov page, ?v=1 = the first one) |
| `member-v3.html` | The **screens and words** of the live member page (27 Nov): every heading, sentence, button label, list item and the order of things on each screen (`s-wel` Welcome, `s-ben` Membership, `s-join` phone, `s-log` log in, `s-next` name your crew, `s-in` logged in, `s-done` Saves loaded, plus the edit sheet) | book.round2.sg/m |

**tile.json rules:** plain letters only (no – ’ “ … · – the TV can't draw them; the engine turns – into -, ’ into ' and drops the rest). `{crew}` = the crew's name (in a title the name is bright, the words around it dim on their own line), `{room}` = the room's name, `[PS]` = the round PS button, steps are `main line|small line`. Each text has a length limit (longer is cut). `c3n` and `s_foot` may be empty. Times: `t_burst` (the all-set screen) 0.5–5 s, `t_next` 3–20 s (outside = clamped). A broken file = the tile keeps its own words. Preview the words without a PS4: `https://round2-book.donttelldadyet.workers.dev/ps4/tilecfg?design=<branch>`. The tile asks again every 10 minutes. The LAYOUT is in the tile's code (round2-tv-launcher `ps4/tile/tile/draw.h`) – a new layout needs a tile build (put it in HANDOFF concerns).

## member-v3.html + member-v3.css – changing the live member page yourself (27 Nov)

The page has three layers. **You own two of them and they go live by themselves:**
- **Look** – `member-v3.css` (colours, sizes, spacing, animations in CSS).
- **Screens and words** – `member-v3.html` (the markup of every screen: text, buttons, order, extra decorative elements).
- **Functions** – the engine's script (logging in, saving players, loading saves, the orb game, card flip, sheets). Not in design/.
  Want a new behaviour? Put it in HANDOFF "DESIGN → FUNCTION CONCERNS".

**member-v3.html rules** (the engine checks the file; if any rule is broken it quietly keeps the built-in screens – nothing breaks
for guests, you'll just see the old version in the preview):
1. **Keep every `id="…"`** that is there today – the script finds things by them (e.g. `id="ldb"` is the Load button,
   `id="pls"` the player list, `id="e1"`…`id="e8"` the error lines). You can move them, restyle them, change their words.
   Remove or rename one and the whole file is refused.
2. **Keep the outer `<div class="ph">`** and the seven `<section class="scr" id="s-…">` screens.
3. **No** `<script>`, `<style>`, `<link>`, `<form>`, `<iframe>`, no `onclick=` / `onload=` (any `on…=`), no `javascript:`.
   Styles go in member-v3.css.
4. Placeholders the engine fills in: `%%LOGO%%` (Round2 logo URL), `%%RN%%` (room name, e.g. Kaeden), `%%RNU%%` (KAEDEN).
5. Text that the script writes itself (e.g. "Welcome back", "Hey, <crew>!", badge words, error messages) changes in the
   engine – ask function.
6. Max 90 KB.

**Make it live:** push to `main` → live for guests within ~5 minutes. **Preview first** (recommended): push to a branch and open
`https://book.round2.sg/m?room=kaeden&design=<branch>` (updates ~15 s after a push). If the preview shows the OLD screens, a rule
above was broken.

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

## Components (shared pieces you can reuse)
- **Status badge** – `components/status-badge.css`, demo with every state: `components/status-badge.html` (open it in a browser).
  Pills for Active member / Expires soon / Expired / Waiting / Loading / Ready, in the look of Spectrum UI's Status Badge
  (Apache-2.0) rebuilt in plain CSS – no React, no installer, nothing to download. Use: a span with `class="bd"` and
  `data-st="active"` (or expiring, expired, waiting, loading, ready) holding the words; the icon and colours come with the
  state. The same rules are already in `member-v2.css`, so the member page can show badges as soon as the engine puts them in.

