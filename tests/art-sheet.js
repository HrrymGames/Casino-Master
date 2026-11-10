// Renders every character and dealer to one image for review: node tests/art-sheet.js out.png
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html'));
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    document.body.style.overflow = 'auto';
    document.body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(5,190px);gap:8px;padding:8px;background:#111">
      ${CHARACTERS.map(c => `<div style="width:190px;height:190px;border:3px solid #000">${Art.portrait(c)}</div>`).join('')}
      ${Object.values(DEALERS).map(d => `<div style="grid-column:span 1;width:190px;height:150px;background:#2a1a10;position:relative">${Art.dealer(d)}</div>`).join('')}
      ${Object.values(DEALERS).slice(0,2).map(d => `<div style="width:190px;height:150px;background:#1e6b45;display:flex;gap:20px;align-items:center;justify-content:center">${Art.hand(d,true)}${Art.hand(d,false)}</div>`).join('')}
    </div><style>svg{width:100%;height:100%;display:block}.hand{width:60px;height:66px}</style>`;
    Cards.injectSprite();
    Art.init();
  });
  await p.waitForTimeout(200);
  await p.screenshot({ path: process.argv[2] || 'art.png', fullPage: true });
  await b.close();
})();
