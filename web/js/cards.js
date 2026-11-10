/* Playing cards: model + retro SVG artwork */
'use strict';

const Cards = (() => {
  const SUITS = ['S', 'H', 'D', 'C'];
  const RED = '#b8232b', BLACK = '#17171a';
  let uid = 0;

  const SUIT_PATHS = {
    H: '<path d="M50 90 C22 68 2 50 8 28 C13 10 38 6 50 26 C62 6 87 10 92 28 C98 50 78 68 50 90 Z"/>',
    D: '<path d="M50 4 C60 22 74 38 88 50 C74 62 60 78 50 96 C40 78 26 62 12 50 C26 38 40 22 50 4 Z"/>',
    S: '<path d="M50 6 C62 26 92 40 92 62 C92 78 76 86 62 78 C58 76 56 74 54 71 C55 82 60 90 70 95 L30 95 C40 90 45 82 46 71 C44 74 42 76 38 78 C24 86 8 78 8 62 C8 40 38 26 50 6 Z"/>',
    C: '<circle cx="50" cy="28" r="20"/><circle cx="27" cy="58" r="20"/><circle cx="73" cy="58" r="20"/><circle cx="50" cy="52" r="10"/>' +
       '<path d="M46 56 C46 76 42 88 31 95 L69 95 C58 88 54 76 54 56 Z"/>'
  };

  /* Sprite with suit symbols + patterns, injected once */
  function injectSprite() {
    if (document.getElementById('card-sprite')) return;
    const svg = `<svg id="card-sprite" xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
      <defs>
        ${SUITS.map(s => `<symbol id="suit-${s}" viewBox="0 0 100 100">${SUIT_PATHS[s]}</symbol>`).join('')}
        <pattern id="cm-lattice" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#8f1d25"/>
          <path d="M0 0 H10 M0 0 V10" stroke="#e7c873" stroke-width="1.1" opacity=".55"/>
          <circle cx="5" cy="5" r="1.1" fill="#f3dc9a" opacity=".7"/>
        </pattern>
        <linearGradient id="cm-ivory" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#f1e8d2"/>
        </linearGradient>
        <pattern id="cm-court" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="none"/>
          <path d="M0 0 V6" stroke="#000" stroke-width="1" opacity=".07"/>
        </pattern>
      </defs>
    </svg>`;
    document.body.insertAdjacentHTML('afterbegin', svg);
  }

  const rankLabel = r => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[r] || String(r));
  const isRed = s => s === 'H' || s === 'D';
  const suitName = s => ({ S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' }[s]);

  function newDeck(decks = 1) {
    const out = [];
    for (let d = 0; d < decks; d++)
      for (const s of SUITS)
        for (let r = 1; r <= 13; r++) out.push({ r, s, id: 'c' + (uid++) });
    return shuffle(out);
  }

  const use = (s, x, y, size, rot) =>
    `<use href="#suit-${s}" xlink:href="#suit-${s}" x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}"${rot ? ` transform="rotate(180 ${x} ${y})"` : ''}/>`;

  const PIPS = {
    2: [[50, 28], [50, 112]],
    3: [[50, 28], [50, 70], [50, 112]],
    4: [[31, 28], [69, 28], [31, 112], [69, 112]],
    5: [[31, 28], [69, 28], [50, 70], [31, 112], [69, 112]],
    6: [[31, 28], [69, 28], [31, 70], [69, 70], [31, 112], [69, 112]],
    7: [[31, 28], [69, 28], [50, 49], [31, 70], [69, 70], [31, 112], [69, 112]],
    8: [[31, 28], [69, 28], [50, 49], [31, 70], [69, 70], [50, 91], [31, 112], [69, 112]],
    9: [[31, 28], [69, 28], [31, 56], [69, 56], [50, 70], [31, 84], [69, 84], [31, 112], [69, 112]],
    10: [[31, 28], [69, 28], [50, 42], [31, 56], [69, 56], [31, 84], [69, 84], [50, 98], [31, 112], [69, 112]]
  };

  const COURT = {
    11: { fill: '#cfe0f2', emblem: '<path d="M37 41 Q39 29 55 30 L67 25 L61 34 Q64 37 64 41 Z"/><circle cx="66" cy="25" r="2.2"/>' },
    12: { fill: '#f4d0cc', emblem: '<path d="M37 41 Q50 31 63 41 Z"/><circle cx="40" cy="33" r="2.4"/><circle cx="50" cy="29" r="2.8"/><circle cx="60" cy="33" r="2.4"/>' },
    13: { fill: '#f2dd9c', emblem: '<path d="M36 41 L34 28 L42 34 L50 24 L58 34 L66 28 L64 41 Z"/><circle cx="50" cy="23" r="2.4"/>' }
  };

  const faceCache = {};
  function faceSVG(card) {
    const key = card.s + card.r;
    if (faceCache[key]) return faceCache[key];
    const col = isRed(card.s) ? RED : BLACK;
    const lab = rankLabel(card.r);
    const fs = lab === '10' ? 15 : 18;
    const ls = lab === '10' ? ' letter-spacing="-1.5"' : '';
    const corner = `<text x="11.5" y="19" text-anchor="middle" font-size="${fs}"${ls} font-weight="700" font-family="Georgia, 'Times New Roman', serif">${lab}</text>${use(card.s, 11.5, 29, 11)}`;
    let center = '';
    if (card.r === 1) {
      center = card.s === 'S'
        ? `<circle cx="50" cy="70" r="27" fill="none" stroke="${col}" stroke-width="1.2" opacity=".5"/>${use('S', 50, 70, 44)}`
        : use(card.s, 50, 70, 40);
    } else if (card.r <= 10) {
      center = PIPS[card.r].map(([x, y]) => use(card.s, x, y, card.r >= 9 ? 15 : 17, y > 72)).join('');
    } else {
      const c = COURT[card.r];
      const half = `<g>${c.emblem}<text x="50" y="66" text-anchor="middle" font-size="25" font-weight="700" font-family="Didot, 'Bodoni 72', Georgia, serif">${lab}</text>${use(card.s, 29, 30, 9)}</g>`;
      center = `<rect x="20" y="17" width="60" height="106" rx="3" fill="${c.fill}"/>
        <rect x="20" y="17" width="60" height="106" rx="3" fill="url(#cm-court)"/>
        <rect x="20" y="17" width="60" height="106" rx="3" fill="none" stroke="#b08d3c" stroke-width="1.4"/>
        <rect x="23" y="20" width="54" height="100" rx="2" fill="none" stroke="${col}" stroke-width=".6" opacity=".5"/>
        <line x1="22" y1="70" x2="78" y2="70" stroke="#b08d3c" stroke-width=".8"/>
        ${half}<g transform="rotate(180 50 70)">${half}</g>`;
    }
    const svg = `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="${col}">
      <rect x="0.75" y="0.75" width="98.5" height="138.5" rx="8" fill="url(#cm-ivory)" stroke="#cbbf9f" stroke-width="1.5"/>
      ${corner}<g transform="rotate(180 50 70)">${corner}</g>${center}</svg>`;
    faceCache[key] = svg;
    return svg;
  }

  const BACK = `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <rect x="0.75" y="0.75" width="98.5" height="138.5" rx="8" fill="#fbf6e9" stroke="#cbbf9f" stroke-width="1.5"/>
    <rect x="6" y="6" width="88" height="128" rx="5" fill="url(#cm-lattice)"/>
    <rect x="6" y="6" width="88" height="128" rx="5" fill="none" stroke="#e7c873" stroke-width="1.6"/>
    <rect x="10" y="10" width="80" height="120" rx="3" fill="none" stroke="#e7c873" stroke-width=".7" opacity=".8"/>
    <circle cx="50" cy="70" r="17" fill="#7a141b" stroke="#e7c873" stroke-width="1.6"/>
    <circle cx="50" cy="70" r="13.5" fill="none" stroke="#e7c873" stroke-width=".6"/>
    <use href="#suit-S" xlink:href="#suit-S" x="41" y="61" width="18" height="18" fill="#f3dc9a"/>
  </svg>`;

  function el(card, faceUp = true, extra = '') {
    const d = document.createElement('div');
    d.className = 'card' + (faceUp ? ' up' : '') + (extra ? ' ' + extra : '');
    d.innerHTML = `<div class="card-inner"><div class="card-face front">${card ? faceSVG(card) : ''}</div><div class="card-face back">${BACK}</div></div>`;
    if (card) d.dataset.id = card.id;
    return d;
  }

  function setCard(elm, card) {
    elm.querySelector('.front').innerHTML = card ? faceSVG(card) : '';
    if (card) elm.dataset.id = card.id;
  }

  function flip(elm, up) {
    if (!elm) return;
    const was = elm.classList.contains('up');
    elm.classList.toggle('up', up);
    if (was !== up) Sound.flip();
  }

  /* small inline suit icon for text */
  function suitIcon(s) {
    return `<svg class="suit-ico" viewBox="0 0 100 100" fill="${isRed(s) ? '#e0464d' : 'currentColor'}"><use href="#suit-${s}" xlink:href="#suit-${s}"/></svg>`;
  }

  function label(card) { return rankLabel(card.r) + suitIcon(card.s); }

  return { SUITS, RED, BLACK, injectSprite, rankLabel, isRed, suitName, newDeck, faceSVG, BACK, el, setCard, flip, suitIcon, label };
})();
