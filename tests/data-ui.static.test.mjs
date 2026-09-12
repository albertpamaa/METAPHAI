import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(directory,entry.name)):join(directory,entry.name));
const htmlFiles=walk(join(root,'datos')).filter(file=>file.endsWith('.html'));
const interactive=htmlFiles.filter(file=>/data-explorer\.js/.test(readFileSync(file,'utf8')));
assert.equal(htmlFiles.length,11);
assert.equal(interactive.length,9);

for(const file of htmlFiles){
  const html=readFileSync(file,'utf8');
  const ids=[...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,`ID estático duplicado en ${relative(root,file)}`);
  assert.match(html,/data\.css\?v=20260912-5/);
  for(const block of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(block[1]),`JSON-LD inválido en ${relative(root,file)}`);
  for(const link of html.matchAll(/(?:href|src)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)){
    const target=link[1];
    if(!target.startsWith('/')||target.startsWith('//'))continue;
    const local=target.endsWith('/')?join(root,target.slice(1),'index.html'):join(root,target.slice(1));
    assert.equal(existsSync(local),true,`Ruta interna inexistente: ${target} en ${relative(root,file)}`);
  }
}

for(const file of interactive){
  const html=readFileSync(file,'utf8');
  assert.match(html,/data-explorer\.js\?v=20260912-5/);
  for(const id of ['data_app','year_select','country_search','ranking_body','insights','compare_list','chart','chart_legend','chart_table_body','download_csv','source_box'])assert.match(html,new RegExp(`id=["']${id}["']`),`${id} falta en ${relative(root,file)}`);
}

const explorer=readFileSync(join(root,'assets/js/data-explorer.js'),'utf8');
const core=readFileSync(join(root,'assets/js/data-core.mjs'),'utf8');
const css=readFileSync(join(root,'assets/css/data.css'),'utf8');
for(const token of ["e.key==='ArrowDown'","e.key==='ArrowUp'","e.key==='Enter'","e.key==='Escape'",'aria-activedescendant','aria-expanded','role="combobox"','role="listbox"','onpointerdown','onpointermove','renderChart()','aria-pressed','aria-sort'])assert.equal(explorer.includes(token),true,`Contrato UI ausente: ${token}`);
assert.equal(core.includes('Intl.NumberFormat'),true);
assert.equal(explorer.includes('.toFixed('),false);
assert.match(css,/@media\(max-width:600px\)/);
assert.match(css,/@media\(max-width:420px\)/);
assert.match(css,/touch-action:pan-y/);
assert.match(css,/\.chart svg\{[^}]*height:clamp\(420px,42vw,500px\)/);
assert.match(explorer,/axisFont=mobile\?14:10/);
assert.match(explorer,/style="font-size:\$\{axisFont\}px"/);
assert.match(explorer,/class="chart-unit" style="font-size:\$\{unitFont\}px"/);
assert.match(explorer,/AXIS_UNITS=\{'poblacion':'Personas'/);
assert.match(explorer,/fmt\(value,'axis'\)/);
assert.doesNotMatch(explorer,/mobile\?'axis':'card'/);
assert.match(explorer,/w=mobile\?Math\.max\(280,measuredWidth\):1060/);
assert.match(explorer,/h=mobile\?\(viewportWidth<=420\?320:viewportWidth<=600\?350:410\):480/);
assert.match(explorer,/measureAxisWidth\(tickLabels,axisFont,chart\)\+12/);
assert.match(explorer,/mobile\?\{l:mobileLeft,r:16,t:34,b:44\}:\{l:64,r:24,t:32,b:44\}/);
assert.match(explorer,/getComputedTextLength/);
assert.doesNotMatch(css,/@media\(max-width:\d+px\)\{\.chart-axis\{font-size:/);
assert.match(css,/\.chart-unit\{font-size:11px;font-weight:600/);

const registry=JSON.parse(readFileSync(join(root,'assets/data/indicators.json'),'utf8'));
assert.equal(registry.indicators.length,8);
for(const indicator of registry.indicators){
  assert.ok(indicator.presentation?.formatType);
  assert.ok(Number.isInteger(indicator.presentation?.decimals));
  assert.ok(indicator.presentation?.unitLabel);
  assert.ok(indicator.presentation?.changeType);
  assert.doesNotThrow(()=>JSON.parse(readFileSync(join(root,'assets/data/worldbank',`${indicator.slug}.json`),'utf8')));
}
assert.doesNotThrow(()=>JSON.parse(readFileSync(join(root,'assets/data/worldbank/countries.json'),'utf8')));

console.log(`data-ui-static: ${htmlFiles.length} páginas, ${interactive.length} interactivas y 8 indicadores OK`);
