// Menentukan alamat publik situs saat build, untuk tag og:url, og:image, dan canonical.
// Tag Open Graph butuh alamat mutlak; karena domain bisa berbeda (Vercel, GitHub Pages, domain sendiri),
// alamatnya dibaca dari lingkungan build, bukan ditulis tetap di kode.
//
// Urutan prioritas:
//   1. SITE_URL                        (atur sendiri, mis. https://kurniapedia.my.id/ramadhanpro/)
//   2. VERCEL_PROJECT_PRODUCTION_URL   (otomatis di Vercel)
//   3. GITHUB_REPOSITORY               (otomatis di GitHub Actions → https://pemilik.github.io/nama-repo/)
// Mengembalikan alamat berakhiran "/" atau null bila tidak ditemukan / tidak valid.

function normalize(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    url.hash = '';
    url.search = '';
    return url.href.endsWith('/') ? url.href : `${url.href}/`;
  } catch {
    return null;
  }
}

export function resolveSiteUrl(env = {}) {
  const explicit = normalize(env.SITE_URL);
  if (explicit) return explicit;

  const vercel = normalize(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercel) return vercel;

  const repository = typeof env.GITHUB_REPOSITORY === 'string' ? env.GITHUB_REPOSITORY.split('/') : [];
  if (repository.length === 2 && repository[0] && repository[1]) {
    const [owner, name] = repository;
    return normalize(name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? `${owner}.github.io` : `${owner}.github.io/${name}`);
  }
  return null;
}

/** Tag <head> tambahan bila alamat situs diketahui. */
export function siteMetaTags(site) {
  if (!site) return [];
  return [
    { tag: 'link', attrs: { rel: 'canonical', href: site }, injectTo: 'head' },
    { tag: 'meta', attrs: { property: 'og:url', content: site }, injectTo: 'head' },
    { tag: 'meta', attrs: { property: 'og:image', content: `${site}og-image.png` }, injectTo: 'head' },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: 'RamadhanPro — pendamping ibadah Ramadhan' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
  ];
}
