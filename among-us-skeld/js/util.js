/* Utilitários gerais: aleatoriedade, matemática, DOM e armazenamento local. */
(function () {
  'use strict';
  const AU = (window.AU = window.AU || {});
  const U = {};

  U.rand = () => Math.random();
  U.rf = (a, b) => a + Math.random() * (b - a);
  U.rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  U.d2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  U.weighted = (items, wf) => {
    let tot = 0;
    const ws = items.map((it) => {
      const w = Math.max(0, wf(it));
      tot += w;
      return w;
    });
    if (tot <= 0) return null;
    let r = Math.random() * tot;
    for (let i = 0; i < items.length; i++) {
      r -= ws[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };

  U.norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

  U.fmtTime = (s) => {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  U.cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  U.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  U.clone = (o) => JSON.parse(JSON.stringify(o));

  U.merge = function merge(target, src) {
    if (!src || typeof src !== 'object') return target;
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
        merge(target[k], v);
      } else {
        target[k] = Array.isArray(v) ? v.slice() : v;
      }
    }
    return target;
  };

  /* Criação de elementos DOM: h('div', {class:'x', onclick: fn}, filhos...) */
  U.h = function (tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') el[k] = v;
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  };

  U.$ = (sel, root) => (root || document).querySelector(sel);

  U.store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {
        /* armazenamento indisponível: ignora */
      }
    },
  };

  /* Heap binário mínimo (usado pelo A*) */
  U.Heap = class {
    constructor() {
      this.k = [];
      this.v = [];
    }
    get size() {
      return this.k.length;
    }
    push(key, val) {
      const k = this.k, v = this.v;
      let i = k.length;
      k.push(key);
      v.push(val);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (k[p] <= key) break;
        k[i] = k[p];
        v[i] = v[p];
        i = p;
      }
      k[i] = key;
      v[i] = val;
    }
    pop() {
      const k = this.k, v = this.v;
      const top = v[0];
      const lk = k.pop(), lv = v.pop();
      const n = k.length;
      if (n > 0) {
        let i = 0;
        while (true) {
          let c = 2 * i + 1;
          if (c >= n) break;
          if (c + 1 < n && k[c + 1] < k[c]) c++;
          if (k[c] >= lk) break;
          k[i] = k[c];
          v[i] = v[c];
          i = c;
        }
        k[i] = lk;
        v[i] = lv;
      }
      return top;
    }
  };

  AU.U = U;
})();
