/* Shared UI: top bar, chips, modals, banners, dealer & avatar artwork */
'use strict';

const ICONS = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.2" fill="currentColor" stroke="none"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'
};

const CHIPS = [
  { v: 10, c: '#2a62c4' },
  { v: 25, c: '#2b8a48' },
  { v: 100, c: '#202024' },
  { v: 500, c: '#6c2fa6' },
  { v: 1000, c: '#d8a31f' },
  { v: 5000, c: '#d1492a' },
  { v: 25000, c: '#c0185d' }
];

const UI = {
  icons: ICONS,

  topbar(title, opts = {}) {
    return `<header class="topbar">
      <button class="tb-btn js-back" aria-label="Back">${ICONS.back}</button>
      <div class="tb-title">${title}</div>
      <div class="tb-bal"><span class="tb-lbl">Bank</span><span class="js-balance">${money(Bank.balance)}</span></div>
      ${opts.rules ? `<button class="tb-btn js-rules" aria-label="Rules">${ICONS.info}</button>` : ''}
      <button class="tb-btn js-sound" aria-label="Sound">${Store.data.settings.sound ? ICONS.soundOn : ICONS.soundOff}</button>
    </header>`;
  },

  /* wires the standard top bar buttons */
  bindTopbar(root, { onBack, rules }) {
    root.querySelector('.js-back').addEventListener('click', () => { Sound.click(); onBack(); });
    const r = root.querySelector('.js-rules');
    if (r && rules) r.addEventListener('click', () => { Sound.click(); UI.modal({ title: rules.title, html: `<div class="rules">${rules.html}</div>`, buttons: [{ label: 'Got it', cls: 'gold' }] }); });
    const s = root.querySelector('.js-sound');
    s.addEventListener('click', () => {
      Store.setting('sound', !Store.data.settings.sound);
      s.innerHTML = Store.data.settings.sound ? ICONS.soundOn : ICONS.soundOff;
      Sound.click();
    });
  },

  updateBalance() {
    const b = Bank.balance;
    $$('.js-balance').forEach(e => {
      const old = parseFloat(e.dataset.v || b);
      e.textContent = money(b);
      e.dataset.v = b;
      if (b !== old) {
        e.classList.remove('up', 'down');
        void e.offsetWidth;
        e.classList.add(b > old ? 'up' : 'down');
      }
    });
  },

  chip(v, extra = '', style = '') {
    const c = CHIPS.find(x => x.v === v) || CHIPS[0];
    return `<div class="chip ${extra}" style="--chip:${c.c};${style}" data-v="${v}"><span>${shortMoney(v)}</span></div>`;
  },

  /* break an amount into a little stack of chips */
  chipStack(amount, max = 6) {
    if (amount <= 0) return '';
    let left = amount;
    const chips = [];
    for (let i = CHIPS.length - 1; i >= 0 && chips.length < max; i--) {
      while (left >= CHIPS[i].v && chips.length < max) { chips.push(CHIPS[i].v); left -= CHIPS[i].v; }
    }
    if (!chips.length) chips.push(10);
    return `<div class="chip-stack">${chips.reverse().map((v, i) => UI.chip(v, 'stacked', `--i:${i}`)).join('')}<div class="stack-amt">${money(amount)}</div></div>`;
  },

  chipTray(onChip) {
    const tray = el(`<div class="chip-tray">${CHIPS.map(c => UI.chip(c.v)).join('')}</div>`);
    tray.addEventListener('click', e => {
      const ch = e.target.closest('.chip');
      if (!ch || ch.classList.contains('disabled')) { if (ch) { Sound.error(); UI.toast('Not enough in the bank'); } return; }
      Sound.chip();
      Native.haptic('light');
      ch.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], { duration: 180 });
      onChip(+ch.dataset.v, ch);
    });
    return tray;
  },

  refreshTray(tray, available) {
    $$('.chip', tray).forEach(c => c.classList.toggle('disabled', +c.dataset.v > available + 1e-9));
  },

  /* flying chip from tray to a target */
  flyChip(fromEl, toEl, v) {
    if (!fromEl || !toEl) return;
    const c = el(UI.chip(v, 'flying'));
    document.body.appendChild(c);
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    c.style.left = a.left + 'px'; c.style.top = a.top + 'px';
    c.style.width = a.width + 'px'; c.style.height = a.height + 'px';
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    c.animate([{ transform: 'none' }, { transform: `translate(${dx}px,${dy}px) scale(.8)` }], { duration: 320, easing: 'cubic-bezier(.3,.7,.3,1)' })
      .finished.then(() => c.remove(), () => c.remove());
  },

  modal({ title = '', html = '', buttons = [{ label: 'OK', cls: 'gold' }], cls = '', onMount, dismissable = false }) {
    return new Promise(resolve => {
      const ov = $('#overlay');
      const m = el(`<div class="modal-wrap ${cls}"><div class="modal">
        ${title ? `<h2 class="modal-title">${title}</h2>` : ''}
        <div class="modal-body">${html}</div>
        <div class="modal-btns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>
      </div></div>`);
      ov.appendChild(m);
      requestAnimationFrame(() => m.classList.add('show'));
      const close = val => {
        m.classList.remove('show');
        setTimeout(() => m.remove(), 220);
        resolve(val);
      };
      m.querySelector('.modal-btns').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        Sound.click();
        const def = buttons[+b.dataset.i];
        if (def.validate && !def.validate(m)) return;
        close(def.value !== undefined ? def.value : +b.dataset.i);
      });
      if (dismissable) m.addEventListener('click', e => { if (e.target === m) close(null); });
      if (onMount) onMount(m, close);
    });
  },

  confirm(title, html, yes = 'Yes', no = 'Cancel') {
    return UI.modal({ title, html: `<p>${html}</p>`, buttons: [{ label: no, value: false }, { label: yes, cls: 'gold', value: true }] });
  },

  banner(text, kind = '', ms = 1400) {
    const b = el(`<div class="banner ${kind}"><span>${text}</span></div>`);
    $('#overlay').appendChild(b);
    setTimeout(() => b.classList.add('out'), ms);
    setTimeout(() => b.remove(), ms + 400);
  },

  toast(text, ms = 1800) {
    const t = $('#toast');
    t.innerHTML = text;
    t.classList.add('show');
    clearTimeout(UI._tt);
    UI._tt = setTimeout(() => t.classList.remove('show'), ms);
  },

  /* ---------- artwork (see art.js) ---------- */
  dealer(key = null) {
    const photo = Store.data && Store.data.settings.dealerPhoto;
    const deck = `<div class="dp-deck"><div class="card deckback"><div class="card-inner"><div class="card-face back">${Cards.BACK}</div></div></div></div>`;
    const inner = photo
      ? `<img src="${photo}" alt="">`
      : `<label class="dp-pick">Tap to choose your dealer photo<input type="file" accept="image/*" class="js-dealer-file" hidden></label>`;
    return `<div class="dealer photo-dealer ${photo ? '' : 'empty'}"><div class="dp-frame">${inner}</div>${deck}</div>`;
  },

  /* choose the dealer photo from anywhere (lobby or at a table) */
  async setDealerPhoto(file) {
    try {
      Store.setting('dealerPhoto', await Art.dealerPhoto(file));
      $$('.photo-dealer').forEach(d => { d.outerHTML = UI.dealer(); });
      UI.toast('Dealer set');
      return true;
    } catch (err) { UI.toast('Couldn\u2019t read that photo'); return false; }
  },

  /* the dealing hand reaches towards `target` (an element) and comes back */
  dealerDeal(root, side = 'r', target = null) {
    const pd = root && root.querySelector('.photo-dealer');
    if (pd) {
      // photo dealer: lean towards the card and flick the deck
      let dx = 0;
      if (target && target.getBoundingClientRect) {
        const a = pd.getBoundingClientRect(), b = target.getBoundingClientRect();
        dx = Math.max(-14, Math.min(14, ((b.left + b.width / 2) - (a.left + a.width / 2)) * 0.06));
      }
      pd.querySelector('.dp-frame').animate([{ transform: 'none' }, { transform: `translate(${dx}px, 5px) rotate(${dx * 0.15}deg) scale(1.02)`, offset: 0.4 }, { transform: 'none' }], { duration: 380, easing: 'ease-out' });
      pd.querySelector('.dp-deck').animate([{ transform: 'none' }, { transform: `translate(${dx * 1.6}px, 10px) rotate(${dx * 0.6}deg)`, offset: 0.4 }, { transform: 'none' }], { duration: 380, easing: 'ease-out' });
      return;
    }
    const h = root && root.querySelector('.dealer .hand-' + side);
    if (!h) return;
    let dx = side === 'r' ? -12 : 12, dy = 26;
    if (target && target.getBoundingClientRect) {
      const a = h.getBoundingClientRect(), b = target.getBoundingClientRect();
      dx = ((b.left + b.width / 2) - (a.left + a.width / 2)) * 0.32;
      dy = Math.max(10, ((b.top + b.height / 2) - (a.top + a.height / 2)) * 0.32);
    }
    const rot = dx < 0 ? 12 : -12;
    h.animate([
      { transform: 'none' },
      { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, offset: 0.45 },
      { transform: 'none' }
    ], { duration: 420, easing: 'cubic-bezier(.3,.6,.3,1)' });
  },

  /* where dealt cards come from: the deck in the dealer's hand, or a fallback */
  deckSource(root, fallback) {
    return (root && (root.querySelector('.dealer .dp-deck') || root.querySelector('.dealer .hand-l'))) || fallback;
  },

  /* riffle shuffle: hands come together a few times */
  dealerShuffle(root) {
    const deck = root && root.querySelector('.dealer .dp-deck');
    if (deck) {
      [0, 260, 520].forEach(t => setTimeout(() => Sound.card(), t));
      return deck.animate([{ transform: 'none' }, { transform: 'translateX(-10px) rotate(-8deg)' }, { transform: 'translateX(10px) rotate(8deg)' }, { transform: 'none' }],
        { duration: 260, iterations: 3 }).finished.catch(() => {});
    }
    const l = root && root.querySelector('.dealer .hand-l');
    const r = root && root.querySelector('.dealer .hand-r');
    if (!l || !r) return Promise.resolve();
    Sound.flip();
    const kf = d => [{ transform: 'none' }, { transform: `translate(${d}px, 6px) rotate(${d > 0 ? -8 : 8}deg)` }, { transform: 'none' }];
    const opt = { duration: 300, iterations: 3, easing: 'ease-in-out' };
    [0, 300, 600].forEach(t => setTimeout(() => Sound.card(), t));
    l.animate(kf(18), opt);
    return r.animate(kf(-18), opt).finished.catch(() => {});
  },

  /* the dealer pushes chips to a player */
  payChips(root, target, amount) {
    const h = root && root.querySelector('.dealer .hand-r');
    if (!h || !target || amount <= 0) return;
    UI.dealerDeal(root, 'r', target);
    const vals = [...CHIPS].reverse().filter(c => c.v <= Math.max(10, amount)).slice(0, 3).map(c => c.v);
    vals.forEach((v, i) => setTimeout(() => { UI.flyChip(h, target, v); Sound.chip(); }, 120 + i * 110));
  },

  avatar(p, extra = '') {
    return `<div class="avatar ${extra}">${p.photo ? `<img src="${p.photo}" alt="">` : Art.icon(p)}</div>`;
  },

  plate(p, money, extra = '') {
    return `<div class="plate ${extra}">${UI.avatar(p, 'round')}
      <div class="plate-box"><div class="plate-name">${esc(p.name)}</div><div class="plate-money js-money">${money}</div></div></div>`;
  },

  /* computer players keep their own bankrolls inside each save */
  npcBank(name) {
    const s = Store.current;
    if (!s) return 10000;
    s.npc = s.npc || {};
    if (s.npc[name] == null) s.npc[name] = 3000 + randInt(48) * 1000;
    return s.npc[name];
  },
  npcAdjust(name, delta) {
    const s = Store.current;
    if (!s) return;
    UI.npcBank(name);
    s.npc[name] = round2(s.npc[name] + delta);
    Store.persist();
  },
  /* make sure a computer player can cover a stake (they "rebuy" if broke) */
  npcStake(name, stake) {
    if (UI.npcBank(name) < stake) UI.npcAdjust(name, 10000);
    UI.npcAdjust(name, -stake);
  },

  /* character picker: resolves { avatar, photo } or null if cancelled */
  async pickCharacter(current = {}) {
    let sel = current.avatar === 1 ? 1 : 0;
    let photo = current.photo || null;
    const opts = [0, 1];
    const tiles = () => opts.map(i => `<button class="ap ${!photo && sel === i ? 'on' : ''}" data-i="${i}">${Art.icon(CHARACTERS[i])}<span>${i ? 'Her' : 'Him'}</span></button>`).join('')
      + `<label class="ap photo ${photo ? 'on' : ''}"><input type="file" accept="image/*" class="js-file">${photo ? `<img src="${photo}" alt="">` : '<b>+</b>'}<span>${photo ? 'Your photo' : 'Use a photo'}</span></label>`;
    const ok = await UI.modal({
      title: 'Choose your look',
      html: `<p class="setup-note">Pick an icon, or use a photo &mdash; it gets turned into poster-style art. Only use photos of people who are happy for you to.</p><div class="avatar-pick js-pick">${tiles()}</div>`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'Done', cls: 'gold', value: true }],
      onMount: m => {
        const box = m.querySelector('.js-pick');
        box.addEventListener('click', e => {
          const b = e.target.closest('button.ap');
          if (!b) return;
          sel = +b.dataset.i; photo = null; Sound.click();
          box.innerHTML = tiles();
        });
        box.addEventListener('change', async e => {
          const f = e.target.files && e.target.files[0];
          if (!f) return;
          UI.toast('Painting your portrait…', 4000);
          try { photo = await Art.posterize(f); box.innerHTML = tiles(); UI.toast('Looking sharp'); }
          catch (err) { UI.toast('Couldn\u2019t read that photo'); }
        });
      }
    });
    return ok ? { avatar: sel, photo } : null;
  },

  /* the character the player picked for the current save */
  playerChar() {
    const s = Store.current;
    const i = s && Number.isInteger(s.avatar) ? s.avatar : 0;
    return Object.assign({}, CHARACTERS[i] || CHARACTERS[0], { name: s ? s.name : 'You', photo: s && s.photo || null });
  },

  /* opponents, never the same face as the player */
  opponents(n) {
    return shuffle(CHARACTERS.slice()).slice(0, n);
  }

};

/* Rules text shared by the lobby and in-game info buttons */
const RULES = {
  blackjack: {
    title: 'Blackjack',
    html: `<p>Beat the dealer by getting closer to 21 without going over.</p>
      <ul><li>Six-deck shoe. Blackjack pays <b>3 to 2</b>.</li>
      <li>Dealer stands on all 17s and peeks for blackjack.</li>
      <li><b>Double</b> on any first two cards (also after a split).</li>
      <li><b>Split</b> pairs up to 4 hands. Split aces get one card each.</li>
      <li><b>Surrender</b> gives up half your bet before you act.</li>
      <li><b>Insurance</b> pays 2 to 1 when the dealer shows an ace.</li></ul>
      <p>Table limits £10 – £25,000.</p>`
  },
  kaboo: {
    title: 'Kaboo',
    html: `<p>A memory game. Lowest points wins the pot.</p>
      <ul><li>Everyone gets <b>4 face-down cards</b>. At the start you may look at your <b>bottom two</b> once — memorise them!</li>
      <li>On your turn draw from the deck. Either <b>place it down</b> on the discard pile, or <b>swap</b> it with one of your face-down cards (the old card is placed down).</li>
      <li>Powers only work when a card is placed down <b>straight from the deck</b>:<br>
        <b>7</b> – look at one of your own cards<br>
        <b>8</b> – look at one of someone else's cards<br>
        <b>9</b> – blind swap one of yours with someone else's<br>
        <b>10</b> – look at someone else's card, then choose whether to swap</li>
      <li><b>Snap:</b> at any time, if you think one of your cards matches the number on top of the discard pile, tap <b>SNAP</b> then that card. Right = it's gone. Wrong = it stays and you take a penalty card.</li>
      <li>Instead of drawing, you can call <b>KABOO</b> at the start of your turn (after the first round). You still take that turn, everyone else gets one more turn, then all cards are revealed.</li>
      <li>Points: A = 1, 2–10 = face value, J = 11, Q = 12, <b>black K = 0</b>, <b>red K = 20</b>.</li></ul>
      <p>Everyone pays the same stake into the pot; the lowest score takes it (ties split).</p>`
  },
  hearts: {
    title: 'Hearts',
    html: `<p>Avoid taking hearts and the Queen of Spades. Lowest score wins.</p>
      <ul><li>13 cards each. Before each hand pass 3 cards: <b>left, right, across</b>, then no pass.</li>
      <li>The player with the <b>2${Cards.suitIcon('C')}</b> leads the first trick.</li>
      <li>You must follow suit if you can; otherwise play anything.</li>
      <li>Hearts can't be led until they are <b>broken</b> (a heart has been played on an earlier trick).</li>
      <li>Each heart = 1 point, Q${Cards.suitIcon('S')} = 13 points.</li>
      <li><b>Shoot the moon:</b> take all 13 hearts and the Q${Cards.suitIcon('S')} and you score 0 while everyone else gets 26.</li></ul>
      <p>The game ends when someone reaches the target score. Lowest total takes the pot.</p>`
  },
  hilo: {
    title: 'Higher or Lower',
    html: `<p>Ten cards are laid out. The first is turned over — guess whether the next is <b>higher</b> or <b>lower</b>.</p>
      <ul><li>Aces are high. One deck, so cards already shown change the odds.</li>
      <li>Each correct guess grows your multiplier — riskier guesses pay more.</li>
      <li>Same rank is a <b>push</b>: the multiplier stays the same.</li>
      <li><b>Cash out</b> at any time, or go all the way through the ten cards!</li></ul>`
  },
  roulette: {
    title: 'Roulette',
    html: `<p>European single-zero wheel.</p>
      <ul><li>Pick a chip, then tap the board to place bets. Tap again to add more.</li>
      <li>Straight number pays <b>35 to 1</b>.</li>
      <li>Dozens and columns (2 to 1) pay <b>2 to 1</b>.</li>
      <li>Red/Black, Odd/Even, 1–18/19–36 pay <b>1 to 1</b>.</li></ul>
      <p>Table maximum £50,000 per spin.</p>`
  }
};

/* Base class for games */
class GameBase {
  constructor(root) {
    this.root = root;
    this.alive = true;
    this.timers = new Set();
  }
  wait(ms) {
    return new Promise(res => {
      const t = setTimeout(() => { this.timers.delete(t); if (this.alive) res(); }, ms);
      this.timers.add(t);
    });
  }
  later(ms, fn) {
    const t = setTimeout(() => { this.timers.delete(t); if (this.alive) fn(); }, ms);
    this.timers.add(t);
  }
  destroy() {
    this.alive = false;
    this.timers.forEach(t => clearTimeout(t));
    if (this.onDestroy) this.onDestroy();
  }
  bindTop(rulesKey) {
    UI.bindTopbar(this.root, { onBack: () => App.leaveGame(), rules: RULES[rulesKey] });
  }
}

