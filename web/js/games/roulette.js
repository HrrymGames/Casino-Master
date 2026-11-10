/* Roulette — European single-zero wheel */
'use strict';

const RL_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const RL = {
  ORDER: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
  RED: RL_RED,
  color(n) { return n === 0 ? 'green' : RL.RED.has(n) ? 'red' : 'black'; },
  BETS: (() => {
    const b = {};
    const range = (a, z, f = () => true) => { const o = []; for (let i = a; i <= z; i++) if (f(i)) o.push(i); return o; };
    for (let n = 0; n <= 36; n++) b['n' + n] = { label: String(n), nums: [n], pays: 35 };
    b.d1 = { label: '1st 12', nums: range(1, 12), pays: 2 };
    b.d2 = { label: '2nd 12', nums: range(13, 24), pays: 2 };
    b.d3 = { label: '3rd 12', nums: range(25, 36), pays: 2 };
    b.c1 = { label: '2:1', nums: range(1, 36, i => i % 3 === 1), pays: 2 };
    b.c2 = { label: '2:1', nums: range(1, 36, i => i % 3 === 2), pays: 2 };
    b.c3 = { label: '2:1', nums: range(1, 36, i => i % 3 === 0), pays: 2 };
    b.low = { label: '1–18', nums: range(1, 18), pays: 1 };
    b.high = { label: '19–36', nums: range(19, 36), pays: 1 };
    b.even = { label: 'Even', nums: range(1, 36, i => i % 2 === 0), pays: 1 };
    b.odd = { label: 'Odd', nums: range(1, 36, i => i % 2 === 1), pays: 1 };
    b.red = { label: 'Red', nums: range(1, 36, i => RL_RED.has(i)), pays: 1 };
    b.black = { label: 'Black', nums: range(1, 36, i => !RL_RED.has(i)), pays: 1 };
    return b;
  })(),
  /* total returned (stake + winnings) for a bet map and a result */
  payout(bets, n) {
    let ret = 0;
    for (const [k, amt] of Object.entries(bets)) if (RL.BETS[k].nums.includes(n)) ret += amt * (RL.BETS[k].pays + 1);
    return ret;
  }
};

class Roulette extends GameBase {
  constructor(root) {
    super(root);
    this.bets = {};
    this.lastBets = null;
    this.undo = [];
    this.chipV = 100;
    this.max = 50000;
    this.history = [];
    this.spinning = false;
  }

  busy() { return this.spinning; }
  forfeit() { const t = this.total(); if (t) Bank.record('roulette', -t, 'left mid-spin'); }

  /* ---------- wheel drawing ---------- */
  static wheelImage(size) {
    const key = size;
    Roulette._cache = Roulette._cache || {};
    if (Roulette._cache[key]) return Roulette._cache[key];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const R = size / 2;
    g.translate(R, R);
    const a = Math.PI * 2 / 37;
    // outer rim
    let grd = g.createRadialGradient(0, 0, R * 0.6, 0, 0, R);
    grd.addColorStop(0, '#6b3818'); grd.addColorStop(0.8, '#3d1b09'); grd.addColorStop(1, '#1e0b03');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d9b45a'; g.lineWidth = R * 0.018;
    g.beginPath(); g.arc(0, 0, R * 0.965, 0, Math.PI * 2); g.stroke();
    // ball track
    grd = g.createRadialGradient(0, 0, R * 0.78, 0, 0, R * 0.92);
    grd.addColorStop(0, '#2a1206'); grd.addColorStop(1, '#5b2c10');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R * 0.92, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9a24a'; g.lineWidth = R * 0.01;
    g.beginPath(); g.arc(0, 0, R * 0.92, 0, Math.PI * 2); g.stroke();
    // diamonds
    g.fillStyle = '#e8cf86';
    for (let i = 0; i < 8; i++) {
      g.save(); g.rotate(i * Math.PI / 4 + Math.PI / 8);
      g.beginPath(); g.moveTo(0, -R * 0.885); g.lineTo(R * 0.018, -R * 0.85); g.lineTo(0, -R * 0.815); g.lineTo(-R * 0.018, -R * 0.85); g.fill();
      g.restore();
    }
    // number ring + pockets
    RL.ORDER.forEach((n, i) => {
      const s = -Math.PI / 2 + i * a - a / 2;
      const col = RL.color(n) === 'green' ? '#1d7a45' : RL.color(n) === 'red' ? '#b3202a' : '#141416';
      g.fillStyle = col;
      g.beginPath(); g.arc(0, 0, R * 0.79, s, s + a); g.arc(0, 0, R * 0.64, s + a, s, true); g.closePath(); g.fill();
      g.fillStyle = RL.color(n) === 'green' ? '#145a32' : RL.color(n) === 'red' ? '#7d151c' : '#0b0b0c';
      g.beginPath(); g.arc(0, 0, R * 0.64, s, s + a); g.arc(0, 0, R * 0.53, s + a, s, true); g.closePath(); g.fill();
      g.save();
      g.rotate(-Math.PI / 2 + i * a + Math.PI / 2);
      g.fillStyle = '#fff';
      g.font = `700 ${Math.max(7, R * 0.085)}px Georgia, serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), 0, -R * 0.715);
      g.restore();
    });
    g.strokeStyle = '#d9b45a'; g.lineWidth = Math.max(1, R * 0.008);
    for (let i = 0; i < 37; i++) {
      const s = -Math.PI / 2 + i * a - a / 2;
      g.beginPath(); g.moveTo(Math.cos(s) * R * 0.53, Math.sin(s) * R * 0.53); g.lineTo(Math.cos(s) * R * 0.79, Math.sin(s) * R * 0.79); g.stroke();
    }
    [0.79, 0.64, 0.53].forEach(r => { g.beginPath(); g.arc(0, 0, R * r, 0, Math.PI * 2); g.stroke(); });
    // cone
    grd = g.createRadialGradient(-R * 0.1, -R * 0.1, R * 0.05, 0, 0, R * 0.53);
    grd.addColorStop(0, '#8a5228'); grd.addColorStop(1, '#3a1a08');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R * 0.52, 0, Math.PI * 2); g.fill();
    // turret
    g.strokeStyle = '#e2c066'; g.lineCap = 'round'; g.lineWidth = R * 0.035;
    for (let i = 0; i < 4; i++) {
      g.save(); g.rotate(i * Math.PI / 2 + Math.PI / 4);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -R * 0.3); g.stroke();
      g.fillStyle = '#f0d58a'; g.beginPath(); g.arc(0, -R * 0.31, R * 0.035, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    grd = g.createRadialGradient(-R * 0.03, -R * 0.03, 0, 0, 0, R * 0.1);
    grd.addColorStop(0, '#fff2c0'); grd.addColorStop(1, '#b8923a');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R * 0.09, 0, Math.PI * 2); g.fill();
    Roulette._cache[key] = c;
    return c;
  }

  static drawWheel(canvas, cssSize, rot = 0, ball = null) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const px = Math.round(cssSize * dpr);
    if (canvas.width !== px) { canvas.width = canvas.height = px; }
    canvas.style.width = canvas.style.height = cssSize + 'px';
    const g = canvas.getContext('2d');
    const img = Roulette.wheelImage(px);
    g.clearRect(0, 0, px, px);
    g.save();
    g.translate(px / 2, px / 2);
    g.rotate(rot);
    g.drawImage(img, -px / 2, -px / 2);
    g.restore();
    if (ball) {
      const R = px / 2;
      const x = px / 2 + Math.cos(ball.a) * ball.r * R, y = px / 2 + Math.sin(ball.a) * ball.r * R;
      const grd = g.createRadialGradient(x - R * 0.01, y - R * 0.01, 0, x, y, R * 0.035);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#b9b9b9');
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.arc(x + R * 0.008, y + R * 0.01, R * 0.033, 0, Math.PI * 2); g.fill();
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, R * 0.03, 0, Math.PI * 2); g.fill();
    }
  }

  /* ---------- layout ---------- */
  mount() {
    this.root.innerHTML = `<div class="screen game rl">
      ${UI.topbar('Roulette', { rules: true })}
      <div class="stage no-dealer">
        <main class="table felt">
          <div class="rl-top">
            <canvas class="rl-wheel js-wheel"></canvas>
            <div class="rl-side">
              <div class="rl-hist js-hist"><span class="muted">No spins yet</span></div>
              <div class="rl-total">On the table <b class="js-total">£0</b></div>
            </div>
          </div>
          <div class="rl-board js-board"></div>
        </main>
      </div>
      <footer class="controls js-controls"></footer>
    </div>`;
    this.$ = s => this.root.querySelector(s);
    this.bindTop('roulette');
    this.wheelRot = 0;
    this.drawSmall();
    this.buildBoard();
    this.$('.js-board').addEventListener('click', e => this.onBoard(e));
    this.mq = window.matchMedia('(orientation: landscape)');
    this.onOrient = () => { this.buildBoard(); this.drawSmall(); };
    this.mq.addEventListener ? this.mq.addEventListener('change', this.onOrient) : this.mq.addListener(this.onOrient);
    this.renderControls();
  }

  onDestroy() {
    if (this.mq) this.mq.removeEventListener ? this.mq.removeEventListener('change', this.onOrient) : this.mq.removeListener(this.onOrient);
    cancelAnimationFrame(this.raf);
  }

  drawSmall() {
    const cv = this.$('.js-wheel');
    const size = isLandscape() ? 84 : 104;
    Roulette.drawWheel(cv, size, this.wheelRot, this.lastBall);
  }

  buildBoard() {
    const v = !isLandscape();
    const board = this.$('.js-board');
    board.classList.toggle('vertical', v);
    board.classList.toggle('horizontal', !v);
    const cells = [];
    const cell = (key, area, cls = '') => {
      const b = RL.BETS[key];
      cells.push(`<button class="rl-cell ${cls}" data-bet="${key}" style="grid-area:${area}"><span>${b.label}</span></button>`);
    };
    if (v) {
      cell('n0', '1 / 1 / 2 / 6', 'green num');
      cells.push('<div class="rl-cell blank" style="grid-area:14 / 1 / 15 / 3"></div>');
      for (let n = 1; n <= 36; n++) {
        const row = Math.ceil(n / 3) + 1, col = 2 + ((n - 1) % 3) + 1;
        cell('n' + n, `${row} / ${col} / ${row + 1} / ${col + 1}`, RL.color(n) + ' num');
      }
      ['c1', 'c2', 'c3'].forEach((k, i) => cell(k, `14 / ${3 + i} / 15 / ${4 + i}`, 'col'));
      ['d1', 'd2', 'd3'].forEach((k, i) => cell(k, `${2 + i * 4} / 2 / ${6 + i * 4} / 3`, 'dozen side'));
      ['low', 'even', 'red', 'black', 'odd', 'high'].forEach((k, i) => cell(k, `${2 + i * 2} / 1 / ${4 + i * 2} / 2`, 'outside side ' + (k === 'red' || k === 'black' ? 'swatch ' + k : '')));
    } else {
      cell('n0', '1 / 1 / 4 / 2', 'green num');
      cells.push('<div class="rl-cell blank" style="grid-area:4 / 1 / 6 / 2"></div><div class="rl-cell blank" style="grid-area:4 / 14 / 6 / 15"></div>');
      for (let n = 1; n <= 36; n++) {
        const col = Math.ceil(n / 3) + 1, row = 3 - ((n - 1) % 3);
        cell('n' + n, `${row} / ${col} / ${row + 1} / ${col + 1}`, RL.color(n) + ' num');
      }
      ['c3', 'c2', 'c1'].forEach((k, i) => cell(k, `${1 + i} / 14 / ${2 + i} / 15`, 'col'));
      ['d1', 'd2', 'd3'].forEach((k, i) => cell(k, `4 / ${2 + i * 4} / 5 / ${6 + i * 4}`, 'dozen'));
      ['low', 'even', 'red', 'black', 'odd', 'high'].forEach((k, i) => cell(k, `5 / ${2 + i * 2} / 6 / ${4 + i * 2}`, 'outside ' + (k === 'red' || k === 'black' ? 'swatch ' + k : '')));
    }
    board.innerHTML = cells.join('');
    this.renderBets();
  }

  renderBets() {
    $$('.rl-cell', this.root).forEach(c => {
      const amt = this.bets[c.dataset.bet] || 0;
      let chip = c.querySelector('.cell-chip');
      if (!amt) { if (chip) chip.remove(); return; }
      const v = [...CHIPS].reverse().find(x => x.v <= amt) || CHIPS[0];
      const html = `<div class="cell-chip" style="--chip:${v.c}"><span>${shortMoney(amt)}</span></div>`;
      if (chip) chip.outerHTML = html; else c.insertAdjacentHTML('beforeend', html);
    });
    const total = this.total();
    this.$('.js-total').textContent = money(total);
    const spin = this.$('.js-spin');
    if (spin) spin.disabled = !total || this.spinning;
  }

  total() { return Object.values(this.bets).reduce((a, b) => a + b, 0); }

  renderControls() {
    const c = this.$('.js-controls');
    c.innerHTML = '';
    c.appendChild(el('<div class="ctrl-info js-info">Pick a chip, then tap the board</div>'));
    this.tray = UI.chipTray(v => { this.chipV = v; this.markChip(); });
    c.appendChild(this.tray);
    const row = el(`<div class="btn-row">
      <button class="btn js-undo">Undo</button>
      <button class="btn js-clear">Clear</button>
      <button class="btn js-rebet">Rebet</button>
      <button class="btn gold js-spin">Spin</button>
    </div>`);
    c.appendChild(row);
    row.querySelector('.js-undo').onclick = () => this.doUndo();
    row.querySelector('.js-clear').onclick = () => { if (this.spinning) return; Sound.chip(); this.bets = {}; this.undo = []; this.renderBets(); this.refresh(); };
    row.querySelector('.js-rebet').onclick = () => this.rebet();
    row.querySelector('.js-spin').onclick = () => this.spin();
    this.markChip();
    this.refresh();
    this.renderBets();
  }

  markChip() {
    $$('.chip', this.tray).forEach(ch => ch.classList.toggle('sel', +ch.dataset.v === this.chipV));
  }

  refresh() {
    UI.refreshTray(this.tray, Bank.balance);
    const rb = this.$('.js-rebet');
    if (rb) rb.disabled = !this.lastBets || this.spinning;
    const ud = this.$('.js-undo');
    if (ud) ud.disabled = !this.undo.length || this.spinning;
  }

  onBoard(e) {
    const cell = e.target.closest('.rl-cell');
    if (!cell || this.spinning) return;
    if (this.resultShown) this.clearResult();
    const v = this.chipV;
    const t = this.total();
    if (t + v > this.max) { Sound.error(); return UI.toast(`Table max ${money(this.max)} per spin`); }
    if (t + v > Bank.balance) { Sound.error(); return UI.toast('Not enough in the bank'); }
    const k = cell.dataset.bet;
    this.bets[k] = (this.bets[k] || 0) + v;
    this.undo.push([k, v]);
    Sound.chip();
    Native.haptic('light');
    this.renderBets();
    this.refresh();
    const sel = this.tray.querySelector('.chip.sel');
    if (sel) UI.flyChip(sel, cell, v);
  }

  doUndo() {
    if (this.spinning) return;
    const u = this.undo.pop();
    if (!u) return;
    Sound.chip();
    this.bets[u[0]] -= u[1];
    if (this.bets[u[0]] <= 0) delete this.bets[u[0]];
    this.renderBets(); this.refresh();
  }

  rebet() {
    if (!this.lastBets || this.spinning) return;
    if (this.resultShown) this.clearResult();
    const t = Object.values(this.lastBets).reduce((a, b) => a + b, 0);
    if (t > Bank.balance) { Sound.error(); return UI.toast('Not enough in the bank to rebet'); }
    Sound.chip();
    this.bets = Object.assign({}, this.lastBets);
    this.undo = [];
    this.renderBets(); this.refresh();
  }

  clearResult() {
    this.resultShown = false;
    $$('.rl-cell', this.root).forEach(c => c.classList.remove('hit', 'won'));
    this.bets = {};
    this.renderBets();
  }

  /* ---------- spin ---------- */
  async spin() {
    if (this.spinning) return;
    const total = this.total();
    if (!total) return UI.toast('Place a bet first');
    if (!Bank.take(total)) return UI.toast('Not enough in the bank');
    Sound.click();
    this.spinning = true;
    this.lastBets = Object.assign({}, this.bets);
    this.undo = [];
    this.refresh();
    this.renderBets();
    this.$('.js-info').textContent = 'No more bets!';

    const result = RL.ORDER[randInt(37)];
    const idx = RL.ORDER.indexOf(result);
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.82;
    const ov = el(`<div class="wheel-overlay"><canvas></canvas><div class="wheel-result"></div></div>`);
    $('#overlay').appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    const cv = ov.querySelector('canvas');
    await this.animateSpin(cv, size, idx);
    if (!this.alive) return;

    const col = RL.color(result);
    const res = ov.querySelector('.wheel-result');
    res.innerHTML = `<span class="pill ${col}">${result}</span> ${col.toUpperCase()}`;
    res.classList.add('show');
    await this.wait(1500);
    ov.classList.remove('show');
    setTimeout(() => ov.remove(), 300);
    this.drawSmall();

    const ret = round2(RL.payout(this.bets, result));
    const net = round2(ret - total);
    if (ret > 0) Bank.give(ret);
    Bank.record('roulette', net, `${result} ${col} · bet ${money(total)}`);
    this.history.unshift(result);
    if (this.history.length > 14) this.history.length = 14;
    this.$('.js-hist').innerHTML = this.history.map((n, i) => `<span class="pill ${RL.color(n)} ${i === 0 ? 'latest' : ''}">${n}</span>`).join('');
    $$('.rl-cell', this.root).forEach(c => {
      const k = c.dataset.bet;
      if (k === 'n' + result) c.classList.add('hit');
      if (this.bets[k] && RL.BETS[k].nums.includes(result)) c.classList.add('won');
    });
    if (net > 0) { Sound.bigWin(); UI.banner(`${result} ${col} — you win ${money(net)}!`, 'gold', 1800); Native.haptic('success'); }
    else if (ret > 0) { Sound.push(); UI.banner(`${result} ${col} — ${money(ret)} back`, '', 1500); }
    else { Sound.lose(); UI.banner(`${result} ${col}`, 'red', 1200); }
    this.spinning = false;
    this.resultShown = true;
    this.$('.js-info').textContent = 'Tap the board for a new bet, or Rebet';
    this.refresh();
    this.renderBets();
    if (Bank.balance < 10) this.later(1500, () => App.bust());
  }

  animateSpin(cv, size, idx) {
    return new Promise(resolve => {
      const a = Math.PI * 2 / 37;
      const dur = 5600;
      const w0 = this.wheelRot;
      const W = Math.PI * 2 * (1.4 + Math.random() * 0.4);
      const rel0 = Math.random() * Math.PI * 2;
      const relFinal = -Math.PI / 2 + idx * a;
      let d = (relFinal - rel0) % (Math.PI * 2);
      if (d > 0) d -= Math.PI * 2;
      const relTotal = d - Math.PI * 2 * 5;
      const easeOut = t => 1 - Math.pow(1 - t, 3);
      const start = performance.now();
      let lastPocket = null;
      const frame = now => {
        if (!this.alive) return resolve();
        const t = Math.min(1, (now - start) / dur);
        const w = w0 + W * easeOut(t);
        const tb = Math.min(1, t / 0.86);
        const rel = rel0 + relTotal * easeOut(tb);
        let r;
        if (t < 0.55) r = 0.855;
        else if (t < 0.86) {
          const k = (t - 0.55) / 0.31;
          r = 0.855 - (0.855 - 0.585) * k + Math.sin(k * Math.PI * 3) * 0.03 * (1 - k);
        } else r = 0.585;
        const ballA = w + rel;
        Roulette.drawWheel(cv, size, w, { a: ballA, r });
        const pocket = Math.floor((rel + Math.PI * 100) / a);
        if (t > 0.5 && t < 0.9 && pocket !== lastPocket) { Sound.tick(); lastPocket = pocket; }
        if (t < 1) this.raf = requestAnimationFrame(frame);
        else {
          this.wheelRot = w % (Math.PI * 2);
          this.lastBall = { a: this.wheelRot + relFinal, r: 0.585 };
          resolve();
        }
      };
      this.raf = requestAnimationFrame(frame);
    });
  }
}
