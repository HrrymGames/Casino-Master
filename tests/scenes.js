// Screenshots Blackjack in every room scene: node tests/scenes.js outDir
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 759 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html'));
  await p.waitForTimeout(300);
  await p.evaluate(() => { Store.newSave('Harry'); });
  for (const name of await p.evaluate(() => Art.SCENES)) {
    await p.evaluate(n => {
      App.go('play', 'blackjack');
      const room = document.querySelector('.game');
      const bg = Art.scene(n);
      room.style.background = bg ? `radial-gradient(ellipse 120% 90% at 50% 45%, transparent 45%, rgba(0,0,0,.6) 100%), ${bg} center top / cover no-repeat, #0b0a14` : '';
    }, name);
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(out, `scene-${name}.png`) });
  }
  await b.close();
})();
