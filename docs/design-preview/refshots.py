"""Screenshots of the TV home screen (round2-tv-launcher web/) and the website (round2sg-home index.html), offline."""
import os
from playwright.sync_api import sync_playwright
KIT='/home/claude/design-kit'; OUT=KIT+'/out'
TV='/home/claude/donttelldadyet-prog/round2-tv-launcher/web'; WEB='/home/claude/round2sg-home'
FONTS={'ChakraPetch':'ChakraPetch-Regular','Press':'PressStart2P-Regular'}
CSS=''.join("@font-face{font-family:'%s';src:url(https://local.test/_kitfonts/%s.ttf);font-weight:%s}"%x for x in [('Chakra Petch','ChakraPetch-Regular','400 500'),('Chakra Petch','ChakraPetch-SemiBold','600 700'),('Press Start 2P','PressStart2P-Regular','400')])
def mk(root):
    def route(r):
        u=r.request.url
        if '/_kitfonts/' in u: return r.fulfill(path=KIT+'/fonts/'+u.rsplit('/',1)[1])
        if 'fonts.googleapis' in u: return r.fulfill(body=CSS,content_type='text/css')
        if u.startswith('https://local.test/'):
            p=root+'/'+(u.split('local.test/',1)[1].split('?')[0] or 'index.html')
            if os.path.isfile(p): return r.fulfill(path=p)
            return r.fulfill(status=404,body='')
        return r.abort()
    return route
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':1920,'height':1080}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:120]))
    pg.route('**/*',mk(TV)); pg.goto('https://local.test/index.html?room=vale'); pg.wait_for_timeout(2500); pg.screenshot(path=OUT+'/ref-tv.png')
    w=p.chromium.launch(executable_path='/usr/bin/google-chrome').new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    w.route('**/*',mk(WEB)); w.goto('https://local.test/index.html'); w.wait_for_timeout(2500); w.screenshot(path=OUT+'/ref-web.png')
    print('errors',errs[:3])
