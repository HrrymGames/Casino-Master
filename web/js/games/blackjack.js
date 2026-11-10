/* Blackjack — 6 decks, S17, BJ 3:2, DAS, split to 4, late surrender, insurance */
'use strict';

const BJ = {
  val(c) { return c.r === 1 ? 1 : Math.min(10, c.r); },
  total(cards) {
    let t = 0, aces = 0;
    for (const c of cards) { t += BJ.val(c); if (c.r === 1) aces++; }
    const soft = aces > 0 && t + 10 <= 21;
    return { total: soft ? t + 10 : t, soft, hard: t };
  },
  isBJ(cards) { return cards.length === 2 && BJ.total(cards).total === 21; },
  hiLo(c) { const v = BJ.val(c); return v >= 2 && v <= 6 ? 1 : (v === 10 || v === 1 ? -1 : 0); }
};

class Blackjack extends GameBase {
  constructor(root) {
    super(root);
    this.min = 10; this.max = 25000;
    this.bet = 0; this.lastBet = 0;
    this.hands = []; this.dealer = []; this.active = 0;
    this.phase = 'bet';
    this.insurance = 0;
    this.newShoe();
  }

  newShoe() {
    this.shoe = Cards.newDeck(6);
    this.cut = Math.floor(this.shoe.length * 0.25);
    this.rc = 0;
    this.discarded = 0;
  }

  busy() { return ['deal', 'insurance', 'play', 'dealer'].includes(this.phase); }

  mount() {
    this.root.innerHTML = `<div class="screen game bj">
      ${UI.topbar('Blackjack', { rules: true })}
      <div class="stage">
        <div class="lamp"></div>
        ${UI.dealer('vincent')}
        <main class="table felt">
          <div class="discard-tray js-discard"><div class="tray-stack"></div><span>Discard</span></div>
          <div class="shoe js-shoe"><div class="shoe-box"><div class="shoe-fill"></div></div><span class="js-shoe-lbl">6 decks</span></div>
          <button class="count-pill js-count"></button>
          <div class="bj-dealer">
            <div class="hand-label">Dealer <b class="badge js-dval"></b></div>
            <div class="cards js-dcards"></div>
          </div>
          <svg class="table-print" viewBox="0 0 400 112" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs><path id="bj-arc1" d="M24 22 Q200 104 376 22"/><path id="bj-arc2" d="M4 44 Q200 140 396 44"/></defs>
            <path d="M10 30 Q200 122 390 30" fill="none" stroke="#e7c873" stroke-width="1.2" opacity=".55"/>
            <text font-size="20" letter-spacing="2"><textPath href="#bj-arc1" xlink:href="#bj-arc1" startOffset="50%" text-anchor="middle">BLACKJACK PAYS 3 TO 2</textPath></text>
            <text font-size="9.5" letter-spacing="1" class="sub"><textPath href="#bj-arc2" xlink:href="#bj-arc2" startOffset="50%" text-anchor="middle">DEALER STANDS ON ALL 17s · INSURANCE PAYS 2 TO 1</textPath></text>
          </svg>
          <div class="bj-hands js-hands"></div>
          <div class="bet-spot js-betspot"><div class="spot-ring"><span>BET</span></div><div class="js-betstack"></div></div>
        </main>
      </div>
      <footer class="controls js-controls"></footer>
    </div>`;
    this.$ = s => this.root.querySelector(s);
    this.bindTop('blackjack');
    this.$('.js-count').onclick = () => { Store.setting('showCount', !Store.data.settings.showCount); this.renderShoe(); };
    this.renderShoe();
    this.renderControls();
    this.renderBet();
  }

  /* ---------- rendering ---------- */
  renderShoe() {
    const frac = this.shoe.length / 312;
    this.$('.shoe-fill').style.height = (frac * 100) + '%';
    this.$('.js-shoe-lbl').textContent = (this.shoe.length / 52).toFixed(1) + ' decks';
    const tray = this.$('.tray-stack');
    tray.style.height = Math.min(100, this.discarded / 312 * 100 * 1.4) + '%';
    const pill = this.$('.js-count');
    if (Store.data.settings.showCount) {
      const decks = Math.max(0.5, this.shoe.length / 52);
      const tc = this.rc / decks;
      pill.innerHTML = `RC ${this.rc > 0 ? '+' : ''}${this.rc} · TC ${tc > 0 ? '+' : ''}${tc.toFixed(1)}`;
      pill.classList.add('on');
    } else {
      pill.textContent = 'Count';
      pill.classList.remove('on');
    }
  }

  renderBet() {
    const spot = this.$('.js-betspot');
    const showSpot = this.phase === 'bet' && !this.hands.length;
    spot.classList.toggle('hidden', !showSpot);
    spot.classList.toggle('has', this.bet > 0);
    this.$('.js-betstack').innerHTML = UI.chipStack(this.bet);
  }

  valueLabel(cards) {
    if (!cards.length) return '';
    const t = BJ.total(cards);
    if (t.total > 21) return 'BUST';
    if (cards.length === 2 && t.total === 21) return 'BJ';
    return t.soft && t.total !== 21 ? `${t.hard}/${t.total}` : String(t.total);
  }

  renderValues() {
    const d = this.$('.js-dval');
    const shown = this.dealer.filter(c => !c.hidden);
    d.textContent = shown.length ? (this.dealer.some(c => c.hidden) ? BJ.total(shown).total + '+' : this.valueLabel(this.dealer)) : '';
    d.classList.toggle('bust', BJ.total(shown).total > 21);
    this.hands.forEach((h, i) => {
      const box = this.handBox(i);
      if (!box) return;
      const b = box.querySelector('.badge');
      b.textContent = this.valueLabel(h.cards);
      b.classList.toggle('bust', BJ.total(h.cards).total > 21);
      box.classList.toggle('active', this.phase === 'play' && i === this.active && this.hands.length > 1);
      box.querySelector('.hand-bet').innerHTML = UI.chipStack(h.bet, 4);
    });
  }

  handBox(i) { return this.root.querySelector(`.bj-hand[data-i="${i}"]`); }

  renderHands() {
    const wrap = this.$('.js-hands');
    wrap.innerHTML = '';
    wrap.dataset.n = this.hands.length;
    this.hands.forEach((h, i) => {
      const box = el(`<div class="bj-hand" data-i="${i}">
        <div class="hand-label">${this.hands.length > 1 ? 'Hand ' + (i + 1) : 'You'} <b class="badge"></b></div>
        <div class="cards"></div>
        <div class="hand-bet"></div>
        <div class="hand-result"></div>
      </div>`);
      const cards = box.querySelector('.cards');
      h.cards.forEach(c => cards.appendChild(Cards.el(c, true)));
      wrap.appendChild(box);
    });
    this.renderValues();
  }

  renderControls() {
    const c = this.$('.js-controls');
    c.innerHTML = '';
    c.dataset.phase = this.phase;
    if (this.phase === 'bet') {
      const tray = UI.chipTray((v, chip) => this.addChip(v, chip));
      this.tray = tray;
      const row = el(`<div class="btn-row">
        <button class="btn js-clear">Clear</button>
        <button class="btn js-x2">×2</button>
        <button class="btn gold js-deal">Deal</button>
      </div>`);
      c.appendChild(el(`<div class="ctrl-info">Place your bet · ${money(this.min)}–${shortMoney(this.max)}</div>`));
      c.appendChild(tray);
      c.appendChild(row);
      row.querySelector('.js-clear').onclick = () => { Sound.chip(); this.bet = 0; this.afterBetChange(); };
      row.querySelector('.js-x2').onclick = () => {
        const nb = Math.min(this.max, this.bet * 2);
        if (!this.bet) return;
        if (nb > Bank.balance) { Sound.error(); UI.toast('Not enough in the bank'); return; }
        Sound.chip(); this.bet = nb; this.afterBetChange();
      };
      row.querySelector('.js-deal').onclick = () => this.deal();
      this.afterBetChange(true);
    } else if (this.phase === 'insurance') {
      const ins = this.hands[0].bet / 2;
      c.appendChild(el(`<div class="ctrl-info">Dealer shows an ace — take insurance for ${money(ins)}?</div>`));
      const row = el(`<div class="btn-row"><button class="btn js-no">No thanks</button><button class="btn gold js-yes" ${Bank.canAfford(ins) ? '' : 'disabled'}>Insure ${money(ins)}</button></div>`);
      c.appendChild(row);
      row.querySelector('.js-no').onclick = () => this.resolveChoice(false);
      row.querySelector('.js-yes').onclick = () => this.resolveChoice(true);
    } else {
      const h = this.hands[this.active];
      const can = this.phase === 'play' && h;
      const canDouble = can && h.cards.length === 2 && !h.splitAces && Bank.canAfford(h.bet);
      const canSplit = can && h.cards.length === 2 && BJ.val(h.cards[0]) === BJ.val(h.cards[1]) && this.hands.length < 4 && !h.splitAces && Bank.canAfford(h.bet);
      const canSurr = can && this.hands.length === 1 && h.cards.length === 2;
      c.appendChild(el(`<div class="ctrl-info js-info">${this.phase === 'play' ? (this.hands.length > 1 ? `Playing hand ${this.active + 1} of ${this.hands.length}` : 'Your move') : 'Dealer’s turn…'}</div>`));
      const row = el(`<div class="btn-row actions">
        <button class="btn gold js-hit" ${can ? '' : 'disabled'}>Hit</button>
        <button class="btn js-stand" ${can ? '' : 'disabled'}>Stand</button>
        <button class="btn js-double" ${canDouble ? '' : 'disabled'}>Double</button>
        <button class="btn js-split" ${canSplit ? '' : 'disabled'}>Split</button>
        <button class="btn js-surr" ${canSurr ? '' : 'disabled'}>Surr</button>
      </div>`);
      c.appendChild(row);
      row.querySelector('.js-hit').onclick = () => this.act('hit');
      row.querySelector('.js-stand').onclick = () => this.act('stand');
      row.querySelector('.js-double').onclick = () => this.act('double');
      row.querySelector('.js-split').onclick = () => this.act('split');
      row.querySelector('.js-surr').onclick = () => this.act('surrender');
    }
  }

  afterBetChange(silent) {
    if (this.tray) UI.refreshTray(this.tray, Math.min(Bank.balance - this.bet, this.max - this.bet));
    const deal = this.$('.js-deal');
    if (deal) {
      deal.disabled = this.bet < this.min || this.bet > Bank.balance;
      deal.textContent = this.bet ? `Deal ${money(this.bet)}` : 'Deal';
    }
    this.renderBet();
  }

  addChip(v, chip) {
    if (this.bet + v > this.max) { UI.toast(`Table max is ${money(this.max)}`); return; }
    if (this.bet + v > Bank.balance) { UI.toast('Not enough in the bank'); return; }
    if (this.hands.length) this.clearTable();
    this.bet += v;
    UI.flyChip(chip, this.$('.js-betspot'), v);
    this.afterBetChange();
  }

  choice() { return new Promise(res => { this._choice = res; }); }
  resolveChoice(v) { Sound.click(); if (this._choice) { const f = this._choice; this._choice = null; f(v); } }

  /* ---------- dealing ---------- */
  draw() {
    if (!this.shoe.length) this.newShoe();
    return this.shoe.pop();
  }

  seen(c) { this.rc += BJ.hiLo(c); this.renderShoe(); }

  async dealTo(target, faceUp = true) {
    const c = this.draw();
    let container;
    if (target === 'd') { this.dealer.push(c); container = this.$('.js-dcards'); }
    else { this.hands[target].cards.push(c); container = this.handBox(target).querySelector('.cards'); }
    if (!faceUp) c.hidden = true;
    const ce = Cards.el(c, false);
    container.appendChild(ce);
    Sound.card();
    UI.dealerDeal(this.root, 'r', ce);
    await flyFrom(ce, UI.deckSource(this.root, this.$('.js-shoe')), { duration: 340, scale: 0.6 });
    if (faceUp) { Cards.flip(ce, true); this.seen(c); }
    this.renderShoe();
    this.renderValues();
    await this.wait(260);
    return c;
  }

  async clearTable() {
    const cards = $$('.bj-hands .card, .js-dcards .card', this.root);
    if (!cards.length && !this.hands.length) return;
    const tray = this.$('.js-discard');
    UI.dealerDeal(this.root, 'r', tray);
    this.discarded += cards.length;
    const anims = cards.map((c, i) => new Promise(r => setTimeout(() => flyTo(c, tray, { scale: 0.4, fadeOut: true, duration: 300 }).then(r), i * 25)));
    this.hands = []; this.dealer = [];
    await Promise.all(anims);
    this.$('.js-dcards').innerHTML = '';
    this.renderHands();
    this.renderShoe();
    this.renderBet();
    this.renderValues();
  }

  async deal() {
    if (this.phase !== 'bet') return;
    if (this.bet < this.min) { UI.toast(`Minimum bet is ${money(this.min)}`); return; }
    if (!Bank.take(this.bet)) { UI.toast('Not enough in the bank'); return; }
    Sound.click();
    this.lastBet = this.bet;
    this.phase = 'deal';
    this.renderControls();
    await this.clearTable();
    if (this.shoe.length < this.cut) {
      UI.banner('Shuffling the shoe…', '', 1000);
      UI.dealerShuffle(this.root);
      this.newShoe();
      this.renderShoe();
      await this.wait(1100);
    }
    this.hands = [{ cards: [], bet: this.bet, done: false }];
    this.dealer = [];
    this.active = 0;
    this.insurance = 0;
    this.renderBet();
    this.renderHands();
    await this.dealTo(0);
    await this.dealTo('d');
    await this.dealTo(0);
    await this.dealTo('d', false);

    const up = this.dealer[0];
    const playerBJ = BJ.isBJ(this.hands[0].cards);
    if (up.r === 1) {
      this.phase = 'insurance';
      this.renderControls();
      const yes = await this.choice();
      if (yes) {
        const ins = this.hands[0].bet / 2;
        if (Bank.take(ins)) { this.insurance = ins; UI.toast(`Insured for ${money(ins)}`); }
      }
    }
    if (up.r === 1 || BJ.val(up) === 10) {
      this.phase = 'deal';
      this.renderControls();
      this.$('.js-info') && (this.$('.js-info').textContent = 'Dealer checks for blackjack…');
      await this.wait(650);
      if (BJ.isBJ(this.dealer)) {
        await this.revealHole();
        UI.banner('Dealer Blackjack', 'red');
        await this.wait(700);
        return this.settle();
      } else if (this.insurance) {
        UI.toast('No dealer blackjack — insurance lost');
      }
    }
    if (playerBJ) {
      await this.revealHole();
      return this.settle();
    }
    this.phase = 'play';
    this.renderControls();
    this.renderValues();
  }

  async revealHole() {
    const hole = this.dealer[1];
    if (!hole || !hole.hidden) return;
    hole.hidden = false;
    const ce = this.$('.js-dcards').children[1];
    UI.dealerDeal(this.root, 'r', ce);
    Cards.flip(ce, true);
    this.seen(hole);
    this.renderValues();
    await this.wait(450);
  }

  /* ---------- player actions ---------- */
  async act(a) {
    if (this.phase !== 'play' || this.acting) return;
    const h = this.hands[this.active];
    this.acting = true;
    Sound.click();
    Native.haptic('light');
    try {
      if (a === 'hit') {
        await this.dealTo(this.active);
        const t = BJ.total(h.cards).total;
        if (t > 21) { this.handResult(this.active, 'BUST', 'lose'); Sound.lose(); h.done = true; await this.wait(400); return await this.nextHand(); }
        if (t === 21) { h.done = true; return await this.nextHand(); }
        this.renderControls();
      } else if (a === 'stand') {
        h.done = true;
        return await this.nextHand();
      } else if (a === 'double') {
        if (!Bank.take(h.bet)) return UI.toast('Not enough in the bank');
        h.bet *= 2; h.doubled = true;
        this.renderValues();
        await this.dealTo(this.active);
        if (BJ.total(h.cards).total > 21) { this.handResult(this.active, 'BUST', 'lose'); Sound.lose(); await this.wait(400); }
        h.done = true;
        return await this.nextHand();
      } else if (a === 'split') {
        if (!Bank.take(h.bet)) return UI.toast('Not enough in the bank');
        const second = h.cards.pop();
        const aces = second.r === 1;
        const nh = { cards: [second], bet: h.bet, done: false, split: true, splitAces: aces };
        h.split = true; h.splitAces = aces;
        this.hands.splice(this.active + 1, 0, nh);
        this.renderHands();
        await this.dealTo(this.active);
        if (aces) {
          await this.dealTo(this.active + 1);
          h.done = true; nh.done = true;
          return await this.nextHand();
        }
        if (BJ.total(h.cards).total === 21) { h.done = true; return await this.nextHand(); }
        this.renderControls();
      } else if (a === 'surrender') {
        h.surrendered = true; h.done = true;
        this.handResult(this.active, 'SURRENDER', 'push');
        return await this.dealerTurn();
      }
    } finally {
      this.acting = false;
    }
  }

  async nextHand() {
    while (this.active < this.hands.length) {
      const h = this.hands[this.active];
      if (!h.done) {
        if (h.cards.length < 2) {
          this.renderValues();
          await this.dealTo(this.active);
          if (BJ.total(h.cards).total === 21) { h.done = true; this.active++; continue; }
        }
        this.phase = 'play';
        this.renderControls();
        this.renderValues();
        return;
      }
      this.active++;
    }
    this.active = this.hands.length - 1;
    return await this.dealerTurn();
  }

  async dealerTurn() {
    this.phase = 'dealer';
    this.renderControls();
    this.renderValues();
    await this.wait(300);
    await this.revealHole();
    const live = this.hands.some(h => !h.surrendered && BJ.total(h.cards).total <= 21);
    if (live) {
      while (BJ.total(this.dealer).total < 17) {
        await this.dealTo('d');
        await this.wait(150);
      }
    }
    await this.wait(250);
    this.settle();
  }

  handResult(i, text, kind) {
    const box = this.handBox(i);
    if (!box) return;
    const r = box.querySelector('.hand-result');
    r.textContent = text;
    r.className = 'hand-result show ' + kind;
  }

  settle() {
    const d = BJ.total(this.dealer).total;
    const dBJ = BJ.isBJ(this.dealer);
    let returned = 0, staked = this.insurance;
    const parts = [];
    this.hands.forEach((h, i) => {
      staked += h.bet;
      const t = BJ.total(h.cards).total;
      const natural = this.hands.length === 1 && BJ.isBJ(h.cards);
      let ret = 0, label, kind;
      if (h.surrendered) { ret = h.bet / 2; label = 'SURRENDER'; kind = 'push'; }
      else if (t > 21) { ret = 0; label = 'BUST'; kind = 'lose'; }
      else if (natural && !dBJ) { ret = h.bet * 2.5; label = 'BLACKJACK!'; kind = 'win'; }
      else if (natural && dBJ) { ret = h.bet; label = 'PUSH'; kind = 'push'; }
      else if (dBJ) { ret = 0; label = 'LOSE'; kind = 'lose'; }
      else if (d > 21 || t > d) { ret = h.bet * 2; label = 'WIN'; kind = 'win'; }
      else if (t === d) { ret = h.bet; label = 'PUSH'; kind = 'push'; }
      else { ret = 0; label = 'LOSE'; kind = 'lose'; }
      returned += ret;
      const net = ret - h.bet;
      this.handResult(i, label + (net > 0 ? ` +${money(net)}` : ''), kind);
      if (net > 0) { const box = this.handBox(i); this.later(250 + i * 200, () => UI.payChips(this.root, box && box.querySelector('.hand-bet'), net)); }
      parts.push(label.replace('!', ''));
    });
    if (this.insurance && dBJ) returned += this.insurance * 3;
    returned = round2(returned);
    if (returned > 0) Bank.give(returned);
    const net = round2(returned - staked);
    Bank.record('blackjack', net, parts.join(', ').toLowerCase() + ` · bet ${money(staked)}`);
    if (net > 0) {
      (parts.includes('BLACKJACK') ? Sound.bigWin() : Sound.win());
      UI.banner(parts.includes('BLACKJACK') ? `Blackjack! +${money(net)}` : `You win ${money(net)}`, 'gold');
      Native.haptic('success');
    } else if (net < 0) {
      Sound.lose();
      UI.banner(d > 21 ? 'Unlucky' : `Dealer wins`, 'red', 1000);
    } else {
      Sound.push();
      UI.banner('Push', '', 900);
    }
    this.phase = 'bet';
    this.bet = this.lastBet <= Bank.balance ? this.lastBet : 0;
    this.renderValues();
    this.renderControls();
    if (Bank.balance < this.min) this.later(1500, () => App.bust());
  }

  forfeit() {
    const staked = this.hands.reduce((a, h) => a + h.bet, 0) + this.insurance;
    if (staked) Bank.record('blackjack', -staked, 'left the table mid-hand');
  }
}
