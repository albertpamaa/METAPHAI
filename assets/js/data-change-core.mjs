import * as CORE from './data-core.mjs';
import * as VIEWS from './data-view-core.mjs';

export const DECREASE_COLORS=['#d9eef2','#add8e0','#72bdc9','#348fa2','#176174'];
export const INCREASE_COLORS=['#eee1f3','#dac0e4','#bb91cf','#9565b2','#694087'];
export const ZERO_COLOR='#eef0ef';

export function changeType(item){
  if(item?.presentation?.formatType==='years')return'natural';
  return item?.presentation?.changeType==='percentage_points'?'percentage_points':'percent';
}

export function calculateChange(from,to,type){
  if(!Number.isFinite(from)||!Number.isFinite(to))return null;
  if(type==='natural'||type==='percentage_points')return Object.is(to-from,-0)?0:to-from;
  if(from===0)return null;
  const value=(to-from)/Math.abs(from)*100;
  return Number.isFinite(value)?(Object.is(value,-0)?0:value):null;
}

export function availableYears(data,countries){
  return [...new Set(VIEWS.indicatorRows(data,countries).map(row=>row.year))].sort((a,b)=>a-b);
}

function pairCount(rows,from,to){
  const seen=new Map;
  for(const row of rows)if(row.year===from||row.year===to){const years=seen.get(row.country)||new Set;years.add(row.year);seen.set(row.country,years)}
  return [...seen.values()].filter(years=>years.has(from)&&years.has(to)).length;
}

export function defaultPeriod(data,countries,item,threshold=.7){
  const rows=VIEWS.indicatorRows(data,countries),years=availableYears(data,countries),to=CORE.commonYear(rows,threshold)??years.at(-1);
  if(to==null)return{from:null,to:null};
  const candidates=[to-20,to-10].filter(year=>years.includes(year));
  const habitual=Math.max(0,...years.map(year=>rows.filter(row=>row.year===year).length));
  const preferred=candidates.find(year=>pairCount(rows,year,to)>=habitual*.5);
  const fallback=[...years].filter(year=>year<to).sort((a,b)=>pairCount(rows,b,to)-pairCount(rows,a,to)||a-b)[0];
  return{from:preferred??fallback??null,to};
}

export function resolvedPeriod(data,countries,item,requestedFrom,requestedTo,threshold=.7){
  const years=availableYears(data,countries),from=Number.parseInt(requestedFrom,10),to=Number.parseInt(requestedTo,10);
  if(years.includes(from)&&years.includes(to)&&from<to)return{from,to};
  return defaultPeriod(data,countries,item,threshold);
}

export function comparableChanges(data,countries,item,fromYear,toYear){
  if(!(fromYear<toYear))return[];
  const type=changeType(item),byCountry=new Map;
  for(const row of VIEWS.indicatorRows(data,countries))if(row.year===fromYear||row.year===toYear){const values=byCountry.get(row.country)||{};values[row.year]=row.value;byCountry.set(row.country,values)}
  const result=[];
  for(const [country,values] of byCountry){
    const from=values[fromYear],to=values[toYear];
    if(!Number.isFinite(from)||!Number.isFinite(to))continue;
    const change=calculateChange(from,to,type);
    if(change==null)continue;
    result.push({country,from,to,fromYear,toYear,change,value:change});
  }
  return result;
}

export function rankedChanges(rows,direction='descending'){
  const sorted=[...rows].sort((a,b)=>direction==='ascending'?a.change-b.change||a.country.localeCompare(b.country):b.change-a.change||a.country.localeCompare(b.country));
  return CORE.assignRankingPositions(sorted);
}

export function changeSummary(rows){
  return{coverage:rows.length,median:CORE.median(rows.map(row=>row.change)),increase:rows.filter(row=>row.change>0).length,decrease:rows.filter(row=>row.change<0).length,unchanged:rows.filter(row=>row.change===0).length};
}

export function robustExtent(values,percentile=.9){
  const absolute=values.filter(Number.isFinite).map(Math.abs).filter(value=>value>0).sort((a,b)=>a-b);
  if(!absolute.length)return 1;
  const position=(absolute.length-1)*percentile,lower=Math.floor(position),fraction=position-lower;
  return absolute[lower]+((absolute[lower+1]??absolute[lower])-absolute[lower])*fraction||1;
}

export function divergentColor(value,extent){
  if(!Number.isFinite(value))return'#e5e7e6';
  if(value===0)return ZERO_COLOR;
  const scale=value<0?DECREASE_COLORS:INCREASE_COLORS,index=Math.min(scale.length-1,Math.max(0,Math.ceil(Math.min(1,Math.abs(value)/(extent||1))*scale.length)-1));
  return scale[index];
}

export function legendValues(extent){return[-extent,-extent/2,0,extent/2,extent]}

export function formatChange(value,item,locale='es-ES',context='table'){
  if(!Number.isFinite(value))return null;
  const type=changeType(item),sign=value>0?'+':value<0?'−':'';
  if(type==='natural')return`${sign}${CORE.formatIndicatorValue(Math.abs(value),item,locale,context)}`;
  return CORE.formatIndicatorChange(value,item,locale,context);
}

export function normalizedIndicator(search,registry,defaultSlug='esperanza-de-vida'){
  const requested=new URLSearchParams(search).get('indicator');
  return registry.indicators.find(item=>item.slug===requested)||registry.indicators.find(item=>item.slug===defaultSlug)||registry.indicators[0];
}
