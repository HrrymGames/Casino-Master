/* Higher or Lower — ten-card ladder, cash out any time */
'use strict';

const HL = {
  rank: c => (c.r === 1 ? 14 : c.r),
  RTP: 0.97,
  /* multiplier offered for a guess given the remaining deck */
  odds(cur, remaining) {
    const v = HL.rank(cur);
    const n = remaining.length || 1;
    let hi = 0, lo = 0, same = 0;
    for (const c of remaining) { const r = HL.rank(c); if (r > v) hi++; else if (r < v) lo++; else same++; }
    const pS = same / n;
    const m = p => (p > 0 ? Math.max(1, (HL.RTP - pS) / p) : 0);
    return { hi: m(hi / n), lo: m(lo / n), pHi: hi / n, pLo: lo / n, pSame: pS };
  }
};

class HiLo extends GameBase {
  constructor(root) {
    super(root);
    this.phase = 'bet';
    this.stake = 0; this.lastStake = 0;
    this.min = 10; this.max = 25000;
  }

  busy() { return this.phase === 'play'; }
  forfeit() { if (this.stake) Bank.record('hilo', -this.stake, 'left mid-run'); }

  mount() {
    this.root.innerHTML = `<div class="screen game hl">
      ${UI.topbar('Higher or Lower', { rules: true })}
      <div class="stage">
        <div class="lamp"></div>
        ${UI.dealer('rosie')}
        <main class="table felt">
          <div class="hl-print">HIGHER <span>or</span> LOWER<small>Aces high · same rank pushes</small></div>
          <div class="hl-row js-row">${Array.from({ length: 10 }, (_, i) => `<div class="hl-slot" data-i="${i}"><span>${i + 1}</span></div>`).join('')}</div>
          <div class="hl-status">
            <div><span>Stake</span><b class="js-stake">—</b></div>
            <div><span>Multiplier</span><b class="js-mult">×1.00</b></div>
            <div><span>Cash out</span><b class="js-pay">—</b></div>
          </div>
          <div class="bet-spot js-betspot"><div class="spot-ring"><span>STAKE</span></div><div class="js-betstack"></div></div>
        </main>
      </div>
      <footer class="controls js-controls"></footer>
    </div>`;
    this.$ = s => this.root.querySelector(s);
    this.bindTop('hilo');
    this.renderControls();
  }

  renderStatus() {
    this.$('.js-stake').textContent = this.phase === 'bet' ? (this.stake ? money(this.stake) : '—') : money(this.stake);
    this.$('.js-mult').textContent = '×' + (this.mult || 1).toFixed(2);
    this.$('.js-pay').textContent = this.phase === 'play' ? money(round2(this.stake * this.mult)) : '—';
    this.$('.js-betspot').classList.toggle('hidden', this.phase !== 'bet');
    this.$('.js-betstack').innerHTML = UI.chipStack(this.stake);
  }

  renderControls() {
    const c = this.$('.js-controls');
    c.innerHTML = '';
    if (this.phase === 'bet') {
      c.appendChild(el(`<div class="ctrl-info">Place your stake · ${money(this.min)}–${shortMoney(this.max)}</div>`));
      this.tray = UI.chipTray((v, chip) => {
        if (this.stake + v > this.max) return UI.toast(`Max stake is ${money(this.max)}`);
        if (this.stake + v > Bank.balance) return UI.toast('Not enough in the bank');
        this.stake += v;
        UI.flyChip(chip, this.$('.js-betspot'), v);
        this.afterStake();
      });
      c.appendChild(this.tray);
      const row = el('<div class="btn-row"><button class="btn js-clear">Clear</button><button class="btn gold js-start">Deal</button></div>');
      c.appendChild(row);
      row.querySelector('.js-clear').onclick = () => { Sound.chip(); this.stake = 0; this.afterStake(); };
      row.querySelector('.js-start').onclick = () => this.start();
      this.afterStake();
    } else if (this.phase === 'play') {
      const o = HL.odds(this.cur, this.deck);
      c.appendChild(el(`<div class="ctrl-info">Card ${this.idx + 1} of 10 · is the next card higher or lower than ${Cards.label(this.cur)}?</div>`));
      const row = el(`<div class="btn-row hl-btns">
        <button class="btn gold js-hi" ${o.hi ? '' : 'disabled'}><b>▲ Higher</b><small>${o.hi ? '×' + o.hi.toFixed(2) + ' · ' + Math.round(o.pHi * 100) + '%' : '—'}</small></button>
        <button class="btn gold js-lo" ${o.lo ? '' : 'disabled'}><b>▼ Lower</b><small>${o.lo ? '×' + o.lo.toFixed(2) + ' · ' + Math.round(o.pLo * 100) + '%' : '—'}</small></button>
        <button class="btn red js-cash" ${this.idx > 0 && this.mult > 1 ? '' : 'disabled'}><b>Cash out</b><small>${money(round2(this.stake * this.mult))}</small></button>
      </div>`);
      c.appendChild(row);
      row.querySelector('.js-hi').onclick = () => this.guess('hi');
      row.querySelector('.js-lo').onclick = () => this.guess('lo');
      row.querySelector('.js-cash').onclick = () => this.cashOut();
    } else {
      c.appendChild(el('<div class="ctrl-info">…</div>'));
    }
  }

  afterStake() {
    UI.refreshTray(this.tray, Math.min(Bank.balance - this.stake, this.max - this.stake));
    const b = this.$('.js-start');
    b.disabled = this.stake < this.min || this.stake > Bank.balance;
    b.textContent = this.stake ? `Deal · ${money(this.stake)}` : 'Deal';
    this.renderStatus();
  }

  async start() {
    if (this.phase !== 'bet' || this.stake < this.min) return;
    if (!Bank.take(this.stake)) return UI.toast('Not enough in the bank');
    Sound.click();
    this.lastStake = this.stake;
    this.phase = 'dealing';
    this.mult = 1;
    this.idx = 0;
    this.renderControls();
    this.renderStatus();
    // clear old cards
    const old = $$('.hl-slot .card', this.root);
    await Promise.all(old.map(c => flyTo(c, this.$('.dealer'), { scale: 0.3, fadeOut: true, duration: 280 })));
    old.forEach(c => c.remove());
    $$('.hl-slot', this.root).forEach(s => s.className = 'hl-slot');
    this.deck = Cards.newDeck(1);
    const dealerEl = this.$('.dealer');
    for (let i = 0; i < 10; i++) {
      const slot = this.$(`.hl-slot[data-i="${i}"]`);
      const ce = Cards.el(null, false);
      slot.appendChild(ce);
      Sound.card();
      UI.dealerDeal(this.root, i % 2 ? 'l' : 'r');
      flyFrom(ce, dealerEl, { duration: 300, scale: 0.4 });
      await this.wait(80);
    }
    await this.wait(350);
    this.cur = this.deck.pop();
    this.revealAt(0, this.cur);
    await this.wait(400);
    this.phase = 'play';
    this.renderControls();
    this.renderStatus();
  }

  revealAt(i, card) {
    const slot = this.$(`.hl-slot[data-i="${i}"]`);
    const ce = slot.querySelector('.card');
    Cards.setCard(ce, card);
    Cards.flip(ce, true);
    $$('.hl-slot', this.root).forEach(s => s.classList.remove('current'));
    slot.classList.add('current');
    return slot;
  }

  async guess(dir) {
    if (this.phase !== 'play' || this.guessing) return;
    this.guessing = true;
    const o = HL.odds(this.cur, this.deck);
    const m = dir === 'hi' ? o.hi : o.lo;
    if (!m) { this.guessing = false; return; }
    Sound.click();
    Native.haptic('light');
    const prev = this.cur;
    const next = this.deck.pop();
    this.idx++;
    UI.dealerDeal(this.root, 'r');
    const slot = this.revealAt(this.idx, next);
    await this.wait(480);
    const a = HL.rank(prev), b = HL.rank(next);
    this.cur = next;
    this.guessing = false;
    if (a === b) {
      slot.classList.add('push');
      Sound.push();
      UI.toast('Same rank — push');
    } else if ((dir === 'hi' && b > a) || (dir === 'lo' && b < a)) {
      this.mult *= m;
      slot.classList.add('right');
      Sound.win();
    } else {
      slot.classList.add('wrong');
      return this.lose();
    }
    this.renderStatus();
    if (this.idx >= 9) {
      UI.banner('Perfect run!', 'gold', 1500);
      await this.wait(600);
      return this.cashOut(true);
    }
    this.renderControls();
  }

  async lose() {
    this.phase = 'done';
    Sound.lose();
    Native.haptic('heavy');
    UI.banner('Wrong call', 'red', 1100);
    Bank.record('hilo', -this.stake, `lost on card ${this.idx + 1} at ×${this.mult.toFixed(2)}`);
    this.renderControls();
    await this.wait(1400);
    this.reset();
  }

  async cashOut(auto) {
    if (this.phase !== 'play') return;
    if (!auto && (this.idx === 0 || this.mult <= 1)) return;
    this.phase = 'done';
    const pay = round2(this.stake * this.mult);
    Bank.give(pay);
    const net = round2(pay - this.stake);
    Bank.record('hilo', net, `cashed out at ×${this.mult.toFixed(2)} after ${this.idx + 1} cards`);
    if (net > 0) { Sound.bigWin(); UI.banner(`Cashed out ${money(pay)}`, 'gold', 1500); Native.haptic('success'); }
    else { Sound.push(); UI.banner(`Returned ${money(pay)}`, '', 1200); }
    this.renderControls();
    await this.wait(1500);
    this.reset();
  }

  reset() {
    this.phase = 'bet';
    this.stake = this.lastStake <= Bank.balance ? this.lastStake : 0;
    this.mult = 1;
    this.renderControls();
    this.renderStatus();
    if (Bank.balance < this.min) this.later(500, () => App.bust());
  }
}
