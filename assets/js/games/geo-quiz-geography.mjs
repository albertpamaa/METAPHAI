import {seededRandom,shuffled} from './game-daily.mjs';

const KINDS=['volcano','mountain','river','desert'];
const CONTINENTS=['africa','america','asia','europe','oceania','antarctica'];
const ICONIC=new Set(['Q39231','Q16990','Q524','Q38954','Q513','Q43512','Q39739','Q6583','Q42070','Q3392','Q3783']);
const numericId=id=>Number(String(id).replace(/\D/g,''))||0;
const option=(kind,id,labels)=>({kind,id,...(labels?{labels}:{})});
const distinctLabels=items=>{
  const languages=new Set(items.flatMap(item=>Object.keys(item.labels||{})));
  return [...languages].every(language=>new Set(items.map(item=>(item.labels?.[language]||item.labels?.en||'').toLocaleLowerCase())).size===items.length);
};
const pickPeers=(pool,answer,count,seed)=>{
  const result=[];
  for(const item of shuffled(pool,seededRandom(seed))){
    if(item.id===answer.id||!distinctLabels([answer,...result,item]))continue;
    result.push(item);
    if(result.length===count)break;
  }
  return result;
};
const difficulty=item=>ICONIC.has(item.id)?'easy':item.countries.length>1?'hard':['easy','medium','hard'][numericId(item.id)%3];
const validPoint=item=>Array.isArray(item.coordinates)&&item.coordinates.length===2&&item.coordinates.every(Number.isFinite);
const metricFor=kind=>({volcano:'elevation_m',mountain:'elevation_m',river:'length_km',desert:'area_km2'})[kind];

export function buildGeographyCandidates(geography,countries,audit={}){
  const output=[];
  const bump=key=>{audit[key]=(audit[key]||0)+1};
  const validCountries=countries.filter(item=>!item.is_aggregate&&/^[A-Z]{3}$/.test(item.id));
  const countryById=new Map(validCountries.map(item=>[item.id,item]));
  const add=candidate=>{
    if(candidate.options.length!==4||new Set(candidate.options.map(item=>`${item.kind}:${item.id}`)).size!==4){bump('rejectedAmbiguity');return}
    if(candidate.options.filter(item=>`${item.kind}:${item.id}`===candidate.correct).length!==1){bump('rejectedAmbiguity');return}
    output.push({...candidate,family:'physical',source:'wikidata',geographyDerived:true});
  };
  for(const kind of KINDS){
    const rows=geography?.[kind]||[];
    const valid=rows.filter(item=>item.labels?.en&&validPoint(item)&&item.countries?.length&&item.continents?.length&&item.countries.every(code=>countryById.has(code)));
    bump(`${kind}Inspected`);
    audit[`${kind}Inspected`]=rows.length;
    audit[`${kind}Eligible`]=valid.length;
    audit.insufficientData=(audit.insufficientData||0)+(rows.length-valid.length);
    for(const item of valid){
      const country=item.countries[numericId(item.id)%item.countries.length];
      const ownContinent=item.continents[0];
      if(numericId(item.id)%2===0){
        const falseCountries=validCountries.filter(row=>!item.countries.includes(row.id));
        const nearby=falseCountries.filter(row=>row.region_id===countryById.get(country)?.region_id);
        const distractors=[...shuffled(nearby,seededRandom(`${kind}:${item.id}:nearby`)).slice(0,3),...shuffled(falseCountries.filter(row=>!nearby.includes(row)),seededRandom(`${kind}:${item.id}:elsewhere`))].slice(0,3);
        if(distractors.length===3)add({id:`geo-${kind}-country:${item.id}`,type:`geo${kind[0].toUpperCase()}${kind.slice(1)}Country`,geoKind:kind,answerDomain:'country',difficulty:difficulty(item),central:item.id,subject:item,country,validCountries:item.countries,correct:`country:${country}`,options:shuffled([option('country',country),...distractors.map(row=>option('country',row.id))],seededRandom(`${kind}:${item.id}:country-options`))});
        else bump('insufficientDistractors');
      }else{
        const others=valid.filter(row=>row.id!==item.id&&!row.countries.includes(country));
        const nearby=others.filter(row=>row.continents.includes(ownContinent));
        const distractors=pickPeers(nearby,item,3,`${kind}:${item.id}:nearby-entity`);
        if(distractors.length<3)distractors.push(...pickPeers(others.filter(row=>!nearby.includes(row)),item,3-distractors.length,`${kind}:${item.id}:elsewhere-entity`).filter(row=>distinctLabels([item,...distractors,row])).slice(0,3-distractors.length));
        if(distractors.length===3)add({id:`geo-country-${kind}:${item.id}:${country}`,type:`geoCountry${kind[0].toUpperCase()}${kind.slice(1)}`,geoKind:kind,answerDomain:'entity',difficulty:difficulty(item),central:item.id,subjectCountry:country,country,correct:`entity:${item.id}`,options:shuffled([option('entity',item.id,item.labels),...distractors.map(row=>option('entity',row.id,row.labels))],seededRandom(`${kind}:${item.id}:entity-options`))});
        else bump('insufficientDistractors');
      }
      if(numericId(item.id)%3===0){
        if(item.continents.length!==1){bump('rejectedAmbiguity');continue}
        const falseContinents=shuffled(CONTINENTS.filter(value=>value!==ownContinent),seededRandom(`${kind}:${item.id}:continent`)).slice(0,3);
        add({id:`geo-${kind}-continent:${item.id}`,type:'geoContinent',geoKind:kind,answerDomain:'continent',difficulty:ICONIC.has(item.id)?'easy':'medium',central:item.id,subject:item,correct:`continent:${ownContinent}`,options:shuffled([option('continent',ownContinent),...falseContinents.map(value=>option('continent',value))],seededRandom(`${kind}:${item.id}:continent-options`))});
      }
    }
    const metric=metricFor(kind);
    const measured=valid.filter(item=>Number.isFinite(item[metric])&&item[metric]>0).sort((a,b)=>b[metric]-a[metric]||a.id.localeCompare(b.id));
    audit[`${kind}Measured`]=measured.length;
    for(let offset=0;offset+3<measured.length;offset+=4){
      const group=measured.slice(offset,offset+4),best=group[0],runnerUp=group[1];
      if(best[metric]-runnerUp[metric]<Math.max(kind==='desert'?100:kind==='river'?10:20,best[metric]*.015)||!distinctLabels(group)){bump('numericTie');continue}
      add({id:`geo-${kind}-compare:${group.map(item=>item.id).join('-')}`,type:'geoCompare',geoKind:kind,metric,metricValue:best[metric],unit:kind==='desert'?'km²':kind==='river'?'km':'m',answerDomain:'numeric',difficulty:kind==='desert'?'hard':'medium',central:best.id,subject:best,correct:`entity:${best.id}`,options:shuffled(group.map(item=>option('entity',item.id,item.labels)),seededRandom(`${kind}:${best.id}:compare`))});
    }
  }
  const rivers=geography?.river||[];
  for(const [field,type,domain] of [['sources','geoRiverSource','source'],['mouths','geoRiverMouth','mouth']]){
    const eligible=rivers.filter(river=>river[field]?.length===1&&river[field][0].labels?.en&&Object.keys(river[field][0].labels).length>=7);
    const endpoints=[...new Map(eligible.map(river=>[river[field][0].id,river[field][0]])).values()];
    for(const river of eligible){
      const answer=river[field][0],distractors=pickPeers(endpoints,answer,3,`${river.id}:${field}`);
      if(distractors.length!==3){bump('insufficientDistractors');continue}
      add({id:`geo-river-${field}:${river.id}:${answer.id}`,type,geoKind:'river',answerDomain:domain,difficulty:field==='sources'?'hard':'medium',central:river.id,subject:river,correct:`entity:${answer.id}`,options:shuffled([option('entity',answer.id,answer.labels),...distractors.map(item=>option('entity',item.id,item.labels))],seededRandom(`${river.id}:${field}:options`))});
    }
    audit[`${field}Eligible`]=eligible.length;
    audit[`${field}Insufficient`]=rivers.length-eligible.length;
  }
  return output;
}
