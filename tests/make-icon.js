// Renders the app icon (1024x1024) using the game's own card/chip artwork.
// Usage: node tests/make-icon.js
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, '../web/index.html'));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const a = Cards.el({ r: 1, s: 'S' }).outerHTML;
    const k = Cards.el({ r: 13, s: 'H' }).outerHTML;
    document.body.innerHTML = `
      <div id="icon" style="position:fixed;inset:0;overflow:hidden;
        background: radial-gradient(circle at 50% 40%, #2f9462 0%, #1e6b45 45%, #0b3320 100%);">
        <div style="position:absolute;inset:46px;border-radius:50%;border:14px solid #e7c873;opacity:.55"></div>
        <div style="position:absolute;inset:78px;border-radius:50%;border:4px solid #e7c873;opacity:.4"></div>
        <div style="position:absolute;left:50%;top:44%;--cw:330px;transform:translate(-50%,-50%);width:520px;height:470px">
          <div style="position:absolute;left:30px;top:20px;transform:rotate(-14deg)">${a}</div>
          <div style="position:absolute;right:30px;top:20px;transform:rotate(12deg)">${k}</div>
        </div>
        <div style="position:absolute;left:50%;bottom:118px;transform:translateX(-50%);display:flex;gap:18px">
          ${UI.chip(100, '', '--size:150px')}${UI.chip(1000, '', '--size:150px')}${UI.chip(5000, '', '--size:150px')}
        </div>
      </div>`;
    Cards.injectSprite();
  });
  await page.waitForTimeout(300);
  const out = path.resolve(__dirname, '../ios/CasinoMaster/Assets.xcassets/AppIcon.appiconset/icon-1024.png');
  await page.screenshot({ path: out, omitBackground: false });
  await page.screenshot({ path: path.resolve(__dirname, '../web/icon.png'), clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  await browser.close();
  console.log('wrote', out);
})();
