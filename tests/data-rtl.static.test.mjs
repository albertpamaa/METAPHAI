import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DATA_LANGUAGES,LOCALIZED_PAGES} from '../assets/js/data-routes.mjs';

const root=resolve(import.meta.dirname,'..'),languages=Object.keys(DATA_LANGUAGES);
const fileFor=route=>route.endsWith('.html')?join(root,route.slice(1)):join(root,...route.split('/').filter(Boolean),'index.html');
for(const [key,page] of Object.entries(LOCALIZED_PAGES)){
  const arabic=readFileSync(fileFor(page.ar),'utf8');
  assert.match(arabic,/<html lang="ar" dir="rtl">/,`${key}: documento árabe sin RTL`);
  assert.ok(arabic.includes(`data-page-key="${key}"`),`${key}: selector ausente`);
  assert.equal((arabic.match(/data-language="/g)||[]).length,15,`${key}: selector incompleto`);
  assert.equal((arabic.match(/dir="auto"/g)||[]).length,15,`${key}: nombres del selector sin aislamiento bidireccional`);
  assert.match(arabic,/<header>[\s\S]*?<footer>/,`${key}: estructura principal incompleta`);
  for(const language of languages.filter(code=>code!=='ar')){
    const html=readFileSync(fileFor(page[language]),'utf8');
    assert.doesNotMatch(html,/<html[^>]+dir="rtl"/,`${key}/${language}: RTL accidental`);
  }
}
for(const key of ['explorer',...Object.entries(LOCALIZED_PAGES).filter(([,page])=>page.indicator).map(([key])=>key)]){
  const html=readFileSync(fileFor(LOCALIZED_PAGES[key].ar),'utf8');
  for(const id of ['data_app','year_select','country_search','ranking_body','compare_list','chart','download_csv'])assert.ok(html.includes(`id="${id}"`),`${key}: control RTL ausente (${id})`);
}
const css=readFileSync(join(root,'assets/css/data.css'),'utf8'),explorer=readFileSync(join(root,'assets/js/data-explorer.js'),'utf8');
for(const token of ['[dir="rtl"] body','[dir="rtl"] .language-menu','[dir="rtl"] .chart','[dir="rtl"] input','[dir="rtl"] .email-copy'])assert.ok(css.includes(token),`CSS RTL ausente: ${token}`);
assert.match(explorer,/sort\(\(a,b\)=>a\.year-b\.year\)/,'La cronología del gráfico debe conservar orden ascendente');
assert.equal(explorer.includes("state.language==='ar'"),false,'RTL no debe alterar los datos en JavaScript');
console.log(`data-rtl-static: ${Object.keys(LOCALIZED_PAGES).length} páginas AR, selector, CSS RTL y cronología LTR matemática OK`);
