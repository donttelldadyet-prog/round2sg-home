# Design preview kit (24 Nov 2026)

Builds the "Round2 design preview" page (claude.ai artifact, slug `a2d4117c-cf51-4513-bb09-39377c3f8b4e` – republish to
the same slug so the link stays) from a round2sg-home checkout:

- **Phone tab** – the real `memPage()` from `worker/round2-book.js` + `design/member.css` + `design/rooms.json` (checked the
  way the engine checks them), with a pretend `memApi` in `template.html` (join, login, crew, players/av, Save changes,
  Remove with PIN, Load, `loadst` progress, room log out). Test crew Night Owls, 9123 4567, PIN 2580. Avatars (`/m/av/NNNN.png`)
  and character art are online-only: drawn stand-ins.
- **PS4 tile tab** – canvas copy of tile 0.13 (round2-tv-launcher `ps4/tile/tile/main.cpp`): layout, fonts, timings,
  animations, QR from the tile's own encoder. Phone "Load saves" drives it. **When the tile changes (phase 2 / membership
  screens), port the change into `template.html` (the "PS4 tile" section) so the preview stays true.**
- **Membership draft tab** – `design/membership/prototype.html` at 390px.

Use (paths in the scripts assume /home/claude; adjust if needed):
```
git worktree add --detach /home/claude/mainwt origin/main          # or any branch to preview
cp -r docs/design-preview /home/claude/design-kit && cd /home/claude/design-kit
# QR encoder: copy qrcodegen.c/.h from round2-tv-launcher ps4-helper:ps4/tile/tile/ into qr/, then
gcc -O2 -o qr/qrjson qr/qrjson.c qr/qrcodegen.c
R2BRANCH="main (live)" R2COMMIT=$(git -C /home/claude/mainwt rev-parse --short HEAD) python3 -I build.py /home/claude/mainwt
python3 -I check.py v1        # headless: log in, Load, phone progress, Remove, Save, full tile run → out/v1-*.png
python3 -I a11y.py /home/claude/mainwt   # contrast/labels/keyboard/320px checks per room → out/a11y.json
```
Then publish `site/index.html` to the artifact slug above. Needs node, python3 + playwright, /usr/bin/google-chrome, gcc.
