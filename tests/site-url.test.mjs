import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSiteUrl, siteMetaTags } from '../config/site-url.js';

test('SITE_URL punya prioritas tertinggi dan dinormalkan', () => {
  assert.equal(resolveSiteUrl({ SITE_URL: 'https://kurniapedia.my.id/ramadhanpro', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' }), 'https://kurniapedia.my.id/ramadhanpro/');
  assert.equal(resolveSiteUrl({ SITE_URL: 'contoh.id' }), 'https://contoh.id/');
});

test('Vercel: nama host tanpa protokol diberi https', () => {
  assert.equal(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'ramadhanpro.vercel.app' }), 'https://ramadhanpro.vercel.app/');
});

test('GitHub Pages: situs proyek dan situs pengguna', () => {
  assert.equal(resolveSiteUrl({ GITHUB_REPOSITORY: 'Kurniapedia/ramadhanpro' }), 'https://kurniapedia.github.io/ramadhanpro/');
  assert.equal(resolveSiteUrl({ GITHUB_REPOSITORY: 'kurnia/kurnia.github.io' }), 'https://kurnia.github.io/');
});

test('tanpa informasi atau nilai tidak valid: null', () => {
  assert.equal(resolveSiteUrl({}), null);
  assert.equal(resolveSiteUrl(), null);
  assert.equal(resolveSiteUrl({ SITE_URL: '   ' }), null);
  assert.equal(resolveSiteUrl({ SITE_URL: 'javascript:alert(1)' }), null);
  assert.equal(resolveSiteUrl({ GITHUB_REPOSITORY: 'tanpa-garis-miring' }), null);
});

test('query dan hash dibuang dari alamat', () => {
  assert.equal(resolveSiteUrl({ SITE_URL: 'https://a.id/x?utm=1#top' }), 'https://a.id/x/');
});

test('tag meta: kosong tanpa alamat, lengkap dengan alamat', () => {
  assert.deepEqual(siteMetaTags(null), []);
  const tags = siteMetaTags('https://a.id/app/');
  const byKey = Object.fromEntries(tags.map(t => [t.attrs.property || t.attrs.name || t.attrs.rel, t.attrs.content || t.attrs.href]));
  assert.equal(byKey['og:image'], 'https://a.id/app/og-image.png');
  assert.equal(byKey['og:url'], 'https://a.id/app/');
  assert.equal(byKey.canonical, 'https://a.id/app/');
  assert.equal(byKey['twitter:card'], 'summary_large_image');
  assert.ok(tags.every(t => t.injectTo === 'head'));
});
