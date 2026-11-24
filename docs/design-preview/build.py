"""Round2 design preview – builds site/index.html from the CURRENT design files.

usage: python3 -I build.py [round2sg-home dir]
Reads design/member.css + design/rooms.json from the repo's working tree (whatever branch is checked out), checks them
the same way the engine does (worker/round2-book.js memDesign/designRooms), renders the real member page (memPage) for
every room, makes the tile's QR codes with the tile's own encoder (qr/qrjson, built from the tile's qrcodegen.c) and
fills template.html. Publish site/index.html as the preview artifact (same slug every time).
"""
import json, os, subprocess, sys, base64, datetime

KIT = os.path.dirname(os.path.abspath(__file__))
REPO = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/round2sg-home'
TOK = 'Tq7Lw2Xa'   # stand-in for the tile's session code (8 letters/numbers, like tiletok)

NODE = r"""
const fs=require('fs'),repo=process.argv[1];
const L=fs.readFileSync(repo+'/worker/round2-book.js','utf8').split('\n');
const a=L.findIndex(l=>l.startsWith('const MEM_WIX')),b=L.findIndex(l=>l.startsWith('function memPage'));
let e=b;while(L[e]!=='}')e++;
const src=L.slice(a,e+1).join('\n');
const {MEM_ROOMS,MEM_LOGO,MEM_WIX,memPage}=new Function(src+';return {MEM_ROOMS,MEM_LOGO,MEM_WIX,memPage}')();
const warn=[],D={css:null,rooms:{}};
/* member.css – same test as memDesign() */
let css=null;try{css=fs.readFileSync(repo+'/design/member.css','utf8')}catch(x){warn.push('design/member.css is missing – the built-in look is used.')}
if(css!==null){const bad=(css.match(/<\/|<script|@import|javascript:/i)||[])[0];
  if(bad)warn.push('member.css contains "'+bad+'" – the engine refuses the whole file and guests get the built-in look.');
  else if(css.length>60000)warn.push('member.css is over 60 KB – the engine refuses it and guests get the built-in look.');
  else D.css=css;}
/* rooms.json – same test as designRooms() */
let rj=null;try{rj=JSON.parse(fs.readFileSync(repo+'/design/rooms.json','utf8'))}catch(x){warn.push('design/rooms.json is not valid JSON ('+String(x.message).slice(0,80)+') – every room keeps its built-in name and colours.')}
const RX=/^#[0-9a-fA-F]{6}$/;
for(const [k,r] of Object.entries((rj&&rj.rooms)||{})){
  if(!MEM_ROOMS[k]){warn.push('rooms.json: "'+k+'" is not one of the 7 rooms – ignored.');continue}
  if(!r||!RX.test(r.colour||'')||!RX.test(r.ink||'')){warn.push('rooms.json: '+k+' colour/ink must be #rrggbb – this room keeps its built-in look.');continue}
  if(r.art&&!/^[\w~.-]{5,120}$/.test(r.art))warn.push('rooms.json: '+k+' art file name not accepted – built-in picture kept.');
  D.rooms[k]=[String(r.name||MEM_ROOMS[k][0]).replace(/[<>"&]/g,'').slice(0,20),r.colour,r.ink,/^[\w~.-]{5,120}$/.test(r.art||'')?r.art:MEM_ROOMS[k][3]];}
const RM=Object.assign({},MEM_ROOMS,D.rooms),pages={},rooms={};
for(const k of Object.keys(MEM_ROOMS)){rooms[k]={name:RM[k][0],colour:RM[k][1],ink:RM[k][2],art:RM[k][3],fromDesign:!!D.rooms[k]}}
const tok=h=>h.split(MEM_LOGO).join('__R2LOGO__').split(MEM_WIX).join('__R2ART__/');
for(const k of ['',...Object.keys(MEM_ROOMS)])pages[k]=tok(memPage(new URL('https://book.round2.sg/m'+(k?'?room='+k:'')),D));
process.stdout.write(JSON.stringify({pages,rooms,warn,cssBytes:css?css.length:0}));
"""

def git(*a):
    return subprocess.run(['git', '-C', REPO, *a], capture_output=True, text=True).stdout.strip()

out = json.loads(subprocess.run(['node', '-e', NODE, REPO], capture_output=True, text=True, check=True).stdout)
urls = ['https://book.round2.sg/m'] + ['https://book.round2.sg/m?room=%s&k=%s' % (k, TOK) for k in out['rooms']]
qr = json.loads(subprocess.run([os.path.join(KIT, 'qr', 'qrjson'), *urls], capture_output=True, text=True, check=True).stdout)
logo = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(REPO, 'menu/img/round2-logo.png'), 'rb').read()).decode()
dirty = git('status', '--porcelain', '--', 'design')
sgt = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(hours=8)
data = {
    'built': sgt.strftime('%-d %b, %-I:%M%p').replace('AM', 'am').replace('PM', 'pm'),
    'branch': os.environ.get('R2BRANCH') or git('rev-parse', '--abbrev-ref', 'HEAD'), 'commit': os.environ.get('R2COMMIT') or git('rev-parse', '--short', 'HEAD'),
    'dirty': bool(dirty) and not os.environ.get('R2COMMIT'), 'warn': out['warn'], 'rooms': out['rooms'], 'pages': out['pages'],
    'qr': {('' if u.endswith('/m') else u.split('room=')[1].split('&')[0]): qr[u] for u in urls},
    'tok': TOK, 'logo': logo, 'tileV': '0.13',
    'proto': open(os.path.join(REPO, 'design/membership/prototype.html'), encoding='utf8').read() if os.path.exists(os.path.join(REPO, 'design/membership/prototype.html')) else '',
}
blob = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
html = open(os.path.join(KIT, 'template.html'), encoding='utf8').read()
assert '/*R2DATA*/null' in html
os.makedirs(os.path.join(KIT, 'site'), exist_ok=True)
open(os.path.join(KIT, 'site', 'index.html'), 'w', encoding='utf8').write(html.replace('/*R2DATA*/null', blob))
print('built site/index.html', len(html) + len(blob), 'bytes ·', data['branch'], data['commit'], '· changes not committed' if dirty else '', '· warnings:', out['warn'] or 'none')
