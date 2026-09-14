import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import * as CORE from '../assets/js/data-core.mjs';
import * as VIEWS from '../assets/js/data-view-core.mjs';
import {DATA_LANGUAGES,DATA_PAGES,countryRoute} from '../assets/js/data-routes.mjs';

const root=resolve(import.meta.dirname,'..'),read=path=>readFileSync(join(root,path),'utf8'),countries=JSON.parse(read('assets/data/worldbank/countries.json')).countries,localizedEs=VIEWS.localizedCountries(countries,'es-ES'),runtime=read('assets/js/data-map.js'),css=read('assets/css/data.css'),languages=Object.keys(DATA_LANGUAGES);
for(const query of ['esp','ESP','ES','espana'])assert.equal(CORE.searchCountries(localizedEs,query)[0]?.id,'ESP',`España no es el primer resultado para: ${query}`);
for(const code of ['GIB','TUV'])assert.equal(CORE.searchCountries(localizedEs,code)[0]?.id,code,`${code} debe seguir siendo seleccionable`);
const expectedRoutes={es:'/datos-globales/paises/esp/',en:'/en/global-data/countries/esp/',de:'/de/weltdaten/laender/esp/',ca:'/ca/global-data/paisos/esp/',ar:'/ar/global-data/countries/esp/'};
for(const [language,route] of Object.entries(expectedRoutes))assert.equal(countryRoute(language,'ESP'),route);
for(const language of languages){const route=DATA_PAGES.map[language],html=read(join(...route.split('/').filter(Boolean),'index.html'));for(const token of ['class="map-country-search-icon" aria-hidden="true"','<svg viewBox="0 0 24 24"','id="map_country" type="search"','role="combobox"','aria-autocomplete="list"','aria-controls="map_country_options"','id="map_country_options"','role="listbox"','data.css?v=20260914-6','data-map.js?v=20260914-6'])assert.ok(html.includes(token),`${language}: contrato combobox/asset ausente: ${token}`)}
for(const token of ['CORE.searchCountries','countrySearchAliases',"event.key==='ArrowDown'","event.key==='ArrowUp'","event.key==='Enter'","event.key==='Escape'",'aria-activedescendant','scrollIntoView','setupCountryCombobox()','showCountry(code)','input.dataset.selected=code',"classList.toggle('is-selected'",'location.assign(countryRoute(language,code))',".on('click',(event,feature)=>feature.properties.iso3&&navigateCountry(feature.properties.iso3))"])assert.ok(runtime.includes(token),`contrato de interacción ausente: ${token}`);
assert.ok(runtime.includes(".attr('fill',feature=>"),'el fill estadístico debe permanecer en el render del coropleta');
assert.doesNotMatch(runtime,/touchend|pointerup/,'el mapa debe usar una sola estrategia click/tap');const comboboxBody=runtime.match(/function setupCountryCombobox\(\)\{([\s\S]*?)\}\nfunction renderLegend/)?.[1]||'';assert.doesNotMatch(comboboxBody,/renderMap\(/,'filtrar países no debe reconstruir el mapa');
assert.match(css,/\.map-country\.is-selected[^}]*stroke:#d45f55[^}]*stroke-width:3\.2/);
assert.match(css,/@media\(max-width:560px\)[\s\S]*?\.map-country\.is-selected[^}]*stroke-width:4\.2/);
assert.ok(runtime.includes('if(selectedPath)selectedPath.parentNode.append(selectedPath)'),'GIB/TUV no deben exigir un path SVG');
const selectedRules=[...css.matchAll(/\.map-country\.is-selected[^}]*\{([^}]*)\}/g)].map(match=>match[1]).join(' ');assert.doesNotMatch(selectedRules,/\bfill\s*:/,'selected no debe alterar el fill estadístico');assert.match(css,/\.map-country\.is-selected:hover/);assert.match(css,/\.map-country-picker \.map-country-options\{[^}]*width:100%[^}]*max-height:240px/);assert.match(css,/\[dir="rtl"\] \.map-country-picker input/);
assert.match(css,/\.map-country-picker:before\{content:none\}/);assert.match(css,/\.map-country-search-icon\{[^}]*left:12px[^}]*width:18px[^}]*pointer-events:none/);assert.match(css,/\[dir="rtl"\] \.map-country-search-icon\{right:12px;left:auto\}/);
console.log('data-map-interactions: búsqueda localizada/ISO, teclado, GIB/TUV, coral selected, click localizado y 15 idiomas OK');
