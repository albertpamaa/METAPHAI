import assert from 'node:assert/strict';
import {createReadStream,existsSync,readFileSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import vm from 'node:vm';
import {DATA_LANGUAGES} from '../assets/js/data-routes.mjs';
import {GEOGRAPHY_ROUTES,geographyItemRoute,geographyItemRoutes} from '../assets/js/geography-routes.mjs';
import {GEOGRAPHY_I18N,GEOGRAPHY_REQUIRED_KEYS} from '../assets/js/geography-i18n.mjs';
import {collections,metadata,prerenderGeography,VERSION} from '../scripts/prerender-geography.mjs';

const root=resolve(import.meta.dirname,'..'),languages=Object.keys(DATA_LANGUAGES),keys=['volcanoes','mountains','rivers','deserts'],expected={volcanoes:60,mountains:60,rivers:247,deserts:35},classRoot={volcanoes:'Q8072',mountains:'Q8502',rivers:'Q4022',deserts:'Q8514'};
const file=route=>join(root,...route.split('/').filter(Boolean),'index.html');
assert.equal(languages.length,15);
assert.deepEqual(Object.keys(GEOGRAPHY_I18N),languages);
for(const language of languages)for(const key of GEOGRAPHY_REQUIRED_KEYS)assert.ok(GEOGRAPHY_I18N[language][key]?.trim(),`${language}:${key}`);
assert.deepEqual(metadata.counts,{volcano:60,mountain:60,river:247,desert:35});

const allIds=[];
for(const key of keys){
  const items=collections[key];
  assert.equal(items.length,expected[key],key);
  assert.equal(new Set(items.map(item=>item.id)).size,items.length,`${key}: duplicate QID`);
  for(const item of items){
    allIds.push(`${key}:${item.id}`);
    assert.match(item.id,/^Q\d+$/);
    assert.equal(item.validation?.status,'validated');
    assert.equal(item.validation?.class_root,classRoot[key]);
    assert.ok(item.validation.instance_of.includes(classRoot[key]));
    assert.equal(item.kind,{volcanoes:'volcano',mountains:'mountain',rivers:'river',deserts:'desert'}[key]);
    assert.equal(item.coordinates.length,2);
    assert.ok(item.coordinates.every(Number.isFinite));
    assert.ok(Math.abs(item.coordinates[0])<=180&&Math.abs(item.coordinates[1])<=90);
    assert.ok(item.countries.length>0);
    assert.ok(item.labels.en&&item.labels.en!==item.id);
    if(Number.isFinite(item.elevation_m))assert.ok(item.elevation_m>-500&&item.elevation_m<9000);
    if(Number.isFinite(item.length_km)){assert.ok(item.length_km>0&&item.length_km<=10000);assert.equal(item.length_source,'wikidata:P2043')}
    if(Number.isFinite(item.area_km2)){assert.ok(item.area_km2>0&&item.area_km2<=20_000_000);assert.equal(item.area_source,'wikidata:P2046')}
    for(const field of ['sources','mouths'])for(const endpoint of item[field]||[]){assert.match(endpoint.id,/^Q\d+$/);assert.ok(endpoint.labels?.en)}
    if(key==='deserts')assert.equal(item.geometry_mode,'centroid');
  }
}
assert.equal(new Set(allIds).size,402,'entities may not repeat within the same category/QID pair');

const riverGeo=JSON.parse(readFileSync(join(root,'assets/data/geography/rivers-50m.geojson'),'utf8'));
assert.equal(riverGeo.features.length,247);
assert.deepEqual(new Set(riverGeo.features.map(item=>item.id)),new Set(collections.rivers.map(item=>item.id)));
const riverIds=new Set(collections.rivers.map(item=>item.id));
const protectedRivers=['Q3783','Q1653','Q41179','Q3542','Q127892','Q584','Q43106','Q626'];
for(const qid of protectedRivers)assert.ok(riverIds.has(qid),`protected river missing: ${qid}`);
const falsePositives=['Q11087615','Q1108959','Q11728226','Q21198444','Q21409625','Q21860134','Q22625143','Q23021556','Q24004927','Q2599627','Q2624925','Q2995554','Q31970682','Q32225053','Q34765748','Q34924351','Q36190139','Q36234629','Q36318495','Q36396131','Q37755556','Q3995693','Q4054234','Q4363930','Q4458127','Q6115455','Q6115632','Q95629532'];
for(const qid of falsePositives)assert.equal(riverIds.has(qid),false,`known false positive returned: ${qid}`);
const baseline=JSON.parse(readFileSync(join(root,'assets/data/geography/river-baseline.json'),'utf8'));
assert.equal(baseline.ids.length,247);assert.deepEqual(new Set(baseline.ids),riverIds);
assert.equal(metadata.river_audit.natural_earth_named_features,450);
assert.equal(metadata.river_audit.natural_earth_unique_normalized_names,356);
assert.equal(metadata.river_audit.valid_mappings,247);
assert.ok(metadata.river_audit.spatial_rejections.length>0);
assert.equal(metadata.river_audit.historical_false_positives.length,28);
assert.deepEqual(new Set(metadata.river_audit.historical_false_positives.map(item=>item.qid)),new Set(falsePositives));
const naturalNames=new Set();
for(const item of collections.rivers){assert.ok(item.natural_earth_name);assert.ok(item.geometry_segments>0);naturalNames.add(item.natural_earth_name)}
assert.ok(naturalNames.size>=45,'explicit Natural Earth mappings should be predominantly unique');
for(const feature of riverGeo.features){
  assert.equal(feature.geometry.type,'MultiLineString');
  const points=feature.geometry.coordinates.flat();
  assert.ok(points.length>1,feature.id);
  assert.ok(points.flat().every(Number.isFinite));
  assert.ok(new Set(points.map(point=>point.join(','))).size>1,feature.id);
}

const vendor={};vendor.globalThis=vendor;vendor.self=vendor;
vm.runInNewContext(readFileSync(join(root,'assets/vendor/d3.v7.9.0.min.js'),'utf8'),vendor);
vm.runInNewContext(readFileSync(join(root,'assets/vendor/topojson-client.v3.1.0.min.js'),'utf8'),vendor);
const topology=JSON.parse(readFileSync(join(root,'assets/maps/world-50m.topo.json'),'utf8')),world=vendor.topojson.feature(topology,topology.objects.countries),projection=vendor.d3.geoNaturalEarth1().fitExtent([[12,12],[948,528]],world),path=vendor.d3.geoPath(projection);
assert.equal(world.features.length,241);
for(const feature of riverGeo.features){const bounds=path.bounds(feature);assert.ok(bounds.flat().every(Number.isFinite));assert.ok(bounds[1][0]-bounds[0][0]>.05);assert.ok(bounds[1][1]-bounds[0][1]>.01);assert.ok(path(feature).length>20)}

const mapSource=readFileSync(join(root,'assets/js/geography-map.mjs'),'utf8'),listSource=readFileSync(join(root,'assets/js/geography-list.mjs'),'utf8'),css=readFileSync(join(root,'assets/css/geography.css'),'utf8');
assert.ok(mapSource.includes("select('svg.geo-map')"));
assert.equal(mapSource.includes("select('svg'),width"),false);
assert.ok(mapSource.includes("'desert'"));
assert.ok(mapSource.includes("rivers-50m.geojson"));
assert.ok(mapSource.indexOf("rivers-50m.geojson")>mapSource.indexOf('async function loadRivers'));
assert.ok(mapSource.includes("attr('class','geo-land')")&&mapSource.includes("attr('class','geo-borders')"));
assert.ok(listSource.includes('data-geo-list-item')&&listSource.includes('data-geo-continent'));
assert.match(css,/\.geo-marker\.desert/);
assert.match(css,/\.geo-list-tools/);
assert.match(css,/@media\(max-width:520px\)/);

const routes=[];
for(const language of languages){
  routes.push(GEOGRAPHY_ROUTES.home[language],GEOGRAPHY_ROUTES.sources[language],...keys.map(key=>GEOGRAPHY_ROUTES[key][language]));
  for(const key of keys)for(const item of collections[key])routes.push(geographyItemRoute(language,key,item.id));
  for(const route of [GEOGRAPHY_ROUTES.home[language],GEOGRAPHY_ROUTES.sources[language],...keys.map(key=>GEOGRAPHY_ROUTES[key][language])]){
    const html=readFileSync(file(route),'utf8');
    assert.match(html,new RegExp(`<html lang="${language}"${language==='ar'?' dir="rtl"':''}>`));
    assert.ok(html.includes(`<link rel="canonical" href="https://metaphai.com${route}">`));
    assert.ok(html.includes(`geography.css?v=${VERSION}`)&&html.includes(`geography-map.mjs?v=${VERSION}`)&&html.includes(`geography-list.mjs?v=${VERSION}`));
    assert.equal((html.match(/hreflang="x-default"/g)||[]).length,1);
    for(const code of languages)assert.ok(html.includes(`hreflang="${code}"`));
    if(route!==GEOGRAPHY_ROUTES.sources[language])assert.ok(html.includes('data-layer="desert"'));
    assert.ok(html.includes(GEOGRAPHY_ROUTES.deserts[language]));
  }
  for(const key of keys){const html=readFileSync(file(GEOGRAPHY_ROUTES[key][language]),'utf8');assert.ok(html.includes('data-geo-list-search'));assert.ok(html.includes('data-geo-continent'));assert.equal((html.match(/data-geo-list-item/g)||[]).length,expected[key])}
}
assert.equal(routes.length,6120);
assert.equal(new Set(routes).size,routes.length);
for(const route of routes)assert.ok(existsSync(file(route)),route);

const sitemap=readFileSync(join(root,'sitemap.xml'),'utf8');
for(const language of languages)for(const key of Object.keys(GEOGRAPHY_ROUTES))assert.ok(sitemap.includes(`<loc>https://metaphai.com${GEOGRAPHY_ROUTES[key][language]}</loc>`));
for(const key of keys)for(const item of collections[key])for(const route of Object.values(geographyItemRoutes(key,item.id)))assert.ok(sitemap.includes(`<loc>https://metaphai.com${route}</loc>`));
assert.equal((sitemap.match(/<!-- GEOGRAPHY_SITEMAP:START -->/g)||[]).length,1);

assert.equal(await prerenderGeography(),0,'prerender must be idempotent');
const server=createServer((req,res)=>{const target=file(decodeURI(req.url.split('?')[0]));if(existsSync(target)){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});createReadStream(target).pipe(res)}else{res.writeHead(404);res.end('Not found')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
try{for(const route of routes){const response=await fetch(`${base}${route}`);assert.equal(response.status,200,route);const html=await response.text();assert.ok(html.includes('<main class="geography-shell">'),route);if(!Object.values(GEOGRAPHY_ROUTES.sources).includes(route))assert.ok(html.includes('<svg class="geo-map"'),route)}}finally{await new Promise(resolve=>server.close(resolve))}

for(const asset of ['volcanoes.json','mountains.json','rivers.json','deserts.json','metadata.json','river-baseline.json','rivers-50m.geojson'])assert.ok(statSync(join(root,'assets/data/geography',asset)).size>100);
for(const [key,item] of [['volcanoes',collections.volcanoes.find(row=>Number.isFinite(row.elevation_m))],['mountains',collections.mountains.find(row=>Number.isFinite(row.elevation_m))],['rivers',collections.rivers.find(row=>Number.isFinite(row.length_km)&&row.sources?.length&&row.mouths?.length)],['deserts',collections.deserts.find(row=>Number.isFinite(row.area_km2))]])for(const language of ['es','en','ar']){const html=readFileSync(file(geographyItemRoute(language,key,item.id)),'utf8');for(const marker of ['geo-profile-section','geo-context-grid','geo-country-links','geo-related-grid','geo-profile-source'])assert.ok(html.includes(marker),`${language}/${key}: ${marker}`)}
console.log(`geography: ${routes.length} pages, 241 country paths, 60 volcanoes, 60 mountains, 247 spatially validated river geometries, 35 desert centroids, enriched profiles, 15 languages, HTTP and idempotent prerender OK`);
