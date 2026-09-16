import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { commonYear, formatIndicatorValue } from '../assets/js/data-core.mjs';
import { DATA_LANGUAGES } from '../assets/js/data-routes.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const OUT=join(ROOT,'assets','data','games','higher-or-lower.json');
const MAX_PAIRS=600;
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const quantile=(values,p)=>values[Math.min(values.length-1,Math.floor((values.length-1)*p))];
const sample=(values,limit=MAX_PAIRS)=>values.length<=limit?values:Array.from({length:limit},(_,index)=>values[Math.floor(index*values.length/limit)]);

export async function buildHigherOrLower(){
  const registry=await readJson(join(ROOT,'assets','data','indicators.json'));
  const countryData=await readJson(join(ROOT,'assets','data','worldbank','countries.json'));
  const validCountries=new Map(countryData.countries.filter(country=>!country.is_aggregate&&country.iso2).map(country=>[country.id,country.iso2]));
  const locales=Object.values(DATA_LANGUAGES).map(item=>item.locale);
  const indicators=[];
  for(const meta of registry.indicators){
    const source=await readJson(join(ROOT,'assets','data','worldbank',`${meta.slug}.json`));
    const rows=source.observations.filter(row=>validCountries.has(row.country)&&Number.isFinite(row.value));
    const year=commonYear(rows,registry.common_year_coverage);
    const values=rows.filter(row=>row.year===year).sort((a,b)=>a.value-b.value||a.country.localeCompare(b.country)).map(row=>[row.country,row.value]);
    if(values.length<40)continue;
    const display=values.map(row=>locales.map(locale=>formatIndicatorValue(row[1],meta,locale,'card')));
    const maxGap=Math.max(6,Math.round(Math.sqrt(values.length)*2));
    const candidates=[];
    for(let gap=1;gap<=Math.min(maxGap,values.length-1);gap++)for(let start=0;start+gap<values.length;start++){
      const a=values[start],b=values[start+gap];
      if(a[1]===b[1])continue;
      if(locales.every((locale,index)=>display[start][index]!==display[start+gap][index]))candidates.push([start,start+gap,gap]);
    }
    if(candidates.length<90)continue;
    const gaps=candidates.map(pair=>pair[2]).sort((a,b)=>a-b);
    const hardMax=quantile(gaps,1/3),mediumMax=quantile(gaps,2/3),groups={hard:[],medium:[],easy:[]};
    for(const [a,b,gap] of candidates)groups[gap<=hardMax?'hard':gap<=mediumMax?'medium':'easy'].push([a,b]);
    if(Object.values(groups).some(group=>group.length<20))continue;
    const {formatType,decimals,compactFormat,changeType}=meta.presentation||{};
    indicators.push({slug:meta.slug,category:meta.category,year,presentation:{formatType,decimals,compactFormat,changeType},sourceOrganization:source.official_metadata?.source?.value||'World Development Indicators',values,pairs:{easy:sample(groups.easy),medium:sample(groups.medium),hard:sample(groups.hard)},difficulty:{maxRankGap:maxGap,hard:[1,hardMax],medium:[hardMax+1,mediumMax],easy:[mediumMax+1,maxGap],candidateCounts:{easy:groups.easy.length,medium:groups.medium.length,hard:groups.hard.length}}});
  }
  if(!indicators.length)throw new Error('Higher or Lower dataset is empty');
  const used=new Set(indicators.flatMap(item=>item.values.map(row=>row[0])));
  const countries=Object.fromEntries([...used].sort().map(code=>[code,validCountries.get(code)]));
  const dataset={schemaVersion:1,gameId:'higherOrLower',generatorVersion:1,source:{name:'World Bank — World Development Indicators',license:'CC BY 4.0'},countries,indicators};
  const content=`${JSON.stringify(dataset)}\n`;
  let previous='';
  try{previous=await readFile(OUT,'utf8')}catch{}
  if(previous===content)return{written:0,dataset};
  await writeFile(OUT,content,'utf8');
  return{written:1,dataset};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const {written,dataset}=await buildHigherOrLower();
  const counts=dataset.indicators.reduce((sum,item)=>sum+Object.values(item.difficulty.candidateCounts).reduce((a,b)=>a+b,0),0);
  console.log(`Higher or Lower: ${written} archivo actualizado, ${dataset.indicators.length} indicadores, ${Object.keys(dataset.countries).length} países/territorios, ${counts} candidatos.`);
}
