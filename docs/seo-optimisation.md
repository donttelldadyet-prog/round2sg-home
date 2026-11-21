# SEO optimisation – Round2 (started 31 Oct 2026)

Goal: more people find Round2 on Google, Google Maps, AI answers (ChatGPT, Google AI Overviews) and social search –
**without changing the look of round2.sg**. The game homescreen is the brand; nothing goes on the site that clashes with it.

## Owner's rules (decided 31 Oct 2026 – read before doing anything)
- **No visible SEO text on the website.** No text blocks under the game screen, no "SEO pages". Tried on the 7 room pages on
  31 Oct, owner rejected it as not on-brand ("Cosmo Place standard"), and it was fully reverted the same night.
- **No hidden-text tricks** (text behind the embed, white-on-white, etc.). Google treats that as spam – never do it.
- **No keyword stuffing**, anywhere (page text, structured data, alt text). Keywords only inside honest, natural sentences.
- Nothing published in Wix without the owner's OK. Publishing in Wix pushes **every** unpublished change live – check the
  co-owner isn't mid-edit first.
- Wix Site History shows times that may not be Singapore time – check the content of a version, not only its time, before restoring.

## Where things stand (31 Oct 2026, after the revert)
- round2.sg is **Wix**; the homepage and the room pages show the game homescreen (GitHub Pages, `round2sg-home`) inside an
  HTML embed. Google cannot read text inside an embed, so it sees round2.sg as almost empty – this is the main SEO weakness.
- All Wix pages can be listed by Google (a "list only the homepage" change was made and then reverted by the owner).
- Page search titles/descriptions already exist and are decent (homepage: "Round2 | Best Private Movie & Gaming Rooms in
  Singapore", description mentions date ideas / things to do in Bugis / from S$35).
- The GitHub copies (homepage, booking page, menu) carry `noindex`, so Google never lists them as a rival to round2.sg.
- Guest-facing links use round2.sg sub-addresses (book., menu., cue.) – see HANDOFF.md. Not an SEO feature; keep as is.

## Directions (the to-do list for this department)

| # | Direction | Status | Visible to visitors? |
|---|---|---|---|
| 1 | Business details code (structured data) on the homepage – draft below | **DONE 21 Nov 2026** (published to the homepage only, via Wix SEO API; hours 11am–11pm confirmed by owner) | No |
| 2 | Review QR on the TV "That's a wrap" screen → Google review | Suggested – owner considering | Only on room TVs |
| 3 | Google Business Profile: photos per room, weekly posts, rooms + prices as products/services, booking link | Suggested | No (Google Maps only) |
| 4 | Make the game homescreen itself readable by Google (serve it as round2.sg's real page, not in a frame; per-room addresses with their own titles) | Suggested – owner to discuss with co-owner; biggest win, biggest change (site edited in code, not the Wix editor) | No change in look |
| 5 | Features & listings: TheSmartLocal "private rooms in Singapore" list (updated 20 Oct 2026 – Round2 missing), Time Out, Little Steps, Vulcan Post; Tagvenue, Venuerific | Suggested | No |
| 6 | Video / social search: TikTok, Instagram Reels, Lemon8 – TV messages, racing sim, room reveals, tagged Haji Lane / Bugis, linking round2.sg | Suggested | No |
| 7 | Blog at round2.sg/blog – only if styled in the Round2 look (dark, pixel); drafts exist in the Claude doc "Round2 SEO content – first drafts" | On hold | Only at /blog |
| 8 | Google Search Console: submit sitemap, watch which searches show Round2 | **Already done** (connected + verified Aug 2025, sitemap read daily, 0 errors; homepage re-indexing requested 21 Nov 2026) | No |
| 9 | Tidy: old duplicate homepage `/blank-4-3` (menu "home" link points there) → point menu at round2.sg | Suggested | Menu link only |
| 10 | Image alt text on Wix images (honest descriptions: "Vale private movie room at Round2, Haji Lane") | Suggested | No |
| 11 | Real search descriptions on /ps4gamelist, /boardgames, /cardgames (were the generic default) | **DONE 21 Nov 2026** | No |
| 12 | Duplicates hidden from Google: old homepage /blank-4-3, /r2tnc (old T&C), /blog-1 (second blog page) | **DONE 21 Nov 2026**: all three set to noindex (pages still work for visitors; menu link to /blank-4-3 unaffected) | No |

Rejected / don't redo: text sections on room pages; SEO landing pages; hiding text; keyword lists in code.

## 4 · Serve the game homescreen as round2.sg itself – notes (31 Oct 2026)
Owner's priority: **speed of the UI must never get worse**, including moving between menus.

Measured on the owner's computer, 31 Oct 2026:
| | Game screen starts loading | Game page fully loaded |
|---|---|---|
| Today: round2.sg (Wix) with the game in a frame | after ~1.9 s (Wix loads first) | ~2.0–2.5 s + the game's own loading |
| Served directly | immediately | ~0.9 s |

- Menus inside the game are the same code either way → no change. Room addresses (round2.sg/vale) must switch **inside**
  the game with no page reload, so menus never become page loads.
- Pros: ~1–1.5 s faster first load (also a Google ranking factor); Google reads rooms/prices/games/FAQ already in the game;
  per-room addresses with their own titles; structured data on the real page; maybe no paid Wix plan needed later.
- Cons: no Wix editor for the homepage (changes in code); other Wix pages (terms, privacy, FAQ, room QR links pages like
  /valelinks – printed QR codes must keep working) need rebuilding or redirects; domain settings change (copy the
  hello@round2.sg email records exactly); a few sessions of work; page text must be pre-built into the HTML so Google reads it.
- Safe path: build on a hidden test address → measure speed vs the table above (not faster = not live) → check every menu,
  room address, QR code and booking flow → switch on a quiet morning; switching back takes minutes.
- Status: owner and co-owner thinking about it.

## 1 · Business details code – PUBLISHED 21 Nov 2026 (live version differs from the draft below: Deluxe "up to 4–5 people", "Board games and card games", no room names, no "public holidays")
Where: Wix editor › homepage ("NEW HOME PAGE – MAIN") › Page settings › Advanced SEO › Structured data markup › add, paste, Publish.
Keywords appear only as real descriptions (private movie room, gaming room, Bugis, Haji Lane, dates, birthdays).
Prices = the booking engine's `PRICES` (worker/round2-book.js) on 31 Oct 2026 – update both together.

```json
{
  "@context": "https://schema.org",
  "@type": "EntertainmentBusiness",
  "name": "Round2",
  "url": "https://www.round2.sg/",
  "description": "Round2 is a private movie and gaming room venue on Haji Lane, near Bugis MRT in Singapore. Seven themed private rooms with big TVs, Netflix and Prime Video already signed in, PS4 games, board games and a racing simulator. Popular for dates, birthdays and group hangouts.",
  "telephone": "+65 9162 5767",
  "priceRange": "S$35 – S$129 for 3 hours",
  "currenciesAccepted": "SGD",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "20 Haji Lane, #02-00",
    "addressLocality": "Singapore",
    "postalCode": "189213",
    "addressCountry": "SG"
  },
  "areaServed": ["Bugis", "Kampong Glam", "Haji Lane", "Singapore"],
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    "opens": "11:00", "closes": "23:00"
  }],
  "amenityFeature": [
    {"@type": "LocationFeatureSpecification", "name": "Netflix and Prime Video signed in", "value": true},
    {"@type": "LocationFeatureSpecification", "name": "PS4 / PS4 Pro games", "value": true},
    {"@type": "LocationFeatureSpecification", "name": "Board games", "value": true},
    {"@type": "LocationFeatureSpecification", "name": "Personal message on the room TV", "value": true},
    {"@type": "LocationFeatureSpecification", "name": "Racing simulator (VIP room)", "value": true}
  ],
  "makesOffer": [
    {"@type": "Offer", "name": "Private Netflix room (Vale, Kaeden, Scarlett) – up to 3 people, 3 hours", "price": "49", "priceCurrency": "SGD", "description": "S$49 Mon–Thu, S$69 Fri–Sun and public holidays"},
    {"@type": "Offer", "name": "Private Deluxe movie and gaming room (Bella, Kai, Atlas) – up to 5 people, 3 hours", "price": "79", "priceCurrency": "SGD", "description": "S$79 Mon–Thu, S$99 Fri–Sun and public holidays"},
    {"@type": "Offer", "name": "VIP room with racing simulator (Maximillion) – up to 6 people, 3 hours", "price": "109", "priceCurrency": "SGD", "description": "S$109 Mon–Thu, S$129 Fri–Sun and public holidays"},
    {"@type": "Offer", "name": "Early Bird – any room, 3 hours from 11am", "price": "35", "priceCurrency": "SGD"}
  ],
  "potentialAction": {"@type": "ReserveAction", "target": "https://www.round2.sg/booknow"},
  "sameAs": [
    "https://www.instagram.com/round2.sg",
    "https://www.tiktok.com/@round2.sg",
    "https://www.facebook.com/round2.singapore"
  ]
}
```
Rules: no star ratings in here unless they come from real reviews shown on the page (Google penalises invented ratings).
After publishing, test the live homepage with Google's Rich Results Test.

## Competitors (scan 31 Oct 2026)
| Name | Where | Price | How they get found |
|---|---|---|---|
| Cosmo Place | Jalan Besar; **new branch 30A Kandahar St** (~2 min from Haji Lane – direct rival for Bugis searches) | not shown | WordPress blog (~10 template-style posts), landing pages for date ideas / VIP / big groups, 4.9★ from 144 Google reviews |
| CozyPlace | 4 outlets | from $39 / 3 h | Press: TheSmartLocal, Time Out, Vulcan Post, Little Steps; Lemon8 |
| 4Play | Farrer Park | $49 / $89 / $109 per 3 h | TheSmartLocal feature; free snacks; late-night WhatsApp bookings |
| Kozynnice | Farrer Park / Jalan Besar | from $30 / 2 h | Tagvenue listing |
| Lazy Potato | Bugis, Jalan Besar, Paya Lebar | from $34 / 2 h | TheSmartLocal list |

Round2's edge (use in Business Profile, socials and pitches): personal messages on the room TV, racing simulator,
7 themed character rooms, Haji Lane location, Early Bird from S$35.

## Search Console snapshot (15 Aug – 19 Nov 2026, read 21 Nov)
- Brand searches strong: "round 2" 1,041 clicks (pos 2.6), "round 2 haji lane" 303 (pos 1.3), "round2" 439.
- Generic searches weak: "private room singapore" pos 13, "private movie room singapore" pos 18, "netflix room singapore" pos 7.5, "bugis private room" pos 7.
- Google Business Profile link brought 312 clicks.
- Rich Results Test 21 Nov 2026 4:18pm: 4 valid items (2 Local business – ours plus, most likely, one Wix adds from its Business Info – not confirmed; 2 Organization); non-critical warnings only.
- 21 Nov 2026: new Google titles (search titles only, pages unchanged): /ps4gamelist "PS4 Game List | Round2 Private Gaming Rooms, Haji Lane"; /boardgames "Board Games | Round2 Private Rooms, Haji Lane"; /cardgames "Card Games for Dates & Groups | Round2, Haji Lane"; /blog "Blog | Round2 Private Movie & Gaming Rooms"; /round2xmaddpizza "Order MADD Pizza to Your Room | Round2 Singapore"; /aboutus "About Round2 | Private Movie & Gaming Rooms, Haji Lane".
