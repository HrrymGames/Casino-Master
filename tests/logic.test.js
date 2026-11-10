// Pure rules tests: node tests/logic.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ctx = { window: {}, document: { addEventListener() {} }, console, crypto: require('crypto').webcrypto, navigator: {} };
ctx.window = ctx;
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(__dirname, '../web/js', f), 'utf8'), ctx, { filename: f });
['util.js', 'storage.js', 'cards.js', 'ui.js', 'games/blackjack.js', 'games/kaboo.js', 'games/hearts.js', 'games/hilo.js', 'games/roulette.js'].forEach(load);
const { BJ, KB, HT, HL, RL } = vm.runInContext('({ BJ, KB, HT, HL, RL })', ctx);

const C = (r, s = 'S') => ({ r, s, id: r + s + Math.random() });
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

console.log('Blackjack');
t('soft totals', () => {
  assert.deepStrictEqual(BJ.total([C(1), C(6)]).total, 17);
  assert.strictEqual(BJ.total([C(1), C(6)]).soft, true);
  assert.strictEqual(BJ.total([C(1), C(6), C(10)]).total, 17);
  assert.strictEqual(BJ.total([C(1), C(1), C(9)]).total, 21);
  assert.strictEqual(BJ.total([C(13), C(12), C(2)]).total, 22);
});
t('blackjack detection', () => {
  assert.ok(BJ.isBJ([C(1), C(13)]));
  assert.ok(!BJ.isBJ([C(7), C(7), C(7)]));
});
t('hi-lo count values', () => {
  assert.strictEqual(BJ.hiLo(C(5)), 1);
  assert.strictEqual(BJ.hiLo(C(8)), 0);
  assert.strictEqual(BJ.hiLo(C(12)), -1);
  assert.strictEqual(BJ.hiLo(C(1)), -1);
});

console.log('Kaboo');
t('card points', () => {
  assert.strictEqual(KB.val(C(13, 'S')), 0);
  assert.strictEqual(KB.val(C(13, 'C')), 0);
  assert.strictEqual(KB.val(C(13, 'H')), 20);
  assert.strictEqual(KB.val(C(13, 'D')), 20);
  assert.strictEqual(KB.val(C(1)), 1);
  assert.strictEqual(KB.val(C(11)), 11);
  assert.strictEqual(KB.val(C(12)), 12);
  assert.strictEqual(KB.val(C(9)), 9);
});
t('powers only on 7-10', () => {
  assert.deepStrictEqual([6, 7, 8, 9, 10, 11].map(r => KB.power(C(r))), [0, 7, 8, 9, 10, 0]);
});

console.log('Hearts');
t('2 of clubs must lead first trick', () => {
  const hand = [C(2, 'C'), C(5, 'D'), C(9, 'H')];
  assert.deepStrictEqual(HT.legal(hand, [], 0, false).map(c => c.r + c.s), ['2C']);
});
t('cannot lead hearts until broken', () => {
  const hand = [C(5, 'D'), C(9, 'H')];
  assert.deepStrictEqual(HT.legal(hand, [], 3, false).map(c => c.s), ['D']);
  assert.strictEqual(HT.legal(hand, [], 3, true).length, 2);
  assert.strictEqual(HT.legal([C(9, 'H'), C(3, 'H')], [], 3, false).length, 2, 'only hearts left');
});
t('must follow suit, else anything', () => {
  const trick = [{ p: 1, c: C(4, 'S') }];
  assert.deepStrictEqual(HT.legal([C(2, 'S'), C(12, 'H')], trick, 2, false).map(c => c.s), ['S']);
  assert.strictEqual(HT.legal([C(12, 'S', 'x'), C(12, 'H')].filter(c => c.s !== 'S').concat([C(3, 'D')]), trick, 0, false).length, 2);
});
t('trick winner is highest of led suit, aces high', () => {
  const trick = [{ p: 0, c: C(10, 'C') }, { p: 1, c: C(1, 'H') }, { p: 2, c: C(1, 'C') }, { p: 3, c: C(13, 'C') }];
  assert.strictEqual(HT.winner(trick), 2);
});
t('scoring and shooting the moon', () => {
  const hearts = Array.from({ length: 13 }, (_, i) => C(i + 1, 'H'));
  const qs = C(12, 'S');
  let r = HT.handScores([[...hearts, qs], [], [], []]);
  assert.deepStrictEqual(r.pts, [0, 26, 26, 26]);
  assert.strictEqual(r.moon, 0);
  r = HT.handScores([hearts.slice(0, 5), [qs], hearts.slice(5), []]);
  assert.deepStrictEqual(r.pts, [5, 13, 8, 0]);
});

console.log('Higher or Lower');
t('multipliers keep a small house edge', () => {
  const deck = [];
  for (const s of 'SHDC') for (let r = 1; r <= 13; r++) deck.push(C(r, s));
  const cur = deck.splice(deck.findIndex(c => c.r === 7), 1)[0];
  const o = HL.odds(cur, deck);
  const ev = o.pHi * o.hi + o.pSame;
  assert.ok(Math.abs(ev - 0.97) < 1e-9, 'EV ' + ev);
  const ace = C(1, 'S');
  assert.strictEqual(HL.odds(ace, deck).hi, 0, 'nothing beats an ace');
});

console.log('Roulette');
t('wheel has 37 unique pockets', () => {
  assert.strictEqual(new Set(RL.ORDER).size, 37);
  assert.strictEqual(RL.RED.size, 18);
});
t('payouts', () => {
  assert.strictEqual(RL.payout({ n17: 10 }, 17), 360);
  assert.strictEqual(RL.payout({ n17: 10 }, 18), 0);
  assert.strictEqual(RL.payout({ red: 10, d2: 10 }, 14), 20 + 30);
  assert.strictEqual(RL.payout({ red: 10, black: 10, even: 10, low: 10 }, 0), 0);
  assert.strictEqual(RL.payout({ c3: 10 }, 36), 30);
  assert.strictEqual(RL.BETS.c1.nums.length, 12);
  assert.strictEqual(RL.BETS.black.nums.length, 18);
});

console.log(`\n${n} tests passed`);
