// Drives the web build in Chromium at iPhone 15 size and saves screenshots.
// Usage: node tests/shots.js [outDir] [scale]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2] || path.join(__dirname, 'shots');
const SCALE = +(process.argv[3] || 1);
const URL = 'file://' + path.resolve(__dirname, '../web/index.html');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function newPage(w, h) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SCALE, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`[${w}x${h}] ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${w}x${h}] console: ${m.text()}`); });
    await page.goto(URL);
    await page.waitForTimeout(300);
    return page;
  }
  const overlaps = [];
  const shot = async (page, name) => {
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    const found = await page.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) return null; if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null; for (let a = e; a; a = a.parentElement) if (+getComputedStyle(a).opacity < 0.05) return null; return r; };
      const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const label = e => (e.className && e.className.baseVal === undefined ? '.' + String(e.className).trim().split(/\s+/).join('.') : e.tagName) + (e.textContent ? ` "${e.textContent.trim().slice(0, 24)}"` : '');
      // text-bearing leaf elements (not inside cards, chips or the modal)
      const texts = [...document.querySelectorAll('#screen *')].filter(e =>
        [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.closest('.card, .chip, .cell-chip, svg, .banner'));
      const solids = [...document.querySelectorAll('#screen .card, #screen .chip-stack, #screen .dealer .hand, #screen .cell-chip, #screen .avatar, #screen .table-print text, #screen .spot-ring')];
      const out = [];
      for (const t of texts) {
        const a = vis(t); if (!a) continue;
        for (const s of solids) {
          if (s.contains(t) || t.contains(s)) continue;
          const b = vis(s); if (!b) continue;
          const area = inter(a, b);
          if (area > a.width * a.height * 0.15) out.push(`${label(t)} under ${label(s)}`);
        }
      }
      // cards from different containers colliding
      const cards = [...document.querySelectorAll('#screen .card')].filter(c => !c.closest('.ht-hand, .js-disc, .cards, .tile-art, .title-art'));
      for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
        const a = vis(cards[i]), b = vis(cards[j]);
        if (a && b && inter(a, b) > a.width * a.height * 0.1) out.push(`card collision ${label(cards[i].parentNode)} / ${label(cards[j].parentNode)}`);
      }
      return [...new Set(out)];
    });
    if (found.length) overlaps.push(`${name}:\n  ` + found.join('\n  '));
  };

  for (const [orient, w, h] of [['portrait', 393, 759], ['landscape', 734, 372]]) {
    const page = await newPage(w, h);
    await shot(page, `${orient}-01-title`);
    await page.click('.js-new');
    await page.waitForTimeout(400);
    await page.fill('.js-name', 'Harry');
    await page.click('.modal-btns .btn.gold');
    await page.waitForTimeout(700);
    await shot(page, `${orient}-02a-pick-look`);
    await page.click('.ap[data-i="0"]');
    await page.click('.modal-btns .btn.gold');
    await page.waitForTimeout(1600);
    await shot(page, `${orient}-02-lobby`);

    // Blackjack
    await page.click('[data-game="blackjack"]');
    await page.waitForTimeout(400);
    await page.click('.chip-tray .chip[data-v="100"]');
    await page.click('.chip-tray .chip[data-v="25"]');
    await page.waitForTimeout(400);
    await shot(page, `${orient}-03-blackjack-bet`);
    await page.click('.js-deal');
    await page.waitForTimeout(3200);
    if (await page.$('.js-no')) { await page.click('.js-no'); await page.waitForTimeout(1200); }
    await shot(page, `${orient}-04-blackjack-play`);
    if (await page.$('.js-stand:not([disabled])')) { await page.click('.js-stand'); await page.waitForTimeout(3500); }
    await shot(page, `${orient}-05-blackjack-result`);
    await page.click('.js-back');
    await page.waitForTimeout(400);
    if (await page.$('.modal-btns .btn.gold')) { await page.click('.modal-btns .btn.gold'); await page.waitForTimeout(300); }

    // Kaboo
    await page.click('[data-game="kaboo"]');
    await page.waitForTimeout(400);
    await page.click('.js-opps button[data-n="3"]');
    await page.click('.chip-tray .chip[data-v="500"]');
    await page.waitForTimeout(300);
    await shot(page, `${orient}-06-kaboo-setup`);
    await page.click('.js-go');
    await page.waitForTimeout(3800);
    await shot(page, `${orient}-07-kaboo-peek`);
    await page.click('.js-ready');
    // play until it is our turn
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(500);
      if (await page.$('.js-draw')) break;
    }
    if (await page.$('.js-draw')) {
      await page.click('.js-draw');
      await page.waitForTimeout(900);
      await shot(page, `${orient}-08-kaboo-drawn`);
      await page.click('.js-place');
      await page.waitForTimeout(800);
      await shot(page, `${orient}-09-kaboo-after`);
    }
    await page.click('.js-back');
    await page.waitForTimeout(400);
    if (await page.$('.modal-btns .btn.gold')) { await page.click('.modal-btns .btn.gold'); await page.waitForTimeout(300); }

    // Hearts
    await page.click('[data-game="hearts"]');
    await page.waitForTimeout(400);
    await page.click('.chip-tray .chip[data-v="100"]');
    await page.click('.js-go');
    await page.waitForTimeout(900);
    for (const n of [13, 12, 11]) { await page.click('.js-hand .card:nth-child(' + n + ')', { force: true }); await page.waitForTimeout(80); }
    await page.waitForTimeout(300);
    await shot(page, `${orient}-10-hearts-pass`);
    if (await page.$('.js-pass:not([disabled])')) await page.click('.js-pass');
    await page.waitForTimeout(4500);
    await shot(page, `${orient}-11-hearts-play`);
    await page.click('.js-back');
    await page.waitForTimeout(400);
    if (await page.$('.modal-btns .btn.gold')) { await page.click('.modal-btns .btn.gold'); await page.waitForTimeout(300); }

    // Higher or lower
    await page.click('[data-game="hilo"]');
    await page.waitForTimeout(400);
    await page.click('.chip-tray .chip[data-v="100"]');
    await page.click('.js-start');
    await page.waitForTimeout(2800);
    await page.click('.js-hi:not([disabled]), .js-lo:not([disabled])');
    await page.waitForTimeout(900);
    await shot(page, `${orient}-12-hilo`);
    await page.click('.js-back');
    await page.waitForTimeout(400);
    if (await page.$('.modal-btns .btn.gold')) { await page.click('.modal-btns .btn.gold'); await page.waitForTimeout(300); }

    // Roulette
    await page.click('[data-game="roulette"]');
    await page.waitForTimeout(500);
    await page.click('.chip-tray .chip[data-v="100"]');
    await page.click('.rl-cell[data-bet="n17"]');
    await page.click('.rl-cell[data-bet="red"]');
    await page.click('.rl-cell[data-bet="d2"]');
    await page.waitForTimeout(400);
    await shot(page, `${orient}-13-roulette-bets`);
    await page.click('.js-spin');
    await page.waitForTimeout(3000);
    await shot(page, `${orient}-14-roulette-spin`);
    await page.waitForTimeout(4800);
    await shot(page, `${orient}-15-roulette-result`);
    await page.click('.js-back');
    await page.waitForTimeout(600);
    await shot(page, `${orient}-16-lobby-after`);
    await page.close();
  }
  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No page errors');
  console.log(overlaps.length ? 'OVERLAPS:\n' + overlaps.join('\n') : 'No overlaps found');
})();
