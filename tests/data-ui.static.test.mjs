import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {DATA_PAGES} from '../assets/js/data-routes.mjs';

const root=resolve(import.meta.dirname,'..'),version='20260912-6',origin='https://metaphai.com';
const htmlByRoute=route=>readFileSync(join(root,...route.split('/').filter(Boolean),'index.html'),'utf8');
const routes=Object.entries(DATA_PAGES),esRoutes=routes.map(([,page])=>page.es),enRoutes=routes.map(([,page])=>page.en),allRoutes=[...esRoutes,...enRoutes];
assert.equal(routes.length,11);assert.equal(new Set(allRoutes).size,22);

for(const [key,page] of routes)for(const language of ['es','en']){
  const route=page[language],html=htmlByRoute(route),file=join(root,...route.split('/').filter(Boolean),'index.html');
  const ids=[...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,`ID estático duplicado en ${relative(root,file)}`);
  assert.match(html,new RegExp(`<html lang="${language}"`));
  assert.ok(html.includes(`<link rel="canonical" href="${origin}${route}">`));
  for(const hreflang of ['es','en'])assert.ok(html.includes(`<link rel="alternate" hreflang="${hreflang}" href="${origin}${page[hreflang]}">`));
  assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${origin}${page.es}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${origin}${route}">`));
  assert.ok(html.includes(`data-page-key="${key}"`));
  for(const targetLanguage of ['es','en'])assert.ok(html.includes(`data-language="${targetLanguage}" href="${page[targetLanguage]}"`));
  assert.match(html,new RegExp(`data-language="${language}"[^>]+aria-current="true"`));
  assert.match(html,new RegExp(`data\\.css\\?v=${version}`));assert.match(html,new RegExp(`data-language\\.js\\?v=${version}`));
  assert.doesNotMatch(html,/metaphai\.com\/datos\//);assert.doesNotMatch(html,/href=["']\/datos\//);
  const withoutSwitcher=html.replace(/<div class="language-switcher"[\s\S]*?<\/div><\/div><\/nav><\/header>/,'');
  if(language==='es')assert.doesNotMatch(withoutSwitcher,/href="\/en\/global-data\//,`Enlace interno EN accidental en ${route}`);
  else assert.doesNotMatch(withoutSwitcher,/href="\/datos-globales\//,`Enlace interno ES accidental en ${route}`);
  for(const block of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(block[1]),`JSON-LD inválido en ${relative(root,file)}`);
  for(const link of html.matchAll(/(?:href|src)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)){
    const target=link[1];if(!target.startsWith('/')||target.startsWith('//'))continue;
    const local=target.endsWith('/')?join(root,target.slice(1),'index.html'):join(root,target.slice(1));
    assert.equal(existsSync(local),true,`Ruta interna inexistente: ${target} en ${relative(root,file)}`);
  }
}

for(const route of enRoutes){
  const html=htmlByRoute(route).replace(/<head>[\s\S]*?<\/head>/,'').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<div class="language-switcher"[\s\S]*?<\/div><\/div><\/nav><\/header>/,'');
  const visible=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  for(const phrase of ['Inicio','Buscar país','Año común','País','Puesto','Datos destacados','Comparar países','Descargar datos','Fuentes y metodología','Qué mide','Sobre nosotros'])assert.equal(visible.includes(phrase),false,`Texto ES visible "${phrase}" en ${route}`);
}

const interactive=allRoutes.filter(route=>/data-explorer\.js/.test(htmlByRoute(route)));assert.equal(interactive.length,18);
for(const route of interactive){const html=htmlByRoute(route);assert.match(html,new RegExp(`data-explorer\\.js\\?v=${version}`));for(const id of ['data_app','year_select','country_search','ranking_body','insights','compare_list','chart','chart_legend','chart_table_body','download_csv','source_box'])assert.match(html,new RegExp(`id=["']${id}["']`),`${id} falta en ${route}`)}

const explorer=readFileSync(join(root,'assets/js/data-explorer.js'),'utf8'),core=readFileSync(join(root,'assets/js/data-core.mjs'),'utf8'),css=readFileSync(join(root,'assets/css/data.css'),'utf8');
for(const token of ["e.key==='ArrowDown'","e.key==='ArrowUp'","e.key==='Enter'","e.key==='Escape'",'aria-activedescendant','aria-expanded','role="combobox"','role="listbox"','onpointerdown','onpointermove','renderChart()','aria-pressed','aria-sort'])assert.equal(explorer.includes(token),true,`Contrato UI ausente: ${token}`);
assert.equal(core.includes('Intl.NumberFormat'),true);assert.equal(explorer.includes('.toFixed('),false);
assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/@media\(max-width:420px\)/);assert.match(css,/touch-action:pan-y/);assert.match(css,/\.chart svg\{[^}]*height:clamp\(420px,42vw,500px\)/);
assert.match(explorer,/axisFont=mobile\?14:10/);assert.match(explorer,/style="font-size:\$\{axisFont\}px"/);assert.match(explorer,/class="chart-unit" style="font-size:\$\{unitFont\}px"/);assert.match(explorer,/localizedIndicator\(\)\.axisUnit/);assert.match(explorer,/fmt\(value,'axis'\)/);assert.match(explorer,/measureAxisWidth\(tickLabels,axisFont,chart\)\+12/);assert.match(explorer,/mobile\?\{l:mobileLeft,r:16,t:34,b:44\}:\{l:64,r:24,t:32,b:44\}/);assert.match(explorer,/getComputedTextLength/);
assert.match(explorer,/languageConfig\(state\.language\)/);assert.match(explorer,/Intl\.DisplayNames/);assert.doesNotMatch(explorer,/languageConfig\('es'\)/);assert.doesNotMatch(explorer,/AXIS_UNITS/);
assert.match(explorer,/unit=localizedIndicator\(\)\.unitLabel\|\|state\.item\.unit/);

const registry=JSON.parse(readFileSync(join(root,'assets/data/indicators.json'),'utf8'));assert.equal(registry.indicators.length,8);
for(const indicator of registry.indicators)assert.doesNotThrow(()=>JSON.parse(readFileSync(join(root,'assets/data/worldbank',`${indicator.slug}.json`),'utf8')));
assert.doesNotThrow(()=>JSON.parse(readFileSync(join(root,'assets/data/worldbank/countries.json'),'utf8')));

const legacyRoutes=['','explorador','fuentes',...registry.indicators.map(indicator=>indicator.slug)];assert.equal(legacyRoutes.length,11);
for(const route of legacyRoutes){const legacy=readFileSync(join(root,'datos',route,'index.html'),'utf8'),target=`/datos-globales/${route?`${route}/`:''}`;assert.match(legacy,/<meta name="robots" content="noindex,follow">/);assert.ok(legacy.includes(`<link rel="canonical" href="${origin}${target}">`));assert.ok(legacy.includes(`<meta http-equiv="refresh" content="0; url=${target}">`))}

const sitemap=readFileSync(join(root,'sitemap.xml'),'utf8'),locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
assert.doesNotMatch(sitemap,/metaphai\.com\/datos\//);assert.equal(allRoutes.filter(route=>locs.includes(origin+route)).length,22);assert.equal(new Set(locs).size,locs.length);assert.match(sitemap,/xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
console.log(`data-ui-static: 22 páginas, ${interactive.length} interactivas, 11 pares SEO/idioma y 8 indicadores OK`);
