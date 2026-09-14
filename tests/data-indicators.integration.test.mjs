import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {addCountry,assignRankingPositions,commonYear,formatIndicatorValue,historicalChange,median,rangeSeries,ranking,splitOnGaps} from '../assets/js/data-core.mjs';
import {languageConfig} from '../assets/js/data-i18n.mjs';
import {indicatorPresentation} from '../assets/js/data-presentation.mjs';

const root=resolve(import.meta.dirname,'..');
const json=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const registry=json('assets/data/indicators.json');
const countries=json('assets/data/worldbank/countries.json').countries;
const countryByCode=new Map(countries.map(country=>[country.id,country]));
const validCodes=new Set(countries.filter(country=>!country.is_aggregate).map(country=>country.id));
const ui=languageConfig('es');
const expectedSlugs=['poblacion','esperanza-de-vida','fertilidad','pib-per-capita','crecimiento-pib','desempleo','uso-de-internet','energia-renovable','crecimiento-poblacion','mortalidad-infantil','poblacion-urbana','poblacion-mayor-65','densidad-poblacion','inflacion','desempleo-juvenil','participacion-laboral','banda-ancha-fija','emisiones-co2-per-capita','acceso-electricidad','superficie-forestal','gasto-sanitario','mortalidad-materna'];
assert.deepEqual(registry.indicators.map(item=>item.slug),expectedSlugs);

const audit=[];
for(const item of registry.indicators){
  const presentation=indicatorPresentation(item.slug,'es');
  const dataset=json(`assets/data/worldbank/${item.slug}.json`);
  assert.ok(presentation?.what&&presentation?.interpretation);
  assert.ok(presentation.limitations.length>=2);
  assert.equal(dataset.indicator.code,item.code);
  assert.equal(dataset.indicator.unit,item.unit);
  assert.equal(dataset.official_metadata.source.value,'World Development Indicators');
  assert.ok(dataset.official_metadata.source_note);
  assert.ok(dataset.official_metadata.source_organization);

  const seen=new Set(),lastYear=new Map(),validRows=[];
  for(const row of dataset.observations){
    assert.ok(countryByCode.has(row.country),`${item.slug}: código desconocido ${row.country}`);
    assert.ok(Number.isFinite(row.value),`${item.slug}: valor no finito`);
    assert.ok(Number.isInteger(row.year)&&row.year>=item.min_year&&row.year<=2027,`${item.slug}: año inválido`);
    const key=`${row.country}:${row.year}`;
    assert.equal(seen.has(key),false,`${item.slug}: duplicado ${key}`);
    seen.add(key);
    assert.ok(row.year>(lastYear.get(row.country)??0),`${item.slug}: orden temporal inválido`);
    lastYear.set(row.country,row.year);
    if(validCodes.has(row.country))validRows.push(row);
  }
  assert.equal(dataset.coverage.observation_count,dataset.observations.length);
  assert.equal(dataset.coverage.country_count,new Set(validRows.map(row=>row.country)).size);
  assert.equal(dataset.coverage.min_year,Math.min(...dataset.observations.map(row=>row.year)));
  assert.equal(dataset.coverage.max_year,Math.max(...dataset.observations.map(row=>row.year)));

  const year=commonYear(validRows,registry.common_year_coverage);
  const ranked=assignRankingPositions(ranking(validRows,year,item.ranking));
  assert.ok(ranked.length>0);
  assert.ok(ranked.every(row=>row.year===year&&validCodes.has(row.country)));
  assert.ok(ranked.every(row=>!countryByCode.get(row.country).is_aggregate));
  const values=ranked.map(row=>row.value),middle=median(values);
  assert.ok(Number.isFinite(middle));
  for(const value of [Math.min(...values),Math.max(...values),middle,...values]){
    for(const context of ['card','table','tooltip','axis','csv'])assert.doesNotThrow(()=>formatIndicatorValue(value,item,ui.locale,context),`${item.slug}: formatter ${context}`);
  }

  const esp=ranked.find(row=>row.country==='ESP');
  assert.ok(esp,`${item.slug}: España no figura en año común`);
  for(const years of [5,10,20]){
    const change=historicalChange(validRows,'ESP',years,item.presentation.changeType==='percentage_points');
    if(change)assert.ok(Number.isFinite(change.value));
  }
  const selected=['ESP','FRA','DEU'];
  assert.deepEqual(addCountry(selected,'ESP'),selected);
  for(const code of selected){
    const series=rangeSeries(dataset.observations.filter(row=>row.country===code),'20');
    assert.ok(series.length>0,`${item.slug}: serie vacía para ${code}`);
    assert.ok(splitOnGaps(series).flat().every(row=>Number.isFinite(row.value)));
    for(const row of series)assert.doesNotThrow(()=>formatIndicatorValue(row.value,item,ui.locale,'tooltip'));
  }
  audit.push({slug:item.slug,year,ranked:ranked.length,spainPosition:esp.position,min:Math.min(...values),median:middle,max:Math.max(...values)});
}

console.log(JSON.stringify(audit));
console.log('data-indicators-integration: 22 indicadores completan presentación sin excepciones');
