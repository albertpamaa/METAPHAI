import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DATA_LANGUAGES, DATA_PAGES, INSTITUTIONAL_PAGES } from '../assets/js/data-routes.mjs';
import * as CORE from '../assets/js/data-core.mjs';
import { prerender } from '../scripts/prerender-data-pages.mjs';

const root = resolve(import.meta.dirname, '..');
const languages = Object.keys(DATA_LANGUAGES);
const fileFor = route => route.endsWith('.html')
  ? join(root, route.slice(1))
  : join(root, ...route.split('/').filter(Boolean), 'index.html');
const htmlFor = route => readFileSync(fileFor(route), 'utf8');
const countries = JSON.parse(readFileSync(join(root, 'assets/data/worldbank/countries.json'), 'utf8')).countries;
const countryCodes = new Set(countries.filter(country => !country.is_aggregate).map(country => country.id));

let indicatorSnapshots = 0;
for (const page of Object.values(DATA_PAGES).filter(candidate => candidate.indicator)) {
  const data = JSON.parse(readFileSync(join(root, `assets/data/worldbank/${page.indicator}.json`), 'utf8'));
  const commonYear = CORE.commonYear(data.observations.filter(row => countryCodes.has(row.country)));
  for (const language of languages) {
    const html = htmlFor(page[language]);
    const snapshot = html.match(/<!-- DATA_PRERENDER:START -->([\s\S]*?)<!-- DATA_PRERENDER:END -->/)?.[1] || '';
    assert.ok(snapshot, `${page[language]}: snapshot inicial ausente`);
    assert.ok(snapshot.includes(`data-common-year="${commonYear}"`), `${page[language]}: año común desincronizado`);
    assert.equal((snapshot.match(/class="highlight-card"/g) || []).length, 5, `${page[language]}: resumen estadístico incompleto`);
    assert.ok(snapshot.includes('World Bank — World Development Indicators'));
    assert.match(snapshot, /snapshot-metadata/);
    assert.match(snapshot, /snapshot-features/);
    assert.ok(snapshot.includes('<ul>'), `${page[language]}: limitaciones ausentes`);
    assert.equal((html.match(/<!-- DATA_PRERENDER:START -->/g) || []).length, 1);
    indicatorSnapshots++;
  }
}
assert.equal(indicatorSnapshots, 330);

let explorerSnapshots = 0;
for (const language of languages) {
  const route = DATA_PAGES.explorer[language];
  const html = htmlFor(route);
  const snapshot = html.match(/<!-- DATA_PRERENDER:START -->([\s\S]*?)<!-- DATA_PRERENDER:END -->/)?.[1] || '';
  assert.match(snapshot, /explorer-prerender/);
  for (const page of Object.values(DATA_PAGES).filter(candidate => candidate.indicator)) assert.ok(snapshot.includes(`href="${page[language]}"`), `${route}: falta ${page[language]}`);
  assert.ok(snapshot.includes(`href="${DATA_PAGES.sources[language]}"`));
  assert.equal((html.match(/<!-- DATA_PRERENDER:START -->/g) || []).length, 1);
  explorerSnapshots++;
}
assert.equal(explorerSnapshots, 15);
assert.equal(await prerender(), 0, 'El prerender debe ser determinista e idempotente');

for (const language of languages) {
  const route = INSTITUTIONAL_PAGES.contact[language];
  const html = htmlFor(route);
  assert.equal(html.includes('adsbygoogle.js'), false, `${route}: conserva AdSense`);
  assert.equal(html.includes('google-adsense-account'), false, `${route}: conserva la cuenta AdSense en metadatos`);
  assert.ok(html.includes('googletagmanager.com/gtag/js?id=G-1P9N4QY0JR'), `${route}: Analytics ausente`);
}

const mojibake = /\uFFFD|Ã.|Â.|â(?:€|€™|€œ|€)|Ð.|Ñ.|à¤|ã(?:‚|ƒ|)|ì(?:›|ˆ|§)/u;
for (const language of languages) {
  const route = INSTITUTIONAL_PAGES.privacy[language];
  const html = htmlFor(route);
  assert.doesNotMatch(html, mojibake, `${route}: posible mojibake`);
  const headings = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gs)].map(match => match[1].replace(/<[^>]+>/g, ''));
  assert.equal(headings.length, 14, `${route}: número de apartados`);
  for (const [index, number] of [[4, '4.1'], [5, '4.2'], [6, '4.3'], [7, '5.'], [10, '8.'], [11, '9.'], [12, '10.'], [13, '11.']]) assert.ok(headings[index].includes(number), `${route}: orden incorrecto en ${number}`);
  const paragraphs = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map(match => match[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  assert.equal(new Set(paragraphs).size, paragraphs.length, `${route}: párrafo duplicado`);
  const rightsStart = html.indexOf(headings[10]);
  const retentionStart = html.indexOf(headings[11], rightsStart);
  assert.ok(html.indexOf('<ul>', rightsStart) < retentionStart, `${route}: lista de derechos fuera del apartado 8`);
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.ok(html.includes('mailto:info@metaphai.com'));
}

const explorerJs = readFileSync(join(root, 'assets/js/data-explorer.js'), 'utf8');
assert.match(explorerJs, /document\.querySelector\('\.explorer-prerender'\)\?\.remove\(\)/);
const overtime = readFileSync(join(root, 'calculadora-horas-extra/index.html'), 'utf8');
assert.ok(overtime.includes('Compensación por descanso: la estimación equivale a <span id="horas_descanso">'));
assert.equal(overtime.includes('Compensación por descanso: te corresponden <span id="horas_descanso">'), false);

console.log('adsense-audit-fixes: prerender 330+15, Contact 15/15, Privacy 15/15 y Horas extra OK');
