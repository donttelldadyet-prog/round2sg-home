"""Hand-run accessibility checks on the member page (AccessLint method, without its engine: package downloads are off).
Builds the page like preview.py (real memPage + design files), then measures: names/labels, live regions, keyboard walk
(reachability, focus style, target size), contrast of text and field/button edges per room, headings, reflow at 320px.
usage: python3 -I a11y.py [repo]  → prints JSON + screenshots in out/a11y-*.png"""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(KIT, 'out')
REPO = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/round2sg-home'
src = open(os.path.join(KIT, 'preview.py')).read()
NODE = src.split('NODE = r"""')[1].split('"""')[0]
FONTS_CSS = ''.join("@font-face{font-family:'%s';src:url(https://book.round2.sg/_kitfonts/%s.ttf);font-weight:%s}" % x for x in [
    ('Chakra Petch', 'ChakraPetch-Regular', '400 500'), ('Chakra Petch', 'ChakraPetch-SemiBold', '600 700'), ('Press Start 2P', 'PressStart2P-Regular', '400')])
ME = {"ok": True, "me": {"crew": "Night Owls", "staff": False, "phone": "9123 4567", "max": 4, "players": [{"slot": "p1", "shown": "Ronnie", "pic": 0}, {"slot": "p2", "shown": "Jess", "pic": 3}]},
      "pics": ['🎮', '🍿', '🎬', '🚀', '👻', '👑', '⭐', '🎲', '🍕', '🎧', '🐱', '⚡'], "tok": "x"}

JS = r"""() => {
const L=c=>{c=c/255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};
const CV=document.createElement('canvas');CV.width=CV.height=1;const CX=CV.getContext('2d',{willReadFrequently:true});
const P=s=>{const a=(s.match(/[\d.]+/g)||[]);const al=/rgba|\/ /.test(s)?+a[a.length-1]:1;CX.clearRect(0,0,1,1);CX.fillStyle='#000';CX.fillStyle=s;CX.globalAlpha=1;CX.fillRect(0,0,1,1);const d=CX.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],al]};
const lum=c=>.2126*L(c[0])+.7152*L(c[1])+.0722*L(c[2]);
const cr=(a,b)=>{const x=lum(a),y=lum(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
const bgOf=el=>{for(let e=el;e;e=e.parentElement){const c=P(getComputedStyle(e).backgroundColor);if(c[3]===undefined||c[3]>0.5)return c.slice(0,3)}return [6,5,10]};
const name=el=>{if(el.getAttribute('aria-label'))return el.getAttribute('aria-label');if(el.id){const l=document.querySelector('label[for="'+el.id+'"]');if(l)return l.textContent.trim()}
  const w=el.closest('label');if(w)return w.textContent.trim();if(el.tagName==='BUTTON')return el.textContent.trim();if(el.title)return el.title;return ''};
const vis=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'};
const sel=el=>el.id?'#'+el.id:el.tagName.toLowerCase()+(el.className?'.'+String(el.className).split(' ').join('.'):'')+(el.dataset.s?'[data-s='+el.dataset.s+']':'');
const fields=[...document.querySelectorAll('input')].filter(vis).map(el=>({sel:sel(el)+(el.dataset.n?'[data-n]':''),type:el.type,name:name(el),ph:el.placeholder||'',ac:el.getAttribute('autocomplete')||''}));
const clickDivs=[...document.querySelectorAll('.pics div')].filter(vis).length;
const focusableDivs=[...document.querySelectorAll('.pics div')].filter(d=>d.tabIndex>=0).length;
const live=[...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].length;
const errs=[...document.querySelectorAll('.err')].length;
const heads=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h=>h.tagName+': '+h.textContent.trim().slice(0,30));
const lands=[...document.querySelectorAll('main,header,nav,footer,[role]')].map(e=>e.tagName+(e.getAttribute('role')?'['+e.getAttribute('role')+']':''));
const tabs=[...document.querySelectorAll('.tabs button')].map(b=>({t:b.textContent,cls:b.className,pressed:b.getAttribute('aria-pressed'),sel:b.getAttribute('aria-selected')}));
const T=[];const txt=(s,label)=>{const e=document.querySelector(s);if(!e||!vis(e))return;const cs=getComputedStyle(e);T.push({what:label,sel:s,ratio:cr(P(cs.color),bgOf(e)),px:parseFloat(cs.fontSize),font:cs.fontFamily.split(',')[0]})};
txt('.hero .room','room name');txt('.kick','ROUND2 MEMBERS');txt('.hero .tag','tagline');txt('label','field label');txt('.fine','small print');
txt('button:not(.ghost):not(.on):not(.sm)','main button text');txt('button.ghost','outline button text');txt('.badge','badge');txt('.card>b:first-child','card title');
const inp=document.querySelector('input:not([type=checkbox])');let edge=null;if(inp&&vis(inp)){const card=inp.closest('.card');edge={field_edge_vs_card:cr([0.42*244+0.58*6,0.42*241+0.58*5,0.42*251+0.58*10],bgOf(card)),field_bg_vs_card:cr(bgOf(inp),bgOf(card))}}
const ph=document.querySelector('input[placeholder]');const phr=ph&&vis(ph)?cr(P(getComputedStyle(ph,'::placeholder').color),bgOf(ph)):null;
return {fields,clickDivs,focusableDivs,live,errs,heads,lands,tabs,text:T,edge,placeholder:phr,lang:document.documentElement.lang}}"""

WALK = r"""() => {const out=[];const f=[...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(e=>!e.disabled&&e.tabIndex>=0&&e.getBoundingClientRect().width>0);
for(const e of f.slice(0,40)){e.focus();const cs=getComputedStyle(e);const r=e.getBoundingClientRect();out.push({el:(e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+e.className)+' '+(e.textContent||e.placeholder||e.type||'').trim().slice(0,22),active:document.activeElement===e,
outline:cs.outlineStyle==='none'?'none':cs.outlineWidth+' '+cs.outlineColor+' off '+cs.outlineOffset,shadow:cs.boxShadow==='none'?'none':cs.boxShadow.slice(0,70),w:Math.round(r.width),h:Math.round(r.height)})}return out}"""

def route_for(html):
    def route(r):
        u = r.request.url
        if '/_kitfonts/' in u: return r.fulfill(path=os.path.join(KIT, 'fonts', u.rsplit('/', 1)[1]))
        if 'fonts.googleapis' in u: return r.fulfill(body=FONTS_CSS, content_type='text/css')
        if 'wixstatic' in u: return r.fulfill(body='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>', content_type='image/svg+xml')
        if u.endswith('/m/av/list'): return r.fulfill(body='{"all":[],"lapy":[]}', content_type='application/json')
        if u.endswith('/m/api'): return r.fulfill(body=json.dumps(ME if '"act":"me"' in (r.request.post_data or '') or '"act":"login"' in (r.request.post_data or '') else {"error": "The PIN must be 4 to 8 numbers."}), content_type='application/json')
        if u.startswith('https://book.round2.sg/m'): return r.fulfill(body=html, content_type='text/html')
        return r.abort()
    return route

res = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for room in ['kaeden', 'atlas', 'maximillion', 'bella', 'scarlett']:
        html = subprocess.run(['node', '-e', NODE, REPO, room], capture_output=True, text=True, check=True).stdout
        for state in ['out', 'in']:
            c = b.new_context(viewport={'width': 390, 'height': 844})
            if state == 'in': c.add_init_script("localStorage.setItem('r2.mem','x')")
            pg = c.new_page(); pg.route('**/*', route_for(html)); pg.goto(f'https://book.round2.sg/m?room={room}&k=abc'); pg.wait_for_timeout(700)
            pg.evaluate('document.fonts.ready')
            r = pg.evaluate(JS)
            if room == 'kaeden':
                r['walk'] = pg.evaluate(WALK)
                if state == 'out':
                    pg.click('#jb'); pg.wait_for_timeout(500); r['after_bad_join'] = pg.evaluate("()=>({err:document.getElementById('e1').textContent,focus:document.activeElement.id||document.activeElement.tagName,describedby:[...document.querySelectorAll('[aria-describedby],[aria-invalid]')].length})")
                    pg.set_viewport_size({'width': 320, 'height': 700}); pg.wait_for_timeout(200)
                    r['reflow320'] = pg.evaluate("()=>({docW:document.documentElement.scrollWidth,overflowing:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>322).map(e=>e.tagName+'.'+e.className).slice(0,6)})")
                    pg.screenshot(path=f'{OUT}/a11y-320.png', full_page=True)
                if state == 'in':
                    pg.locator('[data-sv]').first.focus(); pg.screenshot(path=f'{OUT}/a11y-focus-kaeden.png', clip={'x': 0, 'y': 300, 'width': 390, 'height': 600})
            if room == 'atlas' and state == 'out':
                pg.focus('#jb'); pg.locator('#jb').scroll_into_view_if_needed(); pg.screenshot(path=f'{OUT}/a11y-focus-atlas.png')
            res[room + '-' + state] = r; c.close()
    b.close()
json.dump(res, open(os.path.join(OUT, "a11y.json"), "w"), ensure_ascii=False)
