import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { DATA_LANGUAGES, countryRoute } from '../assets/js/data-routes.mjs';
import { localizedCountries } from '../assets/js/data-view-core.mjs';
import { GAME_PAGES } from '../assets/js/games/game-routes.mjs';
import { completeGame, defaultStore, gameState, setSession } from '../assets/js/games/game-storage.mjs';
import { ELIGIBLE_COUNTRIES, ELIGIBLE_IDS, acceptedAnswers, dailyCountries, finiteBounds, framedFeature, hintPlan, isCorrectAnswer, maskedName, nameCharacters, normalizeAnswer, normalizeDailySession, roundScore, sessionSummary, trainingCountry, utcDateKey } from '../assets/js/games/country-silhouette-core.mjs';

const root=resolve(import.meta.dirname,'..'),countriesJson=JSON.parse(readFileSync(join(root,'assets/data/worldbank/countries.json'),'utf8')),countries=new Map(countriesJson.countries.map(country=>[country.id,country]));
const context={};vm.createContext(context);vm.runInContext(readFileSync(join(root,'assets/vendor/topojson-client.v3.1.0.min.js'),'utf8'),context);const topology=JSON.parse(readFileSync(join(root,'assets/maps/world-50m.topo.json'),'utf8')),features=context.topojson.feature(topology,topology.objects.countries).features,geometry=new Map(features.map(feature=>[feature.properties.iso3,feature]));
assert.equal(features.length,241);assert.equal(ELIGIBLE_IDS.length,154);assert.equal(new Set(ELIGIBLE_IDS).size,154);
for(const id of ELIGIBLE_IDS){const country=countries.get(id),feature=geometry.get(id);assert.ok(country&&!country.is_aggregate,`${id}: país no agregado`);assert.match(country.iso2,/^[A-Z]{2}$/);assert.ok(feature,`${id}: geometría`);assert.ok(finiteBounds(framedFeature(feature)),`${id}: bounds finitos`);for(const language of Object.keys(DATA_LANGUAGES))assert.ok(existsSync(join(root,...countryRoute(language,id).split('/').filter(Boolean),'index.html')),`${language}:${id}: ficha`)}
assert.deepEqual(Object.keys(ELIGIBLE_COUNTRIES),['easy','normal','hard']);

assert.equal(normalizeAnswer('  ESPAÑA  '),'espana');assert.equal(normalizeAnswer('Costa   Rica'),'costa rica');assert.equal(normalizeAnswer('Costa---Rica'),'costa rica');assert.equal(normalizeAnswer('Costa - Rica'),'costa rica');assert.equal(normalizeAnswer('Bosnia-y-Herzegovina'),'bosnia y herzegovina');assert.equal(normalizeAnswer('Timor Leste'),normalizeAnswer('Timor-Leste'));assert.notEqual(normalizeAnswer('Costa Rica'),normalizeAnswer('Costa Brava'));
const spain=countries.get('ESP');assert.ok(isCorrectAnswer('espana',acceptedAnswers(spain,'España','es')));assert.ok(isCorrectAnswer('ES',acceptedAnswers(spain,'España','es')));const uk=countries.get('GBR');assert.ok(isCorrectAnswer('UK',acceptedAnswers(uk,'Reino Unido','es')));
assert.deepEqual(hintPlan('MALI','x').length,1);const canada=hintPlan('CANADA','x');assert.equal(canada[0],'c');assert.equal(new Set(canada).size,canada.length);assert.equal(maskedName('CANADA',['a']),'_ A _ A _ A');
assert.equal(maskedName('España',[]),'_ _ _ _ _ _');assert.equal(maskedName('Costa Rica',[]),'_ _ _ _ _ - _ _ _ _');assert.equal(maskedName('Reino Unido',[]),'_ _ _ _ _ - _ _ _ _ _');assert.equal(maskedName('Timor-Leste',[]),'_ _ _ _ _ - _ _ _ _ _');assert.equal(maskedName('Bosnia y Herzegovina',[]),'_ _ _ _ _ _ - _ - _ _ _ _ _ _ _ _ _ _ _');
assert.equal(maskedName("Côte d'Ivoire",[]),"_ _ _ _ - _ ' _ _ _ _ _ _");assert.equal(maskedName('États-Unis',[]),'_ _ _ _ _ - _ _ _ _');const arabic='المملكة العربية السعودية',arabicMask=maskedName(arabic,[]);assert.equal((arabicMask.match(/-/g)||[]).length,2);assert.equal(arabicMask.replaceAll(' ','').replaceAll('-','').length,arabic.replaceAll(' ','').length);
const costaHints=hintPlan('COSTA RICA','CRI');assert.equal(costaHints[0],'c');assert.equal(costaHints.some(value=>value===' '||value==='-'),false);assert.equal(maskedName('COSTA RICA',['c','a']),'C _ _ _ A - _ _ C A');assert.equal(maskedName('Timor-Leste',['t']),'T _ _ _ _ - _ _ _ t _');
const costa=countries.get('CRI');for(const answer of ['Costa Rica','Costa-Rica','costa rica','costa-rica','Costa   Rica','Costa---Rica','Costa - Rica'])assert.ok(isCorrectAnswer(answer,acceptedAnswers(costa,'Costa Rica','es')),answer);assert.equal(isCorrectAnswer('Costa Brava',acceptedAnswers(costa,'Costa Rica','es')),false);
for(const locale of ['es-ES','en-US','fr-FR','de-DE','ar']){
  const localized=new Map(localizedCountries(countriesJson.countries,locale).map(country=>[country.id,country.name]));
  for(const id of ['CRI','GBR','TLS','BIH','SAU']){
    const name=localized.get(id),mask=maskedName(name,[]),letterCount=nameCharacters(name).filter(character=>/[\p{L}\p{N}]/u.test(character)).length,separatorCount=(name.match(/(?:\s|[-‐‑‒–—―])+/gu)||[]).length;
    assert.equal((mask.match(/_/g)||[]).length,letterCount,`${locale}:${id}: cada letra queda oculta`);
    assert.equal((mask.match(/-/g)||[]).length,separatorCount,`${locale}:${id}: cada tramo separador se representa una sola vez`);
  }
}
assert.equal(roundScore(0,0,true),100);assert.equal(roundScore(1,0,true),80);assert.equal(roundScore(2,0,true),60);assert.equal(roundScore(1,1,true),70);assert.equal(roundScore(3,2,true),20);assert.equal(roundScore(3,99,true),10);assert.equal(roundScore(0,0,false),0);

assert.equal(utcDateKey(new Date('2026-09-17T00:01:00-07:00')),'2026-09-17');for(const date of ['2026-09-17','2026-12-31','2027-01-01','2030-02-28']){const first=dailyCountries(date),second=dailyCountries(date);assert.deepEqual(first,second);assert.equal(first.length,5);assert.equal(new Set(first).size,5);const tomorrow=new Date(`${date}T12:00:00Z`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);assert.equal(first.some(id=>dailyCountries(utcDateKey(tomorrow)).includes(id)),false,`${date}: sin repetición consecutiva`)}
assert.notEqual(trainingCountry('easy','ITA',()=>0),'ITA');

const date='2026-09-17',ids=dailyCountries(date);let session=normalizeDailySession(null,date,ids);session.rounds[0]={...session.rounds[0],status:'correct',score:80,hints:['e']};session.rounds[1]={...session.rounds[1],status:'given-up',score:0};session.index=2;const restored=normalizeDailySession(JSON.parse(JSON.stringify(session)),date,ids);assert.equal(restored.index,2);assert.equal(restored.rounds[0].score,80);assert.deepEqual(restored.rounds[0].hints,['e']);assert.deepEqual(sessionSummary(restored),{score:80,correct:1,hints:1});
let store=setSession(defaultStore(),'countrySilhouette',date,restored);store=completeGame(store,'countrySilhouette','2026-09-17',{score:300,correct:3},1);store=completeGame(store,'countrySilhouette','2026-09-18',{score:400,correct:4},1);assert.equal(gameState(store,'countrySilhouette').stats.currentStreak,2);store=completeGame(store,'countrySilhouette','2026-09-20',{score:100,correct:1},1);assert.equal(gameState(store,'countrySilhouette').stats.currentStreak,1);

for(const [language,route] of Object.entries(GAME_PAGES.countrySilhouette)){const file=join(root,...route.split('/').filter(Boolean),'index.html'),html=readFileSync(file,'utf8');assert.ok(html.includes('data-country-silhouette'));assert.ok(html.includes(`lang="${language}"`));assert.ok(html.includes(`canonical" href="https://metaphai.com${route}`));assert.ok(html.includes('aria-label="')===false||!html.includes('aria-label="España"'));assert.ok(html.includes('games.css?v=20260917-2'))}
const css=readFileSync(join(root,'assets/css/games.css'),'utf8');assert.match(css,/\.country-silhouette\{[^}]*width:100%/);assert.match(css,/\.silhouette-answer input\{[^}]*font-size:16px/);assert.match(css,/@media\(max-width:620px\)[\s\S]*\.silhouette-answer\{grid-template-columns:1fr\}/);
console.log('country-silhouette-game: 154 countries, geometry, answers, hints, score, UTC daily, persistence, streaks, links, i18n routes and responsive structure OK');
