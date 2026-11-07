// Pencarian RamadhanPro.
// Bagian atas = logika murni (tanpa DOM) sehingga bisa dites di Node.
// Bagian bawah (attachSearchUI) = tampilan daftar hasil di bawah kolom cari.

/* ───────────── 1. Normalisasi teks ───────────── */

// Ejaan yang berbeda-beda disatukan agar "sholat", "salat", dan "shalat" dianggap sama.
const CANON = {
  sholat: 'shalat', salat: 'shalat', solat: 'shalat', sholah: 'shalat',
  alquran: 'quran', quran: 'quran', koran: 'quran', alqur: 'quran', qur: 'quran',
  dzikir: 'zikir', dikir: 'zikir', zikr: 'zikir', dzikr: 'zikir',
  duha: 'dhuha', dluha: 'dhuha',
  infak: 'infaq', infaaq: 'infaq', infag: 'infaq',
  ramadan: 'ramadhan', ramdhan: 'ramadhan', romadhon: 'ramadhan',
  itikaf: 'iktikaf', ikhtikaf: 'iktikaf', itikap: 'iktikaf', iktikap: 'iktikaf',
  taraweh: 'tarawih', terawih: 'tarawih', tarawi: 'tarawih',
  idul: 'id', ied: 'id', eid: 'id', idulfitri: 'id',
  sahur: 'sahur', suhur: 'sahur', sahor: 'sahur',
  buka: 'berbuka', iftar: 'berbuka', ifthar: 'berbuka',
  zakat: 'zakat', zakah: 'zakat', jakat: 'zakat',
  fitrah: 'fitrah', fitrih: 'fitrah',
  mutaba: 'mutabaah', mutabaa: 'mutabaah', mutabaah: 'mutabaah',
  qadha: 'qadha', qodho: 'qadha', qodo: 'qadha', kadha: 'qadha', qadla: 'qadha',
  syaban: 'syaban', shaban: 'syaban',
  syawal: 'syawal', shawal: 'syawal',
  backup: 'cadangan', ekspor: 'cadangan', export: 'cadangan',
  impor: 'impor', import: 'impor', restore: 'impor',
  notif: 'notifikasi', alarm: 'pengingat', reminder: 'pengingat',
  dark: 'gelap', night: 'gelap', light: 'terang', theme: 'tema',
  setting: 'pengaturan', settings: 'pengaturan', setelan: 'pengaturan',
  install: 'pasang', instal: 'pasang',
  subuh: 'subuh', shubuh: 'subuh', fajr: 'subuh', fajar: 'subuh',
  dzuhur: 'dzuhur', zuhur: 'dzuhur', zhuhur: 'dzuhur', dhuhur: 'dzuhur',
  ashar: 'ashar', asar: 'ashar', asr: 'ashar',
  magrib: 'maghrib', maghrib: 'maghrib',
  isya: 'isya', isha: 'isya', isyak: 'isya',
  witir: 'witir', witr: 'witir',
  hijri: 'hijriah', hijriyah: 'hijriah', hijriah: 'hijriah',
  khatam: 'khatam', hatam: 'khatam',
  tadarus: 'tadarus', tadarrus: 'tadarus',
  musafir: 'safar', perjalanan: 'safar', mudik: 'safar',
  maaf: 'maaf', silaturahim: 'silaturahmi', silaturrahmi: 'silaturahmi', silaturahmi: 'silaturahmi',
};

const STOP = new Set(['dan', 'di', 'ke', 'yang', 'untuk', 'dengan', 'atau', 'the', 'dari', 'ini', 'itu', 'saya', 'aku', 'cara', 'fitur']);

/** Huruf kecil, buang harakat Arab & aksen Latin, apostrof, dan tanda baca. */
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '') // aksen Latin, harakat, tatwil
    .replace(/[’‘'`ʻʿʼ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();
}

/** Pecah jadi kata-kata baku. Dipakai untuk indeks dan kata kunci. */
export function tokens(text, { keepStop = false } = {}) {
  const out = [];
  for (const raw of fold(text).split(' ')) {
    if (!raw) continue;
    if (!keepStop && STOP.has(raw)) continue;
    out.push(CANON[raw] || raw);
  }
  return out;
}

/* ───────────── 2. Indeks ───────────── */

// Daftar fitur. `find` = potongan judul bagian (h2) yang dituju, `id` = elemen dengan id tertentu.
// Tidak semua bagian tampil di semua fase Ramadhan, jadi `find` boleh berisi beberapa alternatif.
export const FEATURES = [
  // Beranda
  { title: 'Jadwal shalat & imsak', desc: 'Waktu subuh, dzuhur, ashar, maghrib, isya', view: 'home', find: ['Jadwal shalat'], kw: 'waktu adzan azan terbit imsak berbuka kapan' },
  { title: 'Hitung mundur shalat berikutnya', desc: 'Sisa waktu menuju shalat, imsak, atau berbuka', view: 'home', sel: '.next-card', kw: 'countdown menuju berbuka imsak sahur waktu' },
  { title: 'Hidrasi 2–4–2', desc: 'Catat gelas air minum saat berbuka hingga sahur', view: 'home', find: ['Hidrasi'], kw: 'air minum gelas dehidrasi haus' },
  { title: 'Ringkasan hari ini', desc: 'Skor, shalat tercatat, dan target hari ini', view: 'home', find: ['Ringkasan hari ini'], kw: 'skor statistik dashboard beranda' },
  { title: 'Pengingat hari ini', desc: 'Pengingat singkat untuk amalan hari ini', view: 'home', find: ['Pengingat hari ini'], kw: 'ingat tugas agenda' },
  { title: 'Fokus fase ini', desc: 'Prioritas ibadah sesuai fase Ramadhan', view: 'home', find: ['Fokus fase ini'], kw: 'prioritas target fase' },

  // Rencana
  { title: 'Rencana Tarawih', desc: 'Atur rencana rakaat dan masjid tarawih', view: 'plan', id: 'tarawih-plan', kw: 'rakaat witir masjid malam qiyam' },
  { title: 'Doa & dzikir', desc: 'Kumpulan doa pilihan Ramadhan', view: 'plan', id: 'doa-panel', kw: 'doa zikir bacaan niat berbuka lailatul qadar' },
  { title: 'Catatan kultum & kajian', desc: 'Simpan ilmu dari kultum dan kajian', view: 'plan', id: 'kajian-notes', kw: 'ceramah ustaz ilmu catat ringkasan pengajian' },
  { title: 'Infaq & sedekah', desc: 'Buku catatan infaq dan sedekah', view: 'plan', id: 'infaq-ledger', kw: 'sedekah donasi catatan keuangan amal' },
  { title: 'Zakat fitrah', desc: 'Pelacak zakat fitrah keluarga', view: 'plan', id: 'zakat-tracker', kw: 'beras anggota keluarga bayar tunaikan' },
  { title: 'Kalkulator zakat', desc: 'Hitung zakat maal dan penghasilan', view: 'plan', find: ['Kalkulator zakat', 'Hitung zakat', 'Pengingat zakat'], kw: 'maal harta nisab hitung penghasilan emas' },
  { title: 'Generator kartu Lebaran', desc: 'Buat dan unduh kartu ucapan Idul Fitri', view: 'plan', id: 'eid-card-generator', kw: 'kartu ucapan idul fitri gambar bagikan salam' },
  { title: 'Puasa enam hari Syawal', desc: 'Pantau puasa sunnah Syawal', view: 'plan', id: 'syawal-tracker', find: ['Puasa enam hari Syawal', 'Puasa Syawal'], kw: 'sunnah syawal enam hari 6' },
  { title: 'Qadha puasa', desc: 'Catat utang puasa dan targetnya', view: 'plan', find: ['Qadha puasa'], kw: 'utang puasa ganti bayar hutang' },
  { title: 'Latihan puasa Sya’ban', desc: 'Persiapan puasa sebelum Ramadhan', view: 'plan', find: ['Latihan puasa'], kw: 'syaban latihan persiapan' },
  { title: 'Persiapan hati dan rencana', desc: 'Niat dan rencana sebelum Ramadhan', view: 'plan', find: ['Persiapan hati'], kw: 'niat visi target persiapan' },
  { title: 'Visi Ramadhan', desc: 'Tulis tujuan Ramadhanmu', view: 'plan', find: ['Visi Ramadhan'], kw: 'tujuan resolusi target impian' },
  { title: 'Iktikaf dan malam terakhir', desc: 'Panduan sepuluh malam terakhir', view: 'plan', find: ['Iktikaf'], kw: 'lailatul qadar malam ganjil sepuluh terakhir' },
  { title: 'Jurnal doa khusus', desc: 'Tulis doa pribadimu', view: 'plan', find: ['Jurnal doa'], kw: 'doa pribadi catatan harapan' },
  { title: 'Panduan Shalat Id', desc: 'Tata cara shalat Idul Fitri', view: 'plan', find: ['Panduan Shalat Id'], kw: 'idul fitri takbir lebaran tata cara' },
  { title: 'Silaturahmi dan maaf', desc: 'Daftar keluarga dan permohonan maaf', view: 'plan', find: ['Silaturahmi'], kw: 'keluarga maaf kunjungan lebaran' },
  { title: 'Safarnama', desc: 'Panduan ibadah saat bepergian', view: 'plan', find: ['Safarnama'], kw: 'safar musafir perjalanan mudik jamak qashar' },
  { title: 'Jaga kebiasaan sepanjang tahun', desc: 'Istiqamah setelah Ramadhan', view: 'plan', find: ['Jaga kebiasaan'], kw: 'istiqamah konsisten kebiasaan' },
  { title: 'Progres pertengahan Ramadhan', desc: 'Tinjau progres dan pengingat lembut', view: 'plan', find: ['Progres pertengahan'], kw: 'evaluasi lelah ritme' },

  // Kalender
  { title: 'Kalender ibadah', desc: 'Kalender bulanan dengan tanggal Hijriah', view: 'calendar', find: ['Kalender ibadah'], kw: 'tanggal hijriah bulan hari ramadhan lebaran' },
  { title: 'Ringkasan target', desc: 'Rekap target di tanggal terpilih', view: 'calendar', find: ['Ringkasan target'], kw: 'rekap tanggal terpilih' },

  // Mutabaah
  { title: 'Shalat fardhu', desc: 'Centang lima shalat wajib hari ini', view: 'daily', find: ['Shalat fardhu'], kw: 'wajib lima waktu subuh dzuhur ashar maghrib isya catat mutabaah' },
  { title: 'Amalan sunnah dan harian', desc: 'Rawatib, dhuha, tarawih, witir, zikir', view: 'daily', find: ['Amalan sunnah'], kw: 'rawatib dhuha witir tarawih zikir pagi petang sunnah checklist' },
  { title: 'Tilawah Al-Qur’an', desc: 'Catat halaman tilawah hari ini', view: 'daily', find: ['Tilawah'], kw: 'baca quran halaman tadarus khatam juz' },
  { title: 'Sedekah hari ini', desc: 'Catat nominal sedekah harian', view: 'daily', find: ['Sedekah'], kw: 'infaq nominal rupiah amal' },
  { title: 'Jurnal singkat', desc: 'Catatan, suasana hati, dan refleksi harian', view: 'daily', find: ['Jurnal singkat'], kw: 'catatan harian mood hati refleksi diary muhasabah' },
  { title: 'Catat mutabaah', desc: 'Checklist ibadah harian', view: 'daily', find: ['Shalat fardhu'], kw: 'mutabaah yaumiyah harian tandai checklist jurnal' },

  // Rapor
  { title: 'Mutabaah 7 hari terakhir', desc: 'Grafik konsistensi sepekan', view: 'report', find: ['Mutabaah 7 hari'], kw: 'rapor grafik mingguan laporan statistik' },
  { title: 'Akumulasi', desc: 'Total shalat, tilawah, dan sedekah', view: 'report', find: ['Akumulasi'], kw: 'total rapor evaluasi laporan rekap' },
  { title: 'Rapor Ramadhan', desc: 'Evaluasi perjalanan ibadahmu', view: 'report', find: ['Mutabaah 7 hari'], kw: 'evaluasi laporan progres hasil' },

  // Akun / pengaturan
  { title: 'Profil dan tanggal', desc: 'Nama panggilan dan tanggal awal Ramadhan', view: 'settings', find: ['Profil dan tanggal'], kw: 'nama akun awal ramadhan tanggal 1 ramadhan' },
  { title: 'Lokasi & metode jadwal', desc: 'Kota, koordinat, metode hitung, madzhab', view: 'settings', id: 'prayer-settings', find: ['Lokasi & metode'], kw: 'kota gps koordinat lokasi zona waktu metode madzhab hanafi syafii imsak koreksi' },
  { title: 'Pengingat waktu shalat', desc: 'Notifikasi saat waktu shalat tiba', view: 'settings', find: ['Pengingat waktu'], kw: 'notifikasi alarm adzan ingatkan' },
  { title: 'Tema tampilan', desc: 'Muslim/Muslimah dan mode terang/gelap', view: 'settings', find: ['Tema tampilan'], kw: 'warna mode gelap terang muslim muslimah dark light tampilan' },
  { title: 'Privasi dan cadangan', desc: 'Unduh cadangan, pulihkan, atau hapus data', view: 'settings', find: ['Privasi dan cadangan'], kw: 'backup ekspor impor pulihkan hapus data privasi simpan file json' },
  { title: 'Pasang aplikasi', desc: 'Pasang RamadhanPro di layar utama', view: null, run: 'install', kw: 'install pwa layar utama homescreen aplikasi offline' },
  { title: 'Bantuan & tentang', desc: 'Panduan, daftar fitur, versi, dan privasi', view: null, run: 'help', kw: 'panduan bantuan tentang versi cara pakai privasi kurniapedia' },
];

/** Bangun indeks lengkap = fitur + setiap doa. `doa` = array dari src/data/doa.js. */
export function buildIndex(doa = []) {
  const items = FEATURES.map((f, i) => ({
    key: `f${i}`,
    kind: f.run ? 'Aksi' : 'Fitur',
    title: f.title,
    desc: f.desc,
    view: f.view,
    id: f.id || null,
    find: f.find || null,
    sel: f.sel || null,
    run: f.run || null,
    _title: tokens(f.title),
    _kw: tokens(`${f.kw || ''} ${f.desc || ''}`),
    _body: [],
  }));
  doa.forEach((d, i) => {
    const [title, arab, latin, arti, rujukan] = d;
    items.push({
      key: `d${i}`,
      kind: 'Doa',
      title,
      desc: arti,
      view: 'plan',
      id: 'doa-panel',
      doaIndex: i,
      _title: tokens(`${title} doa`),
      _kw: tokens(`doa dzikir bacaan ${rujukan || ''}`),
      _body: [...tokens(latin), ...tokens(arti), ...tokens(arab)],
    });
  });
  return items;
}

/* ───────────── 3. Pencocokan ───────────── */

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      // dua huruf tertukar ("zakta" → "zakat") dihitung 1 salah ketik
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Skor satu kata kueri terhadap daftar kata (0 = tidak cocok). */
function matchWord(q, words) {
  let best = 0;
  for (const w of words) {
    let s = 0;
    if (w === q) s = 100;
    else if (w.startsWith(q)) s = q.length >= 2 ? 78 : 40;
    else if (q.length >= 3 && w.includes(q)) s = 52;
    else if (q.length >= 4 && w.length >= 4) {
      const max = q.length >= 8 ? 2 : 1;
      const cand = w.length > q.length + 1 ? w.slice(0, q.length + 1) : w;
      const d = editDistance(q, cand, max);
      // Kata pendek hanya dimaafkan bila huruf yang sama hanya tertukar urutan ("zakta" → "zakat"),
      // supaya "gelap" tidak nyasar ke "gelas".
      const swapOnly = [...q].sort().join('') === [...cand].sort().join('');
      if (d <= max && (q.length >= 6 || swapOnly)) s = 46 - d * 8;
    }
    if (s > best) best = s;
    if (best === 100) break;
  }
  return best;
}

function scoreItem(item, qTokens) {
  let total = 0;
  for (const q of qTokens) {
    const t = matchWord(q, item._title);
    const k = matchWord(q, item._kw);
    const b = matchWord(q, item._body);
    const s = Math.max(t * 1.6, k * 1.1, b * 0.8);
    if (s === 0) return 0; // semua kata kueri harus ada
    total += s;
  }
  // bonus bila seluruh kueri adalah awalan judul / persis judul
  const joined = item._title.join(' ');
  const qJoined = qTokens.join(' ');
  if (joined === qJoined) total += 120;
  else if (joined.startsWith(qJoined)) total += 45;
  if (item.kind === 'Fitur') total += 4;
  return total;
}

/** Cari. Mengembalikan item terurut dari yang paling cocok. */
export function search(query, index, limit = 8) {
  const q = tokens(query);
  if (!q.length || (q.length === 1 && q[0].length < 2)) return [];
  return index
    .map(item => ({ item, score: scoreItem(item, q) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.length - b.item.title.length)
    .slice(0, limit)
    .map(r => r.item);
}

/** Saran saat kolom cari masih kosong. */
export function quickSuggestions(index) {
  const want = ['Doa berbuka puasa', 'Jadwal shalat & imsak', 'Kalkulator zakat', 'Kalender ibadah', 'Tema tampilan', 'Privasi dan cadangan'];
  const found = [];
  for (const title of want) {
    const hit = index.find(i => fold(i.title) === fold(title)) || index.find(i => fold(i.title).startsWith(fold(title).slice(0, 9)));
    if (hit && !found.includes(hit)) found.push(hit);
  }
  return found;
}

/** Bungkus bagian judul yang cocok dengan <mark>. Mengembalikan HTML aman. */
export function highlight(text, query, esc) {
  const safe = esc(text);
  const words = [...new Set(fold(query).split(' ').filter(w => w.length >= 2))];
  if (!words.length) return safe;
  // Cocokkan di teks asli per kata (tanpa aksen) — cukup untuk judul pendek.
  const plain = String(text);
  const marks = new Array(plain.length).fill(false);
  const lower = plain.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (lower.length === plain.length) {
    for (const w of words) {
      const canon = CANON[w] || w;
      const variants = new Set([w, canon, ...Object.entries(CANON).filter(([, c]) => c === canon).map(([v]) => v)]);
      for (const v of variants) {
        let from = 0;
        while (v.length >= 2) {
          const at = lower.indexOf(v, from);
          if (at < 0) break;
          for (let i = at; i < at + v.length; i += 1) marks[i] = true;
          from = at + v.length;
        }
      }
    }
  }
  let out = '', open = false;
  for (let i = 0; i < plain.length; i += 1) {
    if (marks[i] && !open) { out += '<mark>'; open = true; }
    if (!marks[i] && open) { out += '</mark>'; open = false; }
    out += esc(plain[i]);
  }
  if (open) out += '</mark>';
  return out || safe;
}

/* ───────────── 4. Tampilan (hanya di browser) ───────────── */

const KIND_ICON = {
  Fitur: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  Doa: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  Aksi: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
};

const VIEW_LABEL = { home: 'Beranda', plan: 'Rencana', calendar: 'Kalender', daily: 'Mutabaah', report: 'Rapor', settings: 'Akun' };

/**
 * Menghubungkan kolom cari (form[data-search-form]) dengan daftar hasil.
 * - index: hasil buildIndex()
 * - onPick(item): dipanggil saat hasil dipilih (pindah halaman, dll.)
 * - esc: fungsi escape HTML milik aplikasi
 */
export function attachSearchUI({ index, onPick, esc }) {
  const pop = document.createElement('div');
  pop.className = 'search-pop';
  pop.id = 'search-pop';
  pop.setAttribute('role', 'listbox');
  pop.hidden = true;
  document.body.appendChild(pop);

  let input = null, shown = [], active = -1, lastQuery = '';

  const icon = kind => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KIND_ICON[kind] || KIND_ICON.Fitur}</svg>`;

  function place() {
    if (pop.hidden || !input || !document.contains(input)) return;
    const form = input.closest('form') || input;
    const r = form.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewH = vv ? vv.height : window.innerHeight;
    if (r.bottom < 0 || r.top > viewH) { close(); return; } // kolom cari tergulir keluar layar
    const offTop = vv ? vv.offsetTop : 0;
    const below = viewH - (r.bottom - offTop) - 14;
    const above = r.top - offTop - 14;
    const flip = below < 190 && above > below;
    const room = Math.max(150, flip ? above : below);
    pop.style.left = `${Math.max(8, r.left)}px`;
    pop.style.width = `${Math.min(r.width, window.innerWidth - 16)}px`;
    pop.style.maxHeight = `${Math.min(room, 420)}px`;
    if (flip) { pop.style.top = 'auto'; pop.style.bottom = `${window.innerHeight - r.top + 8}px`; }
    else { pop.style.bottom = 'auto'; pop.style.top = `${r.bottom + 8}px`; }
  }

  function close() {
    pop.hidden = true;
    active = -1;
    input?.setAttribute('aria-expanded', 'false');
    input?.removeAttribute('aria-activedescendant');
  }

  function setActive(n) {
    const rows = pop.querySelectorAll('.search-row');
    if (!rows.length) return;
    active = (n + rows.length) % rows.length;
    rows.forEach((row, i) => {
      row.classList.toggle('is-active', i === active);
      row.setAttribute('aria-selected', i === active ? 'true' : 'false');
    });
    const row = rows[active];
    input?.setAttribute('aria-activedescendant', row.id);
    row.scrollIntoView({ block: 'nearest' });
  }

  function row(item, i, q) {
    const where = item.view ? VIEW_LABEL[item.view] : item.kind;
    return `<button type="button" class="search-row" role="option" id="search-opt-${i}" data-search-pick="${i}" aria-selected="false">
      <span class="search-ico" data-kind="${item.kind}">${icon(item.kind)}</span>
      <span class="search-txt"><b>${q ? highlight(item.title, q, esc) : esc(item.title)}</b><small>${esc(item.desc || '')}</small></span>
      <span class="search-where">${esc(where)}</span>
    </button>`;
  }

  function show(query) {
    lastQuery = query;
    const q = query.trim();
    shown = q.length >= 2 ? search(q, index, 8) : quickSuggestions(index);
    let html;
    if (shown.length) {
      const hasQ = q.length >= 2;
      html = `<div class="search-head">${hasQ ? `${shown.length} hasil` : 'Pencarian cepat'}</div>${shown.map((it, i) => row(it, i, hasQ ? q : '')).join('')}`;
    } else {
      html = `<div class="search-empty"><b>Tidak ada hasil untuk “${esc(q)}”</b><span>Coba kata lain, misalnya: shalat, doa berbuka, zakat, kalender, tema, cadangan.</span></div>`;
    }
    pop.innerHTML = html;
    pop.hidden = false;
    active = -1;
    input?.setAttribute('aria-expanded', 'true');
    place();
    if (shown.length && q.length >= 2) setActive(0);
  }

  function pick(i) {
    const item = shown[i];
    if (!item) return;
    close();
    if (input) { input.value = ''; input.blur(); }
    onPick(item);
  }

  const inputOf = target => target?.closest?.('[data-search-form] input');

  document.addEventListener('focusin', e => {
    const el = inputOf(e.target);
    if (!el) return;
    input = el;
    show(el.value);
  });

  document.addEventListener('input', e => {
    const el = inputOf(e.target);
    if (!el) return;
    input = el;
    show(el.value);
  });

  document.addEventListener('keydown', e => {
    const el = inputOf(e.target);
    if (!el || pop.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0) pick(active); }
    else if (e.key === 'Escape') { e.preventDefault(); if (el.value) { el.value = ''; show(''); } else { close(); el.blur(); } }
    else if (e.key === 'Tab') close();
  });

  // Tombol pilih: pointerdown dicegah agar kolom cari tidak kehilangan fokus sebelum klik.
  pop.addEventListener('mousedown', e => e.preventDefault());
  pop.addEventListener('click', e => {
    const btn = e.target.closest('[data-search-pick]');
    if (btn) pick(Number(btn.dataset.searchPick));
  });

  // Tombol hapus (×) di dalam kolom cari
  document.addEventListener('click', e => {
    const clear = e.target.closest?.('[data-search-clear]');
    if (clear) {
      const el = clear.parentNode.querySelector('input');
      el.value = '';
      el.focus();
      input = el;
      show('');
      return;
    }
    if (!pop.hidden && !e.target.closest('[data-search-form]') && !pop.contains(e.target)) close();
  });

  // Submit (tombol Go di keyboard HP) = pilih hasil teratas.
  document.addEventListener('submit', e => {
    if (!e.target.closest?.('[data-search-form]')) return;
    e.preventDefault();
    const el = e.target.querySelector('input');
    if (!el) return;
    input = el;
    if (pop.hidden || lastQuery !== el.value) show(el.value);
    if (active >= 0) pick(active);
    else el.focus();
  });

  window.addEventListener('resize', place, { passive: true });
  window.addEventListener('scroll', place, { passive: true });
  window.visualViewport?.addEventListener('resize', place, { passive: true });
  window.visualViewport?.addEventListener('scroll', place, { passive: true });

  return { close, show };
}

/** Sorot bagian tujuan sesaat agar mudah terlihat. Dipakai app.js setelah pindah halaman. */
export function flash(el) {
  if (!el) return;
  el.classList.remove('search-hit');
  void el.offsetWidth; // mulai ulang animasi
  el.classList.add('search-hit');
  window.setTimeout(() => el.classList.remove('search-hit'), 2400);
}
