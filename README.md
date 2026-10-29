# round2sg-home

The Round2 game-screen homepage, embedded on www.round2.sg through Wix "Embed HTML → Website address".

- Homepage: `https://donttelldadyet-prog.github.io/round2sg-home/`
- Book now page: `...?start=book`
- Contact us page: `...?start=find`
- Also available: `?start=rooms`, `?start=loadout`, `?start=how`
- Help popup tabs: `?start=faq`, `?start=rules`, `?start=about`, `?start=privacy`
- A specific room: `?room=vale` (kaeden, scarlett, bella, kai, atlas, maximillion)

Media (videos, images) is served from Wix Media; this repo only holds the page itself.

## Visitor stats (branch `site-stats`, not merged yet)

The last `<script>` in `index.html` counts what visitors do in the menu (screens, rooms, booking form steps, WhatsApp/Telegram clicks)
and who's on it right now, and saves only numbers to the Round2 Firebase database under `/web`. The control centre's Website tab shows them.
Full explanation, data layout and the one-time Firebase rule: `docs/site-stats.md` in **round2-tv-launcher**.
Turn it off for one load with `?notrack`. It never blocks or changes the page.

## Own booking system (branch own-booking)
Start with [HANDOFF.md](HANDOFF.md) – status, how to deploy, open to-dos and the owners' decisions.
