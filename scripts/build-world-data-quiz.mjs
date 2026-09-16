import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as CORE from '../assets/js/data-core.mjs';
import * as CHANGE from '../assets/js/data-change-core.mjs';
import * as VIEWS from '../assets/js/data-view-core.mjs';
import { DATA_LANGUAGES } from '../assets/js/data-routes.mjs';
import { dailySeed, seededRandom, shuffled } from '../assets/js/games/game-daily.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const OUT=join(ROOT,'assets/data/games/world-data-quiz');
export const GENERATOR_VERSION=2;
export const QUESTION_TYPES=Object.freeze({
  highest:{historical:false,direction:'max',sign:null},
  lowest:{historical:false,direction:'min',sign:null},
  largestIncrease:{historical:true,direction:'max',sign:'positive'},
  largestDecrease:{historical:true,direction:'min',sign:'negative'}
});
const LOCALES=Object.values(DATA_LANGUAGES).map(item=>item.locale);
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays=(date,count)=>new Date(date.getFullYear(),date.getMonth(),date.getDate()+count,12);
const signature=value=>String(value).replace(/\s+/g,' ').trim();
const unique=values=>values.every(value=>value!=null)&&new Set(values.map(signature)).size===values.length;
const signMatches=(type,value)=>type==='largestIncrease'?value>0:type==='largestDecrease'?value<0:true;
const directionFor=type=>QUESTION_TYPES[type]?.direction;
const compactSource=value=>typeof value==='string'?value.split(/,\s*(?:uri|publisher|date accessed):/i)[0].replace(/\s+/g,' ').trim():null;

export function semanticOptionSet(type,options,item,locales=LOCALES){
  const definition=QUESTION_TYPES[type];
  if(!definition||options.length!==4||new Set(options.map(row=>row.country)).size!==4||options.some(row=>!Number.isFinite(row.value))||options.some(row=>!signMatches(type,row.value)))return false;
  const values=options.map(row=>row.value),best=definition.direction==='max'?Math.max(...values):Math.min(...values);
  if(values.filter(value=>value===best).length!==1)return false;
  for(const locale of locales){
    if(!definition.historical){if(!unique(options.map(row=>CORE.formatIndicatorValue(row.value,item,locale,'table'))))return false;continue}
    if(!unique(options.map(row=>CORE.formatIndicatorValue(row.from,item,locale,'table'))))return false;
    if(!unique(options.map(row=>CORE.formatIndicatorValue(row.to,item,locale,'table'))))return false;
    if(!unique(options.map(row=>CHANGE.formatChange(row.change,item,locale,'table'))))return false;
  }
  return true;
}

function windows(rows,type,item,fromYear=null,toYear=null,sourceOrganization=null){
  const definition=QUESTION_TYPES[type];
  if(!definition)throw new Error(`Unknown question type: ${type}`);
  const eligible=rows.filter(row=>signMatches(type,row.value));
  const sorted=[...eligible].sort((a,b)=>definition.direction==='max'?b.value-a.value||a.country.localeCompare(b.country):a.value-b.value||a.country.localeCompare(b.country));
  const candidates=[];
  for(let start=4;start+4<=sorted.length;start+=5){
    const options=sorted.slice(start,start+4);
    if(!semanticOptionSet(type,options,item))continue;
    const values=options.map(row=>row.value),best=definition.direction==='max'?Math.max(...values):Math.min(...values);
    candidates.push({type,indicatorId:item.id,indicatorSlug:item.slug,category:item.category,year:toYear,fromYear,sourceOrganization,options,correctCountry:options.find(row=>row.value===best).country});
  }
  return candidates;
}

export function candidatesForIndicator(item,data,countries,threshold=.7){
  const rows=VIEWS.indicatorRows(data,countries),year=CORE.commonYear(rows,threshold),current=rows.filter(row=>row.year===year),sourceOrganization=compactSource(data.official_metadata?.source_organization);
  const result=[...windows(current,'highest',item,null,year,sourceOrganization),...windows(current,'lowest',item,null,year,sourceOrganization)];
  const period=CHANGE.defaultPeriod(data,countries,item,threshold);
  if(period.from!=null&&period.to!=null){
    const changes=CHANGE.comparableChanges(data,countries,item,period.from,period.to).map(row=>({...row,value:row.change}));
    result.push(...windows(changes,'largestIncrease',item,period.from,period.to,sourceOrganization),...windows(changes,'largestDecrease',item,period.from,period.to,sourceOrganization));
  }
  return result;
}

const stableId=candidate=>[candidate.indicatorId,candidate.type,candidate.fromYear||candidate.year,candidate.year,...candidate.options.map(row=>row.country).sort()].join(':');
function compactQuestion(candidate,countryMap,seed){
  const options=shuffled(candidate.options,seededRandom(`${seed}:options`)).map(row=>({country:row.country,iso2:countryMap.get(row.country)?.iso2,value:row.value,...(candidate.fromYear!=null?{from:row.from,to:row.to,change:row.change}:{})}));
  return{id:stableId(candidate),type:candidate.type,indicatorId:candidate.indicatorId,indicatorSlug:candidate.indicatorSlug,category:candidate.category,year:candidate.year,...(candidate.fromYear!=null?{fromYear:candidate.fromYear}:{}),...(candidate.sourceOrganization?{sourceOrganization:candidate.sourceOrganization}:{}),correctCountry:candidate.correctCountry,options};
}

export function candidatePools(registry,dataBySlug,countries){return new Map(registry.indicators.map(item=>[item.id,candidatesForIndicator(item,dataBySlug.get(item.slug),countries,registry.common_year_coverage)]))}
export function generateChallenge(date,registry,dataBySlug,countries,pools=candidatePools(registry,dataBySlug,countries)){
  const seed=dailySeed('worldDataQuiz',date,GENERATOR_VERSION),random=seededRandom(seed),countryMap=new Map(countries.map(country=>[country.id,country])),byIndicator=pools;
  const indicators=shuffled(registry.indicators.filter(item=>byIndicator.get(item.id)?.length),random),questions=[],categoryCount=new Map,usedCountries=new Set;
  for(const item of indicators){
    if(questions.length===5)break;
    if((categoryCount.get(item.category)||0)>=2)continue;
    const pool=shuffled(byIndicator.get(item.id),random),preferred=pool.find(candidate=>candidate.options.every(option=>!usedCountries.has(option.country)))||pool[0];
    if(!preferred)continue;
    const question=compactQuestion(preferred,countryMap,`${seed}:${questions.length}`);questions.push(question);categoryCount.set(item.category,(categoryCount.get(item.category)||0)+1);question.options.forEach(option=>usedCountries.add(option.country));
  }
  if(questions.length!==5)throw new Error(`No se pudieron generar 5 preguntas para ${date}`);
  return{schemaVersion:1,gameId:'worldDataQuiz',generatorVersion:GENERATOR_VERSION,date,source:{name:'World Bank — World Development Indicators',url:registry.dataset_url,license:registry.license},questions};
}

export async function loadGameInputs(){const registry=await readJson(join(ROOT,'assets/data/indicators.json')),countryPayload=await readJson(join(ROOT,'assets/data/worldbank/countries.json')),dataBySlug=new Map(await Promise.all(registry.indicators.map(async item=>[item.slug,await readJson(join(ROOT,`assets/data/worldbank/${item.slug}.json`))])));return{registry,countries:countryPayload.countries,dataBySlug}}
export async function buildChallenges({today=new Date(),days=380,regenerateAll=false}={}){
  const inputs=await loadGameInputs(),pools=candidatePools(inputs.registry,inputs.dataBySlug,inputs.countries),todayKey=dateKey(today);await mkdir(OUT,{recursive:true});let written=0,preserved=0;const manifest=[];
  for(let offset=0;offset<days;offset++){
    const date=dateKey(addDays(today,offset)),path=join(OUT,`${date}.json`);
    if(!regenerateAll&&existsSync(path)&&date<=todayKey){preserved++;manifest.push(date);continue}
    const challenge=generateChallenge(date,inputs.registry,inputs.dataBySlug,inputs.countries,pools),content=`${JSON.stringify(challenge)}\n`;let previous='';try{previous=await readFile(path,'utf8')}catch{}
    if(previous!==content){await writeFile(path,content,'utf8');written++}
    manifest.push(date);
  }
  const manifestContent=`${JSON.stringify({schemaVersion:1,gameId:'worldDataQuiz',generatorVersion:GENERATOR_VERSION,from:manifest[0],to:manifest.at(-1),dates:manifest})}\n`,manifestPath=join(OUT,'manifest.json');let old='';try{old=await readFile(manifestPath,'utf8')}catch{}
  if(old!==manifestContent){await writeFile(manifestPath,manifestContent,'utf8');written++}
  const allCandidates=[...pools.values()].flat();
  return{written,preserved,days,candidates:Object.fromEntries(inputs.registry.indicators.map(item=>[item.id,pools.get(item.id).length])),types:Object.fromEntries(Object.keys(QUESTION_TYPES).map(type=>[type,allCandidates.filter(candidate=>candidate.type===type).length]))};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const result=await buildChallenges({regenerateAll:process.argv.includes('--regenerate-all')});
  console.log(`World Data Quiz v${GENERATOR_VERSION}: ${result.written} archivos actualizados, ${result.preserved} retos publicados preservados, ${Object.values(result.candidates).reduce((a,b)=>a+b,0)} candidatos válidos.`);
}
