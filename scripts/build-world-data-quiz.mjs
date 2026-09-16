import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as CORE from '../assets/js/data-core.mjs';
import * as CHANGE from '../assets/js/data-change-core.mjs';
import * as VIEWS from '../assets/js/data-view-core.mjs';
import { dailySeed, seededRandom, shuffled } from '../assets/js/games/game-daily.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const OUT=join(ROOT,'assets/data/games/world-data-quiz');
export const GENERATOR_VERSION=1;
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays=(date,count)=>new Date(date.getFullYear(),date.getMonth(),date.getDate()+count,12);
const signature=value=>String(value).replace(/\s+/g,' ').trim();

function windows(rows,type,item,fromYear=null,toYear=null){
  const sorted=[...rows].sort((a,b)=>['highest','increase'].includes(type)?b.value-a.value||a.country.localeCompare(b.country):a.value-b.value||a.country.localeCompare(b.country));
  const candidates=[];
  for(let start=4;start+4<=sorted.length;start+=5){
    const options=sorted.slice(start,start+4),shown=options.map(row=>type==='highest'||type==='lowest'?CORE.formatIndicatorValue(row.value,item,'en-US','table'):CHANGE.formatChange(row.value,item,'en-US','table'));
    if(options.length!==4||new Set(options.map(row=>row.country)).size!==4||shown.some(value=>value==null)||new Set(shown.map(signature)).size!==4)continue;
    const values=options.map(row=>row.value),best=['highest','increase'].includes(type)?Math.max(...values):Math.min(...values);
    if(values.filter(value=>value===best).length!==1)continue;
    candidates.push({type,indicatorId:item.id,indicatorSlug:item.slug,category:item.category,year:toYear,fromYear,options,correctCountry:options.find(row=>row.value===best).country});
  }
  return candidates;
}

export function candidatesForIndicator(item,data,countries,threshold=.7){
  const rows=VIEWS.indicatorRows(data,countries),year=CORE.commonYear(rows,threshold),current=rows.filter(row=>row.year===year),result=[...windows(current,'highest',item,null,year),...windows(current,'lowest',item,null,year)];
  const period=CHANGE.defaultPeriod(data,countries,item,threshold);
  if(period.from!=null&&period.to!=null){const changes=CHANGE.comparableChanges(data,countries,item,period.from,period.to).map(row=>({...row,value:row.change}));result.push(...windows(changes,'increase',item,period.from,period.to),...windows(changes,'decrease',item,period.from,period.to))}
  return result;
}

const stableId=candidate=>[candidate.indicatorId,candidate.type,candidate.fromYear||candidate.year,candidate.year,...candidate.options.map(row=>row.country).sort()].join(':');
function compactQuestion(candidate,countryMap,seed){
  const options=shuffled(candidate.options,seededRandom(`${seed}:options`)).map(row=>({country:row.country,iso2:countryMap.get(row.country)?.iso2,value:row.value,...(candidate.fromYear!=null?{from:row.from,to:row.to,change:row.change}: {})}));
  return{id:stableId(candidate),type:candidate.type,indicatorId:candidate.indicatorId,indicatorSlug:candidate.indicatorSlug,category:candidate.category,year:candidate.year,...(candidate.fromYear!=null?{fromYear:candidate.fromYear}:{}),correctCountry:candidate.correctCountry,options};
}

export function candidatePools(registry,dataBySlug,countries){return new Map(registry.indicators.map(item=>[item.id,candidatesForIndicator(item,dataBySlug.get(item.slug),countries,registry.common_year_coverage)]))}
export function generateChallenge(date,registry,dataBySlug,countries,pools=candidatePools(registry,dataBySlug,countries)){
  const seed=dailySeed('worldDataQuiz',date,GENERATOR_VERSION),random=seededRandom(seed),countryMap=new Map(countries.map(country=>[country.id,country])),byIndicator=pools;
  const indicators=shuffled(registry.indicators.filter(item=>byIndicator.get(item.id)?.length),random),questions=[],categoryCount=new Map,usedCountries=new Set;
  for(const item of indicators){if(questions.length===5)break;if((categoryCount.get(item.category)||0)>=2)continue;const pool=shuffled(byIndicator.get(item.id),random),preferred=pool.find(candidate=>candidate.options.every(option=>!usedCountries.has(option.country)))||pool[0];if(!preferred)continue;const question=compactQuestion(preferred,countryMap,`${seed}:${questions.length}`);questions.push(question);categoryCount.set(item.category,(categoryCount.get(item.category)||0)+1);question.options.forEach(option=>usedCountries.add(option.country))}
  if(questions.length!==5)throw new Error(`No se pudieron generar 5 preguntas para ${date}`);
  return{schemaVersion:1,gameId:'worldDataQuiz',generatorVersion:GENERATOR_VERSION,date,source:{name:'World Bank — World Development Indicators',url:registry.dataset_url,license:registry.license},questions};
}

export async function loadGameInputs(){const registry=await readJson(join(ROOT,'assets/data/indicators.json')),countryPayload=await readJson(join(ROOT,'assets/data/worldbank/countries.json')),dataBySlug=new Map(await Promise.all(registry.indicators.map(async item=>[item.slug,await readJson(join(ROOT,`assets/data/worldbank/${item.slug}.json`))])));return{registry,countries:countryPayload.countries,dataBySlug}}
export async function buildChallenges({today=new Date(),days=380}={}){
  const inputs=await loadGameInputs(),pools=candidatePools(inputs.registry,inputs.dataBySlug,inputs.countries),todayKey=dateKey(today);await mkdir(OUT,{recursive:true});let written=0,preserved=0;const manifest=[];
  for(let offset=0;offset<days;offset++){const date=dateKey(addDays(today,offset)),path=join(OUT,`${date}.json`);if(existsSync(path)&&date<=todayKey){preserved++;manifest.push(date);continue}const challenge=generateChallenge(date,inputs.registry,inputs.dataBySlug,inputs.countries,pools),content=`${JSON.stringify(challenge)}\n`;let previous='';try{previous=await readFile(path,'utf8')}catch{}if(previous!==content){await writeFile(path,content,'utf8');written++}manifest.push(date)}
  const manifestContent=`${JSON.stringify({schemaVersion:1,gameId:'worldDataQuiz',generatorVersion:GENERATOR_VERSION,from:manifest[0],to:manifest.at(-1),dates:manifest})}\n`,manifestPath=join(OUT,'manifest.json');let old='';try{old=await readFile(manifestPath,'utf8')}catch{}if(old!==manifestContent){await writeFile(manifestPath,manifestContent,'utf8');written++}
  return{written,preserved,days,candidates:Object.fromEntries(inputs.registry.indicators.map(item=>[item.id,pools.get(item.id).length]))};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){const result=await buildChallenges();console.log(`World Data Quiz: ${result.written} archivos actualizados, ${result.preserved} retos publicados preservados, ${Object.values(result.candidates).reduce((a,b)=>a+b,0)} candidatos válidos.`)}
