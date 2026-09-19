import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DATA_LANGUAGES,DATA_PAGES,INSTITUTIONAL_PAGES,countryRoutes} from '../assets/js/data-routes.mjs';
import {validCountries} from '../assets/js/data-view-core.mjs';
import {GEOGRAPHY_ROUTES,geographyItemRoutes} from '../assets/js/geography-routes.mjs';
import {GAME_PAGES} from '../assets/js/games/game-routes.mjs';
import {ORIGIN,SITEMAP_SECTIONS,entryLocation,sectionPath,sitemapIndex,urlEntries} from '../scripts/sitemap-sections.mjs';
import {splitSitemap} from '../scripts/split-sitemap.mjs';

const root=resolve(import.meta.dirname,'..'),index=readFileSync(join(root,'sitemap.xml'),'utf8');
assert.equal(index,sitemapIndex());assert.match(index,/<sitemapindex\b/);assert.doesNotMatch(index,/<url>/);
const languages=Object.keys(DATA_LANGUAGES),sections={};
for(const [section,file] of Object.entries(SITEMAP_SECTIONS)){
  assert.equal((index.match(new RegExp(`<loc>${ORIGIN}/sitemaps/${file}</loc>`,'g'))||[]).length,1);
  const xml=readFileSync(sectionPath(root,section),'utf8'),entries=urlEntries(xml),urls=entries.map(entryLocation);
  assert.match(xml,/<urlset\b/);assert.ok(entries.length,`${section}: empty`);
  assert.equal(new Set(urls).size,urls.length,`${section}: duplicates`);
  assert.ok(Buffer.byteLength(xml)<50_000_000,`${section}: exceeds sitemap size limit`);
  for(const url of urls){const parsed=new URL(url);assert.equal(parsed.origin,ORIGIN);assert.equal(parsed.search,'');assert.equal(parsed.hash,'');assert.doesNotMatch(url,/\/datos\/|\/worked\/|indexv1\.html/)}
  sections[section]=new Set(urls);
}
const all=[...Object.values(sections).flatMap(set=>[...set])];assert.equal(new Set(all).size,all.length,'URL in more than one section');
const expectedData=new Set(Object.values(DATA_PAGES).flatMap(routes=>languages.map(language=>ORIGIN+routes[language])));
const countryData=JSON.parse(readFileSync(join(root,'assets/data/worldbank/countries.json'),'utf8'));
for(const country of validCountries(countryData.countries))for(const route of Object.values(countryRoutes(country.id)))expectedData.add(ORIGIN+route);
assert.deepEqual(sections.datos,expectedData);
const expectedGeo=new Set(Object.values(GEOGRAPHY_ROUTES).flatMap(routes=>languages.map(language=>ORIGIN+routes[language])));
for(const [key,file] of Object.entries({volcanoes:'volcanoes.json',mountains:'mountains.json',rivers:'rivers.json',deserts:'deserts.json'}))for(const item of JSON.parse(readFileSync(join(root,'assets/data/geography',file),'utf8')).entities)for(const route of Object.values(geographyItemRoutes(key,item.id)))expectedGeo.add(ORIGIN+route);
assert.deepEqual(sections.geografia,expectedGeo);
assert.deepEqual(sections.juegos,new Set(Object.values(GAME_PAGES).flatMap(routes=>languages.map(language=>ORIGIN+routes[language]))));
assert.deepEqual(sections.institucional,new Set([ORIGIN+'/',...[INSTITUTIONAL_PAGES.contact,INSTITUTIONAL_PAGES.about].flatMap(routes=>languages.map(language=>ORIGIN+routes[language]))]));
for(const url of sections.calculadoras)assert.match(new URL(url).pathname,/^\/(?:calculadoras\/|calculadora-|simulador-|planificador-|calendarios-laborales\/)/);
for(const section of ['datos','geografia','juegos'])for(const entry of urlEntries(readFileSync(sectionPath(root,section),'utf8'))){
  for(const language of languages)assert.ok(entry.includes(`hreflang="${language}"`),`${section}: missing ${language} alternate`);
  assert.ok(entry.includes('hreflang="x-default"'),`${section}: missing x-default`);
}
assert.equal((await splitSitemap()).changed,0,'sitemap split not idempotent');
console.log(`sitemap-sections: ${Object.entries(sections).map(([section,urls])=>`${section}=${urls.size}`).join(', ')}, total=${all.length}, 0 duplicates, routing and hreflang OK`);
