/* Hearts — four players, passing, breaking hearts, shooting the moon */
'use strict';

const HT = {
  rank: c => (c.r === 1 ? 14 : c.r),
  points: c => (c.s === 'H' ? 1 : (c.s === 'S' && c.r === 12 ? 13 : 0)),
  isQS: c => c.s === 'S' && c.r === 12,
  SUIT_ORDER: { C: 0, D: 1, S: 2, H: 3 },
  PASS: [{ name: 'left', off: 1 }, { name: 'right', off: 3 }, { name: 'across', off: 2 }, { name: 'none', off: 0 }],
  sort(hand) { return hand.sort((a, b) => HT.SUIT_ORDER[a.s] - HT.SUIT_ORDER[b.s] || HT.rank(a) - HT.rank(b)); },

  legal(hand, trick, trickNo, broken) {
    if (!trick.length) {
      if (trickNo === 0) {
        const two = hand.filter(c => c.s === 'C' && c.r === 2);
        if (two.length) return two;
      }
      if (!broken) {
        const nonH = hand.filter(c => c.s !== 'H');
        if (nonH.length) return nonH;
      }
      return hand.slice();
    }
    const led = trick[0].c.s;
    const follow = hand.filter(c => c.s === led);
    return follow.length ? follow : hand.slice();
  },

  winner(trick) {
    const led = trick[0].c.s;
    let best = trick[0];
    for (const t of trick) if (t.c.s === led && HT.rank(t.c) > HT.rank(best.c)) best = t;
    return best.p;
  },

  /* returns per-player points for the hand, applying shoot-the-moon */
  handScores(taken) {
    const pts = taken.map(cards => cards.reduce((a, c) => a + HT.points(c), 0));
    const moon = pts.findIndex(p => p === 26);
    if (moon >= 0) return { pts: pts.map((p, i) => (i === moon ? 0 : 26)), moon };
    return { pts, moon: -1 };
  }
};

class Hearts extends GameBase {
  constructor(root) {
    super(root);
    this.phase = 'setup';
    this.stake = 100;
    this.target = 100;
  }

  busy() { return !['setup', 'over'].includes(this.phase); }
  forfeit() { if (this.stake) Bank.record('hearts', -this.stake, 'left the table mid-game'); }

  mount() {
    this.root.innerHTML = `<div class="screen game ht">
      ${UI.topbar('Hearts', { rules: true })}
      <div class="stage no-dealer">
        <main class="table felt">
          <div class="ht-board js-board"></div>
        </main>
      </div>
      <footer class="controls js-controls"></footer>
    </div>`;
    this.$ = s => this.root.querySelector(s);
    this.bindTop('hearts');
    this.onResize = () => this.layoutHand();
    window.addEventListener('resize', this.onResize);
    this.showSetup();
  }

  onDestroy() { window.removeEventListener('resize', this.onResize); }

  showSetup() {
    this.phase = 'setup';
    this.stake = Math.min(this.stake, Math.floor(Bank.balance / 10) * 10) || 0;
    this.$('.js-board').className = 'ht-board js-board';
    this.$('.js-board').innerHTML = `<div class="setup-panel">
      <h3>New game of Hearts</h3>
      <div class="seg-label">Play to</div>
      <div class="seg js-target">${[50, 100].map(n => `<button class="${n === this.target ? 'on' : ''}" data-n="${n}">${n} pts</button>`).join('')}</div>
      <div class="seg-label">Stake each · pot</div>
      <div class="setup-stake js-stake"></div>
      <p class="setup-note">Four players each pay the stake. Lowest score when someone hits ${this.target} takes the pot.</p>
    </div>`;
    this.$('.js-target').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      Sound.click(); this.target = +b.dataset.n; this.showSetup();
    };
    const c = this.$('.js-controls');
    c.innerHTML = '';
    c.appendChild(el('<div class="ctrl-info">Choose your stake</div>'));
    this.tray = UI.chipTray((v, chip) => {
      if (this.stake + v > Bank.balance) return UI.toast('Not enough in the bank');
      this.stake += v; UI.flyChip(chip, this.$('.js-stake'), v); this.updateStake();
    });
    c.appendChild(this.tray);
    const row = el('<div class="btn-row"><button class="btn js-clear">Clear</button><button class="btn gold js-go">Deal</button></div>');
    c.appendChild(row);
    row.querySelector('.js-clear').onclick = () => { Sound.chip(); this.stake = 0; this.updateStake(); };
    row.querySelector('.js-go').onclick = () => this.startGame();
    this.updateStake();
  }

  updateStake() {
    this.$('.js-stake').innerHTML = `${UI.chipStack(this.stake, 5)}<div class="pot-amt">Pot ${money(this.stake * 4)}</div>`;
    UI.refreshTray(this.tray, Bank.balance - this.stake);
    const go = this.$('.js-go');
    go.disabled = this.stake < 10 || this.stake > Bank.balance;
    go.textContent = this.stake ? `Deal · ${money(this.stake)}` : 'Deal';
  }

  startGame() {
    if (this.stake < 10) return UI.toast('Minimum stake is £10');
    if (!Bank.take(this.stake)) return UI.toast('Not enough in the bank');
    Sound.click();
    const chars = shuffle(CHARACTERS.slice());
    this.players = [
      { name: Store.current.name, ai: false, char: { style: 'm', skin: '#e8b48c', hair: '#2b1d14', shirt: '#b8232b' } },
      { name: chars[0].name, ai: true, char: chars[0] },
      { name: chars[1].name, ai: true, char: chars[1] },
      { name: chars[2].name, ai: true, char: chars[2] }
    ];
    this.players.forEach(p => { p.total = 0; p.hand = []; p.taken = []; });
    this.handNo = 0;
    this.buildBoard();
    this.newHand();
  }

  buildBoard() {
    const b = this.$('.js-board');
    b.className = 'ht-board js-board playing';
    const seatName = ['me', 'west', 'north', 'east'];
    b.innerHTML = `
      ${this.players.slice(1).map((p, k) => `
        <div class="ht-seat" data-p="${k + 1}" style="grid-area:${seatName[k + 1]}">
          ${UI.avatar(p.char, 'sm')}
          <div class="seat-info"><div class="seat-name">${esc(p.name)}</div><div class="seat-score js-score"></div></div>
          <div class="seat-cards"><div class="card mini"><div class="card-inner"><div class="card-face back">${Cards.BACK}</div></div></div><span class="js-count">13</span></div>
        </div>`).join('')}
      <div class="ht-trick" style="grid-area:trick">
        <div class="trick-slot s0"></div><div class="trick-slot s1"></div><div class="trick-slot s2"></div><div class="trick-slot s3"></div>
        <div class="trick-msg js-msg"></div>
      </div>
      <div class="ht-me" style="grid-area:me">
        <div class="me-bar"><span class="seat-name">${esc(this.players[0].name)}</span><span class="seat-score js-myscore"></span><span class="broken-ind js-broken"></span></div>
        <div class="ht-hand js-hand"></div>
      </div>`;
    this.$('.js-hand').addEventListener('click', e => this.onHandClick(e));
  }

  /* ---------------- hand lifecycle ---------------- */
  async newHand() {
    const deck = Cards.newDeck(1);
    this.players.forEach((p, i) => { p.hand = HT.sort(deck.slice(i * 13, i * 13 + 13)); p.taken = []; });
    this.trick = [];
    this.trickNo = 0;
    this.broken = false;
    this.qsPlayed = false;
    this.received = new Set();
    this.selected = new Set();
    this.pass = HT.PASS[this.handNo % 4];
    this.renderSeats();
    this.renderHand(true);
    this.setMsg(`Hand ${this.handNo + 1}`);
    Sound.card();
    if (this.pass.off) {
      this.phase = 'pass';
      this.setMsg(`Pass 3 cards ${this.pass.name}`);
      this.renderControls();
      this.renderHand();
    } else {
      UI.toast('No passing this hand');
      this.startPlay();
    }
  }

  async doPass() {
    if (this.phase !== 'pass' || this.selected.size !== 3) return;
    Sound.click();
    this.phase = 'busy';
    this.renderControls();
    const outgoing = this.players.map((p, i) => i === 0
      ? p.hand.filter(c => this.selected.has(c.id))
      : this.aiPassChoice(p.hand));
    this.players.forEach((p, i) => { p.hand = p.hand.filter(c => !outgoing[i].includes(c)); });
    this.players.forEach((p, i) => {
      const to = (i + this.pass.off) % 4;
      this.players[to].hand.push(...outgoing[i]);
    });
    const from = (4 - this.pass.off) % 4;
    outgoing[from].forEach(c => this.received.add(c.id));
    this.players.forEach(p => HT.sort(p.hand));
    this.selected.clear();
    this.renderHand(true);
    UI.toast(`You received ${outgoing[from].map(c => Cards.label(c)).join(' ')} from ${esc(this.players[from].name)}`, 2600);
    await this.wait(900);
    this.startPlay();
  }

  aiPassChoice(hand) {
    const danger = c => {
      if (HT.isQS(c)) return 100;
      if (c.s === 'S' && c.r === 1) return 95;
      if (c.s === 'S' && c.r === 13) return 90;
      if (c.s === 'H') return HT.rank(c) + 20;
      return HT.rank(c);
    };
    return hand.slice().sort((a, b) => danger(b) - danger(a)).slice(0, 3);
  }

  startPlay() {
    this.phase = 'play';
    this.turn = this.players.findIndex(p => p.hand.some(c => c.s === 'C' && c.r === 2));
    this.leader = this.turn;
    this.renderControls();
    this.loop();
  }

  async loop() {
    while (this.alive && this.phase === 'play') {
      if (this.trick.length === 4) {
        await this.resolveTrick();
        if (this.trickNo === 13) return this.endHand();
        continue;
      }
      const p = this.players[this.turn];
      this.renderSeats();
      if (p.ai) {
        this.setMsg(`${esc(p.name)} is thinking…`);
        await this.wait(550 + randInt(450));
        if (!this.alive) return;
        await this.playCard(this.turn, this.aiChoose(this.turn));
      } else {
        this.setMsg(this.trick.length ? 'Your turn — follow suit if you can' : (this.trickNo === 0 ? `Lead the 2${Cards.suitIcon('C')}` : 'Your lead'));
        this.renderHand();
        Native.haptic('light');
        const c = await new Promise(res => { this._humanPick = res; });
        this._humanPick = null;
        await this.playCard(0, c);
      }
      this.turn = (this.turn + 1) % 4;
    }
  }

  legalFor(i) { return HT.legal(this.players[i].hand, this.trick, this.trickNo, this.broken); }

  onHandClick(e) {
    const ce = e.target.closest('.card');
    if (!ce) return;
    const card = this.players[0].hand.find(c => c.id === ce.dataset.id);
    if (!card) return;
    if (this.phase === 'pass') {
      if (this.selected.has(card.id)) this.selected.delete(card.id);
      else if (this.selected.size < 3) this.selected.add(card.id);
      else return UI.toast('Pick exactly 3 cards');
      Sound.flip();
      this.renderHand();
      this.renderControls();
      return;
    }
    if (this.phase !== 'play' || this.turn !== 0 || !this._humanPick) return;
    const legal = this.legalFor(0);
    if (!legal.includes(card)) {
      Sound.error();
      if (this.trick.length) UI.toast(`You must follow ${Cards.suitName(this.trick[0].c.s).toLowerCase()}`);
      else if (this.trickNo === 0) UI.toast(`The 2${Cards.suitIcon('C')} must lead`);
      else UI.toast('Hearts haven’t been broken yet');
      return;
    }
    Sound.click();
    this._fromRect = ce.getBoundingClientRect();
    this._humanPick(card);
  }

  async playCard(i, card) {
    const p = this.players[i];
    p.hand = p.hand.filter(c => c !== card);
    const ledSuit = this.trick.length ? this.trick[0].c.s : null;
    this.trick.push({ p: i, c: card });
    if (HT.isQS(card)) this.qsPlayed = true;
    if (card.s === 'H' && !this.broken) {
      this.broken = true;
      if (ledSuit && ledSuit !== 'H') UI.banner(`Hearts broken!`, 'red', 900);
    }
    const slot = this.$('.trick-slot.s' + i);
    const ce = Cards.el(card, true);
    slot.innerHTML = '';
    slot.appendChild(ce);
    Sound.card();
    const from = i === 0 ? this._fromRect : this.root.querySelector(`.ht-seat[data-p="${i}"] .seat-cards`);
    if (i === 0) this.renderHand();
    this.renderSeats();
    await flyFrom(ce, from, { duration: 330, rotate: i === 0 ? 0 : -12, scale: i === 0 ? 1 : 0.5 });
    if (HT.isQS(card)) Native.haptic('heavy');
  }

  async resolveTrick() {
    const w = HT.winner(this.trick);
    const pts = this.trick.reduce((a, t) => a + HT.points(t.c), 0);
    await this.wait(650);
    $$('.trick-slot', this.root).forEach(s => s.classList.toggle('winner', +s.className.match(/s(\d)/)[1] === w));
    this.setMsg(`${w === 0 ? 'You take' : esc(this.players[w].name) + ' takes'} the trick${pts ? ` (+${pts})` : ''}`);
    await this.wait(600);
    const target = w === 0 ? this.$('.me-bar') : this.root.querySelector(`.ht-seat[data-p="${w}"]`);
    const cards = $$('.trick-slot .card', this.root);
    await Promise.all(cards.map(c => flyTo(c, target, { scale: 0.3, fadeOut: true, duration: 380 })));
    $$('.trick-slot', this.root).forEach(s => { s.innerHTML = ''; s.classList.remove('winner'); });
    this.players[w].taken.push(...this.trick.map(t => t.c));
    if (pts && w === 0) Sound.lose();
    this.trick = [];
    this.trickNo++;
    this.turn = w;
    this.leader = w;
    this.received.clear();
    this.renderSeats();
  }

  async endHand() {
    this.phase = 'between';
    this.renderControls();
    const { pts, moon } = HT.handScores(this.players.map(p => p.taken));
    this.players.forEach((p, i) => { p.total += pts[i]; });
    if (moon >= 0) {
      UI.banner(`${moon === 0 ? 'You' : esc(this.players[moon].name)} shot the moon!`, moon === 0 ? 'gold' : 'red', 2000);
      if (moon === 0) Sound.bigWin(); else Sound.lose();
      await this.wait(1800);
    }
    this.renderSeats();
    const over = this.players.some(p => p.total >= this.target);
    const rows = this.players.map((p, i) => `<tr><td>${esc(p.name)}</td><td>+${pts[i]}</td><td><b>${p.total}</b></td></tr>`).join('');
    if (!over) {
      await UI.modal({
        title: `End of hand ${this.handNo + 1}`,
        html: `<table class="score-table"><tr><th>Player</th><th>Hand</th><th>Total</th></tr>${rows}</table><p class="setup-note">Playing to ${this.target}</p>`,
        buttons: [{ label: 'Next hand', cls: 'gold' }]
      });
      if (!this.alive) return;
      this.handNo++;
      return this.newHand();
    }
    // game over
    this.phase = 'over';
    const totals = this.players.map(p => p.total);
    const best = Math.min(...totals);
    const winners = totals.map((t, i) => i).filter(i => totals[i] === best);
    const pot = this.stake * 4;
    const iWon = winners.includes(0);
    const share = round2(pot / winners.length);
    if (iWon) Bank.give(share);
    const net = round2((iWon ? share : 0) - this.stake);
    Bank.record('hearts', net, `finished on ${totals[0]} pts (best ${best})`);
    if (iWon) { Sound.bigWin(); Native.haptic('success'); } else Sound.lose();
    this.renderControls();
    const res = await UI.modal({
      title: iWon ? (winners.length > 1 ? 'Shared win!' : 'You win the pot!') : `${esc(this.players[winners[0]].name)} wins`,
      html: `<table class="score-table"><tr><th>Player</th><th>Hand</th><th>Total</th></tr>${rows}</table>
        <p class="result-line ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${money(net)}</p>`,
      buttons: [{ label: 'Lobby', value: 'lobby' }, { label: 'Play again', cls: 'gold', value: 'again' }]
    });
    if (res === 'lobby') App.go('lobby'); else this.showSetup();
  }

  /* ---------------- AI ---------------- */
  aiChoose(i) {
    const hand = this.players[i].hand;
    const legal = this.legalFor(i);
    if (legal.length === 1) return legal[0];
    const byRank = (a, b) => HT.rank(a) - HT.rank(b);
    const lowest = arr => arr.slice().sort(byRank)[0];
    const highest = arr => arr.slice().sort(byRank).pop();
    const qsOut = !this.qsPlayed;

    if (!this.trick.length) {
      let c = legal.filter(x => !(x.s === 'S' && qsOut && HT.rank(x) >= 12));
      const nonH = c.filter(x => x.s !== 'H');
      if (nonH.length) c = nonH;
      if (!c.length) c = legal;
      // lead from the shortest non-heart suit, lowest card
      const count = s => hand.filter(x => x.s === s).length;
      return c.slice().sort((a, b) => (count(a.s) - count(b.s)) * 0.5 + byRank(a, b))[0];
    }

    const led = this.trick[0].c.s;
    const follow = hand.some(x => x.s === led);
    const winCard = this.trick.find(t => t.p === HT.winner(this.trick)).c;
    const pts = this.trick.reduce((a, t) => a + HT.points(t.c), 0);
    const last = this.trick.length === 3;

    if (follow) {
      const qs = legal.find(HT.isQS);
      if (qs && led === 'S' && HT.rank(winCard) > 12) return qs;
      const under = legal.filter(x => HT.rank(x) < HT.rank(winCard));
      if (under.length) return highest(under);
      const nonQ = legal.filter(x => !HT.isQS(x));
      if (last && pts === 0) return highest(nonQ.length ? nonQ : legal);
      return lowest(nonQ.length ? nonQ : legal);
    }
    // void in led suit: dump danger
    const qs = legal.find(HT.isQS);
    if (qs) return qs;
    if (qsOut) {
      const bigS = legal.filter(x => x.s === 'S' && HT.rank(x) > 12);
      if (bigS.length) return highest(bigS);
    }
    const hearts = legal.filter(x => x.s === 'H');
    if (hearts.length) return highest(hearts);
    return highest(legal);
  }

  /* ---------------- rendering ---------------- */
  setMsg(t) { const m = this.$('.js-msg'); if (m) m.innerHTML = t; }

  renderSeats() {
    if (!this.players) return;
    this.players.forEach((p, i) => {
      const handPts = p.taken.reduce((a, c) => a + HT.points(c), 0);
      const txt = `${p.total} pts${handPts ? ` <em>+${handPts}</em>` : ''}`;
      if (i === 0) { const s = this.$('.js-myscore'); if (s) s.innerHTML = txt; return; }
      const seat = this.root.querySelector(`.ht-seat[data-p="${i}"]`);
      if (!seat) return;
      seat.querySelector('.js-score').innerHTML = txt;
      seat.querySelector('.js-count').textContent = p.hand.length;
      seat.classList.toggle('turn', this.phase === 'play' && this.turn === i);
    });
    const me = this.$('.ht-me');
    if (me) me.classList.toggle('turn', this.phase === 'play' && this.turn === 0);
    const br = this.$('.js-broken');
    if (br) br.innerHTML = this.broken ? `${Cards.suitIcon('H')} broken` : '';
  }

  renderHand(animate) {
    const wrap = this.$('.js-hand');
    if (!wrap) return;
    const me = this.players[0];
    const legal = this.phase === 'play' && this.turn === 0 ? this.legalFor(0) : null;
    wrap.innerHTML = '';
    me.hand.forEach((c, k) => {
      const e = Cards.el(c, true);
      if (this.selected.has(c.id)) e.classList.add('selected');
      if (this.received.has(c.id)) e.classList.add('received');
      if (legal && this.turn === 0 && this.phase === 'play') e.classList.toggle('dim', !legal.includes(c));
      if (animate) e.style.animation = `dealIn .35s ${k * 0.03}s both`;
      wrap.appendChild(e);
    });
    this.layoutHand();
  }

  layoutHand() {
    const wrap = this.$('.js-hand');
    if (!wrap || !wrap.firstChild) return;
    const n = wrap.children.length;
    const cw = wrap.firstChild.getBoundingClientRect().width || 60;
    const W = wrap.clientWidth - 8;
    const step = n > 1 ? Math.min(cw * 0.95, (W - cw) / (n - 1)) : 0;
    wrap.style.setProperty('--ov', (step - cw) + 'px');
  }

  renderControls() {
    const c = this.$('.js-controls');
    if (this.phase === 'setup') return;
    c.innerHTML = '';
    if (this.phase === 'pass') {
      c.appendChild(el(`<div class="ctrl-info">Choose 3 cards to pass ${this.pass.name} (to ${esc(this.players[(this.pass.off) % 4].name)})</div>`));
      const row = el(`<div class="btn-row"><button class="btn gold js-pass" ${this.selected.size === 3 ? '' : 'disabled'}>Pass ${this.selected.size}/3 ${this.pass.name}</button></div>`);
      c.appendChild(row);
      row.querySelector('.js-pass').onclick = () => this.doPass();
    } else if (this.phase === 'over') {
      const row = el('<div class="btn-row"><button class="btn js-lobby">Lobby</button><button class="btn gold js-again">Play again</button></div>');
      c.appendChild(row);
      row.querySelector('.js-lobby').onclick = () => App.go('lobby');
      row.querySelector('.js-again').onclick = () => this.showSetup();
    } else {
      c.appendChild(el(`<div class="ctrl-info">Hand ${this.handNo + 1} · playing to ${this.target} · pot ${money(this.stake * 4)}</div>`));
      const row = el('<div class="btn-row"><button class="btn js-scores">Scores</button></div>');
      c.appendChild(row);
      row.querySelector('.js-scores').onclick = () => {
        Sound.click();
        UI.modal({
          title: 'Scores',
          html: `<table class="score-table"><tr><th>Player</th><th>This hand</th><th>Total</th></tr>${this.players.map(p => `<tr><td>${esc(p.name)}</td><td>${p.taken.reduce((a, x) => a + HT.points(x), 0)}</td><td><b>${p.total}</b></td></tr>`).join('')}</table>`,
          buttons: [{ label: 'Close', cls: 'gold' }]
        });
      };
    }
  }
}
