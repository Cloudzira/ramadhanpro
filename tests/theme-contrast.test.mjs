import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Mengevaluasi token warna akhir (kaskade CSS) untuk setiap kombinasi tema × mode × fase,
// lalu memastikan kontras teks memenuhi WCAG AA (≥ 4,5:1), termasuk kasus terburuk
// saat latar aurora menembus panel kaca.
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function topLevelRules(source) {
  const rules = [];
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf('{', i);
    if (open < 0) break;
    let depth = 1, k = open + 1;
    while (k < source.length && depth) { if (source[k] === '{') depth += 1; else if (source[k] === '}') depth -= 1; k += 1; }
    rules.push([source.slice(i, open).trim(), source.slice(open + 1, k - 1)]);
    i = k;
  }
  return rules;
}

function parseDeclarations(body) {
  const result = {};
  for (const part of body.split(/;(?![^()]*\))/)) {
    const at = part.indexOf(':');
    if (at < 0) continue;
    const name = part.slice(0, at).trim();
    let value = part.slice(at + 1).trim();
    const important = value.includes('!important');
    value = value.replace('!important', '').trim();
    if (name.startsWith('--') || name === 'background') result[name] = { value, important };
  }
  return result;
}

function parseSelector(selector) {
  const match = selector.trim().match(/^(:root|html)((?:\[[^\]]*\]|:not\(\[[^\]]*\]\))*)$/);
  if (!match) return null;
  const conditions = [];
  const spec = [0, match[1] === ':root' ? 1 : 0, match[1] === 'html' ? 1 : 0];
  for (const token of match[2].matchAll(/:not\(\[([\w-]+)(?:="?([\w-]+)"?)?\]\)|\[([\w-]+)(?:="?([\w-]+)"?)?\]/g)) {
    if (token[1]) conditions.push({ not: true, name: token[1], value: token[2] });
    else conditions.push({ not: false, name: token[3], value: token[4] });
    spec[1] += 1;
  }
  return { head: match[1], conditions, spec };
}

const rules = [];
topLevelRules(css).forEach(([selector, body], order) => {
  if (selector.startsWith('@')) return;
  const declarations = parseDeclarations(body);
  if (!Object.keys(declarations).length) return;
  for (const one of selector.split(',')) {
    const parsed = parseSelector(one);
    if (parsed) rules.push({ ...parsed, declarations, order });
  }
});

function matches(conditions, attrs) {
  return conditions.every(({ not, name, value }) => {
    const has = name in attrs;
    if (!not) return has && (value === undefined || attrs[name] === value);
    return !(has && (value === undefined || attrs[name] === value));
  });
}

function compareKey(a, b) {
  for (const [x, y] of [[a.important, b.important], ...a.spec.map((v, i) => [v, b.spec[i]]), [a.order, b.order]]) if (x !== y) return x - y;
  return 0;
}

function computed(attrs) {
  const best = {};
  for (const rule of rules) {
    if (!matches(rule.conditions, attrs)) continue;
    for (const [name, { value, important }] of Object.entries(rule.declarations)) {
      if (name === 'background' && rule.head !== 'html') continue;
      const key = { important: important ? 1 : 0, spec: rule.spec, order: rule.order };
      if (!best[name] || compareKey(key, best[name].key) > 0) best[name] = { value, key };
    }
  }
  return Object.fromEntries(Object.entries(best).map(([name, { value }]) => [name, value]));
}

const hex = value => {
  const m = String(value).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  assert.ok(m, `nilai warna harus hex, bukan "${value}"`);
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const luminance = rgb => { const [r, g, b] = rgb.map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [hi, lo] = [luminance(hex(a)), luminance(hex(b))].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const toHex = rgb => `#${rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const blend = (fg, alpha, bg) => { const f = hex(fg), b = hex(bg); return toHex(f.map((v, i) => v * alpha + b[i] * (1 - alpha))); };

const THEMES = ['muslim', 'muslimah'], MODES = ['dark', 'light'], PHASES = ['prep', 'ramadan', 'last', 'eid', 'post'];
// Empat blob aurora (body::before): token warna dan opasitas di titik pusatnya.
const BLOBS = [['--g1', 0.38], ['--g2', 0.34], ['--g3', 0.28], ['--g4', 0.24]];
const combos = THEMES.flatMap(theme => MODES.flatMap(mode => PHASES.map(phase => ({ theme, mode, phase }))));

test('mengevaluasi 20 kombinasi tema × mode × fase', () => {
  assert.equal(combos.length, 20);
  for (const { theme, mode, phase } of combos) {
    const tokens = computed({ 'data-theme': theme, 'data-mode': mode, 'data-phase': phase });
    for (const name of ['--accent', '--accent2', '--muted', '--text', '--g1', '--g2', '--g3', '--g4', 'background']) assert.ok(tokens[name], `${name} tidak terdefinisi untuk ${theme}/${mode}/${phase}`);
  }
});

for (const { theme, mode, phase } of combos) {
  test(`kontras AA: ${theme} · ${mode} · ${phase}`, () => {
    const t = computed({ 'data-theme': theme, 'data-mode': mode, 'data-phase': phase });
    const base = t.background; // latar <html>
    const light = mode === 'light';
    // panel kaca = putih transparan di atas latar; kasus terburuk: tepat di pusat salah satu blob aurora
    const panels = [light ? blend('#ffffff', 0.62, base) : blend('#ffffff', 0.06, base)];
    for (const [token, alpha] of BLOBS) {
      const aurora = blend(t[token], light ? alpha * 0.75 : alpha, base);
      panels.push(light ? blend('#ffffff', 0.62, aurora) : blend('#ffffff', 0.06, aurora));
    }
    for (const panel of panels) {
      for (const name of ['--accent', '--muted', '--text']) {
        const ratio = contrast(t[name], panel);
        assert.ok(ratio >= 4.5, `${name} ${t[name]} di atas ${panel}: ${ratio.toFixed(2)}:1 (< 4,5)`);
      }
    }
    // tulisan di atas isian beraksen (tombol utama, logo, tab aktif)
    const ink = light ? '#ffffff' : '#0b0f1a';
    for (const name of ['--accent', '--accent2']) {
      const ratio = contrast(ink, t[name]);
      assert.ok(ratio >= 4.5, `teks ${ink} di atas ${name} ${t[name]}: ${ratio.toFixed(2)}:1 (< 4,5)`);
    }
  });
}
