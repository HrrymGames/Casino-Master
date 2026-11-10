/* App shell: title screen, save slots, lobby and game routing */
'use strict';

const GAME_ART = {
  blackjack: () => `<div class="tile-art cards-fan">${Cards.el({ r: 1, s: 'S' }).outerHTML}${Cards.el({ r: 13, s: 'H' }).outerHTML}</div>`,
  kaboo: () => `<div class="tile-art cards-grid">${[0, 1, 2, 3].map(i => Cards.el({ r: 7, s: 'H' }, i === 3).outerHTML).join('')}</div>`,
  hearts: () => `<div class="tile-art cards-fan">${Cards.el({ r: 12, s: 'S' }).outerHTML}${Cards.el({ r: 1, s: 'H' }).outerHTML}</div>`,
  hilo: () => `<div class="tile-art hilo-art"><span class="arr">▲</span>${Cards.el({ r: 8, s: 'D' }).outerHTML}<span class="arr">▼</span></div>`,
  roulette: () => `<div class="tile-art"><canvas class="mini-wheel" width="160" height="160"></canvas></div>`
};

const GAMES = {
  blackjack: { name: 'Blackjack', blurb: 'Beat the dealer to 21', make: r => new Blackjack(r) },
  kaboo: { name: 'Kaboo', blurb: 'Memory card game · win the pot', make: r => new Kaboo(r) },
  hearts: { name: 'Hearts', blurb: 'Dodge the Queen of Spades', make: r => new Hearts(r) },
  hilo: { name: 'Higher or Lower', blurb: 'Ten cards · cash out any time', make: r => new HiLo(r) },
  roulette: { name: 'Roulette', blurb: 'European single zero', make: r => new Roulette(r) }
};

const App = {
  game: null,

  start() {
    Store.load();
    Cards.injectSprite();
    Art.init();
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    this.go('title');
  },

  async go(screen, arg) {
    if (this.game) { this.game.destroy(); this.game = null; }
    $('#overlay').innerHTML = '';
    const root = $('#screen');
    root.innerHTML = '';
    root.className = '';
    this[screen](root, arg);
    window.scrollTo(0, 0);
  },

  /* ---------- title ---------- */
  title(root) {
    const cur = Store.current;
    root.innerHTML = `<div class="screen title-screen deco-bg">
      <div class="marquee">
        <div class="bulbs">${'<i></i>'.repeat(26)}</div>
        <div class="marquee-inner">
          <div class="mq-top">★ The ★</div>
          <div class="mq-name">CASINO<br>MASTER</div>
          <div class="mq-sub">Blackjack · Kaboo · Hearts · Hi-Lo · Roulette</div>
        </div>
      </div>
      <div class="title-art">
        ${Cards.el({ r: 1, s: 'S' }).outerHTML}${Cards.el({ r: 13, s: 'H' }).outerHTML}${Cards.el({ r: 12, s: 'D' }).outerHTML}
        <div class="title-chips">${UI.chip(100)}${UI.chip(500)}${UI.chip(1000)}</div>
      </div>
      <div class="title-menu">
        ${cur ? `<button class="btn gold big js-continue">Continue · ${esc(cur.name)}<small>${money(cur.balance)}</small></button>` : ''}
        <button class="btn ${cur ? '' : 'gold'} big js-new">New Game</button>
        <button class="btn big js-load" ${Store.data.saves.length ? '' : 'disabled'}>Load Game</button>
      </div>
      <div class="title-foot">Play money only · every new game starts with ${money(STARTING_BANKROLL)}</div>
    </div>`;
    const bulbs = $$('.bulbs i', root);
    bulbs.forEach((b, i) => {
      // distribute bulbs evenly around the sign's perimeter (as fractions of width/height)
      const t = i / bulbs.length * 4;
      let x, y;
      if (t < 1) { x = t; y = 0; } else if (t < 2) { x = 1; y = t - 1; } else if (t < 3) { x = 3 - t; y = 1; } else { x = 0; y = 4 - t; }
      b.style.left = `calc(${x * 100}% - 4px)`;
      b.style.top = `calc(${y * 100}% - 4px)`;
      b.style.setProperty('--d', (i % 3) * 0.33 + 's');
    });
    if (cur) $('.js-continue', root).onclick = () => { Sound.click(); Store.select(cur.id); this.go('lobby'); };
    $('.js-new', root).onclick = () => { Sound.click(); this.newGame(); };
    $('.js-load', root).onclick = () => { Sound.click(); this.go('load'); };
  },

  async newGame() {
    const name = await UI.modal({
      title: 'New Game',
      html: `<p>You'll start with <b>${money(STARTING_BANKROLL)}</b>. Work it up — or lose the lot.</p>
        <label class="field"><span>Player name</span><input type="text" maxlength="18" class="js-name" placeholder="High Roller" autocomplete="off" autocapitalize="words"></label>`,
      buttons: [{ label: 'Cancel', value: null }, { label: 'Start', cls: 'gold', value: '__ok' }],
      onMount: (m, close) => {
        const inp = $('.js-name', m);
        setTimeout(() => inp.focus(), 250);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { m.dataset.name = inp.value; close('__ok'); } });
        inp.addEventListener('input', () => { m.dataset.name = inp.value; });
        this._nameModal = m;
      }
    });
    if (name !== '__ok') return;
    const look = await UI.pickCharacter({ avatar: randInt(2) }) || { avatar: 0, photo: null };
    const save = Store.newSave(this._nameModal.dataset.name || '');
    save.avatar = look.avatar; save.photo = look.photo;
    Store.persist();
    Sound.win();
    UI.banner(`Welcome, ${esc(save.name)}!`, 'gold', 1300);
    this.go('lobby');
  },

  /* ---------- load ---------- */
  load(root) {
    const saves = Store.saves;
    root.innerHTML = `<div class="screen list-screen deco-bg">
      <header class="topbar"><button class="tb-btn js-back">${ICONS.back}</button><div class="tb-title">Load Game</div></header>
      <div class="save-list">
        ${saves.length ? saves.map(s => `
          <div class="save-row ${s.balance < 10 ? 'bust' : ''}" data-id="${s.id}">
            ${UI.avatar(Object.assign({}, CHARACTERS[s.avatar || 0], { photo: s.photo }), 'save-av')}
            <div class="save-main">
              <div class="save-name">${esc(s.name)}</div>
              <div class="save-meta">Played ${timeAgo(s.updated)} · ${s.stats.rounds} rounds · Peak ${money(s.stats.peak)}</div>
            </div>
            <div class="save-bal ${s.balance >= STARTING_BANKROLL ? 'pos' : 'neg'}">${s.balance < 10 ? 'BUST' : money(s.balance)}</div>
            <button class="tb-btn js-del" aria-label="Delete">${ICONS.trash}</button>
          </div>`).join('') : '<p class="empty">No saved games yet.</p>'}
      </div>
      <div class="list-foot"><button class="btn gold js-new">+ New Game</button></div>
    </div>`;
    $('.js-back', root).onclick = () => { Sound.click(); this.go('title'); };
    $('.js-new', root).onclick = () => { Sound.click(); this.newGame(); };
    $('.save-list', root).addEventListener('click', async e => {
      const row = e.target.closest('.save-row');
      if (!row) return;
      const s = Store.data.saves.find(x => x.id === row.dataset.id);
      if (e.target.closest('.js-del')) {
        if (await UI.confirm('Delete save?', `Delete <b>${esc(s.name)}</b> (${money(s.balance)})? This can't be undone.`, 'Delete')) {
          Store.remove(s.id);
          this.go('load');
        }
        return;
      }
      Sound.click();
      Store.select(s.id);
      this.go('lobby');
    });
  },

  /* ---------- lobby ---------- */
  lobby(root) {
    const s = Store.current;
    if (!s) return this.go('title');
    const st = s.stats;
    const net = s.balance - STARTING_BANKROLL;
    root.innerHTML = `<div class="screen lobby deco-bg">
      <header class="topbar">
        <button class="tb-btn js-back">${ICONS.back}</button>
        <div class="tb-title">${esc(s.name)}</div>
        <div class="tb-bal"><span class="tb-lbl">Bank</span><span class="js-balance">${money(s.balance)}</span></div>
        <button class="tb-btn js-sound">${Store.data.settings.sound ? ICONS.soundOn : ICONS.soundOff}</button>
      </header>
      <div class="lobby-scroll">
        <button class="player-card js-look">${UI.avatar(UI.playerChar(), 'big')}
          <div><div class="pc-name">${esc(s.name)}</div><div class="pc-sub">Tap to change your look</div></div></button>
        <div class="lobby-stats">
          <div><span>Profit</span><b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${money(net)}</b></div>
          <div><span>Peak</span><b>${money(st.peak)}</b></div>
          <div><span>Biggest win</span><b>${money(st.biggestWin)}</b></div>
          <div><span>Rounds</span><b>${st.rounds}</b></div>
        </div>
        <div class="game-grid">
          ${Object.entries(GAMES).map(([k, g]) => `
            <button class="game-tile tile-${k}" data-game="${k}">
              ${GAME_ART[k]()}
              <div class="tile-name">${g.name}</div>
              <div class="tile-blurb">${g.blurb}</div>
              ${st.byGame[k] ? `<div class="tile-net ${st.byGame[k].net >= 0 ? 'pos' : 'neg'}">${st.byGame[k].net >= 0 ? '+' : ''}${money(st.byGame[k].net)}</div>` : ''}
            </button>`).join('')}
        </div>
        <div class="history">
          <h3>Recent activity</h3>
          ${s.history.length ? s.history.slice(0, 12).map(h => `
            <div class="hist-row"><span class="hist-game">${GAMES[h.game] ? GAMES[h.game].name : 'Bank'}</span>
              <span class="hist-text">${h.text}</span>
              <b class="${h.net > 0 ? 'pos' : h.net < 0 ? 'neg' : ''}">${h.net > 0 ? '+' : ''}${h.net ? money(h.net) : '—'}</b></div>`).join('') : '<p class="empty">Nothing yet — pick a table!</p>'}
        </div>
        <div class="settings-row">
          <label class="toggle"><input type="checkbox" class="js-haptics" ${Store.data.settings.haptics ? 'checked' : ''}><span></span>Haptics</label>
          <button class="btn small js-saves">Switch save</button>
        </div>
      </div>
    </div>`;
    UI.bindTopbar(root, { onBack: () => this.go('title') });
    $('.js-saves', root).onclick = () => { Sound.click(); this.go('load'); };
    $('.js-look', root).onclick = async () => {
      Sound.click();
      const look = await UI.pickCharacter({ avatar: s.avatar, photo: s.photo });
      if (!look) return;
      s.avatar = look.avatar; s.photo = look.photo;
      Store.persist();
      this.go('lobby');
    };
    $('.js-haptics', root).onchange = e => Store.setting('haptics', e.target.checked);
    const mw = $('.mini-wheel', root);
    if (mw) Roulette.drawWheel(mw, isLandscape() ? 110 : 96);
    $('.game-grid', root).addEventListener('click', e => {
      const t = e.target.closest('.game-tile');
      if (!t) return;
      Sound.click();
      if (Bank.balance < 10) return this.bust();
      this.go('play', t.dataset.game);
    });
    if (Bank.balance < 10) setTimeout(() => this.bust(), 400);
  },

  async bust() {
    const s = Store.current;
    const r = await UI.modal({
      title: 'Bust!',
      html: `<p>You're out of money, ${esc(s.name)}. The house always wins… this time.</p><p>Peak bankroll: <b>${money(s.stats.peak)}</b></p>`,
      buttons: [{ label: 'Title screen', value: 'title' }, { label: `Restart with ${money(STARTING_BANKROLL)}`, cls: 'gold', value: 'restart' }]
    });
    if (r === 'restart') { Store.restart(s.id); this.go('lobby'); }
    else this.go('title');
  },

  /* ---------- game ---------- */
  play(root, key) {
    const g = GAMES[key];
    root.className = 'in-game';
    this.game = g.make(root);
    this.game.key = key;
    this.game.mount();
    // a different room each time you sit down
    const room = root.querySelector('.game');
    const name = pick(Art.SCENES);
    const bg = Art.scene(name);
    if (room && bg) {
      room.dataset.scene = name;
      room.style.background = `radial-gradient(ellipse 120% 90% at 50% 45%, transparent 45%, rgba(0,0,0,.6) 100%), ${bg} center top / cover no-repeat, #0b0a14`;
    }
  },

  async leaveGame() {
    const g = this.game;
    if (g && g.busy && g.busy()) {
      const ok = await UI.confirm('Leave the table?', 'A round is in progress — leaving now forfeits your stake.', 'Leave');
      if (!ok) return;
      if (g.forfeit) g.forfeit();
    }
    this.go('lobby');
  }
};

window.addEventListener('DOMContentLoaded', () => App.start());
