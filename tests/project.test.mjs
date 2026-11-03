import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Pemeriksaan "siap build" tanpa menjalankan Vite: berkas yang dirujuk ada, paket terdaftar,
// sintaks aplikasi valid, dan tombol di tampilan punya penangan. Menangkap kesalahan sebelum deploy.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const pkg = JSON.parse(read('package.json'));
const declared = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);

function jsFiles(dir) {
  return readdirSync(join(root, dir)).flatMap(name => {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) return jsFiles(rel);
    return rel.endsWith('.js') ? [rel] : [];
  });
}
const sources = jsFiles('src');
const packageName = spec => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);

test('index.html memuat skrip utama yang ada', () => {
  const html = read('index.html');
  const src = html.match(/<script type="module" src="([^"]+)"/)?.[1];
  assert.ok(src, 'tag <script type="module" src=...> tidak ditemukan');
  assert.ok(existsSync(join(root, src)), `${src} tidak ada`);
  assert.equal(/<script type="module">/.test(html), false, 'jangan taruh skrip inline lagi; pakai src/app.js');
  assert.equal(/<style/.test(html), false, 'jangan taruh gaya inline lagi; pakai src/styles.css');
});

test('aset yang dirujuk lewat %BASE_URL% ada di public/', () => {
  for (const [, file] of read('index.html').matchAll(/%BASE_URL%([\w./-]+)/g)) {
    assert.ok(existsSync(join(root, 'public', file)), `public/${file} tidak ada`);
  }
});

test('semua impor relatif di src/ menunjuk berkas yang ada', () => {
  for (const file of sources) {
    for (const [, spec] of read(file).matchAll(/(?:^|\n)\s*import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g)) {
      if (!spec.startsWith('.')) continue;
      assert.ok(existsSync(resolve(root, dirname(file), spec)), `${file}: impor "${spec}" tidak ditemukan`);
    }
  }
});

test('semua paket yang diimpor terdaftar di package.json', () => {
  for (const file of sources) {
    for (const [, spec] of read(file).matchAll(/(?:^|\n)\s*import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g)) {
      if (spec.startsWith('.')) continue;
      assert.ok(declared.has(packageName(spec)), `${file}: paket "${packageName(spec)}" belum ada di package.json`);
    }
  }
});

test('sintaks setiap berkas sumber valid', () => {
  for (const file of [...sources, 'vite.config.js', 'config/site-url.js']) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' }), `${file} memiliki kesalahan sintaks`);
  }
});

test('ikon yang dirujuk vite.config.js ada di public/', () => {
  const config = read('vite.config.js');
  for (const [, file] of config.matchAll(/src:\s*'([^']+)'/g)) {
    assert.ok(existsSync(join(root, 'public', file)), `public/${file} tidak ada`);
  }
  assert.ok(existsSync(join(root, 'public/og-image.png')));
});

test('berkas PWA lama tidak kembali (sw.js, manifest.json, prayer.js di root)', () => {
  for (const file of ['sw.js', 'manifest.json', 'prayer.js', 'icon.svg']) {
    assert.equal(existsSync(join(root, file)), false, `${file} di root seharusnya sudah dihapus`);
  }
});

test('setiap tombol data-action di tampilan punya penangan', () => {
  const app = read('src/app.js');
  const used = new Set([...app.matchAll(/data-action="([a-z-]+)"/g)].map(m => m[1]));
  assert.ok(used.size > 10, 'daftar aksi terlalu sedikit; pola pencarian mungkin rusak');
  const missing = [...used].filter(name => {
    const asLiteral = new RegExp(`'${name}'`).test(app);
    const asMethod = new RegExp(`(?:^|[\\s,{])(?:async\\s+)?${name.includes('-') ? `'${name}'` : name}\\(`, 'm').test(app);
    return !asLiteral && !asMethod;
  });
  assert.deepEqual(missing, [], `aksi tanpa penangan: ${missing.join(', ')}`);
});

test('konten ibadah terpisah dan terisi (untuk diperiksa ustaz)', async () => {
  const { DOA } = await import('../src/data/doa.js');
  const { quoteBank } = await import('../src/data/quotes.js');
  const { CITIES } = await import('../src/data/cities.js');
  assert.ok(DOA.length >= 4 && DOA.every(d => d.length === 5 && d.every(x => typeof x === 'string' && x.trim())), 'setiap doa harus punya 5 bagian terisi');
  assert.ok(DOA.every(d => /[\u0600-\u06FF]/.test(d[1])), 'teks Arab harus berisi huruf Arab');
  assert.ok(quoteBank.every(q => q.length === 2 && q.every(x => x.trim())));
  assert.ok(CITIES.every(c => c.length >= 4 && Math.abs(c[1]) <= 90 && Math.abs(c[2]) <= 180));
});

test('nomor versi di popup mengikuti package.json', () => {
  assert.match(read('index.html'), /<b data-app-version>/);
  assert.match(read('vite.config.js'), /__APP_VERSION__:\s*JSON\.stringify\(version\)/);
  assert.match(read('src/app.js'), /querySelectorAll\('\[data-app-version\]'\)/);
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});

test('tombol Pasang memanggil jendela pemasangan langsung', () => {
  const html = read('index.html'), app = read('src/app.js');
  assert.match(html, /window\.__installEvent\s*=\s*event/, 'event pemasangan harus ditangkap sedini mungkin');
  assert.match(app, /await event\.prompt\(\)/);
  assert.match(app, /window\.addEventListener\('appinstalled'/);
  assert.match(read('src/styles.css'), /data-install=installed\] \[data-action=install\]\{display:none\}/);
});

test('tanggal Hijriah tampil di atas tanggal Masehi', () => {
  const app = read('src/app.js');
  const at = app.indexOf('class="date-label"');
  const line = app.slice(at, app.indexOf('</div>', at));
  assert.ok(line.indexOf('hijriLabel()') > -1 && line.indexOf('hijriLabel()') < line.indexOf('Intl.DateTimeFormat'), 'hijriLabel() harus di depan Intl.DateTimeFormat');
});

test('konfigurasi Cloudflare Pages: _headers dan versi Node tersedia', () => {
  assert.ok(existsSync(join(root, 'public/_headers')), 'public/_headers hilang');
  assert.match(read('public/_headers'), /^\/\*\n\s+X-Content-Type-Options: nosniff/m);
  assert.equal(existsSync(join(root, 'vercel.json')), false, 'vercel.json tidak dipakai di Cloudflare Pages');
  assert.match(read('.node-version').trim(), /^(2[0-9])(\.\d+)*$/, '.node-version harus Node 20+ (Vite 7)');
});
