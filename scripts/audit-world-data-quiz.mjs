import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as CORE from '../assets/js/data-core.mjs';
import * as CHANGE from '../assets/js/data-change-core.mjs';
import { DATA_LANGUAGES } from '../assets/js/data-routes.mjs';
import { gameText } from '../assets/js/games/games-i18n.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CHALLENGES=join(ROOT,'assets/data/games/world-data-quiz');
const TYPES={highest:{historical:false,direction:'max'},lowest:{historical:false,direction:'min'},largestIncrease:{historical:true,direction:'max',sign:'positive'},largestDecrease:{historical:true,direction:'min',sign:'negative'}};
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const compactSource=value=>typeof value==='string'?value.split(/,\s*(?:uri|publisher|date accessed):/i)[0].replace(/\s+/g,' ').trim():null;
const normalized=value=>String(value).replace(/\s+/g,' ').trim();
const unique=values=>values.every(value=>value!=null)&&new Set(values.map(normalized)).size===values.length;

export async function auditWorldDataQuiz(){
  const registry=await readJson(join(ROOT,'assets/data/indicators.json'));
  const countryPayload=await readJson(join(ROOT,'assets/data/worldbank/countries.json'));
  const validCountryMap=new Map(countryPayload.countries.filter(country=>!country.is_aggregate&&country.iso2).map(country=>[country.id,country]));
  const indicatorMap=new Map(registry.indicators.map(item=>[item.id,item]));
  const dataMap=new Map(await Promise.all(registry.indicators.map(async item=>[item.slug,await readJson(join(ROOT,'assets/data/worldbank',`${item.slug}.json`))])));
  const manifest=await readJson(join(CHALLENGES,'manifest.json'));
  const files=(await readdir(CHALLENGES)).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
  const errors=[],counts={challenges:files.length,questions:0,validQuestions:0,invalidSigns:0,wrongAnswers:0,rawTies:0,formattedTies:0,yearMismatches:0,aggregates:0,nullValues:0,valueMismatches:0,invalidTypes:0,sourceMismatches:0,textMismatches:0};
  const typeCounts=Object.fromEntries(Object.keys(TYPES).map(type=>[type,0])),indicatorCounts={},categoryCounts={},countryCounts={};
  const fail=(code,message)=>{counts[code]++;if(errors.length<30)errors.push(`${code}: ${message}`)};
  if(manifest.generatorVersion!==2)fail('valueMismatches',`manifest generatorVersion ${manifest.generatorVersion}`);
  if(manifest.dates?.length!==files.length||manifest.from!==files[0]?.replace('.json','')||manifest.to!==files.at(-1)?.replace('.json',''))fail('yearMismatches','manifest range/dates do not match challenge files');
  for(const file of files){
    const challenge=await readJson(join(CHALLENGES,file));
    if(challenge.date!==file.replace('.json','')||challenge.generatorVersion!==2||challenge.questions?.length!==5){fail('valueMismatches',`${file}: challenge envelope`);continue}
    const challengeIds=new Set;
    for(const question of challenge.questions){
      counts.questions++;let valid=true;const definition=TYPES[question.type],item=indicatorMap.get(question.indicatorId),data=item&&dataMap.get(item.slug);
      const issue=(code,message)=>{valid=false;fail(code,`${file}:${question.id||'?'} ${message}`)};
      if(!definition){issue('invalidTypes',`unknown type ${question.type}`);continue}
      typeCounts[question.type]++;indicatorCounts[question.indicatorId]=(indicatorCounts[question.indicatorId]||0)+1;categoryCounts[question.category]=(categoryCounts[question.category]||0)+1;
      if(!item||!data||question.indicatorSlug!==item.slug||question.category!==item.category)issue('valueMismatches','indicator metadata mismatch');
      if(!question.id||challengeIds.has(question.id))issue('valueMismatches','missing/duplicate question id');challengeIds.add(question.id);
      if(question.options?.length!==4||new Set(question.options?.map(option=>option.country)).size!==4){issue('rawTies','options are not four distinct countries');continue}
      const rowsByKey=new Map(data.observations.map(row=>[`${row.country}:${row.year}`,row.value]));
      const expectedPeriod=definition.historical?CHANGE.defaultPeriod(data,countryPayload.countries,item,registry.common_year_coverage):{from:null,to:CORE.commonYear(data.observations.filter(row=>validCountryMap.has(row.country)&&Number.isFinite(row.value)),registry.common_year_coverage)};
      if(question.year!==expectedPeriod.to||(definition.historical?question.fromYear!==expectedPeriod.from:question.fromYear!=null))issue('yearMismatches',`stored ${question.fromYear??''}-${question.year}, expected ${expectedPeriod.from??''}-${expectedPeriod.to}`);
      const expectedSource=compactSource(data.official_metadata?.source_organization);if((question.sourceOrganization||null)!==expectedSource)issue('sourceMismatches','original source mismatch');
      const recalculated=[];
      for(const option of question.options){
        countryCounts[option.country]=(countryCounts[option.country]||0)+1;const country=validCountryMap.get(option.country);
        if(!country){issue('aggregates',`${option.country} is aggregate/unknown`);continue}
        if(option.iso2!==country.iso2)issue('valueMismatches',`${option.country} ISO2 mismatch`);
        const to=rowsByKey.get(`${option.country}:${question.year}`);
        if(!Number.isFinite(to)){issue('nullValues',`${option.country} missing ${question.year}`);continue}
        if(definition.historical){
          const from=rowsByKey.get(`${option.country}:${question.fromYear}`);if(!Number.isFinite(from)){issue('nullValues',`${option.country} missing ${question.fromYear}`);continue}
          const change=CHANGE.calculateChange(from,to,CHANGE.changeType(item));if(!Number.isFinite(change)){issue('nullValues',`${option.country} invalid change`);continue}
          if(option.from!==from||option.to!==to||option.change!==change||option.value!==change)issue('valueMismatches',`${option.country} historical values mismatch`);
          if(question.type==='largestIncrease'&&!(change>0))issue('invalidSigns',`${option.country} increase delta ${change}`);
          if(question.type==='largestDecrease'&&!(change<0))issue('invalidSigns',`${option.country} decrease delta ${change}`);
          recalculated.push({country:option.country,value:change,from,to,change});
        }else{
          if(option.value!==to)issue('valueMismatches',`${option.country} value mismatch`);recalculated.push({country:option.country,value:to});
        }
      }
      if(recalculated.length!==4)continue;
      const values=recalculated.map(row=>row.value),best=definition.direction==='max'?Math.max(...values):Math.min(...values),winners=recalculated.filter(row=>row.value===best);
      if(winners.length!==1)issue('rawTies',`best raw value tied: ${best}`);else if(question.correctCountry!==winners[0].country)issue('wrongAnswers',`stored ${question.correctCountry}, expected ${winners[0].country}`);
      for(const {locale} of Object.values(DATA_LANGUAGES)){
        const visibleSets=definition.historical?[recalculated.map(row=>CORE.formatIndicatorValue(row.from,item,locale,'table')),recalculated.map(row=>CORE.formatIndicatorValue(row.to,item,locale,'table')),recalculated.map(row=>CHANGE.formatChange(row.change,item,locale,'table'))]:[recalculated.map(row=>CORE.formatIndicatorValue(row.value,item,locale,'table'))];
        if(visibleSets.some(set=>!unique(set))){issue('formattedTies',`${locale} visible tie`);break}
      }
      const copyKey={largestIncrease:'increase',largestDecrease:'decrease'}[question.type]||question.type;
      for(const language of Object.keys(DATA_LANGUAGES)){const text=gameText(language),copy=text[copyKey]?.(text.gameTitle,question.fromYear??question.year,question.year),opposite=definition.historical?text[question.type==='largestIncrease'?'decrease':'increase']?.(text.gameTitle,question.fromYear,question.year):null;if(!copy||!copy.includes(String(question.year))||(opposite&&copy===opposite)){issue('textMismatches',`${language} semantic template`);break}}
      if(valid)counts.validQuestions++;
    }
  }
  const report={...counts,typeCounts,indicatorCounts,categoryCounts,countryCounts,errors};
  const invalid=counts.questions-counts.validQuestions;
  if(counts.challenges!==380||counts.questions!==1900||invalid||Object.values(typeCounts).some(count=>count===0)){const error=new Error(`Semantic audit failed: ${counts.validQuestions}/${counts.questions} valid`);error.report=report;throw error}
  return report;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  try{const report=await auditWorldDataQuiz();console.log(`Semantic audit: ${report.validQuestions}/${report.questions} valid; 0 invalid signs; 0 wrong answers; 0 raw ties; 0 formatted ties; 0 year mismatches; 0 aggregates; 0 null values.`)}catch(error){console.error(error.message);if(error.report)console.error(JSON.stringify(error.report,null,2));process.exitCode=1}
}
