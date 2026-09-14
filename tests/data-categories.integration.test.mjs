import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DATA_LANGUAGES,DATA_PAGES,countryRoute} from '../assets/js/data-routes.mjs';
import {languageConfig} from '../assets/js/data-i18n.mjs';
import {dataViews} from '../assets/js/data-views-i18n.mjs';

const root=resolve(import.meta.dirname,'..');
const registry=JSON.parse(readFileSync(join(root,'assets/data/indicators.json'),'utf8'));
const languages=Object.keys(DATA_LANGUAGES),categoryIds=registry.categories.map(category=>category.id);
assert.equal(registry.indicators.length,22);
assert.equal(registry.categories.length,6);
assert.deepEqual(registry.categories.map(category=>category.order),[1,2,3,4,5,6]);
assert.equal(new Set(categoryIds).size,categoryIds.length);
for(const item of registry.indicators){
  assert.ok(categoryIds.includes(item.category),`${item.slug}: categoría inválida`);
  assert.ok(existsSync(join(root,'assets/data/worldbank',`${item.slug}.json`)),`${item.slug}: dataset ausente`);
  const page=Object.values(DATA_PAGES).find(candidate=>candidate.indicator===item.slug);
  assert.ok(page,`${item.slug}: rutas ausentes`);
  for(const language of languages){
    const i18n=languageConfig(language);
    assert.ok(i18n.categories[item.category],`${language}/${item.category}: categoría sin traducir`);
    assert.ok(i18n.indicators[item.slug]?.name,`${language}/${item.slug}: nombre sin traducir`);
    const file=join(root,...page[language].split('/').filter(Boolean),'index.html');
    assert.ok(existsSync(file),`${page[language]}: página ausente`);
  }
}
for(const category of registry.categories)assert.ok(registry.indicators.some(item=>item.category===category.id),`${category.id}: categoría vacía`);
for(const language of languages){
  const landing=readFileSync(join(root,...DATA_PAGES.home[language].split('/').filter(Boolean),'index.html'),'utf8');
  const explorer=readFileSync(join(root,...DATA_PAGES.explorer[language].split('/').filter(Boolean),'index.html'),'utf8');
  const country=readFileSync(join(root,...countryRoute(language,'ESP').split('/').filter(Boolean),'index.html'),'utf8');
  const compare=readFileSync(join(root,...DATA_PAGES.compare[language].split('/').filter(Boolean),'index.html'),'utf8');
  const rankings=readFileSync(join(root,...DATA_PAGES.rankings[language].split('/').filter(Boolean),'index.html'),'utf8');
  const sources=readFileSync(join(root,...DATA_PAGES.sources[language].split('/').filter(Boolean),'index.html'),'utf8');
  const indicatorBlock=landing.match(/<!-- DATA_LANDING_INDICATORS:START -->([\s\S]*?)<!-- DATA_LANDING_INDICATORS:END -->/)?.[1]||'';
  const discoveryBlock=landing.match(/<!-- DATA_DISCOVERY:START -->([\s\S]*?)<!-- DATA_DISCOVERY:END -->/)?.[1]||'';
  const cards=[...indicatorBlock.matchAll(/data-indicator-card="([^"]+)"/g)].map(match=>match[1]);
  const categories=[...indicatorBlock.matchAll(/data-category="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(cards.length,22,`${language}: la sección principal no muestra 22 indicadores`);
  assert.equal(new Set(cards).size,22,`${language}: indicadores duplicados`);
  assert.deepEqual(cards,registry.categories.flatMap(category=>registry.indicators.filter(item=>item.category===category.id).map(item=>item.slug)),`${language}: orden de indicadores incorrecto`);
  assert.deepEqual(categories,categoryIds,`${language}: categorías ausentes o desordenadas`);
  assert.ok(indicatorBlock.includes(dataViews(language).availableIndicators),`${language}: título de indicadores incorrecto`);
  assert.equal(discoveryBlock.includes('data-indicator-card='),false,`${language}: listado duplicado bajo Explorar`);
  assert.equal(landing.includes('landing-indicators'),false,`${language}: bloque inferior antiguo presente`);
  for(const item of registry.indicators){
    const page=Object.values(DATA_PAGES).find(candidate=>candidate.indicator===item.slug),localized=languageConfig(language).indicators[item.slug];
    assert.ok(indicatorBlock.includes(`data-indicator-card="${item.slug}" href="${page[language]}"`),`${language}/${item.slug}: enlace localizado ausente`);
    assert.ok(indicatorBlock.includes(`<h2>${localized.name.replaceAll('&','&amp;')}</h2>`)||indicatorBlock.includes(`<h2>${localized.name}</h2>`),`${language}/${item.slug}: nombre ausente`);
    assert.ok(indicatorBlock.includes(localized.description.replaceAll('&','&amp;'))||indicatorBlock.includes(localized.description),`${language}/${item.slug}: descripción ausente`);
  }
  assert.equal(indicatorBlock.includes('�'),false,`${language}: mojibake en indicadores`);
  if(language==='ar')assert.match(landing,/<html lang="ar" dir="rtl">/);
  for(const category of registry.categories){
    const label=languageConfig(language).categories[category.id];
    assert.ok(landing.includes(label),`${language}: landing sin ${label}`);
    assert.ok(explorer.includes(label),`${language}: explorador sin ${label}`);
    assert.ok(country.includes(label),`${language}: país sin ${label}`);
    assert.ok(compare.includes(label),`${language}: comparador sin ${label}`);
    assert.ok(rankings.includes(label),`${language}: rankings sin ${label}`);
    assert.ok(sources.includes(label),`${language}: fuentes sin ${label}`);
  }
}
console.log('data-categories: landings 15/15 con 22 indicadores únicos, 6 categorías y sin duplicación; integración global OK');
