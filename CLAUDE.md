# Round2 – notes for Claude

- **Run the System check before and after any change** (control centre at staff.round2.sg › Tests & systems › System
  check; code: round2-tv-launcher `manager/index.html`, `SysCheck`). Add a step for every new feature that touches another
  part. Why and how: round2-tv-launcher `docs/system-check.md`. This is the owner's standing rule.
- Read `HANDOFF.md` and `docs/booking-times.md` before touching anything time-based. Times are Singapore time; the shop's
  "day" runs until staff sleep (12am–11am belongs to the night before); guest end = SimplyBook end − 15 min cleaning.
- `worker/round2-book.js` is the live Cloudflare engine `round2-book`. Deploy carefully (keep bindings), then run the check.
