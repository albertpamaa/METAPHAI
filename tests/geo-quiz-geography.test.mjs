import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DATA_LANGUAGES} from '../assets/js/data-routes.mjs';
import {geographyItemRoute} from '../assets/js/geography-routes.mjs';
import {GEO_QUIZ_GEOGRAPHY_I18N,GEOGRAPHY_QUIZ_TYPES} from '../assets/js/games/geo-quiz-geography-i18n.mjs';
import {buildGeographyCandidates} from '../assets/js/games/geo-quiz-geography.mjs';
import {buildGeoCandidates,blankGeoTrainingMemory,dailyGeoQuestions,geoQuestionById,geoTrainingType,selectGeoTrainingQuestion} from '../assets/js/games/geo-quiz-core.mjs';
import {seededRandom} from '../assets/js/games/game-daily.mjs';

const root=resolve(import.meta.dirname,'..'),json=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const catalog=json('assets/data/geo-quiz/catalog.json'),metadata=json('assets/data/geo-quiz/metadata.json'),countries=json('assets/data/worldbank/countries.json').countries,topology=json('assets/maps/world-50m.topo.json');
const wdi={poblacion:json('assets/data/worldbank/poblacion.json'),'esperanza-de-vida':json('assets/data/worldbank/esperanza-de-vida.json'),'pib-per-capita':json('assets/data/worldbank/pib-per-capita.json')};
const audit={},derived=buildGeographyCandidates(catalog.geography,countries,audit),all=buildGeoCandidates({catalog,countries,topology,wdi});
const legacy=all.filter(item=>!item.geographyDerived);
const byId=new Map(all.map(item=>[item.id,item])),sourceByKind=Object.fromEntries(Object.entries(catalog.geography).map(([kind,rows])=>[kind,new Map(rows.map(row=>[row.id,row]))]));
assert.deepEqual(metadata.geography_counts,{volcano:209,mountain:68,river:247,desert:49});
assert.equal(derived.length,1102);assert.equal(all.length,1715);assert.equal(new Set(all.map(item=>item.id)).size,all.length);
assert.deepEqual(derived.map(item=>item.id),all.filter(item=>item.geographyDerived).map(item=>item.id));
for(let offset=0;offset<262;offset++){const date=new Date(Date.UTC(2026,0,1+offset)).toISOString().slice(0,10);assert.deepEqual(dailyGeoQuestions(all,date),dailyGeoQuestions(legacy,date),`${date}: historical daily changed`)}
const domains=new Set(['country','entity','continent','numeric','source','mouth','other']);
for(const item of all){
  assert.ok(item.id&&item.central&&item.type&&item.family&&item.source,item.id);
  assert.ok(['easy','medium','hard'].includes(item.difficulty),item.id);
  assert.ok(domains.has(item.answerDomain),item.id);
  assert.equal(item.options.length,4,item.id);
  assert.equal(new Set(item.options.map(option=>`${option.kind}:${option.id}`)).size,4,item.id);
  assert.equal(item.options.filter(option=>`${option.kind}:${option.id}`===item.correct).length,1,item.id);
}
for(const item of derived){
  assert.equal(item.family,'physical');assert.ok(GEOGRAPHY_QUIZ_TYPES.includes(item.type),item.id);
  const subject=sourceByKind[item.geoKind].get(item.central);assert.ok(subject,`${item.id}: unvalidated geography entity`);
  const correct=item.options.find(option=>`${option.kind}:${option.id}`===item.correct);
  if(item.answerDomain==='country'){
    assert.ok(subject.countries.includes(correct.id),item.id);
    assert.equal(item.options.filter(option=>subject.countries.includes(option.id)).length,1,`${item.id}: multiple correct countries`);
  }else if(item.type.startsWith('geoCountry')){
    assert.equal(correct.id,item.central,item.id);
    assert.equal(item.options.filter(option=>sourceByKind[item.geoKind].get(option.id)?.countries.includes(item.subjectCountry)).length,1,`${item.id}: multiple correct entities`);
  }else if(item.answerDomain==='continent'){
    assert.deepEqual(subject.continents,[correct.id],item.id);
  }else if(item.answerDomain==='numeric'){
    const field=item.metric,values=item.options.map(option=>sourceByKind[item.geoKind].get(option.id)?.[field]);
    assert.ok(values.every(value=>Number.isFinite(value)&&value>0),item.id);
    assert.equal(item.metricValue,Math.max(...values),item.id);
    assert.equal(sourceByKind[item.geoKind].get(correct.id)?.[field],item.metricValue,item.id);
    const sorted=[...values].sort((a,b)=>b-a);
    assert.ok(sorted[0]-sorted[1]>=Math.max(item.geoKind==='desert'?100:item.geoKind==='river'?10:20,sorted[0]*.015),item.id);
    assert.equal(item.unit,item.geoKind==='desert'?'km²':item.geoKind==='river'?'km':'m');
  }else if(item.answerDomain==='source'||item.answerDomain==='mouth'){
    const field=item.answerDomain==='source'?'sources':'mouths';
    assert.equal(subject[field].length,1,item.id);
    assert.equal(correct.id,subject[field][0].id,item.id);
  }
  for(const language of Object.keys(DATA_LANGUAGES)){
    const labels=item.options.filter(option=>option.kind==='entity').map(option=>option.labels?.[language]||option.labels?.en);
    assert.equal(new Set(labels.map(value=>value.toLocaleLowerCase())).size,labels.length,`${item.id}:${language}: duplicate visible labels`);
  }
}
for(const language of Object.keys(DATA_LANGUAGES)){
  const pack=GEO_QUIZ_GEOGRAPHY_I18N[language];assert.ok(pack,language);
  assert.ok(pack.cta.trim(),language);
  for(const metric of ['elevation_m','length_km','area_km2'])assert.ok(pack.metrics[metric]?.trim(),`${language}:${metric}`);
  for(const type of GEOGRAPHY_QUIZ_TYPES){
    assert.equal(typeof pack.prompts[type],'function',`${language}:${type}:prompt`);
    assert.equal(typeof pack.facts[type],'function',`${language}:${type}:fact`);
    assert.ok(pack.prompts[type]('TOKEN').includes('TOKEN'),`${language}:${type}:placeholder`);
    assert.ok(pack.facts[type]('ENTITY','ANSWER','UNIT').includes('ENTITY'),`${language}:${type}:fact placeholder`);
  }
}
const used=Object.fromEntries(Object.keys(sourceByKind).map(kind=>[kind,new Set(derived.filter(item=>item.geoKind===kind).map(item=>item.central))]));
assert.ok(Object.values(used).every(set=>set.size>0));
for(const kind of Object.keys(used))assert.equal(used[kind].size,sourceByKind[kind].size,`${kind}: validated entity without a question`);
for(const [kind,ids] of Object.entries(used))for(const id of ids)for(const language of Object.keys(DATA_LANGUAGES)){
  const route=geographyItemRoute(language,{volcano:'volcanoes',mountain:'mountains',river:'rivers',desert:'deserts'}[kind],id);
  assert.ok(existsSync(join(root,...route.split('/').filter(Boolean),'index.html')),`${language}:${kind}:${id}: broken Geography link`);
}
const major={river:['Amazon','Danub','Mekong','Niger','Paran','Rhine','Zambezi','Volga','Mississippi','Missouri','Nile','Congo','Orinoco'],volcano:['Etna','Vesuvius','Fuji','Stromboli','St. Helens','Popocat','Kilimanjaro','Teide','Cotopaxi','Kilauea'],mountain:['Everest','K2','Aconcagua','Denali','Mont Blanc','Matterhorn','Elbrus','Annapurna','Mount Kenya'],desert:['Sahara','Gobi','Kalahari','Namib','Atacama','Mojave','Sonoran','Thar','Taklamakan','Great Victoria']};
for(const [kind,names] of Object.entries(major))for(const name of names){const row=[...sourceByKind[kind].values()].find(item=>item.labels.en.toLocaleLowerCase().includes(name.toLocaleLowerCase()));if(row)assert.ok(used[kind].has(row.id),`${kind}:${name}: not used`)}
function simulate(count,difficulty,seed){let memory=blankGeoTrainingMemory();const random=seededRandom(seed),out=[];for(let index=0;index<count;index++){const selected=selectGeoTrainingQuestion(all,difficulty,memory,random);assert.ok(selected.question);memory=selected.memory;out.push(selected.question)}return out}
const tally=(items,key)=>Object.fromEntries(Object.entries(Object.groupBy(items,key)).map(([name,rows])=>[name,rows.length]));
const simulations={all:simulate(5000,'all','geo-new-all'),easy:simulate(1000,'easy','geo-new-easy'),medium:simulate(1000,'medium','geo-new-medium'),hard:simulate(1000,'hard','geo-new-hard')};
for(const [mode,items] of Object.entries(simulations)){
  assert.equal(items.length,mode==='all'?5000:1000);
  if(mode!=='all')assert.ok(items.every(item=>item.difficulty===mode));
  assert.deepEqual([...new Set(items.map(item=>item.family))].sort(),[...new Set(all.filter(item=>mode==='all'||item.difficulty===mode).map(item=>item.family))].sort(),`${mode}: missing available family`);
  assert.ok(items.some(item=>item.geographyDerived),`${mode}: new geography absent`);
  const family=tally(items,item=>item.family),physical=items.filter(item=>item.family==='physical'),kinds=tally(physical,item=>item.geoKind||geoTrainingType(item));
  assert.ok(Math.max(...Object.values(family))/items.length<.25,`${mode}: family dominance`);
  for(const kind of ['volcano','mountain','river','desert'])assert.ok(kinds[kind]>0,`${mode}:${kind} absent`);
}
for(const type of GEOGRAPHY_QUIZ_TYPES)assert.ok(simulations.all.some(item=>item.type===type),`all training: ${type} absent`);
let daily=[];for(let offset=0;offset<365;offset++){const date=new Date(Date.UTC(2027,0,1+offset)).toISOString().slice(0,10),ids=dailyGeoQuestions(all,date);assert.equal(ids.length,5);const questions=ids.map(id=>byId.get(id));assert.ok(questions.every(Boolean));assert.equal(new Set(questions.map(item=>item.family)).size,5);daily.push(...questions)}
assert.ok(daily.some(item=>item.geographyDerived));
assert.ok(daily.filter(item=>item.family==='physical').length<=365);
console.log(JSON.stringify({candidates:{legacy:all.length-derived.length,derived:derived.length,total:all.length},types:tally(derived,item=>item.type),catalog:{family:tally(all,item=>item.family),physical:tally(all.filter(item=>item.family==='physical'),item=>item.geoKind||geoTrainingType(item)),difficulty:tally(all,item=>item.difficulty),answerDomain:tally(all,item=>item.answerDomain)},used:Object.fromEntries(Object.entries(used).map(([kind,set])=>[kind,`${set.size}/${sourceByKind[kind].size}`])),audit,training:Object.fromEntries(Object.entries(simulations).map(([mode,items])=>[mode,{family:tally(items,item=>item.family),physical:tally(items.filter(item=>item.family==='physical'),item=>item.geoKind||geoTrainingType(item)),newTypes:tally(items.filter(item=>item.geographyDerived),item=>item.type),difficulty:tally(items,item=>item.difficulty),answerDomain:tally(items,item=>item.answerDomain)}])),daily:{family:tally(daily,item=>item.family),physical:tally(daily.filter(item=>item.family==='physical'),item=>item.geoKind||geoTrainingType(item)),answerDomain:tally(daily,item=>item.answerDomain)}},null,2));
