# Round2 HANDOFF – shared by the owner, the admin/design team and every Claude session

> 📣 **MESSAGE FROM KAREN FOR THE OWNER (26 Nov 2026, 1:15am) – Claude: show him this first thing, before anything else.**
> **"Ur gf is cool, look at what she has done. Ur gf made it. 😎"** 🎮 The member welcome flow is now **v3** – save-orb
> marble game with a blop-blop finish, SAVE POINT, Create / Load my save, card that flips (+ a Black edition card after all 7 rooms),
> room passport, renew sheet, crew name that types onto the card, player edit with YOUR avatar library (Shuffle + Browse
> all 1200), and a "Saves loaded" TV that switches on and drops the profiles in. Play it on your phone:
> https://raw.githack.com/donttelldadyet-prog/round2sg-home/ec135e374a42cd4fb97f2ea5951202ab0315cbe7/design/membership/welcome-flow.html
> What changed + what to build: "Welcome flow v3" and "v2" at the top of DESIGN → FUNCTION CONCERNS below.
> **NEW 27 Nov 12:40am – the PS4 save screen redesigned to match:** https://raw.githack.com/donttelldadyet-prog/round2sg-home/76f70c36bcc5ee4221563f809e746c741f329cd5/design/tile/save-screen-v2.html
> (Owner: delete this box once you've seen it.)

## READ FIRST – rules for everyone (owner, design, every Claude)
**Who uses this file:** the owner and his Claude sessions (engine, PS4s, control centre, website), and the admin/design
team (the owner's girlfriend) and her Claude for the look of things. Newest notes are lower down, by date; this box is the
standing rules. Keep it short; add a rule here only when the owner asks for one.

**If you are working on DESIGN (looks, colours, wording, layout):**
1. **The design team owns the look of the member page, the PS4 tile and the homepage, and publishes it freely (owner, 22 Nov
   2026): straight to `main`, no pull request and no owner approval.** That means `design/` (member page `book.round2.sg/m`
   and the PS4 tile's colours/room names, later its wording too) and `index.html` (the homepage). A push to `main` is live
   within ~5 minutes. Good habit, not a gate: try a `design/` change first on a branch with the phone preview
   (`book.round2.sg/m?room=kaeden&design=<branch>`, see `design/README.md`), and pull before pushing.
   **Live member page (owner 27 Nov 2:18am "allow my gf to change design and make it live"):** its look is `design/member-v3.css`
   and its screens + words are `design/member-v3.html` – both yours, both go live from `main` by themselves. Keep every
   `id="…"` and add no scripts (rules in `design/README.md`); a file that breaks a rule is ignored and the built-in page shows.
   PS4 tile: words + timings in `design/tile.json` (live by themselves); its layout is code – send a mockup via the concerns list.
2. **Never edit** `worker/` (the live booking engine – bookings, payments, PS4s), `slots/`, `email/`, `menu/`, `move/`,
   `CLAUDE.md`, or the long dated notes below.
   The homepage `index.html` is the design team's (rule 1): look, wording, layout, sections, pictures – just keep the booking
   buttons opening the booking page, and check it on a phone after.
3. Never deploy anything to Cloudflare and never run the "Full check" – that's the owner's side.
4. Keep the class / id names and the `var(--ac)` / `var(--ink)` room colours – the page's functions rely on them.
5. After publishing, tell the owner in plain words what changed (no need to wait for him). The PS4 tile draws only its colours
   and room names from `design/` today; for anything else on the tile (wording, layout, timings) write what you want in the
   concerns list below until the tile reads it from `design/` too.
6. **Functional concerns go in the list below** (owner, 22 Nov 2026): anything you find that the design files can't fix –
   behaviour, wording that lives in the engine, missing feedback, accessibility in the page's HTML, bugs – write it in
   **"DESIGN → FUNCTION CONCERNS"** right under this box (screen, what's wrong, why it matters, severity 1–4, date). Don't
   work around it in CSS and don't edit code to fix it. That list is the one place below this box design may edit.

**If you are working on FUNCTIONS (engine, PS4 helper, control centre):**
- Everything in `CLAUDE.md` applies (System check before/after, deploy rules, one clock, Kaeden test bench, etc.).
- The look lives in `design/` now: don't put new colours/wording for guest screens in code if a design file can hold it,
  and never overwrite `design/` files – they belong to the design team. If code needs a new design value, add it with the
  current value as default and say so here.
- Merge, never overwrite: other sessions (and the design team) push to this repo too – pull first.
- **Read "DESIGN → FUNCTION CONCERNS" (under this box) before working on a screen it names.** When you fix one, tick it
  there with the date and the commit/deploy – don't delete it; when you decide not to, say why on the same line.

**For everyone:** plain words to the owner (he doesn't read code), Singapore time, and no booking/guest data (names,
phones) in this file or in design files.

## DESIGN → FUNCTION CONCERNS (design writes, function fixes and ticks – newest first)
Severity: 4 blocks guests · 3 major · 2 noticeable friction · 1 polish. Format: `- [ ] sev · screen · what's wrong – why – (date, who)`.

**MEMBER JOURNEY v5 – memory card + payment + renew (Karen, 27 Nov 2026 11:20pm: "send to my bf to work on it and make it live")**
Clickable prototype (phone = member page with every function on pretend data, TV above reacts; buttons beside it switch
Active / Expires in 5 days / Expired and passport 3/7 / 7/7): https://raw.githack.com/donttelldadyet-prog/round2sg-home/54bd0f6f14882adc21c458e70c46c97412b9be0f/design/membership/member-journey-v5.html
- [ ] 3 · member page · **Crew card = the memory card** (upright; label in room colour with eyes + crew name, 7 passport blocks lit
  for rooms played, gold pins; no circuit). Tap flips it (back mirrored like a real card): random quote, crew name, CREW SINCE, VALID TO,
  "If found, return to 20 Haji Lane #02-00". Eyes blink / wink / look around at random (prototype "eye brain").
- [ ] 3 · member page + engine · **One button:** "Load saves on the TV" → card lifts and flies up off the phone, a dashed card-shaped
  "SAVE SENT – your card is in the TV" spot stays → TV deck takes the card (act insert) → players load. Replaces the separate swipe card.
- [ ] 3 · PS4 tile · **Loading screen:** the old bank-style crew card is replaced by the memory card standing in its reader (centred
  in the right half, level with "Hey, <crew>!"): one bar per player with face + colour filling Waiting→Loading→Ready with a tick, faces
  pop onto the label as each is ready, glowing "charging" line on the edge, sparks, reader LCD "LOADING n/N" → "ALL SET!", happy eyes.
  The player list on the right is dropped (the card shows it). Card does NOT spin. Ready screen: card does NOT wiggle.
- [ ] 2 · PS4 tile · **Reader reacts:** slot glow breathes while waiting, hop when a phone connects, slot lights up as the card comes,
  squash on insert, light sweeping along the reader + fast LED while reading, bump/flash per player ready, soft room-colour glow when done.
- [ ] 2 · PS4 tile · What's next: steps start level with the left heading; "Closing in n" bigger, centred, glowing, thick blocks.
- [ ] 3 · member page + engine (PRICING – owners to confirm) · **Paid sign-up:** Why-join row "Round2 Membership – Then $10/mo. after
  2 months – $20 / 2 mo." → phone (country code list, non-SG numbers allowed) → crew name + first player + 6-number PIN twice →
  **HitPay** (PayNow / card) → only then create the account → "Your save card is ready" (CREW SINCE / VALID TO) → crew page.
- [ ] 3 · member page + engine · **Membership status:** Spectrum UI Status Badge (`design/components/status-badge.css`, `<span class="bd" data-st="active|expiring|expired">`) "Active member" / "Expires in N days" (≤7 days) / "Expired"; player badges use the same component (data-st waiting / loading / ready);
  row under the card "Membership · Valid to mm/yy · n months left · Renew" (button glows when ≤7 days or expired).
  Needs each crew's expiry date stored + sent to the page (and to the tile).
- [ ] 3 · member page + engine · **Renew sheet:** 1 month $10 / 3 months $30 (shows the new Valid to) → HitPay → "Renewed! Valid to …".
  Extends from the current end date (from today if already expired).
- [ ] 3 · member page + engine · **Expired:** card greyed with "LOCKED", Load button becomes "Renew to load your saves" (opens Renew),
  note "Your saves are kept safe for 3 months – renew to load them" (owners: confirm the 3 months). Tile could show "RENEW ON PHONE".
- [ ] 2 · member page · **Receipts** in Crew settings (date, what, amount) from HitPay payments.
- [ ] 2 · member page · **Black edition:** all 7 rooms → card label turns black with gold name/eyes + "BLACK EDITION · ALL 7 ROOMS".
- [ ] 2 · member page · Crew settings tiles: Rename, PIN (current + new + again, 6 numbers), Claim code, Receipts, Need help (WhatsApp),
  Log out; every sheet closes by pulling it down. Players: tap name = edit (name + picture, Remove), tap badge = skip, Add a player (max 4).
- [ ] 1 · engine/ops (suggested) · WhatsApp/SMS reminder ~7 days before expiry; Gold/Platinum tiers still unpriced (left out of v5).

**Booking confirmation alignment (Karen, 26 Nov 2026 6:40pm, phone screenshot of a Maximillion booking)**
- [ ] 1 · "You're booked!" page (book.round2.sg, `worker/round2-book.js` ~line 3250 and the same card in `move/index.html` line 8) ·
  The Name / Date / Time / Length / Guests / Paid / Ref rows look crooked: the small grey labels (13px) sit at the top of each
  row while the values are bigger (Time is extra big, Ref is pixel font), so labels and values don't line up. Owner asked to align
  them. Suggested CSS (both files): `dl{align-items:baseline;grid-template-columns:72px 1fr;row-gap:10px}` and give `.ref` a
  line-height like the other values (`line-height:1.4`). Also: the three chips under it (FREE CHANGE / MOVES USED / STARTS IN)
  wrap unevenly – `display:flex;flex-wrap:wrap;gap:8px` with equal heights would tidy them. – looks unpolished on the page
  every guest sees right after paying – (26 Nov, design)

**PS4 save screen v4 – MEMORY CARD + SAVE DECK replaces the orb (Karen, 27 Nov 2026 12:10pm: "ok push it live")**
- [x] (BUILT 27 Nov 1:30pm – engine 1fa7d46/c5a1a65 live (5d093538), tile 0.20 = round2-tv-launcher ps4-helper b7d6724 → ps4-tile; NOT on the TV yet – Kaeden offline since 3:34am. Differences: the card doesn't tilt on the hop; the TV's room profile shows its letter, not the room picture; the phone card's look sits in the engine (MCP_CSS, class names mcph/mcpc/…) until design moves it into member-v3.css. New tile.json words (optional, defaults built in): v_lab, v_wait, v_conn, v_load, v_insert, v_hi ({crew}), v_read, v_found ({n}), v_all, v_saved, v_press.) 3 · PS4 tile scan + ready screens (+ member page for the swipe) · Mockup (tabs 1-4, room colours, "Try it" phone under the TV):
  https://raw.githack.com/donttelldadyet-prog/round2sg-home/691d5eb44f22bd184771bf7211e806a245089185/design/tile/save-screen-v4.html  · stills: `design/tile/save-screen-v4.png`
  Screens 2 (crew card loading) and 4 (what's next) are unchanged from v3 – only the **orb on Scan (1) and Ready (3) is gone**.
  **Scan (1), centre (x~790-1130, card + deck ~ y300-860 at 1920x1080):** a dark memory card (room-colour label on top, 7 block
  slots in passport order Vale, Atlas, Kai, Bella, Scarlett, Kaeden, Max, gold pins at the bottom) floats above a **save deck**
  (dark box with a slot, a small pixel-font screen and an LED).
  - Waiting: card bobs gently; label has two pixel **eyes** that blink every ~2.6 s and glance right toward the QR; every ~5 s a
    small hop; after ~5 s of no scan the eyes close to a line and "z z z" float up (sleepy). Deck screen blinks "INSERT SAVE".
  - Phone scanned: eyes go wide, label text changes MEMBER SAVE -> crew name (e.g. NIGHT OWLS), deck screen "HI, <CREW>!",
    line under the QR "Phone connected".
  - Insert (after the phone swipe, or by itself ~2.6 s after the scan): card lifts ~26 px, then glides down into the slot over
    ~1.5 s with a tiny settle; the slot hides the bottom of the card (pins) – it does NOT vanish at once; flash of room colour at
    the slot, LED on, eyes turn happy ^ ^, deck screen "READING..." (dots cycle), line under QR "Loading your save".
  - Blocks: only the rooms in the crew's **room passport** light up, one by one (~260 ms apart) in their room colours with a few
    pixel sparkles; unplayed rooms stay dark. Kaeden always counts (renovation rule). Then a rainbow shine sweeps across the
    card and the deck screen says "SAVE FOUND n/7"; with all 7: "ALL 7 ROOMS!" + the card glow cycles through the 7 colours.
    Then go to screen 2 as today.
  **Ready (3), centre:** the same card sitting in the deck (inserted, happy eyes, passport blocks lit), a small cheer-jump +
  sparkles + shine when the screen opens, LED pulses, deck screen alternates "GAME SAVED" / "PRESS (PS)".
  **Phone (member page, after scanning a TV) – needs engine + member page script:** show the same memory card (crew name, passport
  blocks lit, blinking eyes, shine) with "Swipe up to insert"; swiping it up (or tapping) tells the TV to start the insert; if
  the guest does nothing, the TV inserts by itself after a few seconds. Optional – the TV part works without it.
  PS4 drawing: pre-render the card body, deck and label per room colour as PNGs; eyes, blocks, LCD text, sparkles drawn on top.
  Plain ASCII words on the TV. (27 Nov, design)

**PS4 save screen v3 – more premium card + more alive (Karen, 27 Nov 2026 2:52am: "the one on the tv looks plain")**
- [x] (DONE 27 Nov 3:15am – tile 0.18, round2-tv-launcher ps4-helper 4022221, released to ps4-tile, on Kaeden. Room profile's face = room letter in the room colour (the tile has no room pictures); a ready row tints green but doesn't nudge sideways. "Waiting for your phone" is fixed in the tile for now – to make it editable it needs a key in the engine's TILE_CFG. s_sub: a '|' now breaks the line; without one the tile breaks after the sentence nearest the middle.) 3 · PS4 tile (draw.h) · Mockup: `design/tile/save-screen-v3.html` (+ .png), open
  https://raw.githack.com/donttelldadyet-prog/round2sg-home/34f8b7fe782341b40a1af35f77563305f92c85ad/design/tile/save-screen-v3.html (tabs 1-4, room colours).
  Changes vs v2 (0.16): **Crew card = the phone's card**: brushed-metal dark gradient + room-colour glow top-right and bottom-left,
  **gold chip with contact lines**, Round2 logo top-right, bigger name, room-colour light line along the bottom edge + soft
  coloured shadow under the card, light sweep – the card STAYS STILL (Karen 2:56am: no float). Position at 1920x1080: words x130-690, card x748-1308 y384-737, list x1370-1790 (even ~60 px gaps, card top = first row). Second date block = **PLAYERS n/m**.
  **Loading:** each time a profile turns Ready its avatar **fades in on the card** (stacked faces bottom-right in player order, room face first/left, no flying – Karen); scan sub-line on two lines "7 rooms. One save." / "Carry on in any of them.",
  the card's glow brightens briefly, PLAYERS counts up, the row tints green. **Scan:** NO scan line over the QR (it could block scanning – Karen); under it "Waiting for your phone" with three pulsing dots. Ready + What's next as v2.
  PS4 drawing is slow: pre-render the card per room colour as a PNG (gradient, chip, edge) and draw name/dates/faces on top;
  avatars just fade in. Plain ASCII words. (27 Nov, design)

**Crew settings panels: pull down to close (Karen, 27 Nov 2026 2:42am)**
- [ ] (NOT YET – 27 Nov 1:30pm: left for the next member-page release; this one was the v4 card + 6-number PINs) 3 · member page v3 script · The Claim code and PIN tiles (`.more .it` = `<details>`) open a bottom panel (`.osh`); today
  it closes by tapping outside (the summary's ::before cover). Karen wants it to also close by **pulling the panel down**,
  like the edit-player sheet: drag .osh down → follows the finger, fade the cover, past ~110 px or a quick flick → set the
  parent details `open=false`; short pull springs back. Don't start the drag from inside an input. (27 Nov, design)

**PIN = 6 numbers (Karen, 27 Nov 2026 2:24am: "for pin just make it 6 digit number")**
- [x] (27 Nov 1:30pm, engine 1fa7d46: join, change PIN and staff reset take exactly 6 numbers – "Your PIN is 6 numbers." / "Pick 6 numbers, not 123456 or all the same number."; old PINs still log in. Server check only – the boxes' maxlength 6 does the rest.) 2 · member page v3 + engine · Design done (design/member-v3.html): new-PIN boxes (join jk/jk2, change pin2/pin3) take 6 numbers
  max with "6 numbers" hints; the log-in box stays 8 long with "Your PIN". Engine still to do: **new PINs must be exactly 6
  numbers** (join, change PIN, staff reset) – script check + server check, messages "Your PIN is 6 numbers." / "Pick 6 numbers,
  not 123456 or all the same number." **Existing members keep their old 4-8 number PIN** for logging in (no forced change);
  they move to 6 only when they change it. (27 Nov, design)

**Member page v3 – two small changes (Karen, 27 Nov 2026 2:15am, from the live page)**
- [x] (27 Nov 2:35am: "Crew settings" ⌄ / "Hide crew settings" ⌃, engine + design/member-v3.html/.css) 3 · member page v3 (MEM3_HTML in worker) · **"More –" is unclear** – rename the toggle to **"Crew settings"** with a
  chevron (closed: "Crew settings" + down arrow; open: "Hide crew settings" + up arrow), same muted style, centred.
- [x] (27 Nov 2:35am: "New PIN again" box, "The new PINs don't match." + shake, nothing sent; join already asks the PIN twice) 3 · member page v3 · **Change PIN: confirm the new PIN** – fields: "Current PIN" / "New PIN (4 to 8 numbers)" /
  **"New PIN again"**, then Change PIN. If the two new PINs differ: inline error "The new PINs don't match." (field shakes,
  nothing sent). Same rule wherever a PIN is first set (join step) if it isn't there already. (27 Nov, design)

**Member page v3 – softer card swipe (Karen, 27 Nov 2026 2:20am: "when i swipe the card can we make animation less harsh")**
- [x] (27 Nov 2:40am: copied into the live page) 3 · member page v3 (MEM3_HTML script, card swipe) · Copy the new swipe from `design/membership/welcome-flow.html`
  (search "swipe left or right"): finger moves the card less (dx*.4, max 80deg, perspective 1200px, no scale-down), flip
  needs 70px (was 55), half-turn 140-320 ms cubic-bezier(.4,0,.6,1), landing 560 ms cubic-bezier(.22,1,.36,1) with NO
  overshoot wobble, spring-back 450 ms same ease. Tap-to-flip unchanged. (27 Nov, design)

**PS4 save screen v2 – same look as the member page (Karen, 27 Nov 2026 12:40am: "push to my bf")**
- [x] (built 27 Nov 1:05am: tile 0.16 – round2-tv-launcher ps4-helper 1bf4331, released ps4-tile 2615b05; design/tile.json words filled in. See "27 Nov 1:05am – PS4 TILE 0.16") 3 · PS4 tile · Mockup (1920x1080, tabs + room colours): `design/tile/save-screen-v2.html` (picture: `save-screen-v2.png`).
  Layout/look lives in round2-tv-launcher `ps4/tile/tile/draw.h`, so this needs building there (tile.json words NOT changed yet,
  so the live Kaeden tile keeps today's words until the new layout ships). Screens:
  **1 Scan:** left "SAVE POINT" / "Pick up where you left off." / "7 rooms. One save. Carry on in any of them."; middle glass
  orb with "SAVE POINT" curved over it and the 7 room-colour marbles orbiting (behind/in front); right QR with room-colour
  corners, "Scan to load your save" / "New here? Scan to create one"; footer "Not saving today? Press PS to play." + url.
  **2 Loading:** "ROUND2 CREW / Hey, {crew}!" / "Loading your saves onto this PS4. Please don't start a game yet."; crew card
  (CREW SINCE / VALID TO blocks, light sweep) in the middle; right "Who's playing in {room}" rows with the room face first,
  Waiting -> Loading -> Ready badges, progress bar + "2 of 3 profiles ready".
  **3 Ready:** "SAVES LOADED / {crew} is all set." / "Press PS on your controller and pick your profile."; full orb in the room
  colour with "GAME SAVED" curved over it, blop-blop bounce, sparkle burst, two rippling rings; rows all Ready.
  **4 What happens next:** "Ready, player one." + 4 steps with room-colour marble numbers sliding in; countdown ring "Closing in 6".
  **PS4 drawing is software and slow:** fine to simplify – no blur, fewer marbles/sparkles, pre-rendered orb/marble/card PNGs
  per room colour, lower frame rate for the orbit. Plain ASCII text only. Words go into tile.json when the layout is built.
  (27 Nov, design)

**Welcome flow v3 extras (Karen, 26 Nov 2026 5:40pm; tilt light, easter eggs, NEW-room pop and shake-to-shuffle dropped 6pm)**
- [x] (27 Nov, v3: long-press orb + pull to refresh (= re-check with the engine) + faces on the card back) 3 · member page /m · Same file. **Long-press the orb** (0.5 s) = all marbles dive in at once. **Pull down to refresh**
  on the logged-in screen: a mini orb fills, badges re-check → FUNCTION: re-fetch status. **Card back** shows the crew's
  player faces (small stack, bottom-right, replacing the back logo). (26 Nov, design)

**Welcome flow v3 (Karen, 26 Nov 2026 1:15am: "send this latest design to my bf") – adds to v2 below**
- [x] (LIVE 27 Nov ~1:40am as member page v3 – see "27 Nov – MEMBER PAGE v3 LIVE"; left out: prices/Renew, expiry badges, non-SG numbers, room character face is the room's art) 3 · member page /m · Same file `design/membership/welcome-flow.html`. New since v2:
  **Orb:** marbles burst out of the orb, comet tails, lean toward the finger, charge-up before diving, shockwave on landing,
  ring speeds up per catch, last marble = slow big arc; full orb does 3 jelly "blop" bounces + liquid slosh, bubbles and a
  holo scan line, then the breathing pulse (inner layer clipped with clip-path – iOS square-clip bug). Paused off-screen.
  **Name your crew** (step 2): crew name letters land on a live card as you type; Create my save flips it to the back.
  **Logged in:** "Hey, <Crew>!" (names title-cased); room passport (7 marbles = rooms played, current room ringed; all 7 =
  the card unlocks as the BLACK EDITION (matte black, gold name + chip, engraved gold laurel crest "VII"; flips over with a gold burst)) → FUNCTION: needs rooms-played per crew. **Kaeden always counts as played** while it is under renovation (Karen, 26 Nov) – tapping it says "Kaeden is closed for a makeover, so it's stamped for you." **Renew** opens a sheet (1 month
  $10 / 3 months $30 – drafts) → real payment. **Players:** tap a row (✏️) to edit name + picture; "Add a player" (max 4
  players + the room profile = 5); "Remove from crew" asks first. **Sheets** (edit player, renew) close by pulling them down (handle/title, or anywhere when scrolled to the top). Pictures = your avatar library (7 Lapy + 5 pack, Shuffle,
  Browse all 1200; prototype loads them from round2-book.donttelldadyet.workers.dev/m/av/NNNN.png); no room characters for
  players. **Load saves:** profiles fly off, then "Saves loaded" – TV powers on (CRT line), profiles drop in (5 fit), sparkle
  burst, title reveal. TV not answering → message + Try again (needs a timeout from the TV). **Welcome back:** phone that
  logged in before sees "Welcome back / Hey, <Crew>!" with Log in first (needs a remembered login). **Log in** page: "Load
  your save" title/button; wrong PIN shakes. **Phone:** SG = 8 digits, overseas = any length. (26 Nov, design)

**Welcome flow v2 – "Save point" (Karen, 25 Nov 2026 11:17pm: "push to live") – replaces the jelly pill + some words below**
- [x] (LIVE 27 Nov as member page v3) 3 · member page /m · Same prototype file, updated: `design/membership/welcome-flow.html`
  (https://raw.githack.com/donttelldadyet-prog/round2sg-home/main/design/membership/welcome-flow.html). Changes vs the spec below:
  **Welcome:** the jelly pill is gone (owner didn't like it). Now a glass **save orb**: 7 glossy marbles, one per room colour
  (R map), orbit it like a planet ring (behind/in front); one by one each arcs in like a drop (stretches, sparkle trail), lands
  with a ripple + jelly squish, and the orb fills with the colour of the ROOM YOU SCANNED IN (--ac; Vale = pink), never the
  marble colours. Guests can tap a marble to catch it. No text inside the orb (screen readers get "3 of 7 collected"). Full =
  "press me": breathes + sonar rings; tapping it empties it and plays again (a little game – not a link). Curved text
  **"SAVE POINT"** (was ROUND2 MEMBERS). Line: "7 rooms. One save. Pick up in any of them." Buttons **"Create my save"**
  (white) / **"Load my save"** (dark) – every 2 s the words roll to **"Sign up"** / **"Log in"** and back (aria-labels say both;
  still with Reduce Motion). **Why join:** CTA "Create my save" (was Build your crew); price row fixed. **Join:** title "Create
  your save"; **country-code dropdown** (SG first, region, CN/HK/TW/JP/KR/IN/AU/NZ/UK/US/FR/DE/AE; box shows only "+65") –
  SG = 8 digits, others 6–14 → FUNCTION: member accounts + WhatsApp PIN reset assume +65; store full E.164 numbers before
  enabling non-SG codes. Same dropdown on Log in. **All screens:** one soft top glow in the room colour (dot grid removed).
  **Crew card:** "CREW SINCE" and "VALID TO" as two label-over-date blocks; **tap the card → it flips** (also by swiping left/right – it follows the finger; WAAPI half-turns,
  content swap) to a back with magnetic stripe, signature strip with a random handwritten line (Caveat font, OFL, inlined;
  list in the file: "Sup homie", "GG, see you next round", "Press start to continue"…), "If found, return to 20 Haji Lane
  #02-00" + logo. **Logged in:** "Hey, <crew name>"; the room's profile row shows that room's character face (crops of the
  site's art_<room>.webp, 120px, in the room-colour circle) + "<Room> profile". Old pill version: git history. (25 Nov, design)

**Status badges are in the repo (25 Nov 2026, owner's design session)**
- [ ] 2 · member page · Show the status badges on the live page: `design/components/status-badge.css` (already inside
  `design/member-v2.css`), demo `design/components/status-badge.html`. Markup: `<span class="bd" data-st="…">words</span>`
  – states `active`, `expiring`, `expired`, `waiting`, `loading`, `ready`; no SVG needed (icons come from the CSS). Wanted:
  crew header "Active member" / "Expires in N days" (+ Renew) / "Expired" – needs the crew's expiry date; and on each
  profile row while loading, Waiting → Loading → Ready from the same board `loadst` already returns. Karen's prototype
  (`design/membership/welcome-flow.html`, class names `.bd .ok/.wn/.er/.ld/.ex`) shows where they go; use the `data-st`
  version from the component (its short class names `.ok` etc. clash with the page's own `.ok`). Spectrum UI's
  connector isn't needed for this (it can't reach spectrumhq.in from Claude sessions anyway). (25 Nov, design)

**New member welcome flow (design, 25 Nov 2026 12:35am – Karen + owner agreed on Telegram: "before this page need clean UI, just 2 simple buttons; when join show the benefits; then login just focus login")**
- [ ] 3 · member page /m · Build the new flow from the clickable prototype `design/membership/welcome-flow.html`
  (open: https://raw.githack.com/donttelldadyet-prog/round2sg-home/main/design/membership/welcome-flow.html): **1 Welcome** – glossy JELLY PILL in the room colour with "II" (two white lines, like the logo) – Karen 25 Nov 12:50, replaces the swirl and
  the globe: centred in the space above "Welcome", gentle wobble + floor shadow, drag tilts it in 3D, tap squishes it (CSS only, no canvas; still with Reduce Motion); the whole welcome screen glows in the room colour from behind the globe, "ROUND2 MEMBERS" curves over it in the pixel font (SVG textPath), small kicker above "Welcome" removed, "Welcome" semi-bold (Karen 25 Nov 12:40), "Welcome", "Pick up where you left off, in
  any Round2 room.", white pill "Join Round2", dark pill "Log in", small "Don't want to save today? Press PS on the controller." → **2 Why join**
  (only after Join; redesigned 25 Nov 12:55 – Karen: tiles looked AI-made) – room-colour glow with the crew card floating as the hero,
  "Your games, saved in every room.", a numbered list 01–04 (pixel-font numbers, hairlines, no boxes/icons – Karen's words: "Carry on any game – Start and continue in any room." /
  "1 membership, up to 4 players – Each with their own name and saves." / "Your crew card – Shows on the TV every time you play." /
  "Scan and load – Scan the QR, pick your profile and play."); "Membership" centred at the top, then an Apple-style subscription row above the white pill "Build your crew" (owner 25 Nov 1:23pm: "Join Round2" not motivating – action / next step) (Karen 25 Nov 1:20pm, like the App Store subscribe sheet): dark rounded row, left "Round2 Membership" / grey "Then $10/mo. after 2 months", right "$20 / 2 mo." on one line (kept together so nobody reads "2 months = $10") (draft prices – Gold/Platinum unset) → **3 Join** – phone only, "+65" shown in the field,
  claim-code link, Continue pinned at the bottom, "Already a member? Log in" → step 2 as today in the new look. **4 Log in** – phone + PIN,
  WhatsApp PIN link, Log in pinned at the bottom, "New here? Join Round2". Back buttons on 2–4. Owner thinks the swirl may exist as an
  open-source repo – fine to swap in if its licence allows. Words/prices are drafts. (25 Nov, design)
  **Crew card restyled (owner 25 Nov 1:22pm: "looks like for toddler"):** no pixel font on the card – crew name in Chakra Petch semi-bold, uppercase, wide spacing, metal gradient; slim muted chip; no dot grid; logged-in header crew name in plain semi-bold too (prototype `.cd` rules at "grown-up card"). **Motion on every screen (Karen 25 Nov 1:20pm – build these too, see the prototype):** each screen's parts slide up one after another when it opens (60ms apart); pill buttons ripple from the touch point and the white one has a slow light sweep; Why join – list numbers pop in, "$20" counts up; Join – step bar fills, phone box glows on focus and shakes on a wrong number; logged-in – the crew card flips in, cards tilt toward your finger, badges pop when they change and the loading row pulses. All off with Reduce Motion. **12:57am – Karen: prototype is final for tonight, over to you to edit/build** (uses design/components/status-badge since 8c3f2fb). **Update 12:50am – logged-in screen + status badges:** prototype now has a 5th screen (tap Log in → Log in): crew header with an
  "Active member" badge, the crew card, "Expires in 5 days" badge + Renew, and each profile shows Waiting → Loading → Ready badges while
  "Load saves on the TV" runs. Badges are Spectrum UI's Status Badge (Apache-2.0, github.com/arihantcodes/spectrum-ui
  app/registry/status-badge), dark variant, rebuilt in plain CSS + Lucide icons – the page isn't React, so copy the CSS from the prototype
  (`.bd`, `.ok/.wn/.er/.ld/.ex`), don't run their installer. Spectrum UI also has a Claude Code connector:
  `claude mcp add spectrum-ui -- npx -y @spectrumui/mcp` (needs spectrumhq.in reachable). Needs: member expiry date for the badges.
- [x] (LIVE 25 Nov 1:40pm, member-v2.css) 1 · member page /m · Until the flow above is built: a CSS-only restyle of today's page (was preview `design-sheet7`) + the grown-up card type
  (`book.round2.sg/m?design=design-sheet7&room=vale` – card on the glow, slide-up panel, white main pill + dark "Log in"/"Join" pill).
  Not on main yet – Karen to say "live". Button word "Continue" would read better as "Join with phone number" (words are in the engine).

> **24 Nov 5:22pm – THE NEW MEMBER PAGE IS LIVE FOR EVERY ROOM** (owner 5:21pm: "ok release them live"; engine b3fa9e9c, Light check
> 20/3/0 before and after). `book.round2.sg/m` = the new page, its look = `design/member-v2.css`. The old page is still there at
> `/m?v=1` (fallback only) and still uses `design/member.css`.
> **Function side – LIVE 24 Nov ~1:40pm (owner: "build functions and fix concerns", pricing on hold)** – engine 981806b4, 27 bindings,
> 3 timers; Light check 18/4/0 before, 20/3/0 after. **New member page = preview at `book.round2.sg/m?v=2`** (Kaeden's tile QR
> opens it; every other room still opens today's page). Its look is **`design/member-v2.css`** (a copy of the built-in look – edit
> freely; today's page keeps `member.css`). Ids/classes it needs: `#out` (join/log in) with `#tabs` (`.pill`, `#tJ`/`#tL`),
> `#j1` (step 1: `#jcard` crew card, `#jp`, `#jxw`/`#jx`, `#jnext`) and `#j2` (step 2: `#jc`, `#jn`, `#jpics` `.grid`, `#jpbar`
> `.picbar`, `#jk`, `#jk2`, `#jb`, `#jback`); `#fL` (`#lp`, `#lk`, `#lb`, `#wa` WhatsApp link). Logged in `#in`: `#tierlab`, `#hi`
> (crew name), `#pc`, `#mc` crew card, `#ren` Rename crew, `.box` with `#boxh`, `#rshare`, `#pls` rows (`.pl`, `.pl.off`, `.chk`
> tick = role=checkbox, `.ri` room initial, `.plh` label, `[data-ed]` Edit), `#add`, `#ld` Load, `.lbar`/`#lbi`, `#lt`; `#gonec`,
> `.more` (`#clmc`, Change PIN). Edit panel `#sheet` + `#scrim` (`.grab`, `#sht`, `#en`, `#g2`, `#ecr`, `#sv`, `#rm`, `.rmc`).
> Crew card reveal `#rev` (`#rc`, `.flip`), picture gallery `#avb` (`#avbg`). Cards: `.cd` (`.dots`, `.shine`, `.edge`, `.chip`,
> `.clogo`, `.cn` name, `.cs` since, `.cd.staff`). Kept from the prototype: card colours, `.in .a` rise, `.rise`, `.wipe`, `.flip`,
> reduced-motion rule. Not built (pricing on hold): tier picker, payment, VALID TO, "<Tier> until", Extend. **PS4 tile:** words
> and the two times from **`design/tile.json`** (see `design/README.md`); layout/look is in round2-tv-launcher
> `ps4/tile/tile/draw.h` (one file, with a desktop simulator in `ps4/tile/sim`). **Different from the prototype on purpose:** the PIN is
> typed twice when joining (a mistyped PIN locks the crew out until WhatsApp/staff), a "Rename crew" link (the prototype had no way
> to change the crew name), the step-1 card shows the crew card instead of the tier stack, and the TV cards say ROUND2 / ROUND2 /
> ROUND2 CREW instead of STANDARD / GOLD / PLATINUM + prices (pricing on hold – set `c1`–`c3` / `c1n`–`c3n` in tile.json when
> the owners decide). Checked 24 Nov 1:55pm: book.round2.sg/m?v=2 opens the new page; it uses design/member-v2.css; Light check
> 20/3/0 after everything; Kaeden's tile still 0.13 at 1:41pm (it installs 0.15 by itself – not seen on the TV yet).

**Membership tiers, crew card, simpler member page (design, 24 Nov 2026) – full spec + clickable prototype in `design/membership/`**
- [ ] (not changed by function: it's design's prototype file. The built page has no tier stack yet – pricing on hold – and its one crew card sizes from its own width (aspect-ratio), checked at 375/393/430px, 24 Nov) 1 · join (prototype) · Tier card stack overlaps the top of the tier buttons on 430px-wide phones (~24px); size the stack from the card height. (24 Nov, preview check)
- [ ] (ON HOLD, owner 24 Nov 1:10pm: "for the pricing hold off on that first while we discuss internally" – no tiers, prices, payment, VALID TO or Extend built) 3 · member page + PS4 tile · Paid membership: Standard 2 months $20, Gold 3 months, Platinum 6 months (Gold/Platinum prices
  still to be set by the owners), then $10 a month. Needs a payment step before an account is created, each crew's tier + join +
  expiry date stored, and Extend. Until this is built the design can't show tiers or prices. (24 Nov, design)
- [x] (fixed 24 Nov 1:35pm, engine 981806b4 / commit 50e9e0e – in the new member page – LIVE for every room since 24 Nov 5:22pm, engine b3fa9e9c) – card shows CREW SINCE only; VALID TO + tier name wait for pricing. 2 · member page · Crew name should be the identity: on a membership card ("CREW SINCE / VALID TO"), a "Your crew card is
  ready" screen after paying, the page header after login, and "Loading <crew>'s saves". Sign-up step 2 starts with "Name your
  crew". (24 Nov, design – asked by the owner)
- [x] (fixed 24 Nov 1:35pm, engine 981806b4 / commit 50e9e0e – in the new member page – LIVE for every room since 24 Nov 5:22pm, engine b3fa9e9c) 2 · member page · Too much scrolling: every player has a full name box + 12-picture grid. Wanted: one short row per player
  (tick, picture, name, Edit); Edit / "+ Add a player" opens a slide-up panel with name, pictures, Shuffle, Browse all, Save,
  Remove. Room profile stays the first row ("Vale profile", ticked by default, hidden when `mainok` is false). (24 Nov, design)
- [x] (fixed 24 Nov 1:35pm, LIVE on today's page too, 50e9e0e; on the preview the link adds the typed phone number) 2 · member page · "Forgot your PIN? WhatsApp us" on Log in → https://wa.me/6591625767 with text "Hi Round2, I forgot my
  member PIN. My phone number is ". (24 Nov, design)
- [x] (built 24 Nov 1:40pm: tile 0.14, round2-tv-launcher 2c91662, released on ps4-tile bc7cdcb – only Kaeden has the tile, it updates itself within ~30 min when no game is open. Cards show labels only, no prices (on hold). 1:50pm: tile 0.15 matched to Karen's mockups (round2-tv-launcher branch design-tv-tile, docs/ps4-tile-design.md + docs/img/tile-design) – released ps4-tile 34c726b) 3 · PS4 tile · New scan screen (tier cards, "Pick up where you left off.", members/new guests under the QR, "Not saving
  today? Press PS to play.", no version text) and a new signed-in screen ("Welcome back, <crew>" with the crew card, profiles
  list, progress bar), room-colour glow, calm motion. Wording/sizes in `design/membership/HANDOFF-membership-design.md`. (24 Nov, design)

**PS4 tile – design can't change it yet (owner wants design to edit the tile freely, 22 Nov 2026)**
- [ ] (PART DONE 24 Nov: `design/tile.json` is read – every tile word + the two times, engine /ps4/tilecfg, tile 0.14+, README updated. STILL TO DO: the design preview's tile tab is still a copy of tile 0.13 – port tile 0.15 into docs/design-preview/template.html) 3 · PS4 tile · Only room colours and names come from `design/rooms.json`; every word, size and timing of the tile is in the
  tile's code (round2-tv-launcher `ps4/tile/tile/main.cpp`), so the design team can't edit it. Please build "phase 2": the tile
  (or the engine's `/ps4/tile` answer) reads its wording and timings – idle / loading / ready / "What happens next" texts, how
  long the ready burst and the closing screen last – from a `design/tile.json`, with today's values as defaults, plain ASCII
  only. Then add it to `design/README.md` and to the design preview. (22 Nov, design)

**Booking page `round2.sg/slots` on iPhone (iOS 26 Safari) – reported by a guest-tester 22 Nov 2026**
- [x] (LIVE 22 Nov ~9:45pm, applied from the design side at the co-owner's request – please review) 4 · booking page, pick +
  details steps · On newer iPhones Safari's address bar floats at the bottom *over* the page, so the pinned YOUR BOOKING bar
  (CONTINUE / HOLD & PAY) sat behind it: guests couldn't scroll further and the button was hard to tap. Cause: `.modal` is
  `position: fixed; inset: 0` and `#pick .sum, #det .sum` stick to its bottom, which on iOS 26 is behind Safari's bar. Fix (CSS
  only, 7 lines in `slots/index.html`, marked "iPhone (iOS 26) fix 22 Nov"): `.modal { bottom:auto; height:100vh; height:100svh }`
  plus extra bottom padding on the pinned bar for iPhones (`@supports (-webkit-touch-callout:none)`). Checked on an iPhone 22 Nov
  9:21pm: bar fully above Safari's bar, HOLD & PAY tappable; leaves a small empty band under the bar on iPhones (the extra +30px
  can probably come down). Function side: please run the Light check and tidy if needed. (22 Nov 2026, design)
- [x] (LIVE 22 Nov ~9:55pm, applied from the design side – owner OK'd) 1 · booking page, details step · The pinned bar had no
  "YOUR BOOKING" heading on the details step (the pick step has one). Added the same `<h4 class="sumh">` line – markup only. (22 Nov 2026, design)

**Member page `book.round2.sg/m` (`memPage` / `memApi` in `worker/round2-book.js`) – from the design + accessibility review, 22 Nov 2026**
> **Function side – LIVE 22 Nov 9:00pm** (engine hash 0981692a…, 27 bindings, 3 timers; Light check 18/3/0 before and after;
> branch `member-a11y` merged into `main`). All 9 items below are fixed. For design: pictures stay `.pics div` (now role=radio,
> `.sel` as before); new things to style: `#savec` (the one "Save changes" card), `.lbar` / `#lpbar` (load progress bar, inline
> default), `.lst` (players' load lines), `.rmc` (Remove confirm with PIN box). Rebuild the design kit from `main`.
> Also fixed (from design-preview.md): the tile showed "???" for – ’ … in engine texts – the engine now sends the tile plain ASCII.
- [x] (fixed 22 Nov 9:00pm, member-a11y) 3 · member page · The typed fields have no names for screen readers: each `<label>` sits next to its `<input>` without
  `for`/`id` (or wrapping it), so all 9 fields read as blank. Fix: give each input an id and its label `for=` (no look change).
- [x] (fixed 22 Nov 9:00pm, member-a11y) 3 · member page · The picture picker can't be used without touch: the 12 pictures (and "More") are plain `<div>`s, not
  buttons, so a keyboard can't reach them. Fix: make them `<button type="button">` (or role=radio in a radiogroup) – design
  keeps the look through `.pics div`/`.pics button`, tell design which.
- [x] (fixed 22 Nov 9:00pm, member-a11y) 3 · member page · Errors and "Saved." / "Sent!" messages aren't announced to screen readers (no `aria-live`/`role=status`
  on `.err`), and after a failed Join the keyboard focus falls back to the page because the button is disabled while it
  sends. Fix: `role="status"` (or `aria-live="polite"`) on each `.err`; move focus to the message or the first bad field.
- [x] (fixed 22 Nov 9:00pm, member-a11y) 2 · member page · After Load the phone only says "Sent! Watch the TV". Guests can't see progress on the phone; the
  tile already knows "2 of 3 profiles ready". Idea: poll the same status and show it on the play card.
- [x] (fixed 22 Nov 9:00pm, member-a11y) 2 · member page · Too many Save buttons when logged in (crew name + one per player). One "Save" for the whole crew,
  or save on change, would be simpler.
- [x] (fixed 22 Nov 9:00pm, member-a11y) 2 · join form · Crew name is asked first and reads as required, but it's optional (the engine uses the player name when
  it's blank). Ask for the player name first and mark crew name "optional".
- [x] (fixed 22 Nov 9:00pm, member-a11y) 2 · member page · Join / Log in tabs don't say which is selected to screen readers (no `aria-pressed`/`aria-selected`),
  and with a room the page has no heading at all (room name is a `div`). Fix: `aria-pressed` on the two buttons; room name
  as the page's `h1`.
- [x] (fixed 22 Nov 9:00pm, member-a11y) 1 · play card · Wording no longer matches the look on branch `design-new-look`: the ticks are drawn as on/off switches
  but the text says "Tick the profiles to load" / "Load ticked profiles". Suggest "Choose who's playing" / "Load saves".
- [x] (fixed 22 Nov 9:00pm, member-a11y) 1 · player card · Remove asks for the PIN in a browser pop-up (`prompt()`), which shows the PIN as it's typed. Use a
  small in-page confirm with a password field.

> **Function side – LIVE 22 Nov ~9:30pm (owner asked): pictures are random + better browsing** (engine hash bc3cce3e…, 27 bindings,
> 3 timers; Light check 17/4/0 before, 18/3/0 after). Every time the page opens, each picker shows 12 pictures picked at random
> (7 Lapy + 5 from the big pack; the player's current picture stays first). The endless "More pictures" is gone. Instead,
> under each picker: **🎲 Shuffle** (12 new random ones) and **Browse all 1200** (full-screen gallery, 24 per page, Back / Next,
> "Page X of 50", opens on the page with the current picture, Escape or Close shuts it). For design, new things to style:
> `.picbar` (row with the two buttons, inline flex default), `#avb` (gallery overlay, inline fixed/dark default), `#avbg`
> (its grid, also `.pics`), `#avbn` (page text), `#avbp` / `#avbnx` / `#avbx` (Back / Next / Close). `.more` is no longer used.

> **Function side – LIVE 22 Nov ~9:40pm (owner: "build both, then put into handoff for design team"): CLAIM CODES + TWO CREWS
> IN ONE ROOM** (engine hash ed0f56da…, 27 bindings, 3 timers; Light check 18/3/0 before, 19/3/0 after incl. the new step). What guests now see, and what design
> can restyle (all on the member page; inline styles are only defaults – override in member.css):
> - **Remove a player** → the confirm text now says they'll get a code. After removing, the page jumps to a new card
>   `#gonec` "Removed players" (one row `.gone` per player: name, code in `.code`, "until <date>"). It stays for 30 days or
>   until the code is used, so a lost code can be read again.
> - **Join form** → new fold `#jxw` (a `<details>`: "Removed from a crew? Got a claim code?") with input `#jx`. A good code =
>   the new account's first player gets the removed player's saves; message in `#e0` "Welcome! <name>'s saves are now on your account."
> - **Logged in** → new card `#clmc` "Got a claim code?" (input `#cx`, button `#cb`, message `#e7`): adds the removed player
>   to this crew with their saves. Hidden when the crew is full (4 players), like "Add a player".
> - **Play card** → new line `#rshare` (`.fine.share`, hidden unless needed): "<Crew> is also playing in this room. Your players
>   go on the free Player profiles – theirs stay as they are." When another crew holds the main profile, the main profile's
>   switch is hidden. Only shows in rooms whose PS4 helper is 1.1.152+ (none yet – Kaeden first, see the 22 Nov 9:40pm entry).
> - **TV tile** (no design change): when two crews are in, the "Ready" second line says every player's saves go back to their own crew.

**Round2 PS4 tile (`/ps4/tile` in `worker/round2-book.js`, tile app in round2-tv-launcher `ps4/tile`) – 22 Nov 2026**
- [x] (fixed 22 Nov 9:00pm, member-a11y) 2 · tile · The tile can only draw plain letters: any non-ASCII character from the engine shows as "?" per byte. The
  busy line "One moment – this PS4 is finishing a job…" shows as "One moment ??? this PS4…" on the TV (the – is 3
  bytes). Every tile text from the engine (line, line2, title, refused messages) needs plain ASCII: "-" not "–", ' not ’.

---

**LIVE since 30 Oct 2026, on `main`.** Work on `main` from now on (the `own-booking` branch is merged and retired). The website's Book screen loads `slots/?embed=1` inside itself; payment opens in a new tab.

## ⭐ 25 Nov 2026, 3:35pm – Mac board: TV message text in the room details (engine, read-only)
- Owner: "show the whole message details if guest have it on the context window". The board's /w answer now carries each
  TV message's text (`tx`, up to 400 chars) and who it's from (`fr`) – taken from the message list the timers already keep
  (`__LIST__`, read only). No new SimplyBook or Firebase requests; appears after the next widget snapshot (≤10 min).
- Deployed from live b3fa9e9cd019 → **live 4ff3f14dd26b** (27 bindings, 3 crons checked). **Next deploy starts from live 4ff3f14dd26b.**
- System check not run (needs the staff code) – nothing that books, pays or sends was touched.

## ⭐ 27 Nov 2026, 1:40am – MEMBER PAGE v3 LIVE: Karen's welcome flow (owner 1:02am: "use my gf latest design for member save for the website and make it live")
- **book.round2.sg/m is now v3** for every room (also the Kaeden tile's QR, which no longer adds &v=2). Fallbacks: `?v=2` (24 Nov
  page), `?v=1` (first page). Built from `design/membership/welcome-flow.html` (orb game, card flip/swipe, sheets, TV finale, pull
  to refresh, badges – her code, kept) + v2's real calls (join, login, me, crew, player, addp, delp, claim, pin, play, loadst,
  roomout). Look = **design/member-v3.css** (her CSS minus the inlined fonts → Google Fonts Chakra Petch / Press Start 2P /
  Caveat), built-in copy `MEM3_CSS`; markup + script = `MEM3_HTML` in the engine (`memPage3`, placeholders %%AC%% etc.).
- **What works for real:** Welcome back (a phone with a saved login: "Hey, <crew>! Your save is ready", Load my save goes straight
  in; "Not <crew>? Use another number" = log out) · join = phone (+65 only) + claim code → crew name + first player name +
  picture (tap the circle) + PIN twice → card flips → Load my save · log in (wrong PIN shakes, "no account" → join) · logged in:
  Member / Staff badge, card with CREW SINCE, **room passport** (new: `rooms` in the member record, added at each Load in the
  same write as the load – no extra storage call; Kaeden always stamped; 7 = Black edition), rows with avatar/name, tap = edit
  sheet (name + picture: Shuffle / Browse all), **tap the badge = skip that profile** (Waiting ↔ Skip; the owner's 20 Nov
  "tick which profiles to load"), Add a player, Remove (asks the PIN, then the claim code shows under More), Load → badges
  follow the PS4 board (Waiting → Loading/Clearing → Ready, "Ask staff" on a failed one) → the TV finale → Saves loaded.
  More: rename crew, removed players' codes, claim code, change PIN, log out of this room.
- **Left out (owners/data):** prices + Renew sheet (pricing on hold), Active/Expires badges + VALID TO (no expiry data),
  country codes (store full numbers first), the room profile's face uses the room's character art from Wix (top crop), not
  Karen's hand crops.
- Tested headless (iPhone 13 size) with a pretend engine: join → created → in → add player → skip → load → done → welcome back
  → straight in → log out → wrong PIN. Checked live 1:55am in the owner's browser: page, fonts, orb + 7 marbles, room colour,
  1200 pictures, all images load; ?v=2 and ?v=1 still open.
- **Engine:** live 4ff3f14dd26b → 2491b1c6f1b4 (e1fa634) → **live 99ccce5a0fa1** (d217f9a, card-logo placeholder fix); 27 bindings,
  3 crons both times. ~~Next deploy starts from live 99ccce5a0fa1.~~ 27 Nov 2:45am → **live 82b27b4cf059** (c9b07ea: screens + words from design/member-v3.html, Crew settings, confirm new PIN, softer swipe; 27 bindings, 3 crons). **Next deploy starts from live 82b27b4cf059.** Deploy route used: KV deploy:want = commit → r2-deploy-helper
  opened in the owner's built-in browser with a ONE-TIME deploy:key (set just before, replaced with a new random one right after –
  any old saved helper link no longer works; read deploy:key from KV next time) → deploy:src SHA-256 checked → PUT keep_bindings.
- System check: not run (needs the staff code). This touched the member page and the Load call's write (adds `rooms` to the
  member record) – no bookings, payments or messages; a Full check isn't needed, a Light check is.

## ⭐ 27 Nov 2026, 1:05am – PS4 TILE 0.16: Karen's save screen v2 released (owner 12:38am: "my gf just pushed a new design, make it live")
- **What:** the four screens of `design/tile/save-screen-v2.html` in the tile's own drawing code (round2-tv-launcher
  `ps4/tile/tile/draw.h`, main.cpp loop): 1 Scan (glass orb + 7 room marbles orbiting, "SAVE POINT" curved over it, QR with
  room-colour corners top-left/bottom-right, "Not saving today? Press (PS) to play."), 2 Loading ("Hey, <crew>!", crew card with
  CREW SINCE (+ VALID TO when the engine sends `valid` – it doesn't yet), "Who's playing in <room>" rows with Waiting / Loading /
  Ready / Next / Clearing / Ask staff badges, bar + "n of m profiles ready"), 3 Ready ("<crew> is all set.", full orb in the room
  colour – bounce, 40 sparkles, two rings – rows all Ready), 4 What happens next ("Ready, player one.", 4 steps with marble numbers
  sliding in, "Closing in N" ring) → the tile closes. Same load/close rules as 0.15 (seen_loading/seen_bar/done_since); the ready
  screen now stays `t_burst` (4 s, was a 1.5 s burst). Simplified for the PS4's software drawing: no blur, the glass/full orb cached
  as a picture per room colour, avatars are coloured circles with the first letter (room row = room colour + its letter, no
  character face yet). Positions measured from the mockup at 1920x1080 (Playwright) and checked side by side with the simulator.
- **Built on GitHub now** (no build box needed): workflow `.github/workflows/ps4-tile.yml` on branches tile-v2 / ps4-helper – OpenOrbis
  toolchain v0.5.4 `toolchain-llvm-18`, clang/lld 18, OpenSSL 1.1.1w built for PkgTool.Core (a self-contained .NET Core 3.1 app),
  then it force-pushes the package + json to branch **ps4-tile-staging**. Releasing = check the staging build, copy
  `round2_tile.pkg` + `round2_tile.json` to branch **ps4-tile** (done for 0.16: sha256 7d289114…, 6,619,136 bytes, same PKG layout
  as 0.15). This workspace can't download Actions artifacts (blob storage blocked) – hence the staging branch.
- **Words:** `design/tile.json` rewritten in Karen's words; 0.16 reuses the engine's existing keys (no engine deploy): c1 = word over
  the scan orb, c2 = word over the full orb, c3 = card label, c1n = "SAVES LOADED", c2n = "Ready, player one.", c3n = rows heading
  (empty = "Who's playing in {room}"), n1–n4 = steps "main|small", n5 unused, `[PS]` = round PS button. Checked with the engine's own
  ps4TileCfg code. Kaeden's 0.15 shows these words in its old layout until it updates (≤ 30 min, only when no game is open).
- **Installed on Kaeden 27 Nov 1:01am** (owner: "push the update now"): `/_tile.now` via the control centre's ps4look → "install started (task 372)", Kaeden reports tile 0.16. (A clean slate had run on Kaeden at 12:53am, done before the install.)
- **Simulator:** `ps4/tile/sim` (`ROOM=vale ./sim`) draws every screen; the design preview kit's tile tab is still the 0.13 copy.
- **Not done:** System check (needs the staff code – Light check is enough, the tile can't touch bookings). Not yet seen on a real
  TV: watch Kaeden's first scan screen + a member load (speed of the orbit/rows on the PS4's CPU is the unknown).

## ⭐ 27 Nov 2026, 1:30pm – Karen's save screen v4 built: engine live, tile 0.20 released (Kaeden offline – not on the TV yet)
Owner 12:29pm: "a new design for both tv and member website has been publish from my gf side. can you make it live".
- **Engine (live 5d093538, 27 bindings, 3 crons):** loadst (phone signed in with the room's code) puts `scan {mid, crew, pass, at}` on
  the tiletok record (no new storage key; only the first loadst per crew writes); `act insert` (phone swipe) adds `scan.ins`;
  /ps4/tile sends `scrw, spass, sago, siago` (only for a scan newer than the last Load) and `pass` (memplay.pass, set at play);
  roomout + a room reset clear the scan; a reset no longer marks a crew out whose Load is < 2 min old; TILE_MEMO 10 → 3 s;
  /ps4/tilecfg adds the v_* words; member page v3 gets MEM3_MC_JS (the swipe card above "Who's playing", hidden once this crew
  has loaded); new PINs = 6 numbers. Passport = PASS_ORDER (vale, atlas, kai, bella, scarlett, kaeden, max), Kaeden always on.
- **Tile 0.20** (draw.h scan_v4 / ready_v4 / mc_*, main.cpp poller): the card body is drawn once into a sprite (MCS) and copied each
  frame, cut at the deck's mouth (y 598); the deck is in the still picture. Waiting = bob/blink/glance/hop, sleepy + "z z z" after
  5 s; phone connected = wide eyes, crew name, "HI, <CREW>!"; insert on the swipe or 6 s after the scan (1.5 s glide, flash, LED,
  READING..., blocks 260 ms apart, SAVE FOUND n/7 or ALL 7 ROOMS! + colour cycle, shine); Ready = card in the deck, cheer, LED pulse,
  GAME SAVED / PRESS (PS). Poll: 4 s on the scan screen for its first 3 min and while a phone is connected, else 15 s (3 s loading).
  Sim checked: Vale, Atlas (dark letters on the near-white label), 4/7 and 7/7, long crew name cut to fit.
- System check: new step "PS4 save screen v4", the claim-code step now uses a 6-number PIN (it failed after the PIN change).
- **Still to do on the PS4:** Kaeden has been silent since 3:34am. When it's back: install helper 1.1.157 (ps4update ch=test),
  then /_tile.now for tile 0.20 (not within 10 min of a load), then a real scan → swipe → Load test, read save.log + the tile.

## ⭐ 27 Nov 2026, 3:42am – engine: a room reset ends the crew's room session; Kaeden silent since 3:34
- Owner 3:34am: "now both profile pictures are not in. also is it normal that ready aliff bozz + karen bozz shows up at the first
  tile in the ps4 tile after a clean slate". Pictures = the 1.1.156 stamp bug (both stamps matched after a reset) – fixed in 1.1.157,
  still NOT installed: Kaeden's helper restarted 3:29:48 (PS4 restart), a load ran ~3:30, last poll 3:34:21, then nothing (ps4update
  → "The PS4 isn't answering"). Install 1.1.157 (ps4update ch=test) once it's back.
- "Ready" after a clean slate: ps4Tile kept mp.fin ("Ready, Karen bozz + Aliff Bozz!") for the whole session; a reset didn't end it.
  **Engine fb8acb2 (deployed 3:40am, live = repo, 27 bindings, 3 crons, light check 19/4/0 – old warnings):** in ps4In, when a
  report shows a reset/clean/purge clean slate STARTING (kind changed, or done → running), memplay:<id> gets out = now
  (outWhy "room reset (…)") – the tile shows the plain QR screen, the phone asks to load again. One extra DO read only then.

## ⭐ 27 Nov 2026, 3:25am – tile 0.19 (lag) on Kaeden; helper 1.1.157 (picture after a clean slate) waits for a PS4 restart
- Owner 3:14am: "ps4 tile seems laggy … is it cpu encoded … any hardware acceleration available for gpu??" Everything on the tile
  is drawn by the CPU, pixel by pixel. The screen memory (Scene2D, sceKernelAllocateDirectMemory type 3 = WC_GARLIC) is
  write-combined: fine to write, very slow to READ – and every soft edge/glow/text pixel reads the pixel under it (blend). **Tile
  0.19:** each frame is drawn in a malloc'd buffer (WORK) and copied to the screen once (main.cpp only; CI build from ps4-helper
  f5822e3 → ps4-tile; Kaeden 3:23am). Not tried yet: the intro still re-draws the whole card each frame for 1.2 s; GPU drawing
  (Gnm) needs Sony's shader compiler, not in the homebrew toolchain – not worth it for a 2D screen.
- Owner 3:16am: "i loaded karen's save file, and aliff bozz profile picture didnt load instead?" Log: a session reset ran at
  03:05 (default pictures back on all spares); at the 03:13 load Karen's picture went on (03:13:51), **Aliff got no avatar line**:
  1.1.154's stamp prep/av_16c45cc8.txt still said "m7xbafbe3/p2 <size>" from 02:33 → skipped. **1.1.157** (ps4-helper 0bdd453,
  ps4-test): stamps removed at a clean slate + by /_avreset//_avcopy, and a matching stamp only skips if the picture files are
  really there. Install was REFUSED by the helper's guard: "waits for the next PS4 restart (5 switches since it started)" – owner
  to restart Kaeden, then ps4update ch=test again.

## ⭐ 27 Nov 2026, 3:15am – tile 0.18 = Karen's save screen v3 (owner: "my gf pushed a updated design u didnt pick up")
Owner 3:04am: "everytime a new version is pushed, check design if there are updates". Karen pushed save-screen-v3 at 2:53-2:59am,
just after tile 0.17 was built (2:47am). **New standing rule in both CLAUDE.md files: before every release, read design/ + index.html
git log and the concerns list since the last release.** Tile 0.18 (draw.h + main.cpp, sim updated; CI build from ps4-helper 4022221 →
ps4-tile; Kaeden installed 3:14am via /_tile.now): v3 crew card (brushed metal, gold chip with contact lines, room glow top-right +
bottom-left, edge light, shadow pool, card at x748 y389), card_live() = faces fade onto the card as profiles turn ready + PLAYERS n/m
+ a short edge glow; ready rows green; scan sub-line in two lines; "Waiting for your phone" + 3 pulsing dots under the QR. Concern ticked.

## ⭐ 27 Nov 2026, 2:55am – Kaeden on helper 1.1.156 + tile 0.17 (ps4-tile)
Owner 2:43am: "A [the countdown is cut ~2 s in], and it doesnt close the tile after relogin. how can karens profile be still
signed in when the ps button stage logs everyone out?" **round2_shell12.txt** (menu add-on log) explains all three:
02:33:00 load finished → add-on waits for the tile to close, **max 20 s** → 02:33:20 "tile still open after 20 s" → 02:33:21 menu
Log Out for everyone (this cut the tile's countdown: a nothing-to-copy load waited 10 s before "ready", + 4 s ready + 6 s next =
past 20 s). Karen WAS logged out at 02:33:21; owner signed her back in at 02:33:43 – the waiting picture was only checked once a
minute (outer main loop) and missed the 22 s. The menu Log Out leaves the tile app open behind the picker.
- **helper 1.1.156**: waiting picture checked every 2 s (inner loop); after a member load, as soon as nobody is signed in (add-on
  log-out) + tile still open + no load on → helper closes the tile for real (log "tile: everyone was logged out after the member
  load - tile closed for real"); 1.1.155's 40-s fallback stays.
- **tile 0.17** (main.cpp only, CI build from ps4-helper 3d78378, released to ps4-tile): ready after 3 s instead of 10 when the
  helper's tile-live file says done → 3 + 4 + 6 s fits inside the add-on's 20 s. Makefile VERSION must be bumped with TILE_V (CI
  takes the json version from the Makefile – first 0.17 staging build said "0.16").
- No add-on change. Kept-player reload with the profile signed in: picture goes on at the add-on's log-out now.
- Installed 2:59am via /_tile.now (first try: "download size 6619147, expected 6619136" – 11 bytes extra with a 200, cause unknown; the retry a minute later went fine). Kaeden: helper 1.1.156, tile 0.17.

## ⭐ 27 Nov 2026, 2:40am – Kaeden on helper 1.1.155 (tile closed for real after a load)
Owner 2:34am: "loaded karen's profile again.... doesn't change the profile and ps4 tile doesn't close after 5 sec, it closes only
after 2 sec, and after press ps button to log into karen the ps4 tile is still running". Logs: no helper close this time (1.1.154
fix holds). **Picture:** 02:32:59 "avatar: 16c45cc7 is signed in - picture waits until it signs out" – Karen's profile has stayed
signed in all night, so it waits (Aliff's, signed out, went on at 02:33:00). Normal guests aren't hit: a new load signs the profile
out first. **Tile still running:** ps4list 2:36am running = RTWO00001 with Karen signed in – the tile's own close
(sceSystemServiceLoadExec "exit") only goes to the home screen and leaves the app open (and never runs if PS is pressed mid-
countdown). 1.1.155: 40 s after a member load finishes (kept or loaded), no new load on and the tile still open → helper closes it
(close_game, log "tile: still open 40 s after the member load - closed for real"). "Closes after 2 sec" – asked owner what he means.

## ⭐ 27 Nov 2026, 2:35am – Kaeden on helper 1.1.154 (owner OK 2:21am "ok install now")
1.1.153 installed 2:22am, then owner 2:24am: "the ps4 tile closes before the 5 sec timer is up … and the profile picture didn't
change, i just relogged in in karen's profile". save.log: **02:24:06 "close done: RTWO00001"** = the helper's tile-update check
(runs 2 min after the helper starts, then every 30 loops) closed the open tile BEFORE asking if a new tile exists (since 1.1.90)
– the fresh install restarted the helper, so it hit mid-countdown. And **"Karen bozz already on profile 16c45cc7 with the newest
saves - nothing copied"** = kept players never got av_apply. **1.1.154** (ps4-helper, installed 2:34am via ps4-test): tile closed
only when a new tile version is really waiting and not while tile-live.txt changed in the last 10 min; kept players get their
picture too (profile stamp /data/round2/prep/av_<user>.txt = member/slot + bundle size, same = skipped; signed in = waits).
Two crews side by side (1.1.152 add mode) not yet tried on the TV.

## ⭐ 27 Nov 2026, 2:25am – Bug: member picture not changed when the profile was still signed in → helper 1.1.153 (test, not installed)
Owner 2:16am (Kaeden, photo): loaded Karen bozz + Aliff Bozz after Ryan (hipponips) had played; Player 1 became "Karen bozz" but
kept Ryan's picture (Ezio). Cause (code, 1.1.98): `av_apply` refuses on a SIGNED-IN profile ("picture not changed") – the name
changes, the picture can't. Ryan's profile was still signed in. Fix 1.1.153 (ps4-helper, on ps4-test): the picture waits in
/data/round2/av-pending.txt and goes on at the first check-in after that profile signs out (only if the profile still belongs to
that member). 1.1.153 also carries 1.1.151 (tile first) + 1.1.152 (two crews + "a profile taking a new player is released first
if it holds someone else's games"). Kaeden still 1.1.150 – install needs the owner's OK.
- Checked: neither Karen's nor Ryan's cloud list changed tonight. What was on Ryan's profile before Karen's load (GTA V) went to
  the deferred room backup (save.log 02:14:32 "deferred backup sent … 16c45cc7-CUSA00419") – NOT into Ryan's member saves; that
  is exactly the 1.1.152 release-first fix. If Ryan played GTA tonight, that progress is only in the room backup.

## ⭐ 27 Nov 2026, 1:20am – GTA V save copied to staff Ryan's new member (owner: "copy karen's gta5 save file into this new member hipponips, that is our staff ryan")
From crew "ROUND2_" (m7xbafbe3) player p1 "Karen bozz" → crew "ryan mar" (me956uzp0, joined 27 Nov) player p1 "hipponips".
Done straight in R2 (Cloudflare API): wrote `saves/members/me956uzp0/p1/index.txt` (it didn't exist – checked, nothing
overwritten) with Karen's 5 GTA V lines only (CUSA00419: SAVEDATAPROFILE, SAVEDATASGTA50000, SAVEDATASBGTA50000, sce_sdmemory,
sce_bu_sce_sdmemory; versions 21–22 Nov). The lines point at Karen's stored pieces (7 found under each – nothing copied or
moved); Karen's own list unchanged. Ryan's next load puts them on his profile; his own later uploads go to his own folder.
Undo = delete that index.txt. Note: Ryan's crew isn't marked staff in the member list (memstaff) – ask the owner if it should be.

## ⭐ 27 Nov 2026, 12:55am – Atlas + Bella network check (owner: "pull the logs from atlas and bella, check if network dropped")
Both PS4s were silent (not checking in), so no look job could run; read the log lines each one last sent the engine (ps4list
`log`: netfail / slow / boot / stopped – rest.log isn't in the report). Atlas clock ~8 min fast (stamps = PS4 time).
- **Atlas** (1.1.114, round2-ps4 ch6, 74 %, 192.168.120.2): session Tue 24 Nov 11am–2pm, hourly "helper running" 10:51–13:51,
  last report 2:36pm real, silent since. **No network failure logged since 20 Nov 06:40** (3 sessions). Rest/wake lines: rested
  21 Nov ~5:45pm → woke 23 Nov 10:49; rested 23 Nov ~11:22am → woke 24 Nov 10:51. Silence after the session with no fail = the
  usual rest (TV off → PS4 rest over HDMI), not a drop; no Atlas booking since, so nobody turned it on. Not confirmed until it
  starts again (its next slow.log start line says "woke from rest").
- **Bella** (1.1.114, round2-ps4 ch6, 84 %, 192.168.120.2): rested Mon 23 Nov ~2pm → woke Wed 25 Nov 5:20pm with ONE check-in fail
  (60 s, at the moment of waking = Wi-Fi reconnecting, normal), then fine through the 7:30–10:30pm session; last report 10:34pm,
  silent since = rest after the session. Before that only 21 Nov 10:55–11:09 (3 fails, back within 2.5 min). "stuck 30481 s in
  'loop'" at the wake = rest time counted by the watchdog, not a hang.
- **Note:** both last reported the same address 192.168.120.2 (Atlas on Tue, Bella on Wed – never at the same time). Fine while
  only one is on; if both are on together the router should give different ones, but a fixed address per PS4 (router IP+MAC
  binding, owner's OK) would rule out a clash – the old Bella "Wi-Fi up, no internet" suspect was an address clash.

## ⭐ 24 Nov 2026, 5:22pm – NEW MEMBER PAGE LIVE FOR EVERY ROOM
Owner 5:21pm: "ok release them live". `/m` now serves `memPage2` (the new page) for every room; `/m?v=1` = the old `memPage`
(fallback; one line in the route to swap back). Engine b3fa9e9c (27 bindings, 3 timers), Light check 20/3/0 before and after,
checked through book.round2.sg/m?room=vale. Tile 0.15 is released (ps4-tile) – only Kaeden has the tile; at 5:20pm it said
"waits: CUSA00419" (a game open), so it installs by itself after the game is closed. Other rooms: the tile stays off (helper
1.1.114, no tile-on) – turning it on there is a separate owner decision (helper update). Not tried yet with a real join/load.

## ⭐ 24 Nov 2026, 1:40pm – MEMBERSHIP LOOK BUILT (no pricing): member page v2 preview + PS4 tile 0.14 + design/tile.json
Owner 1:10pm: "ok handoff read the ps4 tile and phone member handoff, we need additional functionalities, for the pricing hold
off on that first while we discuss internally, build functions and fix concerns". 1:33pm: Karen's TV mockups are being pushed
("give it a bit of time") – not in the repo at 1:40pm; tile 0.14 follows the written spec until they land.
- **Engine (live 981806b4, 50e9e0e; Light check 18/4/0 before, 20/3/0 after – Light, not Full: no booking/payment code touched):**
  `memPage2` at `/m?v=2` (look: design/member-v2.css → built-in MEM2_CSS), same `memApi` acts (join with crew + name + av +
  claim; login; crew; player; addp; delp; claim; play; loadst; roomout; pin). Join is 2 steps in the page, ONE `join` call.
  Today's page unchanged except the WhatsApp PIN link. `/ps4/tile` now also sends `crew` (all crews this session, ASCII, max 44,
  fallback "your crew") + `since` (mm/yy of the crew's join; `memplay` crews keep `since`). Kaeden's tile URL adds `&v=2`.
  `/ps4/tilecfg` = design/tile.json flattened (groups ignored), every text ASCII + length-capped, empty = default (except
  s_foot / c1n–c3n), t_burst clamped 0.5–5, t_next 3–20; `?design=<branch>` previews a branch.
- **Deploy note:** the change was ~46 KB, too big to paste in one go – pieces were stored for an hour in KV `HOLDS` as
  `deploytmp:p7_NN` (each SHA-checked), assembled, live hash checked before/after, then deleted.
- **Tile 0.14** (round2-tv-launcher ps4-helper 2c91662; released ps4-tile bc7cdcb – only Kaeden has the tile, so only Kaeden
  updates, by itself, no game open): drawing moved to `ps4/tile/tile/draw.h`; desktop simulator `ps4/tile/sim` draws the same
  code. Scan screen: words left (kicker + room name, "Pick up where you left off.", sub), 3 matte cards (charcoal / bronze /
  near-black, labels from tile.json, no prices), QR right with room-colour corners, "Members scan to log in / New guests scan to
  join", "Not saving today? Press PS to play.", glow + dot texture + dark edges; ~1.6 s intro, then only the QR corners and logo
  breathe. Signed-in screen ("loading" with a crew, or the load board): "Welcome back, <crew>." + crew card (CREW SINCE) +
  profiles list + bar; done = "<crew> is all set." Ready burst / "What happens next" times + words from tile.json. Version +
  id now only next to an error. Not tested on the TV yet – Kaeden needs to pick it up (helper checks every 30 min).
- **Design files added (new, nothing overwritten):** `design/tile.json` (today's words), `design/member-v2.css` (the v2 look),
  README rows + tile.json rules. **Design preview kit** (`docs/design-preview`): its tile tab is still a canvas copy of 0.13 – not
  ported yet on purpose: Karen's TV mockups are about to change the tile again; port after that (or use `ps4/tile/sim` pictures).
- **System check:** new step "PS4 tile words + new member page" (ASCII, timings in range, where the words came from).
  systems.json: "New member page + new PS4 tile screens (24 Nov)" = test. Control centre 716fbb0.
- **1:50pm – Karen's TV mockups landed** (round2-tv-launcher branch `design-tv-tile`: docs/ps4-tile-design.md + 3 pictures; not
  merged – design's branch). **Tile 0.15** (ps4-helper c54752a, ps4-tile 34c726b) matches them: room name top-right (pixel font,
  room colour), kicker in the pixel font, title/sub, divider + foot line (only when `s_foot` is set – the "$10 a month" line
  waits for pricing), stack of 3 cards (back two = top strip only; front = chip, logo bottom-left, MEMBER bottom-right), QR
  300 px with corners, "Members"/"New guests" in the room colour, full-width line + "Not saving today? Press [PS] to play." with
  the PS boxed + book.round2.sg/m right. Signed in: tier kicker → "ROUND2 CREW" (no tiers yet), card with logo top-right + crew
  name + CREW SINCE (no VALID TO yet), profiles as plain rows (name left, Ready/Loading/Next right, thin lines), thin bar full
  width + "n of 3 profiles ready". Kept from the owner's 21 Nov ask (not in the mockup): rows light up in order, "Player 1" turns
  into the member's name, a shine moves over the row being loaded. design/tile.json `s_ps` now has `[PS]` (a word in [ ] gets a box).
- **Next:** owner + Karen try `/m?v=2` (on Kaeden: scan the tile) → switch `/m` to v2 for every room (one line in the route);
  match Karen's TV mockups when pushed; pricing when the owners decide (tier, join + expiry per crew, payment, Extend).
  Helper 1.1.152 (two crews) still waits for the owner's OK – tile 0.14 doesn't need it.

## ⭐ 24 Nov 2026, 1:10pm – MEMBERSHIP: design → build pack (owner builds next)
Everything the design side has for the membership build, in one place. **Owner: "ill build" (24 Nov).**

**Already live (design, `design/member.css`, Karen 24 Nov 1:02pm):** round pictures with a room-colour ring + small ✓ on the
chosen one, round player pictures, tick boxes in the room colour. Works on today's page (with the member-a11y fixes, live
since 22 Nov 8:36pm). Nothing else of the membership design is live – it all needs code.

**The spec:** `design/membership/HANDOFF-membership-design.md` (wording, layout, motion, card look for phone + TV) and the
clickable phone prototype `design/membership/prototype.html` (also in the design preview, "Membership draft" tab). Karen's TV
mockups are on her own design canvas "Round2 PS4 tile – Scan screen redesign" – ask her for the link.

**What to build** (each is also a line in DESIGN → FUNCTION CONCERNS above – tick them there when done):
1. **Paid sign-up** – tier picker (Standard 2 mo $20 · Gold 3 mo $__ · Platinum 6 mo $__ – owners still to set Gold/Platinum),
   phone number → HitPay → only then create the account; renewals $10/month; **Extend**. Open questions for the owners: does
   every tier renew at $10/month? perks per tier? what happens at expiry (the 13 Nov notes say: saves frozen ~3 months, then
   deleted – not final)?
2. **Store per crew:** tier, join date, expiry; send crew name + tier + expiry to the tile (`/ps4/tile`) for the signed-in card.
3. **Join step 2:** "Name your crew" first, then first player's name + picture (12 shown, Shuffle, Browse all) + PIN → crew
   card reveal ("Your crew card is ready", CREW SINCE mm/yy, VALID TO mm/yy).
4. **Logged in:** crew header (pixel font) with "<TIER> CREW" + "n of 4 players", the crew card, "<Tier> until <date>" +
   Extend; "Who's playing in <room>?" with the room profile row first ("<Room> profile", ticked by default, no Edit, hidden
   when `mainok` is false), then **compact player rows** (tick, picture, name, Edit). Edit / "+ Add a player" opens a
   slide-up panel (name, pictures, Shuffle, Browse all, Save, Remove). Max 4 players. Load → "Loading <crew>'s saves ·
   <profile>…" → "<crew> is all set." Keeps today's `loadst` progress.
5. **Log in:** "Forgot your PIN? WhatsApp us" → `https://wa.me/6591625767?text=Hi%20Round2%2C%20I%20forgot%20my%20member%20PIN.%20My%20phone%20number%20is%20`
6. **PS4 tile (needs a new tile build):** new scan screen (three columns: words / stacked tier cards / QR with room-colour
   corners; "Pick up where you left off."; "Members scan to log in" / "New guests scan to join"; "Not saving today? Press
   [PS] to play."; **remove the "tile 0.13 id file" text**), new signed-in screen ("Welcome back, <crew>", crew card, profiles
   list + bar), room-colour glow, calm motion. Matte cards: draw in code or ship one PNG per tier. **Plain ASCII only** – the
   tile shows any other character as "?" (the open "???" item above is the same bug).
7. **Tile phase 2** (item above): let the tile read its words/timings from `design/tile.json` so the design team can change
   the tile without a build – worth doing together with 6.

**Build notes from the preview:**
- Prototype bug to fix while building: the stacked tier cards overlap the top of the Standard / Gold / Platinum buttons on
  wider phones (≈24px at 430px wide – iPhone Plus / Pro Max; 1px at 393; fine at 375). Size the stack from the card height
  (e.g. stack height = card height + 2 × offset) instead of a fixed 280px.
- Keep the class/id names the current page uses where the parts survive (design CSS relies on them), or tell the design team
  the new names in `design/README.md`.
- After building: Full check (bookings/payments touched) and update the design preview so Karen can see it – kit and how-to in
  **`docs/design-preview/`** (its tile tab is a copy of tile 0.13 – port the new tile screens into it).

**Not merged, for reference:** branch `design-new-look` (22 Nov, owner's design session) – an alternative "player select" look
for the member page in the TV home screen / round2.sg style. Karen's live design (round pictures) replaced it as the direction;
keep or delete as the design team likes.

## ⭐ 22 Nov 2026, 9:40pm – CLAIM CODES (removed player takes their saves) + TWO CREWS IN ONE ROOM (helper 1.1.152, test)
Owner 8:49pm: "if join on their own, then how can the new member claim their saves, also what if there are 2 members in one room,
each with individual saves, is there a way we can load from each?" → 8:53pm "BUILD BOTH, THEN put into handoff for design team".
- **Before:** a removed player's saves stayed under the old crew with no way out; a second crew pressing Load cleared the first
  crew's profiles (saves safe in the cloud first) – one crew per room at a time.
- **Claim codes (engine, LIVE ed0f56da…):** `delp` now makes a one-time code (8 chars from ABCDEFGHJKLMNPQRSTUVWXYZ23456789,
  shown XXXX-XXXX, 30 days) → KV `claim:<CODE>` {from crew id, phone, slot, shown, av, until} + kept on the crew's `gone` entry
  (memPub `gone` lists unclaimed, unexpired ones). Use it: `join` with `claim` (checked BEFORE the account is made; bad code =
  field jx, no account) → the player's list goes to `<new>/p1` (picture: the one picked at join); or logged-in `claim` act
  (rate 10/10 min per IP; refused for your own crew – use Add a player; crew full = refused) → new slot, picture copied too.
  The move copies ONLY `members/<old>/<slot>/index.txt` (+ avatar.bin) – every line holds the full path of its save version, so
  nothing else is copied; the old index stays as history (no SAVES.delete anywhere). `moved:<old>/<slot>` = `<new>/<slot>`:
  /ps4/sget and /ps4/sput redirect that player's index.txt (60 s memo, one DO read per index call only), so a PS4 that still
  has them linked tonight (cloud batch later) uploads to the NEW account. Tested in node with a fake store (join + claim, reuse
  refused, own-crew refused, redirect) and in the page (Playwright).
- **Two crews (engine LIVE, helper 1.1.152 on ps4-test – NOT installed anywhere):** `memplay:<ps4>` now keeps `k` (the TV code)
  and `crews` [{mid, crew, main}]. `play`: another crew loaded with the SAME code and not logged out of the room + the PS4 reports
  helper ≥ 1.1.152 → command `/_memadd.<crew>.<slot>.<Name>…` instead of `/_memplay`; main profile refused unless this crew owns
  it (first crew = main). `roomout` removes only that crew (room "out" when none left). `loadst` returns `others` (other crews'
  names) + `mainok` for the phone. Older helpers: unchanged (one crew at a time, the old switch).
- **Helper 1.1.152 (ps4-helper 1.1.151 + this; sym in /home/claude/symbols):** `/_memadd` = look_memplay add mode: profiles
  linked to any crew's player (tag not empty, not x<k>) and the main profile are never released/renamed/re-linked; new players
  take free spares (no tag or x<k>), clean ones (no member-able games) first; too few free = refused before anything changes
  ("This PS4 has N free player profiles and M players to load…"); only this crew's profiles get linked. **Also in BOTH modes:** a
  profile taking a NEW player is released first if it still holds member-able games (GT Sport/house saves don't count) – before,
  the last owner's other games stayed on it and went to the new player's cloud after the session. **To test on Kaeden (owner
  there, no game open, owner's OK to install):** 1) tile first on the home screen after a load (1.1.151 part); 2) crew A loads 1
  player, crew B scans the same code + loads 1 → B on Player 2, A untouched, tile "Ready" line says each crew; 3) session upload
  → each player's saves in their own crew; 4) remove a player, claim on another phone, load → saves there.
- **System check:** new step "Member claim codes + two crews in a room" (light-safe: a wrong code is refused before an account is
  made; member save lists locked to the PS4 key; lists rooms whose helper can take a second crew). systems.json: "Member crews:
  claim codes + two crews in one room (22 Nov)" = test. Control centre commit bdca5fa.
- **Design:** see "Function side – LIVE 22 Nov ~9:40pm" under DESIGN → FUNCTION CONCERNS (new ids/classes).

## ⭐ 19 Nov 2026, 10:10pm – MEMBER LOGIN PART 1 LIVE + Kaeden back to normal + Bella/Atlas Wi-Fi plan
- **Member accounts (engine c933972, live sha 9d18544eee64, 27 bindings, 3 timers; Light check 14/4/0 before and after):**
  `book.round2.sg/m` (`?room=max` shows the room) – Join (name, phone, 4-digit PIN; 1234/0000/four-same refused) or Log in
  (phone + PIN; 5 wrong = locked 15 min). Then: PS4 name (2–16 letters/numbers) + one of 12 pictures (emoji set MEM_PICS), change
  PIN (logs other phones out). Store: `mem:<phone>` (65xxxxxxxx) + `memlist`. PIN = HMAC('r2mem1|'+PS4_KEY) over salt+PIN, never
  plain. Token on the phone = phone.exp.tv.sig (180 days). Staff gm: `memlist`, `memstaff` (phone, on=1/0), `memunlock`, `mempin`.
  round2-book wrapper (GitHub Pages) now allows `/m`. Owner + girlfriend sign up first → mark both staff (owner 9:59pm).
- **Owner decisions 9:41–10:05pm:** login = phone + 4-digit PIN; members join by a QR on screen. The **Round2 PS4 tile** only opens
  the page (QR) + shows progress, and must keep guests from interrupting save prep: **it waits for a running clean slate to finish
  (or confirms one ran) before loading the member's saves.** Part 2 = put name/picture/saves on the PS4 (memload/memtag exist on
  1.1.84+; Max is still on 1.1.68 → needs the test line before staff saves on Max are protected). fPKG tools (PkgTool needs .NET,
  release downloads blocked here) → build on the owner's computer (asked, not yet answered).
- **10:10pm:** PIN is now **4–8 numbers** (owner; engine 9776c6e, live c89ea5226cba, 27 bindings, Light 14/4/0 before+after);
  easy PINs refused (all same, 1234…, 4321…); numbers only on the page and the server. The tile's PIN box must use the PS4
  **number keypad** (IME number type), not the full keyboard (owner). Max update to 1.1.86 (owner OK) was **refused: "a game is
  open"** (girlfriend in GTA V on Max main) → resend when GTA is closed; then tag Max main to her member id.
- **10:20pm:** one name only (owner): the join name IS the PS4 name (2–16 letters/numbers), editable on the member page (engine
  live 51e3f3ebf8b7, Light 14/4/0 after). First member **Karen** (m7xbafbe3) marked staff. **TO DO (owner):** profile pictures
  from Lapy's Avatar Changer + its big avatar pack instead of the emoji set. **Open design (owner thinking):** couples / +1 –
  extra profiles under one membership (name + picture + own saves = a member slot) vs each person their own membership; owner
  feels a free linked 2nd member is wrong, and the main holder must be able to remove a +1 profile (break-ups).
- **10:30pm CREWS (owner 10:23pm, engine live 7af233dfe0c5, Light 14/4/0 after):** an account = a **crew** (couple/group or one
  person) with a crew name; inside = **players** (own PS4 name, picture, saves; slot p1, p2 … = members/<id>/<slot>; max 4).
  One crew pays; more players cost more (prices: owner later). Break-up: holder removes a player (PIN asked); they join on their
  own; removed players' slots are kept in `m.gone` (saves stay in the cloud). Old one-name accounts (Karen) became crew + p1.
  Page actions: join (crew, name, phone, pin), crew, player (slot, shown, pic), addp, delp (slot, pin), pin.
- **10:42pm owner decisions (saves + price):** NO shared/co-op guessing – whoever starts a game keeps that save in their own
  player, exactly as the PS4 does; every player is backed up as a member. **The tile tells the crew where each save is** ("It
  Takes Two: your save is on Karen – start it from her profile"). No charge per player; maybe a **$2 add-on per player for a
  custom PS4 name** (not built, owner said "maybe"). Page price line removed (engine live 6ddb43da54be, Light 14/4/0 after).
- **11:20pm PS4 TILE v0.01 + Bella/Atlas on round2-ps4:**
  - Build box: OpenOrbis `toolchain-llvm-18` + .NET Core 3.1 SDK (owner downloaded to his laptop's round2-tv folder, staged
    here) + OpenSSL 1.1.1w built from source (/opt/ossl11; PkgTool.Core needs libssl 1.1). `. /opt/oo/env.sh; make` in
    round2-tv-launcher `ps4/tile` (branch ps4-helper 41be6cb). fPKG `IV0000-RTWO00001_00-ROUND2MEMBERS000` → owner's
    round2-tv folder as `Round2-tile-0.01.pkg`. Shows QR to book.round2.sg/m?room=<room> + live status; console id via
    dlsym(libkernel, sceKernelGetOpenPsId). NOT yet tested on a PS4.
  - Engine `/ps4/tile?id=` (live e96ef9aab3ee; one kvMany, 10 s memo; ASCII text). Light 13/5/0 after – the extra "look at"
    = Kaeden's 7 not-installed-game restore notes, not the engine.
  - Owner saved Multi-SSID **round2-ps4** (2.4 GHz, WPA2). Bella 192.168.120.2, Atlas 192.168.120.3 – a **separate subnet**:
    Kaeden → `/_ddp.192.168.120.2` = **no answer** → PS4s on round2 can't wake Bella/Atlas; laptop on round2 can't FTP them.
    Owner to choose: keep as a short test vs undo.
- **11:40pm TILE AUTO-UPDATE (owner: "teach the helper to update the tile"):** helper **1.1.87** (ps4-helper 41be6cb+, published
  ps4-test 4e99080, sha e0c17fe2…) checks `GET /ps4/tileinfo` 2 min after start + every 30 min (+ look `/_tile.now`), downloads
  `POST /ps4/tilepkg` (size + SHA-256) to /data/pkg/round2-tile.pkg and starts the PS4's background installer (BGFT via
  dlsym libSceBgft: IntInit / IntDownloadRegisterTaskByStorageEx (path /user/data/pkg/…) / DownloadStartTask). Never while a
  game/the tile is open or during clean/backup. Refused → file stays in /data/pkg for Debug Settings › Package Installer (hdd).
  /data/round2/tile.ver + report field "tile". Engine (live 2680475db3ed) reads branch **ps4-tile** (round2_tile.json +
  round2_tile.pkg; 0.02 = 129f7c31…, 6619136 bytes). UNTESTED: whether BGFT accepts a request from the helper's process.
  Kaeden update to 1.1.87 refused 11:38pm: the tile (RTWO00001) was open – counts as "a game is open".
- **11:50pm tile auto-update result:** 1.1.87 on Kaeden: download + SHA OK, BGFT module + IntInit OK, register → **0x80990088**
  for 0.02 and 0.03 = "package already installed" (DirectPackageInstaller payload source reads it so; DPI also proves BGFT works
  from a payload). Fix **1.1.88** (ps4-test 5ca3608, sha 38222f96…): on 0x80990088 remove the old tile
  (libSceAppInstUtil sceAppInstUtilInitialize + sceAppInstUtilAppUnInstall("RTWO00001")) then register again. Kaeden refused
  the update: 5 own-program switches since its start → **needs a full restart + jailbreak**, then ps4update ch=test, then
  look `/_tile.now`. Tile 0.03 is on branch ps4-tile (shows "tile 0.03" bottom right).
- **11:55pm TILE AUTO-UPDATE WORKS:** Kaeden 1.1.88 `/_tile.now`: "old one removed first (init 0, remove 0)" → "install started
  (task 302)" → owner's TV shows **tile 0.03**, Kaeden reports tile 0.03. Tile screen readable now; it couldn't reach the
  engine: "https/http 0xfffffa88" = HTTP 400 = **no PS4 id** (the app can't get sceKernelGetOpenPsId). Fix: helper **1.1.89**
  writes /data/round2/tile-id.txt at start; tile **0.04** reads /user/data/round2/tile-id.txt (then /data/…, then kernel) and
  shows "id <source>" bottom right. Published (ps4-test 1.1.89 sha 54a82e1f…, ps4-tile 0.04 sha 99bb36a3…). Kaeden update
  waits for the tile to be closed.
- **Bella/Atlas on round2-ps4 (logs read 11:53pm, not assumed):** Bella: drop 21:22–21:40 (1064 s, path check: router/internet/
  engine all no answer) on the old network; 23:08 + 23:12 one-minute fails while it was being moved; since 23:14 none.
  Atlas (1.1.68, no path check): 21:31–21:49 drop (1115 s) on the old network; 23:17–23:20 fails while moving; restarted 23:21;
  then "stuck 613 s in read" 23:21–23:31 – the same after-start stall it had at 18:04–18:14, so most likely the old helper's
  start-up hang, not Wi-Fi. Watch overnight.
- **20 Nov 12:15am MEMBER "LOAD ON THIS PS4" (owner: logged in on the phone, no feedback on the tile):** engine live
  88b9b8e54017 (memApi act `play` {tok, room, slot} → look `/_memplay.<id>.<slot>.<Name>` with nobusy, kv `memplay:<ps4id>`;
  /ps4/tile shows Hi <name> / Loading n of m / Ready – sign in as <name> / waits / refused from memplay + ps4look). Page:
  "Play on <ROOM> now" card with a Load button per player when opened with ?room=. Helper **1.1.90** (ps4-test, sha b2df2d0c…):
  /_memplay picks the player's linked spare or the first free spare (never main, not signed in, not linked), memload (rename +
  link + load) or, with nothing in the cloud yet, memtag + rename; the tile open no longer counts as a game (helper update,
  save steps); tile updates close the tile first (owner: never by hand). Tile **0.05** (title line from the engine) installed
  on Kaeden automatically (task 306). Untested end-to-end yet.
- Owner 12:06am: Claude's waits between checks – poll every ~8 s instead of long fixed sleeps; long waits only where truly
  needed (Wi-Fi reconnects, PS4 restarts).
- **12:20am member test setup (owner):** Vampire Survivors (CUSA47783) from Kaeden's day0 restore point (main KAEDEN 16c45cc6:
  VSSaveData + sce_sdmemory, 43 objects, 34,000,858 bytes) copied via the R2 API into **members/m7xbafbe3/p2** (crew ROUND2_,
  player p2 = Aliff Bozz) at …/CUSA47783/<part>/1795105033; index.txt written (2 lines, no dsha). Then clean slate on Kaeden
  (all 4 profiles, 28 games). Next: owner logs in from the tile, presses Load Aliff Bozz → /_memplay should load VS into a spare.
- **12:35am CONTROLLER FREEZE (owner):** after the clean slate's profile refresh (sign everyone out, main back in) the controller
  was "frozen" (PS button only reopened the last app). Manual fix: hold PS 10 s (controller off) → press PS → user select.
  Helper **1.1.91** added `/_padoff` (dlsym libScePad scePadInit/GetHandle/Open/DisconnectDevice): on Kaeden the job was
  "taken" and the helper **stopped checking in** (hung inside the pad call, like the 13 Nov Vale pad probe). Do NOT turn on
  /_padoff.on. Watchdog restarts an own-program helper after 20 min stuck, or restart Kaeden. Clean slate before it: 28/28,
  0 failed, 69 parts. Next: find a safe controller-off path (or don't sign everyone out in refresh_profiles).
- **12:45am Kaeden = room rules (owner):** helper **1.1.92** (ps4-test, sha 02cde718…): clean slate no longer signs anyone out
  (refresh_profiles is a no-op; the sign-out froze controllers), /_padoff removed. Owner added a 4th spare; full `/_reset`
  (label kaedentest): 1 game, 0 failed, profiles now KAEDEN + **Player 1–4** (16c45cc7–16c45cca), 0 signed out. Ready for
  the owner's real run: tile → QR → log in → Load Aliff Bozz (Vampire Survivors in members/m7xbafbe3/p2).
- **12:50am first member test FAILED ("Corrupted Data" in Vampire Survivors), not trophies:** /_memplay → 16c45cc7 renamed
  Aliff Bozz OK; VSSaveData restored OK; **sce_sdmemory (32 × 1 MB pieces) failed: "memory.dat pieces 0-5: bundle: cut short"**
  (sgetm 6 MB answer arrived incomplete) → the made-but-empty sce_sdmemory stayed in the profile → the game called it corrupted;
  owner pressed OK (PS4 copy recreated; cloud copy untouched). Tile wrongly said Ready. Fixes: helper **1.1.93** (ps4-test, sha
  d7258135…): failed bundle → carry on piece by piece from where it got to; member load retries a failed part once, then takes
  back the parts it made so a game is never half loaded. Engine 487cbd4bcc5e: tile says "Sorry – n of m games could not be
  loaded" when the member load finished with failures. Kaeden update waits for VS to be closed.
- **1:04am ✅ MEMBER LOAD WORKS END-TO-END (owner):** helper 1.1.94 + engine 78be92ef14e4: tile QR → phone login → tick
  players → Load → profile renamed + linked → Vampire Survivors save from the member's cloud folder loads and plays. Before it:
  /_memtag.16c45cc7.off (so the blank VS save wasn't sent to the member), `/_reset.kaedentest2` (2 games, 0 failed; note the
  room reset still signs out signed-in spares so it can rename them). Owner suspects trophies slow/interfere with game start –
  asked what he sees.
- **1:15am owner feedback after the first success:** (1) 20–30 s from "Load" to the PS4 starting = the once-a-minute check-in →
  helper **1.1.95** (ps4-test, sha ca4afa87…) checks in every 6 s while the Round2 tile is open; (2) members' saves should also
  go into the MAIN profile → the FIRST ticked player loads into main (keeps the room name; GT Sport stays protected; a main
  already linked to someone else is skipped), the rest into spares; tile says "You're on the KAEDEN profile – just play"
  (engine 3fb25cca59ec); (3) trophy pop-ups: an almost-complete game re-awards every trophy on a fresh profile – no PS4 switch
  for trophies; options = per-profile pop-up setting (owner to check), or copying trophy data per player (not built).
  Kaeden on 1.1.95. /_profiles baseline taken (72 keys) for a later registry diff.
- **1:25am OWNER'S MODEL (replaces 1.1.95 main-first): the whole room belongs to the crew.** Crew save slots = `main` (the
  room's main profile) + `p1`–`p4` (Player 1–4 = spares in id order). Pressing Load (page ticks: "<ROOM> (main profile)" +
  the crew players, all ticked) links EVERY room profile to the crew (owner_<u>.txt = <id>/<slot>) and loads each ticked
  slot back into the same profile; players' names go on Player 1–4, main keeps the room name. So anything played on any
  profile – also saves made before they joined – goes to the crew at the clean slate, and the next Load = "picked up where
  I left off". Owner turned trophy pop-ups off by hand (setting stays through clean slates). Helper **1.1.96** (ps4-test,
  sha 76c54658…) on Kaeden; engine 47abf9c8b4cf (Light 13/5/0 after – same 5 Kaeden notes). Existing VS save is in slot p2
  (Aliff) → Player 2. NB for roll-out: the rooms' cloud batch is OFF – member uploads need it ON.
- **1:45am LAPY AVATARS – proof of concept (owner 1:33am "wire up the lapy avatars first"):**
  - Kaeden has Lapy's Avatar Changer pictures in /data/AVATARS (*.xavatar = zip of avatar.png, avatar64/128/260/440.dds,
    picture.*, online.json; 21 Lapy "A2xxx" + the big "Avatars (NNNN)" pack).
  - **Helper 1.1.98** (ps4-test sha 57f2a8a4…, on Kaeden): `/_avlib[.from]` uploads them to R2 saves/lib/av/NNNN.xavatar +
    lib/av/index.txt ("NNNN<tab>file name", sorted). At Load (`memplay_one`) `av_apply` downloads
    members/<id>/<slot>/avatar.bin and writes the files into /system_data/priv/cache/profile/0x<USER>/ (old ones kept in
    /data/round2/avbak; signed-out spares only, never the main). Clean slate's /_avreset already puts the default back.
  - **Engine** (repo 325b5ae, live sha 1bae762c82ab, 27 bindings, 3 timers, Light 14/4/0 before): `/m/av/list` {all, lapy},
    `/m/av/NNNN.png` (avatar.png unzipped once, cached in saves/lib/avpng/), player field `av`. Join step: picture picker
    (Lapy's 21, random one preselected = the "default from the phone step"); added players get a random Lapy picture; each
    player card has the picker + "More" (30 at a time from the big pack). Picking builds saves/members/<id>/<slot>/avatar.bin
    ("R2AV <n>\n" then "<name> <len>\n<bytes>" per file). R2 only – no Durable Object calls. Old emoji pics still work.
  - Other rooms don't need /data/AVATARS: the pictures come from the cloud at Load. Roll-out of 1.1.98 needs the owner's OK.
  - **1:55am library uploaded:** /_avlib on Kaeden → "1200 avatars found, 1200 uploaded, 0 failed" (1200 = the helper's
    cap; Kaeden may hold more – raise nm[1200] if needed). Page checked: join step shows Lapy's 21 (440px PNGs ~250 KB each –
    heavy on phones; thumbnails = UI follow-up), "More" pages the big pack. Owner: if too big, cut the list down or use our
    own Round2 pictures (we can make .xavatar sets). Not yet tested end-to-end on a PS4 (pick → Load → picture on profile).
- **4:40am SIGNED-IN RENAME WORKS (owner check on Kaeden):** /_rename.16c45cc7.Karen_test while Karen bozz was signed in → rc 0;
  the PS4's signed-in list and the quick menu / profile hover show the new name at once; only the home screen's small profile
  corner keeps the old name until it refreshes (cached). Renamed back to "Karen bozz". **`/_renamesi.on` set on Kaeden** → member
  loads rename signed-in spares too. Pictures still only change on signed-out profiles (read at sign-in).
  Helper **1.1.108** (ps4-test, on Kaeden – 2nd update since the 4:20am restart): `load_watch` every 2 s during a member load
  (clean kind prep or a queue) – anyone who signs in gets a PS4 message "Hang on <name> – saves are still loading (player k of n).
  Please don't start a game yet." (normal notification, not verbose-only).
  The broader ShellUI probe ("log everything") was NOT continued – stopped there; only the 4:26am list exists.
- **21 Nov 11:10–11:35am – owner: "build [1.1.137]; does it need a restart; does going straight into a file have checks; does it add
  delays (load times didn't improve); the PKG server window doesn't show useful info and the size counter is wrong".**
  - **Helper 1.1.137** (ps4-test beca510→latest, source a44f9b8+, NOT on Kaeden yet – waits for the Sims DLC queue to empty; helper
    switch kills a running PKG job: Get Together failed "the PS4 restarted during it" at the 11:03 switch to 1.1.136 → re-queue it):
    - save downloads go straight into the prep files: `sv_getm_fd` (bundle file → each piece written to its file through sv_buf),
      `sv_get_fd` (one-by-one fallback, r2tls_fetch_file into the open file, a failed try is cut back with ftruncate). No 1 MB
      mallocs per piece any more (the 1:12am "bundle: no memory for a piece"). A failed big-file bundle is truncated back too.
    - **checks:** before 1.1.137 a restore checked file SIZE only. Now the cloud manifest gets a 4th column SHA-256 (sv_up_dir +
      cloud batch); a restore re-reads each prep file and compares (log "N file(s) fingerprint-checked in X s"). Only saves
      uploaded from 1.1.137 on have it – Karen's current GTA still gets the size check only. Old helpers read the 4th column fine
      (atoi_safe stops at the tab; checked 1.1.114 f795ee2 look_srest + pf_game).
    - **no member upload after a failed/cut-off load:** memload_game writes prep/noup_<u>_<t> just before it changes the profile
      (after the pre-load backup) and removes it only on success. sv_local_copy: a member-tagged copy of a game with noup → room
      backup only (log "NOT for member … isn't their save"). Cleared by: success, clean slate (with owner_ tags), release_names,
      /_memtag to a DIFFERENT member. NOT cleared by a sticky/kept re-tag (kept_newer could otherwise upload the fresh save).
      Side effect (tell guests/owner): anything played in that game after a failed load stays in the room backup.
    - save.log rolls at 256 KB into save-old.log (was 64 KB into save.log.old, which /_tail refuses) – the 1:12am and 2:31am
      timing lines were already gone, so the load-time question can't be answered from them; test after the switch.
    - pkg_tick gives up only after 45 min without progress (source-only change from earlier, now built).
  - **PKG server 1.3** (tools/pkg-server, copied to the laptop C:\Users\saber\round2-tv\pkg-server, needs the window restarted
    – only when no PKG job is running): per (PS4, file) transfer with merged byte ranges (the PS4 uses several connections and
    re-asks parts, so 1.2's socket-byte count over-counted); lines: "<room> started <file> (size)", every 30 s "<room> - <file>:
    X of Y (%) - MB/s - about N left - k connections", "<room> finished <file>: size in T (MB/s average)", "stopped at X% – nothing
    asked for 10 min". "sent" = unique bytes. Room names from pkg-rooms.txt (IPs from ps4list 21 Nov: vale .11, max .23, scarlett
    .4, kai .18, kaeden .5, atlas 192.168.120.3, bella 192.168.120.2 – DHCP may move them). Page: "Sending now" table, refresh 5 s.
  - **11:51 Kaeden → 1.1.137** (Get Famous FINISHED 11:47:44, 2565 MB at 3.7 MB/s, user 16c45cc7 = Karen; queue empty). 11:54 owner's
    clean slate (reset staff) on 1.1.137: OK · 7 games, 0 failed, 16 removed, 16 copied 71 MB · "spares signed out by the menu
    add-on", no RAW sign-out logged ✅ (shell12 stayed loaded across the helper switch). Light check after = same as before.
    Next: owner restarts the PKG server window (1.3) → re-queue Get Together; owner loads Karen bozz's GTA for timing.
  - **12:07 owner's load of Karen (1.1.137): GTA FAILED** "make part sce_bu_sce_sdmemory: save list row not added (rc 0, 1->2)" –
    the save list kept a row for GTA's sce_bu backup part after the clean slate (deleting sce_sdmemory removes the sce_bu FILES too
    – "5 files removed" – but the sce_bu ROW stays; seen again 12:38: "game now has 1 [sce_bu_sce_sdmemory]"). The "could not be
    made" exit also left 4 EMPTY GTA parts. Sims ok 1.3 s. noup guard was set ✅.
  - **Helper 1.1.138** (ps4-test, Kaeden 12:09, switch #3 since the 2:27am restart): sv_db_add replaces a stale row (only called
    when the part's image+key don't exist; log "had a row but no files - old row replaced"); the "part(s) could not be made" exit
    takes back the parts it made (like a failed restore).
  - **12:32–12:40 automated tests (owner out eating, asked "automate these tests"), via staff /_memload.16c45cc7.m7xbafbe3.p1.Karen_bozz
    (the phone's /_memplay needs the tile in front, so not used):**
    1. over the failed state (4 empty parts): backup of what was there 1 s, stale row replaced, 5 GTA parts + Sims in – 7 s, 0 failed.
    2. over the full profile: sce_bu "already on the disk – using it" – 7 s, 0 failed.
    3. clean slate (2 s, add-on sign-out, 5 parts removed, sce_bu row left again) → fresh load: stale row replaced – 8 s, 0 failed.
    Per game: GTA 4.0–5.1 s = cloud download 2.5–2.7 s (prefetch 3.7 MB in 2 bundle requests ≈ 1.4 MB/s) + making parts 0–1.9 s +
    into profile 0.3–0.5 s; Sims 1.2–1.3 s. Command pickup without the tile open was ~55–60 s (PS4 polls slowly when the tile is
    closed); with the tile open it's seconds. Karen's profile now holds her saves (cloud versions 1795117573/…577/1795202258/…264/…268).
    TODO: clean slate should delete the leftover sce_bu row too (1.1.138 copes with it anyway).
  - 12:49 PKG server 1.3 confirmed running (pkglap v 1.3, owner restarted it before lunch). Get Together re-queued (pxhyxu02z),
    sent 12:51:58, running; the server page (built-in browser can open http://localhost:8890/ on the laptop) showed "Sending now:
    Kaeden · Get Together · 192 MB of 1.67 GB · 11% · 1.4 MB/s", sent 192 MB (unique bytes) ✅.
  - **13:02 owner: "don't assume the 32 MB moves 2 MB, implement 1 and 2, test on Kaeden: clean slate → download, and an overwrite".**
    **Helper 1.1.139** (ps4-test 8ffd4b1c…, Kaeden 13:15 = switch #4 since the 2:27am restart → RESTART before the next helper update):
    1. empty (all-zero) 1 MB pieces aren't sent: manifest column 5 `z<list>` (ranges), restore writes zeros itself, SHA-256 of the
       whole file still checked; never for sce_sys/; deferred backups skip the same pieces (defer_up_dir reads the part manifest).
       **OFF unless `/_zeroskip.on`** (flag /data/round2/zeroskip-on) – helpers < 1.1.139 can't load such saves ("piece missing").
       **Kaeden: ON.** Saves uploaded from Kaeden with it can only be loaded in rooms on 1.1.139+.
    2. replays/highlights (MK11 RecentRecording*, MvC Infinite Replay, F1 24 highlights*/ghosts) never in member saves: member load
       leaves them out of the index list; copies/cloud batch send them to the room backup only.
    Also: `/_resend.<user>.<game>` (send each part once more even if unchanged; marker PREPD/<u>/<t>/resend.txt lists parts done),
    make-part reads the whole manifest (was cut at 16 KB), backup log shows empty KB.
    **Tests with test-member/main (MK11 12 parts incl. 10 replays, It Takes Two, Cuphead 8 MB) into 16c45cc9:**
    | | MK11 | It Takes Two | Cuphead | total |
    |---|---|---|---|---|
    | A before (1.1.138, clean profile) 13:12 | 12.1 s (dl 5.7, making 4.5) | 1.3 s | 6.0 s (dl 5.2) | 19 s |
    | C after clean slate (1.1.139) 13:25 | 3.8 s (2 parts, 10 replays left out) | 1.5 s | 2.7 s (dl 1.6) | 8 s |
    | D overwrite (1.1.139) 13:28 | 3.7 s | 0.8 s | 2.7 s (dl 1.4) | 7 s |
    Upload (cloud batch after /_resend + clean slate 13:19): Cuphead 8 MB → **7,168 KB empty not sent** (1 MB sent, 3.3 s);
    MK11PSET 4.3 MB → 1,024 KB empty; replays → room backup path; restore wrote the zeros + fingerprint OK. Deferred backups with
    z lists sent OK 13:29/13:30. Light check before/after: same 15/3/2 (old failures).
    Karen's/Aliff's saves NOT converted (no /_resend on real members). Get Famous shows "failed – PS4 restarted" in the engine but
    the helper log says FINISHED 11:47:44 (engine marked it failed at the 11:51 switch before the finish report) – it's installed.
  - **13:40–13:47 MK11 problem (owner testing on Kaeden):** Test Member → MK11 **CE-34878-0** (game crash) after ~1 min (it wrote
    MK11PSET first; the changed save went to test-member's cloud folder 13:40:37). Then on the MAIN profile MK11 **froze on launch
    with music**. Helper log: **1.1.139 "stopped by signal 11" at 13:39:04** as MK11 started (starter relaunched it 13:39:09;
    stale step label "job helper update since 11:03:58" = the crash was in code that sets no label – a side thread or the loop).
    Fingerprints of every loaded file matched, so zero-skip didn't change the data. Open: was it the missing MK11 replays or the
    helper crash leaving ScePartyDaemon (shared payload host, games use it) stuck? Owner asked to restart Kaeden fully, then MK11
    on main → then Test Member.
    **Helper 1.1.140** (ps4-test 0bf005d0…, NOT on Kaeden yet – install right after the restart, before the MK11 test): SIGSEGV/
    BUS/ILL/FPE logged with fault address, code offset from on_crash, thread (main/fg/other), last step. build.sh keeps
    out/round2d.sym.elf (unstripped) – copy kept in /home/claude/symbols/round2d-1.1.140.sym.elf; map with
    `nm` (address of on_crash + offset).
  - **13:56 owner restarted Kaeden** (helper started twice 13:56:06/13:56:33 – 2nd "it had stopped", no signal logged). After it MK11
    works on main AND Test Member (no replays) → the 13:39 helper crash left the PS4 stuck; replays not needed to start MK11.
    BUT owner 14:02: on Test Member "Local fight" asked "first time – tutorial?". test-member MK11PSET versions: 19 Nov 20:14/20:32/
    20:57 (originals), 21 Nov 13:21 (resend), 13:40 (written during the crash session), 13:44; index now points at 1795239882
    (13:44) and lists ONLY MK11GSET + MK11PSET (the replay rows are gone from the index). Next: memidxset MK11PSET → 1795093062
    (19 Nov original) and reload to see if the prompt came from the crash-session rewrite.
    **14:04 Kaeden → helper 1.1.140** (switch #1 since the 13:56 restart).
  - **14:51 owner: "isn't own-program already implemented? did you roll back?"** – YES it is (since 17 Nov, auto-promote at the
    first report, 13.50 included since 1.1.83); my "not built" claim was WRONG, nothing rolled back. Kaeden's real state:
    own-spawn.log **13:56:31 selfown: copy is program 71 … 13:56:46 the copy is gone** → own copy died within 15 s after the
    restart → Kaeden runs SHARED (own:0 pid 45); the 14:04 update was shared→shared (sleeper). promote-try marker = 1 try/hour.
    The 13:39 signal 11 was very likely the own copy too. Next (after owner's MK11 test): `/_selfown` on 1.1.140 and read
    helper-stopped.txt for the CRASH line (map offset with /home/claude/symbols/round2d-1.1.140.sym.elf).
    14:52 memidxset test-member MK11PSET → 1795093062 (19 Nov original; was 1795240995) + reload 7 s, 3 games OK; owner to
    check Local Fight on Test Member.
  - 14:58 owner: MK11 still "first time" with the 19 Nov original PSET → that save was fresh from the start; **replays left out =
    fine**. own-spawn.log: 13:15 own copy 359 (1.1.139) ran until the 13:39 signal 11 (a real crash in the OWN copy);
    13:56:31 own copy 71 "gone" in 15 s with NO signal line = race: the shared helper let go of the lock, the starter launched
    another shared helper 13:56:33 first, the copy stepped aside (not a crash). 15:00 `/_selfown` on 1.1.140 → **own=1 pid 158**
    (spawn 2 since the 13:56 restart). Asked owner to repeat 13:39 (Test Member, MK11 ×3 + another game) to catch the crash.
  - **15:07 owner: PKG page – folders, pick main game + patch, which games go to which rooms, uninstall per PS4, see what's
    really on the PS4s; "nothing crashes after your tests".** Folders = **PS4 home-screen folders he can name/rename** (asked).
    - **Engine pkgcat / pkgcatset** (deployed b793902a…, 27 bindings, 3 timers; before b6cdc5bf): kv 'pkgcat' = per title
      {tier netflix|deluxe|vip | rooms[], patch, nopatch, title}; also returned by pkglist (`cat`). pkgsend now counts only
      valid jobs and answers "Nothing valid to send" (the System check step passes again).
    - **Control centre** (main 4bd8030 + check step): per game main-game select (if several), patch select (or "No patch",
      saved), "with all DLC", rooms select (Netflix/Deluxe/VIP/My own rooms…, saved), room cells need/extra, "Install in
      its rooms" + "Install every game in its rooms" (main game where missing, chosen patch where missing/older, DLC if
      ticked; skips other-Wi-Fi rooms and FW-too-new files with a note); **On the PS4s** card = every game each PS4 reports
      (also ones not on the laptop), tick a room's version → Uninstall the ticked games / Remove only their patches (Vue,
      Round2 tile, Apollo, LAPY hidden; GT Sport on Max shown 🏠 without a box). Redraws only when data changed.
      ⚠️ My first push (9388975) cut a big chunk of the page (wrong anchor – the first `function drawList()` was another
      module's): "PS4 is not defined", page broken ~5 min (15:13–15:18), reverted b10988b, redone 4bd8030.
    - **Home-folder probe** (helper 1.1.141 `/_appdb` read-only copy; 1.1.142 appdb-short.txt; 1.1.143 `/_head<line>.<file>|n`):
      folders are per profile in app.db `tbl_appbrowse_<user decimal>`; the owner's folder (on Test Member 16c45cc9 = table
      0381967561) = row titleId 000000001, titleName "Folder", folderType 1, folderInfo {"titleId":"CUSA03887","index":0};
      Broforce row parentFolderId 000000001, positionInFolder 1. Project doc claude/ps4-home-folders.md. Next: rename test
      (owner present, app.db backup first) – Kaeden has **5 helper starts since its 13:56 restart → restart before the next
      helper update**. Kaeden now 1.1.143 own.
  - 15:37 owner restarted Kaeden (helper 1.1.143 own pid 66). **Helper 1.1.144** (ps4-test 01b29104…, 1,995,112 B): `/_fold.list`
    (read-only on the live app.db → folders.txt), `/_fold.ren.<user>.<9-digit id>.<Name_with_underscores>` (app.db copied to
    /data/round2/db/app-<t>.db, then ONE row in one transaction, refused with a game open), `/_fold.undo` (newest backup back).
    15:42 rename test: Test Member folder 000000001 "Folder" → **"Round2 test"** (list confirms the change in app.db). Owner checks
    whether the home screen shows it (live / after profile switch / after restart). Owner 15:39 confirmed: folders are per profile.
  - **18:20 owner: switching profiles showed the renamed folder → a clean slate will too; folders are for event games (Halloween).**
    **Helper 1.1.145/1.1.146** (ps4-test 42161ecf…, Kaeden 18:26, spawn 4 since the 15:37 restart): `/_fold.set.<Name>.<tid-tid-…>`
    = that folder on EVERY profile (new row = copy of an existing folder row with id/name/folderInfo replaced; games moved in,
    order kept; a profile with none of the games gets no folder), `/_fold.del.<Name>`. 1.1.145 failed all 5 profiles: the
    INSERT (~2 KB: 57 columns twice) was cut by a 1.6 KB buffer → fixed 1.1.146 (6 KB) + the SQLite reason is logged before
    ROLLBACK. 18:28 "Halloween" (Vampire Survivors, Cuphead, Minecraft Dungeons) on all 5 profiles: 15 game places ✅ (app.db
    backups /data/round2/db/app-<t>.db). Owner to check it shows + a game starts from it.
    **Engine pkgfold/pkgfoldset** (deployed f59011c4…, 27 bindings – a settings read right after the PUT said 0, re-read = 27;
    3 timers) + folders in pkglist. **Control centre a1f4d8a:** "Home-screen folders" card – name, games (chips + add list
    from every PS4's games + laptop), rooms (tier / own), Send to its rooms (ps4look `/_fold.set` per PS4 with helper ≥ 1.1.145,
    rename sends a del of the old name first), Take off the PS4s, Delete from this list; plan saved in kv pkgfold (Halloween/
    Kaeden entered). Light check after: same old items.
  - 18:36 owner: Halloween folder shows on all profiles after re-login ✅. "PKG server UI – both, same look":
    **22 Nov 01:45 – DESIGN FILES for the design team (owner 01:30: "she already has access … put it there … make important rules
    in the handoff clear for her claude"):** round2sg-home `design/` = rooms.json (7 rooms: name, colour, ink, art) + member.css
    (the member page's look, 3 KB, was inline in memPage) + README.md. Engine (deployed 01:40, hash 30402fb8…, 27 bindings,
    3 timers): designGet() reads raw.githubusercontent …/round2sg-home/<branch>/design/<file> (5 min cache main, 15 s preview),
    memDesign() checks member.css (no </, <script, @import, javascript:, ≤ 60 KB) and rooms.json (#rrggbb only, known rooms) –
    anything wrong = built-in MEM_CSS / MEM_ROOMS. /m?design=<branch> previews a branch. ps4Tile colours also come from
    rooms.json. "READ FIRST" rules box at the top of this file + first bullet in CLAUDE.md. System check step "Design files"
    (light-safe). Light check before 16/4/0, after 17/4/0. Next (phase 2): tile wording/timings from design/ (tile 0.14).
    Also tonight: Kaeden speed test 01:18 – 3 players 7 games 88 s; Vampire Survivors save 32 MB of which 31 MB empty → slim
    copies queued for Main + Aliff (cloud batch was off during the test; /_cloud.on sent 01:2x). Helper 1.1.151 (tile first on the
    home screen, app.db lastAccessIndex bump after each load/clean slate, /_fold.pin) built + on ps4-test, NOT installed yet
    (owner was in The Sims).
    **22 Nov 01:14 – Kaeden clean slate for the owner's full-download speed test:** reset staff OK · 7 games, 16 parts removed,
    16 copied (71 MB), member tags cleared (5 profiles). Owner also asked to "delete the saves in the hdd queued to the cloud":
    the queue was empty before (waiting 0); the clean slate queued its 16 copies. Member loads never use the HDD copies (always
    from the cloud), so instead of deleting (no command for it; would need a 4th helper switch) the CLOUD BATCH IS SWITCHED OFF
    (/_cloud.off 01:14) so nothing uploads during the test. **Switch it back on after the test: /_cloud.on.**
    **22 Nov 00:58 – helper 1.1.150 on Kaeden (owner 00:53 "do for kaeden first"; 3rd own switch since the 00:28 restart – guard
    is 5, so restart Kaeden before the 2nd next one): SLIM RE-UPLOAD.** Owner asked to "learn" empty space per game; answer: no
    per-game rule needed – zero-skip already checks every 1 MB piece of every upload. Gap = saves uploaded BEFORE zero-skip stay
    full size. Now: after each member load, parts of 2 MB+ whose cloud manifest has no z-list go to prep/slim.txt; slim_tick (main
    loop, 1 a minute, only with zeroskip-on, no load/clean/backup running) scans the INTERNAL copy (= what was just loaded, not
    the live save) for empty pieces; 1 MB+ empty → that part is marked in resend.txt and queued (pending m=<member>) so the cloud
    batch re-sends it slim to the member's folder + index. Logs "slim: …". Other rooms: zero-skip stays off until they have the
    new helper (old helpers can't load slim saves). Vampire Survivors gets slimmed after its next load on Kaeden.
    **22 Nov 00:45 – owner's test 00:34 (KAEDEN main + Karen + Aliff) → fixes, Kaeden on helper 1.1.149 + tile 0.13:**
    - KAEDEN slow: Vampire Survivors (CUSA47783) sce_sdmemory = 32 MB, download 38.8 s (Aliff's copy of the same game: 16 s).
      Uploaded before zero-skip, so all 32 MB come down. Next: /_resend that game's saves so empty pieces are skipped.
    - Cards vanished during Aliff + "Saves loaded!" pop-up at 00:36:20 mid-load: memplay_next removes the LAST waiting player
      from memq, then the next line saw no memq = "batch over" (memqn gone, g_after_load set) – bug since 1.1.101. Fixed in
      1.1.149 (more_q read before memplay_next). The menu add-on was fine (logged out at 00:36:59 after the real end; tile closed
      by itself, 15 s).
    - Owner: "the ps4 tile should be listening to the helper": helper 1.1.149 writes /data/round2/tile-live.txt (t, state
      l/d/i, board, prog done total) on each change + every 3 s during a load (fg_thread); tile 0.13 reads it 4×/s and it wins
      over the engine while fresh (< 30 s): state, board, own wording ("Loading X's saves (player k of n)", "All set!").
    - Bar = whole load: (profiles ready + share of the current one) / profiles ticked, label "k of n profiles ready – %".
      Also found: the bar's `shown` was reset to 0 EVERY frame (0.08-0.12), so it never passed ~6 %. Fixed.
    - The QR's breathing frame was drawn over the cards ("box cuts into the cards") – off while cards show.
    **22 Nov 00:05 – tile profile cards (owner 23:54: "screen should showcase all of the profiles … greyed out … becomes colour …
    Player 1 transforms into the member's profile … a static page seems hesitating")** – ON KAEDEN 00:31 (owner restarted it 00:28; helper 1.1.148 own switch 00:30, tile 0.12 via /_tile.now task 366):
    helper 1.1.148 (ps4-test 'test helper 1.1.148', sha fd1bf800…) keeps a load board g_mb_* (0 main, 1-4 spares in id order =
    Player 1-4; st u nothing to do · c being cleared · w waits for member · l loading · d loaded · f some failed; cur name, new
    name, member) – set in look_memplay (release pass + second pass), memplay_one, prep DONE; sent as report "board"
    ("st~cur~new~who|…") while memqn exists + 3 min. Engine (deployed 00:03, hash 4ff7ff28…, 27 bindings, 3 timers) passes it to
    /ps4/tile as "board" (not kept in mp.fin – a reopened tile shows the QR). Tile 0.12 (ps4-tile 6f4f93c): during a load the
    QR card is replaced by 5 profile cards – grey; the one being cleared/loaded pulses (shine sweep + ring + dots); each lights
    in the room colour IN ORDER (0.45 s apart, burst ring + check mark draws itself); a Player card slides into the member's
    name. Old helpers send no board → QR as before. Desktop simulation of the drawing checked (/home/claude/tilesim).
    **Control centre clean slate** (fd1667a): short intro (details folded), delay list 2-15 min (Max is on 7 – the old list
    5/10/12 showed blank), "Rooms: Max only", one short line per run (3 newest + older folded), problems folded.
    **Engine: tile never ran its ending after a "switch" load (deployed 22:45, hash e745023f…, 27 bindings, 3 timers)** – owner
    22:30: Karen bozz loaded from a clean slate fine (GTA + Sims, 8 s), but "What happens next" never showed and the tile stayed
    open (logs: add-on "tile still open after 20 s" → logged everyone out anyway; log-out doesn't close apps). Cause (ps4Tile):
    with other profiles to release first the helper answers "memplay/loading … releasing N other profile(s)" at once while a
    kind=switch clean slate runs → `prep` was false → status "done" at once and cached in mp.fin → the tile never saw "loading"
    (tile 0.11 needs seen_loading). Fix: any running clean slate = loading; "done"/"Sorry" only when a report NEWER than the Load
    answer (ps4:<id>.t > ps4look.at) says kind=prep state=done (helper reports at once when a prep ends); at least 25 s of
    "loading" after Load (not for refused/error/waits) so the tile – 20 s polls while idle – always sees it. To test with the
    owner: phone Load on Kaeden with other profiles in use → tile should show the bar, then "What happens next", then close.
    Light check before 15/5/0, after 15/5/0.
    **Helper 1.1.147 on Kaeden (19:56, owner OK 19:50)** – owner: "why doesn't the patch follow immediately". Cause: the engine
    only learns a PKG job finished from the helper's FULL report (every 15 min, REPORT_EVERY) or the report after a look job, and
    hands out the next job on minutes divisible by 3. Patapon 3 game finished 19:42:43 on the PS4, engine saw it 19:52 (my look).
    Fix: pkg_tick sets g_pkg_rep when a download finishes/fails; the main loop then reports straight away ("pkg: told Round2
    straight away"). Next job now 1-3 min after the last. Other rooms get it with the next helper release. Patapon 3 game 01.00 +
    patch 01.03 installed on Kaeden (patch OK 19:52). Light check after: 16 passed · 4 to look at · 0 failed.
    Note: don't restart/update a helper while a PKG job is "running" in the engine – after a restart pkg_last is empty and the
    engine marks the job "failed – the PS4 restarted during it" after 10 min (that's what happened to Get Famous at 11:51).
    **Control centre PS4 games rebuilt (7deb5e2, 21 Nov 19:35)** – owner: "the ui is horrible", picked **Room first**. Tabs inside
    the page: **Rooms** (room chips with on/off dot + game count; room header FW / games / GB free; each game row shows ✓ /
    "update x" / "not on laptop" / ⏳ queued; tap a row → Update · Remove patch · Remove game · Cancel queued job; "+ Add games" =
    laptop games not on that room, FW-too-new greyed, optional all DLC, "Also install on" other rooms; "Update N" = all newer
    patches), **Games** (laptop library cards with 7 room pills ok/older/needed; tap → game file, patch, DLC, Belongs in tier/own
    rooms, Install where missing/older, Remove from ticked rooms), **Queue** (one short line per job, ids stripped, 5 finished
    shown + Show all), **Folders** (same as before, card look). Gone: wide tables, Pick bar, Send card, drag-drop box, "pick single
    files". Tested with Playwright + mocked engine at 390 px wide: no script errors, sends the right pkgsend items.
    **PKG server 1.5** (21 Nov 19:15, copied to the laptop, needs a server restart): owner said the browser kept showing a cached
    copy. Now the page opens in its own app window (Edge --app, else Chrome; own profile in %LOCALAPPDATA%\Round2PKG\window,
    new ?t= address each time, small disk cache) instead of a browser tab. "Open Round2 PKG window.bat" (= ps1 -WindowOnly)
    reopens it. The page reloads itself when the server comes back after a restart. Server already sent Cache-Control: no-store.
    **PKG server 1.4** (laptop, restarted by owner 18:42): page from pkg-page.html (Round2 look): Sending now bars, Finished list,
    Activity (last log lines, /api/live every 2 s), Folders, files per game; pushes `dl` to the engine with the list (control
    centre "Installing now"). Laptop pushes had stopped at 15:14 (window closed / laptop asleep) – fine again 18:52.
    **Control centre 9ddc9fb + 81d8a09:** jump buttons, status chips, Installing now bars; owner 18:48 "can't select individual
    games to send to individual or grouped PS4s" → **Pick** checkbox per game (chosen game + patch + DLC if ticked) + a bar at
    the bottom (tier buttons, room ticks, Install / Uninstall / Clear, shows the result). Laptop now 40 files: Sims + Patapon 3
    (CUSA41279, FW 11.50).
  - Light check 11:23 (before): 15 passed, 3 to look at, 2 failed – both OLD: side timer 52 outside requests in one run; "PS4 games
    queue: bad file link NOT refused" = engine pkgsend counts n++ (jid) before validation and writes W back unchanged → answers
    {ok, queued:1} though nothing is queued (checked: nothing queued). Fix next engine deploy: count only pushed jobs, error if 0.
- **21 Nov 10:56–11:05am – owner asked what "Clean up" (PS4 downloads) does now: it deletes every /user/download/<title> except PS
  Vue → would have killed the running Sims DLC download. Fix in 1.1.136: keeps the folder of a running PKG job (pkg-job). Owner:
  "send 1.1.136 now" → helper 1.1.136 (ps4-test 1ec4d23) + round2_shell12 (ps4-shell 6603c55) on Kaeden 11:03; shell12 auto-loaded
  11:04:29 ✅. Covers manual + automatic clean slates (same reset_go/reset_profiles) – Kaeden only (add-on), NOT tested yet.
  Sims at 11:05: 32 DLC done, 3 left. Owner asked why the 1:12am save didn't load → helper out of memory (in-memory downloads of
  32 MB memory.dat files cut at ~8 MB in a helper with 11 updates + hours of uptime + BGFT). Fixes offered: stream save downloads
  to a file (like the tile/helper update) + after a failed load untag that game so a fresh save can't overwrite the member's.
- **21 Nov 2:22–2:35am – owner: "clean slate kaeden now and restore karen's progressed gta save to her folder" + "prepare to probe why
  clean slates and logout don't use the shell UI's function instead of the raw logout – it blocks the controller".**
  - Found: **2:00:58–2:01:05 the cloud batch REPLACED Karen's p1 GTA SAVEDATAPROFILE + sce_sdmemory + sce_bu_sce_sdmemory** with the
    copies from profile 16c45cc7 after the failed 1:12am load (GTA had been left empty → fresh files). Story slots (SGTA/SBGTA,
    "Father/Son (5.5%)") were not touched. EVERY stored GTA story copy (p1 3:46am, p2 10:13pm, room backups 7:44pm + 8:36pm) reads
    "Father/Son (5.5%)" (param.sfo) – no further progress exists anywhere in the storage.
  - **Engine memidxset** (deployed, eb51d327, 27 bindings, 3 timers): point one index part at a stored version, old index kept as
    index.bak.<ms>. Karen p1 restored to the pre-incident state: SAVEDATAPROFILE 3:45:05am, sce_sdmemory 7:08:01pm,
    sce_bu 7:08:08pm (20 Nov) – 3 backups index.bak.1795199453975/…455165/…456075. 2:31am her load used them: 0 failed ✅.
  - ~~Cloud batch "dedupe bug"~~ **WRONG – corrected 2:38am:** the CLOUD manifest holds names + sizes only, but the checks compare
    the LOCAL prep manifest, which carries a SHA-256 per file (lc_walk "%s\t%llu\t%s") → content-based, no bug. Kaeden cloud batch
    was OFF 2:33–2:37am, back ON (0 waiting). Real cause of the 2:01am overwrite: a FAILED load leaves the member-tagged profile with
    an empty game; if the guest then starts that game, the fresh save uploads over the member's newer one. STILL OPEN – fix: after a
    failed load, untag that game (or the profile) so nothing from it goes to the member's folder.
  - Sims queue: patch 1.95 DONE; Luxury Party Stuff finished 2:04am but stayed "running" after the 2:15 restart (helper's report
    lost) and blocked the queue → cancelled by hand; engine b6cdc5bf: a running job with no report from the PS4 for 10 min →
    failed "the PS4 restarted during it" (no longer blocks).
  - Clean slate 2:24am (owner): 2 games, 3 parts copied+removed, OK. Add-on log: lock 2:24:03 → LogoutAll 2:24:08 (menu's own) →
    picker already un-paused 3 s later → our ResumeLoginScreen anyway → unlock. **No raw sign-out in this run** ("0 spare(s) signed
    out" is only the START count). **Correction (advisor):** a raw sign-out most likely DID happen – clean DONE 2:24:07, next profile
    line 2:24:10 (= reset_profiles' sleep(3) after sceUserServiceLogout on a signed-in spare, Karen was playing), while the add-on's
    LogoutAll ran 2:24:07–08: the run's state is "done" BEFORE reset_profiles, so both hit the same profile at once. Owner then
    restarted Kaeden (2:27:42). Raw sceUserServiceLogout still exists in
    reset_profiles (signed-in spares before renaming) and the profile-switch release → helper 1.1.136 (built, NOT sent): with the
    add-on, reset_profiles WAITS up to 12 s for the add-on's own log-out and never signs out raw (every raw call logged); the
    switch release asks the add-on (menu_logout). Add-on round2_shell12 (built, NOT sent): resume the picker only if still paused + 30-s trace
    after every log-out (picker paused?, buttons) so a stuck controller leaves evidence.
- **21 Nov 2:00am – owner: "where is karen bozz gta progress, did a new save replace her progress in the cloud?"** Logs read:
  1:11–1:13am 3-player load (Main, Karen, Aliff) on Kaeden ALL FAILED – "bundle: no memory for a piece", memory.dat downloads cut
  at ~8 MB of 32 MB → each game "taken back so the game starts clean (the member's cloud save is untouched)". So Karen got an
  EMPTY GTA on Kaeden. Cause: Kaeden's helper is out of memory (11+ switches since the 9:18pm restart, hours of uptime, BGFT
  download running) → **restart Kaeden** before loading again. Cloud (members/m7xbafbe3/p1/CUSA00419, Karen = p1): story saves
  SAVEDATASGTA50000/SBGTA50000 + SAVEDATAPROFILE = 20 Nov 3:45–3:46am (her play that night), untouched since; sce_sdmemory +
  sce_bu_sce_sdmemory newest = 20 Nov 7:08pm (origin not provable – older 2:00am + 3:46am copies kept, roll back if her progress
  looks wrong). ⚠️ Bug to check: the 10:12pm staff clean slate uploaded a GTA save (SAVEDATAPROFILE/SGTA/SBGTA/sce_sdmemory,
  10:13pm) into ALIFF's folder p2 – a profile holding Karen's GTA was tagged p2 (Karen's p1 not touched).
- **21 Nov 12:49–1:26am – owner: "wake them and update them both".** Vale: woken by Kaeden (`/_wakerp.192.168.88.255…`, checked in
  12:51) → Overcooked 2 left open → `/_close` → update **1.1.61 → 1.1.114** ✅ → `/_rest` ✅. Bella: can't be woken from round2
  (round2-ps4, nobody awake there) → owner asked to press PS; Bella made ONE poll at 01:06:08 (no report) and was silent through
  checks at 1:03, 1:11, 1:18, 1:26 → **still 1.1.113**, update when it's next on (it may have gone back to rest – Bella has auto
  rest 300 s). Kaeden: Sims game installed; patch 1.95 downloading (4.3/14 GB at 1:26, ~3.6 MB/s) while the owner plays the
  base game; DLC jobs wait while a game is open (owner asked; offered to allow DLC starts during play – no answer yet).
- **21 Nov 12:27–12:33am – owner (out eating): "are the rest of the ps4s in rest mode, update if needed and rest them … what about
  bella's logs".** No guest in any room and none due tonight (gm insess, checked first). Max (1.1.114) `/_rest` ✅, Kai (1.1.114)
  `/_rest` ✅, Scarlett: Overcooked 2 left open by the 10:30pm guests → `/_close` ✅ → update 1.1.113 → **1.1.114** ✅ → `/_rest` ✅.
  Already asleep: Atlas (1.1.114, since 11:15pm), Bella (1.1.113, rested by Claude 7:20pm after the wake test), Vale (1.1.61, since
  12:04am – NOT woken: owner may sleep there; update Vale + Bella in the morning). Kaeden stays on for the Sims queue.
  Bella's logs (last report before its 7:20pm rest): helper 1.1.113 since 4:40pm, hourly "helper running" to 6:30pm, woke from rest
  fine at 6:13am and 10:30am, 4 short network drops (each back within 8–71 s), no crash/stuck lines.
- **11:50pm – owner: "is the ps4 system strong enough to survive guest facing use now" → NOT YET (verdict + test list given).**
  Guest rooms run release 1.1.113/1.1.114 (Vale 1.1.61) – nothing from tonight is guest-facing. Blockers: add-on only ever ran on
  13.50 (rooms 9.00/11.00 need their own test); many features shipped but not seen working (phone refusal, A+B stay-in-profile,
  "newer in another room", menu detector/countdown, clean slate with real saves on a signed-in profile, patch/uninstall/queue end);
  PKG: helper-signs-in-main path unproven, no pause when a guest is due, pop-ups would show to guests; 6-h PKG cut-off (fixed in
  source for the next build: 45 min without progress); stale ps4fg if a room rolls back to a helper without fg_thread (enforce
  only when fg.v matches – to do); first release build must be < 2 MB (rooms' old in-memory updater).
  Logs read: shell11 22:30 clean slate (0 games, 1 s) locked → "picker PAUSED – check says 0" (pause didn't confirm) → logged
  out → unlocked. Side timer 52 = ONE run at 17:11 (50 Firebase), latest run 14 – not recurring.
  Tonight: Kaeden has had ~11 helper switches since the 21:18 restart (limit ~4–5) → no more updates while the Sims queue runs;
  KAEDEN stays signed in; no clean slate / member-load tests (both end in LogoutAll – unknown if a download survives); restart
  Kaeden in the morning. Sims: game 1375/10405 MB at 23:50 (~1.6 MB/s), 36 queued.
- **10:49pm–11:35pm – PKG INSTALLER BUILT + FIRST INSTALLS (owner: "group individually as well", home-screen folders wanted,
  laptop stays on overnight with the external HD; "install all of the files from this folder, i want to play the sims").**
  - **Laptop: Round2 PKG server** (round2-tv-launcher tools/pkg-server; on the laptop C:\Users\saber\round2-tv\pkg-server, start
    with "Start Round2 PKG server.bat"). PowerShell + inline C# (C# 5, compiled/tested here with /opt/dotnet csc). Folders in
    pkg-folders.txt (owner: D:\ = external HD), link code pkg-token.txt (kept across restarts), staff code pkg-staff.txt.
    Reads every PKG (param.sfo: title, CATEGORY gd/gp/ac, APP_VER, SYSTEM_VER), stable file id = SHA1(path)[0:16], serves
    /f/<code>/<id>/x.pkg with Range (multi-threaded), /j/<code>/<id>.json = reference package (1.2), API only from the laptop,
    keeps the laptop awake while downloading, pushes its list to the engine (gm pkglap) on change / every 10 min. Laptop IP
    192.168.88.19 (Wi-Fi). **v1.2 running 23:28.**
  - **Engine** (deployed 22:58 9ceb32b1, 23:03 8202d949, 23:19 e0015f02, 23:31 9d95b216 – each by patching the live script, hash
    checked before/after, 27 bindings, 3 timers): kv pkgq:<ps4> queue, staff pkgsend/pkglist/pkgcancel/pkglap; the PS4's minute
    poll hands out one job at a time (room free 60 min, every 3 min), /_pkgdone + optional /_rest when the queue is through.
  - **Control centre › TVs › PS4 games** (main 2d380a5+): laptop list (via the engine), drop a game → offer its patch + DLC from
    that folder, rooms + tier buttons, firmware/other-Wi-Fi warnings, uninstall, queue with cancel, each room's version.
    System check step "PS4 games queue" (light).
  - **Helper 1.1.132–1.1.135** (Kaeden): /_pkgjob (pkgprep checks + main sign-in if nobody), progress in the report ("pkg"),
    /_pkgstop, /_pkgrm, /_pkgunreg, power tick while downloading. Register findings (log everything):
    ByStorageEx with an http PKG link → 0x8099006a (typed and untyped); debug register with the PKG link → DLC OK (Perfect Patio
    101 MB installed 23:14–23:16), game accepted then failed err 0x80990085, a retry with the failed task still listed →
    0x80990086. **flatz's way (contentUrl = JSON reference package, sceBgftServiceDownloadRegisterTask for games/DLC, debug for
    patches) → the Sims 4 game started 23:29 (task 324)** – 3 connections, ~1.3 MB/s over the Wi-Fi (10.4 GB ≈ 2.2 h).
  - **1.1.134: helper ELF stripped (2.1 → 1.96 MB)** – the old in-memory update download cut at ~2 MB in a long-running helper
    (23:08, twice); updates now stream to a file. NOTE for the release merge: rooms on 1.1.114 can only take < 2 MB builds.
  - **Mistake + fix:** the 23:05 test signed the main profile in and didn't sign it out when the job failed → owner's controller
    couldn't reach the profile picker (23:11). /_pkgdone fixed it; 1.1.134+ signs out again after a failed job.
  - Sims 4 for Kaeden: game = manual test4 (task 324), then 36 queued in the engine (patch 1.95 first, then 35 DLC). Owner freed
    space (Kaeden 190 GB free). Staff code copied into the laptop server by Claude (not shown in chat).
  - To do: home-screen folders (app.db, read-only probe first), Atlas/Bella can't reach the laptop, speed.
- **10:38–10:47pm – detector timing + PKG project STEP 1. Helper 1.1.131 (ps4-test ae83249) on Kaeden 22:41.**
  - Owner: "the detector starts about 7 mins after a time ends right?" – yes: ps4resetAuto = {on, after 7, rooms [max]} → reset
    time = guest end + 7 min; the engine starts the (silent) countdown 5 min before (guest end + 2 min); at the reset time it
    still waits until 2 min without presses (game detector + menu detector) → earliest clean slate = guest end + 7 min.
    Automatic reset is ON FOR MAX ONLY (Max is on release 1.1.114: game detector only, no menu detector, old sign-out).
  - Owner's PKG spec (10:38pm): safety checks (guest inside etc.) → if nobody signed in (after a clean slate = PS-button screen)
    sign the MAIN profile in ("main profile is constant on all"); read PKGs from a chosen folder or drive (he backs PKGs up to an
    external HDD); drag a game PKG into the queue → ask whether to add its patch + DLCs found in that folder; uninstall; jobs to
    GROUPS (Netflix tier games / Deluxe = Netflix + more / VIP = all – ROOMS tiers: netflix Vale Kaeden Scarlett, deluxe Kai
    Bella Atlas, vip Max); read installed games and bring every room to the same version.
  - STEP 1 built: `/_pkgprep` (refuses with an app open, clean/save job, member load or countdown; the engine already refuses any
    PS4 job with a session now or within 15 min) → if nobody is signed in, sceUserServiceLogin(main) → `/_pkgdone` = if we signed
    in, the add-on logs everyone out (shell-logout-now). Kaeden 22:42:24: **main signed in 0.2 s, but foreground user = none
    (ffffffff), still none 2 min later** – the installer may need a foreground user → test in step 3 (or the add-on's
    SetForegroundUser, unproven). 22:45 `/_pkgdone` → logged out by the add-on ✅.
  - Next: step 2 laptop side (folder/drive server + PKG header reader + queue page with patch/DLC prompt + groups), step 3 helper
    install via BGFT from the laptop URL (progress, pause), step 4 uninstall, step 5 version sync from the installed list.
- **10:25–10:30pm – owner: "why is this needed [log-out at the start] … a forced clean slate should show popup that clean slate will
  run, but for the automatic cleanslate, the detector should be the trigger, no key triggers on the menu or game > close game if
  game running and satisfy 2 min trigger, show popup, 2, then 3. then the member saves are loaded if applicable".
  Helper 1.1.130 (ps4-test d4e37cd) + round2_shell11 (ps4-shell 6c206e9) on Kaeden 22:27 (shell11 live, no restart).**
  - reset_go with the add-on: NO sign-out at the start (the shell-logout-now request is no longer sent); order = close game (if
    any) → pop-up "Round2: clean slate starting …" → lock + picker paused (add-on sees the run) → clean → LogoutAll at the end →
    unlock. Without the add-on (release rooms): unchanged (spares signed out the old way).
  - Automatic countdown: the reset already waits for 2 min without presses after the reset time (in-game detector round2_input).
    NEW menu half: shell11 writes /data/round2/input/menu_last on any button change while the countdown is armed (input/arm);
    the helper counts it as a press. In the menu (no game) with the add-on alive the detector now counts as "known".
  - Open: "then the member saves are loaded if applicable" – asked the owner what triggers it (next booking is a member?).
- **10:14–10:20pm – owner: "can the clean slate also follow the logout logic … we can logout controllers to go into ps button,
  implement". His 22:12 control-centre clean slate ran the OLD way: reset_go signed spares out with sceUserServiceLogout ("1 signed
  out") – the one that can leave a controller stuck – and no lock. Now helper 1.1.129 (ps4-test f7f51b9) + round2_shell10 (ps4-shell
  7b64a66), on Kaeden 22:16; shell10 auto-loaded 22:17:08 (no restart).**
  - Reset start: helper writes /data/round2/shell-logout-now → add-on runs LogoutAll(13) and answers .done (helper waits ≤8 s,
    else falls back to the old spare sign-out, logged). During reset/clean/purge runs: PS + Share locked, picker paused (same as
    member loads); at the end: everyone logged out the menu's way, then unlock → PS-button screen.
  - **Correction:** shell8 did NOT run next to shell9 – shell8's log: "21:11:15 stopped - a newer add-on is running" (it stops
    itself when shell.gen changes). The 1.1.125 guard was unneeded and is removed in 1.1.129, so add-on updates need no restart.
- **10:02–10:10pm – owner: "how to workaround" the 1-minute wait for "open the tile" → "ok go". ENGINE DEPLOYED 22:06 (commit
  88321b1; live hash before = repo 0076449 886e57b4…, after d22eb172… = repo; 27 bindings; 3 timers) + helper 1.1.128 (ps4-test
  df860ef) on Kaeden 22:07.**
  - Helper `fg_thread` posts `/ps4/alive {id, v, tile: 0|1}` only when the tile opens/closes (retry every 10 s) → engine writes
    `ps4fg:<id>` {on, at, v} (ONE DO call). Member `play` reads it in the same kvMany as before (no extra call): tile closed →
    phone shows at once "Open the Round2 tile on the TV first, then press Load again." No record (older helpers) = no check.
  - The helper's own check (1.1.127) stays as a second guard. Light check after: 13 ✅ · 4 ⚠️ · 1 ❌ (side timer 52, known).
- **9:56–10:05pm – owner: "is there a handshake between phone and whether the ps4 tile is on" → "ok". Helper 1.1.127 (ps4-test 816b57a)
  on Kaeden 22:03.** Before: Load only checked the QR code (this session), PS4 answered in 3 min, PS4 not busy. Now the helper
  refuses a NEW load unless the Round2 tile is the running app (`running_title` = RTWO00001): TV pop-up "<name>: open the Round2
  tile first, then press Load on your phone again" + result memplay/refused. Phone still only says "Sent! Watch the TV" – showing
  the refusal on the phone needs an engine poll (not built; engine deploy). Owner's 21:55 Karen load on 1.1.126: 12 s ✅.
- **9:34–9:45pm – Aliff-alone test on 1.1.125: owner "the tile closed without disconnecting controller or bringing to press ps
  button screen". Logs (save.log + round2_shell9.txt):** 21:34:57 lock ✅ → release of main + Player 3 (3 games, 66 MB copied +
  removed, 21:34–35) → **cloud batch before the load 111 s** → 21:37:04 Aliff kept ("already on profile 16c45cc7 with the newest
  saves") → 21:37:05 LogoutAll ✅ → 21:37:08 unlock. The owner wrote at 21:36 – the tile had closed during the 111-s wait.
  - Cause: the engine said "Ready" too early. The release run is kind "switch" (not "prep"), the queue placeholder was removed
    before the cloud batch, and the first report with the queue came after the "releasing" result.
  - Owner 9:38pm: "the tile closing should be the trigger, maybe code this into the ps4 tile instead of a sensor in the helper?"
    Answer: the logout already waits for the tile to be gone; the tile closed early because it was told "Ready". Fixed at the source.
  - **Helper 1.1.126 (ps4-test f2efe3c) on Kaeden 21:44:** report sent BEFORE the release result and every 4 s during it; queue
    placeholder kept until the load starts; the 111-s cloud batch before the load dropped (released saves go up in the normal
    cloud batch later). No engine change.
- **9:27–9:33pm – owner: "if second player enters alone, then later first player comes … the loaded profile holds the latest saves …
  waste of time to copy and delete … is it easier to rename" → "build yes". Helper 1.1.125 (test, ps4-test 775fdc2) on Kaeden 21:30.**
  - Before: positions by tick order only → B (alone, Player 1) would get A loaded over it and B re-downloaded into Player 2 from the
    cloud, which can be OLDER (the cloud batch doesn't run while a game is open; B's newest copy only went to the room backup).
  - Now: a ticked player whose member tag is already on a profile STAYS there – nothing copied, removed or downloaded. Exception:
    games another room uploaded after they were loaded here (index entry time > tag file time, and not this PS4's own cloud.txt) –
    only those load (prep/only_<u>.txt filter in look_memload). New players take the lowest free spare. Nothing to load at all →
    "memplay/ready … already on this PS4" at once.
  - Tag files are no longer rewritten when unchanged (their time = when the player was loaded). An "x<k>" extra-slot link alone no
    longer triggers a release.
  - Also in 1.1.125: no auto-load of a new add-on while another add-on's heartbeat is fresh (the shell8+shell9 side-by-side issue).
  - Owner restarted 21:18 → shell9 loaded alone 21:20:43 ✅. Light check 21:33: same 12/5/1 as before.
  - Test: (1) B alone → Player 1. (2) then A + B → B stays Player 1 with no load, A goes to Player 2.
- **9:10–9:15pm – owner "both done" → helper 1.1.124 (test, ps4-test 0e78800) + round2_shell9 (ps4-shell fd97cf0) on Kaeden
  (switch #1 since the 8:57 restart). OWNER RESTARTS KAEDEN, THEN TESTS.**
  - (A) Logout gap: helper `fg_thread` writes fg.txt within 0.25 s while a member load runs / just finished (2 s otherwise) and
    shows the pop-up the moment the tile is gone. shell9 checks every 0.1 s and logs out at once (no 2-s wait), then unlocks.
  - (B) Switch profile (owner 9:03pm): before the ticked players load, every room profile NOT taking one is released – its games
    get the normal clean slate (internal copy → cloud of the member it belonged to, then removed; never PS Vue), then spares are
    renamed "Player k", pictures reset, owner_ tags removed; a cloud batch runs; then the ticked players load as before. Main is
    released (games only, keeps its name) when "main" isn't ticked. Clean profiles are skipped (no time lost).
    Code: look_memplay "release" block → clean run kind `switch` (todo) → clean finish → `switch_resume` (release_names, cloud_step,
    re-run the saved spec from /data/round2/memplay-after; `.done` marks the second pass). MEMQ holds a placeholder line meanwhile
    so the engine/tile stay on "loading".
  - ⚠️ Found: the helper loaded shell9 at 21:11:14 NEXT TO the still-running shell8 (shell_alive only knows its own add-on name),
    so both run until the restart. Menu fine ("running (alive)"). To fix in the next helper: don't auto-load a new add-on while
    another one's heartbeat is fresh – wait for the next PS4 start.
  - Light check 21:13: 12 ✅ · 5 ⚠️ · 1 ❌ – the same as before (side timer 52 requests, SimplyBook 6,120 today, Kaeden TV 16 days),
    nothing from this change.
  - Test plan: (1) load Aliff only → Player 1 = Aliff, any other spare back to "Player 2/3…", no second Aliff; logout right as the
    tile closes. (2) load 2 players, then 1 → the second one's profile is cleaned + renamed.
- **8:57–9:10pm – Kaeden restarted (owner) → 1.1.123 + shell8 + tile 0.10; Aliff-only test: LOAD 26 s ✅ (20:59:57→21:00:23, was 81 s).**
  - shell8: lock 20:59:57–21:00:31 ✅; "after the load: tile closed (2 s)" → logout 21:00:28. Owner: tile closed "after 1 pulse"
    (too soon), then he could move in the menu ~4 s, then input froze and the logout came.
  - Cause 1: the engine shows "Ready" for a moment BEFORE prep starts (memplay/loading result in, clean state still "done" from the
    last run) → tile 0.10 started its ending early. **Tile 0.11** (ps4-tile 6d285a8): the end only counts after the tile saw a bar
    with games (or "Ready" held 10 s for a nothing-to-load case); back to loading cancels the card. Installed via `/_tile.now`
    (task 320) – no helper switch.
  - Cause 2: shell8 waits 2 s for the pop-up + fg.txt is written every 2 s → up to ~4 s on the home screen with users still in.
    Next add-on: log out the moment the tile is gone (pop-up after); helper: fast fg while waiting. Needs a helper switch → restart.
  - **Owner 9:03pm – profile slots: "loading only aliff replaced karen bozz with aliff bozz, and there is another aliff bozz in
    player 2 slot … its considered a switch profile, sometimes guest may want to do it too, so load their profiles and clean slate
    the rest."** Today: look_memplay puts the k-th ticked player into Player k (spares by id), the others keep their old name/saves
    (linked as x<k>). To build: the profiles NOT loaded in this batch get a clean slate (their saves copied to the cloud of the member
    they were linked to, then removed; renamed "Player k"; picture reset; link removed) before/while the ticked ones load.
- **8:47–8:55pm – owner OK'd the deferred backup; why the tile didn't close; Kaeden → 1.1.123 (switch #5 – RESTART NEXT).**
  - Owner: "is it because the load in is not starting from a clean slate?" – yes: Kaeden's profiles still held GTA V / VS saves from
    earlier tests, so the pre-load backup ran (it only runs when the profile has that game's save) and GTA's sce_bu_ part clashed.
  - shell7 log (/_tail round2_shell7.txt): load 20:36:22–20:39:03 locked ✅, then "tile still open after 40 s" → logout 20:39:46.
    Cause: Main + Karen failed, engine ended in "Sorry" (status off + title) and tile 0.08 only closed on "done".
  - **Helper 1.1.123 test** (ps4-test f74a3b2): pre-load backup → /data/round2/defer/<u>-<t>-<time>/<part> (local only during the
    load) → `defer_tick` sends it to the cloud (same keys as before: <console>/<u>/<t>/_game/<time>/…, manifest, game.txt) when no
    member batch runs, every 20 s, then deletes it. SHELL_ADDON round2_shell8; pop-up/logout wait 20 s (was 40).
  - **round2_shell8** (ps4-shell c2193c2): waits max 20 s for the tile. **Tile 0.10** (ps4-tile 80534e8): closes after a "Sorry"
    ending too. Kaeden 1.1.123 ✅; `/_tile.now` → "installer start 0x80990001" (BGFT busy? task 316 from 0.08 still there?) – tile
    stays 0.08; the helper retries 2 min after the restart.
- **8:36–8:50pm – owner's 3-player load test (Main, Karen bozz = GTA V; Aliff Bozz = Vampire Survivors): >2 min, "what happened
  to our optimisations". Logs (/_tail save.log):**
  - Main + Karen: GTA V "making 16c45cc6/7 CUSA00419 sce_bu_sce_sdmemory failed: part already exists" → failed (10 s, 29 s).
  - Aliff: game backup BEFORE the load = 33.7 MB uploaded in 37 s (20:37:45→20:38:22); restore 39 s because the 6-piece bundle
    failed "bundle download -1 no memory" → one piece at a time (download 36 s). Gaps of 6–17 s between players.
  - Reports took ~4 s each on Kaeden (disk+folders 2.2 s, games list 1.4 s) and a member load reports every 4 s.
  - **Fixes:** 1.1.121 (ps4-test 0492fc4): sv_getm_net bundles go through a file (r2tls_fetch_file) – no 8 MB buffer; reports during
    a member batch (memqn) reuse the disk scan (≤2 min old) and skip the games list. 1.1.122 (ps4-test acb1e1c): "part already
    exists" = use it (NOT marked made, so a rollback never deletes it). Kaeden on 1.1.122 (switch #4 since 8:25pm – restart before more).
  - **Tile 0.09** (ps4-tile 9e1c0f5): logo breathes always (sinks into the background and back, room colour, wide shine), faster
    while loading; bar creeps inside each game; Ready 1.5 s + instructions 6 s. Not installed yet (tile open on Kaeden).
  - **Open question for the owner:** the safety backup before a load uploads the profile's old save to the cloud first (37 s for
    33 MB). Proposed: keep that backup on the PS4 during the load and send it to the cloud right after (quiet time).
- **8:26–8:35pm – Kaeden restarted (owner) → 1.1.119 → shell7 auto-loaded 20:26:54 ✅ → tile 0.08 download FAILED "size 4193707,
  expected 6619136" (×3) → helper 1.1.120 test (ps4-test 1c975ef): `r2tls_fetch_file` streams the body into a file (cause: the reply
  buffer doubles 4 MB→8 MB and that realloc failed on the PS4; r2tls_fetch also needs 2× memory) – tile uses it → **tile 0.08
  installed 20:33:48 (task 316)** ✅. Kaeden switches since the 8:25pm restart: 2. Restart's start line proved the minute
  breadcrumb: "the run before was last in: 20/11 20:23:43 wait (alive; step since 20:23:42)". Power notes after a restart: all 0.
  **For the PKG project: never download big files into memory – r2tls_fetch_file or BGFT from a URL.**
- **8:22pm – owner: "continue blocking controllers? then after logout".** shell7 (ps4-shell, rebuilt, still never loaded) keeps
  the PS + Share lock from the load start until right AFTER LogoutAll, then unlocks (combo still unlocks in the wait). With the
  tile open nobody can leave it for a game; without the tile the wait is only the 2-s pop-up gap.
- **8:20pm – owner: if a game was opened before the logout, "just close" it.** shell7 (ps4-shell, rebuilt same name – never loaded
  anywhere) now logs out anyway (logs "a game was opened … it closes now"); helper 1.1.119 (rebuilt, not installed anywhere) shows
  the pop-up in every case. Why it's safe: a member load never writes saves while a game is open (clean slate/prep pauses: "a game
  is open"), so nothing clashes; the window is only the ~15 s between "Ready" and the logout.
- **8:05–8:10pm – BUILT (owner: animation before/after Ready with the Round2 logo, instructions for the controllers, log out
  right after the tile closes, + the 2 suggestions):**
  - **Tile 0.08** (ps4-tile a583504; only PS4s with tile-on = Kaeden; helper installs it itself within 30 min, never while the tile
    is open): logo pulses in the room colour with a white shine while loading; after a load IT WATCHED: 3 s ready burst (rings +
    green logo) → 9 s "What happens next" (closes by itself · TV shows "Press PS button" · press PS · pick your profile · more
    players each press their own PS) with a countdown → closes itself (sceSystemServiceLoadExec("exit")). Opened later (to switch
    players) it never closes by itself. Polls every 3 s while loading.
  - **round2_shell7** (ps4-shell d3f8e83): after a load waits until /data/round2/fg.txt isn't the tile (max 40 s), 2 s for the pop-up,
    then LogoutAll – or NOT if a game is open (logged).
  - **Helper 1.1.119 test** (ps4-test 38d4553): writes fg.txt (what's in front) on change, every 2 s; after a member batch shows the
    pop-up "Saves loaded! Press the PS button and pick your profile." once the tile is gone (none if a game is open); auto-loads shell7.
  - Waiting: Kaeden restart (4 switches since 3:15pm) → ps4update test 1.1.119 → member load test with the tile open.
  - Note for the PKG project: the helper ALREADY installs packages with the PS4's own installer (BGFT) – the tile (1.1.87,
    TILE_PKG /data/pkg, remove-then-install on 0x80990088). Reuse that code.
- **7:55–8:02pm – owner decisions on the tile + logout.** Owner on screen after the 7:47 load: ended on "Press PS button" ✅; didn't
  see the tile / PS-button lock (not sure). **Tile (RTWO00001, ps4/tile) never closes itself** (polls 20 s, 8 s while loading).
  Owner 8:02pm: **ADD option 1 – the tile shows "Ready" a few seconds, then closes itself, before the logout; NO idle close** ("new
  guests might take 10 mins to figure out the ui and take time to customise… leave it open"). Plan (next Kaeden update, after the
  restart): tile 0.08 polls every 3 s while loading and exits ~5 s after showing Ready; add-on waits ~15 s (not 8) before LogoutAll.
  Also proposed, owner hasn't answered: a TV pop-up just before the logout ("Saves loaded – press PS and pick your profile") and
  skip the logout if a game is open in that window (helper tells the add-on).
- **7:43–7:50pm – REAL MEMBER LOAD on Kaeden with round2_shell6: ✅.** 7:43:52 "member load started" → PS + Share LOCKED, picker pause
  called (check says 0); 7:47:07 load done (prep 1/1, 0 fails) → UNLOCKED; 7:47:16 LogoutAll(13) "logged everyone out". Owner asked
  to confirm on screen (PS button dead during load? ended on the picker? tile said Ready first?). Picker "paused" check reads 0
  whenever nobody is logged in / during a load – watch whether the picker ever pops up during a load.
  Light check after: same as before (13 · 4 · 1 failed = the 5:11pm side-timer 52 still inside its 24-h window). systems.json item
  "PS4 menu add-on" → test.
- **7:41pm – IDEA TO IMPLEMENT (owner: "keep this idea to implement"): one button detector from both add-ons.** round2_input (inside
  the game, per title – Max SF6) sees in-game presses; round2_shell (inside the menu) sees home screen / menu presses live. Combine
  them for the end-of-session countdown ("nobody touched a controller for 2 min" anywhere). First test: does round2_shell still see
  presses while a game is open? Needs a "watch while a game is open" switch = one helper change → after the Kaeden restart.
- **7:30–7:38pm – BUTTONS SOLVED (round2_shell6, helper 1.1.118 test, ps4-shell 6b557ab / ps4-test 483d61d; Kaeden switch #4
  since the 3:15pm restart – next helper change only after a restart).**
  - Test #2 (7:30, shell5): m_curGeneralButtons IS live (d-pad, square). Test #3 (7:36, shell6, owner pressed in order):
    **L2 0x1000 · R2 0x2000 · L3 0x4000 · R3 0x8000 · L1 0x400 · R1 0x800 · X 0x20080 · O 0x10040 · triangle 0x20 · square 0x10**
    (d-pad: left 0x1, up 0x2, right 0x4, down 0x8). So the combo constant was right; **0xf000 seen = "(unlock combo held)"**, but held
    < 1 s, so no early unlock. m_curButtons (Orbis SystemButtons) read 0 the whole time – not useful.
  - Self-test #3: lock ✅, unlock ✅, LogoutAll ✅ 7:37:20. Picker pause check said 0 when NOBODY was logged in (said 1 at 7:27 with
    users in) – the pause may only show while someone is logged in; watch in the member-load test.
  - Helper 1.1.118 `/_shtest` now waits for THIS run's end (7:30 run "finished" at once on old lines).
- **7:22–7:30pm – padprobe1 OK, round2_shell5 auto-load OK, self-test: lock/pause/log-out ✅, buttons 0x0 the whole time ❓.**
  - padprobe1 (owner "go" 7:22): no crash. **m_padInfo = List<PadInfo> (objects): _items PadInfo[32], _size 24** – shell3 failed only
    because it refused > 8 entries. PadInfo fields: config (static PadConfig[]), m_port int, m_readTime long, m_curInfo
    (Orbis.Input.ControllerInfo), m_curButtons (Orbis.Input.SystemButtons), m_curGeneralButtons (Core.Input.GamePadButtons),
    m_buttonState List<ButtonState>. PadManager: static <Instance>k__BackingField, static LockTypeChangedAction, m_padInfo,
    m_lockType. sceKernelDlsym check said MISSING even for proven functions (the Mono module wasn't found by name) → useless; don't rely.
  - **round2_shell5** (ps4-shell c2f8ca0) = shell4 minus the 5 imports, reads up to 32 entries; **helper 1.1.117 test** (ps4-test
    a170fb9): auto-loads round2_shell5, ONE try per helper run. Kaeden → 1.1.117 7:25pm; shell5 started 7:25:41 by itself: "pad list:
    24 entries (24 filled)", buttons 0x0, WATCH. **No crash.**
  - `/_shtest` 7:27:45–7:28:49: lock ✅, picker paused (check 1) ✅, unlock + picker back ✅, LogoutAll(13) ✅ 7:28:46. Buttons logged
    0x0 for all 60 s, no combo – asked the owner whether he pressed (if yes: m_curGeneralButtons isn't live → probe m_curButtons /
    m_buttonState / m_readTime next, read-only).
- **7:09–7:20pm – Kaeden menu CRASH (round2_shell4) + Atlas wake test #1 FAILED.**
  - Kaeden → 1.1.115 test 7:09:15 ("power notes at start: power_history 0, shutdown_status 0, standby_start 0" after a full restart
    at 3:15pm); auto-load 7:09:59 "56032 bytes, call 0, result 0x0, not alive after 15 s" → **owner 7:10pm: menu crash.** No
    round2_shell4.txt / .step at all (`/_probeup.round2_shell4`: "no such file") = it died before its first log line. Prime suspect:
    the 5 Mono imports never used in the menu before (mono_class_get_rank, _get_element_class, _is_valuetype,
    mono_array_element_size, mono_field_get_offset) – shell3 (proven 8:09am) had none of them. **My mistake: skipped "read-only
    probe first" for new imports.** Rule from now: a menu add-on imports ONLY Mono functions proven by an earlier run; anything new
    is looked up with sceKernelDlsym first.
  - Kaeden → **1.1.116 test** (ps4-test f5609dd = release code, R2_SHELL=0, no auto-load) at ~7:13pm so it can't load shell4 again.
    (First 1.1.116 push 4c0e29b had a bad version string from shell quoting – replaced 2 min later, never installed.)
  - **round2_padprobe1** (ps4-shell 20757cc, source ps4/plugin/round2_padprobe): read-only; only proven imports + sceKernelDlsym
    check of the 5; describes m_padInfo (class chain, fields, size) by names. Waiting for owner "go" (menu back, no game, controller on).
  - **Atlas long-sleep wake #1 (rested 6:08:35pm, same network round2-ps4, sender Bella): NOT woken.** 7:16pm broadcast
    `/_wakerp.192.168.120.255.357299b3` (status probe to .255 "send failed -3", WAKEUP sent 3×) and 7:19pm direct to
    192.168.120.4: "before: no answer in 4 s · WAKEUP 3× · after 25 s: no answer". So after ~68 min of rest Atlas is deaf even
    on its own network → the 2.4 GHz rest problem is not the subnet. Atlas left asleep (owner can press PS). Bella `/_keepawake.0`
    + `/_rest` 7:20pm. Next to learn: the sleep time at which it goes deaf (3 min worked before; try 10 / 20 min).
- **7:00pm Light check (before the Kaeden add-on test): 13 passed · 4 to look at · 1 FAILED.** ❌ side timer hit 52 outside requests at
  5:11pm (Firebase rtdb 50 + SimplyBook 2; 2 SimplyBook fetches refused – "gm insess"). Not from today's PS4 work (no engine change
  since 7:44am); a one-off TV-side burst on a busy evening – look into which side job makes 50 Firebase calls. ⚠️ SimplyBook 5,043
  today (biggest: /day getAvailableTimeIntervals 1,232 = booking page traffic) → no Full check today.
- **6:45–7:00pm – PLAN (owner): remote PKG install/uninstall from a folder on his laptop (laptop-dmvou7pp, Windows; connected folder
  C:\Users\saber\round2-tv → e.g. round2-tv\pkgs).** Games, updates/patches and backports. Owner chose the laptop-folder method
  (not Cloudflare). Design: a small script shares the folder on the shop Wi-Fi only + tells the engine its address and file list;
  control centre: pick file + rooms; helper uses the PS4's own download manager (flatz ps4_remote_pkg_installer installer.c:
  sceBgftDownloadRegisterTask for games, sceBgftDebugDownloadRegisterPkg for patches; Pause/Resume/Unregister/GetProgress;
  sceAppInstUtilAppUnInstall/…Pat/…Addcont) = streams straight into place, no double space. Register needs a FOREGROUND USER →
  owner 6:58pm: helper logs the main profile in (quiet time) if nobody is, pauses the download when a guest session is near, logs
  everyone out the menu's way (add-on LogoutAll 13), resumes after. Atlas/Bella (round2-ps4) can't reach the laptop – later.
  Show each room's firmware (9.00 Max/Kai/Atlas, 11.00 Bella/Scarlett/Vale, 13.50 Kaeden) for backports. Games sheet:
  https://claude.ai/artifact/P3A3h2aWS1Qo8kwjWr76er (Skul = two editions CUSA27428 vs CUSA27430). Order: Kaeden add-on test first.
- **6:41–6:50pm – SPLIT (owner: "split to get logs faster and diagnose, once test bench is flawless we can merge").**
  One source, two builds (`R2DEF=-DR2_SHELL=1 sh build.sh` = test): **release 1.1.114** (ps4-release 9bf5caa) = minute breadcrumb +
  power notes only – engine sees it (ps4rel 6:42pm), rooms take it in quiet time; **test 1.1.115** (ps4-test 4c72e24) = 1.1.114 +
  menu add-on auto-load + `/_shtest` – Kaeden only, with the owner there. Merge into release once Kaeden is flawless.
- **6:33–6:45pm – Kai back (owner restart + jailbreak 6:33pm); breadcrumb gap found on EVERY PS4, fixed in 1.1.114.**
  - Kai's last trace before 3:25pm: Overcooked 2 started 3:20, profile order 3:21, check-in 3:25:14, then nothing (no stop line,
    no netfail) → most likely a full switch-off by the guest; PS4 later on without jailbreak (DDP "200 Ok" 6:11pm, helper silent).
  - **"the run before was last in" was stale on every PS4** (Kai 06:25, Atlas 06:42, Bella 10:39 – hours before they stopped):
    since 1.1.71 where.txt is only written for steps over 10 s or on a clean exit, never for a switch-off. Not a Kai-only fault.
  - **1.1.114 (ps4-test 98a587f, source on ps4-helper)** now also: where.txt every minute ("<time> <step> (alive; step since …)")
    and at every start a slow.log line "power notes at start: power_history, shutdown_status, standby_start" (registry, read-only)
    – compare over known events to tell switch-off vs crash vs power cut. Rolls out with the add-on after the Kaeden test.
- **6:05–6:15pm – long-sleep wake test (owner: "remote on atlas and bella… test a long sleep wake"), Kai helper silent.**
  - Atlas + Bella both on 1.1.113, no netfail since 2pm, no booking tonight. **Bella = sender** (`/_keepawake.600` 6:07pm, to ~4:07am);
    **Atlas `/_rest` 6:08:35pm.** First same-subnet (round2-ps4) long-sleep test: earlier "Atlas didn't wake" tries (16 Nov on round2
    after ~28 min; 19 Nov 11:57pm from Vale) were from round2 = other subnet → not valid for round2-ps4. Tries: 7:10pm (1 h), then
    3 h, then longer (send_later). Wake = look on Bella `/_wakerp.192.168.120.255.357299b3`.
  - **Kai: helper silent since 3:25:14pm** (game CUSA55613 open, guests 3–6pm) but Scarlett `/_ddp.192.168.88.18` 6:11pm = "200 Ok"
    = PS4 AWAKE on Wi-Fi → helper died/froze, not the network. Owner asked to restart + jailbreak before Kai's 8:15pm guests; read
    "the run before was last in" on start.
  - Updates (owner 6:09pm "update the ps4s"): all on 1.1.113 except **Vale 1.1.61** (guests 5–8pm and 8:15–11:15pm) – asked owner.
  - **Owner: remind him later** of: (1) moving the look of the member page /m, booking confirmation /done and View your booking
    /find + /b/ from the engine to GitHub (gf's Claude can then edit them; build on a hidden test address, switch on a quiet
    morning after a full check); (2) HDMI Device Link off on Atlas + Bella (decide); (3) Kaeden menu add-on test (prepped below).
- **3:16–3:30pm – Kaeden restarted (owner), menu add-on test PREPPED, not run (owner eating; add-on loads only with him there).**
  - Light check before: 14 passed · 4 known (watchdog old lines, Kaeden TV quiet, Atlas TV app 1.0.286, Vale clean slate) · 0 failed.
  - shell3's 8:09am log (R2 lib/probe/round2_shell3-73378b38…txt): pads 1/1/1 found but buttons 0xffffffff → m_padInfo isn't a List<>.
  - **round2_shell4 4.00** (ps4-shell 3ce2e32; source 9f48a00): array/list × object/struct read, one-time pad description, self-test
    only on request (shell-selftest), every button change logged in it, shell.alive heartbeat.
  - **Helper 1.1.114** (ps4-test 41b5a51; source on ps4-helper): `shell_auto` loads round2_shell4 at every PS4 start (skips: shell-off,
    game open, 5 min after wake, add-on alive; ≤3 tries 10 min apart, save.log); `/_shtest`. NOT sent to Kaeden yet (switches since
    the 3:15pm restart: 0).
  - systems.json (main 586722d): new item "PS4 menu add-on…" = build. Docs: ps4-shellui.md "Add-on runs and versions".
  - Kaeden 2:43–2:47pm (before the restart): 7 failed connects during a member cloud upload (CUSA00419, Karen bozz), path check all
    ok, back after 186 s – first fails on Kaeden in a while; watch.
  - **Test when the owner is back:** (1) ps4update Kaeden → 1.1.114 (test); watch save.log for "menu add-on round2_shell4 auto-load
    (try 1 of 3): … running (alive)" and the pad-list line in round2_shell4.txt (/_probeup.round2_shell4) – controller ON;
    (2) `/_shtest` with a controller on: owner presses a few buttons, then holds L2+R2+L3+R3 → expect "buttons: 0x…" lines +
    "unlock combo … held 1 s", then log-out → profile picker; (3) a real member load from Kaeden's tile (lock during, log-out 8 s
    after "Ready"); (4) Light check after; systems.json → test if all good.
- **11:12am MONITORING (owner: "kai atlas and max has guests now monitor network drops") – read-only, nothing sent to these PS4s.**
  Baseline 11:13: Kai 1.1.111 (5 GHz ch36, 96%, 192.168.88.18; woke 10:24 after ~2.8 h, 1 connect fail back in 62 s);
  **Atlas 1.1.111 on round2-ps4 ch6 82% – NEW address 192.168.120.4 (was .3)**, woke (staff) after the 6:41 rest, last fail
  06:40; Max 1.1.113 (5 GHz ch36, 94%, .88.23; woke 10:26 after ~2.7 h; slow.log "stuck 807 s in 'read'" in the same second as
  "woke from rest" = rest time counted, 1.1.113 label fix not on the old run). Kai/Atlas not auto-updated yet (guests/bookings =
  quiet-time rule holds them). Checks every 20 min via send_later.
  **Result 11:12–2:10pm: 9 checks, 0 network fails, 0 slow steps, no busy, check-ins always < 60 s** while guests played
  (signal Max 94–100%, Kai 92–98%, Atlas 82–98%). At ~2pm sessions ended: Max closed F1 24; Kai auto-updated to 1.1.113
  at 14:03 (quiet time, as designed); **Atlas last checked in 1:59:51pm and was silent at 2:10 with no fail logged** –
  most likely rested/turned off at session end (not confirmed). Check Atlas's next start-up line in slow.log to tell rest from drop.
  **Confirmed 2:50pm (owner turned Atlas on ~2:30): REST, not a drop.** Same helper run (pid 74) survived; slow.log "guard took
  1761 s (running clock 16 s)" + "woke from rest after about 1743 s"; no netfail. **Atlas quirk: its PS4 clock runs ~8 min 17 s
  fast** (psClock 14:01:05 in the report the engine got at 13:52:48; 14:45:45 vs 2:37:28) – Atlas log stamps are PS4 time, so
  subtract ~8 min. Real times: last check-in 1:59:51 → rest ~2:00:30 → woke ~2:29:30 → auto-update to 1.1.113 at ~2:37 (quiet time).
  "run before was last in: 06:42:39 read" = old stale 1.1.111 label, ignore.
  **Cause (owner 2:52pm): the guest turned the TV off, and the TV sent "rest" to the PS4 over HDMI (HDMI Device Link / CEC).**
  So a TV switch-off = PS4 rest on Atlas. On 2.4 GHz rooms (Atlas/Bella) remote wake after a long rest fails – keep in mind.
- **8:01–8:12am (owner: "do all calls of 1-4 then do the self test"; decision 4 = log everyone out after a load "definitely";
  decisions 1-3 on the shelf; tile reopen must not reset to login – "account for both phone and ps4 tile")**
  - **round2_shell3** (ps4-shell 9d226e8): log everyone out (LogoutAll 13) **8 s after every member load – default ON** (off only
    with /data/round2/shell-nologout); self-test ends with the same log-out.
  - **Engine bb4183f6f062ba38** (27 bindings incl. SAVES, 3 timers): `memplay` keeps `until` (= the QR's session end) + `mid` → the tile
    shows the member ("Ready, <name>!" / "Signed in for this session. Switch players or log out of this room on your phone.") for the
    WHOLE session, not 20 min; the finished result is stored with it (`mp.fin`) because later look jobs replace ps4look; new member
    act **`roomout`** (QR code check like play) → `mp.out` → tile shows the code again; phone page: **"Log out of <ROOM>"** button in the
    play card; tile line2 "One moment – this PS4 is finishing a job…" while ps4busy is < 75 s old (helper 1.1.112+).
    Phone login itself already persisted (localStorage r2.mem, 180-day token) – unchanged.
  - **DEPLOY CLASH x2 with the other session (phone widgets):** they deployed 7:16, 7:19?, 7:31am; I merged twice by rebuilding
    their version from per-line hashes and adding my hunks (live was a8be97f → mine 09acc25; then 2ccdc79 (their wApp/TV messages/
    wps4) → mine bb4183f). Cloudflare's read-back lagged ~1 min after the PUT (looked like it failed – it hadn't).
    **Other session: worker/round2-book.js in this folder = live bb4183f. Pull/merge before deploying.**
  - **Self-test on Kaeden 8:09:50–8:10:54 (owner present):** add-on found all calls (suspend/resume/is-suspended/LogoutAll/Locker/
    PadManager); PS+Share LOCKED + picker PAUSED (menu confirms 1) for 60 s → unlocked + picker back (0) → **LogoutAll(13) accepted
    8:10:51** → WATCH mode (locks during member loads, log-out after). No crash.
    **Problem:** controller buttons read as -1 (`held_buttons` fails: PadManager.Instance m_padInfo list read) → the L2+R2+L3+R3
    unlock combo does NOT work yet; the 10-min limit still releases. Next: read-only check of PadManager/PadInfo fields to fix.
    **Owner 8:16am: right after the log-out the screen said "Press the PS button" = the profile picker (controller was switched off)
    – "acceptable outcome"; it must happen after the tile has loaded everything and closes, so guests log in.** Auto-login did NOT
    skip the picker. Buttons read -1 most likely because no controller was connected (m_padInfo empty/null → held_buttons returns -1).
    Next (no owner needed for the code): held_buttons should report 0 = "no controller" vs -1 = real failure, and log the list type
    + size; re-test the L2+R2+L3+R3 combo with a controller ON (owner holds it when told).
  - **Shelf (owner): decisions 1-3** – profile→member link ends with the session; automatic clean slate in every room; keep older
    cloud versions per game. Written to project doc claude/ideas-on-the-shelf.md.
- **7:32–7:50am (owner: "make every job write its own name, push the update to every room with verbose off as usual, turn off the
  detector for that one game in max, update kaeden one more time")**
  - **Helper 1.1.113**: look paths label themselves "job <path>", plus "job clean-up / helper update / profile / blocker settings";
    tls_go puts the caller's label back after every request ("after network" if it was a network step). Kaeden → 1.1.113 = its
    **5th switch since the 4:20am restart – next helper change needs Kaeden restarted first (owner will).** Test: `/_klog.40`×3 →
    engine busy {step "job /_klog.40", loopS 109} ✅.
  - Side finding: a busy record from 1.1.112 at ~7:26am said step "wait", loopS 169 – the minute loop itself took ~3 min once
    (30 × 2 s waits + guard work), just before the switch. To watch in slow.log; if the loop is often that slow, check-ins every 3 min
    trip the engine's 3-min "isn't answering" limit.
  - **RELEASE: ps4-release = 1.1.113** (dd0d916; boot elf + round2_input unchanged). Engine `ps4rel` = 1.1.113, auto ON,
    PS4_AUTO_HOLD_ABOVE '' → every room gets it by itself in quiet time (awake, report < 20 min old, no booking within 60 min,
    not playing). Verbose/tile stay off on rooms (per-PS4 flag files only Kaeden has). Vale (1.1.61) included when it wakes.
  - **Max:** woken remotely from Kaeden (broadcast, asleep ~27 min, 5 GHz) ✅ → Update now 1.1.113 ✅ → `/_inplug.off` (detector OFF,
    removed from plugins.ini – was ON for SF6 CUSA31498 only) ✅ → `/_inplug.pop.off` (test pop-ups were still ON) ✅ → `/_rest` ✅.
  - **round2_shell2** (ps4-shell 7125212; source ps4/plugin/round2_shell): = shell1 + finds the loaded app.exe via
    mono_assembly_foreach (as the sweep did) instead of opening a path + "calling: X" breadcrumb before every menu call (button reads
    excepted). NOT RUN YET – needs the owner at Kaeden, home screen, no game: `/_shmod.round2_shell2` → 60-s self-test (picker paused +
    PS/Share locked, L2+R2+L3+R3 1 s unlocks) → log R2 lib/probe/round2_shell2-<console>.txt. shell1 never ran (superseded).
  - **Member page facts (checked, for the owner's questions):** login is kept on the phone (localStorage r2.mem, token valid
    180 days) – reopening the page on the same phone/browser shows the member logged in, with a Log out button; only a different
    browser (QR opened inside another app) or Log out asks again. **Overwrite risk found:** the profile→member link
    (/data/round2/prep/owner_<profile>.txt) has NO end time – it stays until cleared or a clean slate. Automatic clean slate after
    a session is ON for Max only, so in other rooms the next booking's guests could play on a linked profile and their progress
    would go to the previous member's folder at the next clean slate. Decisions pending (owner): link ends with the session /
    auto clean slate everywhere / keep older versions in the cloud.
- **7:12–7:25am "ALWAYS ANSWERS" FIX BUILT + PROVEN ON KAEDEN (owner "yes let's do both": rest Max + build it).** Max `/_rest` OK.
  - **Engine** `/ps4/alive` + `ps4busy:<id>` + `busy` field in `ps4list` (ONE Durable Object write per call; helpers send it only
    while busy, ≤1/min). **Deploy note:** live had changed under me – the other session deployed at 7:16am (phone widgets: `/w`,
    `widgetkey`, `widgetSnap`, `wtv` copy in the side timer; removed the 17 Nov one-off `oneoffMid`). I rebuilt their version
    locally from per-line hashes (exact match a8be97f1003ea68a), added my 4 hunks on top → **live 09acc25d02fa2421**, 27 bindings
    incl. r2_bucket, 3 timers. Local worker/round2-book.js = live. Light check 15/3/0. **Other session: pull before your next deploy.**
  - **Helper 1.1.112** (ps4-test; Kaeden – 4th switch since the 4:20am restart, ~1 left today): `alive_thread` – when the loop hasn't
    reached its check-in for 90 s, it POSTs /ps4/alive {busy step, stepS, loopS} with `r2tls_request_quiet` (new in tls/r2tls.c:
    leaves the loop's step label, the watchdog's socket, the TLS session and timings alone), max once a minute; slow.log notes
    "busy N s in 'X' - check-in thread told the engine" / "free again". Rest gaps reset it (not "busy").
  - **Test 7:22–7:25am:** look job `/_klog.40` ×3 (read-only, ~120 s). Loop took it 7:22:47; at 7:24:36 the engine got
    busy {step "read", loopS 109} and Kaeden's poll time refreshed – before the fix it would have looked OFF for 2 min.
  - **Finding:** during the log job the step label said **"read"** – it keeps the last network step while a job runs. So the
    "stuck ~600 s in 'read'" lines (Kaeden 20 Nov 04:04–05:22, Bella 19 Nov 13:32) were most likely LONG JOBS, not network hangs.
    Next (needs a helper switch – Kaeden is at 4, so next start): label every look job / clean / upload step (r2_where("job: …"))
    so slow.log and the busy field name the real work. Then roll 1.1.112+ to the rooms with the owner's OK.
- **7:04–7:12am SWEEP: MAX (9.00) DONE** – owner restarted Max + jailbreak (7:04, fresh switch count). Helper 1.1.99 → **1.1.111**
  ("switched to 1.1.111 (own program)"). `/_pwrreg`: rest 1, stay connected 1, turn on from network 1, USB 2, Remote Play 1,
  auto-download 0, **auto rest 300/300** (like Bella), controller off 1800, power_history 1, **band setting 0** (on 5 GHz ch 36).
  `round2_sweep2` no crash; identical to Kai/Atlas (only assembly load order). **Sweep complete: Kaeden, Bella, Kai, Atlas, Scarlett,
  Max (Vale skipped by owner).** Light check after unchanged.
  - **Correction to the band lead:** Max has band SETTING 0 yet sits on 5 GHz and woke after 4.8 h. So the setting value isn't the
    point – the band IN USE is: 5 GHz (Kai setting 1, Max setting 0) wake; 2.4 GHz (Bella 2, Atlas 2) don't. 0 = automatic (or no
    choice on the original model: Kaeden, Scarlett). Bella/Atlas are pinned to 2.4 (setting 2) and round2-ps4 is 2.4-only anyway.
- **Owner idea 7:06am (verified in code): the helper is one loop.** Only the watchdog and pop-up threads run beside it; check-ins
  (`/ps4/cmd` polls), the 15-min report, every look job, uploads, save copies, clean slate and wake jobs run in that same loop. While a
  job runs (e.g. wake job sleeps 25 s, add-on waits ≤30 s, cloud/save uploads, a 10-min network wait) the PS4 can't check in or pick
  up commands → looks "dropped". Proposed fix (not built): a separate check-in thread so a busy helper still answers, + a label on
  every long step so slow.log names what was busy.
- **ps4debug-NG (owner link):** debugger payload (TCP 744 command server + kernel module, attach/breakpoints/memory, 5.05–13.52,
  13.x not yet validated on hardware per its author; a client on a PC on the shop LAN). Not adopted: no PC on the LAN, extra kernel
  module, and our own logs answer today's questions. Keep in mind for a crash we can't explain from logs.
- **6:41–7:00am Atlas rested, Scarlett swept, Max woken remotely (owner: "rest atlas, turn on scarlett … then max, skip vale").**
  - Atlas `/_rest` OK. **Scarlett (11.00, CUH-1006A)** pressed on by the owner (no PS4 awake to send a wake). On check-in the engine's
    morning-wake job (`ps4MorningWake`, 7:00–11:15 window? it fired 6:44) used Scarlett as sender (broadcast `_wakerp` type R).
    Helper 1.1.68 → **1.1.111** (no switch since start). `/_pwrreg`: rest 1, stay connected 1, turn on from network 1, USB 2,
    Remote Play 1, auto rest 0/0, controller off 1800, power_history 0, **band setting 0** (original model, no 5 GHz – like Kaeden).
    `round2_sweep2`: no crash; file **byte-for-byte identical to Bella's** (both 11.00). Then `/_rest` OK.
  - **Remote wake test: Scarlett (2.4 GHz) → Max (5 GHz, asleep since 2:03am = ~4.8 h): WORKED.** Engine `ps4wake` picked Scarlett as
    sender, broadcast wake 192.168.88.255 type R ×3 at ~6:49; Max's own log: "06:50:31 woke from rest after about 17200 s". A direct
    wake to 192.168.88.23 a minute later found it already "200 Ok". → fits the pattern: 5 GHz PS4s hear a wake after hours asleep.
  - **Max update REFUSED by its own helper:** "waits for the next PS4 restart (5 switches since it started - more can freeze it)".
    Max sweep + `/_pwrreg` need a PS4 restart + jailbreak first (owner decision). Max stays on 1.1.99.
  - **MY MISREAD (6:41am) – Kaeden was never down:** `ps4list` `t`/`ago` = the last FULL report, which an idle helper sends every
    15 min (`REPORT_EVERY 15`); the quiet check-ins are `poll` (ms). Kaeden 6:37:14 → 6:52:20 = exactly 15 min; its slow.log has no
    stuck/woke entry, where.txt last 06:02. **Use `poll` for "is it on".** (Kaeden DDP check from Scarlett 6:47: "200 Ok".)
  - Real but separate: Kaeden's slow.log shows "stuck ~600 s in 'read'" 5 times 20 Nov 04:04–05:22 (around the helper switches /
    restart), Bella once 19 Nov 13:32 – the watchdog didn't cut a connection (no "cut" line) → the step label may be stale ("read"
    left set while non-network work runs). To look at later; not today's silence.
- **6:31am Kai rested remotely** (`/_rest`, owner's ask): "going to rest mode in ~3 s", last check-in 6:31:25, then quiet = asleep.
- **6:32–6:40am SWEEP: ATLAS (9.00) DONE** (owner turned it on). Helper 1.1.68 → **1.1.111** (first update call returned no command –
  resent, worked; no switch since its PS4 start 19/11 23:21; Light check after unchanged). Wake 06:40 (its clock): 1 connect fail,
  back in 8 s. `round2_sweep2` finished, no crash, R2 `saves/lib/probe/round2_sweep2-521ea9ca….txt` – **identical to Kai's**
  (only the assembly load order differs).
  - **Atlas settings (`/_pwrreg`):** rest 1, stay connected 1, turn on from network 1, USB power 2, Remote Play 1, auto-download 0,
    auto rest 0/0, controller off 600 s, power_history 1, **Wi-Fi band setting 2** – same as Bella.
  - **Pattern now: band setting 2 = Bella + Atlas (on 2.4 GHz, deaf in long rest); 1 = Kai (5 GHz, wakes fine).** Everything else
    that matters for wake is identical on all four PS4s checked.
  - **Atlas quirk:** its own clock runs ~8 min ahead (boot.log says 06:40 at real 06:32). Round2 code uses the engine's clock, so
    harmless for us; noted in case a PS4-side time ever matters (measured 441 s ahead at 6:41).
  - Light check after Atlas: 14 pass / 4 look / 0 fail – the extra one is NOT the helper: Atlas's TV came online with TV app
    android 1.0.286, which doesn't report "what's on screen" (needs a TV app update; old issue, visible only while that TV is on).
- **6:24–6:32am SWEEP: KAI (9.00) DONE** (owner: "update to the same as bella and run … make sure all the calls are constant
  because 9.00 is far from 13.50"). Helper 1.1.68 → **1.1.111** (no switch since its PS4 start; Light check after 15/3/0).
  `round2_sweep2` finished, no crash, 2.34 MB, R2 `saves/lib/probe/round2_sweep2-f6ed105a….txt` (1149 classes, 2815 registry
  constants, 2255 system functions).
  - **9.00 vs 13.50, call by call:** IDENTICAL – wake triggers, power states, SystemStateMgrWrapper (all functions), WakeOnRemotePlayMode,
    MainOnStandbyMode, standby reasons, LockType, LoginMgrUtil Suspend/Resume/IsSuspendedLoginScreen + LogoutAll(LogoutMethodType),
    PadInternal.Locker(LockType,LockType), PadManager.get_Instance, m_padInfo, m_curGeneralButtons, LogoutMethodType 0–16 (13.50 adds
    one more value after 16: adult-to-child). Registry: 28 differences, NONE power/network/Remote Play (13.50 adds safe_mode_action,
    feature_flag, IME_ukrainian, fake_partner_subs_mode, UNLICENSED_PAD, devenv keys; 9.00 has NP_jwt_access_token). System functions:
    power/rest/wake identical; only on 13.50: scePadGetCounterfeitState, LoginMgrProxy notify/delegator extras, Spartacus/Kratos.
    → **all three firmwares (9.00, 11.00, 13.50) use the same calls for rest, wake, log-out and controller lock.** (Still: test the
    add-on on each PS4 before trusting it – owner rule.)
  - **Kai settings (`/_pwrreg`):** rest mode 1, stay connected 1, turn on from network 1, USB power 2, Remote Play 1, auto-download 0,
    auto rest 0/0 (never, like Kaeden), controller off 600 s, power_history 1, **Wi-Fi band setting 1**.
  - **LEAD for the wake problem:** Wi-Fi band setting – Kai 1 (on ch 36 = 5 GHz, wakes fine), Bella 2 (on ch 6 = 2.4 GHz, doesn't wake
    after long rest), Kaeden 0 (CUH-1000A has no 5 GHz). Reading (unconfirmed): 0 auto / 1 = 5 GHz / 2 = 2.4 GHz. Matches the 18–19 Nov
    fact "5 GHz PS4s answer in rest, 2.4 GHz ones go deaf". Atlas next to confirm (expected 2).
- **6:16–6:22am SWEEP: BELLA (11.00) DONE** (owner "ok update"). Helper 1.1.77 → **1.1.111** (ps4-test; 1st switch since her
  PS4 start 18/11 03:01; Light check after 15/3/0 unchanged). GoldHEN proc-info OK. `round2_sweep2` finished, no crash, 2.36 MB,
  R2 `saves/lib/probe/round2_sweep2-8ce76694b2a3ca26cd1ba13f23d218ed.txt`.
  - **11.00 vs 13.50 menu: practically the same.** All 2839 registry numbers identical; wake triggers identical (Remote Play 100,
    NP push 102); power states identical; WakeOnRemotePlayMode + MainOnStandbyMode identical; system functions 2263 each, only 3
    differ (party/PS Plus, not power). Differences: 100 lines only on Kaeden / 35 only on Bella – party/quick-menu, "adult to child
    conversion" log-out scene (13.50 only), `LoginMgrUtil.SilentLogout` static signature listed only on 13.50. Everything the
    log-out/lock add-on uses (SuspendLoginScreen, ResumeLoginScreen, LogoutAll, LogoutFromPsImposeMenuV400, PadInternal.Locker,
    PadManager.get_Instance, m_padInfo, m_curGeneralButtons) exists on 11.00 too.
  - **Bella's settings (`/_pwrreg`) vs Kaeden:** rest mode 1/1, stay connected 1/1, turn on from network 1/1, USB power 2/2,
    Remote Play 1/1, auto-download 0/0 – SAME. Different: auto rest "media" 300 and "other" 300 (Kaeden 0 = never; 300 likely =
    minutes = 5 h, the PS4's own "rest after 5 hours idle" option – unconfirmed), controller off 1800 s (Kaeden 600), Wi-Fi band
    setting 2 (Kaeden 0; likely "2.4 GHz only" on this Pro – unconfirmed), power_history 1 (Kaeden 0).
    → The wake settings are NOT what differs. Next comparison: Kai (wakes fine) and Atlas.
  - **Bella quirk (her boot.log):** 19 Nov 13:21:37 "hourly: helper NOT running" – the helper had stopped by itself; first restart
    "sent 0 of 2440264 bytes", second at 13:22:02 worked. That is just before problem A (no internet 13:35–15:48). To look into:
    why the helper stopped (helper-stopped.txt / slow.log on Bella). slow.log: "19/11 13:32:23 watchdog: stuck 610 s in 'read'"
    = the helper hung ~10 min waiting on a network read during problem A (a symptom of the outage, not proof of its cause).
    Rest wake 20/11 06:13 after ~14,084 s asleep: 1 connect fail, back in 8 s (normal).
- **6:01–6:10am SWEEP ON KAEDEN DONE (owner "ready" 6:01am, home screen, no game).**
  - `round2_sweep1` ran with NO crash (breadcrumb "finished"), but my own 1.8 MB cap cut it inside app.exe, and helper 1.1.110
    uploaded only 1 MB. → **helper 1.1.111** (ps4-test, Kaeden – 3rd switch since the 4:20am restart; Light check before/after
    15 pass / 3 old warnings / 0 fail): add-on results up to 4 MB, `/_probeup.<name>` (re-upload result + .step without reloading),
    `/_pwrreg` (read-only rest/wake/Wi-Fi registry values). → **`round2_sweep2`** (same probe, 3.8 MB cap) = THE sweep add-on
    for every PS4. Kaeden: complete, 2.36 MB, R2 `saves/lib/probe/round2_sweep2-73378b38….txt` (1164 classes, 3163 methods,
    114 enums, 2839 registry constants, 2267 system functions).
  - **Findings (Kaeden 13.50 – confirm on each PS4 from its own sweep file):**
    - Menu wake triggers (`SystemStateMgrWrapper.TriggerCode`): only REMOTE_PLAY 100 (= our LAN wake, DDP) and
      REMOTE_PLAY_NP_PUSH 102 (wake through Sony's servers – blocked here by our DNS 127.0.0.1). **No timer / alarm wake in the
      menu.** So "no remote wake at all" isn't possible from the menu; the only other self-wake is ShellCore's "main on standby"
      (half-awake in rest for downloads / auto-update / event schedule, started by the low-power chip "EAP") – not probed (native).
    - `AppMain.WakeOnRemotePlayMode` (Start, StartTimer, ExtendShutdownTimer): a PS4 woken by Remote Play/DDP starts a shutdown
      timer and goes BACK to rest if no Remote Play connects (standby reason 14 "RemotePlayConnectTimeout"). To check in logs: do
      our woken PS4s fall asleep again a few minutes after a wake unless someone/the helper is active?
    - States: INVALID 0, INITIALIZING 10, SHUTDOWN_ON_GOING 100, POWER_SAVING 200, SUSPEND_ON_GOING 300, MAIN_ON_STANDBY 500,
      WORKING 1000. Standby reasons 0–18 (power button, menus, power-save timer, Remote Play, PS App, HDMI-CEC …).
    - Registry numbers (Sce.Vsh.Registry): SYSTEM_POWER_ charge 0x2820100, signin 0x2820200 ("stay connected to the internet"),
      remote 0x2820300 ("turn on PS4 from network"), suspend_to_ram 0x2820800 (rest mode), standby_start 0x2820900, power_history
      0x2820b00, spwakeup 0x2820c00; NET_WIFI_freq_band 0x141e0500; REMOTEPLAY_rp_enable 0x41810000; SYSTEM_eapfunction 0x2070000.
    - **Kaeden values (`/_pwrreg`)**: rest mode 1, stay connected 1, turn on from network 1, USB power 2, controller off 600 s,
      auto-download 0 (all), Wi-Fi band 0, Wi-Fi device 1, DHCP (ip_config 0), Remote Play enabled 1, standby enabled 1.
  - **Sweep per room (next):** helper → 1.1.111 (owner OK each), `/_shmod.round2_sweep2`, `/_pwrreg`, compare with Kaeden.
    Bella/Atlas vs Kai is the key comparison (Kai wakes fine, Bella/Atlas don't after long rest).
- **5:50am CRASH – round2_pwrprobe1 crashed Kaeden's system menu (CE-36329-3, owner photo).** Helper survived (same process 70,
  jailbreak kept). The add-on's file stopped after "## ASSEMBLY System.IO.Compression" (first assembly). Cause: it read Mono's
  metadata "Constant" table as 3 columns – Mono's has 4 (type, padding, parent, value) and Mono ABORTS the program on a column-count
  mismatch in mono_metadata_decode_row. Second suspect (also removed): setting up the methods of every class.
  pwrprobe1 removed from ps4-shell (can't be loaded again).
  **round2_sweep1** (ps4/plugin/round2_sweep, ps4-shell) replaces it = the ONE read-only menu probe for the sweep (rest mode, wake,
  network-in-rest, timers, Remote Play + log-in/out, users, controllers, PS button). Guards: each table's column count is read from
  Mono's own table header and must match before any row is read (else that part is skipped + logged); method names come from the
  metadata (no class set-up); a breadcrumb file /data/round2/round2_sweep1.step names the step about to run → after any crash we
  know exactly where. Waits for owner "ready" (Kaeden back on the home screen, no game).
  **Owner rule (5:49am): exploratory work = log everything; probe EVERY PS4 (not one per firmware) in a one-time sweep, owner
  turns each on one by one and says which; note each room's quirks.** Only READ-ONLY things go in the sweep; the log-out/lock
  add-on (round2_shell1) acts, so it stays Kaeden-only until the sweep results say it's safe per firmware.
- **5:45am REST/WAKE PROBE BUILT (owner 5:35am: "probe for the network wake and sleep function so that we don't have to use
  remote wake anymore … find out if it works differently for 13.50, 9.00 and 11.00"):** add-on **round2_pwrprobe1** (source
  ps4/plugin/round2_pwrprobe on ps4-helper; .prx on ps4-shell 1952121). READ-ONLY, no class started: lists every SceShellUI
  class/method/enum about rest mode, wake, power, network-in-rest, timers/alarms, Remote Play; every constant from the metadata
  (registry assembly in full); and EVERY system function the menu calls (P/Invoke table, matches marked *). Output
  lib/probe/round2_pwrprobe1-<console>.txt. Same file on each firmware → diff 13.50 / 9.00 / 11.00.
  Found while preparing: the menu's assemblies on disk are encrypted (.dll.sprx), so offline reading isn't possible – the probe
  must run inside the menu on each firmware. Rooms need helper 1.1.110+ for /_shmod (all are older: Vale 1.1.61, Scarlett/Kai/
  Atlas 1.1.68, Bella 1.1.77, Max 1.1.99) → owner OK + room awake + owner watching. NOT run yet: waits for owner "ready" (Kaeden,
  home screen, no game). Run: `ps4look paths:'/_shmod.round2_pwrprobe1', nobusy:1`.
- **5:40am DOCS (owner: "add everything you found to accessible logs … redo on 9.00 and 11.00, rebuild per firmware"):**
  round2-tv-launcher **docs/ps4-shellui.md** (main + ps4-helper; project doc claude/ps4-shellui.md) = how code gets into the menu,
  every function/enum found on Kaeden 13.50, the add-on, and the per-firmware redo checklist (9.00 = Max, Kai, Atlas; 11.00 =
  Scarlett, Vale, Bella). Rule: nothing from Kaeden is assumed on another firmware – probe + test each.
  **docs/ps4-network-and-wake.md** (project doc claude/ps4-network-and-wake.md) = Bella/Atlas: three separate problems from the
  logs – A) Wi-Fi up but no internet (Bella 19 Nov 13:35–15:48; guess IP clash at .6 → new subnet tests it), B) link to the router
  lost on BOTH at once (19 Nov 21:22–21:49) while Kaeden on the same radio and every other room stayed up (guess EasyMesh steering;
  round2-ps4 2.4-only name tests it; 0 failures since the move), C) remote wake – after a long rest the router delivers nothing to
  them, and since the move PS4s on round2 can't reach 192.168.120.x at all, so the engine's wake can't reach them now. Test plan:
  sender inside round2-ps4 (Bella↔Atlas or Kaeden moved over), then router IP+MAC binding (owner OK), else keep-awake on booking days.
- **5:25am MENU ADD-ON BUILT (owner 5:06am: "build the three ideas, before that do the read-only probe"):**
  - Delivery without helper updates: engine live 9450aaf35cac `/ps4/prx?name=round2_*` (key) serves add-ons from branch
    **ps4-shell** (<name>.prx + <name>.json {v, sha256, size}); helper **1.1.109/1.1.110** `/_shmod.<name>` saves it to
    /data/GoldHEN/plugins/ and loads it into SceShellUI (1.1.110 accepts SELF .prx). A module path loads only ONCE per menu start
    → every new add-on build gets a new name (round2_shprobe2, round2_shprobe3, round2_shell1 …). The menu writes only under
    /user/data/… (not /data/…). Kaeden helper updates since the 4:20am restart: 1.1.107, 1.1.108 (other session), 1.1.109, 1.1.110.
  - Probe 1.03 (R2 lib/probe/round2_shprobe3-…txt, every loaded assembly): LoginMgrUtil static SuspendLoginScreen() /
    ResumeLoginScreen() / IsSuspendedLoginScreen() / LogoutAll(LogoutMethodType) / Logout(int user, type, int, int, LogoutParam);
    LogoutMethodType: LogoutFromPsImposeMenu 10, LogoutFromPowerMenuOnFunctionArea 11, LogoutFromPsImposeMenuV400 13;
    PadInternal.Locker(LockType lock, LockType uiMask) (Dispose via DisposableObj) – LockType PSButton 1, Long 2, Double 4,
    Share 8/16/32, All 0xffffffff; PadManager.Instance.m_padInfo[] (PadInfo.m_curGeneralButtons = GamePadButtons: L2 0x1000,
    R2 0x2000, L3 0x4000, R3 0x8000); EventAppExternal/TeamChatExternal Lock…PSButton (instance); power menu
    SystemAreaPowerDialog/PageBase.SelectedLogoutSystem().
  - **round2_shell1 (1.00)** (ps4/plugin/round2_shell): on load a 60-s SELF-TEST (picker paused + PS/Share locked; L2+R2+L3+R3 held
    1 s unlocks early), then WATCH: during member loads (/data/round2/memqn or clean run "prep" running) picker paused + PS/Share
    locked, max 10 min, combo unlocks, released when the load ends; log-out of everyone (type 13) after a load ONLY if
    /data/round2/shell-logout exists (no helper command for it yet). Log /data/round2/round2_shell1.txt. Calls run on the add-on's
    own thread, every menu error caught (no memory patching). Not loaded yet – waits for the owner at Kaeden's TV.
- **4:26am SHELLUI PROBE WORKED (helper 1.1.107 on Kaeden, after the owner's restart):** GoldHEN loads our module into SceShellUI only
  from GoldHEN's own plugin folder (/user/data/GoldHEN/plugins/…; /data = not found, /user/data/round2 = no permission). The menu
  did not crash. Full list: R2 saves/lib/probe/shprobe-73378b38….txt (app.exe = 11,634 types). The useful ones:
  - **Sce.Vsh.ShellUI.LoginMgrUtil** (static helpers): Logout(5 args), LogoutSync(3), SilentLogout(2), **LogoutAll(1)**,
    SignoutSync(1), DisconnectDevice(1), LaunchSwitchUser(1), BackgroundAutoLogin(0), GetFirstForegroundUserId(0),
    **SuspendLoginScreen(0) / ResumeLoginScreen(0) / IsSuspendedLoginScreen(0)** ← could stop the profile picker popping up when a
    controller is switched on during a load (owner's clash worry), UnbindDevice(2), NotifyPadConnectionChange(1).
  - **LoginMgrUtilInternal**: Logout(3), DisconnectAllDevice(1), ArbitrarilyDisconnectDevice(1), DisconnectNotAssignAllDevice(2),
    StartSwitchUser(1), SetForegroundUser(5), GetLoginUserIdList, SetUserName(3), StartLogoutProcess/FinishedLogoutProcess,
    BtDeviceSwitchUser(2), PopToLoginScene(1), CancelLoginFlow(2).
  - Power menu: **TopMenu PageBase.SelectedLogoutSystem(0) / SelectedSwitchUser(0) / SelectedEnterStandby(0)**, LogoutJob.Run().
  - PS button: **EventApp.EventAppExternal.LockShareAndPSButton(0)/UnlockShareAndPSButton(0)**, TeamChat.TeamChatExternal
    LockPSButton(0)/UnlockPSButton(0), PadInternal.PadManager (Instance, ForceIntercept(1), EmulatePSButton, LockTypeChangedAction,
    IsControllerConnected), PSButtonLocker/LongLocker/DoubleLocker classes, PadInfo.GetButtonState(1) (for an unlock combo).
  - NEXT (read-only again): probe v2 = full signatures (parameter types, static or not) of those classes before calling anything;
    then, with the owner watching Kaeden: SuspendLoginScreen + LockShareAndPSButton during a load, LogoutAll / SelectedLogoutSystem
    after it. Helper updates since the restart: 1 (1.1.107) – keep it to ~4 per restart.
- **4:00am SHELLUI PROBE (owner 3:50am "probe the sceShellui and make logs using the helper"):**
  - ShellUI's C# program is encrypted on disk (/system_ex/app/NPXS20001/psm/Application/app.exe.sprx 16.5 MB, Sce.Vsh.*.dll.sprx)
    → names have to be read from inside the running menu. HEN's plugin_mono shows the known names (Sce.Vsh.ShellUI.Settings.Core
    UIManager, Sce.Vsh.ShellUI.TopMenu AreaManager, BootHelper.BootAndAdd …) – no log-out.
  - Built **round2_shprobe.prx** (ps4/plugin/round2_shprobe, GoldHEN plugin SDK + libmonosgen): READ-ONLY – lists every class/method
    of app.exe, platform.dll (+ a few Sce.Vsh libs) whose name mentions logout/login/signin/signout/user-select/switch-user/pad/
    controller/PS button/quick menu/power menu/standby → shprobe.txt, uploaded to R2 saves/lib/probe/shprobe-<console>.txt.
  - Helper 1.1.103–1.1.106: `/_ghver`, `/_shprobe` (refused while a game is open) load it with GoldHEN's SDK call (indirect syscall
    500, cmd 6 = load a module into a running process). Kaeden (GoldHEN on 13.50): version cmd answers -256 (odd) but proc-info
    works ("pid 87 name 'Payload'"). 1.1.105 load: result 0x80020002 = file not found (the menu can't see /data) → 1.1.106 tries
    /data, /user/data, /system_tmp. Also on Kaeden tonight: tile 0.07 installed (task 314), /_copy.all 3 games OK (GTA progress
    → internal → cloud batch), helper 1.1.102→1.1.105.
  - 4:10am: Kaeden took the 1.1.106 update and went SILENT (no check-in 3+ min). Owner asked to look at the TV.
  - 4:15am owner: TV on, still jailbroken, only KAEDEN signed in – so the PS4 isn't frozen; the helper hung in the update switch.
    Most likely the own-program spawn limit: ~8 helper switches on Kaeden since its last restart (1.1.97→…→1.1.106) while
    OWN_SPAWN_MAX = 5 should have refused at 5 → check own-spawns.txt / kern.boottime counting after the restart. Fix: restart Kaeden
    + jailbreak (starter brings the helper back). LESSON: batch helper changes; at most ~4 updates per PS4 start.
- **3:40am RESEARCH (owner OK, nothing changed on any PS4): code inside the PS4's system menu (SceShellUI)** – for a proper log-out
  after a member load (the PS menu's Log Out re-links controllers; our sceUserServiceLogout froze them), a PS-button lock while
  loading + unlock combo (owner idea L2+R2+L3+R3), maybe blocking new controllers.
  - GoldHEN plugins (plugins.ini) load per game title id / [default] for games – no documented ShellUI section.
  - Proven elsewhere: Orbis Toolbox (OSM-Made, open source) is a payload that injects into ShellUI and adds a Settings entry; GoldHEN
    changelog has "fixed Orbis Toolbox support" – but its loader only has patch files for 5.05/6.72/7.02/7.55. Scene-Collective
    ps4-hen (the open-source HEN) has ShellUI plugins (ps4-hen-plugins: plugin_mono = plugin_shellui.prx, calls ShellUI's C#/Mono
    methods like Sce.Vsh.ShellUI.Settings.Core UIManager); its kernel part has offsets incl. 9.04/11.00/13.00/13.50.
  - Neither has a log-out call; the PS menu's log-out lives in ShellUI's C# code (Sce.Vsh.* assemblies in NPXS20001) – not found yet.
  - Possible route without changing the jailbreak: our helper injects a small Round2 module into SceShellUI (like Orbis Toolbox's
    loader), which calls ShellUI's own log-out and filters the PS button. Risk: a mistake hangs the whole screen (restart fixes);
    GoldHEN warns ShellUI mods can crash around rest mode. Per-firmware testing (Max 9.00, others 11.00, Kaeden 13.50). Kaeden first.
  - Next research step (owner to OK): copy ShellUI's program files from Kaeden (read-only) and find the log-out + PS-button code.
- **3:20am helper 1.1.102 (ps4-test; source ps4-helper) – owner 3:15am design:**
  - **SAVE WATCH:** while a game runs, every 15 min the helper compares each save file of that game (every profile:
    /user/home/<u>/savedata/<game>/sdimg_<part>, time + size) with what it was at the last internal copy (new file
    prep/<u>/<game>/<part>/sdimg.mt, written by sv_local_copy). First difference = "changed", checks stop. When the game closes
    (or another game replaces it; the Round2 tile doesn't count): 3 s wait, then every changed part → sv_local_copy (internal copy
    + fingerprints, queued in pending.txt with the member tag) → the cloud batch (Kaeden: on) sends only changed files to the
    crew. Skipped during a clean slate/backup (they copy anyway); never PS Vue, protected house saves, homebrew, the tile. Saves
    are never read while the game is open. Logged "save watch: …".
  - **PLAIN POP-UPS (verbose):** raw save.log lines are no longer echoed as pop-ups (`/_bpop.tech` brings them back,
    `/_bpop.plain` off). New messages: "Cloud -> PS4: downloading <game> for <name> (k of n)…", "PS4 -> profile: <game> is in
    <name>'s profile", "Profile -> PS4: copying <name>'s <game> save to this PS4", "<game>: saved to this PS4, then cleared from
    <name>'s profile", "PS4 -> Round2 cloud: <game> (<name>) uploaded to the crew's account", "Naming the profile '<name>'",
    "Putting the profiles back in order…", "Putting the chosen picture on profile…", "<name> is READY: n games loaded",
    "<game> started – your progress is saved to Round2 when you close the game", "<game> closed – <name>'s progress is saved…".
  - Kaeden is still on 1.1.100 + tile 0.06 (GTA open). A watcher in the control-centre tab sends ps4update (test) → /_tile.now →
    /_copy.all (to catch tonight's GTA progress, which 1.1.100 didn't watch) as soon as GTA closes.
- **3:10am owner bug report → helper 1.1.101 + tile 0.07 + engine 8f82bf6b0943 (27 bindings, 3 timers):**
  1) "profile wasn't in order": the PS4 lists the last signed-in profile first (0x0900, see 1.1.48 /_uorder); the reset puts main
     + Player 1-4 back but a member load didn't. 1.1.101 `keep_order`: after every member-load batch AND once a minute (only when
     out of order; logged "profile order put back") → main, then spares by id.
  2) tile said "all done" between ticked players: the report wasn't sent while the queue moved on (report only every 5 min or at
     the end). 1.1.101 reports after each game of a member load (≥4 s apart) and when a player finishes; report field
     `memq {left, of, now}` (files /data/round2/memq + memqn). Engine: still "loading" while memq.left > 0; tile gets pk/pn/pnow →
     bar label "Aliff Bozz (player 2 of 2) - 0 of 1 games".
  3) tile layout: names went behind the QR → 0.07: character picture removed, text column 130-1070 (title wraps), QR card at
     x 1270. (/ps4/tileart stays in the engine, unused.)
  Both wait on Kaeden: the girlfriend is playing GTA on Kaeden (Karen bozz signed in) – the update is refused while a game is
  open → send ps4update (test) + /_tile.now after she closes it.
  Owner question: does the helper see save changes while a game runs? No – saves are copied only with the game closed (the reset
  closes it first); member saves go back to the crew at the clean slate. Offered: "save to crew when the game closes" (only the
  changed files of that game, e.g. GTA's 1 MB memory.dat).
- **3:00am SESSION CODE ON THE QR (owner 2:51am: guests who scanned could press Load from home after their session):** engine live
  7e0836c9aa97 (27 bindings, 3 timers; Light 15/3/0 before and after). The tile's QR is now book.round2.sg/m?room=<room>&k=<code>;
  kv `tiletok:<ps4 id>` {k, at, until, room}; until = end of the session window covering "now" in kv ps4awake (guest end + 15 min,
  written every 10 min from tonight's calendar – no extra SimplyBook requests), else 30 min (staff test / no booking). The tile
  gets a new code by itself when it runs out. memApi `play` refuses a missing/wrong/expired code ("This code has run out. Scan
  the code on the room's TV again"); a page opened without &k shows "open the Round2 tile and scan its code" instead of the ticks.
  Joining / logging in / editing the crew still works from anywhere. A guest extension makes the code expire at the OLD end
  (+15 min) – they just rescan (could re-check ps4awake on Load later).
- **2:50am names didn't change (owner):** his Load (Karen + Aliff, 2:40 and again 2:43) loaded fine (GTA → 16c45cc7 in 4–8 s,
  Vampire Survivors → 16c45cc8, 0 failed) but Player 1/2 were SIGNED IN, so no rename and no picture (our own "never rename a
  signed-in profile" rule). Helper **1.1.100** (ps4-test sha 9bd2f6cf…, on Kaeden): `/_rename.<user>.<Name>` (works on signed-in
  spares too, reads back), `/_renamesi.on|off` = member loads rename signed-in spares (OFF until the signed-in test passes). After
  he logged them out: /_rename → "Karen bozz", "Aliff Bozz" (rc 0). Verbose pop-ups were OFF on Kaeden → `/_bpop.on` again
  (find out what switched them off). NEXT: sign in a spare, /_rename it, see if the PS4 shows the new name → then /_renamesi.on.
- **2:45am Round2 TILE 0.06 (owner 2:33am: "tile also show a similar theme, also needs loading bars … feedback to guests"):**
  engine live 3abf38a5ab8f (27 bindings, 3 timers): /ps4/tile adds `color` (hex, no #), `rname`, and `done`/`total` while
  loading/reset; `/ps4/tileart?room=` = the room character as a 480x640 PNG (Wix /v1/fill → R2 saves/lib/tileart/<room>-480.png;
  no decoding in the worker – free-plan CPU). Tile 0.06 (ps4-tile sha 193d8fac…, source ps4/tile on ps4-helper, stb_image PNG
  decode): room-colour glow + top bar, room name in Press Start 2P, character on the right fading left/bottom, QR card with a
  pulsing room-colour frame when idle; while loading/reset an animated bar (n of m games, %, shimmer, eased) or a sliding bar
  while it waits for the count; "All set" green bar when done. Composed once into BASE, each frame copies it + draws the moving
  parts. Installed on Kaeden via /_tile.now (task 310). NOT yet seen on the TV – owner to check. Kaeden helper is 1.1.98 (1.1.99
  only adds the tile switch).
- **2:25am member page themed per room (owner: "more to our theme … scanning on kaeden opens a kaeden themed page"):** engine
  live ce4f9ab53c9c (27 bindings, 3 timers, Light 14/4/0 before). `?room=<room>` (max → maximillion) → Round2 logo, room name
  big in Press Start 2P in the room colour, the room's character (same Wix images + colours as the TV home screens, MEM_ROOMS),
  room-colour glow, cards/buttons/picker in the room colour. No room = Round2 yellow. Bella/Atlas put to rest (owner).
  Max detector test pop-ups OFF (owner; detector itself stays on) – Max was asleep ("isn't answering"): send
  `/_inplug.pop.off` to Max next time it's awake.
- **2:05am DONE – Max:** GTA closed by owner → `/_sback` SAVEDATAPROFILE (6 files, 165,043 B, 0 failed, stamp 1795111178)
  + sce_sdmemory (6 files, 1,212,307 B, 0 failed, 1795111242) from Max main 14a1e943 → copied via the R2 API into
  members/m7xbafbe3/p1/CUSA00419/<save>/<stamp>/ (14 objects) + p1/index.txt (2 lines, no dsha). Then Max updated
  1.1.68 → **1.1.99** (owner OK; ps4-test sha 091766f8…). **1.1.99 = 1.1.98 + the tile only installs where switched on**
  (`/_tile.on`, or already installed = Kaeden; `/_tile.off`) – owner: Max gets the fixes/functions, not the test bench (no tile;
  verbose pop-ups stay off – they need /data/round2/popups-verbose). Max /_tile.now → "switched off"; then `/_rest` → rest mode.
  Max's detector test pop-ups (inplug) were ON from earlier – left as they were.
- **2:05am Bella/Atlas on round2-ps4 (read from their logs):** both on round2-ps4, channel 6, same access point
  de:ba:bd:28:65:60, signal 82 %, IPs .120.2/.120.3, DNS 127.0.0.1. net-fail.log: last failures were during the move (Bella
  23:12, Atlas 23:20) – **none since** (~2 h 45 min). Hourly "helper running" lines every hour on both; no restarts since
  (Bella helper up since 17:41, Atlas since 23:21). Max (old network "round2") is on channel 36.
- **1:51am owner: park Max's GTA V save under Karen** (crew ROUND2_ m7xbafbe3, player p1 "Karen bozz"). Max main = 14a1e943,
  GTA V = CUSA00419, saves SAVEDATAPROFILE + sce_sdmemory (+ sce_bu_sce_sdmemory), GTA was RUNNING (sdmemory written
  1:51am) → needs a save + close first, then /_sback and copy into members/m7xbafbe3/p1 like Vampire Survivors (12:20am).
- **1:31am owner:** trophy pop-ups switched off by hand on every Kaeden profile (stays through clean slates). He found PS menu
  "Log Out" re-links the controller (PS4 hands it back) while our raw sceUserServiceLogout leaves it stuck. LATER (his OK):
  test renaming a SIGNED-IN spare (never tried, only our own safety rule) – if it works the reset never signs anyone out;
  else leave signed-in spares' names alone. Now his girlfriend takes over prompting: UI of the PS4 tile + member page, with
  the avatar changer in mind – default pictures picked at the phone join step so loaded profiles look personal.
- **1:30am helper 1.1.97 (ps4-test, sha 4bb56388…) on Kaeden:** ticked players fill Player 1.. in order (only Aliff ticked →
  Player 1), main → main; Load links main + every spare (spares nobody was loaded into → extra crew slots x<k>, so a +1's play
  never overwrites a crew player). Before it the owner's Load on 1.1.96 worked (Karen bozz / Aliff Bozz, 0 failed). Reset
  kaedentest3: 1 game, 0 failed, 2 signed out (room reset still signs out signed-in spares to rename them). `/_regscan.<u>`
  is useless as written (sceRegMgrGetInt answers 0 for every offset) – trophy pop-up setting not found yet; it is per
  profile and survives clean slates, so setting it once by hand per profile works meanwhile.
- **Kaeden back to normal 9:43–9:55pm:** spares renamed User1–3 (ps4prof name), test member's 3 games cleaned out of User3,
  `/_restoreall` from day0: 35 games, 28 in, 7 = games no longer installed on Kaeden (CUSA00419, 02671, 05070, 06400, 09973,
  13795, 29291 – kept in the cloud). 247 s (a 32 MB save took 37 s). Verbose pop-ups + test flags still ON.
- **Bella/Atlas Wi-Fi:** research says old PS4 Wi-Fi goes "connected but dead" on busy mesh/combined networks; fix to try =
  a separate normal SSID (NOT the guest network – isolation would break PS4-to-PS4 wake), 2.4 GHz only, WPA2, visible name.
  Saving blips all Wi-Fi ~10–60 s (mesh + Tapo cameras 1–2 min) → scheduled 10:35pm after Vale (reminder set). Never LAN.

> ## 20 Nov 2026, ~5:50pm – reanne moved Bella → Max got NO wrap messages (live sha 90e5e4f7cbdb, 27 bindings, 3 timers)
> - Records: reanne b3286 now Max 2:15–5:15pm. Her Auto messages R29E16D8 (10-min) / R2DB051A (wrap) were MOVED to Max 5:05/5:15
>   and CANCELLED in the same minute (1:30pm). Cause: on a SimplyBook change the engine ran autoRun and msgOrphans AT THE SAME
>   TIME (two ctx.waitUntil; the 10-min cron did the same with two go()). The orphan sweep read the queue while the codes still
>   said Bella 4:20/4:30, found no Bella session ending 4:30 any more, and cancelled them – after autoRun had moved them to Max.
>   autoRun then saw its rows "already right" (same code/time/room) and never noticed the cancel.
> - Fix: msgOrphans skips Auto's own codes (autoRun owns them: moves/cancels with the session), and both places run autoRun
>   THEN msgOrphans. autoRun also logs (autoLast.problems) any own message still to come that's no longer in the TV queue
>   (not re-made: staff may have cancelled it on purpose).
> - Next deploy starts from live 886e57b4541f (msglog now also returns helper.json).

> ## 20 Nov 2026, ~5:25pm – Max "That's a wrap!" (live sha 152f1ec4298b, 27 bindings, 3 timers)
> - Records (tvmsgs): 5-min reminder w5mwlpir6p OK'd 1:58:56pm; wrap qr2f7673c-1120101826 shown 1:59:59pm, never OK'd, cut-off 2:15.
>   Owner: wrap showed as the small banner on the PS4 input; Home took him to the menu with no big banner. Cause (code): Sony
>   never pauses the menu for HDMI, so Home = onNewIntent and FoodAlerts.menuInFront (onResume only) never swapped the banner.
>   Fix in TV app 1.0.287 (round2-tv-launcher): onNewIntent with Home → menuInFront("home"); plus the TV's own msgLog.
> - Engine: new staff/diag action `msglog` (room) reads /r2/<key>/<room>/msgLog (one outside request). Note: diag `insess`
>   together with `tvmsgs` hit "Too many subrequests" – ask for them in separate diag runs.
> - (superseded: next deploy starts from live 90e5e4f7cbdb, see above)

> ## 20 Nov 2026, ~8:25am – widgets: MONEY, TOMORROW, HEALTH LIGHT, LOCK-SCREEN COUNTDOWN (live sha ba770ff14696, 27 bindings, 3 timers)
> - **Live at 8:07am was bb4183f6f062 = my 2ccdc79b96d1 + the other chat's member-tile changes (`roomout`, `memplay.until/out/fin`,
>   `ps4busy:<id>`) – STILL NOT IN GIT.** My change went on by exact string anchors (live → 28dbab07cb0e → fcc436558c65 → ba770ff14696 (health: TV quiet only for rooms with guests in or due)). Git main
>   = my parts only. Whoever commits the PS4/member work: rebase onto this commit; the next deploy starts from live 9c1e65baf864 (see below).
> - Note: `GET …/workers/scripts/round2-book/content/v2` now answers 404 "no versions" – read live with the plain
>   `GET …/workers/scripts/round2-book` (multipart; text after the first blank line, up to the last `\r\n--`).
> - `widgetDay` (side timer, minute %10 = 1): ONE kvMany of `alog`, `human`, `cronNet`, `sbn:<day>` → kv `wday` {money: bookings made
>   since 7am from the "New booking" alerts (paid / NOT PAID / price list, cancelled), "needs a human" not sorted, each timer's last
>   run, SimplyBook count}. No SimplyBook or outside requests. `/w` adds `money`, `health` {lv 0 green / 1 orange / 2 red, list}
>   and `tomorrow` {over = nobody in/cleaning and nothing more before 7am – late-night bookings count as tonight; n, first, rooms,
>   last, list}. Diag: `diag:req` [{action:'widget'}] → what the phone gets.
> - 8:30am (live 9c1e65baf864): wsum.ms keeps each message's `id` + `ak` (needs an OK); `/w` reads `acks` in the same kvMany and gives
>   each room's messages from 15 min back with `ok` (time of the TV's OK) – widget splits AUTO (wrapup/timeup) from SCHEDULED, coloured
>   coming / on TV waiting for OK / OK'd. Next deploy starts from live 152f1ec4298b (see above).
> - Widget script: parameters `money`, `health`, `tomorrow`, `count`, `rooms`; header health dot on every home widget; board
>   switches to TOMORROW by itself once tonight is over; round lock widget = live countdown to the next room out (old one = `rooms`).

> ## 20 Nov 2026, ~7:50am – engine 5081f4c DEPLOYED ON TOP OF the other chat's live ps4Alive (live sha 2ccdc79b96d1)
> - Widgets now carry, per room: `tv` {app (wApp: Round2 menu / Netflix / YouTube / PS4 / HDMI …), off, at, quiet}, `ps4` {on, g =
>   runName}, `msgs` (next 3 approved TV messages, from the cached __LIST__ copied by widgetSnap into wsum.ms); plus `events`
>   (tonight's starts/ends). Side timer: `wtv` now keeps front/frontAt; new `wps4` (ps4map + one kvMany of ps4:<id>, every 5 min).
> - **Live was 09acc25d02fa = 5c5cc04 + `ps4Alive` (/ps4 alive check-in, helper 1.1.112) NOT YET COMMITTED by the other chat.** My
>   change was applied onto that live text by exact string anchors, so live = git 5081f4c + ps4Alive. Whoever commits ps4Alive:
>   rebase on 5081f4c; the next deploy must start from live 2ccdc79b96d1.
> - Widget script: views via Parameter (`tv`, `msgs`, `times`, `room:Kai`, `nonames`), every room in its colour.

> ## 20 Nov 2026, 7:16am – engine 5c5cc04 DEPLOYED (27 bindings, 3 timers): iPHONE WIDGETS
> - Owner: "useful iOS lock screen and home screen widgets" → Scriptable app. Engine: `GET /w?k=<key>` (`widgetApi`, ONE `kvMany`:
>   wkey, wsum, wtv) works out each room's state at ask time (in till / cleaning till / next / free / Kaeden closed), turnover
>   `gap`, counts, next start / next end, warnings (TV of a room with guests or due in 45 min not reporting 20 min; copy > 25 min
>   old). `wsum` = `widgetSnap` on the now timer's 10-minute tick from the SAME `sessDay` reads (env.__tick) – no extra SimplyBook
>   requests; `wtv` = side timer every 10 min (minute %10 = 1), 7 Firebase helper.json reads. Staff gm `widgetkey` (reset=1 → new key).
> - Control centre: Tests & systems › Phone alerts & widgets › "Copy widget script" (fills `__KEY__`/`__URL__` into
>   manager/widget/round2-widget.js). System check step "Phone widgets" (Light + Full). One-off `oneoffMid` removed.
> - Not seen on a real iPhone yet (Claude can't run Scriptable) – owner to install and report.

> ## ⭐ 19 Nov 2026, 7:50pm – STATE OF EVERYTHING (PS4 side) – READ THIS FIRST, then the dated entries below
> **Owner rules today:** reply in categories (headings per topic: Bella / Kaeden backup / Kaeden speed …) and in very simple
> words (ELI5, no word vomit). **Update this HANDOFF regularly** (owner: "you don't regularly update the handoff, that's why
> you get confused"). **Kaeden = test bench: it gets every fix the rooms have – build on, never omit.** Check a PS4 is really
> asleep before saying so (`/_ddp.<ip>` from another PS4: 200 Ok = on, 620 = standby). Don't call a silence a "network drop"
> without reading the PS4's logs (report `log.netfail` / `log.slow` / `log.boot`).
>
> **Engine** live sha **a971f3c8057e** (repo round2sg-home main; 27 bindings, 3 timers). Today: booking keep-awake v2 (a PS4 that
> is ON stays awake from **2 h before** a real guest session to **guest end + 15 min**; next booking > 2 h away or none → its own
> power-save rules; back-to-back windows chain) · test channel (`ps4update ch:'test'` → branch ps4-test, one PS4) ·
> **`/ps4/sgetm`** (POST {k:[≤40 keys]}, ≤8 MB → "R2M n\n" + per key "len\n"+bytes; R2 reads only, no DO calls).
> Light check before/after each deploy: 14–15 passed / 3–4 to look at / 0 failed (known items: watchdog lines, Kaeden TV,
> clean-slate problem line, + any guest /checkout SimplyBook request during the run).
>
> **PS4 helpers (19 Nov 7:50pm):**
> | PS4 | FW | helper | mode | notes |
> |---|---|---|---|---|
> | Max | 9.00 | 1.1.68 | own | auto reset ON (Max only), detector (SF6) + test pop-ups ON |
> | Kai | 9.00 | 1.1.68 | own | |
> | Scarlett | 11.00 | 1.1.68 | own | |
> | Atlas | 9.00 | 1.1.68 | own | 2.4 GHz; remote wake unreliable |
> | Vale | 11.00 | 1.1.61 | own | |
> | **Bella** | 11.00 | **1.1.77 (test)** since 17:41 | own | `/_keepawake.500` (to ~2am); 0 net failures since |
> | **Kaeden** | **13.50** | 1.1.82 → **1.1.83 sent 19:47** | shared → own? | TEST BENCH, owner re-jailbroke 19:4x |
> Release branch **ps4-release = 1.1.68** (9481fa1). Test branch **ps4-test = 1.1.83** (sha fbc0eb00…). ⚠️ `ps4update ch:'test'`
> hands ANY PS4 the ps4-test head. **Roll-out of the test line to the rooms = owner's OK still pending** (asked 6:40pm).
>
> **Helper test line (branch ps4-helper), what each adds:**
> 1.1.69 in-memory timings (`tm` in report, look `/_timing`) · **1.1.70 watchdog no longer counts rest-mode sleep as a freeze**
> (the running clock DOES run in rest; an own-program helper restarted itself on every wake after 20+ min rest – Bella 13:21) ·
> 1.1.71 slim 2.47→1.95 MB (gc-sections, no unwind tables, test payload removed), **TLS session resumption** (handshake 127→15
> ms, ~7×), where.txt only for steps ≥10 s (−8,600 disk writes/day), check-in timing split · 1.1.72 **network path check** on
> the 3rd and every 10th failure (router :80, 1.1.1.1:443, engine IP:443 → net-fail.log + pop-up) · 1.1.73 hello only after the
> first report (crash in first connection → starter rolls back) · 1.1.74 `/_copy.all` (internal copy only), `/_copycheck`,
> keep-awake survives restarts (keepawake.txt) · 1.1.75 **verbose test-bench pop-ups** `/_bpop.on|off` (queued, 1 per 3 s) ·
> 1.1.76 progress pop-ups (restore point / copy / clean / cloud) · 1.1.77 `/_restoreall` (download test) · **1.1.78 SAFER
> RESTORE** (download + check every file to prep first, only then clear + fill the save), uploaded.txt/cloud.txt kept on re-copy
> (no re-upload of unchanged saves – PROVEN: 69 'unchanged'), restore writes cloud-manifest.txt (it used to overwrite prep
> manifest.txt), **profiles signed out + main signed back in after clean/reset/purge** (proven 17:50) · 1.1.79 fast crypto
> (AES-NI + asm) = **NO GAIN, not used** (time is network) · 1.1.80 make-part timings · **1.1.81 bundled downloads** via
> /ps4/sgetm (labels + small files, 32 files/6 MB a request; manifest cached 2 min) · 1.1.82 `/_prepmember.<target>.<source>.<Name>`
> (member prep stage 1) · **1.1.83 own-program mode allowed on 13.50** (SDK has offsets; I had wrongly kept it 9.00/11.00 only →
> Kaeden piled up ~14 helpers in GoldHEN's shared program → files couldn't be opened → 19:25 clean slate "15 failed", nothing
> removed) + member prep may target the main profile.
>
> **Kaeden results today:** day0 restore point 81 parts 137 MB 0 failed · copy 79 parts 129 MB · copycheck 79 same (2 homebrew
> skipped by design) · cloud batch 79/79 · sleep 4:32 + wake: restore point carried on ✅.
> **Member download test (clean slate → every game back from the cloud), 28 of 35 games (7 = game not installed on Kaeden):**
> 297 s (8.5 s/game, 1.1.77) → 225 s (safer, 1.1.78) → 222 s (1.1.80) → **99 s (2.8 s/game, 1.1.81 bundles)**.
> Making one save part (1.1.80 timings, 69 parts): labels from cloud 1.30 s (77%) · key 0.004 · image 0.20 · open+labels 0.17 ·
> save list 0.02. After bundles: labels ~0.6 s. Download ~1.3 MB/s (32 MB save = 25 s) – parallel pieces = next idea.
>
> **Bella findings:** two different silences today. 13:34–15:48 = **114 failed connects** (helper running, LAN fine, DDP 200 Ok)
> – the open mystery, 1.1.72+ path check will name the broken hop next time. 15:58–17:37 = **rest mode** (slow.log: 'guard' wall
> 0 s / running clock 5952 s; no failures) – guests' TV off; owner's 17:37 button press woke it (not a restart).
>
> **Owner decisions today (19 Nov):**
> - Morning wake: the FIRST PS4 staff switch on (any room, 9–11am) wakes the rooms with **early-bird bookings**; later rooms are
>   woken **40 min before** their booking if the room was empty, by any awake PS4; no awake sender → staff phone alert. NOT BUILT.
> - Members (supersedes "staff press load member"): saves belong to the MEMBER. Morning SimplyBook check + after EVERY clean slate
>   → the day's members' saves downloaded to the room PS4's own storage early → loaded **right after the previous guest's clean
>   slate** into the profiles where they played (**main profile progress → room main profile**, others → spares renamed to their
>   names). Trial (taster) guests same flow. A +1 friend who is a member logs in via the **Round2 PS4 app** (QR or phone number).
> - **GT Sport (Max main): never touched at all, NOT part of member saves** – a free-for-all house save (everything unlocked).
> - Round2 PS4 app = **fPKG**, thin: opens a Round2 login page (QR + phone); page lives on the website (updates without reinstall).
>   Put the .pkg where GoldHEN's package installer reads it on the internal drive; **owner installs it**. Own tile; after every clean
>   slate the helper opens it once so it's the first tile (replacing PS Store / What's New = risky shell hacks, not doing).
> - Fast crypto: not used. Keep-awake v2 as above. Remote wake on Bella/Atlas: LAN cable idea; Kaeden (2.4 GHz) wakes fine
>   (8 min, 13.5 min, 1 h).
> - Clean slate on Kaeden is allowed for every test run (owner 5:20pm/5:25pm).
>
> **Kaeden state right now:** saves back in all 4 profiles from the 19:11 restore (28 games; 7 games' saves only in the cloud –
> not installed); cloud batch ON (idle); keep-awake + verbose pop-ups ON (files survive restart); User1 not renamed (19:25
> /_prepmember failed before renaming). Restore point stamp 1795077112 (label day0).
>
> **Gotchas:** one special `/_` path per look job (`|` is a parameter, not a separator) · `/_tail` only .txt/.log in Round2 /
> nanoDNS / GoldHEN folders, max ~80 lines · report every 15 min (5 min during jobs) – use `/_timing` / `/_cloud.state` for now
> values · look jobs refused while a room is in session (engine `ps4wake` is nobusy) · **`ps4wakekey` with an id and no key
> DELETES that PS4's wake key** · Cloudflare classifier blocks destructive looks (clean slate) unless the owner's OK is explicit.
>
> **20:21 STAGE 2 PROVEN on Kaeden (helper 1.1.84, ps4-test ddec4952…, own program):** `/_memtag.16c45cc7.test-member.main` →
> clean slate (19 games, 0 failed; tags cleared after) → cloud batch sent User1's parts to `members/test-member/main/<game>/<part>/<time>`
> + `members/test-member/main/index.txt` → `/_memload.16c45cc9.test-member.main.Test_Member` → **3 games, 0 failed, 42 s** into User3
> (renamed 'Test Member'). Many-part games are the slow ones (CUSA11379: 12 parts, 31.6 s, making parts 16.3 s) → next speed-up:
> one manifest+labels bundle per GAME instead of per part. Kaeden profiles now: main/User1/User2 EMPTY (saves in cloud: day0 +
> cloud copy), User3 = 'Test Member' with test-member's 3 games → put back later with /_prepmember per profile (+ rename User3).
> Bella (1.1.77) silent since 18:55 but ON + on LAN (DDP 200 at 20:10) = can't reach internet again; Atlas (1.1.68) silent since 18:28,
> ON per owner but NO DDP answer = off the Wi-Fi. Suspect IP clash at .6/.15 – asked owner: Bella Test Internet Connection + router list.
>
> **20:36 PER-GAME PREFETCH A/B (helper 1.1.85, `/_pf.on|off`):** member load of test-member (3 games, 14 parts) into User3 after a
> clean slate: prefetch OFF 36 s → **ON 28 s**; the 12-part game CUSA11379 31.6 s (20:20 run) → **18.7 s** (making parts 16.3 → 6.6 s,
> 83 answers from the prefetch). Left: big multi-piece files still come piece by piece (CUSA20499 8 MB ≈ 5–6 s) → bundle pieces too.
> Found: a member moved to a NEW profile re-uploads once (no uploaded.txt in that profile's prep folder) – compare against the member
> index instead (todo). Prefetch left ON on Kaeden.
>
> **21:07 TWO MORE FIXES A/B (helper 1.1.86, ps4-test 1407ea64…):** (1) big files' 1 MB pieces in bundles of 6 (`/_bb.on|off`):
> member load 3 games 30 s → **23 s**, 8 MB game 8.7 → 5.6 s (download 7.1 → 4.0 s). (2) member index carries a DATA fingerprint per
> part (manifest lines outside sce_sys/), cloud batch skips parts the member already has even from another profile (`/_mi.on|off`):
> load into a new profile + clean slate → OFF: **13 of 14 parts re-uploaded**; ON: **0 re-uploaded, 14 'unchanged'**. All flags ON
> on Kaeden (pf, bb, mi). Own-program switches since Kaeden's restart: 4 of 5 (next update may wait for a restart). Kaeden profiles
> now: main EMPTY, User1 'Test Member3' EMPTY, User2 'Test Member2' EMPTY, User3 'Test Member' (test-member's 3 games) – restore +
> rename back to User1–3 when testing ends.
>
> **NEXT (in order):** (1) Kaeden on 1.1.83 → confirm own-program mode (report `own:1`) → member prep test (clean slate, then
> `/_prepmember.16c45cc6.16c45cc6.x` into main + a spare) → put Kaeden's saves back. (2) Stage 2: member cloud folders (session
> end → member's folder; skip GT Sport). (3) Stage 3: morning + after-clean-slate prep from SimplyBook (needs: how a booking is
> known to be a member – owner to decide). (4) Round2 PS4 app (fPKG). (5) Morning wake build. (6) Roll-out of the test line to
> the rooms (owner OK). Smaller: parallel big-file downloads; clean slate should never leave the main profile empty of the
> room's house saves; tidy cloud-format manifest handling.

> ## 18 Nov 2026, 7:30pm – CONTROLLER DETECTOR (round2_input GoldHEN plugin) – WORKS ON MAX (SF6), engine f6e5401 DEPLOYED (27 bindings, 3 timers)
> - **What:** the reset countdown asks "is anyone still playing?" without the helper touching the controller (1.1.58 froze Max
>   doing that). A GoldHEN plugin `round2_input.prx` loads INTO the game (plugins.ini), watch-only hook on the game's own
>   scePadRead/ReadState (gamepad_helper method). **Asleep by default (owner 6:01pm)** – only watches while
>   `/data/round2/input/arm` holds a future time (helper writes it when a countdown starts, deletes it when it ends; max 2 h ahead,
>   runs out by itself). Awake: writes `/data/round2/input/last` = `r2in 1 <last_press> <now> <title> <pid> <reads> <active>`.
>   Helper 1.1.62+ only READS that file (fresh <20 s + same title as the open game, else "not readable" = timer only, as before).
> - **Code:** round2-tv-launcher `ps4/plugin/` (source, `build.sh`, README; Makefile + pad.h from GoldHEN_Plugins_Repository, GPL-3.0)
>   + helper `ps4/helper/main.c` (search 1.1.62–1.1.67). Release branch `ps4-release` now also carries `round2_input.prx` +
>   `round2_input.json`; engine `/ps4/plugin` (POST, x-r2-ps4) serves it from the same commit, SHA-256 + size checked.
> - **Helper jobs:** `/_inplug.status | .get.<sha256> | .on.<CUSA12345|default> | .off | .noaio | .pop.on | .pop.off`,
>   `/_klog.<secs>` (system log via GoldHEN log server :3232 – keys `tail/klog NN` keep 300 chars), `/_input.<secs>` works again
>   (wakes the plugin for the test). plugins.ini edits: whole file ≤32 KB or refused, backup `/data/round2/plugins.ini.orig` (first
>   original, kept for good) + `.prev`, temp+rename, idempotent (tested on the build machine incl. CRLF/oversize/empty).
> - **Bugs found on the way:** (1) GoldHEN **Plugins Loader was OFF on Max** – owner ticked it in GoldHEN › Plugin Settings (only
>   that box; AIO Fix / Game Patch stay unticked). The old `aio_fix_505.prx` line in [default] was commented out (`/_inplug.noaio`,
>   owner OK) – it is only for 5.05. (2) Read-back check off-by-one (1.1.63). (3) Folder 0755 → games (other user) can't write: made
>   0777 (1.1.65). (4) **rtld `VOP_ACCESS() error`** in the system log: the .prx must be executable – helper chmods 0755 (1.1.67).
> - **Tests on Max (owner present, SF6 = CUSA31498):** loaded ✅ game normal ✅; `/_input.20` playing = 20/20 s ✅, hands off = 0/20
>   ✅ (10,600 pad reads); countdown 3 min: woke, saw play, moved the reset ✅ (held at the end by the engine's auto-reset switch);
>   countdown 1 min `max-test` → engine OK → **SF6 closed + clean slate 7:26pm** ✅, detector back to sleep ✅.
> - **Engine:** `/ps4/plugin`; `PS4_AUTO_HOLD_ABOVE = '1.1.61'` – quiet-time updates do NOT hand out newer helpers (owner: Max only
>   until the test passed; staff Update now works) – **set it to the new version (or '') when the owner OKs the roll-out**;
>   `/ps4/resetok` lets a label `<room>-test` through with automatic reset off (SimplyBook room-free check still applies).
> - **State now:** Max 1.1.67, detector ON for CUSA31498 only, **test pop-ups ON** (`/data/round2/input/popups`; turn off with
>   `/_inplug.pop.off` when the owner says). Other 5 PS4s 1.1.61, no plugin. Own-program switches since Max's last restart: 3 of 5.
> - **7:51pm (owner):** automatic reset ON for **Max only**, 7 min after guest end (staff tidying may add +2 min → ~9 min).
>   New `ps4resetAuto.rooms` (engine dd034a6): `ps4resetauto` with `rooms='max'`; **to turn on for all rooms send `rooms=''`** – the
>   control centre's on/off toggle does NOT send rooms, so it keeps "Max only" until cleared. Bella + Atlas direct test from Max
>   7:52pm: both answered (2.4 GHz, 94/98%).
> - **Owner decisions 8:15pm (member saves, for the morning routine):** (1) **staff get memberships labelled "staff"** – play in
>   any room in their own time (also during opening hours); their play is NOT wiped but backed up like a member's = daily live test
>   of backup/restore. (2) Members always start from a clean slate; a room's PS4 takes ~5–6 bookings a day → size the storage
>   budget for that. (3) **Non-member saves: uploaded ONLY if the guest opts in to the one-time membership trial (taster); no opt-in
>   = deleted at the clean slate, not parked.** Morning routine proposed: first boot after 7am → clean-slate check (dirty = run
>   it if no session within 15 min) → room's day plan from the engine (ends with a free slot after = watch for extensions; back-
>   to-back = reset firmly) → stage today's members' saves → drop yesterday's staged copies not needed today (cloud = master).
> - **11:29–11:50pm REST-MODE Wi-Fi TEST (owner asked; Bella + Atlas rested remotely, Kai as control):**
>   Wi-Fi modules (from MAC prefixes): Bella CUH-7218B **AzureWave** 28:66:E3:C4:AC:D3 · Atlas CUH-7208B **Hon Hai** DC:A2:66:E4:EB:E1 ·
>   Vale CUH-2006A AzureWave 5C:96:56 · Max CUH-7006B Hon Hai A8:6B:AD · Kai CUH-7016B Hon Hai 90:CD:B6 · Scarlett CUH-1006A Liteon B0:05:94.
>   Router (main): DTIM 1, beacon 100, airtime fairness off, 802.11r off – already the best case for sleepers.
>   Result: both Bella and Atlas leave the router ~40 s after rest and **re-join it ~2 min later (2.4 GHz ch6, −71/−72 dBm)** – the
>   Wi-Fi stays on in rest. But for 20 min neither answered a single direct or broadcast ping, and the router's "sent packets" to
>   them stayed frozen (Bella 19→20, Atlas 11) while their own "received" kept rising (keep-alives). **Control: Kai (5 GHz, Hon Hai)
>   answered "620 Standby" 2.5 min after rest; woken via Vale's broadcast at 11:47pm, back at 11:48:58** – method works.
>   So: on 2.4 GHz in rest, Bella/Atlas stay associated but the router delivers nothing to them (power-save buffering). Atlas did
>   answer once at 10:38pm (after 80 min asleep via TV-off) → not never, but unreliable. **Wake keys:** engine holds keys for
>   Kai, Vale, Scarlett, Max only – Atlas and Bella had none because **Claude deleted them at ~11:28pm**: staff `ps4wakekey` with
>   an id and NO key DELETES that PS4's key (it is "set / clear", not "look up"). ⚠️ Never call `ps4wakekey` without `key` – to
>   list keys use `ps4list` (wake field). **Restored 11:57pm from the 16 Nov notes** (Atlas 357299b3 / mac 2ccc441e241f / acct
>   52326d61696e3031; Bella c203a687 / 78c8810636c1 / 284561706f6c6c6f) – all 6 keys back, no re-registering needed.
>   Wake via Vale's broadcast: **Atlas did NOT wake (11:57pm and 11:59pm, as on 16 Nov)**; Bella not tested – owner switched it on
>   by hand at 11:57pm. Atlas left asleep (no session). Next: rest Bella → wake test; if neither 2.4 GHz PS4 wakes = LAN cable.
>   **12:04–12:15am wake test (owner):** both rested remotely (Bella 12:04:35, Atlas 12:05:24); `ps4wake all` 12:08:39 (sender Vale)
>   → **ATLAS WOKE (checked in 12:09:44) – first remote wake of Atlas ever.** Bella did not: 4 tries (Vale broadcast ×2, Kai
>   broadcast + direct to .6, 12:08–12:13) – **Bella has never woken remotely (16 Nov 9:46pm also failed)**. Pattern to check:
>   Atlas failed at 11:57/11:59pm after ~28 min asleep but woke 3 min after rest → may only hear wakes early in rest; a morning
>   wake comes after hours asleep. Bella left asleep (staff press the button).
>   **12:39–12:46am BELLA RE-REGISTERED → WAKES.** Owner's Add Device number 95234994; Bella registered with itself
>   (`/_rpreg.192.168.88.6.284561706f6c6c6f.95234994`) → "0 registered", **same key c203… as 16 Nov** (the PS4 gives the same key
>   to the same profile). Rested 12:41:07, `ps4wake` 12:44:11 (Vale) → **Bella woke ~12:44:30** (helper back, nobody signed in =
>   network wake). So the key was right; Bella's own registered-device entry must have been gone (likely lost since 16 Nov) –
>   re-registering put it back. If a registered PS4 stops waking: re-register first (same key comes back, nothing else changes).
>   Still to test: Atlas/Bella wake after a LONG sleep (Atlas failed after ~28 min, woke after 3 min) – morning wakes need that.
>   **12:52am Atlas re-registered** (number 44989015) → same key 3572… back. Wake tests after: Atlas rested 12:54:42 → wake from
>   MAX 12:58 ✗, from SCARLETT 1:00 (broadcast + direct .15) ✗. Tonight's only successes on the 2.4 GHz PS4s were sent by VALE
>   ~3 min after rest (Atlas 12:08, Bella 12:44); every other sender/timing failed. Not enough tries to say sender vs timing –
>   **owner: don't touch Vale tonight (sleeping there); ask before any overnight test.** 1:03am all rested except Vale.
> - **19 Nov 6:05pm KAEDEN TEST BENCH – backup + download tests (helper test line 1.1.73→1.1.78, ps4-test bec9ed3+).**
  New looks: `/_copy.all` (internal copy only, nothing removed), `/_copycheck` (internal vs restore point, files+bytes),
  `/_restoreall` (every restore-point game /_gmove'd back into its profile, timed), `/_bpop.on|off` (verbose pop-ups, test bench
  only), keep-awake survives restarts (keepawake.txt). Kaeden: day0 restore point 81 parts 137 MB 0 failed; copy 79 parts
  129 MB, copycheck 79 same (2 homebrew skipped); cloud batch 79/79. Clean slate (owner OK 5:25pm) → restore test BEFORE
  (1.1.77): 28 of 35 games in 297 s (8.5 s/game; 7 refused – game not installed on Kaeden, saves safe in cloud); time is mostly
  MAKING SAVE PARTS (2–7 s, up to 21 s), download ~1.3 MB/s (32 MB save = 25 s), into profile 0.1–2 s. 1.1.78: SAFER RESTORE
  (download+check every file to prep first, only then clear+fill the save), uploaded.txt/cloud.txt kept on re-copy (bug: 1.1.77
  re-sent 16 unchanged parts after a clean slate), restore writes cloud-manifest.txt (it overwrote prep manifest.txt – would have
  made the cloud batch think the copy was damaged), clean/reset/purge end with sign out all + main signed back in (Kaeden 17:50:
  ok). AFTER run (1.1.78): 28 of 35 in 225 s (6.4 s/game). Kaeden cloud batch OFF (127 waiting – most legitimately re-sent once
  because 1.1.77 wiped their uploaded.txt); skip-unchanged still to be proven: let it finish, clean slate again, expect 'unchanged'.
  Bella: 1.1.77 since 17:41 (own program), /_keepawake.500. Bella's 2nd silence 15:58–17:37 = REST MODE (slow.log: guard step,
  wall 0 s / running clock 5952 s; no net failures) – guests' TV off. Only the 13:34–15:48 connect failures are the open mystery.
  Fast-crypto build still not tested (libmbedtls-ps4-fast.a, tls/r2_mbedtls_config_fast.h). Kaeden: old helpers linger in its
  shared program after updates (3 'woke from rest' lines per wake) – to fix.
> - **19 Nov 4:15pm CORRECTION – Bella's 1:34–3:48pm silence was NOT the watchdog.** Bella came back by itself; its logs: helper up
  since 13:22:27 the whole time (starter "hourly: helper running" 14:21, 15:21), net-fail.log: **114 failed connects to the engine
  over 8016 s (13:35 → 15:48:47), step 'connect'** (-0x0044). Meanwhile LAN worked (DDP from Kaeden 3:15pm: 200 Ok). Same AP as
  Bella (cc:ba:bd:28:65:60, 2.4 GHz ch 6): Scarlett, Kaeden, Atlas – none had an outage. So: Bella alone couldn't reach the
  internet. Suspect IP clash at .6 (someone else's device answering for Bella's address at the router) or a router rule – check
  the router client list / DHCP reservations during the next outage. The 13:21 watchdog kill IS real (fixed in 1.1.70+).
  Also: ALL room PS4s now report own:1 (not only Bella) – the watchdog fix matters for every room.
  **Helper test line:** 1.1.71 = slimming (2.47→1.95 MB: gc-sections + no unwind tables via libmbedtls-ps4-gc.a/sqlite3-gc.o,
  own-program test payload removed), TLS session resumption (timings 'tls: handshake (session offered)' vs '(full)'), where.txt
  only for steps ≥10 s (watchdog writes it; ~8,600 fewer writes/day), check-in timing split. 1.1.72 (ps4-test 5cfc7fb, sha
  8325438f…) = + network path check on the 3rd and every 10th failure (router :80, 1.1.1.1:443, engine IP:443) in net-fail.log.
  Kaeden on 1.1.72 + /_keepawake.180 since 16:12. Not done (measured: little gain, some risk): AESNI/HAVE_ASM, static buffers
  (~480 KB bss, all in save/snapshot code), CA bundle trim.
> - **19 Nov 3:35pm ROOT CAUSE OF BELLA DROPPING OFF = watchdog bug (software, mine).** The 1.1.42 watchdog assumed the running
  clock stops in rest mode – it doesn't (after wakes: Bella 44261 s, Atlas 23491 s, Kaeden 810 s logged as "stuck"). On the others
  (shared program) it only writes a note; **Bella is the only PS4 running the helper as its own program (`own:1`)**, so after any
  rest > 20 min its watchdog _exit()s on wake. The starter relaunches, but right after a wake BinLoader may not be up (13:21:37
  "sent 0 of 2440264 bytes", OK 25 s later) → if every try fails, Bella is ON but silent (today from 13:34). **1.1.70 (ps4-test
  01f2b69, sha 17ad877a…)**: the watchdog's own 15 s loop spots a long gap = rest → shifts the step start (`r2_where_shift`), logs
  "woke from rest after about N s - not counted as stuck". Proven on Kaeden 15:31 (222 s rest). Next: Bella gets 1.1.70 (test)
  after its guests leave + staff re-run its starter; then rest > 20 min + wake on Bella. Separate, still open: starter relaunch
  right after a wake can fail; Bella/Atlas rest-mode wake (Wi-Fi).
> - **19 Nov 3:16pm BELLA IS ON BUT ITS HELPER IS SILENT.** Last check-in 13:33:57. I wrongly read that as "Bella went to sleep" –
  owner saw it ON before the 2:30 guests; DDP from Kaeden 3:15pm: 192.168.88.6 answers "200 Ok" (= on). So the helper stopped at
  13:34 (crash / full restart without re-jailbreak / hang – can't tell remotely). The 1:44 and 2:12 "failed wakes" on Bella
  were therefore NOT rest-mode wake failures. Lesson: silent check-ins ≠ asleep; confirm with `/_ddp.<ip>` from another PS4
  (200 Ok = on, 620 = standby, no answer = off/unreachable). Kaeden: woke after 8 min, 13.5 min, 1 h (Vale/Scarlett senders).
> - **19 Nov 2:12pm BOOKING KEEP-AWAKE v2 (owner OK 2:10pm).** Engine 01bc24f (27 bindings, 3 timers): a PS4 that is ON stays awake
  from **2 h before** a real guest session until **guest end + 15 min**; next booking > 2 h away / none left → its own power-save
  rules (cap). Overlapping windows chain (back-to-back). Engine-only (helpers 1.1.68+ already obey `aw`). Light check before 15/3/0,
  after 14/4/0 (4th = a guest's /checkout SimplyBook request during the run, not this). Step 3 still to build after the Kaeden 1-h
  wake test: engine wakes a sleeping PS4 15 min before its next booking (Kai/Vale/Max/Scarlett/Kaeden; Bella/Atlas need a cable).
> - **19 Nov 1:55pm BOOKING KEEP-AWAKE REMOVED (owner: "if staff turn on, just expect ps4 to follow their own power save rules").**
  Engine 17153da (27 bindings, 3 timers): ps4ResetRun no longer writes kv `ps4awake`; ps4Cmd always sends `"aw":0`, so helpers
  1.1.68+ drop any window (save.log "booking keep-awake off"). Why: Bella was switched on 75 min early and slept at 1:34 before its
  window opened. Helper code for `aw` stays until the slimming pass (harmless at 0). Light check before/after 15/3/0.
  Remote wake today: Kaeden (2.4 GHz, original PS4) woke after ~8 min asleep via Vale; Bella did NOT after ~10 min.
> - **19 Nov 1:33pm TEST CHANNEL + TIMINGS.** Engine 9921f17 (27 bindings, 3 timers): branch **ps4-test** = test releases; staff
>   `ps4update` with `ch=test` sends it to ONE PS4; `/ps4/app` serves the channel of that PS4's update command; quiet-time updates
>   only ever use ps4-release (still 1.1.68). **Kaeden on 1.1.69 (test)**: in-memory timings (no disk writes) – report field `tm`
>   = {name: [count, avg ms, worst ms, last ms]}, look `/_timing`. First numbers: report games list 1489 ms, disk + folders 861 ms.
>   Bella took 1.1.68 by itself in the morning; its keep-awake window opens 2:00pm (check `awakeBook`).
> - **19 Nov 1:27pm KAEDEN = TEST BENCH, ONLINE.** Owner copied the files (helper 1.1.68, starter 2, Round2 nanoDNS build, same
>   nanodns.ini 3eeb2b5a470c, detector 1.01 not switched on) + key, AutoRun via GoldHEN's "Enable PayLoader" (newer GoldHEN's name
>   for the 9090 server the starter uses). Kaeden: console 73378b38f36f345372e93e1fd488bbea, CUH-1000A, **FW 13.50** (rooms are
>   9.00/11.00 → own-program mode not used there; firmware-specific results need a confirm on a room), 192.168.88.5, 2.4 GHz 100%,
>   Sony blocked, profile KAEDEN, 29 games, 72.6/444 GB free. Next: speed-up list step 1 (timing logs) on Kaeden.
> - **19 Nov 12:45pm HELPER 1.1.68 RELEASED (owner OK: keep-awake during bookings)** – ps4-release 9481fa1 (sha cf8bb874…);
>   engine 8c5d525 `PS4_AUTO_HOLD_ABOVE = ''` (hold off) → PS4s take it in quiet time (no session room within 60 min, no game).
>   Light check before: 14 passed / 0 failed. Check `awakeBook` in a room's report once it runs 1.1.68 with a booking near.
> - **19 Nov 12:36pm LONG-SLEEP WAKE TEST: FAILED.** Owner switched Vale on; Claude sent wakes from Vale (broadcast, keys
>   c203a687 Bella / 357299b3 Atlas) at 12:36:50 after ~11.5 h asleep → **neither woke** (checked to 12:40). So for Atlas/Bella
>   remote wake only worked ~3 min after rest; after a long sleep it doesn't → **mornings: staff press Atlas + Bella by hand**
>   (or LAN cable). Optimisation to-do + keep-awake added to systems.json (Planned / build).
> - **1:00am BOOKING KEEP-AWAKE (owner 12:52am, option 2) – engine cd40d8d DEPLOYED (27 bindings, 3 timers), helper 1.1.68 BUILT
>   (ps4-helper, NOT released).** Engine: the 10-min tick (ps4ResetRun, before the auto-reset switch check, same calendar read)
>   writes kv `ps4awake` = { room: [[from, until]] } with from = session start − 30 min, until = guest end + 30 min (real guest
>   sessions only); ps4Cmd reads it in its one kvMany and adds `aw` (seconds) to every reply. Helper 1.1.68 keeps `g_awake_engine`
>   from `aw` (0–12 h) and ticks the power timer like /_keepawake; report field `awakeBook`; save.log "booking keep-awake ON/off".
>   TV switched off by guests still rests the PS4 (owner: fine). To go live: release 1.1.68 + roll out (owner's OK – PS4_AUTO_HOLD_ABOVE
>   still '1.1.61'), then check `awakeBook` on a room with a booking. Light check before: 14 passed / 0 failed.
> - **Still pending:** `oneoffMid` (17 Nov) is still in the engine – removing it touches notes code = Full check (~650 SimplyBook
>   requests); today was already ~4,600, so it waits for a quieter day.

> ## 17 Nov 2026, 7:52pm – engine 0a0d4b0 DEPLOYED (27 bindings, 3 timers): MIDNIGHT NOTES
> - Owner's screenshots: asy's Scarlett note 8:45pm–12:00am (end = 18 Nov 00:00:00) was drawn by SimplyBook over the WHOLE of 18 Nov
>   (from 11am); daren's ending 12:15am was fine. Fix in `sb2`: a calendar-note body with end "next day 00:00:00" is sent as
>   "same day 23:59:59" (`noteMidOut`); every note read back with 23:59:59 becomes next day 00:00:00 (`noteMidIn`), so the engine's
>   times don't change. One-off `oneoffMid` (side timer, once, DO kv `oneoffMid`) re-saves existing notes ending 00:00:00 in the
>   next 60 days – **remove `oneoffMid` + its side-lane call with the next engine change**.

> ## 17 Nov 2026, 11:57am – engine cdf7edb DEPLOYED (27 bindings, 3 timers): DURABLE OBJECT CALLS – FREE PLAN LIMIT
> - Cloudflare emailed 17 Nov 3:27am SGT: **90% of the free plan's 100,000 Durable Object requests a day** (resets 8am SGT). Every
>   `hb.kvGet`/`kvSet`/other `hb.*` call from the worker = 1 request. Hourly (GraphQL `durableObjectsInvocationsAdaptiveGroups`):
>   night ~500/h (timers); 15 Nov daytime 2–4.5k/h (~45k/day); **16 Nov 5–10k/h (~94k by 3am)** – heavy testing day (8 Full System
>   checks, PS4 wake trial). Over the cap → engine Durable Object calls ERROR until 8am SGT (bookings, payments, holds all use it).
> - Biggest steady user: the PS4 helpers' `/ps4/cmd` every minute (~7 calls each) + `/ps4/in` (~7) ≈ 500/h per awake PS4.
>   Fix: DO method `kvMany(keys, sets)` + worker `hbSnap(hb, keys, sets)` → `{ h }` (Proxy: kvGet of snapshotted keys answered
>   locally). `ps4Cmd` = 1 call when idle, `ps4In` = 1 read + its writes; `ps4Latest(env, fresh, hb)` takes the snapshot hb.
>   Checked 12:01pm: Atlas + Kai polling fine on it.
> - **Rule from now on:** new engine code reads several keys with ONE `hb.kvMany` (or `hbSnap`), never a kvGet per key in a loop;
>   control-centre auto-refresh stays ≥ 15 s and pauses when hidden/idle; mind Full System check runs (each costs many DO calls).
> - Owner's option (not decided): Workers Paid plan (USD 5/month) lifts this to 1M DO requests/month included and the 50 outside
>   requests per run to 1,000.

> ## 16 Nov 2026, ~4:40pm – engine a912159 DEPLOYED (27 bindings, 3 timers): ONE SIMPLYBOOK CONTACT PER MOBILE NUMBER
> - Owner: "register contact using phone number and name… if they rebook and provide their email we replace the placeholder…
>   our contact list stays unique with that person and contact number". Chose: rename to the newest name; online + Add a session.
> - `sbContact` (both checkout-before-payment and Add a session): `getClientList(<last 8 digits>, 25)` → newest contact whose phone
>   ends in those 8 digits (never SYS_CLIENTS / "Round2 online guest") → `editClient` name + phone + email (real one typed, else
>   keep its email, else `phEmail`); if the real email is refused (already on another contact) → reuse keeping its email. None →
>   `addClient` with the real email or `noemail.<8 digits>.<4>@example.com`. The no-email-first "late" attempt is gone (this
>   account always refused it). REPLACES the 3 Nov rule "every booking its own contact, never reuse". Old numbers may have several
>   contacts from before – the newest is used, the rest are left alone.

> ## 16 Nov 2026, ~5pm – engine a5bfcc5 DEPLOYED (27 bindings, 3 timers): NO EMAIL = STILL A REAL BOOKING; NOTES USE THE 4-BOX PAGE
> - Owner: "why is it still showing the old page type? then how can they reschedule themselves" + "just give a random placeholder
>   email that lets the function through… I don't want to be notified". Add a session: no email / bad email → `sbEmail` =
>   `noemail.<10 hex>@example.com` (never delivers; SimplyBook's own email goes nowhere). Stored nowhere else (`gEmail` ''; record
>   `standIn: true`; SimplyBook comment says "no email (stand-in …)"). `plan.standIn` / `plan.badEmail`, result `standIn`. So daytime
>   sessions with a mobile are real bookings → `/b/<code>` → the 4-box page with self-rescheduling. Notes now only: late, odd
>   length, clash, no mobile, Change, refused.
> - Notes: `/c/<code>` now REDIRECTS to `/move?ref=<code>`; `gApi` → `noteApi` (empty calendar, `info.note`); move/index.html
>   `noteMode()`: no Paid row, no moves chips, Reschedule box disabled "Booked with our team – WhatsApp us", Receipt box → WhatsApp us,
>   TV message → `/c/<code>/tv`. The 3:49pm bookedPage version for notes is gone.
> - System check step 1 now expects no email → booking with placeholder. Owner's earlier rule (15 Nov: no email → note → shared
>   contact) is REPLACED by this.

> ## 16 Nov 2026, 3:49pm – engine 67e1073 DEPLOYED (27 bindings, 3 timers): NOTES GET A BOOKING LINK (owner: "why limit it to real SimplyBook bookings")
> - Add a session → saved as a note (no email, late, clash, Change…) now returns `link` = `book.round2.sg/c/<code>` (code `N` + 7).
>   DO kv `nconf:<code>` = {nid, day, unit, name, pax, phone, t, tv}, `nlink:<note id>` = code. `/c/<code>` (`notePage`) = the same
>   `bookedPage` ticket as online bookings (no "Paid" line, "WhatsApp us to change"), read LIVE from the note via `lateFind` (so +1h
>   and EXT follow; deleted note → "changed or cancelled – WhatsApp us"). `/c/<code>/tv` makes the guest's cue.round2.sg link on first
>   use and ties it to the note (`lPair {nid}`). Change keeps the code (`noteLinkMove`). `latelist` rows carry `link`; gm `latelink`
>   (id, day) makes one for older notes ("Get booking link" button). round2-book wrapper allows `/c/` (3fa4b3c).
> - Control centre (round2-tv-launcher d2a25eb): result card + list rows Copy link / WhatsApp it; System check step "Add a session (late,
>   3–5am)" now must get a `/c/` link and see it in the list. NOT yet run live (no staff code here) – run the System check.

> ## 15–16 Nov 2026 – website booking page (desktop), stats, reschedule page, PC toolkit finds the TVs (no engine change; live engine still 86ed06b)
> - **Booking page on desktop** (`slots/index.html`, `index.html`; mobile untouched – owner: "mobile view is fine"). One scroll bar
>   (the website's desktop stage is a fixed 1440×900 box scaled to the screen, so the booking frame must FILL its section –
>   `<r2-simplybook fill="1">`, never 100vh). Two columns from 900px: calendar left (sticky), rooms right; "2 · BROWSE BY" bar
>   (ROOM / START TIME / EARLIEST FREE) sticks while scrolling the rooms, desktop only. Lessons: a sticky bar shows a hairline of
>   the page under it unless it has an 8px background box-shadow above; the bottom padding must sit inside the right column
>   (`.colR`), not on `.wrap`, or the sticky parts slide up at the bottom of the page. "Already booked? View your booking" line
>   REMOVED everywhere (owner: guests get their link by email / after booking / from Add a session).
> - **Click sounds (Kai bamboo), desktop only** – real mouse devices only (`(min-width:900px) and (hover:hover) and (pointer:fine)`).
>   Owner said "sounds dont play"; the code was seen running on his machine, so: louder, booking frame allowed `autoplay`, and the
>   frame's address carries `&v=<10-minute number>` so a stale copy can't linger. **Owner has NOT confirmed they play now**, nor
>   that the sticky slide is gone – ask.
> - **Website stats:** `room_<name>` counts a room only when it is CHOSEN (Vale was inflated – Rooms opens on Vale). `deepRoom` keeps
>   ?room= links counting. round2-tv-launcher `docs/site-stats.md`.
> - **Reschedule page** (`move/index.html`, mobile): week arrows no longer drag the page down (cause: `scrollIntoView` on the hour
>   strip – use `scrollLeft` only) and the week now slides left/right (`wkSlide`, off for reduced-motion). Commit 21230d3.
> - **PC toolkit `connect <room>` uses the TV's own reported address** (round2-tv-launcher d7e7530 + e266f96, TV app **1.0.286**):
>   Android check-in (`helper`) now has `ip`; TV tile shows "ADB x.x.x.x:5555"; `round2tv.ps1 connect kai` reads Firebase with the
>   TV messages key (asked once on the PC, kept in its round2-tv folder as `tv-key` – never in chat), falls back to the Theme
>   manager address. NOT yet run on a real PC (no PowerShell in Claude's container). Kai updated to 1.0.286 (16 Nov 12:56am);
>   other Android TVs (Atlas 1.0.280, Max/Kaeden 1.0.278) not yet. Atlas: `connect usb` now also TRIES to open network debugging
>   (`adb tcpip 5555`) – untested, see round2-tv-launcher README "Atlas network debugging – TRIAL".
> - **How to read the TVs' versions without the owner's browser:** KV `diag:req` = `[{"action":"tvmsgs"}]` → `diag:res` (side
>   timer, minute 1/6/…) gives each room's `tv.v`, `tv.t`, `front`, `pw`. It does not pass `ip` through (add it with the next
>   engine change if wanted).
> - **16 Nov 4:30am, engine 4c1a117 DEPLOYED (27 bindings, 3 timers):** diag channel may read `ps4list` (KV `diag:req` =
>   `[{"action":"ps4list"}]`); one-off `oneoffLinks` and its side-lane call removed. (Live was 3832c29 from the other chat –
>   checked identical before patching.) First reading 4:31am: all 6 PS4s silent – Vale 1.1.13 last in ~1:44am, Kai 1.1.13 ~1:15am,
>   Max 1.1.8 ~10:35pm (ACC was running), Scarlett 1.1.10 ~7pm, Bella 1.1.9 ~3pm, Atlas helper 1.0.7 (!) ~1:45pm. Helpers stop in
>   rest mode, so the engine can't tell rest mode from off / jailbreak lost – only "last check-in".
>   4:38am owner: Kai's PS4 light is ORANGE → the 1:15am remote `/_rest` (other chat's wake test) really put it in rest mode.
> - **Still open:** System check NOT run since the 14–16 Nov engine changes (needs the staff code on the owner's device);
>   remove `oneoffLinks` + its side-lane call with the next engine change; Kai remote/helper options ON HOLD (launcher README);
>   unanswered: Atlas Home-6× rule + HomeGuard leftovers and "Send log" (branch `send-log`) for a next TV update; old alert
>   sign-up hGptkT drops itself ~18 Nov 1:40pm; SimplyBook request count was 7,680 on 13 Nov (guideline ~5,000) – only noted.

> ## 14 Nov 2026, 10:25am – ⚠️ the 5-minute timer's run hits the free plan's 50-outside-requests limit (engine 810c91d DEPLOYED, 27 bindings)
> - **What happened:** at 10:00 two of the four 1-hour reminders failed for EVERY phone: `failed Too many subrequests by single
>   Worker invocation` (KV `diag:push` › phones › last). One cron run = one invocation = 50 outside requests in all (SimplyBook
>   calls + every push to Apple). The new ~50 s re-send (runs in the DO) got them out 48 s and 112 s late.
> - **Fix:** alerts are now sent from INSIDE the DO (`pushAll` → `hb.pushRun` → `pushAllHere`; the cron's re-send backstop too,
>   `pushRetryRun`) – each has its own allowance. Falls back to sending from the caller if the DO call fails.
> - **Measured and eased (engine 6afa1f9 DEPLOYED 12:37pm, 27 bindings):** every outside request is now counted
>   (`NET`, a wrapper round `fetch`) and each cron run's total is kept in DO kv `cronNet` {last, max of 24 h, fails} – read it with
>   gm `cronnet` (also allowed over the KV `diag:req` channel). First reading: the :40 run with the week-ahead noise sweep AND the
>   after-midnight notes = **24** (7 Firebase + 17 SimplyBook). So 10:00 was ≈ 24 + ~10 reminder look-ups + 20 pushes > 50.
>   Heavy sweeps are now OFF minutes 0 and 30 (week-ahead noise :40, after-midnight notes :10/:40), alerts are out of the cron's
>   allowance, and a reminder whose SimplyBook read failed is retried on the next 5-min tick (`soonAgain`). Each job is still
>   wrapped in `go(…catch)`, so a refused request fails silently – `cronNet.fails` is where it shows.
> - **1:15pm, first real alerts through the DO (2 reminders):** all 5 phones `ok`, no "topic refused" – Apple accepts `Topic`.
>   Shown: one phone +1–3 s, one +57–60 s (first re-send), one +235 s (second re-send). So re-sends now come about every minute
>   at first (`PUSH_RETRY_GAPS` 50 s, 2, 3, 4½, 9 min; engine deployed 1:28pm, 27 bindings).
> - **2:08pm, engine 774e2cf DEPLOYED (27 bindings): silent sign-ups clear themselves** (owner: yes). `pushPrune()` in the DO,
>   hourly at minute 25: a phone that signed up 7+ days ago and hasn't reported showing ANY alert for 7 days is deleted from
>   `push` – only while another phone reported in the last 2 days. Last report per phone = DO kv `pshown` (built from `pseen`).
>   The dropped row's choices stay 60 days in kv `pushDropped`; `/push/state` answers `{on:false, dropped, kinds}` and the
>   control centre signs that phone up again by itself at start-up (`Alerts.wake`). gm `pushsubs` now also returns `shown`,
>   `dropDays`, `dropped`. System check has a reading-only step for it. Docs: round2-tv-launcher `docs/staff-alerts.md`
>   (item 6, and a new plain-words section "How an alert travels").
> - **2:24pm, engine 9a10564 DEPLOYED (27 bindings) – THREE TIMERS** (owner: "lets try 1", with the PS4 save feature and the
>   other planned jobs in mind). Cloudflare › round2-book › Triggers now has 3 schedules; each fires its own run with its own
>   50 outside requests. `scheduled()` picks the lane from the scheduled minute:
>   - **now** `*/5 * * * *` – heartbeat (`cronLast`), 1-hour reminders (`soonRun`, + `soonAgain` retry), alert re-sends /
>     hourly prune / `diag:push` (all in the DO), `noiseAgain` / `autoAgain` rechecks; on the 10-min ticks tonight's calendar
>     work that shares one read of today + tomorrow: `autoRun`, `msgOrphans`, `waitWarn`, `holdSweep`, `noiseSync([t, t+1])`.
>   - **side** `1,6,11,16,21,26,31,36,41,46,51,56 * * * *` – TV OKs (7 Firebase reads), `paidSweep`, the paid-moves sweep,
>     `diagReq` (so a KV question is now answered at minute 1/6/…), `keyDaily`.
>   - **sweep** `3,13,23,33,43,53 * * * *` – `shadowSync` (:13, :43), noise rule days +2…+6 (:43, `'cron week'`), one far day
>     (:23, :53).
>   - Self-healing: "now" reads kv `cronNet.lanes`; if side hasn't run for 12 min / sweep for 25 min it does that lane's jobs
>     itself (exactly the old behaviour) and writes `fb: [...]` into its run record. So a deploy needs no order, and a deleted
>     trigger costs nothing but the shared allowance.
>   - Counters per lane: kv `cronNet` = {last, max, fails, limit, lanes: {now|side|sweep: {last, max}}} (gm / diag `cronnet`);
>     SimplyBook counter names the lane (`cron`, `cron side`, `cron sweep`). System check step "Background jobs: 3 timers…".
>   - **RULE for new background jobs** (PS4: daily prep from SimplyBook, parked-save expiry, version checks; membership renewal
>     reminders; Madd payout; food menu off Make): put them in **side** (no calendar) or **sweep** (calendar look-ahead), or give
>     them a **4th/5th timer** (5 per account on the free plan, 3 used) at a free minute (2/7 or 4/9) and a new lane name in
>     `scheduled()`. Never in "now" unless it needs tonight's calendar and is small. Things a PS4 helper or a page asks for
>     (`/ps4/…`, uploads to R2) are their own requests with their own allowance; R2/KV/DO calls count against a separate
>     1,000, not the 50. Still one budget to watch everywhere: SimplyBook's ~5,000 requests a day (the split re-reads tomorrow
>     twice an hour in sweep, about +100 a day).
>   - A script upload (deploy) does not touch the triggers; check `GET …/workers/scripts/round2-book/schedules` shows 3.
>   - First readings (2:31–2:46pm): new triggers took ~7 min to start firing (side first ran 2:31, sweep 2:33; until then "now"
>     covered, `fb` as designed). Outside requests per run: now 0–2 on its own (12 while covering for side), side 8 (7 Firebase +
>     1 HitPay), sweep 16 at :43 (the heaviest: after-midnight notes + 5 noise days). 0 refused. Not yet seen: a busy :00 with
>     several reminders. System check NOT run yet after today's engine changes (needs the staff code in a browser).
>   - Seen on the way (not fixed): SimplyBook requests today 4,469 by 2:30pm, yesterday 7,680 (guideline ~5,000). Biggest:
>     booking page `/day › getAvailableTimeIntervals` 1,162, cron 656, `gm late` (Add a session page) 523, `/mode` 252.
>   - Old sign-up hGptkT last showed an alert 11 Nov 1:40pm (owner re-added the app 1:45pm) → the prune takes it ~18 Nov 1:40pm.
> - **3:40pm, engine 8ded960 DEPLOYED (27 bindings, 3 timers) – DECLARATIVE WEB PUSH TRIAL on the owner's phone.** 3:30pm
>   Scarlett reminder: sent 15:30:16, phones showed it +3 s / +53 s / owner +115 s **as 3 copies** (original + 2 re-sends).
>   iPhones ignore the alert `tag` (WebKit 258922), refuse `close()` in an alert's first ~30 s, and Apple's `Topic` didn't
>   merge them – so "one copy" can't be promised while we re-send. Root-cause candidate: a locked iPhone puts off STARTING the
>   control centre's service worker. Declarative Web Push (iOS 18.4+) lets the phone show the alert itself:
>   `pushOne` sends `declBody(msg)` (`{web_push: 8030, notification: {title, body, navigate, tag, data: {url, kind}}, mutable:
>   true}`) when `declOn(env, endpoint)`: KV `HOLDS` › **`push:decl`** = `{"ids": ["GGAmdj"]}` (set now; `{"all": true}` later;
>   delete = off) AND the phone's worker reported version 2+ (KV `push:swv`, written by `/push/seen` field `v`). Such a phone
>   gets one re-send at most (`pushRetry`). gm `pushsubs` returns `decl`. Control centre 14ee38b: `sw.js` `SWV = 2` (three
>   alert shapes, reports `v`, test alerts report as `a: "test"`), `r2TidyAlerts` closes extra copies when the app is opened.
>   The trial starts by itself once the owner opens the control centre on his phone and it shows one alert (Test alert).
>   How to read it and what to do next: round2-tv-launcher `docs/staff-alerts.md` "Declarative Web Push".
>   **4:06pm:** owner confirmed on his iPhone that opening the app dropped the 3 Scarlett copies to 1 (`r2TidyAlerts` works on
>   a real iPhone), and his phone reported worker version 2 (KV `push:swv` = {GGAmdj: 2}) → it is on the trial from here on.
>   **5:35pm, engine 396b1f9 DEPLOYED (27 bindings, 3 timers):** first reading of the trial – 4 alerts since 4:05pm, owner saw
>   each on time and once; his phone reported none. On his iPhone a declarative alert is shown by the system WITHOUT starting
>   the worker (`mutable` doesn't bring it in), so a trial phone never reports: `pushPrune` now skips phones named in
>   `push:decl` (it would have dropped his sign-up after a silent week), the control centre shows n/a for it, the System
>   check's clean-up step ignores it. Not proven yet (the other phones were fast on those four too). No Vale/Atlas booking has
>   come in since the 4:43pm switch to notes, so the note path is still untested on real SimplyBook.
>   **9:20pm – trial did not fix the lateness.** Max booking alert sent 21:10:44, staff phones +3/+4 s, owner's phone (on the
>   trial) showed 2 copies only when the one re-send arrived (~50 s). HitPay's native alert was on time on the same phone, so
>   the hold is specific to web alerts on that phone. Nothing merges copies (tag, Topic, declarative). A "no re-sends on the
>   trial" change was committed and reverted WITHOUT deploying (9ea5b1c / 6282673) – live engine is still 396b1f9
>   (sha d7571fa2…). Owner asked whether to end the trial (delete KV `push:decl`); not changed yet. Still no Vale/Atlas booking
>   since the switch to notes. Details: round2-tv-launcher docs/staff-alerts.md "Second reading".
>   **11:00pm – trial ENDED (owner: ok):** KV `push:decl` deleted; all phones on ordinary delivery again, re-sends as before.
>   Code for it stays in the engine, off. Live engine still 396b1f9.
> - **15 Nov 12:44am, engine 2056b5e DEPLOYED (27 bindings, 3 timers) – name-only contact before the shared one.** Max booking
>   #3241 (22 Nov 11am, "kikay", Add a session) landed on "Round2 online guest": SimplyBook refused a contact with the number
>   +63 9153455204 (Philippine mobile, 12 digits – valid, so not "too long"; SimplyBook's own reason wasn't kept). New
>   `sbNameOnly`: before the shared contact, both paths (online `finalize`, staff `lateBooking`) try a contact with the name
>   only; `lateBooking` now passes `cErr` to `sbContact` and adds "SimplyBook said: …" to `how` (booking comment). Add a
>   session page (manager/late, db11f40) shows a ⚠️ Contact line when `how` isn't empty. Untested against SimplyBook (whether
>   it takes a contact without phone for this account is unknown – if not, it falls to the shared contact as before, now
>   with the reason in the comment). Also: the first new-style twin note went in for a real booking (Jennie, Vale 22 Nov
>   2:45–6pm, note 2647 in Atlas). Booking #3241 itself left as is (owner can swap the contact in SimplyBook).
>   **12:50am – real cause found, and the 12:44am fix does NOT cover it:** kikay was booked with NO email (comment line has
>   none). SimplyBook refuses every contact without an email ("Client email value is wrong" – found 3 Nov with Denzel,
>   docs/own-booking-plan.md; the account's mandatory registration fields include email). So since Add a session made real
>   bookings with "email optional" (12 Nov), every booking without an email lands on the guest's old contact (found by the
>   last 8 digits – their old name) or on the shared "Round2 online guest". The phone was probably fine. `sbNameOnly` (no
>   email either) fails the same way – harmless, but useless. Proposed to the owner: when no email is typed, give SimplyBook
>   a stand-in email (e.g. the shared contact's online-guest@round2.sg) with the guest's real name and number; or make email
>   optional in SimplyBook's settings (Settings › Email and SMS › Mandatory registration fields – also affects SimplyBook's own
>   booking page).
>   **1:39am, engine 53e166c DEPLOYED (27 bindings, 3 timers) – owner's order for Add a session:** 1) real booking with the
>   guest's own contact; 2) no email, or SimplyBook refuses the contact → a NOTE (`noteWhy` "no email – SimplyBook only makes
>   a booking with one"; `lateBooking` throws → the existing note fallback); 3) the shared Round2 contact only if the note is
>   refused too (`lateBooking({generic: true})` in the note's catch, new daytime sessions only, `bookable`). The old-contact-
>   by-phone lookup and `sbNameOnly` are gone from this path; online path unchanged (name-only step removed). Add a session
>   page: Email field no longer "(optional)", hint says email is needed for a real booking. System check step "Add a session…"
>   now also expects no email → note (tv-launcher cb98ec2).
>   **2:21am, one-off DONE (engine 7548df7, deployed 2:16am):** kikay's Max booking #3241 (22 Nov 11am, shared contact 3321)
>   → time-blocked note 2680 in Max 11:00–14:15 "kikay 2 pax · till 2pm · control centre · +639153455204 (was booking #3241…)",
>   then #3241 cancelled with no phone alert (kv `quietcancel:3241`). Result in KV `oneoff:res`. **Remove `oneoffKikay` and its
>   call in the side lane with the next engine change** (the `quietcancel:` check in `bookingPush` can stay). → removed in 86ed06b.
>   **2:24am, engine 86ed06b DEPLOYED (27 bindings, 3 timers) – booking link in SimplyBook comments** (owner): online
>   bookings' comment now ends "Booking page: https://book.round2.sg/b/<code>"; the last-resort note of a paid online booking
>   carries "confirmation: …/done?ref=<ref>" (Add a session bookings already had the link; Add a session notes have no page).
>   One-off `oneoffLinks` (KV oneoff:go = links) ran 2:26am: link appended to 21 upcoming online bookings; 7 skipped because
>   their comment isn't the engine's any more (no "ref <ref>" – edited by staff or moved), nothing overwritten. Result in KV
>   `oneoff:res`. **Remove `oneoffLinks` and its side-lane call with the next engine change.**
> - **4:43pm, engine eee2f10 DEPLOYED (27 bindings, 3 timers) – NEW Vale/Atlas TWIN BLOCKS ARE NOTES** (owner: "switch to
>   notes … make them consistent … just use the time blocked notes from now onwards"). `mirrorOnSb`: no record yet → POST a
>   time-blocked note in the twin, text `SYSTEM BLOCK · TWIN · <room> is booked (<first name>) · removed automatically · src
>   b<booking>` (`mirText`; `MIR_RE`), kv `mir:<booking>` = {note, s, e, u}. Booking changes → the same note is PUT to the new
>   room/time (404 = deleted by hand → a new one); cancelled / left Vale-Atlas → DELETE. **Records with `blk` (blocks that are
>   bookings, clients 2472/2476) keep the old path** (editBook / cancelBooking) – nothing existing was converted; a move through
>   Round2 (`mvExecute`) removes the old block and the re-made one is a note. A note can't be refused for "room taken", so
>   `mirClash` looks at the twin after making/moving one: real guests there at the same time → humanAlert "<twin> is already
>   taken – check". SimplyBook sends no callback for notes: a note deleted by hand is caught by `mirAdopt` (System check step
>   "Moves and Vale/Atlas blocks…", now reads the notes too; `fix=1` re-makes it), not at once.
>   Also: own-block skips know the note (`mvQuote`, `gLogic`, staff move times; `mirMine` matches `src b<booking>`), clash texts
>   say "twin room booking" for these notes, and long note reads are paged 200 at a time (`notesRange`: `latelist` 46 days,
>   guest calendar `gCalItems` 31 days – with one note per Vale/Atlas booking a range can pass 200). Diag (`diag:req`) may ask
>   `mirror` (forced to status, or `do: adopt` without fix). Make fallback: Make only knows bookings – going back to Make means
>   new blocks are bookings again; note blocks made meanwhile stay and still block.
>   Noise-rule header comment fixed (alerts never go to Telegram).

> ## 14 Nov 2026, 6am – second chat (TVs / control centre): review follow-ups, engine ed9d0be DEPLOYED (27 bindings, cron */5)
> - **A moved booking's noise block follows at once** (`mvExecute` → `noiseSync` old day + new day).
> - **Phone alerts late / in threes:** the delivery log (KV `diag:push`) showed late alerts appearing within 2 s of a re-send, so
>   the first re-send now goes after ~50 s (DO kv `pushchk` on the hold timer's alarm, `pushChk`, `pushRetry` – then ~4 and ~9 min,
>   5-min cron as backstop); `Topic` header so a newer copy replaces an undelivered one; VAPID pass reused 2 h (KV `vapid:<service>`,
>   Apple's once-an-hour rule). Full write-up: round2-tv-launcher docs/staff-alerts.md.
> - **Telegram = the Madd Pizza food workflow only (owner's rule).** Nothing about bookings goes to Telegram; `staffAlert` never
>   sends since engine ed9d0be (it never did – `STAFF_CHAT` was never set). Booking alerts = staff phones only.
> - **Guest links:** "Fix this link's room or start" (was "Change booking time or room" – it never moved the booking); the guest's
>   message page now keeps and shows a pop-up time set by staff (`retimed`).
> - My deploys patch the live script through the Cloudflare API (hash of live checked before, hash of result checked after,
>   keep_bindings with r2_bucket) – same file as the commit, no deploy helper needed.

> ## 14 Nov 2026, 5am – review of the notes + three fixes (owner + Claude). READ: sections below marked SUPERSEDED are history only
> - **Bug fixed:** since 12 Nov the booking board's free-time memory (`gapc`) was wiped on every SimplyBook notes READ (missing
>   braces in `sb2`) – the cause of ~7,000 requests/day. Now wiped only when a note changes. Watch the System check's request count.
> - **Fee rule (owner):** ADD HOURS (same day, room, start – just longer) = no change fee, only the extra hours, doesn't use a move.
>   $5 only for a real upgrade: bigger kind of room (UPGRADE) or same kind at a dearer rate (PEAK TIME). Longer hours alone, or a
>   smaller room, = MOVE $15. Same rule in `gLogic.feeOf` (guests) and `mvQuote` (staff). Wix T&C clause 2.4 gets a line (d).
> - **Guest moves now HOLD the new slot** like a new booking (owner): 10 min, room + twin, SimplyBook "ONLINE HOLD" notes, HitPay
>   page expires with it. DO kv `mvholds` (`mvHoldAdd/Drop/Notes`, counted by `clash()` and `list()`); the guest's own booking never
>   conflicts; one hold per booking; back from HitPay unpaid (`/move/api?…&back=1`) or the 5-min sweep closes it (`released` /
>   `expired`). Staff QR/link moves do NOT hold (staff are at the screen).
> - **Staff moves don't count** toward the guest's 2 moves (owner confirmed). Add a session bookings count as paid at full price (owner: fine).
> - System check has: "Guest rescheduling" (now also the add-hours rule) and "Moves and Vale/Atlas blocks can run" (now also the hold).

> ## Guest booking page + rescheduling + Add a session bookings (LIVE 12 Nov 2026, beta) – the whole flow
> Full rules, fees and the reasoning: docs/rescheduling-plan.md ("LIVE 12 Nov" section at the end).
> **1. Booking.** Online: HitPay → `/done?ref=` → (real or test) redirect to the ONE guest booking page `/move?ref=…&new=1`
>   ("SAVE FILE CREATED · YOU'RE BOOKED!" for 30 min after booking, then "YOUR BOOKING"). WhatsApp/walk-in: control centre ›
>   Add a session (`late`): start 11am–8:15pm, guest out by 11:15pm, 3–6 whole hours, nothing in the way, MOBILE typed → `lateBooking`
>   makes a real SimplyBook booking (own contact with the typed name, pax, twin, noise rule, Auto wrap-up) + a booking record
>   (`addPaid`, `pay:'staff'`, email stored lowercase) and shows **Copy link / WhatsApp it** (`book.round2.sg/b/<code>`). Anything
>   else (late, odd length, clash, no mobile, Change) = a note as before (no link). The link is also in the SimplyBook booking comment.
> **2. Ways in (all land on `/move?ref=`):** email MANAGE YOUR BOOKING button (`/b/[code]` → 302), the link staff send, View your
>   booking (`/find`, email + mobile must match the same booking), the receipt's "Back to your booking". There is NO login: the link
>   (ref) is the key. A homepage LOAD SAVE / SAVE FOUND (phone remembers the booking) was built and REMOVED the same day (owner:
>   a forwarded link would show on someone else's phone – more risk than reward). Old `/done` page: only with `&classic=1`.
> **3. The booking page** (round2sg-home `move/index.html`, served by the engine from GitHub main, 60 s cache; framed at
>   book.round2.sg – `/move` is in the round2-book wrapper's allowed paths): ticket (room colour, name, date, time, length,
>   guests, paid, ref, chips), tiles RESCHEDULE (beta) · TV MESSAGE (cue link or `/done/message`) · RECEIPT (`/receipt`) ·
>   CALENDAR (.ics), reschedule rules, save history (every move + its receipt), when you arrive + WhatsApp, address.
>   Test bookings: yellow TEST BOOKING banner; a sandbox run never put in SimplyBook can go up to payment, then is told it can't move.
> **4. Rescheduling.** ONE rules file `gLogic(C)` in the engine: it charges with it and serves the same function as
>   `/move/logic.js` to the page (price shown = price charged; a moved calendar → "price changed, tap again"). `gCtx` builds C
>   (booking as SimplyBook has it now + a month calendar from ONE getBookings + ONE calendar-notes read, kept 3 min in kv `gcal`,
>   wiped with `gapc` on any change; + online holds). `gApi` = `/move/api` (read · pay · `mv=` status). Pay: fresh check (gLogic +
>   `mvQuote`), HitPay payment request `MV…G` (sandbox for test bookings), redirect back `/move?ref&mv=`, webhook `/move/hitpay` →
>   `mvComplete` → `mvExecute` (SimplyBook editBook, twin, EXT, TV messages follow, `holdMove` adds the move with `guest:true`,
>   `d.paid` += difference). The new slot is HELD 10 min while they pay (14 Nov); if it still can't be moved after paying → staff alerted to move or refund. Nothing to pay → moved at once.
>   Switch off: engine mode `gResched = false` (page says "WhatsApp us").
> **5. Staff.** Bookings › Move a booking (same $5-step fee, can lower/waive with a reason; shows each booking's 🔗 guest link to
>   copy). Add a session › Upcoming lists bookings made there with Copy link / WhatsApp it (change them via Move a booking).
> **6. Emails/Terms.** SimplyBook templates: MANAGE YOUR BOOKING button (email/btn-manage.png), big Name row, "Tap Manage your
>   booking above to reschedule…", receipt line `/r/[code]`. SimplyBook's own Client Rescheduling/Client login OFF, cancellation
>   "Do not allow". Wix T&C (page NEW TNC, HTML block) clause 2.4 + "Before you pay": 2 moves, until 3 hours before.
> **7. Checks.** System check steps: "Guest rescheduling: page, rules and fees" and "Add a session: daytime with a mobile = real
>   booking, late = note". Deploy: see "How to deploy the engine" in the PS4 block below (the helper's cron is gone – open its link).

> **PS4 network wake (14–16 Nov):** helper 1.1.10 has `/_ddp.<ip>` (on/standby), `/_ddpall` (broadcast), `/_wake.<ip>.<key>`,
>   `/_wkey`. A PS4 in rest answers only with "Stay Connected" on and ~2 min after sleeping (Kai yes; Bella, Scarlett silent).
>   **A home-made key (SHA-256 of an account ID) does NOT wake it** – clean test on Kai with an ID'd empty profile, both byte
>   orders. Needs a registered device. HDMI-CEC on Kai (T-Link on, 16 Nov): PS4 on → TV on; TV off → PS4 rests; TV on does
>   NOT wake the PS4 (it drops off the CEC list when asleep); WoL to the TCL TV didn't wake it. → Remote WAKE parked (staff
>   switch rooms on at opening). **Room OFF works:** `adb shell input keyevent 223` to Kai's TV → TV + PS4 both sleep. Next:
>   a "Room off" command in the TV app (Kai first). Detail: project doc ps4-game-saves.md.

>   **16 Nov 1am:** engine 3832c29 (staff `ps4list g=1` → game versions). **The live module is named `worker.js` now** – deploy
>   with main_module "worker.js". Game versions differ in 21 of 45 shared games (It Takes Two 01.03 on Vale/Bella vs 01.00
>   elsewhere, God of War / Outer Wilds unpatched on Max…); helper 1.1.12 reads extended-drive patches. **System check: "side"
>   timer made 57 outside requests in one run (limit 50) – bad before and after this change; someone should look.**

> ## PS4 game saves – WHERE IT STANDS (14 Nov 2026, 4:30am) – read this first, detail in the session log below
> **Proven remotely (Max):** profile rename · sign-in/out · open a save decrypted · backup to R2 · restore into another profile
>   (GT Sport Max → User4, owner saw it on the TV) · rest mode. **Not proven:** 9.00 ↔ 11.00 restore · restore where no save
>   exists yet · helper frozen by rest mode mid-job · helper resuming after a *remote* rest (check /data/round2/rest.log).
> **Versions:** helper 1.1.8 on Max, Scarlett, Kai; Vale + Bella 1.1.1 (asleep, update when idle); **Atlas 1.0.7** – check it
>   self-updates (1.0.7 is the first that can). Engine 1ec01c9 live, 27 bindings.
> **How to deploy the engine:** KV `deploy:want` = commit → open the r2-deploy-helper link in the owner's built-in browser →
>   verify SHA-256 of `deploy:src` → PUT with keep_bindings **secret_text, kv_namespace, plain_text,
>   durable_object_namespace, r2_bucket** (leave r2_bucket out and the save storage is cut off) → 27 bindings, cron `*/5` →
>   System check.
> **Left as is:** Max User4 holds a COPY of the unlocked GT Sport save (its own GT progress is in R2: …/14a1e947/CUSA02168/
>   local-data/1794592769 + sce_sdmemory/1794592784) – owner to say keep or put back. Kai has User1 + User4 signed in.
>   Test backups are filed by console/profile; member saves will be filed by member.
> **Owner decisions 14 Nov:** park non-members' saves (don't wipe) · saves prepared on the PS4 before the day's bookings, live
>   fetch as fallback · member profiles never activated · never update PS4 firmware for any feature · morning wake by TV on →
>   HDMI device link (to check at the shop) · cloud is the one true copy (2nd outlet), a Pi disk only a local cache.
> **Owner still to answer:** other house saves besides GT Sport? · park window (end of day vs 14 days).
> **Next, in order:** 1) game versions per room 2) 9.00 ↔ 11.00 restore 3) restore with no existing save (create + register,
>   Apollo's way) 4) member profile start to end 5) parking + proper delete 6) backup during session + on-disk to-do list, rest
>   mode mid-job test 7) daily prep from SimplyBook 8) QR login 9) morning wake.
> **Also open (not PS4):** SimplyBook requests were 7,110 on 13 Nov (guideline ~5,000; mostly /day getAvailableTimeIntervals)
>   – find out why. TVs: Bella not reporting 3 days (Kaeden = renovation).

> ## Session log – 13 Nov 2026 (owner + Claude): room PS4s report to the engine, one-tap clean-up, self-updating helper
> Plan + full detail: project doc `ps4-game-saves.md` and round2-tv-launcher branch `ps4-helper` folder `ps4/` (README).
> **Engine (all on main, deployed):** `/ps4/in` (report every 15 min, header `x-r2-ps4` = secret **PS4_KEY**, added 13 Nov),
>   `/ps4/games` (public games list from the PS4s, by room tier; PS Vue + names set to '-' hidden; lobby discs from kv
>   `ps4discs`), `/ps4/cmd` (helper asks every minute for a job), `/ps4/done`, `/ps4/app` (newest helper file, SHA-256 checked).
>   Staff gm actions (GM_STAFF): `ps4list`, `ps4map` (console ID → room; Vale = a24af9cb275fa9472848ce070b7ef1e8), `ps4discs`,
>   `ps4names`, `ps4clean`, `ps4update`. kv: `ps4:<id>`, `ps4ids`, `ps4map`, `ps4poll:<id>`, `ps4cmd:<id>`, `ps4play:<night>`,
>   `ps4rel`, `ps4auto` (false = no quiet-time updates), `ps4autoTry:<id>`, `ps4autoChk:<id>`.
> **Helper releases:** round2-tv-launcher branch **`ps4-release`** (round2d.elf + round2d.json {v, sha256, size} + round2-boot.elf).
>   Not GitHub releases (this session can't create them; the TV apps read releases/latest, so PS4 files stay off releases).
> **Busy-room rule changed (owner, 13 Nov 1:40pm):** Clean up on Vale was refused "session until 2pm" – it was Atlas's guests:
>   Atlas's booking puts a SYSTEM BLOCK *booking* in Vale (the engine mirror makes bookings, clients 2472/2476; noise blocks are
>   notes), and the rule also counted the twin. Vale and Atlas are separate rooms (Atlas upstairs), so now `roomBusy` counts only
>   the room's OWN guests: skips SYSTEM BLOCK sessions (`S.sys`), the twin, and notes longer than 12 h (Kaeden renovation).
>   Used by PS4 Clean up / Update now / quiet-time updates AND the TVs' Update now (`tvUpdate`, same twin issue). The mirror
>   itself is unchanged (still bookings) – owner asked "notes instead, or treat system blocks differently"; we did the second
>   (no change to how rooms are sold/blocked). If the mirror ever moves to notes, nothing here needs changing.
> **Deploys today:** r2-deploy-helper had NO cron schedule any more (why it "stopped firing"); a 1-min schedule added for a test
>   didn't fire either and was removed. Working way: set KV `deploy:want` = commit, open
>   `https://r2-deploy-helper.donttelldadyet.workers.dev/?k=<deploy:key>` in a normal browser (this cloud machine is blocked from
>   it), then verify SHA-256 of `deploy:src` and PUT with keep_bindings. Bindings were 26; **27 since 14 Nov** (R2 `SAVES`) – see below.
> **Self-updating helper (evening):** starter round2-boot.elf in AutoRun launches the helper via GoldHEN BinLoader. First live
>   update (Max 1.0.5→1.0.6) got stuck: the old helper's `_exit` ended in signal 12 and it kept its lock, so the starter never
>   swapped. Fixed with helper 1.0.7 (never exits – lets go of the lock and sleeps) + starter 2; engine `PS4_SELFUP='1.0.7'`
>   (no updates offered to older helpers – FTP once). **Max 1.0.7→1.0.8 by Update now worked (~20 s).** Releases: branch
>   `ps4-release`, read by commit (staff gm `ps4rel` checks). Read-only `ps4look`/`ps4lookres` lists PS4 folders.
>   PS4 FTP (192.168.x, port 2121): Vale .88.21, Kai .88.18, Max .88.6, Scarlett .88.16, Atlas .88.19, Bella .88.23.
> **Game saves – tests 13 Nov evening (full findings + rules: project doc ps4-game-saves.md "Save-transfer tests"):** PS4's own
>   USB save copy is blocked (wants a system update). Apollo's copy works between Kai and Max, into activated AND unactivated
>   profiles, because it re-stamps the save (param.sfo user ID + account ID + PSID) for the receiving profile → member profiles
>   stay unactivated, main profiles untouched. Changing a profile's ID after saves are in it = "save corrupted". Encrypted copies
>   are firmware-bound (11.00 vs 9.00 rooms) → cloud copies decrypted. Helper 1.1.0 has staff gm `ps4prof` (rename / activate /
>   undo, one change per job, read back; refused while signed in or a game is open). Kai + Max User4 renamed back to "User4" (9pm).
> **Late 13 Nov:** helper 1.1.1 (prof ops logout/login, never the main profile) released; all PS4s self-updated except Scarlett
>   1.0.9 / Atlas 1.0.7. Engine bb2049e (ps4prof allows logout|login) – Cloudflare's script upload returned HTTP 500 (code 10002,
>   Workers incident open on their status page) 3x 11:23–11:30pm, went through 11:45pm; live engine was never half-changed.
>   System check fix (round2-tv-launcher cd14388): the guest-rescheduling step's "under 3h" test moved the clock after building
>   the rules (they read it once), so it always failed – it now builds them again. After: 36 ok / 0 bad. Warn: SimplyBook
>   requests 7,110 today (guideline ~5,000; biggest user /day getAvailableTimeIntervals) – look into it. Next: sign-out test on
>   **Max** User4 (Kai has Scarlett's guests – leaky aircon in Scarlett).
>   **14 Nov 1:20am – done:** remote sign-in AND sign-out of Max User4 both worked (helper `prof` login/logout, result 0, read
>   back "Max" → "Max, User4" → "Max"). Main profile untouched. The 12:15am try missed because the shop's internet dropped
>   (~12:07–1:10am, ISP); the helper resumed by itself. → end-of-session clean slate can be automated.
>   **14 Nov 1:35am:** helper 1.1.2 (released, Max only so far – others get it in quiet time) opens a save **decrypted,
>   read-only** Apollo's way (key service + sceFsMountSaveData), lists it, closes it – tested on Max User1 CUSA34284: real data
>   ~10 KB + icons. Staff `ps4look` paths `/_save.<user>.<title>.<save>|3`. Cloud storage (R2) not enabled on the Cloudflare
>   account – owner switched it on 1:44am; bucket **round2-saves** (APAC) created, not yet bound to the engine. Next: pack +
>   upload + restore.
> **RULE (owner, 14 Nov): Gran Turismo Sport on Max (CUSA02168).** The save in the main **Max** profile is fully unlocked,
>   only on Max, the racing-sim USP. It may be READ (backed up, copied into another profile) but is **never written to,
>   restored over or deleted**, and that profile is never removed. Helper 1.1.4+ refuses (first version 1.1.3 refused reads too).
> **14 Nov 2:15am – PS4 save backup + restore working.** Engine 1ec01c9 (deployed, 27 bindings incl. R2 `SAVES` →
>   round2-saves; keep_bindings must now include "r2_bucket"): `/ps4/sput`, `/ps4/sget`, staff `ps4saves`. Helper 1.1.7 (Max;
>   others in quiet time): `ps4look` paths `/_sback.<user>.<title>.<save>` and `/_srest.<user>.<title>.<save>.<backup>` (into
>   an existing save of the same game, its own sce_sys kept, each file staged on /data/round2/stage first). Max's unlocked GT
>   Sport save is backed up; a copy was restored into User4's GT save (User4's own GT progress backed up first). System check
>   after: 38 ok / 0 bad (new step "PS4 helpers + game-save storage"). Owner's daily plan: prepare the day's members' saves on
>   each PS4 from SimplyBook ahead of time (works offline), live fetch at login as fallback. Full log: project doc
>   ps4-game-saves.md.
>   **2:32am owner confirmed: User4 on Max has the GT Sport save – restore works end to end.** Clean slate (owner): all
>   non-member saves go at session end (main + User1–4 profiles) except a per-room house baseline (GT Sport on Max).
>   Owner 2:38am: PARK (keep on the PS4 + cloud, tied to the booking) rather than wipe, so a guest who signs up can still get
>   their progress back. **2:55am: remote rest mode works** – helper 1.1.8 `ps4look` paths `/_rest` (only if rest mode is
>   enabled and no game is open); Max, then Scarlett + Kai (self-updated to 1.1.8) went to sleep on command.
> **Vale PS4 (owner):** sometimes kernel-panics while jailbreaking (11.00) – before Round2's helper starts (AutoRun runs after
>   the jailbreak). Noted in the PS4 plan; watch whether it gets worse once more payloads run.

> ## INCIDENT 13 Nov 2am – first real guest move didn't run; Atlas not blocked (FIXED)
> - Ranen Tan paid $15 (PayNow, 2:04am, MV39355CBD) to move Vale Tue 17 Nov 3:30pm 4h → 4pm 3h. Nothing moved, no alert, Atlas free.
> - Cause: the HoldBook class had TWO methods named `claim` – the kv lock `claim(k, ms)` (added 11 Nov with the engine mirror) and
>   the holds `claim(ref)` further down, which silently replaced it. Every lock returned "busy": `mvExecute` ("Someone is moving
>   this booking"), `mvComplete`, and `mirrorOnSb` (Vale/Atlas twin blocks gave up). Renamed the kv lock to `lock(k, ms)`.
> - Done: move finished by staff action `mvfinish` (recorded as paid online); missing twin block added (izzati, Vale 13 Nov 2:15pm,
>   via `mirror adopt fix=1`); all 9 Vale/Atlas bookings now blocked.
> - Added: a 5-min sweep that finishes paid moves still pending (or alerts); staff actions `mvrecent`, `mvpaycheck`, `mvfinish`;
>   System check step "Moves and Vale/Atlas blocks can run" (`mvselftest`: lock locks, no missing twin blocks, no stuck moves).
>   System check after the fix: 35 ✅ (the red was the check's own under-3h test time – fixed).
> - Deploys: the helper's cron had stopped firing for hours. r2-deploy-helper now ALSO fetches on demand:
>   GET https://r2-deploy-helper.donttelldadyet.workers.dev/?k=<KV deploy:key> → pulls `deploy:want` into `deploy:src`.
> - Lesson: never reuse a method name in HoldBook; the self-test now proves the lock works.

> ## Session log – 12 Nov 2026 (owner + Claude): guest rescheduling launch, start to finish
> In order, so the next person sees why things are the way they are:
> 1. **SimplyBook emails** (Settings › Email & SMS › templates, edited in the browser): Booking confirmation, Booking change and
>    Reminder (client email) now use the MANAGE YOUR BOOKING button picture (email/btn-manage.png) and a big **Name** row at the top
>    of the details box. Confirmation also says "Tap Manage your booking above to reschedule – up to 2 times, until 3 hours before
>    your session. A small change fee applies." + "Your receipt: book.round2.sg/r/[code]". (A WhatsApp link was tried first and
>    removed – owner: it made rescheduling look WhatsApp-only.) Checked: SimplyBook's Client Rescheduling and Client login are OFF,
>    Cancellation Policy = "Do not allow to cancel appointment".
> 2. **Fee decision:** the demo's fee goes live (MOVE $15 / UPGRADE $5 / PEAK TIME $5 + difference + POPULAR +$5…+$20 in $5 steps,
>    "$5 OFF", Vale/Atlas twin rule, 2nd move +$10, free first 15 min). Launch **fully open, BETA tag kept** (no first-month cap).
> 3. **Engine** (worker/round2-book.js): `gLogic` (one rules file, also served as /move/logic.js), `gCtx`/`gCalItems` (month calendar
>    from 1 getBookings + 1 notes read, 3-min memory `gcal`), `gApi` (/move/api), guest pay via HitPay `MV…G` → `/move/hitpay` →
>    `mvExecute`; `holdMove` keeps `paid` and each move (`guest`, `moveNo`, `cost`); staff Move a booking fee now in $5 steps too.
> 4. **Add a session = real booking first** (owner corrected me: I first said it only made notes – it did, the booking path was new).
>    Needs the guest's mobile (email optional); daytime 3–6 h, nothing in the way. Shows Copy link / WhatsApp it. Late/clash/odd
>    length/no mobile → note as before. Email stored in small letters so "View your booking" (email + mobile) finds it.
> 5. **T&Cs** (Wix, page "NEW TNC", HTML block html1 in section46, round2.sg/tnc): clause 2.4 + "Before you pay" = 2 moves, until
>    3 hours before; then (owner, 12 Nov 8pm, CCCS price-transparency) the price STRUCTURE spelled out: change fee S$5/S$15 (+S$10
>    2nd move), popular-time add-on S$5–S$20 by demand, price difference, itemised total shown before paying, free first 15 min.
>    The demand model, twin rule and "$5 OFF" stay internal. Keep this clause in step with gLogic if fees change. The older "t&c" page (/r2tnc) was NOT changed.
> 6. **Homepage LOAD SAVE / SAVE FOUND** (phone remembers the booking) – built, then REMOVED the same hour (owner: a forwarded link
>    would show on someone else's phone; more risk than reward). Homepage clears anything it stored (`r2.saves`).
> 7. **One booking page everywhere** (owner: "keep everything consistent"): the 4-button page `/move?ref=` (Reschedule · TV message ·
>    Receipt · Calendar, rules, save history, when you arrive, address). `/b/<code>`, `/find`, payment return (`/done` → "YOU'RE
>    BOOKED!" for 30 min), receipt "back" all land there; test bookings too (TEST banner). Old `/done` only with `&classic=1`.
>    No login – the link is the key (a "last 4 digits before rescheduling" check was offered, not built).
> 8. **The page keeps itself current**: free-change countdown ticks on the engine clock (/time); when it ends, or the tab comes back /
>    is 5 min stale, prices reload and the screen redraws; reopened under 3 h or with no moves left → back to the booking, closed.
> 9. **Staff**: Bookings › Move a booking shows each booking's 🔗 guest link (Copy / Open); Add a session › Upcoming lists the
>    bookings made there with Copy link / WhatsApp it. Every move sends a staff push "🔁 RESCHEDULED online by the guest / by <staff> ·
>    was · now · paid $X (fee + difference)" (opens Rescheduling) and SimplyBook's plain "MOVED" alert is skipped for those.
> 10. **Rescheduling page** (Bookings › Rescheduling): trip-wires for the last 4 weeks – % of online bookings moved (≤15%), % moved
>    under 3 days (≤50%), % into Fri–Sun evenings (≤33%), % freed slots rebooked (≥15%), average gain per move (>$0); red after 5+
>    moves → one push alert a day per wire (`mvStats`). Demo with made-up moves: staff.round2.sg/?rsdemo=1&tab=resched.
> 11. **System check** (before: 33 ✅; after: 34 ✅) – new steps "Guest rescheduling: page, rules and fees" and "Add a session:
>    daytime with a mobile = real booking, late = note". Red both times: **SimplyBook requests 12.9k–13.5k today** (mostly the
>    booking page's /day before the 12 Nov caching; watch tomorrow's number).
> **Still open (12 Nov evening) – all closed since except the last two:** the owner's real test move (not needed: a real guest move ran 13 Nov) (test booking "test", Scarlett Thu 19 Nov 11:15am, ref R2BEE8C55C26 –
>    pay with 4242…, then cancel it in SimplyBook; earlier test bookings got cancelled before the test – the "CANCEL IT" note);
>    engine commit 1620aed (move alerts + live trip-wires) DEPLOYED 12 Nov ~8pm (mvstats answers: 0 moves, 111 online bookings in 4 weeks); the old /r2tnc T&C page; the optional "last 4 digits" check.

> ## TV notifications (31 Oct 2026) – read round2-tv-launcher `docs/notifications.md` first
> Flow charts of every timer and priority on the room TVs (guest > Round2 > +N CREDITS ADDED; food first), the 10 → 5 min → That's a wrap
> sequence, cut-offs, In session extensions (EXT notes, Vale/Atlas SYSTEM BLOCK) and a code map. The engine parts are in this repo's
> `worker/round2-book.js`: `qRun` (queue), `follow` (messages follow bookings), `nudgeRun` (5-min reminder), `sessBanner`/`bqRun`
> (credit banner waits in line), `insess`/`extend`/`extUndo` (In session).

> ## Guest links are on round2.sg (DONE 31 Oct 2026) – never put "donttelldadyet" in anything guests see
> - **book.round2.sg** (repo `round2-book`, GitHub Pages): shows the engine's guest pages (`/done?ref=…`, `/find`, `/b/<code>`) inside a
>   full-page frame. HitPay sends guests back to `book.round2.sg/done?ref=…` (worker `PUBLIC_BOOK`). The engine's pages post their path to
>   the frame so the address bar follows, and open outside links (WhatsApp, cue.round2.sg, round2.sg) outside the frame.
> - **menu.round2.sg** (repo `round2-menu`): loads `round2sg-home/menu/` and runs it as the whole page (no frame, HitPay opens normally).
>   `menu.round2.sg/vale` = `?room=vale`. HitPay returns food orders there (worker `MENU_RETURN = PUBLIC_MENU`). The menu itself is still
>   edited ONLY in round2sg-home `menu/` (and `menu/admin.html`).
> - **cue.round2.sg** (repo `round2-cue`): TV message links (unchanged).
> - DNS stays in **Wix** (Domains › round2.sg › Manage DNS): CNAMEs `book`, `menu`, `cue` → `donttelldadyet-prog.github.io`. Domain is
>   registered at **Vodien**; the only round2.sg email is hello@round2.sg – don't touch its records. No Cloudflare DNS move needed.
> - Engine API calls and webhooks (HitPay `/hitpay`, SimplyBook `/sb/notify`, `/gm`, `/day`…) stay on `workers.dev` – guests never see them.
>   Old `workers.dev` / `github.io` links keep working.
> - **Still to do:** owner points each room's Wix links page (valelinks etc.) food button at `https://menu.round2.sg/<room>`;
>   (DONE 12 Nov: the SimplyBook emails use `https://book.round2.sg/b/[code]`);
>   one real sandbox test booking + food order via the Test bench to see the return pages on the new addresses.

> ## SEO optimisation (new department, 31 Oct 2026) – read docs/seo-optimisation.md first
> Owner's rules: no visible SEO text on round2.sg, no hidden text, no keyword stuffing; the game homescreen look stays.
> Next up: business details code (structured data) on the Wix homepage – drafted in that doc, owner to OK before publishing.

# HANDOFF – Round2 own booking system: the ORIGINAL 30 Oct note (SUPERSEDED where it says not live / sandbox / DRY_RUN / own-booking branch – it has been live on `main` since 30 Oct; kept for the how and why)

Written 30 Oct 2026, ~6:30am SGT (co-owner who handles WhatsApp bookings), on branch `own-booking` (merged, retired).
At that time nothing was live for guests. Detailed notes: `docs/own-booking-plan.md`, `docs/simplybook-early-bird.md`.
Working rule from the owners: work on your own branch, never merge without approval, leave a handoff note.

## What it is
Guests book on our own page instead of the SimplyBook widget:
`slots/index.html` (board) → **Cloudflare Worker `round2-book`** (`worker/round2-book.js`) → HitPay → booking written into SimplyBook.
- URL of the engine: `https://round2-book.donttelldadyet.workers.dev` (`/day`, `/quote`, `/checkout`, `/release`, `/done`, `/hitpay`, `/test`, `/selftest`, `/ph`).
- Board preview: `https://raw.githack.com/donttelldadyet-prog/round2sg-home/own-booking/slots/index.html`
- Cloudflare account: the Round2 Google login (donttelldadyet). Deploy = upload `worker/round2-book.js` via the Cloudflare API MCP
  (`PUT /accounts/{id}/workers/scripts/round2-book`, multipart, `keep_bindings: [secret_text, kv_namespace, plain_text, durable_object_namespace, r2_bucket]` – **r2_bucket is needed since 14 Nov or the game-save storage is cut off**; current way to deploy: "How to deploy the engine" near the top).
  The repo file is the source of truth – commit first, then deploy the same file.
- Secrets in the Worker: `HITPAY_KEY`, `HITPAY_SALT`, `HITPAY_API` (all **sandbox** now), `SB_COMPANY`, `SB_USER`, `SB_PASS`
  (SimplyBook user "Booking Bot", made for this). Vars: `DRY_RUN=1`, `SB_PUBLIC_KEY`. Durable Object `HOLDBOOK` (class `HoldBook`) holds unpaid slots.

## Status (as of 30 Oct – SUPERSEDED: all of "Not done" below was finished by the 30 Oct launch or since)
Done and tested (sandbox):
- Own price table `PRICES` at the top of the Worker (NOT read from SimplyBook). Early Bird = 11:00 start, $35 + day rate ÷ 3 per extra hour.
- Peak = Fri–Sun + Singapore public holidays incl. in-lieu days (Google public holiday calendar; `EXTRA_PH` for days Google adds late).
- Free time = SimplyBook gaps of the day's service ∪ Early Bird service (off-peak/peak open 11:15; Early Bird owns 11:00), minus our holds.
- 10-min hold in a Durable Object (no two guests can hold the same time; Vale/Atlas holds block each other).
  Released on back button / "Change booking" / unpaid return / same phone-or-email starting again / timer. HitPay link is cancelled whenever a hold ends.
- Only the first of webhook/redirect creates the booking (`claim()`).
- `DRY_RUN=1`: after payment it does NOT write to SimplyBook yet – it records what it would book.

Not done (in order):
1. **One real booking test with the owner** (`DRY_RUN=0`): does admin `book()` accept end times past 3 h (extensions)? Use a quiet far-off date, then cancel.
2. Write the paid amount + "booked online" in the SimplyBook booking note (SimplyBook will show the base service price).
3. Staff alert (Telegram, like the room-menu scenarios) when a payment couldn't be booked ("refund needed").
4. HitPay sandbox webhook: Developers › Webhook Endpoints › `…workers.dev/hitpay`, event `payment_request.completed` (owner may have done this – check).
5. Board design changes the owner asked for (below).
6. Go-live: owner pastes the live HitPay key/salt into `HITPAY_LIVE_KEY` / `HITPAY_LIVE_SALT` (the sandbox ones stay in `HITPAY_KEY` / `HITPAY_SALT` / `HITPAY_API`), put the board behind the menu's Book button, merge only on approval.

## Payments: live for guests, sandbox for tests – no switch (30 Oct, owner's decision)
- Two HitPay accounts in Cloudflare: sandbox `HITPAY_KEY`/`HITPAY_SALT`/`HITPAY_API`, live `HITPAY_LIVE_KEY`/`HITPAY_LIVE_SALT`.
- Guests always pay live once the live key is in (before that everything is sandbox). Test tools send `TEST_CODE`
  (= the menu's sim code) → that one request uses the sandbox: booking page `?test=CODE` (control centre › Systems › Test
  bench), menu `?sim=CODE` + "Full flow: HitPay sandbox". Each hold/order stores `pay` and is checked/cancelled with those keys.
- Safe mode (control centre › Systems › Switches, needs `SWITCH_PASS` + `SWITCH_PIN`): the booking page shows the SimplyBook
  widget embedded instead, and the engine refuses new holds.

## Food menu payment via Cloudflare (30 Oct) – which keys: see the section above (live = `HITPAY_LIVE_*`, sandbox = `HITPAY_KEY/SALT/API`; never swap them)
Both the booking page and the room menu use the same pair of HitPay accounts. `menu/index.html` (on main) posts to `/menu/checkout`
(re-prices from menu.json like the old Make checkout, keeps the order in the engine, creates the HitPay payment with webhook
`/menu/hitpay`). `/menu/hitpay` and `/menu/return` ask HitPay whether it's paid, then once POST `order`, `details`, `k` (secret
`MENU_MAKE_K`) to Make's [BACKEND] ROOM MENU PAID ORDER, which now reads those instead of its data store + HitPay (filter on `k`)
and does the Drive slip (the kitchen phone syncs that folder and prints it) and the accounting sheet. The engine itself sends the
TV alert (secret `TV_KEY`) and the kitchen Telegram slip (secret `TG_BOT_TOKEN`; until it's set, Make still sends the slip –
Make skips each when the engine says `tv`/`tg` = sent). Pickup-button presses still go to Make's [CONTROL] MADD PAYOUT TELEGRAM. Sandbox orders go with base 0 → slip says
"TEST PAYMENT - DO NOT MAKE", sheet says TEST. Make's ROOM MENU CHECKOUT is switched off (not needed).
Guest messages: all pages go through `/gm` (front door) and the timer is the engine's alarm – see round2-tv-launcher docs/guest-messages.md.

## Booking times – read docs/booking-times.md (30 Oct)
A SimplyBook booking's end = the guest's session end **+ 15 min cleaning** (that's how SimplyBook's own bookings look: 11:00–14:15 for 3 h).
Since 30 Oct the engine books the same way and notes "Guest session HH:MM–HH:MM" in the booking comment. Anything guest-facing
("10 minutes left", "That's a wrap", receipts) uses the SESSION end, before the cleaning time. The engine also confirms each booking
(SimplyBook's own guest bookings are confirmed) and logs in as hello@round2.sg (set 30 Oct) – both to get staff push notifications; not yet re-tested.

## Owner's design feedback (30 Oct) – DONE 30 Oct afternoon (slots/index.html): tier boxes, Early Bird chip (and 'taken'), hour lines, BY ROOM / BY TIME / EARLIEST views
- Early Bird bar is a thin sliver (it's one start time). Show it as its own clear block/chip ("Early bird 11am") that's easy to see.
- Make the bars nicer in the Round2 theme and make different times easier to tell apart (tick marks, hour labels, tier colours).
- If Early Bird is taken, show it clearly (e.g. greyed "Early bird taken") – today you can't tell at a glance.
- Offer more than one view for different guests, e.g. **by time** ("what's free at 8pm?"), **by room** (current bars), **earliest available**.
- Group by tier in boxed, colour-coded sections and say which rooms are in each: Netflix (Vale, Kaeden, Scarlett), Deluxe (Kai, Bella, Atlas), VIP (Maximillion).

## Answers to the owner's questions (so you don't re-ask)
- **Is it dependent on SimplyBook?** Yes, as the calendar/database: free times are read live from SimplyBook, paid bookings are written into it,
  and SimplyBook keeps sending staff app alerts and guest confirmation emails. Prices, holds, payment and the guest page are ours.
- **If we edit/move/cancel a booking in SimplyBook, does the board follow?** Yes – the board asks SimplyBook for free time every time it loads.
- **Vale/Atlas (Atlas is above Vale, wooden floor):** before payment, our system holds BOTH rooms in its own hold store only (nothing written
  to SimplyBook). After payment the booking is written to SimplyBook on the normal services (28/29/32 Netflix,
  33/35/37 Deluxe) and the engine blocks the other room – see "Vale ↔ Atlas mirror runs in the engine" below.

## Decision 30 Oct: Early Bird extensions WITHOUT new SimplyBook services
The Worker books Early Bird on the existing live services 32/33/34 with an explicit end time (e.g. 11:00–15:00 for 3 h + 1 h),
the same way the mirror creates its blocker bookings (admin `book()` with start AND end, no payment step).
The mirror (Make until 11 Nov, now the engine) copies the booking's start/end, so the extended time is blocked too.
So the hidden services 39–44 and add-ons 38–55 are NOT needed – leave hidden, delete later with the owner.
To confirm in to-do #1 (real test booking): SimplyBook accepts the longer end time on 32/33/34.

## Related, already live
- Guest TV messages + control centre (repo `round2-tv-launcher`, Make scenarios 8249444/8251356, `cue.round2.sg`), site stats in Firebase `/web`.
- Hidden SimplyBook Early Bird services 39–44 + add-ons 38–55 exist but were NOT switched on (guest page ignored the 11:00 fixed time).
  Old Early Bird 32/33/34 are live as before. See `docs/simplybook-early-bird.md`.

## Noise rule (8 Nov 2026, owner) – live
- **4+ guests in Max or Atlas → Bella blocked; 4 guests in Bella → Atlas blocked.** Max is never blocked. Reason: noise between the rooms.
- The block is a SimplyBook time-blocked note `SYSTEM BLOCK · NOISE · Max: 5 guests (name) · removed automatically · src b123`
  over the session's whole time (cleaning + extensions included). Screens skip it like every SYSTEM BLOCK.
- Everywhere: online bookings, SimplyBook bookings (guest-count field), control-centre sessions ("5 pax" in the note text).
  A 4+ group paying online also holds the noise room with its ONLINE HOLD note.
- **Other room already booked → the booking still goes ahead (owner's choice) and staff get an alert** (control-centre phone
  alert only – nothing about bookings ever goes to Telegram, owner's rule 14 Nov), once per clash. Cleaning-time overlap alone doesn't count. ZZTEST sessions never alert.
- Engine `noiseSync`: runs on every SimplyBook callback (and again 3–5 min later – a new booking's guest count is saved a
  moment after the callback), straight after an online booking, after In session / Add a session actions, **straight after a
  move (`mvExecute`, 14 Nov)**, every 10 min (tonight + tomorrow), hourly (week ahead) and one day per half hour for 8–91 days
  ahead (10 Nov). 10 Nov bug: a booking's guest count was looked up under the wrong key, so real bookings never blocked. Read-out: gm action `noise` (day, sync=1). System check step "Noise rule".

## Vale ↔ Atlas mirror runs in the engine (LIVE since 11 Nov 2026) – Make is off
- Make "[BACKEND] SYSTEM BLOCKS MIRROR ROOMS" (6990225) was switched off 11 Nov 2026, 8:18pm SGT; kept, not deleted (fallback).
- **Since 14 Nov 4:43pm a NEW twin block is a time-blocked note, not a booking – see the 14 Nov entry at the top.** What follows describes the blocks made before that (still bookings):
- Engine `mirrorOnSb` (worker/round2-book.js), run from `/sb/notify` when engine mode `mirror === 'engine'`: a guest booking in Vale
  makes a SYSTEM BLOCK booking in Atlas (client 2472) and the other way round (client 2476), with the booking's exact SimplyBook
  start and end (cleaning included). It moves and cancels with the booking. Any service: the same kind (off-peak / peak / early
  bird) in the twin, else its off-peak service (`mirSvc`) – no hard-coded service list any more. A failed block alerts staff phones.
- Record per booking: kv `mir:<booking>` = { blk }; Make's old blocks were adopted at switch-over (`mirAdopt`).
- gm action `mirror`: do=status (mode + last 20 log lines) · adopt (fix=1 makes missing blocks) · run&bid= · on / off.
  **Going back to Make = do=off AND switch the Make scenario on again** – with the mode on `make` and Make off, nothing mirrors.

## SimplyBook callback goes through the engine (30 Oct 2026)
SimplyBook's callback URL (Custom features › API) should be `https://round2-book.donttelldadyet.workers.dev/sb/notify/<SB_NOTIFY_KEY>`
(the full address is with the owner; the key is a Cloudflare secret). Since 11 Nov the engine mirrors Vale ↔ Atlas itself (section
above); it only passes the callback on to Make's mirror scenario (secret `MIRROR_HOOK_URL`) when engine mode `mirror` is `make`. Then: cancelled → the online booking drops off "View your
booking" and its pages say "cancelled"; any create/change/cancel → guest messages follow their booking straight away.
The engine's own SimplyBook check is now only a 6-hour backstop plus a check right before each message shows.
"View your booking" also asks SimplyBook for cancellations when a guest searches, so bookings cancelled before this existed
don't show either. To undo: put the Make address (hook.eu1.make.com/qqeq…) back as SimplyBook's callback URL.

## Room food menu: how guests get to it (owner's plan, 31 Oct 2026)
Each room has its own QR code. It opens that room's links page on Wix (e.g. **round2.sg/valelinks**), whose food-menu button
must open the menu **already set to that room**: `https://menu.round2.sg/vale` (same as `https://menu.round2.sg/?room=vale`)
(`kaeden`, `scarlett`, `bella`, `kai`, `atlas`, `max`/`maximillion`). With `?room=` the menu shows in that room's
character colour, is locked to that room (guests can't switch rooms; only test mode `?sim=` can), and the room goes with
the order all the way through: the room TV's "order locked in" alert, the kitchen Telegram slip and the Drive slip that
the kitchen phone prints. Madd Pizza staples that printed slip to the food bag and **drops the bag off on the rack outside
the Round2 entrance** (the shoe rack) – nobody brings food to the room. The TV alert and the menu's thank-you page tell the
guest to collect it there; the room name on the slip is how guests (and staff) find the right bag. Never describe Round2
food as "delivered to your room" (website, blog, menu, TV). Without `?room=` the menu can be browsed but not ordered from ("scan the QR code in your room").
Check each room's Wix links page uses its own `?room=` before printing QR codes.

### 14 Nov 2026 (night) – "why is it only am??" (guest screenshot, Vale Sun 15 → Sun 22)
- Cause: guest was under 24 h before their session (stage `day`: same-day upgrades only), so Sun 22 had **no allowed start**.
  `move/index.html` drew that empty state (`sel.t == null`) as "12am – 3am", "taken from 12:01am" and a wrong total. Continue was
  disabled, so nobody could pay for it – display bug only.
- Fix (page only, commit 527412c): empty state now says why – under 24 h → "only same-day upgrades online, WhatsApp us to move
  to another day" (prefilled WhatsApp link); otherwise "<room> has no free time on <day>" + which rooms are free. No engine change.
- Not done: System check not re-run (session wasn't linked to the browser) – run it next time. Idea: grey out other days in stage `day`.
- Same night, owner: "grey them out and explain why they can't move, find any other bugs" + two screenshots. Page-only (`move/index.html`):
  - Under 24 h: other days are greyed ("locked"), week arrows/Month off, and the note at the top says why + WhatsApp link.
    Under 3 days: a day whose only free times are before 2:15pm says "3+ days" instead of "full"; rooms say why they have
    nothing ("Before 2:15pm only", "Not an upgrade", "Fully booked").
  - The room the guest wants is remembered (`sel.rw`): if it has nothing that day the page says it switched ("Vale has no time
    on Sun 22 – showing Scarlett") and goes back to their room on the next day they tap; it prefers the same kind of room.
  - Hours: the guest's own length (`sel.hw`) comes back whenever it fits – before, one tap on a "max 3h" time left a 4h guest on
    3h for every later time (Ranen's case again). "min 4h" label where only longer fits.
  - "Starts in -2h" during/after a session → "On now · until 5:45pm" / "Session ended". Early-bird bookings no longer read
    "$5 for a bigger room" (theirs is always $15). Done screen no longer says "1 move left / free for 15 min" after ADD HOURS.
    Receipt's "(2nd move +$10 included)" only when it was the guest's 2nd move. Calendar file works for yesterday's booking.
    Back from HitPay unpaid (status ≠ completed, or the hold expired/released) → "That change wasn't paid" instead of
    "Your payment came through… confirming" for 2 minutes.
  - Home button title "RESCHEDULE / ADD HOURS" overlapped itself on phones → "RESCHEDULE + HOURS", proper line height.
- Control centre (round2-tv-launcher `manager/index.html`): a reschedule alert's page said "NEW BOOKING · NO NAME" (the engine
  sends it without `ctx`). The page now reads the alert's own lines: Rescheduled · room, name, Now / Was / Moved by / Paid,
  "Open Rescheduling"; the list row gets the "Changed" tag.
- **Found, NOT changed (engine = needs a deploy + System check; owner to decide):**
  1. `gLogic.why`: ADD HOURS is refused by the 2:15pm lock when the booking itself starts before 2:15pm and is under 3 days
     away (11am early birds included) – adding hours to your own slot shouldn't be "a new time before 2:15pm".
  2. ADD HOURS is refused by the "don't leave an unsellable gap" rule (`deadGap`) – e.g. 3pm–6pm with the next booking at
     9:45pm can't add an hour online. Probably should be allowed: they're paying for the hour.
  3. After 2 moves the page hides the button entirely, though the engine would still allow ADD HOURS (doesn't use a move).
  4. The reschedule push has no `ctx` (bid/ref/times) → its alert page can't show phone/email or "Open In session"; and an
     add-hours alert still says "RESCHEDULED" (page is ready for "HOURS ADDED").
  5. Room cards price the guest's own length even where only a shorter one fits (the ticket below is right).
- System check NOT run for any of this (no browser link this session). Tested on a mock copy with Playwright only.
- 11pm, owner: the receipt must say whether they **moved or added hours**. Page (`move/index.html`, `isAdd(m)` = same day, room
  and start, just longer): booking history line "Hours added: 3h → 4h … no move used"; its receipt is "ADD HOURS RECEIPT" with
  one row "Extra hour (3h → 4h) · no change fee"; the receipt tile says "moved once · hours added"; review screen says "▼ ADDING
  HOURS ▼" and "adding hours doesn't use a move"; done screen "HOURS ADDED!". After 2 moves the button stays hidden (owner: intended).

### 14 Nov 2026, 11:45pm – rescheduling rules, owner's decisions (engine + page + System check)
- **Early birds (owner: "we WANT the early birder to come, but not to reschedule to another day – the slots are prized"):**
  under 3 days an 11am booking is **own day only** (`why` → `sameday`; page greys the other days like under 24 h, with the reason
  and a WhatsApp link). On their own day they can start later (any room) or add hours – $15 + difference to full price; add hours
  no fee. 3+ days away: unchanged (any day, incl. another early-bird slot for $15) – owner hasn't objected, not explicitly confirmed.
- **Everyone:** the 2:15pm rule no longer blocks a time at/after your own start on your own day (it was already allowed under 24 h).
- **ADD HOURS vs the gap rule (owner: option C, "adapt from the room's real bookings"):** `packAfter(e)` packs 3h bookings after
  an end time up to the next real booking; same count after extending → always offered (before, a 2pm booking on an open day
  couldn't add an hour at all); one fewer → offered only if the extra hours ≥ the expected value lost; else `gapadd`: hour button
  says "WhatsApp us" + a note with a prefilled WhatsApp link.
- **Alerts:** adding hours pushes "➕ HOURS ADDED … was … 3h / now … 4h"; reschedule/add-hours alerts carry `ctx` (bid, room, name)
  so the alert page finds phone/email. `/move/api` moves carry `add`.
- **Under-24h wording (owner picked):** "We're getting your room ready! This slot has been kept for you and it's too late for
  another guest to take it, so the day can't be changed online – but you can still upgrade on <day>…".
- System check step "Guest rescheduling: page, rules and fees" tests the three new rules.
- **Engine 0c96804 DEPLOYED 11:50pm** by patching the live script through the Cloudflare API (live hash checked before = 6282673's file, after = this commit's file; module `worker.js`, compatibility 2026-06-01, 27 bindings, 3 timers).
- Booking page "See all rules" now lists the early-bird rule and add-hours; an early bird 3+ days away sees the rule in yellow under their stage.

### 16 Nov 2026, 11:30am – PS4 helpers silent while the PS4s are ON (Bella, Atlas) → helper 1.1.14 released
- Facts (engine `ps4list` through the diag channel, 11:16am): Bella took the quiet-time update 1.1.10 → 1.1.13 at ~10:34am, reported once
  as 1.1.13, last poll ~2 min later, then silent – owner confirmed the PS4 is ON. Atlas (still 1.0.7, last full report 21 h
  earlier) stopped polling at the same time, also ON. Max updated 1.1.8 → 1.1.10 at ~10:36am and stays online (guest playing).
  Vale 1.1.13 silent since ~1:50am, Kai 1.1.13 put to rest by command 1:15am, Scarlett 1.1.10 off since 15 Nov evening.
- NOT known: why. Atlas fits the old wake bug (1.0.7 steps aside on SIGCONT, starter relaunch fails). Bella's 1.1.13 going quiet
  inside the starter's 3-minute trial window is suspicious (roll-back whose relaunch failed?) – only `/data/round2/app/boot.log`
  on the PS4 can say. Nobody has read it.
- **Helper 1.1.14** (branch ps4-helper a199ec7, released on ps4-release; built in this chat with ps4/build.sh – my build of
  1.1.13 had the same size as the released one but not the same hash): each report now carries `up` (helper start, PS4 clock),
  `woke` {n, at, sleptS} (a 2 s sleep that returns >90 s late = the PS4 was in rest mode; reports ~12 s after the wake) and
  `log` {boot: last 8 lines of boot.log, stopped: last 3 of helper-stopped.txt}. No signal handler added. The engine stores
  the whole report, so no engine change. **Untested on a real PS4** – first one to take it: watch its tile.
- Control centre › TVs › PS4s: a helper that went silent right after our own `/_rest` job shows "😴 Rest mode · sent by us";
  other silent ones say what it can be and what to do; 1.1.14 tiles show "Last woke from rest … slept …", "Helper running
  since …" and a fold-out "Helper log".
- Still can't be told apart from far away: rest mode by controller/auto-timer vs. power off vs. helper stopped (the helper is
  frozen before it can say anything). Idea not built: when a helper goes silent, have a live one ask it with `/_ddp.<ip>`
  (on / standby) automatically.
- **16 Nov midday, results.** Bella (restart + jailbreak 11:36) and Scarlett took 1.1.14 and stay online. Bella's log (first use
  of the new `log` field): 10:33:02 "helper 1.1.9 stopped by signal 19" (the wake), and the starter's hourly line at 11:33 said
  "helper running" while nothing had polled for an hour → 1.1.13 was **alive but stuck**, not dead (cause unproven; guess: a
  network call that never returned, right after the wake, weak Wi-Fi). Idea not built: a time limit on every network call (1.1.15).
- **Kai wake test (owner woke it ~12:00 from the rest mode sent at 1:15am):** helper 1.1.13 kept running through the wake – no
  restart, no jailbreak (starter 12:00:26 "hourly: helper running") → **the 1.1.13 wake fix works on a real PS4.** It polled
  from 12:00 but sent its first full report only at 12:14 (reports every 15 loop-minutes; a wake didn't trigger one before
  1.1.14), then took 1.1.14 by itself at once ("said hello – kept"). Auto-update needs a report < 20 min old – that is the delay.
- **Clean-up sizes (owner: "why do they grow back, nanoDNS blocks updates"):** Kai idle for 30+ min after waking: downloads
  (1 stuck patch CUSA52342, 1,074 MB), captures (104 files, 136 MB) and free space (140.4 GB) identical to 1:15am → an idle PS4
  doesn't grow. Stuck downloads are mostly exactly 1,074 or 268 MB → looks like reserved space for queued patches that never
  arrive (unconfirmed). Owner says automatic downloads and trophy clips are OFF on all PS4s. Next test: open games on Kai and
  see whether a new stuck download appears.
- Control centre › PS4s tiles redone (owner: "too convoluted"): one long tile per room, state + one line of numbers + problems
  on the left, buttons on the right, everything else under "More".
- **Max 2:12pm: update 1.1.10 → 1.1.14 stuck on "switching"** (owner). Max's log (1.1.14's `log` field): the old helper downloaded
  1.1.14 and wrote the switch, but never let go – starter 14:14:20 "switch waiting: the old helper still holds the lock after 2
  minutes". Owner restarted Max → 14:15:43 starter 2 started, finished the half-done switch, 1.1.14 said hello. One starter
  (restart, not a hand-sent payload). Same family as Bella (alive but stuck); also seen on Max 13 Nov.
- **Helper 1.1.15** (ps4-helper 2d724b6, released ps4-release e5c4297, built with ps4/build.sh, sha 4ede8fac…): (1) when switching it
  writes the switch and LETS GO of the lock first, then reports + pop-up (before: report + pop-up while still holding on);
  (2) every network connect has a 10 s limit per address and sends 20 s (tls/r2tls.c `r2_connect`; reads already 15 s).
  No signal changes (1.1.13's wake fix kept). Owner: "push an update, the auto-updater picks them up in quiet time" – no
  room updated by hand. Note: rooms still on 1.1.10–1.1.14 may stick once more on THIS hand-over (old code); a restart clears
  it. System check before and after: 39 passed, 2 to look at (watchdog 7am-rule places, Kaeden TV offline), 0 failed – the
  earlier "side timer 57 requests" bad no longer shows.
- **Kai game test (owner, 3:29pm):** opened FC 26 + Overcooked 2. No new stuck download; FC 26's old one (CUSA52342,
  download0.dat exactly 1 GiB, queued 13 Nov 9:47pm) got its time touched at 3:29pm = the PS4 retries the queued patch when the
  game opens and the blocker stops it. Notifications › Downloads on Kai shows NO entry. Clean-up test (does it come back after
  Clean up + opening FC 26?) still to do – owner presses Clean up (my ps4clean call wasn't approved here). Max: CUSA48576 =
  WWE 2K25 (11.5 GB stuck), GT Sport 5.4 GB (patch 01.69 is its last – a leftover; leave alone).
### 16 Nov 2026, 3:40–4:30pm – helper 1.1.16: read a file on a PS4 + remote blocker (nanoDNS) settings (owner: "do both in 1.1.16")
- **Helper 1.1.16** (ps4-helper 2f67eff, ps4-release 78bc916, sha 79c095fe…, 1,142,096 B): look `/_tail.<file>|<lines>`
  (read-only, last ≤200 lines/24 KB, lines ≤280 chars, only .log/.txt/.ini/.prev/.ver under /data/round2, /data/nanodns,
  /data/GoldHEN) · look `/_ps` (pid → comm|thread name – tells us the blocker's process name, unknown so far on PS4) · job
  `dns` {sha}: refuses (changes NOTHING) unless exactly one process named *nanodns* is found, nanodns.elf is found (GoldHEN
  payloads.ini, else /data/payloads/) and BinLoader 9090 answers; downloads POST /ps4/dnsini, checks SHA-256 + the same rules
  as the engine, keeps nanodns.ini.prev, writes via .new + rename, SIGTERM (then SIGKILL) the old nanoDNS, launches it through
  BinLoader, tests ≤25 s (Sony update name must be 0.0.0.0 AND engine resolves + /time 200); else copies .prev back, restarts,
  retests, reports "rolled back" (+ "CHECK THIS PS4" if the old one isn't confirmed). Report has `dns:{sha (12), prev}`.
  r2tls: remembers each host's last good address in /data/round2/addr-<host>.txt and uses it when DNS fails or answers
  0.0.0.0 (a bad blocker file can't cut the helper off). **Untested on a real PS4.** First real use: read a file + /_ps on one
  room; only then try a dns change on a free room (Kai) with the Round2 standard file (sha 3eeb2b5a…).
- **Engine d8156e8 DEPLOYED** (27 bindings incl. R2 SAVES, 3 timers; live source hash = main): staff `ps4dns` (ini, dry=1 check;
  send needs confirm=SEND, ids comma list, refused per PS4 if offline / helper < 1.1.16 / guests within 10 min), `ps4dnsget`
  (last sent + change log, kv ps4dns:cur / ps4dnslog / ps4dnsini:<sha16>), POST `/ps4/dnsini` (PS4 key). Look values for
  `tail/…` and `dns/…` keys keep 300 chars (others 40). No owner-only key exists – staff code + typed SEND is the gate.
  Rules (both sides): 40–8192 bytes, no control chars (UTF-8 comments OK – the standard file has "–"), [overrides] only
  =0.0.0.0 and must include `*=0.0.0.0`, [exceptions] nothing with playstation/sony/psn/akamai/akadns/edgesuite/edgekey/llnw/
  scea/scee/sie-, no catch-alls (*, *.com), must include round2-book.donttelldadyet.workers.dev, bind=127.0.0.1, bind6 ::1/off,
  log path fixed, upstream servers as numbers. Tested on 8 files (helper C + engine JS agree).
- **Control centre (round2-tv-launcher 90766ae)** › PS4s: "📄 Read a file on a PS4" (room, file, lines → shows the lines) and
  "🛡️ Blocker settings" (Load last sent / Round2 standard, Check, tick rooms, type SEND, change log); tile More shows the
  blocker settings sha. New System check step "PS4 blocker settings: bad files refused, nothing sent (dry run)". systems.json:
  save steps done 16 Nov + "PS4 remote tools" (test).
- System check before: 37 passed · 3 to look at · 1 failed; after: 38 · 3 · 1 (the new step passes). The failed one = "side"
  timer at 50 outside requests (pre-existing, not from this); new warning today: SimplyBook 6,805 requests (biggest
  /day › getAvailableTimeIntervals) – from the booking-page work in the other chat? needs a look.
- **4:45pm first real 1.1.16 reads (Kai, took 1.1.16 at 3:50pm):** `/_ps` lists ~60 system processes but **no nanoDNS, no
  helper, no starter** – payloads sent to BinLoader don't get their own named process (GoldHEN's loader shows as threads
  "GoldHENLoader" in ScePartyDaemon pid 45 and "GoldHEN_BinLoade" in SceCloudClientDaemo pid 49; our payloads probably live
  inside such a host process – unproven). So the `dns` job will safely refuse ("its program not found by name", nothing
  changed). Kai payloads.ini: `/user/data/payloads/nanodns-ps4.elf = 1`, `/user/data/payloads/round2-boot.elf = 1`.
  nanodns.log 289 KB; last 200 lines = only Sony names, all blocked (event.api.np.km, ps4-system.sec.np.dl, ps4updptl.uk.np.
  community, rnps-crl.dl – all *.playstation.net → 0.0.0.0) + the engine allowed. The 3:29pm game-test lines are too far back for
  a 24 KB tail → idea: a search/filter option on "Read a file". Remote blocker change needs another way (proposed: apply at the
  next restart + helper tests at start and reverts by itself) – owner to choose.
### 16 Nov 2026, 5pm – where the payloads live, why the blocker can't be restarted, and two ways out (owner: "B first", then "yes lets try" + "own program?")
- **Helper 1.1.17** (released, on Kai; clean hand-over): look `/_sock` (which program holds which port) and `/_thr.<pid>`
  (threads; returned errno 2 for pid 45 – not working yet). **Result on Kai (9.00, GoldHEN 2.4b18.12):** DNS 127.0.0.1:53 is
  held by **pid 45 = ScePartyDaemon** – and so is the helper (getpid 45) → **nanoDNS, round2d and round2-boot all run as
  threads inside ScePartyDaemon** (GoldHEN's payload host). BinLoader 9090, FTP 2121 and klog 3232 are in pid 49
  (SceCloudClientDaemo). So: no own pid, signals hit all three (this is why SIGCONT at wake stopped the helper), and the
  blocker can't be stopped alone. nanoDNS re-opens its socket if it is closed (read in its code) → no live restart possible.
- **GoldHEN is closed source** (README: source private) – nothing to read; only its behaviour can be measured, as above.
- **Own program IS possible in principle:** ps4-payload-dev/elfldr (John Törnblom, GPLv3, same family as the SDK we build
  with) starts each payload in its OWN process: rfork → execve of a system daemon binary (SceSpZeroConf) → ptrace attach →
  load the ELF into it → raise its rights (authid 3801000000000013, as our helper has). SDK has 9.00 + 11.00 offsets;
  elfldr.c + pt.c compile with our toolchain (tried). Unproven under GoldHEN on our PS4s; a wrong step can crash
  ScePartyDaemon (helper + blocker + starter gone until restart + jailbreak) or panic the PS4 → test only on a free room with
  the owner there. If it works: starter spawns helper and blocker as own programs → live blocker restart (kill + start),
  helper can be restarted remotely, a crash in one doesn't take the others. **It does NOT give remote wake:** in rest mode
  every program is frozen whichever process it is in; only the PS4's standby chip listens (paired-device wake, power button).
- **Round2 blocker built (ps4-helper bbb5756, `ps4/nanodns/main.c`, out `nanodns-r2.elf` 108,792 B, NOT released, on no PS4):**
  nanoDNS 0.4 (upstream fc48a51) + settings reload: checks the file once a second, change must be stable for two checks,
  refused (current settings stay) if unreadable or no override rule or no upstream; bind/log changes need a restart.
  Computer test (Makefile.host, port 5354): add an exception → applied in ~3 s; file without the block rule → refused; file
  deleted / random bytes → refused, still blocking; good file back → applied. Still to build: delivery (helper downloads it,
  sha-checked, swaps the AutoRun file `/user/data/payloads/nanodns-ps4.elf` keeping the old one; active after the next
  restart + jailbreak) and making the `dns` job use "write file → wait for reload → test" when the blocker is the Round2 one.
- Nothing live changed in this block except helper 1.1.17 (read-only additions).
- **5:12pm – OWN PROGRAM WORKS on Kai (9.00, GoldHEN 2.4b18.12), owner chose "1".** Helper **1.1.18** (ps4-helper, released
  ps4-release 6f66139, sha e556a000…, 1,242,120 B): `ps4/spawn/` = elfldr.c + pt.c from ps4-payload-dev/elfldr a481740
  (GPLv3+; pt_attach retry and every waitpid bounded, log → /data/round2/own-spawn.log) + `r2spawn.c` (bootstrap-elf.c's
  preparation: find the ptrace check pattern "48b836…0f84190200004c8b" (+22) and NOP it, QA flags[1] |= 3, raise this
  program's caps/prison/rootdir/jaildir for the spawn, then put them back). Look `/_own` spawns the built-in test payload
  (`ps4/own/main.c`, writes /data/round2/own-test.txt every 5 s for 3 min); `/_kill.<pid>` only for that pid.
  **Result:** log: ptrace check found + switched off, QA flags 0x00 → 0x03, "spawn returned 208", rights put back. `/_ps`:
  208 = "Payload|SceSpZeroConfMai" (helper still 45, parent 38). own-test.txt counted 5 s … 120 s. `/_kill.208` → gone; helper
  kept polling, port 53 still held in 45, Sony blocked. In-memory changes on Kai until its next restart: ptrace check off,
  QA flags[1]=3 (GoldHEN had them at 0). Not tested: 11.00 · a payload that uses PS4 system libraries (our helper: UserService,
  RegMgr, SystemService, NetCtl, FsInternalForVsh – a spawned program is a "daemon" and may not load app libraries) · nanoDNS
  as own program · rest mode → wake with an own program running · a game starting while one runs.
  **Next (proposed):** `/_own` variants on Kai: (a) stock nanoDNS can't run twice (port 53) → build "starter 3" that spawns
  the blocker and the helper as own programs, tried first by hand-loading on Kai (AutoRun untouched), then rest/wake + game
  tests, then 11.00 (Vale), only then AutoRun. All rooms take 1.1.18 in quiet time – its spawn code only runs on `/_own`.
  System check before and after: 38 passed · 3 to look at · 1 failed (same; the failed one = side timer at 50 requests, not from this).
- **5:26pm – THE REAL HELPER RUNS AS ITS OWN PROGRAM on Kai (helper 1.1.19, ps4-release 4139036).** Owner said ok to
  "starter 3"; first a cheaper test with no owner work: look `/_selfown` → the helper (pid 45) reads app/current.elf, spawns
  it as an own program, writes /data/round2/own-helper.pid, lets go of the lock and watches 3 min for /data/round2/own-ok
  (written by the copy after its first 200 report; else it kills the copy and the starter relaunches a normal helper).
  Helper knows it is "own" when own-helper.pid = its pid (`g_own`; then step_aside really exits). Report has `pid`, `own`.
  **Result:** own-spawn.log: spawn returned 209 → "the copy reported to the engine - hand-over done" (15 s). ps4list: pid 209,
  own 1, full report (temp, Wi-Fi, 40 games, Sony blocked). In own mode also OK: `/_profiles` (registry + user service, all
  6 profiles), `/_save.12ae5b2a.CUSA34284.SaveData` (key service + save mount read-only: opened, listed, closed 0), `/_tail`.
  → the "spawned programs can't load app libraries" worry did NOT bite for our helper on 9.00.
  To check: report said captures 21 MB / 104 files (earlier 136 MB / 104) – real change or a counting difference in own mode?
  Kai now: helper = pid 209 (own) until the next helper update or PS4 restart (then back to the shared way); an idle old
  helper thread sleeps in 45; blocker + starter still in 45. Still to test with the owner at Kai: a game opened/closed, remote
  rest (`/_rest` from own mode) → wake. Then: starter 3 (spawns blocker + helper as own programs; falls back to BinLoader),
  11.00 (Vale). System check after 1.1.19 + the test: 38 passed · 3 to look at · 1 failed (unchanged).
- **5:33–5:37pm own-program helper (pid 209) on Kai: game + rest/wake PASSED.** Owner opened/closed God of War → still pid
  209, polling. `/_rest` from own mode worked (Kai silent 5:33:44pm); owner woke it 5:37pm → pid 209 polling again, no
  payload. BUT the wake wasn't flagged (no `woke` in the report): after our own remote rest the freeze isn't inside the
  measured 2 s sleep. → **Helper 1.1.20** (ps4-release fcbeaf9): wake also detected by wall clock vs CLOCK_MONOTONIC drift
  (> 60 s; `woke.via` = "sleep" | "clock" – unproven that the monotonic clock stands still in rest mode), and a **pop-up after
  every wake** (owner asked): "Round2 helper <v>: awake after rest mode - running and connected" / "... can't reach Round2
  yet". Kai took 1.1.20 at 5:39pm: the own-program helper exited cleanly on the update, starter relaunched it the shared way
  (pid 45, own 0). Pop-up not seen yet – owner to rest/wake Kai by controller.
- ⚠️ **5:45pm – SimplyBook requests today: 10,161 (yesterday 5,100; guideline ~5,000, "hard stop" ~10,000).** System check
  now fails on it. Breakdown (gm auto › sbBy): /day getAvailableTimeIntervals 2,002 · **gm late 984 + 925 · gm latecancel
  434 + 386 · gm extend 305 + 275 · gm insess 234** (= the System check's test-night steps) · cron ~800. Count went
  6,805 (4:27pm) → 9,584 (5:43pm) across 4 System check runs ≈ **~650 SimplyBook requests per run**. This chat ran the check
  8 times today (before/after each helper/engine change: 2:25, 2:28, 3:42, 4:27, 5:08, 5:14, 5:29, 5:41pm) ≈ half of today's
  total. No refusal from SimplyBook seen yet (5:43pm run's add/cancel steps passed; engine `auto.last.problems` empty).
  **Decision here: NO more System check runs today from this chat; PS4 jobs kept to a minimum.** To fix (owner to agree):
  the "before and after every change" rule + ~650 requests a run doesn't fit SimplyBook's allowance → (a) a light System check
  for changes that can't touch bookings (PS4 helper, control-centre-only): skip the test-night steps; (b) the test-night steps
  reuse one bookings/notes fetch; (c) the check shows "today's runs: n" and warns before a run that would pass ~5,000.
### 16 Nov 2026, 6–6:30pm – LIGHT CHECK built (owner: "yes build a mini system check that doesnt ping simplybook") + remote-wake research
- **Control centre › System check has two buttons** (round2-tv-launcher f91b69a, c665b89, 373f0eb): **Light check (no
  SimplyBook)** runs only the steps named in `LIGHT_OK` (engine + keys, one clock, 7am rule + watchdog, timers, today's
  SimplyBook count, food menu, TVs, PS4 helpers + storage, PS4 blocker settings, TV setup save, key expiry, public pages) and
  ends with "Light check: no SimplyBook requests made by this run" (compares the engine's per-caller counts `sbBy` before and
  after; timers' own requests are set aside). No clean-up call in light mode. **Full check** unchanged, but asks first when
  the day is past 4,000 SimplyBook requests and says it costs ~650. New steps are NOT in the light check until added to
  `LIGHT_OK`. Rule written into both CLAUDE.md files + round2-tv-launcher docs/system-check.md: light for changes that can't
  touch bookings (PS4 helper, TV app, control centre), full for bookings/notes/messages/payments/engine booking code.
- Found by the light check's own last step: staff `auto` cost 2 SimplyBook requests a call (it loads the session list) →
  **engine 6a0cf81 DEPLOYED** (27 bindings incl. R2, 3 timers; live was = main a912159 before): `auto` with `lite=1` returns
  heartbeat + counters only. And the 7am-rule step opens late/ hidden, which loaded its list (1 request) → late/index.html
  skips the list when opened with check=1. Engine's SimplyBook day count = `sbn:<SG date>` (resets at Singapore midnight; when
  SimplyBook's own allowance resets is not known). 6:20pm: 10,273 today.
- **Remote wake – how the references really do it (read: dhleong/ps4-waker, dhleong/playactor, chiaki-ng lib/src/regist.c +
  discovery.c; owner: "willing to commit to this feature"):**
  - Two kinds of wake key, both only accepted from a device the PS4 has REGISTERED:
    (C) Second Screen: ps4-waker pretends to be a PS4 so Sony's phone app hands over the account's credential, then logs in
    to the real PS4 on TCP 997 with the PIN from Settings › Mobile App Connection Settings › Add Device (LOGIN result 20 =
    PIN needed). Needs Sony's app + a PSN account → not for us.
    (R) **Remote Play: chiaki registers straight with the PS4** – HTTP POST to the PS4's port 9295 (`/sce/rp/regist` up to
    firmware 9.x, `/sie/ps4/rp/sess/rgst` from 10.00), body encrypted with a key made from the 8-digit PIN the PS4 shows at
    Settings › Remote Play Connection Settings › Add Device, carrying the profile's account ID (base64 of the 8 bytes,
    little-endian). The PS4 answers with RP-RegistKey. Wake = UDP 987 `WAKEUP * HTTP/1.1 / client-type:vr / auth-type:R /
    user-credential:<regist key as a number>`. **No Sony server is involved** – only the PS4 and the registering device.
  - Why it should work on our PS4s: GoldHEN lists "Remote Play Enabler"; a public guide registers chiaki on jailbroken 9.00
    with an Apollo offline-activated account (no PSN) by exactly this route; Kai's SceRemotePlay already listens on 9295
    (seen in `/_sock`). Our 15 Nov test failed because we sent a type-C key that no device had ever registered.
  - Plan: (1) owner checks on Kai, signed into User5 (the profile with an ID): Remote Play Connection Settings › Enable
    Remote Play on, Add Device shows an 8-digit number. (2) Helper learns to register (port of chiaki's regist + rpcrypt,
    AGPL-3.0, on our mbedTLS) from another PS4: `/_rpreg.<ip>.<account id>.<pin>` → regist key kept by the engine; and
    `/_wake` type R. (3) Test: Vale registers with Kai, Kai to rest, Vale wakes it. (4) If it works: helper makes the PIN
    itself (PS4 library call sceRemoteplayGeneratePinCode – to try) so no typing; a wake-key profile per PS4 (mains without an
    ID stay untouched); and decide the always-on sender for mornings (all PS4s asleep = nobody to send): candidates = a room
    TV app that stays alive in standby, one PS4 left on, or a small always-on device.
- **6pm owner on Kai (User5): Remote Play Connection Settings › Add Device SHOWS the 8-digit number** (no PSN demand) → gate
  passed. "Connect Directly with PS Vita/PS TV" stays off (not needed).
- **Helper 1.1.21** (ps4-helper, ps4-release 2ed6105; Kai on it 6:05pm): `ps4/rp/` = chiaki-ng `rpcrypt.c` unchanged
  (43728af, AGPL-3.0-only + OpenSSL exception, built with CHIAKI_LIB_ENABLE_MBEDTLS on our mbedTLS) + `r2rp.c` (regist.c's
  steps: UDP 9295 "SRC2" → "RES2"; POST /sie/ps4/rp/sess/rgst, RP-Version 10.0 = chiaki target PS4_10 for firmware 7+;
  0x1e0 filler with the aeropause at 0xc7/0x191, inner header "Client-Type: dabfa2ec…\r\nNp-AccountId: <base64 of the 8
  registry bytes>" encrypted with the PIN-derived key; reply decrypted → PS4-RegistKey (hex of the text key), RP-Key,
  PS4-Nickname, PS4-Mac). Look jobs: `/_rpreg.<ip>.<16-hex account id as in the registry>.<8-digit number>` → rpreg/key …
  (full line in /data/round2/rp.log); `/_wakerp.<ip>.<key>` → SRCH, WAKEUP ×3 (client-type vr, auth-type R, model w,
  app-type r, user-credential = key as a decimal number), SRCH after 25 s. Untested. Kai User5 account bytes
  523261706f6c6c6f. Not built yet: PIN made by the helper (sceRemoteplayGeneratePinCode), storing keys in the engine,
  control-centre buttons. Wake test needs a 2nd awake PS4 on 1.1.21 as sender: Scarlett refused the update (guests till 8pm),
  Vale/Bella off, Max/Atlas guests.
- 1.1.20's wake pop-up/detection: Kai's report shows woke n=1, slept 134 s, via "sleep" at 5:46pm (owner rested/woke it by
  controller).
- **6:07pm first try (number 43988587): helper 1.1.21 DIED with signal 10 (SIGBUS) the second it took `/_rpreg`** –
  starter relaunched it 5 s later (owner saw GoldHEN "payload received" = that relaunch) and Kai's Add Device screen showed
  error CE-35398-8 (Sony: "could not connect to your Remote Play device" = our half-made attempt). Cause: stack alignment –
  the new files were built without `-mstackrealign` (the spawn files had it). **1.1.22** (ps4-release c3fc1ee): every Round2
  helper file built with -mstackrealign, registration logs each step to /data/round2/own-spawn.log.
- **6:13pm – REGISTERED. Kai (9.00, GoldHEN, offline-activated User5, no PSN) accepted the Remote Play registration from our
  own helper** (to itself, 192.168.88.18, number 63771066): search answered → sent 157 + 587 bytes → "HTTP/1.1 200 OK", 305
  bytes → decrypted 239 → **PS4-RegistKey 83ba890f** (wake credential as a number = 2210040079), RP-Key
  0865941891647e3801071a134368530b, nickname PS4-545, MAC bc60a7e246e8. So chiaki's method + our mbedTLS port are right, the
  account ID is the 8 registry bytes as stored (523261706f6c6c6f → base64), and a PS4 can register with ITSELF.
  Kai rested by `/_rest` at 6:14pm for the wake test. No second PS4 free as sender → owner sends the WAKEUP from his laptop
  (PowerShell UdpClient, 3× to 192.168.88.18:987: "WAKEUP * HTTP/1.1\nclient-type:vr\nauth-type:R\nmodel:w\napp-type:r\n
  user-credential:2210040079\ndevice-discovery-protocol-version:00020020\n"). Result: see next entry.
- chiaki-ng's "console must be on the latest firmware" (owner's link, setup/remoteconnection) is only for connecting from
  outside through PSN – not for local registration.
- **6:22pm – REMOTE WAKE WORKS.** Kai in rest since 6:14pm (461 s); owner pasted the PowerShell line on the laptop → Kai
  switched itself on. Helper resumed by itself (woke via "sleep", report 6:22:53pm). After a network wake NOBODY is signed in
  (report users []): the PS4 waits at "press the PS button", then offers the profiles (User5 first = last used). Main
  profiles do NOT need activating for this.
- **Helper 1.1.23** (ps4-release ff651c4, on Kai 6:26pm): after a wake, if nobody is signed in, `sceUserServiceLogin(auto_login
  profile)`; report `woke.login` = result (1 = someone already in). Kai rested again 6:27pm for wake test 2 (owner pastes the
  line again). Result: next entry.
- Owner asked (6:27pm): (a) activate the main profiles so they can register? → no need (any one profile with an ID per PS4
  is enough – the key wakes the console, not a profile) and it would harm: a profile's saves are stamped with its account
  ID, changing it makes the game call them corrupted (13 Nov test on Max) – never on Max/Kai/Atlas mains (GT Sport!).
  (b) sync saves in rest mode? → not while resting (helper frozen), but wake → helper prepares → the guest presses PS and
  sees "Kai, Aliff, Karen": remote wake makes the member-profile prep triggerable from the booking (needs the always-on
  sender).
- **6:32pm wake test 2 (laptop sends): Kai woke, helper 1.1.23 signed the main profile in by itself** – report woke.login 0,
  users ["Kai"]. **6:38pm wake test 3 – FULLY REMOTE, PS4 → PS4:** Kai rested by `/_rest` (6:35pm); Vale (updated 1.1.13 →
  1.1.23 by Update now, clean) ran `/_wakerp.192.168.88.18.83ba890f`: before "620 Server Standby", WAKEUP ×3, after 25 s
  "200 Ok"; Kai's helper: woke 6:38:29pm (slept 151 s), login 0, users ["Kai"]. No laptop, no controller.
  State: Kai awake on 1.1.23, registered (key 83ba890f via User5). Vale awake on 1.1.23. Atlas (1.0.7) + Bella (1.1.14) are
  switched on per the owner but their helpers have been silent since ~6:21 / 6:23pm (Atlas 1.0.7 = old wake bug; Bella 1.1.14
  = the "alive but stuck" one, fixed from 1.1.15) → need a restart + jailbreak to pick up the new helper.
- Owner 6:31pm asks for a save test between an activated profile (User5) and a new "game save test" profile on Kai, because
  Bella's main is activated. Facts: activated → not activated is already proven with OUR method (16 Nov: Vale's Valentine,
  activated, → Kai User3, not activated – the restore keeps the receiving save's own sce_sys/param.sfo, so the stamp always
  matches the receiver). User5 has no saves; the helper can't create profiles (owner makes "User6" on the PS4, helper renames
  it); restore still needs an existing save of the game in the receiving profile (step 3 not built).
- ⚠️ **6:42pm BUG from 1.1.23's auto sign-in (owner):** after the remote wake the helper signed "Kai" in (login 0) while the
  PS4 still showed its own "press the PS button" screen; when the owner switched the controller on, that screen could not be
  left. `sceUserServiceLogin` at the login screen = profile in at service level, shell UI stuck. **Helper 1.1.24** (ps4-release
  2725793; Kai + Vale on it 6:45pm): no automatic sign-in after a wake (`woke.login` −2). Only Kai and Vale ever ran 1.1.23.
  Un-stick: Kai rested by `/_rest` 6:46pm → owner wakes it by controller. To do properly later: get past the shell's login
  screen the shell's own way (find what the PS button press calls), or sign the wake-key profile out before rest and test
  what the PS4 shows; until then a remotely woken PS4 waits at "press the PS button" – fine for prep work (helper runs,
  nobody signed in), a guest/staff presses PS and picks the profile.
- 6:55pm owner woke Kai by controller → normal again (1.1.24).
- **Owner decisions 6:55–7:02pm (change earlier rules):** each PS4 = **main profile + 4 others** (5 in all; 4 controllers,
  friends get their own names in co-op); the helper can't create profiles, so the 4 others are permanent slots that get
  renamed. **The wake key should sit on the MAIN profile** (consistent, no extra profile) → main profiles get an account ID
  after all; **all main profiles may share ONE ID** (offline anyway). Guest saves on the room PS4s may be wiped ("clean
  slate"; "kai's ps4 can delete all saves if needed") – back up a session's saves to the cloud first. The earlier rule "main
  profiles are never activated" is lifted by the owner for this; still untouched until proven: **Max (unlocked GT Sport save)**
  and the three Vue rooms' existing IDs (Vale/Scarlett/Bella – their Vue jailbreak used an Apollo-activated account).
- **7:10pm test on Kai started:** main "Kai" 12ae5b27 has 139 saves in 45 games (3.6 GB of images). Backed up (0 failed):
  Overcooked 2 CUSA10870 METASAVE, CAMPAIGNSAVE0/1/2, DLC8CAMPAIGNSAVE0 and Moving Out 2 CUSA34284 SaveData + sce_bu_SaveData
  → saves/f6ed105a…/12ae5b27/<title>/<save>/<stamp>. Then `ps4prof acct` on the main profile: **account ID
  52326d61696e3031 ("R2main01") set, result 0** (proposed shared ID for every main). Kai still signed in. Next: owner
  restarts Kai + jailbreak (the PS4 may keep the old ID until then) → open Overcooked 2 as Kai: loads or "corrupted"? If
  corrupted: try restoring the backup into it / delete + new save + restore. Then register the wake key through the main
  profile (Add Device as Kai) and repeat the wake.
- **7:15pm owner asked for a remote restart of Kai.** Helper **1.1.25** (ps4-release 843decc): look `/_reboot` →
  `sceSystemStateMgrReboot()` 3 s after the reply (refused with a game open; logged in rest.log). **Not run:** Kai could not
  take 1.1.25 – twice "download size 1047979, expected 1260864" (GitHub serves the full file, sha ok). 1,047,979 + headers
  = the 1 MB step of the download buffer → growing it to 2 MB failed = **the shared program on Kai is out of memory**: every
  helper update leaves the old helper asleep inside ScePartyDaemon (step_aside never exits there) and Kai has had ~14 updates
  since its last restart. A PS4 restart clears it. Lesson: many updates in one sitting exhaust the host; the own-program
  starter (helper really exits) is the cure; until then restart a PS4 after ~10 helper updates. `/_reboot` untested.
- **7:19pm owner restarted Kai + jailbreak; 7:21pm: "Overcooked 2 doesn't throw me a corrupted game save error".** Checked:
  starter + helper fresh since 7:19pm, main profile still has account ID 52326d61696e3031 (login flag 6, np), Overcooked 2
  (CUSA10870) was played. → **Giving a main profile an ID does NOT break its existing saves (no ID → ID), even after a
  restart.** (13 Nov's "corrupted" was the other way: a save made/stamped under an ID, then the ID removed.) So Kai/Atlas/Max
  mains can get the shared ID without wiping – still test GT Sport on Max with its cloud backup at hand before relying on it.
  Next: wake key through the main profile (Add Device signed in as Kai), wake test, then decide what to do with User5's key.
- 7:25pm owner: Overcooked 2 shows the OLD progress (about stage 2-6) → confirmed, saves intact under the new main ID.
- **7:26pm Kai registered through the MAIN profile** (Add Device as "Kai", number 72806180, account 52326d61696e3031):
  **regist key e55667bb** (RP-Key ec18392dd5814c1f0c7c877f87452535). **7:33pm wake with it, Bella → Kai** (Vale's job was
  refused – guests till 10pm; Atlas + Bella were restarted by the owner and took 1.1.25 by themselves): 620 Standby →
  WAKEUP ×3 → 200 Ok; Kai's helper woke 7:33:15pm (slept 276 s), nobody signed in (as expected without auto sign-in).
  Kai now holds two keys (User5's 83ba890f, main's e55667bb); whether the old one still works was not checked.
  Kai on 1.1.25 (updates work again after the restart). Rooms on 1.1.25: Kai, Atlas, Bella; Vale 1.1.24; Scarlett 1.1.15,
  Max 1.1.14 (guests).
### 16 Nov 2026, 7:40–8pm – remote wake becomes a feature (trial): keys in the engine, buttons, early-bird morning wake
- Owner: wake ONLY works from rest mode (a PS4 switched off / power cut needs a manual start + jailbreak). Trial rule (7:40pm):
  "in the morning we turn on the first room that has bookings" → that PS4 wakes the rooms with an EARLY-BIRD booking.
  Also asked: phone as the wake sender when on the shop Wi-Fi → NOT possible (a browser page can't send the UDP wake);
  wakes go through an awake PS4. Buttons wanted: wake all, wake early-bird, sleep all.
- **Engine 5e7a1bc DEPLOYED** (27 bindings incl. R2, 3 timers; only my two commits since 6a0cf81): kv `ps4wake`
  {console: {key, mac, acct, at}} – filled automatically when a `/_rpreg` look job returns `rpreg/key` (matched by the address
  in the job) or by staff `ps4wakekey`; staff `ps4wake` id=<console> | `all` | `early` → picks an awake, linked PS4 with helper
  ≥ 1.1.21 as sender, look job `/_wakerp.<sender subnet>.255.<key>;…` (broadcast, so DHCP changes don't matter; job skips the
  guests check – `nobusy`); `early` = sessions today starting 11:00 (one sessDay look = 2 SimplyBook requests per press).
  **Morning trial** `ps4MorningWake` in the helper poll: 7:00–11:15am, once a day (kv `ps4wakeRun` {day, by, rooms, booked,
  note}), only from a PS4 whose helper started or woke within 15 min (so one left on overnight doesn't fire at 7am), wakes
  early-bird rooms that have a key and are asleep. ps4list carries `wake` per PS4 and `wakeRun`.
- **Control centre 6368df4:** PS4s › buttons "⏰ Wake early-bird rooms", "⏰ Wake all", "😴 Sleep all" (rest mode to every PS4
  that is on; rooms with guests / a game open stay on), "⏰ Wake" on an offline registered tile, wake status under More, last
  morning wake line. System check step "PS4 remote wake: refuses without a key, nothing sent" (also in the Light check).
- Kai's key stored (e55667bb, main profile). **Only Kai is registered** – the others need the one-time registration
  (Add Device number, or the helper making it: not built). Light check after: 13 passed · 2 to look at · 2 failed (the same
  two: side timer at 50, SimplyBook count today). Not tested end to end: the group buttons and the morning trigger.
- **7:53pm ATLAS registered.** Main "Atlas" 17d81365 had no ID (5 profiles: Atlas, User1–4, none activated) → `ps4prof acct`
  52326d61696e3031 (the shared main ID, result 0), then `/_rpreg` with the owner's number 81519385 straight away – accepted
  WITHOUT a restart: **key 357299b3**, nickname PS4-401, MAC 2ccc441e241f; stored by the engine automatically (ps4list wake:
  atlas, kai). Atlas's existing main saves not checked after the ID change (Kai's were fine). Not woken yet.
- **7:55pm BELLA not registered:** owner sent number 84363859, but Bella's helper (1.1.25, started 7:10pm) has been silent
  since 7:36:32pm while the PS4 is on (last job: the wake of Kai at 7:33pm, done). Tried registering it from ATLAS instead
  (`/_rpreg.192.168.88.6.284561706f6c6c6f.…` – a PS4 can register another one over the network): "no answer to the Remote
  Play search" → Bella doesn't answer on 192.168.88.6 at all. Same picture as 14 Nov evening and this morning: **Bella drops
  off the network** (Wi-Fi 56%, the weakest room) rather than a helper fault – or its address changed. To check at the PS4:
  Settings › Network › View Connection Status (address, signal) / Test Internet Connection.
- **8:05pm Bella, owner at the PS4:** address still 192.168.88.6, signal 54% on 5 GHz, Test Internet Connection passes.
  The helper checked in ONCE at ~7:58pm (while he ran the test), then silent again; a look job sent at 7:59 was never
  collected, and Atlas again got no answer from 88.6. So the helper is alive – Bella's Wi-Fi link stalls and only wakes
  briefly when the PS4 itself re-tests it. Suggested to the owner: put Bella on 2.4 GHz (Scarlett is, at 100%) via Set Up
  Internet Connection › Custom, keeping the DNS exactly as now (not "Easy" – that would reset the blocker's DNS), or cable.
  Number 84363859 not used (expired when he left the Add Device screen).
- **8:06pm BELLA REGISTERED.** Owner moved Bella to 2.4 GHz (now channel 6, signal 94–96%, was 54–56% on 5 GHz) and sent
  number 95610423. Bella's helper answered at once and registered with itself: wake key `c203a687`, nickname PS4-878,
  MAC 78c8810636c1, main profile's existing ID 284561706f6c6c6f left unchanged. Engine `ps4wake` now holds kai, atlas,
  bella. Still to watch: that Bella stays connected on 2.4 GHz (the silences were the weak 5 GHz link). Not woken yet.
- **8:10pm HELPERS GO SILENT WHILE THE PS4 IS ON (open, not solved).** Owner asked to rest Kai/Atlas/Bella for a wake
  test; the rest jobs (8:08:09) were never collected. Last check-ins: Kai 8:02:41, Atlas 8:06:14, Bella 8:06:26 – owner
  is looking at all three, on their home screens, nobody put them to rest. Vale (1.1.24) keeps checking in every 60 s.
  Earlier the same evening: Max 7:35:12, Bella 7:36:32, Scarlett 7:38:36 (Bella came back for one check-in at 7:58 when
  the owner ran Test Internet Connection, and again 8:04–8:06 after its Wi-Fi was set up anew). So **Bella's silences are
  not (only) its weak Wi-Fi** – Kai (74%) and Atlas (60%) do it too, in clusters a few minutes apart. Best guess: the
  helper is alive but stuck in a network call with no time limit – in r2tls only `getaddrinfo` (the name lookup, which
  goes through nanoDNS) has none; connect/send/read all have limits since 1.1.15. Not proven. Next: owner runs Test
  Internet Connection on Kai only; if Kai's helper comes back, read `/_ps`, `/_thr`, the nanoDNS log and rest.log, then
  fix (use the remembered engine address first / put the lookup under a time limit / a watchdog that restarts the loop).
  Remote wake is NOT reliable until this is fixed – a silent helper can't be the sender or take a rest command.
  **8:13–8:18pm:** owner ran Test Internet Connection on Bella (passed) – helper did NOT come back within 5 minutes, so
  the "connection test shakes it loose" idea is not confirmed (7:58 may have been chance). Kai/Atlas still silent, Vale
  fine. Other candidates read from the code, none proven: (1) a stop signal anywhere in the shared GoldHEN process
  (SIGSEGV/SIGBUS/… from ANY payload thread runs the helper's `on_sig` → that thread sleeps for good; the record is
  /data/round2/helper-stopped.txt), (2) a step in the main loop that blocks (running_title, update_guard, check_cmd).
  Evidence is on the PS4s' disks and survives a restart: after a restart + jailbreak read
  `/_tail.helper-stopped.txt|12;/_tail.rest.log|5;/_tail.own-spawn.log|8` and the starter's log BEFORE anything else.
  **8:20–8:25pm Bella restarted + jailbroken by the owner:** helper 1.1.25 started 8:20:08, reported and checked in at
  8:20:24 ("connected" pop-up seen) – and then NOTHING: no check-in at 8:21:25 or after, a look job sent 8:21 never
  collected. So it now freezes within the first minute, reproducibly. Its report carried the records: starter log has
  no relaunch and no stop since 7:10pm ("19:45:04 hourly: helper running"), helper-stopped.txt has nothing after 10:33am
  → **the helper is not stopped by a signal; it holds its lock and hangs** (or its thread died quietly). Not the
  own-program route (`own:0`, pid 46 = normal shared process; only Kai ever ran `/_selfown`, as a test). 1.1.24→1.1.25
  differs only by `/_reboot` (checked the diff) – so not a 1.1.25 code fault as such. What the three silent PS4s share
  and Vale (fine, 1.1.24) lacks: **Remote Play enabled + registered tonight** (Kai main key ~7:30 → silent 8:02; Atlas
  ~7:50 → 8:06; Bella 8:05 → 8:06, and after the restart within a minute). Unproven. Next test asked of the owner:
  Bella – untick Enable Remote Play, restart + jailbreak, see whether the helper keeps checking in for 5+ minutes.
  **9:30pm – picture changed, Remote Play suspicion weakened.** Owner walked into Kai's room; Kai and Bella both check in
  again (Bella NOT restarted in between – same start 8:20:08).
  · **Kai:** report says `woke {via:"sleep", sleptS:5121}` at 9:28:53 – the whole payload process stood still from ~8:03:30
  to 9:28:53 (the starter's hourly line is missing for 8:19 and came at 9:28:56 too). That is what REST MODE looks like.
  Kai had been woken over the network at 7:33pm (Bella → Kai test) – 8:03 is 30 minutes later. Reading: **a PS4 woken
  over the network that nobody uses goes back to rest by itself after ~30 min** (to confirm with the owner: was Kai's
  light orange / did he wake it with the controller at 9:28?). So Kai was probably never "silent while on".
  · **Bella:** different – its starter wrote "21:20:11 hourly: helper running" exactly on the hour, so the process was
  running, but the helper made no check-in from 8:20:24 until ~9:27. Helper thread alone stuck for an hour, then carried
  on by itself. Bella's Wi-Fi is back down to 58% (2.4 GHz, was 94% right after the change). Fits the old reading: weak
  link + a network step without a time limit (`getaddrinfo`). Fix to build: time limit / remembered address first.
  · **Atlas:** silent since 8:06:14, not looked at yet (rest? stuck?).
- **9:32pm owner confirmed Kai:** light was orange, it came up straight into the Kai profile without a PS-button press,
  and the "awake after rest mode" pop-up showed → **Kai WAS in rest mode** from ~8:03pm. Rule learnt: a PS4 woken over
  the network that nobody uses goes back to rest after ~30 min (so a morning wake must not be sent too early).
- **9:37pm HELPER 1.1.26 released** (ps4-helper 3067903, ps4-release 36a48d6) – for Bella's hour-long standstill:
  · `ps4/tls/r2dns.c`: our own DNS question over UDP, 2.5 s per server (the PS4's own servers from its network settings,
  then 127.0.0.1, then 1.1.1.1), instead of `getaddrinfo`, which had no time limit. Remembered address still the fallback.
  "Sony blocked?" in the report uses it too, against the PS4's own servers only. Computer test: `cd ps4 && cc -Wall -O2
  -Itls -o /tmp/r2dns_test tls/r2dns_test.c tls/r2dns.c && python3 tls/r2dns_test.py` (10 cases, all pass).
  · Evidence for next time: `r2_where()` notes the step the helper is in; any step over a minute gets a line in
  /data/round2/slow.log (report `log.slow`, last 6), and /data/round2/where.txt keeps the current network step so a
  fresh start logs "the run before was last in: …". Report also carries `wifi.dns`.
  · Light check before and after: 13 passed · 2 to look at · 2 failed both times – the same known items (SimplyBook
  count 11,3xx today; side timer at 50 requests; watchdog "24 hours" maths; Kaeden TV).
  · On Kai (updated by hand) and Bella (took it by itself at once): "said hello – kept" within 7 s, DNS servers read as
  127.0.0.1 (the blocker), Sony still "blocked", check-ins every minute since. **Whether it cures Bella is not proven
  yet** – the lookup being the stuck step was a deduction; if Bella goes quiet again, `log.slow` will name the step.
  Vale 1.1.24, Scarlett 1.1.15, Max 1.1.14, Atlas 1.1.25 take it at their next quiet time.
- **9:42–9:50pm FIRST WAKE TEST THROUGH THE ENGINE – Bella did NOT wake.** Bella rested remotely 9:42:45 (job done).
  9:46 staff `ps4wake id=bella` → engine picked Vale as sender (guests there; `nobusy`, only a network message) → Vale
  sent the wake 3× to 192.168.88.255 (job done) → nothing. 9:48 Kai sent it 3× straight to 192.168.88.6 → nothing; Kai's
  status question to .6 before and after: "no answer in 4 s". 9:50 `/_ddpall` from Kai (who is on the network?): Kai .18
  "200 Ok", Vale .11 "200 Ok", **Atlas .15 "200 Ok"**, nothing from Bella, Max (.23), Scarlett (.24).
  → **Bella is not on the network at all while in rest mode** – same as 14 Nov (then on 5 GHz, rest-mode boxes ticked per
  the owner's photo). The engine/button chain itself works (sender chosen, job run). So far only Kai (FW 9.00) has ever
  answered from rest; Bella, Scarlett, Vale (all 11.00) never have → to settle: is it firmware 11.00 / the PS4 model, or
  a setting (Power Save › Set Features Available in Rest Mode: Stay Connected to the Internet + Enable Turning On PS4
  from Network)? Next test: Atlas (9.00, registered) – boxes checked first – rest, then wake.
  Side note: the status question before/after a wake to the .255 address says "send failed -3" (that helper call has no
  broadcast permission) – cosmetic, the wake itself is sent with it.
  → **Atlas is ON (answers "200 Ok") but its helper (1.1.25) has made no check-in since 8:06:14pm** – this one really is
  "silent while on", 1 h 45 min and counting. Bella is left asleep; someone has to press its PS button.
- **9:55pm** owner: Bella's rest-mode boxes are correct (both ticked) – so Bella (11.00) still drops off the network in rest.
  **Max ping from Kai:** status question to .23 "no answer in 4 s", no reply to the broadcast either (answers: Kai, Atlas,
  Vale only). Max's starter wrote its last hourly line at 7:15pm and none at 8:15/9:15 → Max's payload process has stood
  still since ~7:35pm (guests till 7:30) = rest mode or switched off. A resting Kai answers "620 Standby"; Max doesn't →
  either fully off, or its "Stay Connected" box is off (14 Nov: Max also silent in rest). Asked the owner: light orange or off?
  **Atlas came back by itself ~9:54pm** and took 1.1.26 in quiet time. Its starter kept writing "hourly: helper running"
  (8:54, 9:54) and there is no wake record → like Bella: the PS4 ran, the helper alone stood still 8:06–9:54pm (1 h 48 min),
  then carried on. Two rooms, same pattern, both on 1.1.25, both resumed after 1–2 h. Both now on 1.1.26 → next time
  `log.slow` names the step. (Atlas' PS4 clock runs ~8 min fast – display only.)
  **Idle timeout? (owner asked 9:58pm) – probably not:** (1) Bella froze within a minute of a fresh start at 8:20pm with
  the owner at it (not idle); (2) Atlas answered Kai's LAN status question with "200 Ok" at 9:50pm while its helper was
  silent – the PS4's network was up; (3) the starter in the same process kept running (no suspend, no wake record).
  **Stronger clue: Atlas (8:06:14) and Bella (8:06:26) went silent 12 seconds apart** – two PS4s on different Wi-Fi bands
  (ch 36 / ch 6) with their own timers don't line up like that by chance → a shared event on the way OUT (internet,
  upstream DNS 1.1.1.1/8.8.8.8 through nanoDNS, or the engine) at 8:06, after which those two helpers stayed stuck while
  Vale's didn't. 1.1.26 now asks 127.0.0.1 with a 2.5 s limit, then 1.1.1.1 directly, then the remembered address, so a
  stuck nanoDNS/upstream can't hold it. Gap: if checks now FAIL quickly instead of hanging, slow.log won't show it →
  next helper should log failed check-ins (time, step, error, count) and report them on return.
- **10:03pm HELPER 1.1.27 released** (ps4-helper d279ede, ps4-release 7b72b92) and on Kai + Atlas (Bella asleep, takes it
  when woken; others at quiet time): /data/round2/net-fail.log – every failed engine request (time, request, step it
  failed in, error; first 5 then every 10th) + "back after N failures, M s"; in every report as `log.netfail`. Tested on
  the computer; lookup tests still pass. Light check after: same 13 passed / 2 to look at / 2 failed (known items).
  **Owner's point (10:03pm), taken as a rule:** don't make him diagnose. Every report already carries the PS4's own
  records (log.boot, stopped, slow, netfail). When a PS4 comes back after a silence, READ ITS REPORT FIRST, before
  asking the owner anything. What should have been done: step/failure records in 1.1.15 (when the time limits went in),
  and Bella's/Atlas' reports read the minute they came back (9:27 / 9:54pm). Limit: the file reader is a job the helper
  runs, so a STUCK helper can't answer it – the evidence arrives with its next report.
- **10:08pm all awake rooms on 1.1.27:** Kai, Atlas (by hand), Vale (by hand after its guests), Max (1.1.14 → 1.1.27 and
  Scarlett 1.1.15 → 1.1.27 by themselves in quiet time; Max's switch did NOT stick this time). Bella still asleep on 1.1.26.
  **Owner's control group (10:05pm):** some rooms stay NOT registered for Remote Play to isolate the silences → registered:
  Kai, Atlas, Bella; not registered: Vale, Scarlett, Max. Compare `log.netfail` / `log.slow` between the two groups.
- **10:12–10:19pm ATLAS WAKE TEST (owner asked; 9.00, registered key 357299b3) – did NOT wake.** Rested remotely 10:12:24
  (job done). 10:15 Kai asked Atlas (.15) its status: "no answer in 4 s". 10:16 staff `ps4wake id=atlas` → engine chose
  Vale as sender, sent 3× to .255 → nothing. 10:18 Kai sent 3× straight to .15 → nothing, no answer before or after.
  → Atlas, like Bella, is OFF the network in rest mode. So it is NOT firmware 9.00 vs 11.00 – only Kai has ever answered
  from rest. Atlas' rest-mode boxes have never been checked (14 Nov note: "Max + Atlas boxes off?") → owner to check
  Settings › Power Save Settings › Set Features Available in Rest Mode on Atlas (Stay Connected + Turn On from Network)
  and compare with Kai's (Kai also has Supply Power to USB = Always). If Atlas' boxes are on too, the difference is
  something about Kai itself (model, how it joins the Wi-Fi) – ask for the model number (CUH-xxxx) of Kai, Atlas, Bella.
  Bella woken by the owner ~10:13pm and took 1.1.27 by itself. All six on 1.1.27; no `log.netfail` lines anywhere at
  10:19pm. Atlas left asleep (needs its PS button).
- **10:30pm owner: Atlas had "Stay Connected to the Internet" OFF** – he ticked it and "Enable Turning On PS4 from Network".
  **Re-test 10:30–10:39pm: still NOT reachable.** Rested 10:30:35; Kai's status question + broadcast at 2.5, 3.5, 6 and
  8 min in rest: never an answer from .15 or Atlas' hardware id; engine wake via Vale at ~4.5 min (.255, 3×) → not woken.
  So settings were wrong but are not the whole story. Only Kai answers from rest.
  Hardware ids (from the broadcast answers / registration): Kai BC60A7E246E8, Vale BC60A7929148 (same batch as Kai),
  Max F8461C4755FE, Bella 78C8810636C1, Atlas 2CCC441E241F, Scarlett 709E294E9D39 (Scarlett is now at .88.4).
  Next ideas: Vale rest test (same hardware batch as Kai, no registration needed for the status question) · Atlas'
  "Supply Power to USB Ports" (Kai = Always) · model numbers (CUH-) of all six. Atlas asleep again (PS button).
- **10:45pm owner matched ALL rooms' Power Save settings to Kai's. 10:46 rested Vale, Max, Scarlett, Atlas, Bella (Kai
  awake as the listener). At 3.5 and 5 min in rest, Kai's broadcast got "620 Standby" from VALE (.11), MAX (.23) and
  SCARLETT (.4)** – first time any PS4 besides Kai answered from rest. Firmware no factor (Vale/Scarlett 11.00, Max 9.00).
  **ATLAS and BELLA still silent** (status to .15 / .6: no answer). They are the two with the weakest Wi-Fi
  (Atlas 52–62% ch 36, Bella 56–74% ch 6) – but Kai answers at 64–74%, so not proven. Next: which mesh unit / band each
  is on (router app), or a cable test on one of them. Vale/Max/Scarlett are reachable but NOT registered (owner's
  control group) so they can't be woken yet. All five asleep at 10:52pm – PS buttons.
- **11:05pm VALE WOKEN REMOTELY – second room proven.** Owner opened Remote Play Connection Settings › Add Device (NOT
  Mobile App Connection Settings – that one is Sony's phone-app pairing and needs PSN; owner opened it first by mistake).
  Vale registered with itself through its main profile Valentine's EXISTING ID acee61706f6c6c6f (unchanged): wake key
  `b879a329`, PS4-845, MAC bc60a7929148; engine stored it. Rested 11:01:17; Kai's status question at 11:03 → "620 Server
  Standby"; staff `ps4wake id=vale` 11:04:21 → engine picked Kai as sender → 3× to .255 → Vale's report 11:05:46:
  woke (slept 239 s), nobody signed in (the "press the PS button" screen, as expected). Registered now: Kai, Atlas,
  Bella, Vale; unregistered control group: Max, Scarlett. **Rule learnt: a PS4 is wakeable only if Power Save › rest-mode
  settings match Kai's (Stay Connected + Turn On from Network + USB power Always) AND it answers on the network in rest
  (Atlas and Bella don't yet).**
- **11:09pm Scarlett registered** (main's existing ID 526a61706f6c6c6f, key `a2878fc6`, PS4-599). **11:15pm owner chose B:
  Max's MAIN profile got the shared ID 52326d61696e3031** (ps4prof acct, "acct set: 0"; before: no ID, flag 2). Two
  numbers refused ("HTTP 403 reason 80108b0") until the owner RESTARTED Max – then registered (key `f8b9cd46`, PS4-350).
  **Rule: after giving a profile an ID, restart before registering if the PS4 refuses with 403.** GT Sport files in Max
  main (CUSA02168: sdimg_local-data, sdimg_sce_sdmemory, backup copy) still there, untouched – owner to open GT Sport on
  Max once to confirm it still loads with the new ID (cloud backup exists).
- **11:21–11:44pm FULL SLEEP/WAKE CHECK (owner: "make it bulletproof", away):**
  Round 1 – sender Kai: rested Vale, Max (Scarlett already resting) → standby answers from Vale, Max, Scarlett →
  `ps4wake id=all` → Max and Scarlett back within ~2 min. Vale DID wake (starter's line 23:28:01) but its Wi-Fi didn't
  come back – net-fail.log: "connect failed" from 23:28:12 every 8 s (#10 at 23:30:48), Wi-Fi moved from 5 GHz ch 36 to
  2.4 GHz ch 6 – and it went back to rest ~23:33 before reaching the engine.
  Round 2 – sender Scarlett: rested Kai, Max → standby from Kai, Max → `ps4wake id=all` → Kai, Max AND Vale back.
  So all four registered+reachable rooms (Kai, Vale, Max, Scarlett) wake with "Wake all", from two different senders.
  Atlas and Bella: never answered, never woke (Wi-Fi in rest – open). New lesson from net-fail.log: after a wake the
  Wi-Fi can take seconds (Scarlett 9 s) to minutes (Vale) to come back, and a woken PS4 with no network can fall back to
  rest within ~5 min. Light check after: same as before (13 / 2 / 2, known items). systems.json item added (e9e754f).
  Left at 11:44pm: Kai, Vale, Max, Scarlett awake on "press the PS button" (expected to rest by themselves ~30 min);
  Atlas, Bella asleep since 10:47pm.
- **11:55pm HELPER 1.1.28** (ps4-helper 8bd77b0, ps4-release d2e5bf1): report `wifi.ap` = BSSID (which mesh unit/radio),
  `wifi.dbm` (raw byte – subtract 256: 186 = −70 dBm), `wifi.dev` (0 cable, 1 Wi-Fi). Owner asked for it to compare
  Atlas/Bella (silent in rest) with the four that work, without the router app. First readings: Kai cc:ba:bd:28:65:62
  (5 GHz ch 36, −70 dBm, 60%); Scarlett cc:ba:bd:28:65:60 (2.4 GHz ch 6, −46 dBm, 100%) – same unit, two radios.
  Atlas/Bella get 1.1.28 when the owner switches them on (quiet-time update). Light check after: same 13/2/2.
- **17 Nov 12:03am readings (owner switched Atlas + Bella on ~11:57pm):**
  · **Atlas (1.1.28): SAME mesh radio as Kai** – ap cc:ba:bd:28:65:62, 5 GHz ch 36, −68 dBm / 64% (Kai −70 dBm / 60%).
  So for Atlas the Wi-Fi link is NOT the difference – the "weak Wi-Fi" idea is wrong for Atlas. Left: PS4 model
  (Atlas hardware 2C:CC:44…, Bella 78:C8:81…, the four that work: BC:60:A7 ×2, F8:46:1C, 70:9E:29), or a setting.
  · **Bella:** woke (report 23:57:11: slept 4198 s) and answers the broadcast "200 Ok" from .6 – but **no check-in
  since 22:46:46**, so it never took 1.1.28: the helper is stuck AGAIN right after a wake report, on 1.1.27 with time
  limits on every network step → the stuck step is probably NOT network. Gap: r2_where() only saves network steps to
  where.txt (others save=0), so a restart can't name a non-network step → next helper: save every step (cheap), and a
  watchdog that notes when the loop hasn't moved for 3 min.
  · Vale, Max, Scarlett back in standby by themselves (~30 min after their network wakes, as expected).
- **12:15am HELPER 1.1.29** (ps4-helper 39ea609, ps4-release 1c6fabd): report `hw` = model name (sceKernelGetHwModelName,
  looked up at run time from libkernel_sys handle 0x2001), `pro` (sceKernelIsNeoMode), `idps8` (first 8 bytes of the
  console ID). Owner asked "a helper can't read the hardware?". Kai: **CUH-7016B (PS4 Pro), B01Y**, idps8 0000000101870211.
  The others report it when they next wake and take 1.1.29 (Atlas went to rest before updating).
  **Owner (12:07am): after a NETWORK wake the PS4 stops on "Welcome back to PlayStation" (press the PS button) even
  though auto-login is on for every main profile; a manual power-on logs straight in.** That's the PS4's own rule – a
  network/Remote Play wake waits for someone at the controller. 1.1.23's sceUserServiceLogin from the helper jammed that
  screen. Options to look at: a virtual PS-button press from the helper (the system's own virtual-pad route that Remote
  Play uses), or the sender finishing a short Remote Play session and pressing PS (chiaki can) – heavier.
- **12:16am owner: Atlas and Bella both ON (white light)** → their helpers are STUCK, not asleep: Atlas silent since
  23:59:29 (right after taking 1.1.28 and reporting), Bella since 22:46:46 (reported its wake at 23:57:11, then nothing).
  Same two rooms that never answer from rest. Owner put them to rest; **everything ON HOLD until 17 Nov.**
  Network-woken PS4s with nobody signed in went back to rest by themselves: Vale + Max after ~5 min, Kai after ~30 min
  (twice each) – reason for the difference unknown (Kai is a Pro – compare models when 1.1.29 reports them).
  **Tomorrow, in order:** (1) read Atlas/Bella records when they're on (1.1.28/1.1.29 slow.log, net-fail, where.txt) and
  make the helper save EVERY step + a 3-min watchdog note, so a stuck helper names its step; (2) models of all six (hw in
  the 1.1.29 report) – are Atlas/Bella a different model?; (3) "Welcome back" screen after a network wake: research a
  virtual PS-button press from the helper (should also stop the 5-min fall-back to rest); owner 12:17am: ALSO research other wake
  methods that behave like a real power-on (auto-login): HDMI-CEC from the room TV (TV-on already wakes Atlas' PS4), a
  small Bluetooth device acting as a paired controller pressing PS, a button-pusher; **RESEARCH DONE 17 Nov ~2am** (owner
  asked for a full GitHub review): Claude Doc "Waking the room PS4s: GitHub and web research"
  https://claude.ai/artifact/HKvaArAM3KKsYC2pFzqpBd (114 search phrases, ~2,270 repos, 50 read). Top picks:
  B) Second Screen pairing (Mobile App Connection Settings › Add Device PIN; ps4-waker/BenjaminFaal: wake + LOGIN + PS
  button + start title + standby over TCP 997; credential = SHA-256 of account ID decimal – our 15 Nov test skipped the
  PIN login step) → test on Kai first; D) seregonwar/Ghostpad virtual controller payload (scePadVirtualDeviceAddDevice +
  sceMbusBindDeviceWithUserId; firmware-specific patch); C) ESP32 Bluetooth wake spoofing the room's paired controller
  (FreeTHX/wakepsx-on-bt) – no Wi-Fi needed in rest → candidate fix for Atlas/Bella. Keep-awake after wake:
  sceSystemServicePowerTick / sceShellCoreUtilResetAutoPowerDownTimer (both in our toolkit).
- **17 Nov 11:00am METHOD B BUILT – helper 1.1.30** (ps4-helper d678478, ps4-release 6822aeb): ps4/ss/r2ss.c = Second
  Screen protocol (UDP 987 WAKEUP/LAUNCH with user-credential → TCP 997 hello → handshake RSA-OAEP-SHA1 of a 16-byte
  AES key with the PS4 public key from ps4-waker → AES-128-CBC login (credential, PIN) → status → remote keys / boot →
  bye). Look jobs: `/_ss.<ip>.<acct16>.<PIN or 0>.<ops>` (ops "ps", "enter", "boot-CUSA…", "wait-ms", "none"; prefix "w"
  = type-C wake first), `/_sswake.<ip>.<acct16>`; full lines in /data/round2/rp.log. Computer test against a fake PS4:
  `ps4/ss/r2ss_test.py` (8 checks pass; host build line in its header). Light check before: 14 passed / 2 / 1 (SimplyBook).
  Owner chose Max for the test (Kai busy). Sender = Bella (on 1.1.30; Atlas refused, 11am session). Max asleep → owner to
  switch it on and open Settings › Mobile App Connection Settings › Add Device. Max main account 52326d61696e3031.
- **17 Nov 11:05am METHOD B FAILED at login – the account is the wall, not the credential. METHOD B ABANDONED.**
  Paired Bella→Max with our computed credential + the PIN: **the device "Round2" (MAC 28-66-E3-C4-AC-D3) DID get added
  to Max's Mobile App Connection Settings** (owner's photo) → our credential is accepted for registration. But the login
  packet returns **error 21** = "PSN account not registered" / NO_LOCAL_ACCOUNT / INVALID_CREDENTIAL (pyps4-2ndscreen,
  playactor, BenjaminFaal). Max main is OFFLINE-activated (our shared ID). The PlayStation App login step requires a
  real PSN-registered account; Remote Play's does not (that's why Remote Play wake works and this doesn't). No honest way
  past it (capturing a real credential from Sony's app = declined). **So method B cannot sign a profile in / fix the
  welcome screen.** Owner should delete the dead "Round2" entry from Max's Mobile App Connection Settings. Helper code
  (1.1.30 ss/r2ss.c, /_ss /_sswake) stays for the record but isn't a path forward.
- **Models so far (1.1.29 hw):** Kai CUH-7016B (Pro), Max CUH-7006B (Pro) – both wake fine. Atlas/Bella still to read
  (they're the two that drop off Wi-Fi in rest). 
- **AGREED DIRECTION after B failed:** keep Remote Play wake (works: Kai/Vale/Max/Scarlett); the morning wake preps saves
  in the background; the welcome screen is cleared by ONE human PS-button press when staff open the room; the helper
  keeps woken PS4s awake so they don't fall back to rest before staff arrive (sceSystemServicePowerTick /
  sceShellCoreUtilResetAutoPowerDownTimer, both in toolkit) – build + test on Max next. Atlas/Bella: cable or closer mesh.
- **17 Nov 11:30am HELPER 1.1.31** (ps4-helper 07b7bd1, ps4-release 9079a0e): (1) method B (ss/r2ss.c, /_ss, /_sswake)
  REMOVED – dead end. (2) KEEP-AWAKE: job `/_keepawake.<minutes>` (0 = cancel, max 600) sets g_awake_until; the loop
  calls sceSystemServicePowerTick + sceShellCoreUtilResetAutoPowerDownTimer once a minute while the hold lasts; report
  carries `awakeHold` (seconds left). Tested on Max: "holding 45 min", awakeHold 2700 shows in report. Light check after:
  14 passed / 2 / 1 (known items only). (3) step_aside now munmaps the 1 MB save buffer so each sleeping (updated-out)
  copy shrinks to ~its stack.
  **RAM/purge – the honest limit (owner asked to kill sleeping helpers):** old helpers can't LEAVE the process because
  they are threads inside GoldHEN's BinLoader host; a full exit there crashed the whole host before (1.0.6). Worse, the
  ~1.27 MB code image of each update is mapped by BinLoader, which never unloads it, so even killing a thread wouldn't
  free the image – only a PS4 restart does. 1.1.31 reclaims the biggest heap (sv_buf) per sleeper, which stretches how
  many updates fit, but does NOT remove the per-update image leak. **The real fix is the own-program route (/_selfown /
  elfldr, proven on Kai 16 Nov): there each helper is its OWN process, so on update it `_exit(0)`s and the OS frees
  EVERYTHING incl. the image – no sleeping copies at all. = "starter 3": launch helper as its own program at boot.**
  **Keep-awake still to prove:** does it stop the post-NETWORK-wake fall-back to rest (Vale/Max rested ~5 min, Kai ~30
  min with nobody signed in)? Test: rest Max → Remote Play wake (no sign-in) → `/_keepawake.45` at once → watch 35 min. (4) morning trigger test;
  (5) owner opens GT Sport on Max once (main profile now has an ID).
- **17 Nov 11:38am NET-FAIL.LOG read (the 1.1.27 diagnostic paid off):** Atlas + Bella overnight = repeated
  `connect: -0x0044 NET - connection failed` to the engine, then **recovered by themselves** ("back after 15 failures,
  37670 s" / "17 failures, 38504 s" at ~10:37am when the owner switched them on). The hour-long DEAD SILENCE is gone –
  1.1.26 + 1.1.27 turned it into retry-and-recover. Failures = TCP-connect to the engine during overnight rest (network/
  Wi-Fi-in-rest), NOT a frozen helper and NOT the launch method. **Own-program is NOT the cause and NOT the fix for the
  disconnects** (own=0 everywhere; Kai's own-program test ran clean through rest/wake). **NEW CLUE – mesh units (wifi.ap):**
  Kai/Atlas/Max on AP …65:62, Scarlett …65:60 (same unit), **Bella on …95:10 = a DIFFERENT mesh node** → likely why Bella
  is flakiest; owner to check the router. Atlas is on Kai's node, so Atlas = rest-mode reachability, not the node.
- **NEXT: STARTER 3 / own-program as boot default (the real RAM fix).** Plan (mostly helper-side = auto-updatable, low
  risk; starter 2 unchanged): (1) a helper started via BinLoader auto-promotes itself to own-program at startup (the
  /_selfown path made automatic); the bootstrap steps aside ONCE per PS4 boot (cleared on restart). (2) when g_own, an
  update elfldr-spawns the NEW version as its own program and the old one `_exit(0)`s cleanly – no BinLoader, no new
  sleeper, no RAM creep. (3) safety nets: own-spawn fails / no hello in 3 min → fall back to today's BinLoader+app-switch;
  own line dies → starter relaunches a bootstrap. (4) TEST one room, owner present (spawn can fail = restart+jailbreak):
  boot → auto-promote → an update (own→own) → game → rest/wake; watch check-ins + RAM. elfldr proven on Kai 9.00 only →
  also test an 11.00 room (Vale/Scarlett/Bella).

**17 Nov 11:54am STARTER-3 / OWN-PROGRAM PROVEN END TO END ON MAX (9.00, CUH-7006B).** Helper 1.1.32 (own-update +
auto-promote, 9.00-gated) then 1.1.33 (auto-promote wiring fix). Sequence watched live: /_selfown made Max own 1.1.31
(pid 83) → updated to 1.1.32 (not-own, pid 45 shared host) → **auto-promoted to own 1.1.32 (pid 84)** → pushed 1.1.33 →
**own→own update: "switched to 1.1.33 (own program)", pid 84→85, no BinLoader**. /_ps after: only pid 85 (parent 1);
pids 83 and 84 GONE, not sleeping. **So each update now frees the whole old process (image included) - no sleeping
copies, no RAM creep.** This is the real fix for the ~14-update ceiling.
- Auto-promote is gated to firmware **9.00** (own-program proven on 9.00 only); 11.00 rooms (Vale/Scarlett/Bella) stay
  on the normal shared route until tested there. Gated to one attempt/hour (marker APP/promote-try); a failed spawn just
  leaves the helper running normally.
- 1.1.33 fix: auto-promote is now acted on in the main loop (1.1.32 needed a look job to nudge it). To confirm on Max's
  NEXT restart: it should auto-promote with no nudge.
- Rollout note: ps4-release is on 1.1.33, so Kai + Atlas (9.00) will auto-promote on their next update/quiet-time; that's
  fine (own-program proven on both 9.00 models). Watch they come back own=1 and keep checking in.
- **17 Nov 12:20pm KEEP-AWAKE PROVEN + own-program through rest/wake on Max.** Rested Max (own 1.1.33, pid 85) → network
  wake from Atlas → **own-program helper RESUMED, same pid 85, nobody signed in (woke slept 157s)** = own-program survives
  rest/wake on Max too. Set `/_keepawake.40` at once → **Max stayed awake 17+ min with nobody signed in** (without the
  hold Max rested at ~5 min on 16 Nov). Hold counts down and cancels (`/_keepawake.0` → "hold cleared"). Keep-awake works.
  **Quirk to clean up:** a look command persists and the helper re-runs it each check-in, so a keepawake look keeps
  re-arming (awakeHold stuck near full). Harmless for the test, but PRODUCTION keep-awake should be engine-driven (a
  per-console "awake until" set after a morning wake, cleared when a controller connects or the booking nears), not a
  repeating look. ENGINE WORK still to do: auto keep-awake after ps4MorningWake; auto-promote already ships (helper side).
- **17 Nov 12:28pm GT Sport on Max loads after the ID change** (owner: "it works"). Its car-image thumbnail cache is
  rebuilding – expected after the main profile's account-ID change, cosmetic (the game redraws thumbnails, doesn't touch
  the save). Asked owner to confirm My Garage (unlocked cars + credits) is intact; if anything's missing, restore the GT
  Sport save from the cloud backup (…/14a1e943/CUSA02168/…). So the shared-ID-on-main change is safe for Max's house save.
- **17 Nov 12:41pm OWN-PROGRAM PROVEN ON 11.00 (Vale).** Vale auto-updated to 1.1.33 but correctly did NOT auto-promote
  (9.00 gate working). Manual /_selfown on Vale → own=1, pid 150 (its own process), stable check-ins every minute. So the
  elfldr own-program route works on 11.00 too, not just 9.00. To do before UNGATING auto-promote to 11.00: an own→own
  update + a rest/wake on an 11.00 room (same spawn code, low risk). Vale left as own-program (pid 150) for the login test.
- **Keep-awake behaves as designed:** owner confirmed Max was kept awake and did NOT rest, sitting on the "press PS"
  screen the whole hold (keep-awake prevents rest, doesn't sign in; the human PS press clears the welcome screen). This is
  the intended morning bridge: wake booked rooms → prep saves behind the screen → hold awake → staff press PS on arrival.

### 17 Nov 2026, 1–2pm – 3-copy saves, clean move, the save study (helpers 1.1.34 → 1.1.37, Vale + Max)
Owner: "save vale's plate up to cloud, move max's plate up to vale", "check there are 3 copies (slot, prep folder, cloud)",
"build logs too so we can analyse problems", then mid-way: "a downgrade room might not have the game" and "do all game saves
produce sce memory? study it… use max and vale".
- **1.1.34 prep copy + save.log.** Every backup also writes the files to `/data/round2/prep/<user>/<title>/<save>/` (plus
  manifest.txt + cloud.txt = the cloud path). Restore downloads into that same folder first and KEEPS it. Every step goes to
  `/data/round2/save.log` (start/done lines with paths, files, bytes, fails, prep-fails; rolled at 64 KB), also in the report
  as `log.save`. Read it with `/_tail./data/round2/save.log|20` – save.log is the truth when a look result looks stale.
- **BUG FOUND + FIXED (1.1.35): restore MERGED instead of replacing.** Max's PlateUp into Vale gave Vale 34 save files =
  Max's 15 + Vale's old 15 + 4 sce_sys. PlateUp (and many games) name each file by a timestamp, so nothing overwrites by name.
  1.1.35 clears the receiving save part's game files (keeps sce_sys = that profile's identity) before writing; result and
  save.log say "N cleared". Re-run: Vale Saves 30 cleared → 19 files / 297,625 bytes, sce_sdmemory 1 cleared → 5 files /
  12,460,908 bytes = **byte-identical to Max's**. Then a fresh Vale backup → all 3 copies match (slot, prep, cloud
  …/11341153/CUSA44827/Saves/1794893668 + sce_sdmemory/1794893738). Vale's ORIGINAL PlateUp stays in the cloud under
  …/11341153/CUSA44827/Saves/1794892068 (pre-move backup). Owner to open PlateUp on Vale and confirm Max's progress.
- "4 kept" in a restore = the receiving save's 4 sce_sys files (param.sfo, keystone, icons). Expected, not a loss.
- **1.1.36/1.1.37: missing game / missing part says which.** `no such save` is now one of: "game not installed in this room
  (CUSA…) – install it here first" / "profile never played this game – play it once on this profile first" / "no save part
  '<name>' here yet". Nothing is written in any of these cases; the member's save stays safe in the cloud. Restore open
  failures now go to save.log. Tested live on Vale (WWE 2K25 not installed, PlateUp on profile 11341157, a made-up part).
- **1.1.36: save names with dots work in restore** (Cat Quest II `save-file1.dat`, PS Vue `localstorage.aes` – the old
  `%47[^.]` cut the name at the dot). The name now ends at the last ".<32-hex console id>/". Tested.
- **Engine keeps only 40 characters of a look result** (300 for tail/ and dns/ keys): round2-book.js line ~4213. That's why
  results read "4 kep", "manife". Messages now lead with the meaning. Proper fix (300 for save/ backup/ restore/ keys) is an
  engine deploy – not done mid-afternoon.
- **One command slot per PS4:** a new look REPLACES one that hasn't been taken yet (that's what swallowed a restore when a
  log read was sent right after it). Wait for a result before sending the next; several paths in ONE look go with `;`
  (not a newline). The engine-driven save sync must queue, not overwrite.

**THE SAVE STUDY (all profiles on Max (5) + Vale (2), 62 games):**
- **sce_sdmemory is NOT the norm – 12 of 62 games have it** (PlateUp, GT Sport, Darkest Dungeon II, Vampire Survivors,
  Outer Wilds, PvZ Replanted, Cuphead, Untitled Goose Game, God of War, + 3). It's just one possible part name.
- **A game's save = 1 to 17 parts, names chosen by the game:** 26 games have 1 part (SaveData, Main, savedata0, Slot00, 99,
  ProfileData…); 36 have several (Spider-Man MM 17, Mortal Kombat 11 12, Minecraft Dungeons 11, Trine 4 9, NBA 2K26 8…).
  So backup/restore must work per GAME = every part, never one fixed name.
- **Many games keep MAKING new parts as people play:** Spider-Man snapshots with random numbers, Minecraft Dungeons one per
  character, EA FC 24/26 a timestamped Settings part, Minecraft one per world, MK11 recordings, Trine slots. A receiving room
  usually WON'T have those parts → restore can only fill parts that already exist there. **Next build needed for member save
  sync: create a missing save part** (the way Apollo Save Tool imports saves), then the clean-move logic per part.
- **Leftover parts on the receiving profile** (e.g. another guest's Minecraft Dungeons characters) – for a whole-game move
  they should probably be removed after backup so only the member's progress shows. OWNER DECISION, not built.
- **Sizes (save image, not real data):** WWE 2K25 1 GB, CUSA02671 922 MB, LittleBigPlanet 512 MB, GT Sport 200 MB, Minecraft
  96 MB; most 3–50 MB. Real data is often far smaller (PlateUp image 48 MB, data 12 MB). Big ones need time + prep space.
- **The PS4 keeps its own hidden backup of each part (`sce_bu_<name>`).** Our restore leaves it alone; it's only used if the
  main copy is damaged – in that case the PS4 would fall back to the PRE-move data. Consider refreshing it later.
- Light check 17 Nov ~1:55pm after 1.1.37: same as before the change (13 ok; watchdog 24h-maths warning; Kaeden TV quiet;
  ❌ "side" timer hit 50 outside requests in one run – PRE-EXISTING, needs its own look; 2 SimplyBook calls from the guest
  booking page during the run). PS4 helpers + game-save storage step ✅.

### 17 Nov 2026, 2–2:30pm – leftovers removed on a move (owner: "yes"); whole-game backup + move (helpers 1.1.38 → 1.1.40)
Owner approved: when a member's game moves into a profile, leftover parts from earlier players are backed up, then removed.
- **The PS4's save service won't work from the helper** (`sceSaveDataInitialize3` → 0x809F000B INTERNAL, then every call
  0x809F0001 NOT_INITIALIZED – it only serves real apps with a title ID; Apollo is installed as one). Removed from the code.
- **1.1.39 delete = Apollo's way:** the part's row comes out of the PS4's save-list database
  `/system_data/savedata/<user>/db/user/savedata.db` (worked on as a copy in /data/round2/db/work.db, PRAGMA integrity_check
  must say ok, written back whole; the untouched original kept as /data/round2/db/<user>-<time>.db), then the files go:
  sdimg_<part>, <part>.bin, sdimg_sce_bu_<part> + sce_bu_<part>.bin if any, savedata_meta/user/<game>/<part>_icon0.png.
  `/_sdel.<user>.<game>.<part>` always backs the part up (prep + cloud) first; refuses PS Vue (CUSA00960 – its storage keeps
  the Vue jailbreak), the protected main-profile game, sce_bu_ names, an open game. `/_sparts.<user>.<game>` = the save
  list's parts. **The helper now links SQLite: 2.4 MB (was 1.3).** Fine for own-program rooms (old copy freed on update);
  the 4 shared-host rooms (Scarlett, Bella, Kai, Atlas) keep a bigger sleeping copy per update until they go own-program.
- Tested: Vale profile 11341157 (spare guest), MK11 guest replay RecentRecording9: backed up, row 1→0, 3 files removed, list
  11, nothing left. 15 min later the database file was still ours (mtime = edit time). **WATCH:** re-check after the PS4
  next writes that list itself (someone saves a game on that profile) that the row doesn't come back.
- **1.1.40 whole games:** `/_gback.<user>.<game>` = every part under ONE stamp `<console>/<user>/<game>/_game/<stamp>/<part>/…`
  + `game.txt` (part names). `/_gmove.<user>.<game>.<game backup>` = (1) plan: every member part must already exist on the
  receiving profile, else REFUSED with nothing written ("member parts missing here") – making parts is the next build;
  (2) whole-game backup of the receiving profile; (3) clean-replace each member part; (4) only if all worked, remove the
  receiving profile's parts the member doesn't have (+ their prep copies). All steps in save.log ("move plan / move done").
- Tested: refusal – Max User1's 12-part MK11 into Vale 11341157 (11 parts) → refused, missing RecentRecording9, nothing
  written. Full – Vale 11341157's MK11 (11 parts, game backup …/11341157/CUSA11379/_game/1794896311) into **Max User1
  14a1e944** (11.00 → 9.00): Max User1's old MK11 backed up (12 parts, …/14a1e944/CUSA11379/_game/1794896446), 11 parts
  clean-replaced (each "1 cleared, 4 kept"), leftover RecentRecording9 removed; save list 11, disk 11, prep 11.
  So Max User1 now holds the MK11 data that was on Vale's 2nd profile (spare guest profiles both; reversible from the backup
  except the removed recording until parts can be made).
- In practice the receiving profile is usually MISSING parts rather than carrying extras (Overcooked 2 5 vs 3, Minecraft
  Dungeons 6 characters vs 0, FC 24 differently-stamped settings) → **"make a missing save part" is now the blocker for real
  member moves** (Apollo: createSave = make the image + key, then INSERT into the same savedata.db; PS4 Save Mounter too).
- Light check after 1.1.40: same as before (14 ok; watchdog 24h-maths ⚠️; Kaeden TV ⚠️; ❌ "side" timer at 50 outside
  requests – pre-existing). systems.json (main 680523e) updated: proven list + "next = make missing parts".
- No System check step added: the move only runs on a PS4 by command; when the engine starts driving save sync (prep from
  bookings), add a step then (refusal paths: no backup / missing parts / game open – all safe to test with nothing written).

### 17 Nov 2026, 2:30–4:10pm – "day0" restore point, the 2:37pm network freeze, profile delete/re-make, close-the-game (helpers 1.1.41 → 1.1.43)
- **day0 snapshot (owner: back up everything before the launch purge = "pre day 0 restore point" + proof every PS4 can do the
  flow).** `/_snap.day0` (1.1.41): every part of every game of every profile folder → cloud as whole-game backups
  `<console>/<user>/<game>/_game/<stamp>/…` + game.txt (so `/_gmove` can restore any of them), plus
  `<console>/_snap/<stamp>/{index,users,todo,label}.txt`. Background job, ~45 s a minute, pauses while a game is open, keeps the
  PS4 out of rest, resumes after restart/update (Kai updated 1.1.42 mid-job and carried on). Cloud only (no prep copies). PS Vue
  skipped. **Done, all 0 failed: Max 383 parts 927 MB (stamp 1794897601), Kai 292 / 503 MB (1794899109), Atlas 197 / 363 MB
  (1794900900), Vale 98 / 169 MB.** Bella (silent since 3:39pm) + Scarlett (guests till 8pm) still to do – check-in booked 8:05pm.
  Uploads cost 1 Worker request per piece, NO Durable Object calls (engine ~4k of 100k requests at 2:40pm).
- **⚠️ Durable Object calls: 16→17 Nov (8am–8am) ≈ 98,000 of the 100,000 cap.** Today 33k by 2:40pm; the 1pm hour (12k) was mostly
  this chat polling ps4lookres/ps4list every 4 s. ps4list does 3 kvGets per PS4 (~20 calls each) – should use one hb.kvMany.
  Poll gently (≥1 min) and fix ps4list.
- **2:37–2:42pm: Vale, Atlas and Bella all went quiet; Max/Kai/Scarlett didn't** (Max's snapshot upload started 2:40). Vale:
  helper froze for good in 'read' (slow.log "the run before was last in: 14:37:13 read") downloading 1.1.41 – the PS4 itself
  was on (answered DDP 200); "payload received" from re-running round2-boot.elf but no popup = the stuck helper still held the
  lock; then the PS4 hung on "Restarting… do not unplug" → owner forced it off. Cold start → PS4 clock 01/01 08:00 → false
  "awake after rest mode" popup. Atlas: helper alive, every connect failed every minute 14:42→restart (Wi-Fi dropped and never
  rejoined; 5 GHz ch36 64% – try 2.4 GHz like Bella). Bella: came back 15:22 by itself; its FULL report has failed since
  11:24am while quick check-ins work (reason unknown – read its logs when it's back).
- **1.1.42:** handshake + read loops gave up only on a 15 s silence and retried "try again" forever → now any network step gives
  up after 30 s without new data; **watchdog thread** (libpthread): helper hasn't moved 5 min in a network step → shutdown() the
  socket; 20 min anywhere → an own-program helper _exit(3)s (starter brings a fresh one; never while a save is mounted); shared
  program can only log. All in slow.log ("watchdog: …"). Clock set after a cold start (wall clock < 2020 → today) is no longer
  a wake. On all rooms but Bella/Scarlett.
- **Profile delete / re-make test (Kai, owner at the PS4):** deleting User3 (12ae5b2a) removed the profile, /user/home/12ae5b2a
  and /system_data/savedata/12ae5b2a completely – nothing left. Re-made "User3" got a NEW id 12ae5b2d (counter max_used_home_u
  only goes up) with no savedata folder and no save-list database at all until its first save. `/_gmove` of old User3's games
  into it → refused, nothing written (missing parts). After the owner opened Moving Out 2 once on the new User3 (new game state),
  `/_gmove` worked (1 part, 0 failed) and **owner confirmed the old progress loads.** → Backups must be matched by profile NAME
  as well as id (users.txt in each snapshot); "make a missing part" must also create the save-list db for a never-used profile.
  Leftover: /system_data/savedata/29a71c4a on Kai = a Guest sign-in's save list (clean slate should cover Guest).
- **User5 on Kai** is no longer needed for wake (the main profile holds the wake key since 16 Nov) → back to an ordinary spare;
  clear its made-up account ID (ps4prof unacct) at some point.
- **Close the game – owner 17 Nov 4:03pm "ok make it" (replaces the 12 Nov rule "the helper never closes a game").** 1.1.43
  `/_close`: sceSystemServiceKillApp(app, -1, 0, 0) (looked up at run time; sceLncUtilKillApp as fallback) = Options › Close
  Application. Never PS Vue; waits up to 3 min until no save image of that game changed for 60 s, else refuses; checks it closed.
  The engine only passes look jobs when the room has no real session now/within 15 min. **Tested on Kai 4:09pm: Moving Out 2
  closed first try, rc 0, no wait needed.** To build: session end (+grace) → close → back up / park → clean slate.
- **Rooms: real guests only.** realGuests() skips every "SYSTEM BLOCK" (twin Vale↔Atlas, NOISE, ONLINE HOLD) and >12 h notes.
  **Owner agreed: ONLINE HOLD (a guest paying for that room) should count as busy** – to do with the engine change below.
- **Owner: minimise SimplyBook calls; critical operations stay live, low-priority checks read an engine schedule snapshot.**
  Each "Update now" / PS4 look busy-check = ps4Busy → sessDay0 = 4 SimplyBook requests. Plan: the timer saves the day's sessions
  (outside the Durable Object, e.g. cache/R2) and ps4Busy/roomBusy read that. Engine change → full check, after sessions.

### 17 Nov 2026, 4:10–6:45pm – make missing save parts (PROVEN in game), member-profile design, profile pictures (helpers 1.1.44 → 1.1.46)
- **1.1.44 `/_sdbinfo.<user>.<game>` (read-only)** logged how the PS4 builds saves (Kai, Moving Out 2, new User3 + main):
  save-list db `CREATE TABLE savedata (id INTEGER PRIMARY KEY AUTOINCREMENT, title_id, dir_name, main_title, sub_title,
  detail, tmp_dir_name, is_broken, user_param, blocks, free_blocks, size_kib, mtime, fake_broken, account_id, user_id,
  faked_owner, cloud_icon_url, cloud_revision, game_title_id)` + index, user_version 7, page 4096. PS4-made row: blocks 160,
  size_kib 5120, mtime "2026-11-17T08:01:13.00Z", user_id decimal, account_id 0. param.sfo: SAVEDATA_BLOCKS 160 (= image
  5,242,880 = 160 x 32 KB), ACCOUNT_ID 0, PARAMS user id + console fingerprint = **HMAC-SHA256(Apollo PSID key, OpenPsId) –
  our maths matched the PS4's own**. Kai main's saves carry ACCOUNT_ID 0 although the profile now has the shared ID (saves made
  before the ID change). A never-saved profile has no /system_data/savedata/<user>/ at all.
- **1.1.45 MAKE A MISSING SAVE PART** (Apollo createSave recipe): size from source SAVEDATA_BLOCKS; key from /dev/sbl_srv
  0x40845303 + unlock 0xc0845302 → <part>.bin; sceFsUfsAllocateSaveData + sceFsInitCreatePfsSaveDataOpt +
  sceFsCreatePfsSaveDataImage → sdimg_<part>; mounted, source sce_sys copied in with param.sfo stamped (ACCOUNT_ID = profile's
  registry account ID, PARAMS user id, HMAC, title id 2); save-list row (checked copy, written back whole); icon. `/_gmove` now
  makes missing parts (refuses only if the profile has no save list yet = never saved anything), undoes them if one fails.
  **TESTED: old User3's Overcooked 2 (METASAVE + CAMPAIGNSAVE0, 96 blocks each) into new Kai User3 12ae5b2d which had no
  Overcooked save → made + filled, 0 failed; OWNER: opens at 2-2 with the old progress, not a new save.**
- **Profile delete/re-make test done (owner confirmed Moving Out 2 progress in the new User3).** **Close-game test: save
  survived** (owner reloaded Moving Out 2 after the remote close – exact spot).
- **Member profiles – design agreed in outline (owner 17 Nov):** saves belong to the MEMBER (cloud by member + partner slot),
  never to a PS4 profile id. Each PS4 keeps a fixed set (main + User1–4), never deleted, only recycled: member logs in →
  helper renames a free signed-OUT spare to their name (sceUserServiceSetUserName, live), makes/fills their games, writes
  their picture → member picks their name on "who's using this controller?". Session end → back up to the member, wipe the
  spare's saves, default picture, rename back "User1". The helper records which profiles played which games (each minute);
  extra profiles guests create (User5…) are backed up/parked under the booking then DELETED by the helper
  (sceUserServiceDestroyUser – used by ps5upload, which refuses signed-in users; not yet tried by us). Member booking: main
  profile progress → member, next most-played profile → partner, changeable on "That's a wrap". Non-members: each profile
  parked separately with its name. Creating profiles: no known API (none found in any tool) – not needed with recycling.
- **Profile pictures:** live in /system_data/priv/cache/profile/0x<USER ID>/ = avatar.png + avatar64/128/260/440.dds +
  picture.png + picture64/128/260/440.dds + online.json (+ version.json) – exactly the .xavatar set of Lapy's Avatar Changer
  (LAPY20015, 21 avatars + packs in /data/AVATARS/) and notoriousnick04/ps4-tools XAVATAR Maker (MIT, Python/Pillow, DXT5 no
  mipmaps). Spares have only version.json (default picture). Deleting a profile left its 0x… folder behind (clean-up).
  1.1.46: `/_avinfo.<user>`, `/_avcopy.<from>.<to>` (signed-out target, never the main profile, old files kept in
  /data/round2/avbak/…), `/_avreset.<user>`. **TESTED: Kai main's picture onto signed-out User3 (10 files, not online.json)
  → owner: User3 shows Kai's picture on the profile-select screen, no restart.** Plan: Round2 avatar library (room
  characters via XAVATAR Maker + Avatar Changer packs), member picks at sign-up. Our rename is better than Avatar Changer's
  (theirs: activated accounts only). online.json content not read yet (file reader limited to Round2 folders).
- **Backups:** Max/Vale/Kai/Atlas done; Bella has guests till 8:15pm (check-in booked 8:20pm), Scarlett till 8pm (8:05pm).
  Bella's 2:42–3:17pm outage = same network event as Vale/Atlas; it recovered by itself. Atlas: report stale since 4:28pm
  while polling till 6:24pm – look at it.
- **7:00pm Kai – helper profile delete + renames (owner OK):** 1.1.47 `/_udel.<user>` (sceUserServiceDestroyUser; refuses main,
  signed-in, game open, any save part left). User5 12ae5b2c (empty extra wake-test profile) signed out remotely → deleted rc 0:
  profile, /user/home and save list gone, picture folder removed. Renames via ps4prof name (all rc 0, live): User1 12ae5b28 →
  **Aliff**, User2 12ae5b29 → **Karen**, User3 12ae5b2d → **Player 3**, User4 12ae5b2b → **Player 4** (owner's naming: default
  spares = "Player N"). Leftover picture folder 0x12AE5B2A (the User3 the owner deleted by hand) – clean-up should remove
  picture folders whose profile is gone.
- **CLEAN SLATE CHECKLIST (owner 17 Nov 7:16pm: "a full clean slate removes profile pictures"):** per spare profile – saves
  backed up/parked → save parts removed → picture back to default (`/_avreset`: avatar*/picture*/online.json out, version.json
  stays) → name back to "Player N" → signed out. Extra profiles (beyond main + Player 1–4) backed up/parked then deleted
  (`/_udel`). Picture folders whose profile is gone removed. Main profile: saves wiped except house saves (GT Sport on Max),
  picture kept (room character). Tested 7:17pm: Player 3 (12ae5b2d) picture reset – 10 files removed, only version.json left.

### ⚠️ RULE – INTERNAL FIRST (owner 17 Nov 7:43pm, critical; agreed earlier and then missed – don't repeat)
**Every save step copies to the PS4's internal storage FIRST; the cloud gets them later from a background batch. Never
straight to the cloud.** Less effort, fewer failures. Internal copy = /data/round2/prep/<user>/<game>/<part>/ + manifest.txt
("path<TAB>size<TAB>sha256" – a fingerprint per file), checked before anything is removed, queued in
/data/round2/prep/pending.txt. The cloud batch (TO BUILD) uploads pending items in the background and skips files whose
fingerprint is already in the cloud – unchanged saves are never re-sent. Session end only touches the games played that
session. Owner also: skip cloud uploads in tonight's Kai clean slate (the day0 backup covers it).
- Kai clean slate 7:38pm (1.1.50, cloud-first – the mistake): 16 of 115 games uploaded + wiped, 0 failed; stopped by a
  "/_clean.stop" at 7:43:30pm (not sent by this chat). Restarted 7:5xpm on **1.1.51 = internal first** for the 99 left.


### 17 Nov 8:05pm – helper 1.1.52: cloud batch (OFF), launch purge, INTERNAL-COPY BUG FIX
Owner 8:05pm: Kai's order works (Kai, Player 1-4). Code the background cloud batch first; then every room: clear all saves
IF its restore point succeeded, remake profiles (tell him which PS4s need profiles added/deleted), fresh internal batch
folder, clean slate ready. **From 18 Nov only the clean slate is tested.** No cloud backups of saves needed yet (no
membership system yet) → the cloud batch is built but OFF.
- **BUG (found 8:10pm, fixed in 1.1.52):** `sv_del_part` still deleted the part's prep copy (1.1.40 leftover, from when
  the cloud came first). So Kai's 1.1.51 clean slate copied each part internally and then threw the copy away – Kai's
  prep game folders were empty. Kai is covered by its day0 cloud restore point (owner: nothing after it was critical).
  1.1.52 never deletes an internal copy and logs "internal copy ... MISSING after removal" if one is ever gone.
- **Cloud batch** (`/_cloud.on|off|state`, flag file prep/cloud_on, default OFF): reads prep/pending.txt, ~20 s a
  minute, only with no game open and no snapshot/clean running. Part unchanged (manifest.txt == uploaded.txt) → skipped.
  Else each file read from the internal copy, SHA-256 checked against the manifest (damaged copy never sent), 1 MB pieces
  to `<console>/<user>/<game>/<part>/<time>/` + manifest (restorable with /_srest); writes uploaded.txt + cloud.txt.
  5 tries then cloud_failed.txt. Report field `cloud` {on, waiting, up, same, fails, mb}. Worker requests only, no DO calls.
- **Purge** `/_purge.<label>` (launch clear): refuses unless snapshot <label> on this PS4 is done with 0 failures, no game
  open, no spare profile signed in. Sets the old prep aside (renamed `prep-before-<label>-<time>`, nothing deleted), makes a
  fresh empty prep, then runs the clean-slate job over every registered profile (main included). A part that is in the
  restore point (index, not failed) and unchanged since its stamp is removed with no new copy; anything newer is copied
  internally first. Never PS Vue, the protected main-profile game (GT Sport on Max), homebrew settings (APOL*, LAPY* –
  Apollo's settings on Kai Player 4 got wiped by the 1.1.50/51 clean slate). Profiles whose folders remain after the
  profile was deleted are not touched.
- Kai: 1.1.52 8:13pm, `/_purge.day0` → "0 games on 5 profiles" (already clean) – fresh internal folder. Ready for 9pm.
- Rooms 8:22pm: Vale 1.1.42 (day0 OK, session till 11:30pm → update + /_purge.day0 after). Max (day0 OK) not answering
  since ~7:30pm (rest/off). Atlas (day0 OK) silent since 4:28pm. Bella 1.1.46 (no day0) took no command since 8:12pm,
  update queued. **Scarlett 1.1.37 (no day0) CAN'T UPDATE: download stops at ~2 MB twice ("download size 2096563,
  expected 2439664")** – the reply buffer doubles 2 MB → 4 MB and the old shared-host helper has no memory left. 11.00 = no
  own-program; needs a PS4 restart + jailbreak (fresh memory), then update. Then per room: /_profiles, /_snap.day0 where
  missing, /_purge.day0, rename spares Player 1-4, /_avreset spares, /_uorder.
- **8:41pm owner turned on Kai, Atlas, Max.** Max took 1.1.52 (owner tapped), `/_profiles` = Max + User1-4 (no add/delete
  needed), `/_purge.day0` → **159 games, 0 failed, 378 parts removed** (4 kept: GT Sport main, PS Vue, homebrew), renamed
  User1-4 → Player 1-4 (rc 0 each), /_avreset spares, /_uorder Max first → "5 profiles re-ordered, 0 failed". **Max ready.**
  Atlas: no network 18:39–20:37 (26 connect fails), back 20:37, auto-took 1.1.52 at 20:38, last poll 20:44, silent since.
  Scarlett: owner restarted it twice (helper fresh 20:47) – still 1.1.37; `/_selfown` (own program = own memory, proven
  on 11.00 at 12:41pm on Vale) sent 8:55pm but **refused: session until 11:45pm**. After: /_selfown → update → /_snap.day0
  → /_purge.day0 → profiles. Vale after 11:30pm. Bella asleep since 8:13pm, no day0 yet.

### 17 Nov 10:15pm – CLEAN SLATE AFTER EACH SESSION (owner: params + "a log in the control centre under the PS4 tab")
- **Helper 1.1.53/1.1.54** `/_reset[.<label>]`: 1) close the open game (close_game, waits while saving, else NOT DONE);
  2) sign out signed-in spares; 3) every game on every registered profile (main incl.; never PS Vue, protected main-profile
  game, APOL*/LAPY*) → internal copy with fingerprints, then remove (game left if the copy fails); 4) profiles: main + 4
  oldest spares kept, extra (guest-made) deleted via /_udel, <4 = error "add by hand", spares → "Player 1-4", /_avreset,
  /_uorder main first; 5) one line in /data/round2/clean/history.txt + problems in errors.txt. Report: log.clean +
  log.cleanerr (last 6 each, 150 chars a line – 1.1.54 shortened the line), clean.kind (reset/purge/clean).
- **Engine 912d004 + 8223531 (deployed, live hash = file, 27 bindings, 3 timers):** `ps4ResetRun` on the 10-min now ticks
  (shares the calendar read – no extra SimplyBook requests): real guest session ended 2–45 min ago, no real guest in the room
  now, PS4 on 1.1.53+ and answering → `/_reset.<room>-<hhmm>` with nobusy; else logged waiting / missed. kv `ps4resetAuto`
  {on, from} (**ON from 7am 18 Nov**, set for the owner), kv `ps4resetLog` (last 40). Staff `ps4reset` ("Clean slate now",
  refused during a guest session) + `ps4resetauto`. ps4list now ONE Durable Object call (kvMany).
- **Control centre 2e1897b..2216f03:** PS4s › 🧽 Clean slate (switch, engine log, each PS4's runs + problems), tile line
  (running x/y · last OK / problems + newest problem), "Clean slate now". System check step "PS4 clean slate after each
  session" (in the Light check). Light check before 13/4/0 and after 14/4/0 (the 4 = known: watchdog old lines, SimplyBook
  6,259 today – full check skipped because of that, do one in the morning, Kaeden TV, Atlas TV app).
- Tested: Max + Atlas "Clean slate now" → "OK · 0 games … 4 spares, 0 renamed, 0 deleted, order ok · 0 problems".
  Atlas launch clear done 9:47pm: 85 games, 0 failed; spares → Player 1-4, pictures, order. **Ready: Kai, Max, Atlas.**
- Tomorrow: Kai (1.1.52) updates by itself in quiet time after its midnight session. Vale (1.1.42), Bella (1.1.46,
  asleep, no day0) need 1.1.53+ or the engine logs "too old". Scarlett (1.1.37) needs /_selfown → update (after 11:45pm
  session). A PS4 not purged yet is still fine: the first reset copies everything internally and clears it.
- **10:48pm owner: timing + "double confirm with SimplyBook or the engine".** Engine e424a1e (deployed, ab12aee5…, 27
  bindings, 3 timers): reset time = guest end + N min (kv ps4resetAuto.after, **10**; control centre 5/10/12). The 10-min
  tick only writes kv ps4resetPlan (+ logs asleep/too old/missed); the PS4's own minute poll (ps4ResetDue in ps4Cmd) sends
  it once due, after a LIVE SimplyBook roomBusy(unit, 0) (≈4 requests, max every 2 min per PS4) – still in use (extension
  or next guest) = "waiting". Light check after: 14/4/0. Timing measured: Kai 99 games copied+removed ≈2.5 min; a normal
  session (1–5 games) ≈10–40 s; profiles ≈20–30 s; pick-up ≤1 min; closing waits up to 3 min if a save is being written.
- **11:16pm–11:45pm countdown, failsafes, button detector, early-bird test (owner).**
  Helper 1.1.55: `/_reset.<label>.w<sec>` countdown with PS4 pop-ups (start, 60, 30, 10 s; they show over a game), engine asked
  20 s before the end (`/ps4/resetok`, live SimplyBook): in use / switch off / no answer = NOT reset (HELD / NOT DONE line);
  `/_reset.cancel`; survives a restart. Tested: Max 45-s countdown → held "automatic reset is switched off" (correct, switch
  starts 7am); Atlas 4-min countdown → Stop → "countdown stopped". Helper 1.1.56: **button detector** (scePadReadState on each
  signed-in profile's pad + scePadGetIdleCount, every 2 s): a press moves the reset to 2 min after the last press, "still
  playing?" pop-up; 10 min of play past the reset time → report → engine staff alert (phones); 60 min → not reset. NOT PROVEN
  that a background program sees the pad while a game has it – unreadable = timer only (1.1.55 behaviour). Read-only test
  `/_input.<sec>` (press buttons during it; result input/result + raw first/last). **TO DO 18 Nov morning: run /_input.20 on
  Max with the owner pressing buttons, once with a game open.**
  Engine 7832d01 + 2013706 (deployed, 5c5b7bc0…, 27 bindings, 3 timers): countdown sent up to 5 min before the reset time;
  dynamic live checks (start; every 2 min for the first 6 min, then 10; final at 20 s); extension / late session made in the
  control centre stops a countdown at once (ps4ResetPoke); `ps4resetAuto` = {on, from 7am 18 Nov, after 10, **only 'eb'**} –
  owner 11:38pm: test run on the early-bird (11:00) sessions only. Helpers: Vale 1.1.55 (auto, after its session), Max
  1.1.55→1.1.56 queued, Atlas 1.1.55 (asleep, 1.1.56 next), Kai 1.1.52 (busy till 12am), Bella 1.1.46 asleep, Scarlett 1.1.37.
- **11:53pm owner: no pop-ups (break the guest experience)** → 1.1.57 silent countdown. **11:42pm Max FROZE** during the
  own-program hand-over to 1.1.56 (own-spawn.log stops at "spawning"; the run before was last in "read"); after the owner's
  restart the same spawn took <1 s. **12:06am the /_input.20 button test FROZE Max again** right after it started reading the
  controller (scePadInit/GetHandle/Open/ReadState from a background program) → **12:08am: automatic reset switched OFF**
  (ps4resetAuto.on=false), **helper 1.1.58: all controller reading off, libScePad unlinked** (silent timer countdown as
  1.1.55). 1.1.56/57 still have the pad code but only run it in a countdown (none can start: switch off) or /_input – never
  send /_input to them. No kv switch for automatic helper updates exists from the control centre (kv ps4auto) – add one.
  Rooms 12:10am: Vale/Kai/Scarlett 1.1.57 (auto-updated after their sessions), Max frozen (1.1.57), Atlas silent since 11:46pm
  (1.1.55), Bella 1.1.46 (1.1.58 queued, drops off in rest mode). **Scarlett: finally updated** (fresh restart = enough
  memory); profiles Scarlett + rubbaduckie + User1 (only 2 spares → 2 to add by hand; rubbaduckie = a guest's own profile?
  owner to decide); /_snap.day0 started 12:09am: 132 parts, 59 games.
  Idea for button detection without the pad library: watch the game's own activity instead (e.g. the PS4's auto-power-down
  idle timer via a read-only system call), or just rely on time + SimplyBook – owner to decide.

### 18 Nov 2026, 12:40am – rescheduling: the first 15 minutes after booking unlock every day (owner)
- Before: the 15 free minutes only removed the fee; the timing rules still applied, so someone who booked tonight for tomorrow (or an
  early bird inside 3 days) and had picked the wrong day could not fix it online even a minute later.
- Now: `C.fresh` (no move of any kind yet AND < 15 min since the booking was made) makes `gLogic.stage()` answer `early` – any free
  day or time. Still closed under 3 h before the session; the new time still has to be 3 h+ from now. **Not** after a move (the
  15 free minutes after a move keep the normal locks – otherwise one paid same-day change would open every other day).
- Money: unchanged grace maths – no change fee, no POPULAR add-on; the guest pays the price difference if the new slot costs
  more, nothing back if it costs less (early bird → normal slot pays up to full price).
- Page: rule tile says "JUST BOOKED – wrong day or time? Move to any free slot in your first 15 minutes"; the picker's note says
  the same. System check step "Guest rescheduling…" tests it. Engine 365e54a deployed 12:45am (live hash checked before and after; 27 bindings, 3 timers). System check NOT run afterwards (no browser link).

### 18 Nov 1:20am–2:00am – PS4 launch clear finished except Bella
- Scarlett: day0 132/132 OK; purge day0 ran 1:20am **from another chat** (57 games, 0 failed, 130 parts – all in the restore
  point); spares renamed Player 1–2 (rubbaduckie = spare, owner); **2 profiles to add by hand**.
- Kai: "Clean slate now" 1:28am after the 9pm guests: 0 games, 2 spares renamed back, order ok, 0 problems.
- Vale: was in rest mode 91 min (watchdog "stuck in read" lines = the rest period). purge day0 1:54am: 47 games, 0 failed,
  96 parts; reset 1:57am: only 1 spare (User2 → Player 1) → **3 profiles to add by hand** (logged as a problem in the log).
- Bella: profiles Bella + User1–3 (**1 to add**); day0 snapshot started 1:53am, 0/134 at 2:00am – **its network keeps
  dropping** (2.4 GHz ch 6 via mesh unit 8c:86:dd:14:95:10, others 5 GHz ch 36; 35-min outage 12:08–12:43am; full report
  stale while polls get through). Then: purge day0, reset. Suggest a cable or 5 GHz for Bella.
- All six PS4s on helper 1.1.58 (no controller code). Automatic reset OFF (ps4resetAuto.on=false) until a safe input signal
  exists (idea: GoldHEN plugin inside the game writing the last input time to a file – owner to decide).


### 18 Nov 2:15–3:00am – shop router (TP-Link HB611-SGST, Singtel EasyMesh) tuned – owner approved each change
- Main unit 192.168.88.1 (cc:ba:bd:28:65:60), second unit _9510 at .8 (2.4 GHz wireless link to the main unit). One Wi-Fi name `round2` on all bands.
- **Changed:** 5 GHz width 80→40 MHz; 2.4 GHz power Middle→High; router self-update window 3–4am→**7–8am** (it was
  dropping Wi-Fi mid-night-shift); **802.11r fast roaming OFF** on 2.4 + 5 GHz (old PS4s can't use it; suspected in Bella's
  "connect failed"); **fixed addresses (Address Reservation) for 19 devices**, each kept its existing IP:
  PS4s Bella .6, Kai .18, Vale .11, Max .23, Scarlett .4, Atlas .15; second unit .8; Kai's TV .3, VALE TV .7, LG TVs .21/.27,
  C211 .10, MakingBroadway .28, C100 camera .24, unknown fixed devices .2 .12 .13 .17 .22.
- Signal after: Bella −83→−76/−78 dBm, Kai −82→−76 (both on main unit 5 GHz). Atlas now on main 5 GHz (68%).
- **Left as is (owner):** UPnP off (PS4 online play strict – owner doesn't need it; helper/streaming don't need it); no guest
  Wi-Fi; Singtel's two port rules (1024→.5, 1025→.8, HDM_CR_*) – ISP-managed, don't touch; 6 GHz fast roaming left on.
- **No switch exists** for the mesh "Trigger Roaming by Reason 8" nagging (Kai's TV, an LG TV, weak phones every ~10 s; it fills
  the 265-line router log in ~15 min). Harmless (clients ignore it). Real fix = cable / move the TV or second unit.
- Side effects tonight: each Wi-Fi save restarts the radios. Atlas got stuck asking for an address (DHCP DISCOVER loop) after
  the 2.4 change until the owner reconnected it on 5 GHz; Bella's helper (shared mode) hung mid day0 snapshot (44/134) after the
  5 GHz restart → owner to re-send the helper, then re-run `/_snap.day0` until 0 failed, then purge + reset.
- Router admin sessions time out after a few idle minutes; the owner types the password himself (never Claude).

### 18 Nov 3:03–3:20am – OWN-PROGRAM PROVEN ON 11.00 (Bella) → helper 1.1.60 auto-switches on 11.00 too
- Owner in Bella's room. Bella (11.00, restarted 3:01am, shared pid 46): `/_selfown` → **own=1 pid 82**, day0 snapshot carried on.
- Released **1.1.59** (version number only, ps4-release bcd845a) → `ps4update` Bella → "switched to 1.1.59 (own program)",
  **pid 82→113**; `/_ps`: only 113 (parent 1), 82 gone = own→own update frees the old program on 11.00 too.
- `/_rest` 3:08:52 → asleep; network wake from Vale (`/_wakerp`) did NOT reach Bella (known: Bella drops off Wi-Fi in rest);
  owner pressed PS ~3:14 → **same pid 113 resumed, own=1, no restart**. All three checks passed.
- Note: after a `/_selfown` from shared, the old shared copy sleeps inside GoldHEN's BinLoader host until the next PS4
  restart (once per boot, by design) and its watchdog still writes "stuck … in 'read' (shared program)" lines – harmless noise.
- **1.1.60** (ps4-helper 1aa29cb, ps4-release ba66e0d, sha 348e71f3…): auto-promote also on 11.00 (`fw_major()==0x11` –
  kern.sdk_version 11.00 = 0x11, not 11!) and never while a game (other than PS Vue) is open. Reaches every PS4 in quiet
  time; pushing it to all PS4s at once from here was blocked (needs owner say-so).
- Bella day0 re-snapshot running again (previous run: 134/134 with 7 failed during tonight's Wi-Fi restarts) → when 0 failed:
  `/_purge.day0`, then `ps4reset`; owner adds 1 profile.

### 18 Nov 3:20–3:40am – FREEZES = TOO MANY OWN-PROGRAM SPAWNS SINCE THE PS4 STARTED → helper 1.1.61 limit
- 1.1.60 pushed (owner "push it now"): Max, Atlas, Bella, Scarlett → own 1.1.60 (Scarlett auto-promoted on 11.00 ✓).
  Vale: "download failed (-1 no memory)" = shared host exhausted → needs a PS4 restart (then 1.1.60 auto-promotes).
- **Kai froze at 3:04:46am** taking 1.1.59: its `/data/round2/own-spawn.log` stops at "spawning" (inside elfldr_spawn) on
  its **15th own-program spawn since its last PS4 start** (17 Nov 14:56 → 14 OK). The same 2440160-byte file spawned fine
  after the restart → not the file. **Max's 11:42pm freeze** stops at the same "spawning" step on its 6th spawn since start,
  but that was 1.1.56 (libScePad build, 2457232 B) – may be the pad library instead. Starter (boot/main.c) is not involved
  (it only relaunches when nobody holds helper.lock; the own hand-over keeps it held; boot.log quiet then).
- **1.1.61** (ps4-helper, sha 52735fe6…, 2440264 B): `/data/round2/own-spawns.txt` = "<kern.boottime> <count>"; every
  own spawn (update, /_selfown, auto-promote) counts; at **5 per PS4 start** updates answer "waits for the next PS4 restart"
  (retry flag) without downloading, and selfown/auto-promote are skipped. Root cause still unknown (kernel-side per spawn).
- Reading a PS4's spawn history: look `/_tail./data/round2/own-spawn.log|200`.

### 18 Nov 3:36–3:50am – "PS4 on but helper silent" ROOT FOUND: the ROUTER stops delivering DIRECT traffic to that PS4 (not the helper)
- Atlas + Bella both went silent at 3:25:45 (same 3 s), PS4s on, signed in, not frozen (owner checked). Own-program 1.1.60.
  The own-program watchdog (restart after 20 min stuck) did NOT fire → the helper isn't stuck, its requests just fail.
- **Test from Max (look job, Sony's own discovery service on port 987, nothing of ours):**
  `/_ddpall` (broadcast) → Atlas .15 and Bella .6 ANSWER. `/_ddp.192.168.88.15` / `.6` (unicast) → **no answer in 4 s**;
  controls `/_ddp.192.168.88.18` (Kai) and `.4` (Scarlett) answer. So: PS4→network works, broadcast→PS4 works,
  **unicast→PS4 is dropped by the Wi-Fi (main unit / EasyMesh)**. Internet replies are unicast → every connect times out
  ("-0x0044 … in 'connect'"), the PS4 still shows "connected". Same signature as Atlas 2:24am (router log: DISCOVER arrives,
  its OFFER never accepted). Earlier spells (Bella 12:10/1:06/2:03/2:46am, Atlas+Bella 17 Nov 2:37pm) fit; they end by
  themselves after 10–45 min or at once when the PS4's Wi-Fi is reconnected (Settings › Network).
- Hits the weak-signal PS4s on the main unit's 5 GHz (Atlas, Bella; Kai is the third weak one). Mechanism not yet pinned:
  stale mesh/steering entry (router thinks the PS4 sits on the other unit/band) or a power-save buffering bug
  (OFDMA/TWT on, firmware 0.9.0 Build 260212). NEXT: with the router page open during a spell, see which unit/band it lists
  the PS4 under (Wireless › Statistics, Network Map), then try: OFDMA+TWT off; a PS4-only network name on the main unit;
  second unit off as a test.
- **How to test this again:** from any healthy PS4: look `/_ddp.<ip>;/_ddpall` – broadcast yes + direct no = this fault.
- Corrections: "Atlas asleep" / "Bella too busy to report" (3:30am) were wrong; Bella's "frozen helper" at 2:53am was most
  likely this too (its log: "back after 40 failures" at 2:57:58, before the owner's restart).
- **3:53–3:58am, router page open DURING the spell (Atlas + Bella still silent since 3:25:45):**
  Wireless › Statistics lists BOTH on the main unit's 5 GHz (Atlas −76 dBm, Bella −75), packet counters still counting both
  ways; no log lines for either (the log only holds ~4 min – ~60 "Trigger Roaming" lines a minute). **System Tools ›
  Diagnostics › Ping from the router itself: Kai .18 = 4/4 back (~100 ms); Atlas .15 = 0/4; Bella .6 = 0/4.** So the router
  believes they are connected yet cannot deliver a single direct packet to them; Kai at −78 dBm (weaker) is fine → not
  signal strength, not the mesh moving them. A per-device state inside the router's 5 GHz radio is stuck (suspects: pairwise
  key slot / power-save buffering; firmware 0.9.0 Build 260212, WPA2+WPA3 mixed, OFDMA+TWT on).
- Both stuck in the same 3 s, at the time the owner hard-restarted Kai (3:25–3:27). Idea to test: a device dropping off /
  rejoining the 5 GHz radio breaks delivery to OTHER devices (also fits 2:03 + 2:46 radio restarts, 2:24 iPhone hopping units).
  Test: watch `/_ddp.<ip>` to the others while one PS4 is restarted.
- Ways out, cheapest first: (1) helper self-heal – when the engine AND the router (192.168.88.1) don't answer for ~2 min while
  NetCtl says connected, make the PS4 rejoin Wi-Fi itself + write a line (needs a safe rejoin call, test on Bella);
  (2) router: WPA2-only instead of WPA2+WPA3, OFDMA/TWT off – one at a time, each save restarts the radios;
  (3) report to Singtel/TP-Link; (4) cable for Atlas/Bella/Kai.
- **4:02–4:09am – spell over, Bella's launch clear DONE.** Owner re-ran the connection on both: Bella back 4:02:44, Atlas
  4:03. Their own net-fail.log: Bella "back after 30 failure(s), 2087 s", Atlas "back after 31 failure(s), 2162 s" – one
  `/ps4/cmd … in 'connect'` failure every ~74 s for 35 min, SAME pids before and after (170, 289) = the helper ran the whole
  time; the Wi-Fi delivered nothing to it. Bella: day0 134/134 **0 failed** → `/_purge.day0` 4:05 OK (57 games, 0 failed,
  134 removed) → `ps4reset` 4:08 OK (4 spares renamed Player 1–4, order ok, 0 problems). **All six rooms are now launch-clean.**
- 4:09am: all six on helper **1.1.61, own program**, all answering. Still open: Scarlett needs 2 more profiles (owner),
  then `ps4reset`; restart-a-PS4 trigger test; helper self-heal (Wi-Fi rejoin) vs router settings – owner to choose.

### 18 Nov 4:10–4:28am – THE PATTERN: only the two CUH-72xx Pros (Atlas CUH-7208B, Bella CUH-7218B) get stuck; router "option 2" applied
- Helper report `hw.model`: Vale CUH-2006A (slim), Scarlett CUH-1006A (fat), Max CUH-7006B, Kai CUH-7016B, **Atlas CUH-7208B,
  Bella CUH-7218B**. Every "connected but nothing arrives" spell tonight (and the old "Atlas + Bella drop off in rest mode")
  is these two = the last Pro revision, different Wi-Fi chip. Different firmware (9.00 / 11.00) → hardware + this router.
- They get stuck right after the router's Wi-Fi restarts (5 of 5 tonight: 2:03, ~2:15, 2:46, 4:14 OFDMA/TWT toggle; 3:25
  unexplained) and are cured by the PS4's **Test Internet Connection** (owner 4:02) = a fresh join.
- Router changes made 4:13–4:26am (owner approved): **OFDMA off** (applies at once, all bands), **TWT off on 2.4 GHz** (TWT is
  per band – 5 GHz TWT still ON, to do), **2.4 GHz: mode b/g/n/ax (Wi-Fi 7 off) + security WPA2-PSK[AES]** (saved, verified),
  **5 GHz: mode a/n/ac/ax + WPA2-PSK[AES]** (Save clicked 4:26; not verified – see below). WPA2-only is hidden in this
  firmware while the band's mode includes "be". 6 GHz / MLO untouched.
- **Access Control was switched ON (deny list, EMPTY) as a kick attempt – it does NOT kick a Wi-Fi client (no log line,
  Atlas stayed stuck). Switch it back OFF (Security › Access Control).** No per-client kick exists in this web page.
- After the 5 GHz save the owner's laptop (Chrome + desktop app) did not come back online – most likely its saved Wi-Fi
  profile was WPA3 and Windows won't rejoin a now-WPA2 network without re-selecting / forgetting it. Phones that joined with
  WPA3 may need the same once. Until the laptop is back: no router page, no control-centre view from this chat.
- TO VERIFY when back: all six PS4s polling; Atlas + Bella after this restart (stuck or not = whether WPA2-only/ax helps);
  5 GHz page shows a/n/ac/ax + WPA2; then 5 GHz TWT off; Access Control off.
- Option 1 (helper self-heal): libSceNetCtl has `sceNetCtlDisconnectIpcInt` / `sceNetCtlConnect*IpcInt` (what Settings uses)
  but the arguments are undocumented (emulators only stub them) – NOT to be called blind after tonight's freezes. Safe first
  step still to build: on 2 failed check-ins, test the router (192.168.88.1) directly, write "connected but nothing arrives"
  to net-fail.log, so the control centre can show WHICH fault it is; rejoin call only after a careful single-PS4 test.

### 18 Nov 4:30–4:40am – RESULT: with WPA2-only, Atlas + Bella rejoin by themselves (3 restarts, 0 stuck)
- Laptop back 4:30 (owner re-joined it – its saved profile was WPA3). Router verified: 2.4 GHz b/g/n/ax + WPA2-PSK[AES];
  5 GHz a/n/ac/ax + WPA2-PSK[AES]; OFDMA off; TWT off on 2.4 AND 5 GHz (5 GHz toggled 4:32); **Access Control OFF again**.
- Their own net-fail.log (Atlas's clock is 493 s fast): stuck from the 4:14 OFDMA/TWT restart (still WPA2+WPA3) –
  Bella 4:15:18 → "back after 7 failure(s), 505 s" at **4:23:43**, Atlas 4:15:33 → back **4:22:57** = the very restart that
  switched security to WPA2-only (5 GHz still in "be" mode + TWT on then → the security mode is what mattered).
  After the next two restarts (4:26 5 GHz mode save, 4:32 TWT off): **no failure line at all** on Atlas, Bella or Kai;
  all six polling within 2½ min; router's own ping 4:36am: Atlas 4/4, Bella 4/4.
- Score tonight: WPA2+WPA3 mixed = 5 restarts, the two CUH-72xx Pros stuck 5 times (8–35 min, or until re-tested by hand);
  WPA2-only = 3 restarts, 0 stuck. Likely cause: the CUH-72xx Wi-Fi chip mishandles this router's WPA2/WPA3 transition mode.
  NOT yet explained: 3:25:45 (no restart). Watch the next days: any `back after N failure(s)` ≥ 5 min in Atlas/Bella's
  net-fail tail = it's back. If so: next try a PS4-only network name (Multi-SSID) or cable for those two.
- Side effect to expect: devices that had joined with WPA3 (laptop did; some phones may) must re-select "round2" once.
- Light System check 4:38am: 14 passed · 4 to look at · 0 failed (Kaeden TV 13 days silent – renovation; Atlas TV app
  android 1.0.286 old; Vale's 1:57am reset "PROBLEMS" line (fewer than 4 spares then); watchdog: 5 "24 hours" maths
  lines in the control centre, e.g. 3638 / 3962 – not from tonight's PS4 work, check + mark day-ok next session).
- Helper self-heal (option 1) NOT built – see above; with WPA2-only it may not be needed. Decide after a few days of logs.

### 18 Nov 4:47am – NOT FIXED: Atlas + Bella stuck again at ~4:38:30–4:39:45 with NO router restart (WPA2-only in force)
- Owner asked for the full test. From Max AND from Vale: shout (`/_ddpall`) → all six answer; direct (`/_ddp.<ip>`) → Vale,
  Max, Scarlett, Kai answer, **Atlas + Bella: no answer**. Router ping: Vale/Max/Scarlett 4/4, Atlas 0/4. Last polls Atlas
  4:38:42, Bella 4:38:29 – both again inside the same minute. So "3 restarts, 0 stuck" was luck or only half the story.
- No setting was changed after 4:32. Around then: the owner's laptop was re-joining the Wi-Fi (asked for the password several
  times, bridge dropped ~4:36–4:37 and ~4:45); Light System check 4:37:55–4:38:30 (reads only). 3:25:45 = Kai hard power-off.
- **Working theory (fits everything, not proven): the router renews the shared "group" key whenever a device leaves/joins that
  band, and the CUH-72xx Wi-Fi chip breaks its private-key state when that renewal arrives** → both 72xx stop accepting direct
  traffic at the same instant; broadcast (new group key) and sending still work; a fresh join (Test Internet Connection) or
  time (8–35 min) cures it. Router UI has only "Group Key Update Period" (0 = off); no switch for renew-on-leave.
- Test for the theory: when both are healthy, make one device leave/join 5 GHz (laptop Wi-Fi off/on) and watch
  `/_ddp.192.168.88.15;/_ddp.192.168.88.6` from Max within the minute.
- If true, fixes: (a) Atlas and Bella each on their OWN network name (router Multi-SSID has MSSID1 + MSSID2 per band – each
  name has its own group key, nobody else joins/leaves it) – needs the Wi-Fi picked once on each PS4; (b) cable; (c) helper
  rejoin (API undocumented). WPA2-only / Wi-Fi 7 off / OFDMA+TWT off were left in place (harmless).

### 18 Nov 12:50pm–1:45pm – second mesh unit had stopped taking devices; reset + re-added; Tapo cameras back on it
- Owner: the 2 Tapo cameras outside (C211 .10, C100 .24) must use the second unit. At 12:50 the second unit (_9510, .8) had
  0 devices; both cameras hung off the main unit (C211 −78, C100 −81, 1/4 ping, DHCP loop). Cause not proven (stale config
  after the 4:23am security change is the guess; its status page shows "be mixed" even after reset, so that line isn't proof).
- 1:01 rebooted it from its own page (192.168.88.8, cert warning + login by owner) → it did NOT rejoin the mesh (backhaul
  log: disconnected reason 8, nothing after). 1:27 owner factory-reset it (pinhole 5 s); 1:30 main › Wireless › Mesh ›
  Add Mesh Device › Add By Scanning › found 8C:86:DD:14:95:10 › Add → "added successfully". No Wi-Fi drop on the main unit.
  (WPS is OFF on the main unit – the WPS-button method would need it on.)
- Owner moved it further into the lobby, then turned it to face the main unit: backhaul −75 → −73 dBm (2.4/5 GHz ~51 Mbps,
  6 GHz 144 Mbps). After the owner rebooted the cameras in the Tapo app (~1:42): **both on the second unit – C211 −36 dBm
  (ping 5 ms), C100 −57 dBm (ping 63 ms avg)**.
- Main router admin sessions now kept alive by a 4-min menu click in the Claude tab group (until the tab reloads).
- Still to do after closing: 2.4 GHz power High → Middle on the main unit (rooms in session at 1:45pm).

### 18 Nov 2:10–2:30pm – Bella stuck 3× today during a guest session; JAILBREAK DONGLE was in Bella's LAN port → pulled (test)
- Bella's own net-fail.log: 10:44–11:17 (32 min, guest in room), 13:30–13:33 (3½ min, = second mesh unit re-added),
  13:50–14:03 (12½ min, cause unknown). Each = "connect" failures every 74 s; it un-sticks by itself.
- 2:11pm test from Max: Bella direct ✓ (healthy then), Kai ✓, Atlas no answer to direct AND shout = Atlas was off all day.
- **Owner found a jailbreak dongle plugged into Bella's LAN port (~2:23pm) and removed it.** Test: if Bella has no
  "back after N failure(s)" lines from now on (read `/_tail./data/round2/net-fail.log|30`), the dongle was the cause.
  Same check for Atlas (owner unsure whether its dongle is still in). Vale/Scarlett: ask whether they have dongles left in.
- 2:31pm Bella stuck AGAIN (dongle already out) → dongle not the cause. Test 2:34: Bella sends fine (its reply to Max's
  shout arrived) and hears broadcasts; only unicast TO it is lost → points to the router holding Bella's frames
  (power-save "dozing" state) rather than a key problem. Bella sits right above/next to the main router (upstairs, near
  Atlas) yet reads −76…−80 on 5 GHz (Atlas −70) while Max downstairs −66 → the CUH-72xx Pros receive 5 GHz badly.
  Owner shifted/turned the main router 10 cm / 45–60° (no room to move it): no change (−78).
- Kai ran Test Internet → moved to the second unit (its own reading 70% → 82%).
- **2:49pm Bella switched to 2.4 GHz** (PS4 Settings › Network › Set Up › Wi-Fi › Easy › OPTIONS › Wi-Fi Frequency Bands ›
  2.4 GHz › round2): Bella's own reading 56% → 86% (router sees −74). Watching for drops; check scheduled ~5:20pm.
  If clean → do the same on Atlas. Cable is still the sure fix.
- **4:49pm result: Bella on 2.4 GHz = 2 h with ZERO failures** (net-fail.log: last line 14:48:56 "back after 14 failure(s)"
  = the 5 GHz spell; nothing since). Direct + shout test from Max at 4:49: both answered; Bella 84% ch6. Before the switch
  (5 GHz, same day): stuck at 10:44 (32 min), 13:30 (3½), 13:50 (12½), 14:31 (17) – i.e. every 20–60 min.
  → **Fix for the CUH-72xx Pros: force 2.4 GHz on the PS4** (Wi-Fi Frequency Bands). Do the same on Atlas. Keep an eye
  on Bella's net-fail tail over the next days; cable remains the gold standard.
- **5:20pm Atlas switched to 2.4 GHz too** (owner). 5:31pm test from Bella: Atlas direct ✓ + shout ✓, Atlas polling every
  ~20–50 s. (Atlas's helper report – which carries the band/signal – is only sent every ~10+ min, so it still showed the
  old 5 GHz values right after the switch.) Vale + Kai refuse look jobs during sessions ("has a session until 6pm") – use a
  free PS4 as the tester. Watch Atlas + Bella net-fail tails over the next days.

### 19 Nov 2026, 9:40pm – reschedule page stopped at 19 Dec (Shannice, Vale 12 Dec → wanted 26 Dec)
- Cause: the reschedule page loads `ND = min(70, max(31, booking day + 8))` days from today. Her booking was 23 days out, so the
  window was 31 days = up to 19 Dec; 20 Dec onwards was greyed. A window limit, not a rule.
- Fix (engine, both `gCtx` and the staff note-session variant): `booking day + 31` (cap 70 days from today stays). Engine
  deployed 9:40pm by patching the live script (hash checked before/after, 27 bindings, 3 timers). Full System check NOT run
  (no browser link in this chat) – run it.
- Left as is: the 70-day cap, so a booking more than ~39 days out sees less than 31 days beyond itself.
