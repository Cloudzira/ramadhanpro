import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Mengevaluasi token warna akhir (kaskade CSS) untuk setiap kombinasi tema × mode,
// lalu memastikan kontras teks memenuhi WCAG AA (≥ 4,5:1) dan ikon/grafik ≥ 3:1
// pada setiap permukaan yang benar-benar dipakai tema Lavender (sidebar, hero, kartu statistik, tombol).
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
    if (name.startsWith('--')) result[name] = { value, important };
  }
  return result;
}

function parseSelector(selector) {
  const match = selector.trim().match(/^(:root|html)((?:\[[^\]]*\]|:not\(\[[^\]]*\]\))*)$/);
  if (!match) return null;
  const conditions = [];
  const spec = [0, match[1] === ':root' ? 1 : 0, match[1] === 'html' ? 1 : 0];
  for (const token of match[2].matchAll(/:not\(\[([\w-]+)(?:=([\w-]+))?\]\)|\[([\w-]+)(?:=([\w-]+))?\]/g)) {
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
const rgbaOf = value => { const m = String(value).match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/); assert.ok(m, `harus rgba(), bukan "${value}"`); return { hex: toHex([+m[1], +m[2], +m[3]]), alpha: +m[4] }; };

const THEMES = ['muslim', 'muslimah'], MODES = ['dark', 'light'];
const combos = THEMES.flatMap(theme => MODES.map(mode => ({ theme, mode })));
const REQUIRED = ['--bg', '--surface', '--surface-2', '--text', '--muted', '--hero-text', '--accent', '--accent2', '--accent-ink', '--accent-soft', '--side-a', '--side-b', '--side-text', '--hero-a', '--hero-b', '--screen-a', '--screen-b', '--trend', '--danger',
  '--tint-violet', '--tint-violet-soft', '--tint-rose', '--tint-sun', '--tint-sky', '--ico-violet', '--ico-rose', '--ico-sun', '--ico-sky'];

test('mengevaluasi 4 kombinasi tema × mode dengan token lengkap', () => {
  assert.equal(combos.length, 4);
  for (const { theme, mode } of combos) {
    const tokens = computed({ 'data-theme': theme, 'data-mode': mode });
    for (const name of REQUIRED) assert.ok(tokens[name], `${name} tidak terdefinisi untuk ${theme}/${mode}`);
  }
});

for (const { theme, mode } of combos) {
  test(`kontras AA: ${theme} · ${mode}`, () => {
    const t = computed({ 'data-theme': theme, 'data-mode': mode });
    const check = (fg, bg, min, label) => { const ratio = contrast(fg, bg); assert.ok(ratio >= min, `${label}: ${fg} di atas ${bg} = ${ratio.toFixed(2)}:1 (< ${min})`); };

    // teks utama & sekunder di semua permukaan konten
    const soft = rgbaOf(t['--accent-soft']);
    const surfaces = { 'area utama': t['--bg'], kartu: t['--surface'], 'kartu-2': t['--surface-2'],
      'kartu aktif': blend(soft.hex, soft.alpha, t['--surface-2']), 'ungu muda': t['--tint-violet-soft'],
      'statistik ungu': t['--tint-violet'], 'statistik merah muda': t['--tint-rose'], 'statistik kuning': t['--tint-sun'], 'statistik biru': t['--tint-sky'] };
    for (const [name, bg] of Object.entries(surfaces)) {
      check(t['--text'], bg, 4.5, `--text di ${name}`);
      check(t['--muted'], bg, 4.5, `--muted di ${name}`);
    }
    // aksen sebagai teks (eyebrow, tautan, tanggal Hijriah, tombol aktif) di kartu & area utama & latar ungu muda
    for (const bg of [t['--bg'], t['--surface'], t['--surface-2'], t['--tint-violet-soft']]) check(t['--accent'], bg, 4.5, '--accent sebagai teks');
    // teks tren di kartu statistik
    for (const name of ['--tint-violet', '--tint-rose', '--tint-sun', '--tint-sky']) check(t['--trend'], t[name], 4.5, `--trend di ${name}`);
    // hero: teks utama & paragraf di kedua ujung gradien
    for (const stop of ['--hero-a', '--hero-b']) { check(t['--text'], t[stop], 4.5, `--text di ${stop}`); check(t['--hero-text'], t[stop], 4.5, `--hero-text di ${stop}`); }
    // layar pembuka/masuk memakai --text di atas gradien layar
    for (const stop of ['--screen-a', '--screen-b']) check(t['--text'], t[stop], 4.5, `--text di ${stop}`);
    // sidebar & bilah navigasi HP: teks putih di kedua ujung gradien; item aktif = aksen di atas putih (mode terang) / --surface
    for (const stop of ['--side-a', '--side-b']) check(t['--side-text'], t[stop], 4.5, `--side-text di ${stop}`);
    // tombol utama, logo, tab aktif: tulisan di atas gradien aksen
    for (const name of ['--accent', '--accent2']) check(t['--accent-ink'], t[name], 4.5, `--accent-ink di ${name}`);
    // galat
    check(t['--danger'], t['--surface'], 4.5, '--danger di kartu');
    // ikon pada kotak berwarna (komponen UI/grafik ≥ 3:1)
    for (const name of ['--ico-violet', '--ico-rose', '--ico-sun', '--ico-sky']) check('#ffffff', t[name], 3, `ikon putih di ${name}`);
  });
}

test('item navigasi aktif (teks --nav-on di atas pil putih) terbaca di semua tema dan mode', () => {
  for (const { theme, mode } of combos) {
    const t = computed({ 'data-theme': theme, 'data-mode': mode });
    assert.ok(t['--nav-on'], `--nav-on tidak terdefinisi untuk ${theme}/${mode}`);
    assert.ok(contrast(t['--nav-on'], '#ffffff') >= 4.5, `${theme}/${mode}: --nav-on di atas putih < 4,5:1`);
  }
});
