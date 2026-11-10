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

const DEALERS = {
  vincent: { name: 'Vincent', style: 'm', skin: '#e8b48c', hair: '#2b1d14', visor: '#2f9a5a', tie: '#b8232b' },
  rosie: { name: 'Rosie', style: 'f', skin: '#f0c4a0', hair: '#8a2f1a', visor: '#c23b3b', tie: '#1f1f22' },
  otis: { name: 'Otis', style: 'm', skin: '#8d5a3c', hair: '#151515', visor: '#2a6fb8', tie: '#d4a422' }
};

const CHARACTERS = [
  { name: 'Lucky Lou', style: 'm', skin: '#e8b48c', hair: '#3a2a1e', shirt: '#2a62c4' },
  { name: 'Vegas Vi', style: 'f', skin: '#f2c8a6', hair: '#e2b84a', shirt: '#c0185d' },
  { name: 'The Duke', style: 'm', skin: '#7d4e33', hair: '#141414', shirt: '#6c2fa6' },
  { name: 'Ruby', style: 'f', skin: '#c98d66', hair: '#1c1c1c', shirt: '#b8232b' },
  { name: 'Frankie', style: 'm', skin: '#f0c09a', hair: '#7a4a24', shirt: '#2b8a48' },
  { name: 'Dolores', style: 'f', skin: '#e3a986', hair: '#5b2a17', shirt: '#d8a31f' }
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

  /* ---------- artwork ---------- */

  head(p, cx = 100, cy = 56) {
    // p: {style, skin, hair}
    const hairBack = p.style === 'f'
      ? `<path d="M${cx - 30} ${cy + 18} C${cx - 36} ${cy - 20} ${cx - 22} ${cy - 36} ${cx} ${cy - 36} C${cx + 22} ${cy - 36} ${cx + 36} ${cy - 20} ${cx + 30} ${cy + 18} C${cx + 26} ${cy + 26} ${cx + 16} ${cy + 22} ${cx + 18} ${cy + 10} L${cx - 18} ${cy + 10} C${cx - 16} ${cy + 22} ${cx - 26} ${cy + 26} ${cx - 30} ${cy + 18} Z" fill="${p.hair}"/>`
      : '';
    const hairTop = p.style === 'f'
      ? `<path d="M${cx - 24} ${cy - 6} C${cx - 24} ${cy - 30} ${cx + 24} ${cy - 34} ${cx + 25} ${cy - 4} C${cx + 14} ${cy - 18} ${cx - 2} ${cy - 22} ${cx - 24} ${cy - 6} Z" fill="${p.hair}"/>`
      : `<path d="M${cx - 23} ${cy - 2} C${cx - 26} ${cy - 30} ${cx + 26} ${cy - 34} ${cx + 23} ${cy - 2} C${cx + 21} ${cy - 16} ${cx + 8} ${cy - 21} ${cx - 3} ${cy - 21} C${cx - 12} ${cy - 21} ${cx - 21} ${cy - 15} ${cx - 23} ${cy - 2} Z" fill="${p.hair}"/>
         <path d="M${cx - 4} ${cy - 21} C${cx - 8} ${cy - 16} ${cx - 14} ${cy - 13} ${cx - 21} ${cy - 10}" stroke="#ffffff" stroke-opacity=".18" stroke-width="1.5" fill="none"/>`;
    const face = p.style === 'f'
      ? `<path d="M${cx - 6} ${cy + 15} Q${cx} ${cy + 19} ${cx + 6} ${cy + 15} Q${cx} ${cy + 13} ${cx - 6} ${cy + 15} Z" fill="#b8232b"/>
         <path d="M${cx - 14} ${cy - 1} q4 -3 8 0 M${cx + 6} ${cy - 1} q4 -3 8 0" stroke="#2a1a12" stroke-width="1.3" fill="none"/>`
      : `<path d="M${cx - 13} ${cy + 12} C${cx - 8} ${cy + 7} ${cx - 2} ${cy + 8} ${cx} ${cy + 10} C${cx + 2} ${cy + 8} ${cx + 8} ${cy + 7} ${cx + 13} ${cy + 12} C${cx + 15} ${cy + 9} ${cx + 16} ${cy + 7} ${cx + 15} ${cy + 5} C${cx + 12} ${cy + 13} ${cx + 4} ${cy + 13} ${cx} ${cy + 12} C${cx - 4} ${cy + 13} ${cx - 12} ${cy + 13} ${cx - 15} ${cy + 5} C${cx - 16} ${cy + 7} ${cx - 15} ${cy + 9} ${cx - 13} ${cy + 12} Z" fill="${p.hair}"/>
         <path d="M${cx - 14} ${cy - 3} h8 M${cx + 6} ${cy - 3} h8" stroke="${p.hair}" stroke-width="2.2" stroke-linecap="round"/>`;
    return `${hairBack}
      <ellipse cx="${cx - 22}" cy="${cy + 3}" rx="4" ry="6" fill="${p.skin}"/>
      <ellipse cx="${cx + 22}" cy="${cy + 3}" rx="4" ry="6" fill="${p.skin}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="21" ry="25" fill="${p.skin}"/>
      <ellipse cx="${cx}" cy="${cy + 4}" rx="3" ry="2" fill="#000" opacity=".12"/>
      <ellipse cx="${cx - 8}" cy="${cy + 1}" rx="2.2" ry="2.6" fill="#1d1410"/>
      <ellipse cx="${cx + 8}" cy="${cy + 1}" rx="2.2" ry="2.6" fill="#1d1410"/>
      <ellipse cx="${cx - 13}" cy="${cy + 9}" rx="4" ry="2.4" fill="#e0605a" opacity=".22"/>
      <ellipse cx="${cx + 13}" cy="${cy + 9}" rx="4" ry="2.4" fill="#e0605a" opacity=".22"/>
      ${face}${hairTop}`;
  },

  dealer(key = 'vincent') {
    const p = DEALERS[key] || DEALERS.vincent;
    const visor = `<path d="M74 40 C84 30 116 30 126 40 L126 44 C116 36 84 36 74 44 Z" fill="${p.visor}"/>
      <path d="M70 44 C86 34 114 34 130 44 C120 54 80 54 70 44 Z" fill="${p.visor}" opacity=".78"/>
      <path d="M72 44 C88 37 112 37 128 44" stroke="#fff" stroke-opacity=".35" stroke-width="1" fill="none"/>`;
    return `<div class="dealer" data-dealer="${key}">
      <svg class="dealer-body" viewBox="0 0 200 150" aria-hidden="true">
        <ellipse cx="100" cy="150" rx="86" ry="14" fill="#000" opacity=".35"/>
        <path d="M18 150 C22 112 42 98 70 92 L130 92 C158 98 178 112 182 150 Z" fill="#f4efe4"/>
        <path d="M28 150 C30 128 38 118 48 112 L52 150 Z M172 150 C170 128 162 118 152 112 L148 150 Z" fill="#e3dccd"/>
        <rect x="30" y="122" width="22" height="7" rx="2" fill="${p.tie}" transform="rotate(-12 41 125)"/>
        <rect x="148" y="122" width="22" height="7" rx="2" fill="${p.tie}" transform="rotate(12 159 125)"/>
        <path d="M56 150 L60 100 L84 92 L100 128 L116 92 L140 100 L144 150 Z" fill="#16161a"/>
        <path d="M84 92 L100 128 L116 92 Z" fill="#fbf8f0"/>
        <path d="M100 128 L100 150" stroke="#2a2a30" stroke-width="1"/>
        <circle cx="94" cy="134" r="2.2" fill="#e7c873"/><circle cx="94" cy="145" r="2.2" fill="#e7c873"/>
        <path d="M86 96 L98 101 L86 106 Z M114 96 L102 101 L114 106 Z" fill="${p.tie}"/>
        <rect x="96" y="98" width="8" height="6" rx="2" fill="${p.tie}"/>
        <rect x="92" y="76" width="16" height="16" fill="${p.skin}"/>
        ${UI.head(p, 100, 56)}
        ${visor}
      </svg>
      <svg class="hand hand-l" viewBox="0 0 60 50" aria-hidden="true">${UI.handPath(p.skin, false)}</svg>
      <svg class="hand hand-r" viewBox="0 0 60 50" aria-hidden="true">${UI.handPath(p.skin, true)}</svg>
      <div class="dealer-name">${p.name}</div>
    </div>`;
  },

  handPath(skin, right) {
    const g = `<rect x="2" y="16" width="16" height="22" rx="4" fill="#f4efe4"/>
      <rect x="15" y="15" width="5" height="24" rx="2" fill="#d9d1c0"/>
      <path d="M19 18 C30 12 44 14 52 18 C58 21 58 27 52 28 C56 30 56 35 50 35 C53 37 52 42 46 41 C44 44 38 44 34 41 L19 38 Z" fill="${skin}"/>
      <path d="M38 28 L52 28 M38 34 L50 35" stroke="#000" stroke-opacity=".15" stroke-width="1.2"/>
      <path d="M26 18 C30 10 38 10 40 16" fill="${skin}"/>`;
    return right ? `<g transform="translate(60 0) scale(-1 1)">${g}</g>` : g;
  },

  dealerDeal(root, side = 'r') {
    const h = root && root.querySelector('.dealer .hand-' + side);
    if (!h) return;
    h.classList.remove('deal');
    void h.getBoundingClientRect();
    h.classList.add('deal');
  },

  avatar(p, extra = '') {
    return `<div class="avatar ${extra}"><svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill="#123a28"/>
      <g transform="translate(0 6) scale(.5) translate(0 40)">
        <path d="M40 150 C44 112 62 100 100 98 C138 100 156 112 160 150 Z" fill="${p.shirt || '#2a62c4'}"/>
        <path d="M86 98 L100 122 L114 98 Z" fill="#fbf8f0"/>
        <rect x="92" y="76" width="16" height="22" fill="${p.skin}"/>
        ${UI.head(p, 100, 56)}
      </g>
    </svg></div>`;
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

