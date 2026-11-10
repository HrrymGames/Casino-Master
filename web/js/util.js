/* Small shared helpers */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function round2(n) { return Math.round(n * 100) / 100; }

function money(n) {
  n = round2(n);
  const neg = n < 0;
  const a = Math.abs(n);
  const whole = Number.isInteger(a);
  const s = a.toLocaleString('en-GB', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  return (neg ? '-£' : '£') + s;
}

function shortMoney(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n % 1e3 ? 1 : 0).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
}

/* crypto-quality random integer in [0, n) */
function randInt(n) {
  if (window.crypto && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  }
  return Math.floor(Math.random() * n);
}

function chance(p) { return randInt(1000000) < p * 1000000; }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pick(arr) { return arr[randInt(arr.length)]; }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isLandscape() { return window.matchMedia('(orientation: landscape)').matches; }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' hr' + (h > 1 ? 's' : '') + ' ago';
  const d = Math.floor(h / 24);
  return d + ' day' + (d > 1 ? 's' : '') + ' ago';
}

/* Animate an element so that it appears to fly from `from` (element or rect) to its current spot */
function flyFrom(elm, from, opts = {}) {
  if (!elm || !from) return Promise.resolve();
  const a = from.getBoundingClientRect ? from.getBoundingClientRect() : from;
  const b = elm.getBoundingClientRect();
  if (!b.width || !a.width) return Promise.resolve();
  const dx = (a.left + a.width / 2) - (b.left + b.width / 2);
  const dy = (a.top + a.height / 2) - (b.top + b.height / 2);
  const s = opts.scale != null ? opts.scale : a.width / b.width;
  const rot = opts.rotate != null ? opts.rotate : -10;
  const anim = elm.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${rot}deg)`, opacity: opts.fadeIn ? 0 : 1 },
    { transform: 'none', opacity: 1 }
  ], { duration: opts.duration || 380, easing: 'cubic-bezier(.2,.75,.3,1)' });
  return anim.finished.catch(() => {});
}

/* Animate element towards a target and resolve (element is not moved in the DOM) */
function flyTo(elm, to, opts = {}) {
  if (!elm || !to) return Promise.resolve();
  const a = elm.getBoundingClientRect();
  const b = to.getBoundingClientRect ? to.getBoundingClientRect() : to;
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
  const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  const s = opts.scale != null ? opts.scale : 1;
  const anim = elm.animate([
    { transform: 'none', opacity: 1 },
    { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${opts.rotate || 0}deg)`, opacity: opts.fadeOut ? 0 : 1 }
  ], { duration: opts.duration || 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  return anim.finished.catch(() => {});
}
