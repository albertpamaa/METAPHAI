import * as CORE from './data-core.mjs';
import * as VIEWS from './data-view-core.mjs';

export const MAP_COLORS=['#deebf7','#c6dbef','#9ecae1','#6baed6','#3182bd'];
export function availableYears(data,countries){return [...new Set(VIEWS.indicatorRows(data,countries).map(row=>row.year))].sort((a,b)=>b-a)}
export function defaultMapYear(data,countries,threshold=.7){return CORE.commonYear(VIEWS.indicatorRows(data,countries),threshold)}
export function resolvedMapYear(data,countries,requested,threshold=.7){const years=availableYears(data,countries);return years.includes(requested)?requested:defaultMapYear(data,countries,threshold)}
export function valuesForYear(data,countries,year){return new Map(VIEWS.indicatorRows(data,countries).filter(row=>row.year===year).map(row=>[row.country,row.value]))}
export function rankingForYear(data,countries,item,year){return VIEWS.rankingFor(data,countries,item,year)}
export function quantileBreaks(values,classCount=5){const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return[];return Array.from({length:classCount-1},(_,index)=>{const position=(sorted.length-1)*(index+1)/classCount,lower=Math.floor(position),fraction=position-lower;return sorted[lower]+((sorted[lower+1]??sorted[lower])-sorted[lower])*fraction})}
export function colorIndex(value,breaks){if(!Number.isFinite(value))return-1;let index=0;while(index<breaks.length&&value>breaks[index])index++;return index}
export function normalizedMapState(search,registry){const params=new URLSearchParams(search),requested=params.get('indicator'),item=registry.indicators.find(entry=>entry.slug===requested)||registry.indicators[0],year=Number.parseInt(params.get('year'),10);return{item,year:Number.isInteger(year)?year:null}}
