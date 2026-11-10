/* Save games, bankroll and settings.
 * Data is kept in localStorage and, when running inside the iOS app,
 * mirrored to a file in the app's container through the native bridge. */
'use strict';

const STARTING_BANKROLL = 10000;

const Native = {
  get available() {
    return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.casino);
  },
  post(msg) {
    try { if (this.available) window.webkit.messageHandlers.casino.postMessage(msg); } catch (e) { /* ignore */ }
  },
  haptic(style = 'light') {
    if (!Store.data.settings.haptics) return;
    if (this.available) this.post({ type: 'haptic', style });
    else if (navigator.vibrate) navigator.vibrate(style === 'heavy' ? 30 : 10);
  }
};

const Store = {
  KEY: 'casino-master-v1',
  data: null,

  blank() {
    return { version: 1, updated: 0, current: null, saves: [], settings: { sound: true, haptics: true, showCount: false } };
  },

  load() {
    let best = null;
    const candidates = [];
    try { if (window.__NATIVE_SAVE__) candidates.push(JSON.parse(window.__NATIVE_SAVE__)); } catch (e) { /* corrupt */ }
    try { const ls = localStorage.getItem(this.KEY); if (ls) candidates.push(JSON.parse(ls)); } catch (e) { /* corrupt */ }
    for (const c of candidates) {
      if (c && Array.isArray(c.saves) && (!best || (c.updated || 0) > (best.updated || 0))) best = c;
    }
    this.data = Object.assign(this.blank(), best || {});
    this.data.settings = Object.assign(this.blank().settings, this.data.settings || {});
  },

  persist() {
    this.data.updated = Date.now();
    const json = JSON.stringify(this.data);
    try { localStorage.setItem(this.KEY, json); } catch (e) { /* storage full / private */ }
    Native.post({ type: 'save', data: json });
  },

  get saves() { return this.data.saves.slice().sort((a, b) => b.updated - a.updated); },

  get current() { return this.data.saves.find(s => s.id === this.data.current) || null; },

  newSave(name) {
    const save = {
      id: 's' + Date.now().toString(36) + randInt(1e6).toString(36),
      name: (name || '').trim().slice(0, 18) || 'High Roller',
      balance: STARTING_BANKROLL,
      created: Date.now(),
      updated: Date.now(),
      stats: { rounds: 0, wins: 0, losses: 0, biggestWin: 0, peak: STARTING_BANKROLL, wagered: 0, byGame: {} },
      history: []
    };
    this.data.saves.push(save);
    this.data.current = save.id;
    this.persist();
    return save;
  },

  select(id) {
    this.data.current = id;
    const s = this.current;
    if (s) s.updated = Date.now();
    this.persist();
  },

  remove(id) {
    this.data.saves = this.data.saves.filter(s => s.id !== id);
    if (this.data.current === id) this.data.current = null;
    this.persist();
  },

  restart(id) {
    const s = this.data.saves.find(x => x.id === id);
    if (!s) return;
    s.balance = STARTING_BANKROLL;
    s.stats.restarts = (s.stats.restarts || 0) + 1;
    s.history.unshift({ t: Date.now(), game: 'bank', text: 'Restarted with ' + money(STARTING_BANKROLL), net: 0 });
    this.persist();
  },

  setting(key, value) {
    this.data.settings[key] = value;
    this.persist();
  }
};

/* Bankroll operations for the active save */
const Bank = {
  get balance() { const s = Store.current; return s ? s.balance : 0; },

  canAfford(amount) { return this.balance + 1e-9 >= amount; },

  /* remove a stake from the bankroll; returns false if not enough money */
  take(amount) {
    const s = Store.current;
    if (!s || amount <= 0 || !this.canAfford(amount)) return false;
    s.balance = round2(s.balance - amount);
    s.stats.wagered = round2((s.stats.wagered || 0) + amount);
    s.updated = Date.now();
    Store.persist();
    UI.updateBalance();
    return true;
  },

  give(amount) {
    const s = Store.current;
    if (!s || amount <= 0) return;
    s.balance = round2(s.balance + amount);
    if (s.balance > s.stats.peak) s.stats.peak = s.balance;
    s.updated = Date.now();
    Store.persist();
    UI.updateBalance();
  },

  /* record the result of a finished round: net = returned - staked */
  record(game, net, text) {
    const s = Store.current;
    if (!s) return;
    net = round2(net);
    const st = s.stats;
    st.rounds++;
    if (net > 0) st.wins++;
    else if (net < 0) st.losses++;
    if (net > st.biggestWin) st.biggestWin = net;
    const g = st.byGame[game] || (st.byGame[game] = { rounds: 0, net: 0 });
    g.rounds++;
    g.net = round2(g.net + net);
    s.history.unshift({ t: Date.now(), game, text: text || '', net });
    if (s.history.length > 60) s.history.length = 60;
    s.updated = Date.now();
    Store.persist();
  }
};
