/* Playing cards: model + retro SVG artwork */
'use strict';

const Cards = (() => {
  const SUITS = ['S', 'H', 'D', 'C'];
  const RED = '#d0202b', BLACK = '#111111';
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
    2: [[50, 26], [50, 114]],
    3: [[50, 26], [50, 70], [50, 114]],
    4: [[32, 26], [68, 26], [32, 114], [68, 114]],
    5: [[32, 26], [68, 26], [50, 70], [32, 114], [68, 114]],
    6: [[32, 26], [68, 26], [32, 70], [68, 70], [32, 114], [68, 114]],
    7: [[32, 26], [68, 26], [50, 48], [32, 70], [68, 70], [32, 114], [68, 114]],
    8: [[32, 26], [68, 26], [50, 48], [32, 70], [68, 70], [50, 92], [32, 114], [68, 114]],
    9: [[32, 26], [68, 26], [32, 55], [68, 55], [50, 70], [32, 85], [68, 85], [32, 114], [68, 114]],
    10: [[32, 26], [68, 26], [50, 41], [32, 55], [68, 55], [32, 85], [68, 85], [50, 99], [32, 114], [68, 114]]
  };

  /* Traditional English-pattern court colours */
  const CR = '#d0202b', CY = '#f2c12e', CB = '#1f4ea8', CK = '#141414', FL = '#f7dfc4';

  /* One half of a double-headed court figure, drawn in the box x 20-80, y 16-70 */
  function courtHalf(r, s) {
    const red = isRed(s);
    const robeA = red ? CR : CB, robeB = red ? CB : CR;
    const hair = r === 12 ? '#e2a72a' : CY;
    const line = `stroke="${CK}" stroke-width=".9" stroke-linejoin="round"`;
    const zig = (x1, y, x2) => {
      let d = `M${x1} ${y}`;
      for (let x = x1; x < x2; x += 3) d += ` L${x + 1.5} ${y - 2} L${x + 3} ${y}`;
      return `<path d="${d}" fill="none" stroke="${CK}" stroke-width=".7"/>`;
    };
    // robe and shoulders
    let g = `
      <path d="M21 70 L22 52 C28 46 38 43 50 43 C62 43 72 46 78 52 L79 70 Z" fill="${robeA}" ${line}/>
      <path d="M21 70 L22 52 C26 49 30 47 34 46 L37 70 Z" fill="${robeB}" ${line}/>
      <path d="M63 70 L66 46 C70 47 75 49 78 52 L79 70 Z" fill="${CK}" ${line}/>
      <path d="M42 45 L58 45 L61 70 L39 70 Z" fill="${CY}" ${line}/>
      ${zig(41, 52, 59)}${zig(40, 59, 60)}${zig(40, 66, 61)}
      <path d="M50 45 L50 70" stroke="${CK}" stroke-width=".7"/>
      ${[[45, 55], [55, 55], [45, 62], [55, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${robeA}" stroke="${CK}" stroke-width=".4"/>`).join('')}
      <path d="M24 56 L34 52 M24 61 L35 57 M24 66 L36 62" stroke="${CY}" stroke-width="1.6"/>
      <path d="M66 54 L77 57 M65 60 L77 62" stroke="${CY}" stroke-width="1.6"/>
      <path d="M36 46 C42 49 58 49 64 46 L62 43 C56 45 44 45 38 43 Z" fill="#fff" ${line}/>`;
    // head
    g += `<ellipse cx="50" cy="33" rx="7.4" ry="9" fill="${FL}" ${line}/>
      <path d="M46.4 31.5 h2.2 M51.4 31.5 h2.2" stroke="${CK}" stroke-width=".9" stroke-linecap="round"/>
      <path d="M50 32 L49 36.5 L50.6 36.8" fill="none" stroke="${CK}" stroke-width=".6"/>
      <path d="M48 39 C49.4 39.8 50.8 39.8 52 39" fill="none" stroke="${CR}" stroke-width=".9"/>`;
    if (r === 13) {
      g += `<path d="M42.6 30 C41 38 43 44 50 46 C57 44 59 38 57.4 30 C56 37 53 40.4 50 40.4 C47 40.4 44 37 42.6 30 Z" fill="${hair}" ${line}/>
        <path d="M46 42 L47 45 M50 42 L50 45.5 M54 42 L53 45" stroke="${CK}" stroke-width=".5"/>
        <path d="M41 25 L41 16 L45 20.5 L50 14 L55 20.5 L59 16 L59 25 Z" fill="${CY}" ${line}/>
        <rect x="41" y="23" width="18" height="3.4" fill="${CR}" ${line}/>
        <circle cx="50" cy="19.5" r="1.3" fill="${CR}"/>
        <path d="M70 16 L70 44" stroke="#8b8f96" stroke-width="2.4"/><path d="M66 40 L74 40" stroke="${CY}" stroke-width="2" ${line}/>`;
    } else if (r === 12) {
      g += `<path d="M42 28 C38 36 40 46 44 50 L46 40 C44 36 43 32 43.6 28 Z M58 28 C62 36 60 46 56 50 L54 40 C56 36 57 32 56.4 28 Z" fill="${hair}" ${line}/>
        <path d="M42.6 25 C44 19 56 19 57.4 25 Z" fill="${CY}" ${line}/>
        <path d="M43 22 L45 17 L48 21 L50 16 L52 21 L55 17 L57 22" fill="none" stroke="${CK}" stroke-width=".8"/>
        <circle cx="50" cy="18" r="1.4" fill="${CR}"/>
        <path d="M30 40 L36 30" stroke="#2d7a3a" stroke-width="1.4"/>
        <circle cx="36.5" cy="28.5" r="3.6" fill="${CR}" ${line}/><circle cx="36.5" cy="28.5" r="1.4" fill="${CY}"/>`;
    } else {
      g += `<path d="M42.4 31 C40 38 42 42 44 44 L45 37 C44 35 43.6 33 43.6 31 Z M57.6 31 C60 38 58 42 56 44 L55 37 C56 35 56.4 33 56.4 31 Z" fill="${hair}" ${line}/>
        <path d="M40 27 C40 20 60 18 61 26 L41 28 Z" fill="${robeB}" ${line}/>
        <path d="M41 26 L61 25" stroke="${CY}" stroke-width="1.6"/>
        <path d="M58 22 C64 14 70 14 72 17 C68 18 64 20 60 24 Z" fill="${CR}" ${line}/>
        <path d="M28 44 L34 22" stroke="#8b5a2b" stroke-width="1.6"/><path d="M31 20 C37 21 38 26 34 29 L32 24 Z" fill="${CY}" ${line}/>`;
    }
    return g;
  }

  const faceCache = {};
  function faceSVG(card) {
    const key = card.s + card.r;
    if (faceCache[key]) return faceCache[key];
    const col = isRed(card.s) ? RED : BLACK;
    const lab = rankLabel(card.r);
    const ten = lab === '10';
    const corner = `<text x="10.5" y="18" text-anchor="middle" font-size="${ten ? 15.5 : 18}"${ten ? ' letter-spacing="-1.6"' : ''} font-weight="700"
        font-family="'Avenir Next Condensed', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif">${lab}</text>${use(card.s, 10.5, 27.5, 10.5)}`;
    let center = '';
    if (card.r === 1) {
      center = card.s === 'S'
        ? `${use('S', 50, 70, 54)}<path d="M50 52 C56 62 62 66 62 74" stroke="#fff" stroke-width="1.2" fill="none" opacity=".55"/>
           <circle cx="50" cy="70" r="31" fill="none" stroke="${col}" stroke-width=".8" opacity=".35"/>`
        : use(card.s, 50, 70, 34);
    } else if (card.r <= 10) {
      const size = card.r >= 9 ? 21 : card.r >= 7 ? 22 : 24;
      center = PIPS[card.r].map(([x, y]) => use(card.s, x, y, size, y > 72)).join('');
    } else {
      const half = courtHalf(card.r, card.s);
      center = `<clipPath id="cc-${key}"><rect x="20" y="16" width="60" height="108"/></clipPath>
        <g clip-path="url(#cc-${key})">
          <rect x="20" y="16" width="60" height="108" fill="#fff"/>
          <g clip-path="url(#ct-${key})"><g transform="translate(0 2.5)">${half}</g></g>
          <g transform="rotate(180 50 70)"><g clip-path="url(#ct-${key})"><g transform="translate(0 2.5)">${half}</g></g></g>
        </g>
        <clipPath id="ct-${key}"><rect x="20" y="16" width="60" height="54"/></clipPath>
        <path d="M20 70 L80 70" stroke="${CK}" stroke-width=".9"/>
        <rect x="20" y="16" width="60" height="108" fill="none" stroke="${isRed(card.s) ? CR : CB}" stroke-width="1.4"/>
        ${use(card.s, 27, 23, 8)}<g transform="rotate(180 50 70)">${use(card.s, 27, 23, 8)}</g>`;
    }
    const svg = `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="${col}">
      <rect x="0.6" y="0.6" width="98.8" height="138.8" rx="7" fill="#fff" stroke="#c8c8c8" stroke-width="1.2"/>
      ${corner}<g transform="rotate(180 50 70)">${corner}</g>${center}</svg>`;
    faceCache[key] = svg;
    return svg;
  }

  /* classic red back: white margin, scalloped border band, lattice centre */
  const BACK = (() => {
    const scallops = (x1, y1, x2, y2, n) => {
      let d = '';
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const ax = x1 + (x2 - x1) * t0, ay = y1 + (y2 - y1) * t0, bx = x1 + (x2 - x1) * t1, by = y1 + (y2 - y1) * t1;
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        d += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="1.5" fill="none" stroke="#fff" stroke-width=".8"/>`;
      }
      return d;
    };
    return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="bk-lattice" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45 50 70)">
          <rect width="6" height="6" fill="#c8202b"/>
          <path d="M0 0 H6 M0 0 V6" stroke="#fff" stroke-width=".9"/>
          <circle cx="3" cy="3" r=".9" fill="#fff"/>
        </pattern>
      </defs>
      <rect x="0.6" y="0.6" width="98.8" height="138.8" rx="7" fill="#fff" stroke="#c8c8c8" stroke-width="1.2"/>
      <rect x="6" y="6" width="88" height="128" rx="2" fill="#c8202b"/>
      <rect x="8.5" y="8.5" width="83" height="123" fill="none" stroke="#fff" stroke-width=".9"/>
      ${scallops(12, 12, 88, 12, 22)}${scallops(12, 128, 88, 128, 22)}${scallops(12, 12, 12, 128, 34)}${scallops(88, 12, 88, 128, 34)}
      <rect x="15.5" y="15.5" width="69" height="109" fill="none" stroke="#fff" stroke-width=".9"/>
      <rect x="18" y="18" width="64" height="104" fill="none" stroke="#fff" stroke-width=".5" stroke-dasharray="1.5 1.5"/>
      <rect x="22" y="22" width="56" height="96" fill="url(#bk-lattice)" stroke="#fff" stroke-width="1"/>
      <rect x="24.5" y="24.5" width="51" height="91" fill="none" stroke="#fff" stroke-width=".5"/>
    </svg>`;
  })();

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
