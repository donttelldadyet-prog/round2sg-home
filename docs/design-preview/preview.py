"""Round2 member page preview (offline).
Renders book.round2.sg/m exactly as the engine builds it (memPage from worker/round2-book.js),
with the design files from a round2sg-home checkout, then screenshots it on a phone-sized screen.

usage: python3 -I preview.py [repo_dir] [room ...]
  repo_dir defaults to /home/claude/round2sg-home ; rooms default to kaeden
Writes out/<room>-out.png (Join / Log in) and out/<room>-in.png (logged-in crew view).
Fonts come from ./fonts (same files the PS4 tile uses). Logo/character art are on Wix and
can't load offline – a grey box stands in for them.
"""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

KIT = os.path.dirname(os.path.abspath(__file__))
REPO = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/round2sg-home'
ROOMS = sys.argv[2:] or ['kaeden']
OUT = os.path.join(KIT, 'out'); os.makedirs(OUT, exist_ok=True)

NODE = r"""
const fs=require('fs'),[repo,room]=process.argv.slice(1);
const L=fs.readFileSync(repo+'/worker/round2-book.js','utf8').split('\n');
const a=L.findIndex(l=>l.startsWith('const MEM_WIX')),b=L.findIndex(l=>l.startsWith('function memPage'));
let e=b;while(L[e]!=='}')e++;
const src=L.slice(a,e+1).join('\n');
const D={};try{D.css=fs.readFileSync(repo+'/design/member.css','utf8')}catch(x){}
try{const j=JSON.parse(fs.readFileSync(repo+'/design/rooms.json','utf8')).rooms;D.rooms={};for(const k in j){const r=j[k];D.rooms[k]=[r.name,r.colour,r.ink,r.art]}}catch(x){}
const memPage=new Function(src+';return memPage')();
process.stdout.write(memPage(new URL('https://book.round2.sg/m?room='+room+'&k=preview'),D));
"""

FONTS_CSS = ''.join(
    "@font-face{font-family:'%s';src:url(https://book.round2.sg/_kitfonts/%s.ttf);font-weight:%s}" % x for x in [
        ('Chakra Petch', 'ChakraPetch-Regular', '400 500'), ('Chakra Petch', 'ChakraPetch-SemiBold', '600 700'),
        ('Press Start 2P', 'PressStart2P-Regular', '400')])

FAKE_ME = {"me": {"crew": "Night Owls", "staff": False, "phone": "9123 4567", "max": 4, "players": [
    {"slot": "p1", "shown": "Ronnie", "pic": 0}, {"slot": "p2", "shown": "Jess", "pic": 3}]},
    "pics": ['🎮', '🍿', '🎬', '🚀', '👻', '👑', '⭐', '🎲', '🍕', '🎧', '🐱', '⚡'], "tok": "preview"}

GREY = (b'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" '
        b'fill="#2a2633"/><text x="100" y="155" fill="#888" font-size="16" text-anchor="middle">art</text></svg>')

def route(r):
    u = r.request.url
    if '/_kitfonts/' in u:
        return r.fulfill(path=os.path.join(KIT, 'fonts', u.rsplit('/', 1)[1]))
    if 'fonts.googleapis' in u: return r.fulfill(body=FONTS_CSS, content_type='text/css')
    if 'wixstatic' in u: return r.fulfill(body=GREY, content_type='image/svg+xml')
    if u.endswith('/m/av/list'): return r.fulfill(body='{"all":[],"lapy":[]}', content_type='application/json')
    if u.endswith('/m/api'): return r.fulfill(body=json.dumps(FAKE_ME), content_type='application/json')
    if u.startswith('https://book.round2.sg/m'): return r.fulfill(body=HTML, content_type='text/html')
    return r.abort()

with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for room in ROOMS:
        HTML = subprocess.run(['node', '-e', NODE, REPO, room], capture_output=True, text=True, check=True).stdout
        for state in ('out', 'in'):
            ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
            if state == 'in': ctx.add_init_script("localStorage.setItem('r2.mem','preview')")
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.route('**/*', route)
            pg.goto('https://book.round2.sg/m?room=%s&k=preview' % room)
            if state == 'in': pg.evaluate("api({act:'me'}).then(show)")
            pg.wait_for_timeout(600); pg.evaluate("document.fonts.ready")
            bad = pg.evaluate("[...document.fonts].filter(f=>f.status!=='loaded').map(f=>f.family+' '+f.status)")
            if bad: errs.append('fonts: %s' % bad)
            f = os.path.join(OUT, '%s-%s.png' % (room, state)); pg.screenshot(path=f, full_page=True)
            print(f, 'errors:', errs or 'none'); ctx.close()
    br.close()
