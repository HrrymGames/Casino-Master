// Plays lots of rounds of every game in a real browser, with timers sped up,
// and checks there are no errors and that the bankroll matches the recorded results.
// Usage: node tests/soak.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../web/index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 393, height: 759 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + '\n' + e.stack));
  await page.goto(URL);
  await page.evaluate(() => {
    // speed everything up 10x
    const w = GameBase.prototype.wait;
    GameBase.prototype.wait = function (ms) { return w.call(this, Math.max(1, ms / 10)); };
    const l = GameBase.prototype.later;
    GameBase.prototype.later = function (ms, fn) { return l.call(this, Math.max(1, ms / 10), fn); };
    const ff = window.flyFrom, ft = window.flyTo;
    window.flyFrom = (e, f, o = {}) => ff(e, f, Object.assign({}, o, { duration: 20 }));
    window.flyTo = (e, f, o = {}) => ft(e, f, Object.assign({}, o, { duration: 20 }));
    UI.modal = () => Promise.resolve('again'); // auto-dismiss end-of-game dialogs
    Store.newSave('Soak');
    App.go('lobby');
  });
  const until = async (fn, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(30); }
    console.log('ERRORS so far:\n' + errors.join('\n'));
    console.log('state:', await page.evaluate(() => JSON.stringify({ phase: App.game && App.game.phase, acting: App.game && App.game.acting })));
    throw new Error('timeout waiting for ' + fn.toString().slice(0, 120));
  };
  const check = async label => {
    const r = await page.evaluate(() => {
      const s = Store.current;
      const net = Object.values(s.stats.byGame).reduce((a, g) => a + g.net, 0);
      return { bal: s.balance, net: Math.round(net * 100) / 100 };
    });
    const ok = Math.abs(r.bal - 10000 - r.net) < 0.011 && Number.isFinite(r.bal);
    console.log(`${ok ? '✓' : '✗'} ${label}: balance ${r.bal}, recorded net ${r.net}`);
    if (!ok) errors.push(`bankroll mismatch after ${label}`);
  };

  // ---- Blackjack ----
  await page.evaluate(() => App.go('play', 'blackjack'));
  for (let i = 0; i < 60; i++) {
    await page.evaluate(() => { const g = App.game; g.bet = 50; g.deal(); });
    for (let k = 0; k < 40; k++) {
      const ph = await page.evaluate(() => App.game.phase);
      if (ph === 'bet') break;
      await page.evaluate(() => {
        const g = App.game;
        if (g.phase === 'insurance') return g.resolveChoice(Math.random() < 0.3);
        if (g.phase !== 'play' || g.acting) return;
        const opts = [...document.querySelectorAll('.js-controls .actions .btn:not([disabled])')].map(b => b.className.match(/js-(\w+)/)[1]);
        const pickOne = opts[Math.floor(Math.random() * opts.length)];
        const map = { hit: 'hit', stand: 'stand', double: 'double', split: 'split', surr: 'surrender' };
        if (pickOne) g.act(map[pickOne]);
      });
      await page.waitForTimeout(60);
    }
    await until(() => App.game.phase === 'bet');
  }
  await check('60 blackjack hands');

  // ---- Higher or lower ----
  await page.evaluate(() => App.go('play', 'hilo'));
  for (let i = 0; i < 25; i++) {
    await until(() => App.game.phase === 'bet');
    await page.evaluate(() => { App.game.stake = 20; App.game.start(); });
    await until(() => App.game.phase !== 'dealing');
    for (let k = 0; k < 12; k++) {
      const ph = await page.evaluate(() => App.game.phase);
      if (ph !== 'play') break;
      await page.evaluate(() => {
        const g = App.game;
        if (g.guessing) return;
        if (g.idx > 2 && Math.random() < 0.3) return g.cashOut();
        const o = HL.odds(g.cur, g.deck);
        g.guess(o.pHi > o.pLo ? 'hi' : 'lo');
      });
      await page.waitForTimeout(90);
    }
  }
  await until(() => App.game.phase === 'bet');
  await check('25 higher-or-lower runs');

  // ---- Roulette ----
  await page.evaluate(() => App.go('play', 'roulette'));
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      const g = App.game;
      if (g.resultShown) g.clearResult();
      const keys = Object.keys(RL.BETS);
      for (let j = 0; j < 4; j++) { const k = keys[Math.floor(Math.random() * keys.length)]; g.bets[k] = (g.bets[k] || 0) + 10; }
      g.spin();
    });
    await until(() => !App.game.spinning, 15000);
  }
  await check('8 roulette spins');

  // ---- Kaboo ----
  for (let game = 0; game < 4; game++) {
    await page.evaluate(n => { App.go('play', 'kaboo'); App.game.opponents = n; App.game.stake = 30; App.game.startGame(); }, 1 + (game % 3));
    await until(() => App.game.phase === 'peek');
    await page.evaluate(() => App.game.finishPeek());
    for (let step = 0; step < 600; step++) {
      const ph = await page.evaluate(() => App.game.phase);
      if (ph === 'over') break;
      await page.evaluate(() => {
        const g = App.game;
        if (Math.random() < 0.03 && g.canSnap() && !g.snapMode) {
          const mine = g.players[0].slots.map((c, i) => c ? i : -1).filter(i => i >= 0);
          if (mine.length) { g.snapMode = true; g.humanSnap(mine[0]); return; }
        }
        if (g.turn !== 0) return;
        if (g.phase === 'turn') {
          if (g.firstRoundDone && g.turnsTaken > 8 && g.kabooBy === null) { g.callKaboo(0); }
          return g.humanDraw();
        }
        if (g.phase === 'drawn') {
          if (Math.random() < 0.5) return g.humanPlaceDown();
          const s = g.players[0].slots.findIndex(Boolean);
          return s >= 0 ? g.humanReplace(s) : g.humanPlaceDown();
        }
        if (g.phase === 'power') {
          if (g.sel && g.sel.type === 'p10look') return g.tenDecision(Math.random() < 0.5);
          const slot = document.querySelector('.kb-slot.pickable');
          if (slot && Math.random() < 0.85) return g.powerPick(+slot.dataset.p, +slot.dataset.s);
          return g.skipPower();
        }
      });
      await page.waitForTimeout(40);
    }
    await until(() => App.game.phase === 'over' || App.game.phase === 'setup', 30000);
  }
  await check('4 games of kaboo');

  // ---- Hearts ----
  await page.evaluate(() => { App.go('play', 'hearts'); App.game.target = 50; App.game.stake = 20; App.game.startGame(); });
  for (let step = 0; step < 3000; step++) {
    const ph = await page.evaluate(() => App.game.phase);
    if (ph === 'over' || ph === 'setup') break;
    await page.evaluate(() => {
      const g = App.game;
      if (g.phase === 'pass' && g.selected.size < 3) {
        g.players[0].hand.slice(0, 3).forEach(c => g.selected.add(c.id));
        return g.doPass();
      }
      if (g.phase === 'play' && g.turn === 0 && g._humanPick) {
        const legal = g.legalFor(0);
        const c = legal[Math.floor(Math.random() * legal.length)];
        g._fromRect = document.querySelector('.js-hand').getBoundingClientRect();
        g._humanPick(c);
      }
    });
    await page.waitForTimeout(25);
  }
  await until(() => App.game.phase === 'over' || App.game.phase === 'setup', 60000);
  await check('a game of hearts to 50');

  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('Soak test passed');
})();
