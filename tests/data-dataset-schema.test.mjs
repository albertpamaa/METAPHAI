import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { languageConfig } from '../assets/js/data-i18n.mjs';
import { DATA_LANGUAGES, DATA_PAGES, countryRoute } from '../assets/js/data-routes.mjs';
import * as VIEWS from '../assets/js/data-view-core.mjs';

const ROOT=dirname(dirname(fileURLToPath(import.meta.url)));
const LICENSE='https://creativecommons.org/licenses/by/4.0/';
const ORIGINAL=new Set(['poblacion','esperanza-de-vida','fertilidad','pib-per-capita','crecimiento-pib','desempleo','uso-de-internet','energia-renovable']);
const REQUIRED_LANGUAGES=new Set(['es','en','fr','de','it','pt']);
const routeFile=route=>route.endsWith('/')?join(ROOT,...route.split('/').filter(Boolean),'index.html'):join(ROOT,...route.split('/').filter(Boolean));
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const schemaScripts=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
const graphNodes=value=>Array.isArray(value?.['@graph'])?value['@graph']:[value];
const nodesOfType=(schemas,type)=>schemas.flatMap(graphNodes).filter(node=>node?.['@type']===type);

const registry=await readJson(join(ROOT,'assets/data/indicators.json'));
const countries=await readJson(join(ROOT,'assets/data/worldbank/countries.json'));
const dataBySlug=new Map(await Promise.all(registry.indicators.map(async item=>[item.slug,await readJson(join(ROOT,`assets/data/worldbank/${item.slug}.json`))])));
const descriptionsByLanguage=new Map(Object.keys(DATA_LANGUAGES).map(language=>[language,new Set()]));
const descriptionsByIndicator=new Map(registry.indicators.map(item=>[item.slug,new Map()]));
let indicatorPages=0,requiredPages=0,countryPages=0,jsonBlocks=0;

for(const [pageKey,page] of Object.entries(DATA_PAGES).filter(([,candidate])=>candidate.indicator)){
  const item=registry.indicators.find(candidate=>candidate.slug===page.indicator),data=dataBySlug.get(item.slug);
  assert.ok(item&&data,`Missing indicator data for ${pageKey}`);
  for(const language of Object.keys(DATA_LANGUAGES)){
    const html=await readFile(routeFile(page[language]),'utf8'),schemas=schemaScripts(html),datasets=nodesOfType(schemas,'Dataset');
    jsonBlocks+=schemas.length;indicatorPages++;
    if(ORIGINAL.has(item.slug)&&REQUIRED_LANGUAGES.has(language))requiredPages++;
    assert.equal(datasets.length,1,`${page[language]} must contain exactly one Dataset`);
    assert.ok(schemas.some(schema=>schema['@context']==='https://schema.org'),`${page[language]} missing schema.org context`);
    const dataset=datasets[0],localized=languageConfig(language).indicators[item.slug]||item;
    assert.equal(dataset.name,localized.name);
    assert.ok(typeof dataset.description==='string'&&dataset.description.length>40,`${page[language]} has an empty description`);
    assert.ok(dataset.description.includes(localized.name),`${page[language]} description does not identify the indicator`);
    assert.ok(dataset.description.includes('MetaphAI')&&dataset.description.includes(String(data.coverage.min_year))&&dataset.description.includes(String(data.coverage.max_year)),`${page[language]} description lacks coverage or processing context`);
    assert.equal(dataset.url,`https://metaphai.com${page[language]}`);
    assert.equal(dataset.identifier,item.code);
    assert.deepEqual(dataset.creator,{'@type':'Organization',name:'World Bank'});
    assert.deepEqual(dataset.publisher,{'@type':'Organization',name:'MetaphAI',url:'https://metaphai.com/'});
    assert.equal(dataset.license,LICENSE);
    assert.equal(dataset.temporalCoverage,`${data.coverage.min_year}/${data.coverage.max_year}`);
    assert.match(dataset.temporalCoverage,/^\d{4}\/\d{4}$/);
    assert.equal(dataset.variableMeasured,localized.name);
    assert.equal(dataset.includedInDataCatalog?.name,'World Development Indicators');
    assert.equal(dataset.includedInDataCatalog?.['@type'],'DataCatalog');
    assert.equal(dataset.isAccessibleForFree,true);
    assert.equal(dataset.inLanguage,language);
    assert.equal('distribution' in dataset,false,'Browser-generated CSV must not advertise an invented stable URL');
    assert.equal('spatialCoverage' in dataset,false,'No artificial spatial entity should be declared');
    descriptionsByLanguage.get(language).add(dataset.description);
    descriptionsByIndicator.get(item.slug).set(language,dataset.description);
  }
}

assert.equal(indicatorPages,330);
assert.equal(requiredPages,48);
for(const [language,descriptions] of descriptionsByLanguage)assert.equal(descriptions.size,registry.indicators.length,`${language} descriptions must differ by indicator`);
for(const [slug,descriptions] of descriptionsByIndicator){
  const required=[...REQUIRED_LANGUAGES].map(language=>descriptions.get(language));
  assert.equal(new Set(required).size,REQUIRED_LANGUAGES.size,`${slug} description must be localized in the six required languages`);
}

for(const country of VIEWS.validCountries(countries.countries))for(const language of Object.keys(DATA_LANGUAGES)){
  const route=countryRoute(language,country.id),html=await readFile(routeFile(route),'utf8'),schemas=schemaScripts(html);
  jsonBlocks+=schemas.length;countryPages++;
  assert.equal(nodesOfType(schemas,'Dataset').length,0,`${route} is a country profile, not a Dataset`);
  assert.equal(nodesOfType(schemas,'WebPage').length,1,`${route} must remain a WebPage`);
}

for(const page of Object.values(DATA_PAGES).filter(candidate=>!candidate.indicator))for(const language of Object.keys(DATA_LANGUAGES)){
  const route=page[language];if(!route)continue;
  const html=await readFile(routeFile(route),'utf8'),schemas=schemaScripts(html);jsonBlocks+=schemas.length;
  assert.equal(nodesOfType(schemas,'Dataset').length,0,`${route} must not declare Dataset`);
}

assert.equal(countryPages,3255);
console.log(`data-dataset-schema: ${indicatorPages}/330 indicator pages, ${requiredPages}/48 requested pages, ${countryPages} country profiles and ${jsonBlocks} JSON-LD blocks valid`);
