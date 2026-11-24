# Handoff: membership tiers – TV tile + phone member page design (24 Nov 2026)

From Karen's Claude, for the co-owner and his Claude. Design only. No code changed, nothing pushed.
Please build on your own branch as usual, and only make it live after you and Karen have both tried it.

In this folder:
- `prototype.html` – clickable phone prototype (download and open in any browser). This is the newest design.
- TV screen mockups are on Karen's design canvas "Round2 PS4 tile – Scan screen redesign" (she can share the link).

Already live from the design side (24 Nov, `design/member.css` only): round pictures with a room-colour ring + small tick for
the chosen one, round player pictures, tick boxes in the room colour. Everything below that needs code is listed in HANDOFF
"DESIGN → FUNCTION CONCERNS".

## Membership (Karen, 23–24 Nov)
- Joining is paid, not free.
- Tiers: **Standard** 2 months $20 · **Gold** 3 months $__ · **Platinum** 6 months $__ (Gold/Platinum prices still to be set).
- After the plan: $10 a month.
- Open: does every tier renew at $10/month? Any perks per tier?

## Crew name is the identity (your ask, 24 Nov)
The crew name (e.g. "ROUND2_") was only a text box. It now shows up at the key moments:
1. On the membership card, where a bank card has the cardholder name ("CREW SINCE mm/yy", "VALID TO mm/yy"). The membership belongs to the crew.
2. Right after paying: a "Your crew card is ready" screen where the card flips in with the crew name stamped on it.
3. Phone after login: header is the crew name (pixel font) with "<TIER> CREW" above and "n of 4 players" below.
4. While loading: "Loading <crew>'s saves · <profile>…" and "<crew> is all set."
5. TV signed-in screen: "Welcome back, <crew>" with the crew card, players listed beside it.
6. Sign-up step 2 starts with "Name your crew" (hint: your couple, group or squad name), then the first player's name, picture and PIN.

## Room profile (follows your 19 Nov model: the room belongs to the crew; slots = main + p1–p4)
- "Who's playing in <room>?" starts with the room profile as its own row: room-colour circle with the room's initial, **"Vale profile"**, sub-line "Everything played on the room profile", tick box, ticked by default, no Edit.
- Under it, a small label "PLAYERS · PLAYER 1-4 PROFILES", then the player rows.
- Load counts the room profile as a profile ("Loading <crew>'s saves · Vale profile…").
- When another crew holds the main profile (`mainok` false), hide the room row, as the live page does today.

## TV tile – scan screen (replaces "Scan to log in")
- Three columns on the same top/bottom lines: words left, card stack middle, QR right.
- Left: "ROUND2 MEMBERS" / **"Pick up where you left off."** / "Save your game here and carry on from any Round2 room." / bottom line "After your plan, keep going at $10 a month."
- Middle: stacked tier cards (Standard back, Gold, Platinum front); each card's top strip shows tier · months · price.
- Right: QR with room-colour corner brackets; under it "Members scan to log in" / "New guests scan to join".
- Footer: "Not saving today? Press [PS] to play." and book.round2.sg/m.
- Remove the version text ("tile 0.13 id file") from the guest view.
- Tile text must stay plain ASCII.

## TV tile – signed-in screen (new)
- "<TIER> CREW" / "Welcome back, <crew>." / "Your saves are loading onto this PS4. Please don't start a game yet."
- The crew card in the middle; profiles list on the right (Ready / Loading / Next) and the progress bar underneath.

## Look
- Background: room-colour glow behind the cards (smaller one behind the QR), fine pixel-dot texture inside the glow, darker edges. No character art.
- Cards: muted matte. Standard = charcoal grey, Gold = deep bronze-gold, Platinum = near-black. Pixel dot grid fading in from one corner, thin inner edge, outline chip, small Round2 logo. No shiny gradients or tilt.
- Room colour comes from design/rooms.json.

## Motion (both TV and phone; calm ease-out, no bounce)
- Scan screen (~1.6 s): top line draws → words rise (0.08 s apart) → cards deal in back to front (0.12 s apart) → QR corners snap in → one light sweep across the front card.
- Signed in (~2 s, the high point): crew card rises in → tier name settles → dot grid lights up left to right → one sweep → "Welcome back" text.
- Phone: same card deal on Join; tapping a tier slides that card to the front; tab highlight glides; crew card flips in after payment; ticks draw in; Load saves → bar fills per profile. Respect Reduce Motion.

## Phone member page
- Join step 1: card stack + three-button tier picker (Standard / Gold / Platinum with months and price), phone number, "Continue · <tier> <price>" → payment.
- Join step 2: crew name, first player's name + picture (12 shown, Shuffle, Browse all 1200), PIN → crew card reveal.
- Log in: phone + PIN; "Forgot your PIN? **WhatsApp us**" → https://wa.me/6591625767 with prefilled text "Hi Round2, I forgot my member PIN. My phone number is ".
- Logged in: crew header + crew card, "<Tier> until <date>" + **Extend**, then "Who's playing in <room>?" (room profile row first, then players).
- **Players are compact rows** (checkbox, picture, name, Edit) instead of a full name box + picture grid per player, so the page no longer needs long scrolling (Karen's ask). Edit / "+ Add a player" opens a slide-up panel: name, picture grid, Shuffle, Browse all 1200, Save, Remove. Max 4 players.
- Pictures are round (the 440 px /m/av/NNNN.png files); the chosen one gets a room-colour ring and a small round tick.

## Needs building on your side
1. Paid sign-up (e.g. HitPay link) before an account is created; renewals at $10/month; Extend flow.
2. Store each crew's tier, join date and expiry; send crew name, tier and expiry to the tile for the signed-in card.
3. Tile phase 2: new scan-screen layout, the signed-in screen, card drawing (matte cards can be drawn in code; otherwise pre-rendered PNGs per tier), room glow, motion above.
4. Phone page: tier picker, payment step, crew card reveal, compact player rows + edit panel, room profile row, WhatsApp PIN link.
