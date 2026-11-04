"""Render the Round2 Picks carousel to PNGs (1080 x 1350) in ./out.

Usage (from this folder):  python3 render.py
Needs: pip install playwright && playwright install chromium   (or a local Chrome)
"""
import pathlib, shutil
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).resolve().parent
out = here / "out"
shutil.rmtree(out, ignore_errors=True)
out.mkdir()

with sync_playwright() as p:
    try:
        browser = p.chromium.launch()
    except Exception:
        browser = p.chromium.launch(channel="chrome")
    page = browser.new_page(viewport={"width": 1080, "height": 1350})
    # file:// needs access to ../../menu/img for the logo
    page.goto((here / "index.html").as_uri() + "?render=1")
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready")
    slides = page.query_selector_all(".slide")
    for i, s in enumerate(slides, 1):
        s.screenshot(path=str(out / f"round2-picks-{i:02d}.png"))
    browser.close()
print(f"{len(slides)} slides -> {out}")
