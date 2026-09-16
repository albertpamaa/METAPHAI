import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatIndicatorValue, commonYear } from '../assets/js/data-core.mjs';
import { DATA_LANGUAGES } from '../assets/js/data-routes.mjs';
import { languageConfig } from '../assets/js/data-i18n.mjs';
import { answerHigherLower, createHigherLowerSession, derivedHigherLowerStats, difficultyForRun, finalizeHigherLower, newSeed, nextHigherLowerRound, normalizeHigherLowerState, selectRound, validateHigherLowerDataset } from '../assets/js/games/higher-or-lower-core.mjs';
import { parseStore } from '../assets/js/games/game-storage.mjs';
import { HIGHER_LOWER_I18N } from '../assets/js/games/higher-or-lower-i18n.mjs';
import { buildHigherOrLower } from '../scripts/build-higher-or-lower.mjs';

const root=resolve(import.meta.dirname,'..'),readJson=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const dataset=readJson('assets/data/games/higher-or-lower.json'),registry=readJson('assets/data/indicators.json'),countries=readJson('assets/data/worldbank/countries.json');
assert.equal(validateHigherLowerDataset(dataset),true);
assert.equal(dataset.indicators.length,22);
assert.equal(Object.keys(dataset.countries).length,217);
const validCountries=new Set(countries.countries.filter(country=>!country.is_aggregate).map(country=>country.id));
for(const item of dataset.indicators){
  assert.ok(item.presentation?.formatType,`${item.slug}: presentation`);assert.equal('unitLabel' in item.presentation,false,`${item.slug}: translated unit in compact dataset`);
  for(const language of Object.keys(DATA_LANGUAGES))assert.ok(languageConfig(language).indicators?.[item.slug]?.unitLabel,`${item.slug}:${language}: localized unit`);
  const meta=registry.indicators.find(entry=>entry.slug===item.slug),source=readJson(`assets/data/worldbank/${item.slug}.json`);
  assert.equal(item.year,commonYear(source.observations.filter(row=>validCountries.has(row.country)&&Number.isFinite(row.value)),registry.common_year_coverage),`${item.slug}: common year`);
  assert.ok(item.values.length>=Math.floor(Object.keys(dataset.countries).length*.7),`${item.slug}: coverage`);
  for(const [code,value] of item.values){assert.ok(validCountries.has(code),`${item.slug}:${code} aggregate`);assert.ok(Number.isFinite(value))}
  for(const [difficulty,pairs] of Object.entries(item.pairs)){
    assert.ok(pairs.length>=20,`${item.slug}:${difficulty}`);
    for(const [a,b] of pairs){
      assert.ok(a<b&&b<item.values.length);
      assert.notEqual(item.values[a][0],item.values[b][0]);assert.notEqual(item.values[a][1],item.values[b][1]);
      for(const {locale} of Object.values(DATA_LANGUAGES))assert.notEqual(formatIndicatorValue(item.values[a][1],meta,locale,'card'),formatIndicatorValue(item.values[b][1],meta,locale,'card'),`${item.slug}:${locale}: visible tie`);
    }
  }
}
assert.equal(difficultyForRun(0),'easy');assert.equal(difficultyForRun(4),'easy');assert.equal(difficultyForRun(5),'medium');assert.equal(difficultyForRun(11),'medium');assert.equal(difficultyForRun(12),'hard');
const first=createHigherLowerSession(dataset,'stable-seed'),second=createHigherLowerSession(dataset,'stable-seed');assert.deepEqual(first,second);
let session=first,previousIndicator=null,previousCategory=null,keys=new Set();
for(let index=0;index<14;index++){assert.notEqual(session.currentRound.indicator,previousIndicator);assert.notEqual(session.currentRound.category,previousCategory);assert.equal(keys.has(session.currentRound.key),false);keys.add(session.currentRound.key);previousIndicator=session.currentRound.indicator;previousCategory=session.currentRound.category;const answered=answerHigherLower(session,session.currentRound.correctCountry);assert.equal(answered.answer.correct,true);session=nextHigherLowerRound(dataset,answered)}
assert.equal(session.currentRun,14);assert.equal(session.currentRound.difficulty,'hard');
const wrong=[session.currentRound.a.country,session.currentRound.b.country].find(code=>code!==session.currentRound.correctCountry),over=answerHigherLower(session,wrong);assert.equal(over.status,'over');
let state=finalizeHigherLower(normalizeHigherLowerState({activeSession:over}));assert.deepEqual(state.stats,{gamesPlayed:1,bestStreak:14,totalStreak:14,totalRounds:15,correctAnswers:14});assert.deepEqual(finalizeHigherLower(state),state);assert.equal(derivedHigherLowerStats(state.stats).accuracy,14/15*100);
assert.deepEqual(JSON.parse(JSON.stringify(state)).activeSession.currentRound,state.activeSession.currentRound);
assert.deepEqual(parseStore('{broken'),{schemaVersion:1,games:{},extensions:{}});
assert.equal(normalizeHigherLowerState({activeSession:{broken:true}}).activeSession,null);
assert.notEqual(newSeed({getRandomValues:value=>value.set([1,2])}),newSeed({getRandomValues:value=>value.set([3,4])}));
for(const [language,copy] of Object.entries(HIGHER_LOWER_I18N)){const shared=copy.shareText(14);assert.ok(shared.includes('14'),language);assert.equal(/Spain|France|España|Francia/.test(shared),false,language)}
let higher=0;for(let index=0;index<500;index++)if(selectRound(dataset,{seed:`balance-${index}`,round:0,currentRun:0,history:[],recentIndicators:[],recentCategories:[],recentCountries:[]}).direction==='higher')higher++;assert.ok(higher>200&&higher<300,`direction balance: ${higher}/500`);
const seenCategories=new Set();for(let gameIndex=0;gameIndex<50;gameIndex++){let simulated=createHigherLowerSession(dataset,`simulation-${gameIndex}`),lastIndicator=null,lastCategory=null,seenPairs=new Set();for(let round=0;round<20;round++){const current=simulated.currentRound;assert.notEqual(current.indicator,lastIndicator);assert.notEqual(current.category,lastCategory);assert.equal(seenPairs.has(current.key),false);seenPairs.add(current.key);seenCategories.add(current.category);lastIndicator=current.indicator;lastCategory=current.category;simulated=nextHigherLowerRound(dataset,answerHigherLower(simulated,current.correctCountry))}}assert.ok(seenCategories.size>=6,`category distribution: ${seenCategories.size}`);
const build=await buildHigherOrLower();assert.equal(build.written,0,'compact dataset must be deterministic and current');
console.log(`higher-or-lower: ${dataset.indicators.length} indicators, ${Object.keys(dataset.countries).length} countries, deterministic gameplay, difficulty, persistence and stats OK`);
