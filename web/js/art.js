/* Character artwork in an illustrated "crime-thriller poster" style:
 * bold ink outlines, two-tone cel shading, rim highlights and sunset gradient
 * backdrops. Every character here is fictional and drawn from parameters. */
'use strict';

const Art = (() => {
  let uid = 0;
  const INK = '#1a120e';
  const LINE = '#3a2218';

  const SKIN = {
    light: ['#f3caa9', '#d59b78', '#ffe6d2'],
    fair: ['#e8b38d', '#c2845d', '#fad2b3'],
    olive: ['#cb9068', '#9e6745', '#e9b48d'],
    tan: ['#b47550', '#875033', '#d59a6f'],
    brown: ['#8b5638', '#613722', '#b07852'],
    deep: ['#5e3723', '#3d2115', '#875a3f']
  };

  const BG = {
    sunset: ['#ffc07e', '#f0628e'],
    peach: ['#ffe2a6', '#f68f5a'],
    lilac: ['#f6b6d8', '#9a74d6'],
    mint: ['#d5f2c4', '#5fbfa6'],
    sky: ['#d9f1fb', '#6aaee3'],
    teal: ['#a8e6e3', '#2f8fa6'],
    dusk: ['#f7a9a0', '#5d4a8f']
  };

  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  };

  const Art_shade = shade;

  /* ---------- geometry (200 x 200 space, head centred on x = 100) ---------- */
  const FACE = {
    m: 'M68 86 C66 56 80 40 100 40 C120 40 134 56 132 86 C132 103 130 117 125 127 C118 140 108 148 100 149 C92 148 82 140 75 127 C70 117 68 103 68 86 Z',
    f: 'M70 86 C68 57 82 43 100 43 C118 43 132 57 130 86 C130 103 127 117 121 128 C114 140 106 146 100 147 C94 146 86 140 79 128 C73 117 70 103 70 86 Z'
  };
  const EARS = '<path d="M71 84 C60 78 57 96 61 104 C63 111 68 113 72 110 Z"/><path d="M129 84 C140 78 143 96 139 104 C137 111 132 113 128 110 Z"/>';
  const NECK = 'M83 120 L80 160 C90 170 110 170 120 160 L117 120 Z';
  const BODY = 'M10 200 C14 176 38 163 72 157 C80 155 86 153 90 151 L110 151 C114 153 120 155 128 157 C162 163 186 176 190 200 Z';

  function eyes(p, id) {
    const iris = p.eyes || '#4a2f1d';
    const line = '#2a1810';
    const one = (cx, flip, k) => {
      const x = v => (flip ? 200 - v : v);
      const shape = `M${x(80)} 92.2 C${x(83)} 89.6 ${x(89.5)} 89.4 ${x(93)} 91.8 C${x(89.5)} 93.8 ${x(83)} 94 ${x(80)} 92.2 Z`;
      return `<clipPath id="ey${k}${id}"><path d="${shape}"/></clipPath>
        <path d="${shape}" fill="#e9dfd0"/>
        <g clip-path="url(#ey${k}${id})">
          <circle cx="${cx}" cy="91.7" r="2.75" fill="${iris}"/>
          <circle cx="${cx}" cy="91.7" r="2.75" fill="url(#ir${id})"/>
          <circle cx="${cx}" cy="91.7" r="1.25" fill="#0c0806"/>
          <circle cx="${cx + 1}" cy="90.9" r=".6" fill="#fff" opacity=".9"/>
          <path d="${shape}" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2" transform="translate(0 -1)"/>
        </g>
        <path d="M${x(79.4)} 92.4 C${x(82.6)} 89 ${x(90)} 88.8 ${x(93.6)} 91.6" fill="none" stroke="${line}" stroke-width="${p.sex === 'f' ? 1.7 : 1.3}" stroke-linecap="round"/>
        ${p.sex === 'f' ? `<path d="M${x(93.4)} 91.6 L${x(96)} 90.2" stroke="${line}" stroke-width="1.2" stroke-linecap="round"/>` : ''}
        <path d="M${x(80.6)} 88.6 C${x(84)} 86.8 ${x(89.4)} 86.8 ${x(92.6)} 88.8" fill="none" stroke="${line}" stroke-width=".7" opacity=".55"/>
        <path d="M${x(81)} 94.4 C${x(84.4)} 95.6 ${x(89.4)} 95.4 ${x(92.4)} 93.8" fill="none" stroke="${line}" stroke-width=".55" opacity=".45"/>`;
    };
    return `<defs><radialGradient id="ir${id}"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>`
      + one(86.5, false, 'l') + one(113.5, true, 'r');
  }

  function brows(p) {
    const c = p.browColor || shade(p.hairColor || '#2a1a12', -0.1);
    if (p.sex === 'f') {
      return `<path d="M78.5 85.4 C82.5 82 89.5 81.2 95.5 83.2 L95.2 84.4 C89.5 83 83.5 83.6 79 86.2 Z" fill="${c}"/>
              <path d="M121.5 85.4 C117.5 82 110.5 81.2 104.5 83.2 L104.8 84.4 C110.5 83 116.5 83.6 121 86.2 Z" fill="${c}"/>`;
    }
    const st = p.mood === 'stern' ? 1.2 : 0;
    return `<path d="M77.5 85 C82 81.6 90 81 96 ${83 + st} L95.6 ${85.2 + st} C90 ${83.8 + st} 83 84 78 86.6 Z" fill="${c}"/>
            <path d="M122.5 85 C118 81.6 110 81 104 ${83 + st} L104.4 ${85.2 + st} C110 ${83.8 + st} 117 84 122 86.6 Z" fill="${c}"/>`;
  }

  function nose(s) {
    return `<path d="M96.6 92 C95.8 100 94.2 106 93.2 111.5 C92.6 114 94 116 96 116.2" fill="none" stroke="${s[1]}" stroke-width="2.6" stroke-linecap="round" opacity=".85" filter="url(#sf)"/>
      <path d="M93.4 115.6 C95.6 117.6 98 117.8 100 117 C102 117.8 104.4 117.6 106.6 115.6" fill="none" stroke="#3a2015" stroke-width=".9" stroke-linecap="round" opacity=".8"/>
      <path d="M93.8 113.6 C93 115.4 94 116.6 95.6 116.4 M106.2 113.6 C107 115.4 106 116.6 104.4 116.4" fill="none" stroke="#3a2015" stroke-width=".8" opacity=".7"/>
      <path d="M101.4 90 C102.4 97 103 104 102.8 110" stroke="${s[2]}" stroke-width="1.8" stroke-linecap="round" opacity=".75" filter="url(#sf)"/>
      <ellipse cx="102" cy="112.6" rx="2.2" ry="1.5" fill="${s[2]}" opacity=".8"/>`;
  }

  function mouth(p, s) {
    const lip = p.lips || shade(s[1], -0.05);
    const lower = p.sex === 'f' ? shade(lip, 0.14) : shade(s[0], -0.06);
    const sm = p.mood === 'smirk' ? -1.4 : 0;
    return `<path d="M90.5 127.2 C94 125.2 97.4 125.4 100 126.2 C102.6 125.4 106 125.2 109.5 ${127 + sm} C105 128.2 95 128.2 90.5 127.2 Z" fill="${lip}" opacity="${p.sex === 'f' ? 1 : 0.8}"/>
      <path d="M91.5 127.6 C95.5 131.6 104.5 131.6 108.5 ${127.4 + sm / 2} C104 128.8 96 128.8 91.5 127.6 Z" fill="${lower}" opacity="${p.sex === 'f' ? 1 : 0.75}"/>
      <path d="M90.2 127.3 C95 128.6 105 128.6 109.8 ${127 + sm}" fill="none" stroke="#3a1c14" stroke-width="1" stroke-linecap="round"/>
      <path d="M97 129.8 C99 130.4 101.4 130.4 103 129.8" stroke="#fff" stroke-opacity=".3" stroke-width=".9" fill="none"/>
      <path d="M95.5 136.4 C98.5 137.6 101.5 137.6 104.5 136.4" stroke="${s[1]}" stroke-width="2" fill="none" opacity=".55" filter="url(#sf)"/>
      <path d="M86.8 118.5 C85.8 121.5 86.4 124.6 88.4 127" stroke="${s[1]}" stroke-width="1.4" fill="none" opacity=".6"/>
      <path d="M113.2 118.5 C114.2 121.5 113.6 124.6 111.6 127" stroke="${s[1]}" stroke-width="1.1" fill="none" opacity=".4"/>`;
  }

  /* ---------- hair ---------- */
  function hair(p, layer, id) {
    const c = p.hairColor || '#2a1a12';
    const hi = shade(c, 0.32);
    const lo = shade(c, -0.35);
    const ink = `stroke="${LINE}" stroke-width="1.4" stroke-linejoin="round"`;
    const H = {
      slick: {
        front: `<path d="M66 88 C59 52 78 29 104 29 C129 29 143 48 136 86 C133 70 128 60 121 54 C111 47 92 46 82 52 C74 58 69 70 66 88 Z" fill="${c}" ${ink}/>
          <path d="M78 46 C92 36 112 34 128 43 M82 51 C96 42 113 42 126 50 M90 35 C104 31 120 33 131 41" stroke="${hi}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>
          <path d="M88 51 C86 44 88 37 93 32" stroke="${lo}" stroke-width="1.6" fill="none"/>`
      },
      buzz: {
        front: `<path d="M68 84 C64 52 80 35 100 35 C120 35 136 52 132 84 C130 68 124 58 116 54 C106 50 94 50 84 54 C76 58 70 68 68 84 Z" fill="${c}" ${ink}/>
          <path d="M68 84 C64 52 80 35 100 35 C120 35 136 52 132 84 C130 68 124 58 116 54 C106 50 94 50 84 54 C76 58 70 68 68 84 Z" fill="url(#st${id})" opacity=".55"/>
          <path d="M84 40 C96 36 112 37 122 44" stroke="${hi}" stroke-width="1.6" fill="none" opacity=".6"/>`
      },
      crop: {
        front: `<path d="M66 84 C61 50 80 31 100 31 C121 31 139 48 134 82 L130 68 L124 72 L121 60 L113 66 L107 56 L99 64 L93 55 L86 65 L80 59 L76 71 L70 67 Z" fill="${c}" ${ink}/>
          <path d="M82 40 L90 50 M96 36 L100 48 M110 37 L108 50 M122 44 L116 54" stroke="${hi}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`
      },
      fade: {
        front: `<path d="M68 86 C64 60 72 44 84 38 C94 33 108 33 118 38 C130 44 136 60 132 86 C130 72 126 62 118 58 C108 54 92 54 82 58 C74 62 70 72 68 86 Z" fill="${c}" ${ink}/>
          ${[[80, 44], [90, 38], [101, 36], [112, 38], [121, 44], [86, 48], [97, 45], [108, 46], [117, 51], [78, 54]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.4" fill="${c}" stroke="${lo}" stroke-width="1.2"/>`).join('')}
          <path d="M84 41 C92 37 104 36 114 39" stroke="${hi}" stroke-width="1.6" fill="none" opacity=".6"/>`
      },
      balding: {
        front: `<path d="M66 94 C62 76 65 64 72 57 L79 64 C75 71 72 80 72 94 Z" fill="${c}" ${ink}/>
          <path d="M134 94 C138 76 135 64 128 57 L121 64 C125 71 128 80 128 94 Z" fill="${c}" ${ink}/>
          <path d="M86 50 C92 46 100 45 108 47" stroke="${c}" stroke-width="1.4" fill="none" opacity=".7"/>
          <ellipse cx="110" cy="54" rx="12" ry="5" fill="#fff" opacity=".28"/>`
      },
      ponytail: {
        back: `<path d="M124 46 C150 38 164 62 156 92 C151 110 158 128 149 148 C140 134 142 117 136 101 C131 86 133 66 122 56 Z" fill="${c}" ${ink}/>
          <path d="M140 60 C152 70 150 84 146 96 M146 104 C152 116 150 126 148 138" stroke="${hi}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`,
        front: `<path d="M68 90 C61 52 80 32 102 32 C125 32 141 50 134 90 C130 67 120 52 102 50 C84 50 72 64 68 90 Z" fill="${c}" ${ink}/>
          <path d="M80 44 C92 36 112 36 126 46 M84 50 C96 44 110 44 122 50" stroke="${hi}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
          <path d="M70 80 C64 96 67 110 63 122" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      },
      long: {
        back: `<path d="M64 66 C52 110 50 160 42 200 L86 200 C80 170 74 140 72 110 Z" fill="${c}" ${ink}/>
          <path d="M136 66 C148 110 150 160 158 200 L114 200 C120 170 126 140 128 110 Z" fill="${c}" ${ink}/>
          <path d="M58 120 C56 140 54 160 52 180 M144 120 C146 140 148 160 150 180" stroke="${hi}" stroke-width="2" fill="none" opacity=".6"/>`,
        front: `<path d="M64 100 C56 58 78 33 102 33 C127 33 146 56 136 100 C133 76 124 60 108 55 C99 66 86 73 72 77 C68 84 66 92 64 100 Z" fill="${c}" ${ink}/>
          <path d="M78 46 C90 38 108 36 124 44" stroke="${hi}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>`
      },
      bob: {
        back: `<path d="M62 96 C56 60 78 36 100 36 C124 36 146 60 138 96 C140 116 138 132 132 142 L122 142 C127 120 130 100 128 84 L72 84 C70 100 73 120 78 142 L68 142 C62 132 60 116 62 96 Z" fill="${c}" ${ink}/>`,
        front: `<path d="M68 86 C68 60 84 47 104 48 C121 49 132 62 132 84 C128 72 120 64 110 62 C102 70 92 78 80 82 C76 83 72 84 68 86 Z" fill="${c}" ${ink}/>
          <path d="M84 56 C96 50 112 50 124 58 M104 54 C112 58 120 64 126 74" stroke="${hi}" stroke-width="2" fill="none" opacity=".75"/>`
      },
      bun: {
        back: `<circle cx="100" cy="27" r="14" fill="${c}" stroke="${INK}" stroke-width="2"/>
          <path d="M90 22 C96 16 106 16 110 22" stroke="${hi}" stroke-width="2" fill="none" opacity=".7"/>`,
        front: `<path d="M68 88 C62 54 80 36 100 36 C122 36 138 54 132 88 C128 68 118 55 100 54 C82 55 72 68 68 88 Z" fill="${c}" ${ink}/>
          <path d="M80 48 C92 41 108 41 120 48" stroke="${hi}" stroke-width="2" fill="none" opacity=".8"/>`
      }
    };
    const h = H[p.hair] || H.slick;
    let out = h[layer] || '';
    return out;
  }

  /* ---------- clothes ---------- */
  function top(p, s, id) {
    const col = p.topColor || '#2a62c4';
    const dark = shade(col, -0.35);
    const ink = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`;
    const T = {
      tank: `<path d="${BODY}" fill="${s[0]}" ${ink}/>
        <path d="M58 200 C60 182 64 168 70 158 C80 166 90 170 100 170 C110 170 120 166 130 158 C136 168 140 182 142 200 Z" fill="${col}" ${ink}/>`,
      tee: `<path d="${BODY}" fill="${col}" ${ink}/>
        <path d="M82 153 C88 166 112 166 118 153" fill="none" stroke="${dark}" stroke-width="4"/>`,
      shirt: `<path d="${BODY}" fill="${col}" ${ink}/>
        <path d="M86 153 L100 182 L114 153 Z" fill="${s[0]}"/>
        <path d="M80 152 L92 180 L100 166 L90 150 Z M120 152 L108 180 L100 166 L110 150 Z" fill="${shade(col, 0.18)}" ${ink}/>`,
      suit: `<path d="${BODY}" fill="${col}" ${ink}/>
        <path d="M84 152 L100 198 L116 152 Z" fill="#eef2f6" stroke="${INK}" stroke-width="1.6"/>
        <path d="M97 160 L103 160 L105 196 L100 200 L95 196 Z" fill="${p.tie || '#7a1b25'}" stroke="${INK}" stroke-width="1.2"/>
        <path d="M80 154 L97 198 L88 200 L66 166 Z M120 154 L103 198 L112 200 L134 166 Z" fill="${dark}" ${ink}/>`,
      leather: `<path d="${BODY}" fill="${col}" ${ink}/>
        <path d="M86 154 C92 166 108 166 114 154 L114 200 L86 200 Z" fill="${p.innerColor || '#d9d4c7'}"/>
        <path d="M72 154 L90 190 L98 168 L86 150 Z M128 154 L110 190 L102 168 L114 150 Z" fill="${shade(col, 0.15)}" ${ink}/>
        <path d="M40 176 C46 184 50 192 52 200 M160 176 C154 184 150 192 148 200" stroke="${shade(col, 0.3)}" stroke-width="2" fill="none" opacity=".7"/>`,
      hoodie: `<path d="${BODY}" fill="${col}" ${ink}/>
        <path d="M70 156 C78 176 122 176 130 156 C124 148 76 148 70 156 Z" fill="${dark}" ${ink}/>
        <path d="M92 172 L90 192 M108 172 L110 192" stroke="#f3eee4" stroke-width="2" stroke-linecap="round"/>`,
      vest: `<path d="${BODY}" fill="#f5f2ea" ${ink}/>
        <path d="M30 186 C40 178 50 174 60 172 M170 186 C160 178 150 174 140 172" stroke="#c9c3b6" stroke-width="2" fill="none"/>
        <path d="M60 200 L66 167 L88 158 L100 194 L112 158 L134 167 L140 200 Z" fill="#17161a" ${ink}/>
        <path d="M70 172 C74 182 76 192 76 200 M130 172 C126 182 124 192 124 200" stroke="#3a3842" stroke-width="2" fill="none"/>
        <circle cx="96" cy="190" r="1.8" fill="#d8b660"/><circle cx="104" cy="190" r="1.8" fill="#d8b660"/>
        <path d="M88 152 L98 160 L88 168 Z M112 152 L102 160 L112 168 Z" fill="${p.tie || '#141414'}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <rect x="96.5" y="156.5" width="7" height="7" rx="2" fill="${p.tie || '#141414'}" stroke="${INK}" stroke-width="1.2"/>`
    };
    return (T[p.top] || T.tee) +
      `<path d="${BODY}" fill="url(#cs${id})" opacity=".55" style="mix-blend-mode:multiply" clip-path="url(#tc${id})"/>
      <path d="M10 200 C14 176 38 163 60 159 L54 200 Z" fill="url(#hx${id})" opacity=".3"/>`;
  }

  function accessories(p, id) {
    const a = p.extras || [];
    let out = '';
    if (a.includes('chain')) out += `<path d="M86 154 C90 172 110 172 114 154" fill="none" stroke="#e1b84f" stroke-width="2.4" stroke-dasharray="2.4 1.2"/>`;
    if (a.includes('hoops')) out += `<circle cx="63" cy="116" r="7" fill="none" stroke="#e1b84f" stroke-width="2.2"/><circle cx="137" cy="116" r="7" fill="none" stroke="#e1b84f" stroke-width="2.2"/>`;
    if (a.includes('stud')) out += `<circle cx="63.5" cy="110" r="2.2" fill="#f4f1e8" stroke="${INK}" stroke-width=".8"/><circle cx="136.5" cy="110" r="2.2" fill="#f4f1e8" stroke="${INK}" stroke-width=".8"/>`;
    if (a.includes('glasses')) {
      const lens = (cx, flip) => {
        const x = v => (flip ? 200 - v : v);
        return `<path d="M${x(76)} 86 C${x(80)} 84 ${x(93)} 84 ${x(96)} 87 C${x(97)} 94 ${x(94)} 101 ${x(87)} 101 C${x(80)} 101 ${x(75)} 95 ${x(76)} 86 Z" fill="url(#ln${id})" stroke="#c9a24a" stroke-width="1.6"/>`;
      };
      out += `<defs><linearGradient id="ln${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2633"/><stop offset=".6" stop-color="#2f5d73"/><stop offset="1" stop-color="#e59a5c"/></linearGradient></defs>
        ${lens(86, false)}${lens(114, true)}
        <path d="M96 87 C98 85 102 85 104 87" stroke="#c9a24a" stroke-width="1.6" fill="none"/>
        <path d="M76 86 L68 84 M124 86 L132 84" stroke="#c9a24a" stroke-width="1.6"/>
        <path d="M80 89 L86 95 M108 89 L114 95" stroke="#fff" stroke-width="1.6" opacity=".45"/>`;
    }
    return out;
  }

  /* ---------- whole figure ---------- */
  function figure(p, id) {
    const s = SKIN[p.skin] || SKIN.fair;
    const rim = shade((BG[p.bg] || BG.sunset)[0], 0.25);
    const sex = p.sex === 'f' ? 'f' : 'm';
    const ex = p.extras || [];
    const stubble = ex.includes('stubble') || ex.includes('beard');
    const beard = ex.includes('beard');
    return `
      <defs>
        <clipPath id="fc${id}"><path d="${FACE[sex]}"/></clipPath>
        <radialGradient id="sk${id}" cx=".62" cy=".38" r=".75"><stop offset="0" stop-color="${s[2]}"/><stop offset=".55" stop-color="${s[0]}"/><stop offset="1" stop-color="${shade(s[0], -0.12)}"/></radialGradient>
        <clipPath id="tc${id}"><path d="${BODY}"/></clipPath>
        <clipPath id="hc${id}"><path d="M60 20 H140 V60 C130 52 70 52 60 60 Z"/></clipPath>
        <linearGradient id="cs${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset=".55" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/>
        </linearGradient>
        <pattern id="hx${id}" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
          <line x1="0" y1="0" x2="0" y2="3.2" stroke="${INK}" stroke-width=".7"/>
        </pattern>
        <pattern id="st${id}" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="1.3" cy="1.3" r=".55" fill="${shade(p.hairColor || '#2a1a12', -0.2)}"/>
        </pattern>
      </defs>
      ${hair(p, 'back', id)}
      <path d="${NECK}" fill="${s[0]}" stroke="${LINE}" stroke-width="1.4"/>
      <path d="M83 128 C90 150 110 152 117 132 L117 152 C108 160 92 160 83 152 Z" fill="${s[1]}"/>
      <path d="M83 126 L83 166 C88 168 92 169 96 170 C92 156 88 140 83 126 Z" fill="url(#hx${id})" opacity=".3"/>
      ${top(p, s, id)}
      <g fill="${s[0]}" stroke="${LINE}" stroke-width="1.3">${EARS}</g>
      <path d="M66 92 C64 96 65 102 68 104 M134 92 C136 96 135 102 132 104" stroke="${s[1]}" stroke-width="1.4" fill="none"/>
      <path d="${FACE[sex]}" fill="url(#sk${id})"/>
      <g clip-path="url(#fc${id})">
        <path d="M56 44 C82 64 86 100 91 122 C95 138 101 147 112 156 L56 156 Z" fill="${s[1]}" opacity=".92" filter="url(#sb)"/>
        <path d="M56 58 C70 78 72 104 78 122 C83 134 90 144 98 152 L56 152 Z" fill="${shade(s[1], -0.2)}" opacity=".7" filter="url(#sb)"/>
        <path d="M74 112 C80 132 90 144 100 148 C92 146 82 138 76 126 Z" fill="${shade(s[1], -0.3)}" opacity=".7" filter="url(#sf)"/>
        <path d="M80 102 C84 108 88 112 92 114" stroke="${shade(s[1], -0.1)}" stroke-width="5" fill="none" opacity=".6" filter="url(#sb)"/>
        <ellipse cx="86.5" cy="89" rx="10" ry="6" fill="${shade(s[1], -0.1)}" opacity=".75" filter="url(#sb)"/>
        <ellipse cx="113.5" cy="89" rx="10" ry="6" fill="${s[1]}" opacity=".5" filter="url(#sb)"/>
        <path d="M118 108 C122 112 124 118 122 124" stroke="${s[1]}" stroke-width="5" fill="none" opacity=".35" filter="url(#sb)"/>
        <path d="M104 46 C118 48 127 60 129 74 C120 64 112 58 102 56 Z" fill="${s[2]}" opacity=".7" filter="url(#sb)"/>
        <ellipse cx="121" cy="101" rx="5" ry="9" fill="${s[2]}" opacity=".55" filter="url(#sb)"/>
        <ellipse cx="100" cy="142" rx="6" ry="3" fill="${s[2]}" opacity=".45" filter="url(#sb)"/>
        <path d="M130 62 C134 84 134 108 126 126" stroke="${rim}" stroke-width="3" fill="none" opacity=".75" filter="url(#sf)"/>
        ${stubble ? `<path d="M70 104 C73 126 86 146 100 150 C114 146 127 126 130 104 C124 116 113 121 100 121 C87 121 76 116 70 104 Z M88 121.6 C94 119.2 106 119.2 112 121.6 L112 125.2 L88 125.2 Z" fill="${p.hairColor || '#2a1a12'}" opacity="${beard ? 0.5 : 0.28}" filter="url(#sf)"/>` : ''}
        ${beard ? `<path d="M72 110 C76 130 88 148 100 150 C112 148 124 130 128 110 C122 122 112 128 100 128 C88 128 78 122 72 110 Z" fill="${p.hairColor || '#2a1a12'}" opacity=".8" filter="url(#sf)"/>` : ''}
      </g>
      <path d="${FACE[sex]}" fill="none" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>
      ${eyes(p, id)}${brows(p)}${nose(s)}${mouth(p, s)}
      ${hair(p, 'front', id)}
      ${accessories(p, id)}`;
  }

  function palm(x, y, sc, col) {
    const fronds = [[-34, -6], [-26, -18], [-12, -26], [6, -27], [22, -20], [32, -8], [-30, 6], [30, 8]]
      .map(([dx, dy]) => `M0 0 Q${dx * 0.5} ${dy * 0.9 - 6} ${dx} ${dy} Q${dx * 0.55} ${dy * 0.6} 0 0 Z`).join(' ');
    return `<g transform="translate(${x} ${y}) scale(${sc})" fill="${col}">
      <path d="M-2 0 C-3 40 -1 80 -4 130 L4 130 C3 80 3 40 2 0 Z"/><path d="${fronds}"/></g>`;
  }

  function background(p, id, w = 200, h = 200) {
    const [a, b] = BG[p.bg] || BG.sunset;
    const sil = shade(b, -0.35);
    return `<defs>
        <linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset=".75" stop-color="${a}"/><stop offset="1" stop-color="${shade(a, 0.2)}"/></linearGradient>
        <radialGradient id="gl${id}" cx=".7" cy=".7" r=".55"><stop offset="0" stop-color="#fff6d8" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg${id})"/>
      <rect width="${w}" height="${h}" fill="url(#gl${id})"/>
      <g opacity=".55">
        <path d="M0 150 L0 132 L14 132 L14 120 L26 120 L26 136 L40 136 L40 112 L50 112 L50 140 L150 140 L150 118 L162 118 L162 104 L172 104 L172 126 L186 126 L186 136 L200 136 L200 150 Z" fill="${shade(sil, 0.25)}"/>
        ${palm(30, 70, 0.9, sil)}${palm(178, 58, 1.05, sil)}${palm(158, 92, 0.6, shade(sil, 0.2))}
      </g>`;
  }

  function grain(id) {
    return `<rect width="200" height="200" fill="url(#vg${id})"/>
      <defs><radialGradient id="vg${id}" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>`;
  }

  /* headshot avatar: a faceless poster silhouette with a sunset rim light */
  function portrait(p, { view = '28 24 144 144' } = {}) {
    const id = 'a' + (uid++);
    const [a] = BG[p.bg] || BG.sunset;
    const rim = shade(a, 0.7);
    const glints = [];
    const ex = p.extras || [];
    if (ex.includes('hoops')) glints.push('<circle cx="63" cy="116" r="7" fill="none" stroke="#f3cf6a" stroke-width="2"/><circle cx="137" cy="116" r="7" fill="none" stroke="#f3cf6a" stroke-width="2"/>');
    if (ex.includes('glasses')) glints.push(`<path d="M77 87 C81 85 92 85 95.5 87.5 C96 93 93.5 99 87 99 C80.5 99 76.5 94 77 87 Z M123 87 C119 85 108 85 104.5 87.5 C104 93 106.5 99 113 99 C119.5 99 123.5 94 123 87 Z" fill="#1c2430" stroke="#c9a24a" stroke-width="1.2"/>
      <path d="M80 89 L86 95 M108 89 L114 95" stroke="${rim}" stroke-width="1.6" opacity=".9"/><path d="M95.5 87.5 C98 86 102 86 104.5 87.5" stroke="#c9a24a" stroke-width="1.2" fill="none"/>`);
    if (ex.includes('chain')) glints.push('<path d="M86 154 C90 172 110 172 114 154" fill="none" stroke="#f3cf6a" stroke-width="2" stroke-dasharray="2.4 1.2"/>');
    if (ex.includes('stud')) glints.push('<circle cx="63.5" cy="110" r="1.8" fill="#fff"/><circle cx="136.5" cy="110" r="1.8" fill="#fff"/>');
    return `<svg class="portrait" viewBox="${view}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="rm${id}"><feFlood flood-color="${rim}"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation=".6"/></filter>
        <filter id="dk${id}"><feFlood flood-color="#140f17"/><feComposite in2="SourceAlpha" operator="in"/></filter>
        <radialGradient id="hl${id}" cx=".5" cy=".42" r=".42"><stop offset="0" stop-color="#fff2d0" stop-opacity=".55"/><stop offset="1" stop-color="#fff2d0" stop-opacity="0"/></radialGradient>
      </defs>
      ${background(p, id)}
      <ellipse cx="100" cy="92" rx="70" ry="70" fill="url(#hl${id})"/>
      <g filter="url(#rm${id})" transform="translate(4 -2)">${figure(p, id + 'r')}</g>
      <g filter="url(#dk${id})">${figure(p, id + 'k')}</g>
      <path d="M131 66 C135 86 135 108 127 128" stroke="${rim}" stroke-width="1.4" fill="none" opacity=".5"/>
      ${glints.join('')}
      ${grain(id)}</svg>`;
  }

  /* Dealer standing behind the table, leaning in: top of the head, shoulders, waistcoat,
   * bow tie and both forearms coming forward to the table edge. No face. */
  function dealer(p) {
    const id = 'd' + (uid++);
    const s = SKIN[p.skin] || SKIN.fair;
    const hc = p.hairColor || '#2a1a12';
    const vest = p.vest || '#2a2830';
    const L = 'stroke="#1a120e" stroke-width="1.1" stroke-linejoin="round"';
    const shirt = `url(#sh${id})`;
    const hi = shade(hc, 0.4), lo = shade(hc, -0.35);
    /* long wavy hair falling over each shoulder (drawn over the shirt, under the head) */
    const locks = p.sex !== 'f' ? '' : [false, true].map(m => {
      const x = v => (m ? 240 - v : v);
      return `<path d="M${x(98)} 74 C${x(88)} 86 ${x(84)} 98 ${x(88)} 110 C${x(92)} 120 ${x(82)} 128 ${x(84)} 140 C${x(86)} 152 ${x(78)} 160 ${x(84)} 170
          C${x(92)} 166 ${x(98)} 158 ${x(100)} 148 C${x(102)} 136 ${x(108)} 128 ${x(106)} 116 C${x(104)} 104 ${x(110)} 94 ${x(108)} 82 Z" fill="${hc}" ${L}/>
        <path d="M${x(96)} 84 C${x(90)} 96 ${x(94)} 106 ${x(92)} 116 C${x(90)} 128 ${x(94)} 136 ${x(90)} 150 M${x(102)} 92 C${x(98)} 104 ${x(102)} 114 ${x(98)} 126 C${x(96)} 136 ${x(100)} 144 ${x(96)} 156"
          stroke="${hi}" stroke-width="1.2" fill="none" opacity=".7"/>
        <path d="M${x(88)} 112 C${x(92)} 122 ${x(86)} 132 ${x(88)} 142" stroke="${lo}" stroke-width="1.4" fill="none" opacity=".7"/>`;
    }).join('');
    const arm = m => {
      const x = v => (m ? 240 - v : v);
      return `<path d="M${x(72)} 104 C${x(56)} 114 ${x(50)} 132 ${x(58)} 150 C${x(64)} 162 ${x(76)} 172 ${x(90)} 182 L${x(118)} 182 C${x(104)} 170 ${x(94)} 158 ${x(90)} 144 C${x(86)} 130 ${x(86)} 118 ${x(90)} 110 Z" fill="${shirt}" ${L}/>
        <path d="M${x(62)} 130 C${x(66)} 146 ${x(76)} 160 ${x(92)} 172 M${x(74)} 124 C${x(76)} 140 ${x(84)} 154 ${x(98)} 166" stroke="#b9b2a4" stroke-width="1.5" fill="none" opacity=".8"/>
        <path d="M${x(56)} 140 C${x(66)} 142 ${x(78)} 140 ${x(88)} 134" stroke="${p.garter || '#7a1b25'}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    };
    let head = `<ellipse cx="120" cy="80" rx="25" ry="27" fill="${hc}" ${L}/>
      <ellipse cx="120" cy="80" rx="25" ry="27" fill="url(#hs${id})"/>`;
    if (p.hair === 'buzz') head = `<ellipse cx="120" cy="80" rx="24" ry="26" fill="${s[0]}" ${L}/><ellipse cx="120" cy="80" rx="24" ry="26" fill="${hc}" opacity=".78"/><ellipse cx="120" cy="80" rx="24" ry="26" fill="url(#hs${id})"/>`;
    else head += `<path d="M113 55 C111 70 111 90 115 105" stroke="${shade(hc, -0.4)}" stroke-width="1.3" fill="none"/>
      <path d="M101 64 C105 78 105 94 103 102 M107 58 C109 74 109 92 109 104 M121 54 C125 70 127 90 125 106 M129 56 C135 70 137 90 135 102 M137 62 C141 74 143 86 141 96"
        stroke="${shade(hc, 0.35)}" stroke-width=".9" fill="none" opacity=".55"/>`;
    if (p.hair === 'bun') head += `<circle cx="120" cy="68" r="12" fill="${hc}" ${L}/><circle cx="120" cy="68" r="12" fill="url(#hs${id})"/>`;
    if (p.sex === 'f') head += `<path d="M120 54 C119 70 119 90 120 106" stroke="${lo}" stroke-width="1.4" fill="none"/>
      <path d="M118 60 C108 66 102 76 100 90 M116 66 C108 74 104 84 104 98 M122 60 C132 66 138 76 140 90 M124 66 C132 74 136 84 136 98" stroke="${hi}" stroke-width="1" fill="none" opacity=".65"/>`;
    return `<svg class="dealer-body" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="sp${id}" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".32"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient>
        <linearGradient id="sh${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf8f1"/><stop offset=".6" stop-color="#e9e3d6"/><stop offset="1" stop-color="#bfb7a6"/></linearGradient>
        <linearGradient id="vs${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(vest, -0.45)}"/><stop offset=".5" stop-color="${vest}"/><stop offset="1" stop-color="${shade(vest, -0.45)}"/></linearGradient>
        <radialGradient id="hs${id}" cx=".45" cy=".22" r=".7"><stop offset="0" stop-color="#fff3d6" stop-opacity=".55"/><stop offset=".35" stop-color="#fff3d6" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
        <radialGradient id="ns${id}" cx=".5" cy=".2" r=".8"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="120" cy="80" rx="116" ry="96" fill="url(#sp${id})"/>
      <path d="M54 182 C54 140 62 112 82 101 C96 95 108 93 120 93 C132 93 144 95 158 101 C178 112 186 140 186 182 Z" fill="${shirt}" ${L}/>
      <path d="M80 182 L86 116 C95 110 105 108 113 110 L120 146 L127 110 C135 108 145 110 154 116 L160 182 Z" fill="url(#vs${id})" ${L}/>
      <path d="M94 120 C98 140 100 160 100 182 M146 120 C142 140 140 160 140 182" stroke="#3d3a46" stroke-width="1.4" fill="none"/>
      <path d="M86 118 C92 112 100 110 110 112 M154 118 C148 112 140 110 130 112" stroke="#d8b660" stroke-width="1" fill="none" opacity=".7"/>
      <circle cx="120" cy="156" r="1.9" fill="#d8b660"/><circle cx="120" cy="168" r="1.9" fill="#d8b660"/>
      <path d="M108 112 L118 117 L108 122 Z M132 112 L122 117 L132 122 Z" fill="${p.tie || '#141414'}" ${L}/>
      <rect x="116.5" y="114" width="7" height="6" rx="2" fill="${p.tie || '#141414'}" ${L}/>
      ${arm(false)}${arm(true)}
      <ellipse cx="120" cy="110" rx="28" ry="10" fill="url(#ns${id})"/>
      ${p.trim ? `<path d="M86 116 L80 182 M154 116 L160 182 M113 110 L120 146 L127 110" stroke="${p.trim}" stroke-width="1.6" fill="none" opacity=".9"/>` : ''}
      ${locks}
      <ellipse cx="95" cy="90" rx="3.4" ry="6" fill="${s[1]}" ${L}/>
      <ellipse cx="145" cy="90" rx="3.4" ry="6" fill="${s[1]}" ${L}/>
      ${head}
    </svg>`;
  }

  /* Dealer hands. The left one cradles the deck; the right one deals. */
  function hand(p, mirror) {
    const s = SKIN[p.skin] || SKIN.fair;
    const fingers = [16.5, 23.8, 31.1, 38.2].map((x, i) => {
      const len = [17, 20, 19, 15][i];
      return `<rect x="${x}" y="38" width="6.6" height="${len}" rx="3.3" fill="${s[0]}" stroke="${LINE}" stroke-width="1"/>
        <rect x="${x + 1.3}" y="${38 + len - 6}" width="4" height="4.6" rx="2" fill="${s[2]}" opacity=".85"/>`;
    }).join('');
    const deck = mirror ? `
      <g transform="rotate(-8 34 46)">
        ${[4, 3, 2, 1, 0].map(k => `<rect x="${14 + k * 0.5}" y="${30 - k * 0.9}" width="34" height="46" rx="3" fill="${k ? '#efece4' : '#c8202b'}" stroke="#7a1b1b" stroke-width=".7"/>`).join('')}
        <rect x="17" y="33" width="28" height="40" fill="none" stroke="#fff" stroke-width="1"/>
        <path d="M20 36 L42 70 M42 36 L20 70" stroke="#fff" stroke-width=".6" opacity=".7"/>
      </g>` : '';
    const g = `
      <rect x="13" y="1" width="32" height="16" rx="3" fill="#f5f2ea" stroke="${LINE}" stroke-width="1.2"/>
      <path d="M15 12 L43 12" stroke="#c9c3b6" stroke-width="2"/>
      <circle cx="40" cy="7" r="2" fill="#d8b660" stroke="${INK}" stroke-width=".8"/>
      <path d="M15 15 C13 27 13 36 15 43 L45 43 C47 35 47 26 44 15 Z" fill="${s[0]}" stroke="${LINE}" stroke-width="1.2" stroke-linejoin="round"/>
      ${deck}
      ${fingers}
      <path d="M44 22 C52 27 57 37 55 46 C54 51 49 51 47.5 47 C46 39 43 33 40 29 Z" fill="${s[0]}" stroke="${LINE}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M15 17 C14 27 14 36 16 43" stroke="${s[1]}" stroke-width="4" fill="none" opacity=".7"/>
      <path d="M38 22 C41 28 42 34 41 40" stroke="${s[2]}" stroke-width="2" fill="none" opacity=".8"/>`;
    return `<svg class="hand ${mirror ? 'hand-l' : 'hand-r'}" viewBox="0 0 60 80" aria-hidden="true">
      ${mirror ? `<g transform="translate(60 0) scale(-1 1)">${g}</g>` : g}</svg>`;
  }

  /* Plain player icon: grey silhouette in a white disc */
  function icon(p) {
    const f = p.sex === 'f';
    const hair = f
      ? '<path d="M28 50 C24 28 34 16 50 16 C66 16 76 28 72 50 C74 60 72 68 68 72 L62 70 C64 60 64 52 62 44 L38 44 C36 52 36 60 38 70 L32 72 C28 68 26 60 28 50 Z" fill="#2b2b30"/>'
      : '';
    return `<svg class="icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill="#f4f4f4"/>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#d6d6d6" stroke-width="2"/>
      ${hair}
      <ellipse cx="50" cy="40" rx="15" ry="18" fill="#2b2b30"/>
      <path d="M18 92 C20 72 32 62 50 62 C68 62 80 72 82 92 C72 98 28 98 18 92 Z" fill="#2b2b30"/>
    </svg>`;
  }

  function init() {
    if (document.getElementById('art-defs')) return;
    document.body.insertAdjacentHTML('afterbegin', `<svg id="art-defs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
      <filter id="sb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>
      <filter id="sf" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1"/></filter>
    </defs></svg>`);
  }

  /* Turn a photo into a poster-style illustration (square, 256px JPEG data URL).
   * Steps: centre/upper crop -> edge-preserving smoothing -> posterised tones
   * -> warm sunset grade -> dark ink lines on strong edges. */
  function posterize(file, size = 256) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = c.height = size;
          const g = c.getContext('2d');
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = Math.max(0, (img.height - side) * 0.25);
          g.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          URL.revokeObjectURL(url);
          resolve(posterizeCanvas(c));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function posterizeCanvas(c) {
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const src = g.getImageData(0, 0, W, H);
    const d = src.data;
    const lum = new Float32Array(W * H);
    // 1. smooth (two passes of a 3x3 average that ignores pixels across strong edges)
    let cur = new Float32Array(d.length);
    for (let i = 0; i < d.length; i++) cur[i] = d[i];
    for (let pass = 0; pass < 3; pass++) {
      const next = new Float32Array(cur.length);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        let r = 0, gg = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(W - 1, Math.max(0, x + dx)), yy = Math.min(H - 1, Math.max(0, y + dy));
          const j = (yy * W + xx) * 4;
          const diff = Math.abs(cur[j] - cur[i]) + Math.abs(cur[j + 1] - cur[i + 1]) + Math.abs(cur[j + 2] - cur[i + 2]);
          if (diff < 60) { r += cur[j]; gg += cur[j + 1]; b += cur[j + 2]; n++; }
        }
        next[i] = r / n; next[i + 1] = gg / n; next[i + 2] = b / n; next[i + 3] = 255;
      }
      cur = next;
    }
    for (let p = 0, i = 0; p < W * H; p++, i += 4) lum[p] = 0.3 * cur[i] + 0.59 * cur[i + 1] + 0.11 * cur[i + 2];
    // 2. posterise + grade
    const levels = 7;
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      let r = cur[i], gg = cur[i + 1], b = cur[i + 2];
      // contrast & saturation
      const l = lum[p];
      r = l + (r - l) * 1.35; gg = l + (gg - l) * 1.3; b = l + (b - l) * 1.3;
      r = (r - 128) * 1.18 + 128; gg = (gg - 128) * 1.15 + 128; b = (b - 128) * 1.12 + 128;
      // warm sunset grade: lift reds in highlights, push shadows towards purple
      const t = Math.max(0, Math.min(1, l / 255));
      r += 18 * t + 6; gg += 4 * t; b += -14 * t + 16 * (1 - t);
      const q = v => Math.round(Math.max(0, Math.min(255, v)) / 255 * (levels - 1)) / (levels - 1) * 255;
      // blend posterised and smooth for a painted (not flat) finish
      d[i] = q(r) * 0.65 + Math.max(0, Math.min(255, r)) * 0.35;
      d[i + 1] = q(gg) * 0.65 + Math.max(0, Math.min(255, gg)) * 0.35;
      d[i + 2] = q(b) * 0.65 + Math.max(0, Math.min(255, b)) * 0.35;
      d[i + 3] = 255;
    }
    // 3. ink lines from a Sobel edge map
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const L = (xx, yy) => lum[yy * W + xx];
      const gx = -L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1) + L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1);
      const gy = -L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1) + L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1);
      const m = Math.sqrt(gx * gx + gy * gy);
      if (m > 70) {
        const k = Math.min(1, (m - 70) / 90) * 0.85;
        const i = (y * W + x) * 4;
        d[i] = d[i] * (1 - k) + 26 * k; d[i + 1] = d[i + 1] * (1 - k) + 18 * k; d[i + 2] = d[i + 2] * (1 - k) + 14 * k;
      }
    }
    g.putImageData(src, 0, 0);
    // 4. soft vignette
    const v = g.createRadialGradient(W / 2, H * 0.45, W * 0.35, W / 2, H / 2, W * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(40,10,30,.45)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    return c.toDataURL('image/jpeg', 0.86);
  }

  /* ---------- room backdrops (original scenes), returned as CSS background values ---------- */
  const svgURL = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  function palmTree(x, y, h, col, lean = 0) {
    const top = `${x + lean} ${y - h}`;
    const fr = [[-46, -4], [-38, -20], [-20, -32], [4, -36], [26, -28], [42, -14], [46, 4], [-42, 10]]
      .map(([dx, dy]) => `M${top} q${dx * 0.5} ${dy - 10} ${dx} ${dy + 6} q${-dx * 0.35} ${-dy * 0.2 - 4} ${-dx} ${-dy - 6} Z`).join(' ');
    return `<path d="M${x - 3} ${y} C${x - 2} ${y - h * 0.5} ${x + lean * 0.6 - 2} ${y - h * 0.8} ${x + lean - 1.5} ${y - h} L${x + lean + 1.5} ${y - h} C${x + lean * 0.6 + 2} ${y - h * 0.8} ${x + 2} ${y - h * 0.5} ${x + 3} ${y} Z" fill="${col}"/>
      <path d="${fr}" fill="${col}"/>`;
  }

  const SCENES = {
    sunset: () => svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b3a8a"/><stop offset=".35" stop-color="#e2667a"/><stop offset=".62" stop-color="#ffb070"/><stop offset=".8" stop-color="#ffd59a"/><stop offset="1" stop-color="#7a3d52"/></linearGradient>
      <radialGradient id="s"><stop offset="0" stop-color="#fff4d0"/><stop offset=".4" stop-color="#ffd27a" stop-opacity=".8"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="800" fill="url(#k)"/>
      <circle cx="200" cy="470" r="150" fill="url(#s)"/><circle cx="200" cy="470" r="46" fill="#fff0c8" opacity=".85"/>
      <path d="M0 520 L0 470 L30 470 L30 440 L70 440 L70 480 L110 480 L110 420 L140 420 L140 495 L260 495 L260 430 L300 430 L300 455 L340 455 L340 410 L370 410 L370 470 L400 470 L400 520 Z" fill="#8a4a63" opacity=".75"/>
      <rect y="520" width="400" height="280" fill="#3b2236"/>
      <path d="M150 800 L196 520 L204 520 L250 800 Z" fill="#4c2c44"/>
      ${palmTree(40, 560, 330, '#2c1428', 18)}${palmTree(96, 540, 250, '#3a1c33', -10)}
      ${palmTree(330, 560, 360, '#2c1428', -22)}${palmTree(372, 545, 270, '#3a1c33', 8)}
    </svg>`),
    skyline: () => {
      let b = '';
      const xs = [0, 34, 60, 100, 128, 170, 205, 240, 270, 310, 340, 372];
      xs.forEach((x, i) => {
        const h = 120 + ((i * 53) % 170), w = 30 + ((i * 17) % 18);
        b += `<rect x="${x}" y="${600 - h}" width="${w}" height="${h + 200}" fill="#1c1236"/>`;
        for (let wy = 610 - h; wy < 590; wy += 14) for (let wx = x + 5; wx < x + w - 5; wx += 9)
          if (((wx * 7 + wy * 3) % 5) < 2) b += `<rect x="${wx}" y="${wy}" width="4" height="6" fill="#ffd78a" opacity=".7"/>`;
      });
      return svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1440"/><stop offset=".45" stop-color="#7a3a8e"/><stop offset=".7" stop-color="#f08aa0"/><stop offset="1" stop-color="#2a1430"/></linearGradient>
        <filter id="g"><feGaussianBlur stdDeviation="3"/></filter></defs>
        <rect width="400" height="800" fill="url(#k)"/>
        ${b}
        <rect x="60" y="430" width="70" height="16" rx="3" fill="none" stroke="#ff5fa8" stroke-width="3" filter="url(#g)"/>
        <rect x="60" y="430" width="70" height="16" rx="3" fill="none" stroke="#ffc2e0" stroke-width="1.2"/>
        <circle cx="300" cy="410" r="9" fill="none" stroke="#5fe3ff" stroke-width="3" filter="url(#g)"/>
        <circle cx="300" cy="410" r="9" fill="none" stroke="#d0f7ff" stroke-width="1.2"/>
        <rect y="600" width="400" height="200" fill="#120c22"/>
      </svg>`);
    },
    neon: () => svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <defs><radialGradient id="k" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#1d3a8a"/><stop offset=".6" stop-color="#0d1a4a"/><stop offset="1" stop-color="#050a20"/></radialGradient>
      <filter id="g"><feGaussianBlur stdDeviation="4"/></filter></defs>
      <rect width="400" height="800" fill="url(#k)"/>
      ${[150, 210, 270].map((ry, i) => `<ellipse cx="200" cy="${120 + i * 30}" rx="${260 + i * 40}" ry="${ry * 0.35}" fill="none" stroke="#3ab8ff" stroke-width="5" opacity="${0.55 - i * 0.12}" filter="url(#g)"/>
        <ellipse cx="200" cy="${120 + i * 30}" rx="${260 + i * 40}" ry="${ry * 0.35}" fill="none" stroke="#bfe9ff" stroke-width="1.2" opacity="${0.6 - i * 0.15}"/>`).join('')}
      ${[40, 120, 280, 360].map(x => `<rect x="${x - 10}" y="60" width="20" height="130" rx="6" fill="#0a1236"/><ellipse cx="${x}" cy="60" rx="18" ry="6" fill="#58c8ff" opacity=".6" filter="url(#g)"/>`).join('')}
      <path d="M0 420 C120 380 280 380 400 420 L400 800 L0 800 Z" fill="#0a1236" opacity=".8"/>
    </svg>`),
    lounge: () => svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0a0c"/><stop offset=".5" stop-color="#5a1418"/><stop offset="1" stop-color="#1a0606"/></linearGradient>
      <filter id="g"><feGaussianBlur stdDeviation="6"/></filter></defs>
      <rect width="400" height="800" fill="url(#k)"/>
      ${[[40, 80, 22], [110, 140, 14], [330, 90, 26], [270, 170, 12], [370, 230, 16], [60, 240, 12], [200, 60, 10]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffb35a" opacity=".45" filter="url(#g)"/>`).join('')}
      <path d="M-20 360 C40 300 120 290 160 330 L160 420 L-20 420 Z" fill="#7a1e22"/><path d="M-20 360 C40 300 120 290 160 330" stroke="#d8a14a" stroke-width="3" fill="none"/>
      <path d="M420 360 C360 300 280 290 240 330 L240 420 L420 420 Z" fill="#7a1e22"/><path d="M420 360 C360 300 280 290 240 330" stroke="#d8a14a" stroke-width="3" fill="none"/>
      <rect y="420" width="400" height="380" fill="#1c0808"/>
    </svg>`),
    carpet: () => null
  };

  function scene(name) {
    const f = SCENES[name];
    return f ? f() : null;
  }

  /* load a photo, crop to a portrait 3:4 from the top, resize; returns JPEG data URL */
  function dealerPhoto(file, w = 480) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const h = Math.round(w * 4 / 3);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        const scale = Math.max(w / img.width, h / img.height);
        const sw = w / scale, sh = h / scale;
        const sx = (img.width - sw) / 2, sy = Math.max(0, Math.min(img.height - sh, (img.height - sh) * 0.1));
        g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  return { dealerPhoto, SKIN, BG, portrait, icon, dealer, hand, shade, init, posterize, posterizeCanvas, scene, SCENES: Object.keys(SCENES) };
})();

/* ---------- the cast (all fictional) ---------- */
const DEALERS = {
  scarlett: { name: 'Scarlett', sex: 'f', skin: 'light', hair: 'long', hairColor: '#d9a94e', vest: '#3b2460', trim: '#d8b660', tie: '#1a1020', garter: '#3b2460' },
  rosie: { name: 'Rosie', sex: 'f', skin: 'fair', hair: 'long', hairColor: '#8a3a1c', vest: '#1c1b22', trim: '#c9a24a', tie: '#141414', garter: '#7a1b25' },
  nina: { name: 'Nina', sex: 'f', skin: 'tan', hair: 'long', hairColor: '#21150f', vest: '#5a1626', trim: '#d8b660', tie: '#141414', garter: '#5a1626' }
};

const CHARACTERS = [
  { name: 'Lucky Lou', sex: 'm', skin: 'fair', hair: 'slick', hairColor: '#3a2618', top: 'shirt', topColor: '#d9d4c8', extras: ['stubble', 'chain'], mood: 'smirk', bg: 'sunset', eyes: '#4a6a7a' },
  { name: 'Vegas Vi', sex: 'f', skin: 'light', hair: 'long', hairColor: '#e2b660', top: 'tank', topColor: '#f06aa0', extras: ['glasses', 'hoops'], bg: 'peach', lips: '#c4485a' },
  { name: 'The Duke', sex: 'm', skin: 'brown', hair: 'crop', hairColor: '#1a1210', top: 'suit', topColor: '#5a1f2c', tie: '#d8b660', extras: ['beard'], mood: 'stern', bg: 'lilac' },
  { name: 'Ruby', sex: 'f', skin: 'olive', hair: 'bob', hairColor: '#191314', top: 'tee', topColor: '#c8283a', extras: ['stud'], bg: 'teal', lips: '#9e2335', eyes: '#3a2416' },
  { name: 'Frankie', sex: 'm', skin: 'olive', hair: 'buzz', hairColor: '#2a1d16', top: 'leather', topColor: '#3b2a22', extras: ['stubble'], mood: 'stern', bg: 'sky' },
  { name: 'Dolores', sex: 'f', skin: 'deep', hair: 'bun', hairColor: '#120d0c', top: 'hoodie', topColor: '#e0a526', extras: ['hoops'], bg: 'mint', lips: '#7e2f2a', eyes: '#2a1810' },
  { name: 'Ace', sex: 'm', skin: 'light', hair: 'crop', hairColor: '#b5562a', top: 'tee', topColor: '#2a8f8a', extras: ['stubble'], mood: 'smirk', bg: 'dusk', eyes: '#3d6b4f' },
  { name: 'Marisol', sex: 'f', skin: 'tan', hair: 'long', hairColor: '#2a1712', top: 'shirt', topColor: '#f2efe6', extras: ['hoops'], bg: 'lilac', lips: '#a33a3f', eyes: '#3a2416' },
  { name: 'Big Sal', sex: 'm', skin: 'fair', hair: 'balding', hairColor: '#4a3426', top: 'suit', topColor: '#2c3138', tie: '#2a62c4', extras: ['beard'], mood: 'stern', bg: 'peach', eyes: '#3a2a20' },
  { name: 'Jojo', sex: 'm', skin: 'tan', hair: 'fade', hairColor: '#17110e', top: 'hoodie', topColor: '#3b4fb8', extras: ['stud'], bg: 'sunset', eyes: '#2a1810' }
];
