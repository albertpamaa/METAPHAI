export function commonYear(rows,threshold=.7){const byYear=new Map;rows.forEach(o=>byYear.set(o.year,(byYear.get(o.year)||0)+1));if(!byYear.size)return null;const habitual=Math.max(...byYear.values());return [...byYear].filter(([,n])=>n>=habitual*threshold).sort((a,b)=>b[0]-a[0])[0]?.[0]??null}
export function ranking(rows,year,direction='descending'){return rows.filter(o=>o.year===year&&Number.isFinite(o.value)).sort((a,b)=>direction==='ascending'?a.value-b.value||String(a.country).localeCompare(String(b.country)):b.value-a.value||String(a.country).localeCompare(String(b.country)))}
export function assignRankingPositions(rows){let previous,position=0;return rows.map((row,index)=>{if(index===0||row.value!==previous)position=index+1;previous=row.value;return {...row,position}})}
export function historicalChange(rows,code,years,isPercentage=false){const series=rows.filter(o=>o.country===code&&Number.isFinite(o.value));if(!series.length)return null;const latest=Math.max(...series.map(o=>o.year)),end=series.find(o=>o.year===latest),start=series.find(o=>o.year===latest-years);if(!start||!end)return null;if(isPercentage)return {from:start.value,to:end.value,fromYear:start.year,toYear:end.year,value:end.value-start.value,kind:'percentage_points'};if(start.value===0)return null;return {from:start.value,to:end.value,fromYear:start.year,toYear:end.year,value:(end.value-start.value)/Math.abs(start.value)*100,kind:'percent'} }

export function formatIndicatorValue(value,indicator,locale='es-ES',context='card'){
  if(value==null||!Number.isFinite(Number(value)))return null;value=Object.is(Number(value),-0)?0:Number(value);
  if(context==='csv')return String(value);
  const config=indicator.presentation||{},exact=context==='table'||context==='tooltip',axis=context==='axis',decimals=exact?Math.max(config.decimals??1,2):config.decimals??1;
  const number=(n,options={})=>new Intl.NumberFormat(locale,{maximumFractionDigits:decimals,minimumFractionDigits:exact?0:Math.min(decimals,1),...options}).format(n);
  if(axis){
    if(config.formatType==='population'&&Math.abs(value)>=1e6)return `${number(value/1e6,{minimumFractionDigits:0,maximumFractionDigits:1,useGrouping:'always'})} M`;
    if(config.formatType==='population'&&Math.abs(value)>=1e3)return `${number(value/1e3,{minimumFractionDigits:0,maximumFractionDigits:1})} mil`;
    if(config.formatType==='population'||config.formatType==='currency')return number(value,{minimumFractionDigits:0,maximumFractionDigits:0});
    if(config.formatType==='signedPercent')return `${value<0?'−':''}${number(Math.abs(value))}`;
    return number(value);
  }
  switch(config.formatType){
    case 'population':
      if(!exact&&Math.abs(value)>=1e6)return `${number(value/1e6,{useGrouping:'always'})} ${locale.startsWith('es')?'millones':'million'}`;
      return `${number(value,{minimumFractionDigits:0,maximumFractionDigits:0})} ${config.unitLabel||'personas'}`;
    case 'years':return `${number(value)} ${config.unitLabel||'años'}`;
    case 'fertility':return `${number(value)} ${config.unitLabel||'hijos por mujer'}`;
    case 'percent':return `${number(value)}${locale.startsWith('es')?' ':''}%`;
    case 'signedPercent':return `${value>0?'+':value<0?'−':''}${number(Math.abs(value))}${locale.startsWith('es')?' ':''}%`;
    case 'currency':return `${number(value,{minimumFractionDigits:0,maximumFractionDigits:exact?2:0})} ${config.unitLabel||''}`.trim();
    default:return `${number(value)}${config.unitLabel?` ${config.unitLabel}`:''}`;
  }
}

export function formatIndicatorChange(value,indicator,locale='es-ES',context='card'){
  if(value==null||!Number.isFinite(Number(value)))return null;value=Object.is(Number(value),-0)?0:Number(value);
  const exact=context==='table'||context==='tooltip',decimals=exact?Math.max(indicator.presentation?.decimals??1,2):indicator.presentation?.decimals??1;
  const formatted=new Intl.NumberFormat(locale,{minimumFractionDigits:exact?0:Math.min(decimals,1),maximumFractionDigits:decimals}).format(Math.abs(value));
  const sign=value>0?'+':value<0?'−':'';
  const percentagePoints=indicator.presentation?.changeType==='percentage_points';
  return percentagePoints?`${sign}${formatted} ${locale.startsWith('es')?'p. p.':'pp'}`:`${sign}${formatted}${locale.startsWith('es')?' ':''}%`;
}

export function normalizeSearch(value=''){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[‘’ʼ]/g,"'").toLocaleLowerCase().trim()}
export function countryMatchesSearch(country,query,aliases={}){const q=normalizeSearch(query);return Boolean(q&&[country.name,country.id,country.iso2,...(aliases[country.id]||[])].some(value=>normalizeSearch(value).includes(q)))}
export function searchCountries(countries,query,selected=[],limit=8,aliases={}){const q=normalizeSearch(query);if(!q)return [];const used=new Set(selected);return countries.filter(country=>!country.is_aggregate&&!used.has(country.id)&&countryMatchesSearch(country,q,aliases)).sort((a,b)=>{const an=normalizeSearch(a.name),bn=normalizeSearch(b.name);return Number(!an.startsWith(q))-Number(!bn.startsWith(q))||a.name.localeCompare(b.name)}).slice(0,limit)}
export function addCountry(selected,code,max=5){if(selected.includes(code)||selected.length>=max)return [...selected];return [...selected,code]}
export function removeCountry(selected,code){return selected.filter(item=>item!==code)}
export function sortRanking(rows,mode='value-desc'){const copy=[...rows];if(mode==='country-asc')return copy.sort((a,b)=>a.name.localeCompare(b.name));if(mode==='country-desc')return copy.sort((a,b)=>b.name.localeCompare(a.name));if(mode==='value-asc')return copy.sort((a,b)=>a.value-b.value||a.name.localeCompare(b.name));return copy.sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name))}
export function rangeSeries(rows,range='20',anchorYear=null){if(range==='all'||!rows.length)return [...rows];const max=anchorYear??Math.max(...rows.map(r=>r.year));return rows.filter(r=>r.year>=max-Number(range)+1&&r.year<=max)}
export function splitOnGaps(rows){const result=[];let segment=[];[...rows].sort((a,b)=>a.year-b.year).forEach(row=>{if(segment.length&&row.year-segment.at(-1).year>1){result.push(segment);segment=[]}segment.push(row)});if(segment.length)result.push(segment);return result}
export function median(values){const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;const m=Math.floor(sorted.length/2);return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2}
