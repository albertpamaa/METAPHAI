import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const registry=JSON.parse(readFileSync(join(root,'assets/data/indicators.json'),'utf8'));
const sample=['ESP','USA','CHN','IND','BRA'];
let comparisons=0;
for(const item of registry.indicators.slice(8)){
  const local=JSON.parse(readFileSync(join(root,'assets/data/worldbank',`${item.slug}.json`),'utf8'));
  const response=await fetch(`https://api.worldbank.org/v2/country/${sample.join(';')}/indicator/${item.code}?format=json&source=2&per_page=2000`);
  assert.equal(response.ok,true,`${item.code}: HTTP ${response.status}`);
  const payload=await response.json();
  assert.ok(Array.isArray(payload)&&Array.isArray(payload[1]),`${item.code}: respuesta API inválida`);
  for(const code of sample){
    const official=payload[1].filter(row=>row.countryiso3code===code&&row.value!==null).sort((a,b)=>Number(b.date)-Number(a.date))[0];
    assert.ok(official,`${item.code}/${code}: sin muestra oficial`);
    const localRow=local.observations.find(row=>row.country===code&&row.year===Number(official.date));
    assert.ok(localRow,`${item.code}/${code}/${official.date}: falta en JSON local`);
    assert.equal(localRow.value,Number(official.value),`${item.code}/${code}/${official.date}: diferencia API/local`);
    comparisons++;
  }
}
console.log(`data-worldbank-api-audit: ${comparisons} valores oficiales comparados; 0 diferencias`);
