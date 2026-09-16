import assert from 'node:assert/strict';
import * as CORE from '../assets/js/data-core.mjs';
import * as CHANGE from '../assets/js/data-change-core.mjs';
import { DATA_LANGUAGES } from '../assets/js/data-routes.mjs';
import { GENERATOR_VERSION, QUESTION_TYPES, loadGameInputs, candidatePools, generateChallenge, semanticOptionSet } from '../scripts/build-world-data-quiz.mjs';
import { validateChallenge, hintEliminations } from '../assets/js/games/world-data-quiz-core.mjs';

const inputs=await loadGameInputs(),pools=candidatePools(inputs.registry,inputs.dataBySlug,inputs.countries),allCandidates=[...pools.values()].flat(),validCountries=new Set(inputs.countries.filter(country=>!country.is_aggregate).map(country=>country.id));
const byType=Object.fromEntries(Object.keys(QUESTION_TYPES).map(type=>[type,allCandidates.filter(candidate=>candidate.type===type).length]));
assert.equal(GENERATOR_VERSION,2);assert.ok(allCandidates.length>1000);for(const count of Object.values(byType))assert.ok(count>100);
for(const candidate of allCandidates){
  const item=inputs.registry.indicators.find(entry=>entry.id===candidate.indicatorId);assert.ok(semanticOptionSet(candidate.type,candidate.options,item));
  if(candidate.type==='largestIncrease')assert.ok(candidate.options.every(option=>option.change>0));
  if(candidate.type==='largestDecrease')assert.ok(candidate.options.every(option=>option.change<0));
}

const renewable=inputs.registry.indicators.find(item=>item.id==='renewable_energy');
const rows=(values)=>values.map(([country,from,to])=>{const change=CHANGE.calculateChange(from,to,CHANGE.changeType(renewable));return{country,from,to,change,value:change}});
const allNegative=rows([['A',82.5,62.9],['B',72.8,52.9],['C',91.2,71.1],['D',44.2,22.1]]);
assert.equal(semanticOptionSet('largestIncrease',allNegative,renewable),false);assert.equal(semanticOptionSet('largestDecrease',allNegative,renewable),true);assert.equal(allNegative.toSorted((a,b)=>a.change-b.change)[0].country,'D');
const allPositive=rows([['A',10,15],['B',20,23],['C',30,32],['D',40,41]]);assert.equal(semanticOptionSet('largestIncrease',allPositive,renewable),true);assert.equal(semanticOptionSet('largestDecrease',allPositive,renewable),false);
const mixed=rows([['A',10,15],['B',20,17],['C',30,32],['D',40,39]]);assert.equal(semanticOptionSet('largestIncrease',mixed,renewable),false);assert.equal(semanticOptionSet('largestDecrease',mixed,renewable),false);
const withZero=rows([['A',10,10],['B',20,23],['C',30,35],['D',40,47]]);assert.equal(semanticOptionSet('largestIncrease',withZero,renewable),false);

const realCodes=['MMR','AGO','SLE','MRT'],renewableData=inputs.dataBySlug.get('energia-renovable'),byKey=new Map(renewableData.observations.map(row=>[`${row.country}:${row.year}`,row.value])),realCase=realCodes.map(country=>{const from=byKey.get(`${country}:2001`),to=byKey.get(`${country}:2021`),change=CHANGE.calculateChange(from,to,CHANGE.changeType(renewable));return{country,from,to,change,value:change}});
assert.equal(semanticOptionSet('largestIncrease',realCase,renewable),false);assert.equal(semanticOptionSet('largestDecrease',realCase,renewable),true);assert.equal(realCase.toSorted((a,b)=>a.change-b.change)[0].country,'MRT');

for(let offset=0;offset<120;offset++){
  const date=`2027-${String(Math.floor(offset/28)+1).padStart(2,'0')}-${String(offset%28+1).padStart(2,'0')}`,first=generateChallenge(date,inputs.registry,inputs.dataBySlug,inputs.countries,pools),second=generateChallenge(date,inputs.registry,inputs.dataBySlug,inputs.countries,pools);
  assert.deepEqual(first,second);assert.ok(validateChallenge(first));assert.equal(new Set(first.questions.map(question=>question.indicatorId)).size,5);assert.ok(Math.max(...Object.values(Object.groupBy(first.questions,question=>question.category)).map(items=>items.length))<=2);
  for(const question of first.questions){
    assert.equal(new Set(question.options.map(option=>option.country)).size,4);assert.ok(question.options.every(option=>validCountries.has(option.country)&&Number.isFinite(option.value)));assert.equal(question.options.filter(option=>option.country===question.correctCountry).length,1);
    const item=inputs.registry.indicators.find(entry=>entry.id===question.indicatorId),values=question.options.map(option=>option.value),direction=QUESTION_TYPES[question.type].direction,expected=direction==='max'?Math.max(...values):Math.min(...values);assert.equal(question.options.find(option=>option.country===question.correctCountry).value,expected);
    if(question.type==='largestIncrease')assert.ok(question.options.every(option=>option.change>0));if(question.type==='largestDecrease')assert.ok(question.options.every(option=>option.change<0));
    for(const {locale} of Object.values(DATA_LANGUAGES)){
      const sets=question.fromYear==null?[question.options.map(option=>CORE.formatIndicatorValue(option.value,item,locale,'table'))]:[question.options.map(option=>CORE.formatIndicatorValue(option.from,item,locale,'table')),question.options.map(option=>CORE.formatIndicatorValue(option.to,item,locale,'table')),question.options.map(option=>CHANGE.formatChange(option.change,item,locale,'table'))];
      for(const shown of sets)assert.equal(new Set(shown).size,4);
    }
    assert.equal(hintEliminations(question).length,2);assert.equal(hintEliminations(question).includes(question.correctCountry),false);
    if(question.fromYear!=null)for(const option of question.options)assert.equal(option.change,CHANGE.calculateChange(option.from,option.to,CHANGE.changeType(item)));
  }
}
console.log(`games-generator-v2: 120 challenges and ${allCandidates.length} candidates validated (${JSON.stringify(byType)})`);
