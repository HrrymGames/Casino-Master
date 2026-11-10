// Renders a sheet of card faces/backs for review: node tests/card-sheet.js out.png
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html'));
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    const cards = [[1, 'S'], [13, 'H'], [12, 'S'], [11, 'D'], [10, 'C'], [7, 'H'], [1, 'D'], [13, 'C'], [12, 'H'], [11, 'S'], [9, 'D'], [3, 'S']];
    document.body.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:12px;padding:16px;background:#1f5e3e;--cw:120px">
      ${cards.map(([r, s]) => Cards.el({ r, s }).outerHTML).join('')}${Cards.el({ r: 1, s: 'S' }, false).outerHTML}</div>`;
    Cards.injectSprite();
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: process.argv[2] || 'cards.png', fullPage: true });
  await b.close();
})();
