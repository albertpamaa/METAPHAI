import { seededRandom, shuffled } from './game-daily.mjs';

export const GAME_ID='countrySilhouette';
export const GENERATOR_VERSION=1;
export const MAX_ROUND_SCORE=100;

// Lista deliberadamente conservadora: países soberanos con una geometría 50m
// suficientemente reconocible. Se omiten territorios, microestados y archipiélagos
// diminutos/dispersos que no ofrecen una silueta justa a esta escala.
export const ELIGIBLE_COUNTRIES={
  easy:['ARG','AUS','BRA','CAN','CHL','CHN','CUB','EGY','ESP','FRA','GBR','GRC','IND','ISL','ITA','JPN','KOR','MEX','NOR','NZL','PRT','RUS','SWE','TUR','USA','ZAF'],
  normal:['AFG','ALB','DZA','AGO','ARM','AUT','AZE','BGD','BEL','BEN','BOL','BIH','BWA','BGR','BFA','KHM','CMR','COL','COD','COG','CRI','HRV','CYP','CZE','DNK','DOM','ECU','ETH','FIN','GAB','GEO','DEU','GHA','GTM','HND','HUN','IDN','IRN','IRQ','IRL','ISR','JAM','JOR','KAZ','KEN','LAO','LVA','LBN','LTU','MDG','MYS','MLI','MAR','MMR','NAM','NPL','NLD','NIC','NGA','PRK','PAK','PAN','PNG','PER','PHL','POL','ROU','SAU','SEN','SRB','LKA','SDN','CHE','SYR','TZA','THA','TUN','UGA','UKR','URY','UZB','VEN','VNM','ZMB','ZWE'],
  hard:['BDI','BLR','BLZ','BTN','BRN','CAF','TCD','CIV','SLV','ERI','EST','SWZ','FJI','GMB','GIN','GNB','GNQ','GUY','HTI','KGZ','LBR','LBY','LSO','MWI','MRT','MNG','MOZ','MKD','NER','OMN','PRY','RWA','SLE','SVK','SVN','SOM','SSD','SUR','TJK','TGO','TKM','TLS','YEM']
};
export const ELIGIBLE_IDS=Object.freeze(Object.values(ELIGIBLE_COUNTRIES).flat());

export const EXCLUSION_REASONS=Object.freeze({
  aggregates:'Agregados y regiones estadísticas no son países jugables.',
  territories:'Territorios dependientes no se incluyen en la selección inicial.',
  microstates:'Microestados con silueta ilegible a escala 1:50m quedan fuera.',
  islands:'Archipiélagos muy pequeños o dispersos quedan fuera para evitar rondas injustas.',
  geometry:'Entidades sin geometría ISO3 utilizable quedan fuera.'
});

export function utcDateKey(date=new Date()){return date.toISOString().slice(0,10)}
const stablePools=Object.fromEntries(Object.entries(ELIGIBLE_COUNTRIES).map(([level,ids])=>[level,shuffled(ids,seededRandom(`${GAME_ID}:v${GENERATOR_VERSION}:${level}`))]));
export function dailyCountries(date=utcDateKey()){
  const day=Math.floor(Date.parse(`${date}T12:00:00Z`)/86400000),easy=stablePools.easy,normal=stablePools.normal,hard=stablePools.hard;
  return[easy[day*2%easy.length],easy[(day*2+1)%easy.length],normal[day*2%normal.length],normal[(day*2+1)%normal.length],hard[day%hard.length]];
}
export function trainingCountry(level='all',previous=null,random=Math.random){const pool=(level==='all'?ELIGIBLE_IDS:ELIGIBLE_COUNTRIES[level]||ELIGIBLE_IDS).filter(id=>id!==previous);return pool[Math.floor(random()*pool.length)]}

export function normalizeAnswer(value){return String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu,' ').replace(/\s+/g,' ').trim()}
export const ANSWER_ALIASES={
  es:{USA:['ee uu','estados unidos de america','usa'],GBR:['reino unido','gran bretaña','uk'],KOR:['corea del sur','republica de corea'],PRK:['corea del norte'],CZE:['republica checa'],BIH:['bosnia y herzegovina']},
  en:{USA:['usa','us','united states of america'],GBR:['uk','great britain'],KOR:['south korea','republic of korea'],PRK:['north korea'],CZE:['czech republic']}
};
export function acceptedAnswers(country,localizedName,language='en'){
  return new Set([localizedName,country.name,country.id,country.iso2,...(ANSWER_ALIASES[language]?.[country.id]||[]),...(ANSWER_ALIASES.en[country.id]||[])].map(normalizeAnswer).filter(Boolean));
}
export const isCorrectAnswer=(value,answers)=>answers.has(normalizeAnswer(value));

const isLetter=character=>/[\p{L}\p{N}]/u.test(character);
const isWordSeparator=character=>/\s/u.test(character)||/[-‐‑‒–—―]/u.test(character);
const letterKey=character=>normalizeAnswer(character);
export const nameCharacters=name=>Array.from(String(name).normalize('NFC'));
export function hintPlan(name,seed=''){
  const chars=nameCharacters(name),keys=[];
  for(const char of chars)if(isLetter(char)&&!keys.includes(letterKey(char)))keys.push(letterKey(char));
  const letterCount=chars.filter(isLetter).length,max=Math.min(3,Math.max(1,Math.floor(letterCount/3)),Math.max(0,keys.length-1));
  if(!max)return[];
  const first=letterKey(chars.find(isLetter)),rest=shuffled(keys.filter(key=>key!==first),seededRandom(`${seed}:${name}`));
  return[first,...rest].slice(0,max);
}
export function maskedName(name,revealed=[]){const shown=new Set(revealed),tokens=[];for(const char of nameCharacters(name)){if(isLetter(char))tokens.push(shown.has(letterKey(char))?char:'_');else if(isWordSeparator(char)){if(tokens.at(-1)!=='-')tokens.push('-')}else tokens.push(char)}return tokens.join(' ')}
export const roundScore=(hints=0,errors=0,solved=true)=>solved?Math.max(10,MAX_ROUND_SCORE-hints*20-errors*10):0;

const ringArea=ring=>Math.abs(ring.reduce((sum,point,index)=>{const next=ring[(index+1)%ring.length];return sum+point[0]*next[1]-next[0]*point[1]},0)/2);
const polygonArea=polygon=>ringArea(polygon[0]||[]);
const polygonBounds=polygon=>{const points=polygon.flat();return points.reduce((box,[x,y])=>[Math.min(box[0],x),Math.min(box[1],y),Math.max(box[2],x),Math.max(box[3],y)],[Infinity,Infinity,-Infinity,-Infinity])};
const gap=(a,b)=>Math.hypot(Math.max(0,a[0]-b[2],b[0]-a[2]),Math.max(0,a[1]-b[3],b[1]-a[3]));
export function framedFeature(feature){
  if(!feature?.geometry)return feature;
  if(feature.geometry.type!=='MultiPolygon')return feature;
  const polygons=feature.geometry.coordinates,metrics=polygons.map((polygon,index)=>({index,area:polygonArea(polygon),bounds:polygonBounds(polygon)})).sort((a,b)=>b.area-a.area),main=metrics[0];
  if(!main||!Number.isFinite(main.area))return feature;
  const span=Math.max(main.bounds[2]-main.bounds[0],main.bounds[3]-main.bounds[1],1);
  const keep=new Set(metrics.filter(item=>item.index===main.index||item.area>=main.area*.01||(item.area>=main.area*.0005&&gap(item.bounds,main.bounds)<=span*.35)).map(item=>item.index));
  return{...feature,geometry:{...feature.geometry,coordinates:polygons.filter((_,index)=>keep.has(index))}};
}
export function finiteBounds(feature){
  const geometry=feature?.geometry,coords=geometry?.type==='Polygon'?geometry.coordinates:geometry?.type==='MultiPolygon'?geometry.coordinates.flat(1):[];
  const points=coords.flat();if(!points.length)return null;
  const bounds=points.reduce((box,[x,y])=>[Math.min(box[0],x),Math.min(box[1],y),Math.max(box[2],x),Math.max(box[3],y)],[Infinity,Infinity,-Infinity,-Infinity]);
  return bounds.every(Number.isFinite)&&bounds[2]>bounds[0]&&bounds[3]>bounds[1]?bounds:null;
}

export const blankDailySession=(date,countries)=>({schemaVersion:1,date,countries:[...countries],index:0,rounds:countries.map(country=>({country,hints:[],errors:0,status:'pending',score:null})),completed:false});
export function normalizeDailySession(value,date,countries){
  if(!value||value.schemaVersion!==1||value.date!==date||JSON.stringify(value.countries)!==JSON.stringify(countries))return blankDailySession(date,countries);
  const rounds=countries.map((country,index)=>{const old=value.rounds?.[index]||{};return{country,hints:Array.isArray(old.hints)?old.hints:[],errors:Number.isInteger(old.errors)&&old.errors>=0?old.errors:0,status:['pending','correct','given-up'].includes(old.status)?old.status:'pending',score:Number.isFinite(old.score)?old.score:null}});
  const index=Math.min(4,Math.max(0,Number.isInteger(value.index)?value.index:0)),completed=Boolean(value.completed)&&rounds.every(round=>round.status!=='pending');return{schemaVersion:1,date,countries:[...countries],index,rounds,completed};
}
export const sessionSummary=session=>({score:session.rounds.reduce((sum,round)=>sum+(round.score||0),0),correct:session.rounds.filter(round=>round.status==='correct').length,hints:session.rounds.reduce((sum,round)=>sum+round.hints.length,0)});
