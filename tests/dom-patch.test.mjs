import test from 'node:test';
import assert from 'node:assert/strict';

// DOM mini untuk menguji algoritma morph tanpa browser.
class Base {
  constructor(type, name) { this.nodeType = type; this.nodeName = name; this.parentNode = null; this.childNodes = []; }
  get firstChild() { return this.childNodes[0] || null; }
  remove() { if (this.parentNode) { const list = this.parentNode.childNodes; list.splice(list.indexOf(this), 1); this.parentNode = null; } }
  appendChild(node) { node.remove(); node.parentNode = this; this.childNodes.push(node); return node; }
  replaceChild(node, old) { node.remove(); const i = this.childNodes.indexOf(old); this.childNodes[i] = node; node.parentNode = this; old.parentNode = null; return old; }
  contains(node) { for (let n = node; n; n = n.parentNode) if (n === this) return true; return false; }
}
class Text extends Base { constructor(value) { super(3, '#text'); this.nodeValue = value; } }
class El extends Base {
  constructor(tag, attrs = {}, children = []) {
    super(1, tag.toUpperCase() === 'SVG' ? 'svg' : tag.toUpperCase());
    this.attrList = Object.entries(attrs).map(([name, value]) => ({ name, value: String(value) }));
    for (const child of children) this.appendChild(typeof child === 'string' ? new Text(child) : child);
    this.dirtyValue = undefined; this.dirtyChecked = undefined;
  }
  get attributes() { return this.attrList.map(a => ({ ...a })); }
  getAttribute(name) { return this.attrList.find(a => a.name === name)?.value ?? null; }
  hasAttribute(name) { return this.attrList.some(a => a.name === name); }
  setAttribute(name, value) { const a = this.attrList.find(x => x.name === name); if (a) a.value = String(value); else this.attrList.push({ name, value: String(value) }); }
  removeAttribute(name) { this.attrList = this.attrList.filter(a => a.name !== name); }
  get type() { return this.getAttribute('type') || 'text'; }
  get value() { return this.dirtyValue ?? (this.nodeName === 'TEXTAREA' ? this.defaultValue : this.getAttribute('value') ?? ''); }
  set value(v) { this.dirtyValue = String(v); }
  get checked() { return this.dirtyChecked ?? this.hasAttribute('checked'); }
  set checked(v) { this.dirtyChecked = Boolean(v); }
  get defaultValue() { return this.childNodes.map(n => n.nodeValue ?? '').join(''); }
  set defaultValue(v) { this.childNodes = []; this.appendChild(new Text(v)); }
  descendants() { return this.childNodes.flatMap(n => (n.nodeType === 1 ? [n, ...n.descendants()] : [])); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    if (sel === 'option[selected]') return this.descendants().filter(n => n.nodeName === 'OPTION' && n.hasAttribute('selected'));
    const m = sel.match(/^\[([\w-]+)="([^"]*)"\]$/);
    return m ? this.descendants().filter(n => n.getAttribute(m[1]) === m[2]) : [];
  }
  get options() { return this.descendants().filter(n => n.nodeName === 'OPTION'); }
  focus() { document.activeElement = this; }
  get outerHTML() { return `<${this.nodeName}${this.attrList.map(a => ` ${a.name}="${a.value}"`).join('')}>${this.childNodes.map(n => n.nodeType === 1 ? n.outerHTML : n.nodeValue).join('')}</${this.nodeName}>`; }
}
const body = new El('body');
globalThis.document = { activeElement: body, body, getElementById: () => null };
const { morphChildren } = await import('../src/dom-patch.js');
const $ = (tag, attrs, ...children) => new El(tag, attrs, children);
const patch = (oldRoot, newRoot) => morphChildren(oldRoot, newRoot);
const reset = () => { document.activeElement = body; };

test('teks diperbarui tanpa mengganti node dan tanpa menghapus ketikan di input lain', () => {
  reset();
  const input = $('input', { type: 'text', value: '' });
  const label = $('span', {}, 'Skor 0');
  const oldRoot = $('div', {}, label, input);
  input.value = 'catatan panjang yang belum disimpan';
  patch(oldRoot, $('div', {}, $('span', {}, 'Skor 1'), $('input', { type: 'text', value: '' })));
  assert.equal(oldRoot.childNodes[0], label);
  assert.equal(label.childNodes[0].nodeValue, 'Skor 1');
  assert.equal(oldRoot.childNodes[1], input);
  assert.equal(input.value, 'catatan panjang yang belum disimpan');
});

test('perubahan nilai dari data diterapkan jika input tidak sedang fokus', () => {
  reset();
  const input = $('input', { type: 'number', value: '5' });
  const root = $('div', {}, input);
  patch(root, $('div', {}, $('input', { type: 'number', value: '7' })));
  assert.equal(input.value, '7');
});

test('input yang sedang fokus tidak ditimpa', () => {
  reset();
  const input = $('input', { type: 'text', value: '5' });
  const root = $('div', {}, input);
  input.value = '5678'; input.focus();
  patch(root, $('div', {}, $('input', { type: 'text', value: '9' })));
  assert.equal(input.value, '5678');
});

test('checkbox mengikuti data, dan tetap bila data tidak berubah', () => {
  reset();
  const box = $('input', { type: 'checkbox' });
  const root = $('div', {}, box);
  box.checked = true; // pengguna mencentang, state ikut berubah
  patch(root, $('div', {}, $('input', { type: 'checkbox', checked: '' })));
  assert.equal(box.checked, true);
  patch(root, $('div', {}, $('input', { type: 'checkbox', checked: '' })));
  assert.equal(box.checked, true);
  patch(root, $('div', {}, $('input', { type: 'checkbox' })));
  assert.equal(box.checked, false);
});

test('select mengikuti data saat opsi terpilih berubah', () => {
  reset();
  const options = sel => [1, 2, 3].map(v => $('option', { value: v, ...(v === sel ? { selected: '' } : {}) }, `Opsi ${v}`));
  const select = $('select', {}, ...options(1));
  const root = $('div', {}, select);
  patch(root, $('div', {}, $('select', {}, ...options(3))));
  assert.equal(select.value, '3');
});

test('textarea yang sedang diketik tidak hilang', () => {
  reset();
  const area = $('textarea', {}, '');
  const root = $('div', {}, area);
  area.value = 'ketikan belum tersimpan'; area.focus();
  patch(root, $('div', {}, $('textarea', {}, '')));
  assert.equal(area.value, 'ketikan belum tersimpan');
  patch(root, $('div', {}, $('textarea', {}, 'dari data')));
  assert.equal(area.defaultValue, 'dari data');
});

test('<details> yang dibuka pengguna tetap terbuka', () => {
  reset();
  const details = $('details', { class: 'doa', open: '' }, $('summary', {}, 'Doa'));
  const root = $('div', {}, details);
  patch(root, $('div', {}, $('details', { class: 'doa' }, $('summary', {}, 'Doa'))));
  assert.equal(details.hasAttribute('open'), true);
});

test('atribut diperbarui dan dihapus', () => {
  reset();
  const btn = $('button', { class: 'prayer-item', 'aria-pressed': 'false' }, 'Belum');
  const root = $('div', {}, btn);
  patch(root, $('div', {}, $('button', { class: 'prayer-item done', 'aria-pressed': 'true', 'data-value': '2' }, 'Tercatat')));
  assert.equal(root.childNodes[0], btn);
  assert.equal(btn.getAttribute('class'), 'prayer-item done');
  assert.equal(btn.getAttribute('data-value'), '2');
  patch(root, $('div', {}, $('button', { class: 'prayer-item' }, 'Belum')));
  assert.equal(btn.hasAttribute('aria-pressed'), false);
  assert.equal(btn.childNodes[0].nodeValue, 'Belum');
});

test('menambah, menghapus, dan mengganti node', () => {
  reset();
  const root = $('div', {}, $('p', {}, 'a'), $('p', {}, 'b'), $('p', {}, 'c'));
  patch(root, $('div', {}, $('p', {}, 'a'), $('section', {}, 'baru')));
  assert.deepEqual(root.childNodes.map(n => n.nodeName), ['P', 'SECTION']);
  patch(root, $('div', {}, $('p', {}, 'a'), $('section', {}, 'baru'), $('p', {}, 'tambahan')));
  assert.equal(root.childNodes.length, 3);
});

test('elemen dengan id berbeda diganti, bukan dipakai ulang', () => {
  reset();
  const first = $('section', { id: 'backup-reminder' }, 'Cadangan');
  const root = $('div', {}, first);
  patch(root, $('div', {}, $('section', { id: 'ringkasan' }, 'Ringkasan')));
  assert.notEqual(root.childNodes[0], first);
  assert.equal(root.childNodes[0].getAttribute('id'), 'ringkasan');
});

test('svg hanya diganti jika isinya berubah', () => {
  reset();
  const icon = $('svg', { viewBox: '0 0 24 24' }, $('path', { d: 'M1 1' }));
  const root = $('div', {}, icon);
  patch(root, $('div', {}, $('svg', { viewBox: '0 0 24 24' }, $('path', { d: 'M1 1' }))));
  assert.equal(root.childNodes[0], icon);
  patch(root, $('div', {}, $('svg', { viewBox: '0 0 24 24' }, $('path', { d: 'M2 2' }))));
  assert.notEqual(root.childNodes[0], icon);
});
