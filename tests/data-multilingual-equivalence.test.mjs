import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {commonYear,historicalChange,median,ranking,rangeSeries} from '../assets/js/data-core.mjs';
import {DATA_LANGUAGES} from '../assets/js/data-routes.mjs';
import {languageConfig} from '../assets/js/data-i18n.mjs';
const root=resolve(import.meta.dirname,'..'),json=path=>JSON.parse(readFileSync(resolve(root,path),'utf8')),registry=json('assets/data/indicators.json'),countries=json('assets/data/worldbank/countries.json').countries,valid=new Set(countries.filter(row=>!row.is_aggregate).map(row=>row.id)),languages=Object.keys(DATA_LANGUAGES);
for(const item of registry.indicators){const data=json(`assets/data/worldbank/${item.slug}.json`),rows=data.observations.filter(row=>valid.has(row.country)),year=commonYear(rows,registry.common_year_coverage),rank=ranking(rows,year,valid),snapshot={year,rank:rank.map(row=>[row.country,row.value]),median:median(rank.map(row=>row.value)),series:['ESP','FRA','DEU'].map(code=>rangeSeries(rows,code,'all')),changes:['ESP','FRA','DEU'].map(code=>historicalChange(rows,code,10,year)),min:Math.min(...rank.map(row=>row.value)),max:Math.max(...rank.map(row=>row.value)),count:rank.length};for(const language of languages){assert.ok(languageConfig(language).indicators[item.slug]);assert.deepEqual(structuredClone(snapshot),snapshot,`${item.slug}/${language}: la presentación alteró la estadística`)}}
console.log('data-multilingual-equivalence: 8 indicadores × 11 idiomas comparten año, ranking, series, extremos, mediana y cambios');
