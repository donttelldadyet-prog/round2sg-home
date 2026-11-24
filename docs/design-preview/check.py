"""Headless check of site/index.html: loads it (fonts served locally), logs in on the phone, presses Load,
and screenshots the phone and the tile at several moments. usage: python3 -I check.py [out-prefix]"""
import os, sys
from playwright.sync_api import sync_playwright

KIT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(KIT, 'out'); os.makedirs(OUT, exist_ok=True)
P = sys.argv[1] if len(sys.argv) > 1 else 'chk'
HTML = open(os.path.join(KIT, 'site', 'index.html'), encoding='utf8').read()
FONTS = ''.join("@font-face{font-family:'%s';src:url(https://local.test/_kitfonts/%s.ttf);font-weight:%s}" % x for x in [
    ('Chakra Petch', 'ChakraPetch-Regular', '400 500'), ('Chakra Petch', 'ChakraPetch-SemiBold', '600 700'), ('Press Start 2P', 'PressStart2P-Regular', '400')])

def route(r):
    u = r.request.url
    if '/_kitfonts/' in u: return r.fulfill(path=os.path.join(KIT, 'fonts', u.rsplit('/', 1)[1]))
    if 'fonts.googleapis' in u: return r.fulfill(body=FONTS, content_type='text/css')
    if u.startswith('https://local.test/'): return r.fulfill(body=HTML, content_type='text/html')
    return r.abort()

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.route('**/*', route); pg.goto('https://local.test/#both'); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{OUT}/{P}-1-idle.png')
    f = pg.frame_locator('#ph')
    f.locator('#tL').click(); f.locator('#lp').fill('91234567'); f.locator('#lk').fill('2580'); f.locator('#lb').click()
    pg.wait_for_timeout(900)
    print('logged in view visible:', f.locator('#in').is_visible(), '| play card:', f.locator('#playh').inner_text())
    pg.click('[data-sp="3"]')
    f.locator('[data-go]').click(); pg.wait_for_timeout(900)
    print('phone says:', f.locator('#e5').inner_text())
    pg.screenshot(path=f'{OUT}/{P}-2-sent.png')
    pg.wait_for_timeout(3500); pg.locator('#tv').screenshot(path=f'{OUT}/{P}-3-loading.png')
    f.locator('#lprog').scroll_into_view_if_needed(); pg.wait_for_timeout(2500); f.locator('#playc').screenshot(path=f'{OUT}/{P}-3b-phone-progress.png')
    pg.wait_for_timeout(6000); pg.locator('#tv').screenshot(path=f'{OUT}/{P}-4-loading2.png')
    for i in range(40):
        if 'All set' in pg.inner_text('#cap') or 'Every card' in pg.inner_text('#cap'): break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(600); pg.locator('#tv').screenshot(path=f'{OUT}/{P}-5-done.png')
    pg.wait_for_timeout(2500); pg.locator('#tv').screenshot(path=f'{OUT}/{P}-6-howto.png')
    pg.wait_for_timeout(7000); print('closed overlay:', pg.is_visible('#closed'))
    print('phone final:', f.locator('#lptx').inner_text())
    f.locator('[data-del]').first.click(); pg.wait_for_timeout(300); f.locator('[data-s=p1]').screenshot(path=f'{OUT}/{P}-6b-remove.png')
    f.locator('#svall').scroll_into_view_if_needed(); f.locator('#svall').click(); pg.wait_for_timeout(600); f.locator('#savec').screenshot(path=f'{OUT}/{P}-6c-save.png')
    pg.click('#reopen'); pg.wait_for_timeout(800); pg.locator('#tv').screenshot(path=f'{OUT}/{P}-7-reopen.png')
    # stage buttons
    pg.click('[data-st="job"]'); pg.wait_for_timeout(500); pg.locator('#tv').screenshot(path=f'{OUT}/{P}-8-job.png')
    pg.click('[data-r="bella"]'); pg.wait_for_timeout(1200); print('after room switch still logged in:', f.locator('#in').is_visible())
    m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2); m.on('pageerror', lambda e: errs.append('mobile: ' + str(e)))
    m.route('**/*', route); m.goto('https://local.test/'); m.wait_for_timeout(1500); m.screenshot(path=f'{OUT}/{P}-9-mobile.png')
    m.click('[data-v="tile"]'); m.wait_for_timeout(600); m.screenshot(path=f'{OUT}/{P}-10-mobile-tile.png')
    print('errors:', errs or 'none')
    b.close()
