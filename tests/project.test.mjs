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

// Kebersihan repo: sengaja hanya PERINGATAN (tidak menggagalkan tes). Mengunggah ke GitHub tidak menghapus
// file lama dan file berawalan titik sering terlewat, sehingga ini bukan tanda kode rusak.
test('berkas PWA lama di root sebaiknya sudah dihapus (peringatan)', t => {
  for (const file of ['sw.js', 'manifest.json', 'prayer.js', 'icon.svg']) {
    if (existsSync(join(root, file))) t.diagnostic(`PERINGATAN: ${file} di root tidak dipakai dan sebaiknya dihapus`);
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
  const html = read('index.html'), app = read('src/app.js'), early = read('public/early-install.js');
  assert.match(html, /<script src="%BASE_URL%early-install\.js"><\/script>/, 'skrip penangkap event pemasangan harus dimuat sedini mungkin');
  assert.match(early, /window\.__installEvent\s*=\s*event/, 'event pemasangan harus ditangkap sedini mungkin');
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

test('konfigurasi Cloudflare Pages: isi _headers valid (jika ada)', t => {
  if (!existsSync(join(root, 'public/_headers'))) {
    t.diagnostic('PERINGATAN: public/_headers belum ada, header keamanan/cache tidak akan terpasang');
  } else {
    assert.match(read('public/_headers'), /^\/\*\n\s+X-Content-Type-Options: nosniff/m);
  }
  if (existsSync(join(root, 'vercel.json'))) t.diagnostic('PERINGATAN: vercel.json tidak dipakai di Cloudflare Pages dan sebaiknya dihapus');
  if (!existsSync(join(root, '.node-version'))) t.diagnostic('PERINGATAN: .node-version belum ada; atur NODE_VERSION=22 di Cloudflare Pages');
  else assert.match(read('.node-version').trim(), /^(2[0-9])(\.\d+)*$/, '.node-version harus Node 20+ (Vite 7)');
});

// Kegagalan nyata, bukan sekadar peringatan: Cloudflare Pages menjalankan `npm clean-install` sebelum build,
// dan perintah itu gagal bila package-lock.json tidak sinkron dengan package.json.
test('package-lock.json sinkron dengan package.json (agar npm clean-install di Cloudflare tidak gagal)', () => {
  const lock = JSON.parse(read('package-lock.json'));
  const rootEntry = lock.packages[''];
  const hint = 'Jalankan "npm install" lalu unggah package-lock.json yang baru.';
  for (const group of ['dependencies', 'devDependencies']) {
    assert.deepEqual(rootEntry[group] || {}, pkg[group] || {}, `${group} di package-lock.json berbeda dari package.json. ${hint}`);
  }
  for (const name of declared) {
    assert.ok(lock.packages[`node_modules/${name}`], `"${name}" belum ada di package-lock.json. ${hint}`);
  }
});

test('keamanan: tanpa skrip inline dan CSP melarang skrip inline', () => {
  const html = read('index.html');
  assert.equal(/<script(?![^>]*\bsrc=)[^>]*>/.test(html), false, 'jangan taruh skrip inline; gunakan berkas src');
  assert.equal(/\son[a-z]+\s*=/i.test(html), false, 'jangan pakai atribut event inline (onclick, dll.)');
  const headers = read('public/_headers');
  const csp = headers.match(/Content-Security-Policy: (.+)/)?.[1] || '';
  assert.match(csp, /script-src 'self'(;|$)/, 'script-src harus hanya self');
  assert.equal(/script-src[^;]*unsafe-inline/.test(csp), false);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(headers, /X-Frame-Options: DENY/);
});

test('keamanan: semua atribut value="${...}" di app.js di-escape', () => {
  const app = read('src/app.js');
  const bad = [...app.matchAll(/value="\$\{([^{}]*)\}"/g)].filter(m => !m[1].startsWith('esc('));
  assert.deepEqual(bad.map(m => m[1]), []);
});

test('keamanan: app.js tidak memakai eval / new Function / document.write', () => {
  const app = read('src/app.js');
  assert.equal(/\beval\(|new Function|document\.write/.test(app), false);
});
