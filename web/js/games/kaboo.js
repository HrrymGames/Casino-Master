/* Kaboo — memory card game against AI opponents */
'use strict';

const KB = {
  val(c) { return c.r === 13 ? (Cards.isRed(c.s) ? 20 : 0) : c.r; },
  power(c) { return c.r >= 7 && c.r <= 10 ? c.r : 0; },
  POWER_TEXT: {
    7: 'Look at one of your own cards',
    8: 'Look at one of an opponent’s cards',
    9: 'Blind swap: pick one of yours, then one of theirs',
    10: 'Look at an opponent’s card, then choose to swap'
  },
  EXPECTED: 6.8
};

class Kaboo extends GameBase {
  constructor(root) {
    super(root);
    this.phase = 'setup';
    this.opponents = 2;
    this.stake = 100;
    this.els = new Map();
    this.shown = new Set();     // card ids temporarily visible to the human
    this.lifted = new Set();    // "p:s" keys highlighted (AI peeks / swaps)
    this.snapMode = false;
    this.sel = null;
  }

  busy() { return !['setup', 'over'].includes(this.phase); }
  forfeit() { if (this.stake) Bank.record('kaboo', -this.stake, 'left the table mid-game'); }

  mount() {
    this.root.innerHTML = `<div class="screen game kb">
      ${UI.topbar('Kaboo', { rules: true })}
      <div class="stage">
        <div class="lamp"></div>
        ${UI.dealer()}
        <main class="table felt">
          <div class="kb-board js-board"></div>
        </main>
      </div>
      <footer class="controls js-controls"></footer>
    </div>`;
    this.$ = s => this.root.querySelector(s);
    this.bindTop('kaboo');
    this.$('.js-board').addEventListener('click', e => this.onBoardClick(e));
    this.showSetup();
  }

  /* ---------------- setup ---------------- */
  showSetup() {
    this.phase = 'setup';
    this.stake = Math.min(this.stake, Math.floor(Bank.balance / 10) * 10) || 0;
    this.$('.js-board').innerHTML = `<div class="setup-panel">
      <h3>New game of Kaboo</h3>
      <div class="seg-label">Opponents</div>
      <div class="seg js-opps">${[1, 2, 3].map(n => `<button class="${n === this.opponents ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div>
      <div class="seg-label">Stake each · pot</div>
      <div class="setup-stake js-stake"></div>
      <p class="setup-note">Everyone puts the stake in the pot. Lowest score takes it all.</p>
    </div>`;
    this.$('.js-opps').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      Sound.click(); this.opponents = +b.dataset.n; this.showSetup();
    };
    const c = this.$('.js-controls');
    c.innerHTML = '';
    c.appendChild(el(`<div class="ctrl-info">Choose your stake</div>`));
    this.tray = UI.chipTray((v, chip) => {
      if (this.stake + v > Bank.balance) return UI.toast('Not enough in the bank');
      this.stake += v; UI.flyChip(chip, this.$('.js-stake'), v); this.updateStake();
    });
    c.appendChild(this.tray);
    const row = el(`<div class="btn-row"><button class="btn js-clear">Clear</button><button class="btn gold js-go">Deal</button></div>`);
    c.appendChild(row);
    row.querySelector('.js-clear').onclick = () => { Sound.chip(); this.stake = 0; this.updateStake(); };
    row.querySelector('.js-go').onclick = () => this.startGame();
    this.updateStake();
  }

  updateStake() {
    const pot = this.stake * (this.opponents + 1);
    this.$('.js-stake').innerHTML = `${UI.chipStack(this.stake, 5)}<div class="pot-amt">Pot ${money(pot)}</div>`;
    UI.refreshTray(this.tray, Bank.balance - this.stake);
    const go = this.$('.js-go');
    go.disabled = this.stake < 10 || this.stake > Bank.balance;
    go.textContent = this.stake ? `Deal · ${money(this.stake)}` : 'Deal';
  }

  /* ---------------- game start ---------------- */
  async startGame() {
    if (this.stake < 10) return UI.toast('Minimum stake is £10');
    if (!Bank.take(this.stake)) return UI.toast('Not enough in the bank');
    Sound.click();
    const n = this.opponents + 1;
    const chars = UI.opponents(this.opponents);
    const me = Store.current;
    this.players = [{ name: me.name, ai: false, slots: [], char: UI.playerChar() }];
    for (let i = 1; i < n; i++) {
      const ch = chars[i - 1];
      this.players.push({
        name: ch.name, ai: true, slots: [], char: ch, mem: new Map(),
        forget: 0.03 + Math.random() * 0.06, snapSkill: 0.6 + Math.random() * 0.35, bold: 5 + Math.floor(Math.random() * 5)
      });
    }
    this.seats = { 1: ['o2'], 2: ['o1', 'o3'], 3: ['o1', 'o2', 'o3'] }[this.opponents];
    this.deck = Cards.newDeck(1);
    this.discard = [];
    this.drawn = null; this.drawnBy = null;
    this.kabooBy = null;
    this.turnsTaken = 0;
    this.pot = this.stake * n;
    this.players.forEach(p => { if (p.ai) UI.npcStake(p.name, this.stake); });
    this.els.clear(); this.shown.clear(); this.lifted.clear();
    this.sel = null; this.snapMode = false;
    this.phase = 'dealing';
    this.buildBoard();
    this.renderControls();
    await UI.dealerShuffle(this.root);

    for (let round = 0; round < 4; round++) {
      for (let p = 0; p < n; p++) {
        this.mutate(() => { this.players[p].slots.push(this.deck.pop()); });
        UI.dealerDeal(this.root, 'r', this.root.querySelector(`.kb-seat[data-p="${p}"] .kb-grid`));
        await this.wait(130);
      }
    }
    await this.wait(450);
    // AIs memorise their bottom two
    this.players.forEach((p, i) => { if (p.ai) { this.memSet(p, i, 2, p.slots[2]); this.memSet(p, i, 3, p.slots[3]); } });
    this.phase = 'peek';
    this.shown.add(this.players[0].slots[2].id);
    this.shown.add(this.players[0].slots[3].id);
    this.render();
    this.renderControls();
  }

  async finishPeek() {
    Sound.click();
    this.shown.clear();
    this.phase = 'wait';
    this.render();
    await this.wait(500);
    this.turn = randInt(this.players.length);
    UI.toast(`${esc(this.players[this.turn].name)} goes first`);
    this.startTurn();
  }

  /* ---------------- money on the table ---------------- */
  betChip() { return [...CHIPS].reverse().find(c => c.v <= this.stake) ? [...CHIPS].reverse().find(c => c.v <= this.stake).v : 10; }

  updatePlates(winners = [], share = 0) {
    this.players.forEach((p, i) => {
      const seat = this.root.querySelector(`.kb-seat[data-p="${i}"]`);
      if (!seat) return;
      seat.querySelector('.js-money').textContent = money(i === 0 ? Bank.balance : UI.npcBank(p.name));
      const bet = seat.querySelector('.js-bet');
      if (winners.length) {
        bet.classList.toggle('won', winners.includes(i));
        bet.querySelector('span').textContent = winners.includes(i) ? '+' + money(share - this.stake) : '−' + money(this.stake);
      }
    });
  }

  /* ---------------- board ---------------- */
  buildBoard() {
    const b = this.$('.js-board');
    b.className = 'kb-board js-board n' + this.players.length;
    b.innerHTML = `
      ${this.players.map((p, i) => `
        <div class="kb-seat ${i === 0 ? 'me' : 'opp'}" data-p="${i}" style="grid-area:${i === 0 ? 'me' : this.seats[i - 1]}">
          <div class="seat-head">${UI.plate(p.char, money(i === 0 ? Bank.balance : UI.npcBank(p.name)))}<div class="seat-badge"></div></div>
          <div class="seat-bet js-bet">${UI.chip(this.betChip(), 'mini')}<span>${money(this.stake)}</span></div>
          <div class="kb-grid"></div>
        </div>`).join('')}
      <div class="kb-pile" style="grid-area:pile">
        <div class="pile-spot deck js-deck"><div class="card deckback"><div class="card-inner"><div class="card-face back">${Cards.BACK}</div></div></div><span class="pile-lbl js-deckn"></span></div>
        <div class="pile-spot drawn js-drawn"><span class="pile-lbl">Drawn</span></div>
        <div class="pile-spot discard js-disc"><span class="pile-lbl">Discard</span></div>
        <div class="pot-pill"><small>POT</small>${money(this.pot)}</div>
      </div>`;
    this.$('.js-deck').onclick = () => this.humanDraw();
  }

  cardEl(c) {
    let e = this.els.get(c.id);
    if (!e) { e = Cards.el(c, false); e._new = true; this.els.set(c.id, e); }
    return e;
  }

  visible(pi, c) {
    if (this.phase === 'reveal' || this.phase === 'over') return true;
    return this.shown.has(c.id);
  }

  pickable(pi, si) {
    const p = this.players[pi];
    if (!p.slots[si]) return false;
    if (this.snapMode) return pi === 0;
    if (this.turn !== 0 || this.players[this.turn].ai) return false;
    if (this.phase === 'drawn') return pi === 0;
    if (this.phase === 'power' && this.sel) {
      const t = this.sel.type;
      if (t === 'p7' || t === 'p9a' || t === 'p10b') return pi === 0;
      if (t === 'p8' || t === 'p9b' || t === 'p10a') return pi !== 0;
    }
    return false;
  }

  slotPos(si) {
    if (si < 4) return `grid-row:${si < 2 ? 1 : 2};grid-column:${si % 2 + 1}`;
    return `grid-row:${(si % 2) + 1};grid-column:${3 + Math.floor((si - 4) / 2)}`;
  }

  render() {
    if (!this.players || this.phase === 'setup' || !this.root.querySelector('.kb-seat')) return;
    const used = new Set();
    const fresh = [];
    const place = (container, c, vis) => {
      const e = this.cardEl(c);
      used.add(c.id);
      if (e.parentNode !== container) container.appendChild(e);
      if (e._new) fresh.push([e, vis]); else Cards.flip(e, vis);
      return e;
    };
    this.players.forEach((p, pi) => {
      const seat = this.root.querySelector(`.kb-seat[data-p="${pi}"]`);
      const grid = seat.querySelector('.kb-grid');
      while (grid.children.length < p.slots.length) grid.appendChild(document.createElement('div'));
      while (grid.children.length > p.slots.length) grid.lastChild.remove();
      p.slots.forEach((c, si) => {
        const slot = grid.children[si];
        slot.className = 'kb-slot' + (c ? '' : ' empty') + (this.pickable(pi, si) ? ' pickable' : '') + (this.lifted.has(pi + ':' + si) ? ' lifted' : '');
        slot.dataset.p = pi; slot.dataset.s = si;
        slot.style.cssText = this.slotPos(si);
        const cur = slot.querySelector('.card');
        if (c) {
          const e = this.cardEl(c);
          if (cur && cur !== e) cur.remove();
          place(slot, c, this.visible(pi, c));
        } else if (cur) cur.remove();
      });
      seat.classList.toggle('turn', this.turn === pi && !['reveal', 'over', 'dealing', 'peek'].includes(this.phase));
      seat.classList.toggle('pick-seat', p.slots.some((c, si) => this.pickable(pi, si)));
      const badge = seat.querySelector('.seat-badge');
      if (this.phase === 'reveal' || this.phase === 'over') badge.innerHTML = `<b class="score">${this.score(p)} pts</b>`;
      else badge.innerHTML = this.kabooBy === pi ? '<b class="kaboo-tag">KABOO!</b>' : '';
    });
    // pile
    this.$('.js-deckn').textContent = this.deck.length;
    this.$('.js-deck').classList.toggle('pickable', this.phase === 'turn' && this.turn === 0 && !this.snapMode);
    const drawnSpot = this.$('.js-drawn');
    const curD = drawnSpot.querySelector('.card');
    if (this.drawn) {
      const e = this.cardEl(this.drawn);
      if (curD && curD !== e) curD.remove();
      place(drawnSpot, this.drawn, this.drawnBy === 0);
    } else if (curD) curD.remove();
    drawnSpot.classList.toggle('has', !!this.drawn);
    const disc = this.$('.js-disc');
    const want = this.discard.slice(-2);
    const wantIds = new Set(want.map(c => c.id));
    $$('.card', disc).forEach(e => { if (!wantIds.has(e.dataset.id)) e.remove(); });
    want.forEach((c, i) => {
      const e = this.cardEl(c);
      if (disc.querySelectorAll('.card')[i] !== e) disc.appendChild(e);
      place(disc, c, true);
    });
    disc.classList.toggle('snappable', this.snapMode);
    // drop elements no longer on the table
    for (const [id, e] of this.els) if (!used.has(id)) { this.els.delete(id); e.remove(); }
    if (this._inMutate) this._fresh = (this._fresh || []).concat(fresh);
    else fresh.forEach(([e, vis]) => { e._new = false; Cards.flip(e, vis); });
  }

  /* run a state change and animate every card that moved */
  async mutate(fn, { slow = false } = {}) {
    const before = new Map();
    for (const [id, e] of this.els) if (e.isConnected) before.set(id, e.getBoundingClientRect());
    this._inMutate = true;
    this._fresh = [];
    fn();
    this.render();
    this._inMutate = false;
    const deck = this.$('.js-deck');
    const anims = [];
    for (const [id, e] of this.els) {
      const r = before.get(id);
      if (e._new) {
        e._new = false;
        anims.push(flyFrom(e, deck, { duration: slow ? 520 : 340, scale: 1, rotate: -6 }));
        Sound.card();
      } else if (r) {
        const now = e.getBoundingClientRect();
        if (Math.abs(now.left - r.left) > 2 || Math.abs(now.top - r.top) > 2) {
          anims.push(flyFrom(e, r, { duration: slow ? 560 : 380, rotate: 0 }));
        }
      }
    }
    (this._fresh || []).forEach(([e, vis]) => setTimeout(() => Cards.flip(e, vis), 60));
    this._fresh = null;
    await Promise.all(anims);
  }

  /* ---------------- memory (AI) ---------------- */
  memSet(ai, pi, si, card) { ai.mem.set(pi + ':' + si, card); }
  memForgetAll(pi, si) { this.players.forEach(p => p.ai && p.mem.delete(pi + ':' + si)); }
  memSwapAll(a, b) {
    this.players.forEach(p => {
      if (!p.ai) return;
      const ka = a[0] + ':' + a[1], kb = b[0] + ':' + b[1];
      const va = p.mem.get(ka), vb = p.mem.get(kb);
      p.mem.delete(ka); p.mem.delete(kb);
      if (vb) p.mem.set(ka, vb);
      if (va) p.mem.set(kb, va);
    });
  }
  memPublic(pi, si, card) { this.players.forEach(p => p.ai && p.mem.set(pi + ':' + si, card)); }

  score(p) { return p.slots.reduce((a, c) => a + (c ? KB.val(c) : 0), 0); }
  top() { return this.discard[this.discard.length - 1] || null; }

  drawFromDeck() {
    if (!this.deck.length) {
      if (this.discard.length > 1) {
        const top = this.discard.pop();
        this.deck = shuffle(this.discard);
        this.discard = [top];
        UI.toast('Discard pile reshuffled into the deck');
      } else return null;
    }
    return this.deck.pop();
  }

  async pushDiscard(card) {
    this.discard.push(card);
    this.scheduleAISnaps();
  }

  /* ---------------- turn flow ---------------- */
  startTurn() {
    if (!this.alive || this.phase === 'reveal' || this.phase === 'over') return;
    if (this.kabooBy !== null && this.turn === this.kabooBy) return this.reveal();
    const p = this.players[this.turn];
    this.sel = null;
    if (p.ai) {
      this.phase = 'ai';
      this.render();
      this.renderControls();
      this.aiTurn(this.turn);
    } else {
      this.phase = 'turn';
      this.render();
      this.renderControls();
      Native.haptic('light');
    }
  }

  endTurn() {
    if (this.phase === 'reveal' || this.phase === 'over') return;
    this.drawn = null; this.drawnBy = null;
    this.sel = null;
    this.turnsTaken++;
    this.turn = (this.turn + 1) % this.players.length;
    this.phase = 'wait';
    this.render();
    this.renderControls();
    this.later(450, () => this.startTurn());
  }

  get firstRoundDone() { return this.turnsTaken >= this.players.length; }

  callKaboo(pi) {
    this.kabooBy = pi;
    Sound.kaboo();
    Native.haptic('heavy');
    UI.banner(`${esc(this.players[pi].name)} calls KABOO!`, 'gold', 1500);
    this.render();
  }

  /* ---------------- human actions ---------------- */
  async humanDraw() {
    if (this.phase !== 'turn' || this.turn !== 0 || this.snapMode) return;
    const c = this.drawFromDeck();
    if (!c) return this.reveal();
    Sound.click();
    UI.dealerDeal(this.root, 'r');
    this.phase = 'busy';
    this.renderControls();
    await this.mutate(() => { this.drawn = c; this.drawnBy = 0; this.shown.add(c.id); });
    if (this.phase !== 'busy') return;
    this.phase = 'drawn';
    this.render();
    this.renderControls();
  }

  async humanPlaceDown() {
    if (this.phase !== 'drawn' || !this.drawn) return;
    const c = this.drawn;
    Sound.click();
    this.phase = 'busy';
    this.renderControls();
    await this.mutate(() => { this.drawn = null; this.shown.delete(c.id); this.pushDiscard(c); });
    const pw = KB.power(c);
    const anyOpp = this.players.some((p, i) => i && p.slots.some(Boolean));
    const anyMine = this.players[0].slots.some(Boolean);
    if (pw && ((pw === 7 && anyMine) || (pw === 8 && anyOpp) || (pw >= 9 && anyOpp && (pw === 10 || anyMine)))) {
      this.phase = 'power';
      this.sel = { type: { 7: 'p7', 8: 'p8', 9: 'p9a', 10: 'p10a' }[pw] };
      this.render();
      this.renderControls();
    } else this.endTurn();
  }

  async onBoardClick(e) {
    const slot = e.target.closest('.kb-slot');
    if (slot && slot.classList.contains('pickable')) {
      const pi = +slot.dataset.p, si = +slot.dataset.s;
      Native.haptic('light');
      if (this.snapMode) return this.humanSnap(si);
      if (this.phase === 'drawn') return this.humanReplace(si);
      if (this.phase === 'power') return this.powerPick(pi, si);
    } else if (slot && this.snapMode) {
      UI.toast('Tap one of <b>your</b> cards to snap');
    } else if (e.target.closest('.js-disc') && this.snapMode) {
      UI.toast('Now tap the card of yours that matches');
    }
  }

  async humanReplace(si) {
    const me = this.players[0];
    const old = me.slots[si];
    const c = this.drawn;
    if (!old || !c) return;
    Sound.click();
    this.phase = 'busy';
    this.renderControls();
    this.memForgetAll(0, si);
    await this.mutate(() => {
      me.slots[si] = c;
      this.drawn = null;
      this.shown.delete(c.id);
      this.pushDiscard(old);
    });
    this.endTurn();
  }

  async peekFor(cardIds, ms = 2600) {
    cardIds.forEach(id => this.shown.add(id));
    this.render();
    await this.wait(ms);
    cardIds.forEach(id => this.shown.delete(id));
    this.render();
    await this.wait(350);
  }

  async powerPick(pi, si) {
    const t = this.sel && this.sel.type;
    const card = this.players[pi].slots[si];
    if (!card) return;
    Sound.click();
    if (t === 'p7' || t === 'p8') {
      this.sel = null; this.phase = 'busy'; this.renderControls();
      await this.peekFor([card.id]);
      return this.endTurn();
    }
    if (t === 'p9a') {
      this.sel = { type: 'p9b', mine: si };
      this.lifted.add('0:' + si);
      this.render(); this.renderControls();
      return;
    }
    if (t === 'p9b') {
      const mine = this.sel.mine;
      this.sel = null; this.phase = 'busy'; this.renderControls();
      await this.doSwap([0, mine], [pi, si]);
      return this.endTurn();
    }
    if (t === 'p10a') {
      this.sel = { type: 'p10look', opp: [pi, si] };
      this.shown.add(card.id);
      this.lifted.add(pi + ':' + si);
      this.render(); this.renderControls();
      return;
    }
    if (t === 'p10b') {
      const [opi, osi] = this.sel.opp;
      const oc = this.players[opi].slots[osi];
      this.sel = null; this.phase = 'busy'; this.renderControls();
      if (oc) this.shown.delete(oc.id);
      this.lifted.clear();
      if (oc) await this.doSwap([0, si], [opi, osi]);
      return this.endTurn();
    }
  }

  async tenDecision(swap) {
    if (!this.sel || this.sel.type !== 'p10look') return;
    Sound.click();
    if (swap) {
      if (!this.players[0].slots.some(Boolean)) return UI.toast('You have no cards to swap');
      this.sel = { type: 'p10b', opp: this.sel.opp };
      this.render(); this.renderControls();
    } else {
      const [opi, osi] = this.sel.opp;
      const oc = this.players[opi].slots[osi];
      if (oc) this.shown.delete(oc.id);
      this.lifted.clear();
      this.sel = null; this.phase = 'busy';
      this.render(); this.renderControls();
      await this.wait(300);
      this.endTurn();
    }
  }

  async skipPower() {
    if (this.phase !== 'power') return;
    Sound.click();
    if (this.sel && this.sel.opp) {
      const oc = this.players[this.sel.opp[0]].slots[this.sel.opp[1]];
      if (oc) this.shown.delete(oc.id);
    }
    this.lifted.clear();
    this.sel = null;
    this.endTurn();
  }

  async doSwap(a, b) {
    const pa = this.players[a[0]], pb = this.players[b[0]];
    if (!pa.slots[a[1]] || !pb.slots[b[1]]) return;
    this.lifted.add(a.join(':')); this.lifted.add(b.join(':'));
    this.memSwapAll(a, b);
    Sound.card();
    await this.mutate(() => {
      const t = pa.slots[a[1]];
      pa.slots[a[1]] = pb.slots[b[1]];
      pb.slots[b[1]] = t;
    }, { slow: true });
    await this.wait(700);
    this.lifted.delete(a.join(':')); this.lifted.delete(b.join(':'));
    this.render();
  }

  toggleSnap() {
    if (!this.canSnap()) return;
    this.snapMode = !this.snapMode;
    Sound.click();
    this.render();
    this.renderControls();
  }

  canSnap() {
    return ['turn', 'drawn', 'power', 'ai', 'wait', 'busy'].includes(this.phase) && this.top() && this.players[0].slots.some(Boolean);
  }

  async humanSnap(si) {
    this.snapMode = false;
    await this.attemptSnap(0, si);
    this.renderControls();
  }

  async attemptSnap(pi, si) {
    const p = this.players[pi];
    const c = p.slots[si];
    const top = this.top();
    if (!c || !top || this.phase === 'reveal' || this.phase === 'over') return false;
    if (c.r === top.r) {
      this.memForgetAll(pi, si);
      Sound.chip();
      UI.toast(`${pi === 0 ? 'You' : esc(p.name)} snapped ${Cards.label(c)}!`);
      await this.mutate(() => { p.slots[si] = null; this.pushDiscard(c); });
      if (pi === 0) Native.haptic('success');
      return true;
    }
    // wrong: card is shown to everyone, then a penalty card
    Sound.error();
    if (pi === 0) Native.haptic('heavy');
    UI.toast(`${pi === 0 ? 'Wrong!' : esc(p.name) + ' snapped wrong!'} ${Cards.label(c)} isn’t a ${Cards.rankLabel(top.r)} — penalty card`);
    this.memPublic(pi, si, c);
    this.lifted.add(pi + ':' + si);
    await this.peekFor([c.id], 1500);
    this.lifted.delete(pi + ':' + si);
    if (['setup', 'reveal', 'over'].includes(this.phase) || this.players[pi] !== p) return false;
    const pen = this.drawFromDeck();
    if (pen) await this.mutate(() => { p.slots.push(pen); });
    return false;
  }

  /* ---------------- AI ---------------- */
  known(ai, pi, si) { return ai.mem.get(pi + ':' + si) || null; }

  scheduleAISnaps() {
    const top = this.top();
    if (!top) return;
    this.players.forEach((p, pi) => {
      if (!p.ai) return;
      const matches = p.slots.map((c, si) => [c, si]).filter(([c, si]) => c && (this.known(p, pi, si) || {}).r === top.r);
      if (!matches.length || !chance(p.snapSkill)) return;
      const si = matches[0][1];
      this.later(650 + randInt(1600), () => {
        const t = this.top();
        if (!t || t.r !== top.r || !p.slots[si] || ['reveal', 'over'].includes(this.phase)) return;
        if ((this.known(p, pi, si) || {}).r !== t.r) return;
        this.attemptSnap(pi, si);
      });
    });
  }

  aiEstimate(p, pi) {
    let sum = 0, unknown = 0, n = 0;
    p.slots.forEach((c, si) => {
      if (!c) return;
      n++;
      const k = this.known(p, pi, si);
      if (k) sum += KB.val(k); else { unknown++; sum += KB.EXPECTED; }
    });
    return { sum, unknown, n };
  }

  aiHighestKnown(p, pi) {
    let best = null;
    p.slots.forEach((c, si) => {
      if (!c) return;
      const k = this.known(p, pi, si);
      if (k && (!best || KB.val(k) > best.v)) best = { si, v: KB.val(k) };
    });
    return best;
  }

  aiUnknownSlots(p, pi) {
    return p.slots.map((c, si) => (c && !this.known(p, pi, si) ? si : -1)).filter(si => si >= 0);
  }

  async aiTurn(pi) {
    const p = this.players[pi];
    // a little forgetfulness
    for (const k of Array.from(p.mem.keys())) if (chance(p.forget)) p.mem.delete(k);
    await this.wait(650 + randInt(500));
    if (this.phase !== 'ai' || this.turn !== pi) return;

    const est = this.aiEstimate(p, pi);
    if (this.kabooBy === null && this.firstRoundDone &&
        (est.n === 0 || (est.unknown <= 1 && est.sum <= p.bold) || est.sum <= 3)) {
      this.callKaboo(pi);
      await this.wait(1300);
    }

    const c = this.drawFromDeck();
    if (!c) return this.reveal();
    UI.dealerDeal(this.root, 'l');
    await this.mutate(() => { this.drawn = c; this.drawnBy = pi; });
    await this.wait(700 + randInt(500));
    if (this.phase !== 'ai') return;

    const v = KB.val(c);
    const pw = KB.power(c);
    const hk = this.aiHighestKnown(p, pi);
    const unknown = this.aiUnknownSlots(p, pi);
    let target = -1;
    if (hk && hk.v - v >= (pw ? 4 : 2)) target = hk.si;
    else if (unknown.length && v <= 4) target = pick(unknown);
    else if (!hk && !unknown.length) target = -1;

    if (target >= 0 && p.slots[target]) {
      const old = p.slots[target];
      this.memForgetAll(pi, target);
      this.memSet(p, pi, target, c);
      await this.mutate(() => { p.slots[target] = c; this.drawn = null; this.pushDiscard(old); });
      UI.toast(`${esc(p.name)} swapped a card in`);
    } else {
      await this.mutate(() => { this.drawn = null; this.pushDiscard(c); });
      if (pw) await this.aiPower(pi, pw);
    }
    if (this.phase !== 'ai') return;
    await this.wait(300);
    this.endTurn();
  }

  oppSlots(pi) {
    const out = [];
    this.players.forEach((q, qi) => { if (qi !== pi) q.slots.forEach((c, si) => { if (c) out.push([qi, si]); }); });
    return out;
  }

  async aiLift(key, ms = 1100) {
    this.lifted.add(key);
    this.render();
    await this.wait(ms);
    this.lifted.delete(key);
    this.render();
  }

  async aiPower(pi, pw) {
    const p = this.players[pi];
    const opps = this.oppSlots(pi);
    if (pw === 7) {
      const u = this.aiUnknownSlots(p, pi);
      if (!u.length) return;
      const si = pick(u);
      UI.toast(`${esc(p.name)} peeks at their own card`);
      this.memSet(p, pi, si, p.slots[si]);
      await this.aiLift(pi + ':' + si);
    } else if (pw === 8) {
      if (!opps.length) return;
      const unknownOpp = opps.filter(([qi, si]) => !this.known(p, qi, si));
      const [qi, si] = pick(unknownOpp.length ? unknownOpp : opps);
      UI.toast(`${esc(p.name)} peeks at ${qi === 0 ? 'one of your cards' : esc(this.players[qi].name) + '’s card'}`);
      this.memSet(p, qi, si, this.players[qi].slots[si]);
      await this.aiLift(qi + ':' + si);
    } else if (pw === 9) {
      const hk = this.aiHighestKnown(p, pi);
      if (!hk || hk.v < 7 || !opps.length) return;
      const knownLow = opps.filter(([qi, si]) => { const k = this.known(p, qi, si); return k && KB.val(k) < hk.v - 2; })
        .sort((a, b) => KB.val(this.known(p, a[0], a[1])) - KB.val(this.known(p, b[0], b[1])));
      const unknownOpp = opps.filter(([qi, si]) => !this.known(p, qi, si));
      const tgt = knownLow[0] || (hk.v >= 9 && unknownOpp.length ? pick(unknownOpp) : null);
      if (!tgt) return;
      UI.toast(`${esc(p.name)} blind-swaps with ${tgt[0] === 0 ? 'you' : esc(this.players[tgt[0]].name)}!`);
      await this.doSwap([pi, hk.si], tgt);
    } else if (pw === 10) {
      if (!opps.length) return;
      const unknownOpp = opps.filter(([qi, si]) => !this.known(p, qi, si));
      const [qi, si] = pick(unknownOpp.length ? unknownOpp : opps);
      const oc = this.players[qi].slots[si];
      this.memSet(p, qi, si, oc);
      UI.toast(`${esc(p.name)} looks at ${qi === 0 ? 'one of your cards' : esc(this.players[qi].name) + '’s card'}`);
      await this.aiLift(qi + ':' + si, 900);
      const hk = this.aiHighestKnown(p, pi);
      const unknownMine = this.aiUnknownSlots(p, pi);
      let mine = -1, mineV = 0;
      if (hk) { mine = hk.si; mineV = hk.v; }
      if (unknownMine.length && KB.EXPECTED > mineV) { mine = pick(unknownMine); mineV = KB.EXPECTED; }
      if (mine >= 0 && oc && KB.val(oc) < mineV - 2) {
        UI.toast(`${esc(p.name)} takes it!`);
        await this.doSwap([pi, mine], [qi, si]);
      }
    }
  }

  /* ---------------- end of game ---------------- */
  async reveal() {
    if (this.phase === 'reveal' || this.phase === 'over') return;
    this.phase = 'reveal';
    this.snapMode = false;
    this.sel = null;
    this.drawn = null;
    this.shown.clear(); this.lifted.clear();
    this.renderControls();
    UI.banner('Cards up!', '', 1000);
    this.render();
    await this.wait(1600);
    const scores = this.players.map(p => this.score(p));
    const best = Math.min(...scores);
    const winners = this.players.map((p, i) => i).filter(i => scores[i] === best);
    const share = round2(this.pot / winners.length);
    const iWon = winners.includes(0);
    if (iWon) Bank.give(share);
    winners.forEach(w => { if (this.players[w].ai) UI.npcAdjust(this.players[w].name, share); });
    this.updatePlates(winners, share);
    const net = round2((iWon ? share : 0) - this.stake);
    Bank.record('kaboo', net, `scored ${scores[0]} (best ${best}) · ${this.players.length} players`);
    this.phase = 'over';
    this.render();
    this.renderControls();
    if (iWon) { Sound.bigWin(); Native.haptic('success'); } else Sound.lose();
    const rows = this.players.map((p, i) => ({ p, s: scores[i], i })).sort((a, b) => a.s - b.s)
      .map(r => `<tr class="${winners.includes(r.i) ? 'win' : ''}"><td>${winners.includes(r.i) ? '★ ' : ''}${esc(r.p.name)}${this.kabooBy === r.i ? ' <small>(called)</small>' : ''}</td><td>${r.s}</td></tr>`).join('');
    const res = await UI.modal({
      title: iWon ? (winners.length > 1 ? 'Split pot!' : 'You win!') : `${esc(this.players[winners[0]].name)} wins`,
      html: `<table class="score-table"><tr><th>Player</th><th>Points</th></tr>${rows}</table>
        <p class="result-line ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${money(net)}</p>`,
      buttons: [{ label: 'Lobby', value: 'lobby' }, { label: 'Table', value: 'look' }, { label: 'Play again', cls: 'gold', value: 'again' }]
    });
    if (res === 'lobby') App.go('lobby');
    else if (res === 'again') this.showSetup();
    else this.renderControls();
  }

  /* ---------------- controls ---------------- */
  renderControls() {
    const c = this.$('.js-controls');
    if (this.phase === 'setup') return;
    c.innerHTML = '';
    let info = '';
    const btns = [];
    const snapBtn = `<button class="btn ${this.snapMode ? 'red' : ''} js-snap" ${this.canSnap() ? '' : 'disabled'}>${this.snapMode ? 'Cancel' : 'Snap!'}</button>`;
    switch (this.phase) {
      case 'dealing': info = 'Dealing…'; break;
      case 'peek':
        info = 'Memorise your bottom two cards — you won’t see them again!';
        btns.push('<button class="btn gold js-ready">I’ve memorised them</button>');
        break;
      case 'turn':
        info = this.snapMode ? 'Tap your card that matches the discard pile' : 'Your turn — tap the deck to draw';
        btns.push(snapBtn);
        if (this.kabooBy === null) btns.push(`<button class="btn red js-kaboo" ${this.firstRoundDone ? '' : 'disabled'}>Kaboo!</button>`);
        btns.push('<button class="btn gold js-draw">Draw</button>');
        break;
      case 'drawn':
        info = this.snapMode ? 'Tap your card that matches the discard pile' :
          `You drew ${Cards.label(this.drawn)}${KB.power(this.drawn) ? ` <i>(${KB.POWER_TEXT[KB.power(this.drawn)]} if placed down)</i>` : ''}. Place it down, or tap one of your cards to swap.`;
        btns.push(snapBtn, '<button class="btn gold js-place">Place down</button>');
        break;
      case 'power': {
        const t = this.sel && this.sel.type;
        info = this.snapMode ? 'Tap your card that matches the discard pile' : {
          p7: 'Power 7 — tap one of your cards to look at it',
          p8: 'Power 8 — tap an opponent’s card to look at it',
          p9a: 'Power 9 — tap one of YOUR cards to swap…',
          p9b: '…now tap an opponent’s card to swap with',
          p10a: 'Power 10 — tap an opponent’s card to look at it',
          p10look: 'Swap it with one of yours?',
          p10b: 'Tap one of your cards to swap with it'
        }[t] || '';
        if (t === 'p10look') btns.push('<button class="btn js-keep">Leave it</button>', '<button class="btn gold js-swap10">Swap</button>');
        else btns.push(snapBtn, '<button class="btn js-skip">Skip</button>');
        break;
      }
      case 'ai':
      case 'wait':
      case 'busy':
        info = this.snapMode ? 'Tap your card that matches the discard pile' :
          (this.phase === 'ai' ? `${esc(this.players[this.turn].name)}’s turn…` : '…');
        btns.push(snapBtn);
        break;
      case 'reveal': info = 'Revealing…'; break;
      case 'over':
        info = 'Game over';
        btns.push('<button class="btn js-lobby">Lobby</button>', '<button class="btn gold js-again">Play again</button>');
        break;
    }
    if (this.kabooBy !== null && !['over', 'reveal'].includes(this.phase)) info = `<span class="kaboo-tag">KABOO</span> called by ${this.kabooBy === 0 ? 'you' : esc(this.players[this.kabooBy].name)} · ` + info;
    c.appendChild(el(`<div class="ctrl-info kb-info"><span>${info}</span></div>`));
    if (btns.length) c.appendChild(el(`<div class="btn-row">${btns.join('')}</div>`));
    const on = (sel, fn) => { const b = c.querySelector(sel); if (b) b.onclick = fn; };
    on('.js-ready', () => this.finishPeek());
    on('.js-snap', () => this.toggleSnap());
    on('.js-draw', () => this.humanDraw());
    on('.js-kaboo', () => { if (this.phase === 'turn' && this.kabooBy === null && this.firstRoundDone) { this.callKaboo(0); this.renderControls(); } });
    on('.js-place', () => this.humanPlaceDown());
    on('.js-skip', () => this.skipPower());
    on('.js-keep', () => this.tenDecision(false));
    on('.js-swap10', () => this.tenDecision(true));
    on('.js-lobby', () => App.go('lobby'));
    on('.js-again', () => this.showSetup());
  }
}
