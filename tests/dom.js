'use strict';
// Minimal DOM for running the games' inline scripts under node:vm. Parses real HTML (including
// innerHTML assignments) into a tree and supports the selectors the games use: tag, #id, .class,
// [attr], compound (.a.b) and descendant ("#x .y"). Not a browser: no layout, no CSS, no events
// beyond addEventListener/dispatch for tests that need them.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&bull;/g, '•').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

class ClassList {
  constructor(el) { this.el = el; }
  _get() { return (this.el.attrs.class || '').split(/\s+/).filter(Boolean); }
  _set(a) { this.el.attrs.class = a.join(' '); }
  contains(c) { return this._get().includes(c); }
  add(...cs) { const a = this._get(); cs.forEach(c => { if (!a.includes(c)) a.push(c); }); this._set(a); }
  remove(...cs) { this._set(this._get().filter(c => !cs.includes(c))); }
  toggle(c, force) {
    const has = this.contains(c);
    const want = force === undefined ? !has : !!force;
    if (want && !has) this.add(c); else if (!want && has) this.remove(c);
    return want;
  }
}

class Text {
  constructor(t) { this.nodeType = 3; this.text = t; this.parentNode = null; }
  get textContent() { return this.text; }
}

class Element {
  constructor(tag, attrs, doc) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.attrs = attrs || {};
    this.childNodes = [];
    this.parentNode = null;
    this.ownerDocument = doc;
    this.classList = new ClassList(this);
    this.style = {};
    this.listeners = {};
    this._value = this.attrs.value !== undefined ? this.attrs.value : '';
    this.disabled = 'disabled' in this.attrs;
    this.onclick = null;
    const el = this;
    this.dataset = new Proxy({}, {
      get(_, k) { const v = el.attrs['data-' + String(k).replace(/[A-Z]/g, m => '-' + m.toLowerCase())]; return v; },
      set(_, k, v) { el.attrs['data-' + String(k).replace(/[A-Z]/g, m => '-' + m.toLowerCase())] = String(v); return true; },
    });
  }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = v; }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = v; }
  get value() { return this._value; }
  set value(v) { this._value = String(v); }
  get checked() { return 'checked' in this.attrs; }
  set checked(v) { if (v) this.attrs.checked = ''; else delete this.attrs.checked; }
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'value') this._value = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return k in this.attrs; }
  get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
  set textContent(t) { this.childNodes.forEach(n => { n.parentNode = null; }); this.childNodes = [new Text(String(t))]; this.childNodes[0].parentNode = this; }
  get innerText() { return this.textContent; }
  set innerText(t) { this.textContent = t; }
  get innerHTML() { return this._rawHTML !== undefined ? this._rawHTML : serialize(this.childNodes); }
  set innerHTML(html) {
    this.childNodes.forEach(n => { n.parentNode = null; });
    this.childNodes = [];
    parseInto(this, String(html), this.ownerDocument);
    this._rawHTML = String(html);
  }
  _touch() { delete this._rawHTML; }
  appendChild(n) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.push(n); this._touch(); return n; }
  prepend(n) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.unshift(n); this._touch(); }
  insertBefore(n, ref) {
    if (!ref) return this.appendChild(n);
    if (n.parentNode) n.parentNode.removeChild(n);
    const i = this.childNodes.indexOf(ref); n.parentNode = this; this.childNodes.splice(i, 0, n); this._touch(); return n;
  }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); n.parentNode = null; this._touch(); return n; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  dispatchEvent(ev) { ev.target = ev.target || this; (this.listeners[ev.type] || []).forEach(f => f(ev)); return true; }
  click() { this.dispatchEvent({ type: 'click' }); if (typeof this.onclick === 'function') this.onclick({ type: 'click', target: this }); }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  blur() {}
  select() {}
  scrollIntoView() {}
  getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }; }
  descendants() { const out = []; const walk = e => e.children.forEach(c => { out.push(c); walk(c); }); walk(this); return out; }
  matches(sel) { return sel.split(',').some(s => matchesSelector(this, s.trim())); }
  closest(sel) { let e = this; while (e && e.nodeType === 1) { if (e.matches(sel)) return e; e = e.parentNode; } return null; }
  querySelectorAll(sel) { return this.descendants().filter(e => e.matches(sel)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  getElementsByClassName(c) { return this.descendants().filter(e => e.classList.contains(c)); }
}

function serialize(nodes) {
  return nodes.map(n => {
    if (n.nodeType === 3) return n.text;
    const a = Object.entries(n.attrs).map(([k, v]) => v === '' ? ` ${k}` : ` ${k}="${v}"`).join('');
    const tag = n.tagName.toLowerCase();
    return VOID.has(tag) ? `<${tag}${a}>` : `<${tag}${a}>${n.innerHTML}</${tag}>`;
  }).join('');
}

const TOKEN = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|[^<]+|</g;
const ATTR = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function parseInto(root, html, doc) {
  const stack = [root];
  let rawUntil = null;
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(html))) {
    const top = stack[stack.length - 1];
    if (rawUntil) {
      if (m[1] && m[1].toLowerCase() === rawUntil) { rawUntil = null; stack.pop(); }
      else { const t = new Text(m[0]); t.parentNode = top; top.childNodes.push(t); }
      continue;
    }
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) {
      const tag = m[1].toUpperCase();
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === tag) { stack.length = i; break; }
      continue;
    }
    if (m[2]) {
      const attrs = {};
      let a; ATTR.lastIndex = 0;
      const s = m[3] || '';
      while ((a = ATTR.exec(s))) attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
      const el = new Element(m[2], attrs, doc);
      el.parentNode = top; top.childNodes.push(el);
      const tag = m[2].toLowerCase();
      if (!VOID.has(tag) && !m[0].endsWith('/>')) {
        stack.push(el);
        if (tag === 'script' || tag === 'style') rawUntil = tag;
      }
      continue;
    }
    const t = new Text(decode(m[0])); t.parentNode = top; top.childNodes.push(t);
  }
}

// selector: compound parts separated by whitespace (descendant combinator only)
function matchesCompound(el, c) {
  const re = /([#.]?)([a-zA-Z0-9_-]+)|\[([^\]=]+)(?:=["']?([^"'\]]*)["']?)?\]|\*/g;
  let m; let any = false;
  while ((m = re.exec(c))) {
    any = true;
    if (m[0] === '*') continue;
    if (m[3]) { const v = el.getAttribute(m[3]); if (v === null || (m[4] !== undefined && v !== m[4])) return false; continue; }
    if (m[1] === '#') { if (el.id !== m[2]) return false; }
    else if (m[1] === '.') { if (!el.classList.contains(m[2])) return false; }
    else if (el.tagName !== m[2].toUpperCase()) return false;
  }
  return any;
}
function matchesSelector(el, sel) {
  const parts = sel.split(/\s+/).filter(Boolean);
  if (!matchesCompound(el, parts[parts.length - 1])) return false;
  let i = parts.length - 2; let e = el.parentNode;
  while (i >= 0 && e && e.nodeType === 1) { if (matchesCompound(e, parts[i])) i--; e = e.parentNode; }
  return i < 0;
}

class Document {
  constructor(html) {
    this.documentElement = new Element('html', {}, this);
    this.listeners = {};
    this.activeElement = null;
    const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
    this.body = new Element('body', {}, this);
    this.documentElement.appendChild(this.body);
    parseInto(this.body, body ? body[1].replace(/<script>[\s\S]*?<\/script>/g, '') : '', this);
  }
  getElementById(id) { return this.documentElement.descendants().find(e => e.id === id) || null; }
  querySelectorAll(sel) { return this.documentElement.querySelectorAll(sel); }
  querySelector(sel) { return this.documentElement.querySelector(sel); }
  getElementsByClassName(c) { return this.documentElement.getElementsByClassName(c); }
  createElement(tag) { return new Element(tag, {}, this); }
  createTextNode(t) { return new Text(t); }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  dispatchEvent(ev) { (this.listeners[ev.type] || []).forEach(f => f(ev)); return true; }
}

class Storage {
  constructor(init) { this.map = new Map(Object.entries(init || {})); this.failWrites = false; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { if (this.failWrites) throw new Error('QuotaExceededError'); this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}

module.exports = { Document, Element, Storage };
