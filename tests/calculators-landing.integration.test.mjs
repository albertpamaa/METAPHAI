import assert from 'node:assert/strict';
import {createReadStream,existsSync,readFileSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import {readSitemapEntries} from './sitemap-test-helper.mjs';

const root=resolve(import.meta.dirname,'..');
const calculatorRoutes=[
  '/calculadora-salario-neto-espana/','/calculadora-finiquito-espana/','/calculadora-paro-desempleo-espana/',
  '/calculadora-baja-maternidad-paternidad/','/planificador-baja-maternidad-vacaciones/',
  '/calculadora-deduccion-placas-solares/','/calculadora-deduccion-coche-electrico/','/calculadora-deduccion-alquiler/',
  '/calculadora-irpf-apuestas-online/','/calculadora-irpf-inversiones/','/simulador-declaracion-renta-2025/',
  '/calculadora-hipoteca-espana/','/calculadora-jubilacion-pension/','/calculadora-irpf-autonomos/',
  '/calculadora-horas-extra/','/calculadora-iva/','/calculadora-indemnizacion-accidente-trafico/',
  '/calculadora-impuesto-herencias/','/calculadora-precio-hora-freelance/'
];
const routeFile=route=>route==='/'?join(root,'index.html'):join(root,...route.split('/').filter(Boolean),'index.html');
const home=readFileSync(routeFile('/'),'utf8'),landing=readFileSync(routeFile('/calculadoras/'),'utf8'),sitemap=readSitemapEntries(root);

assert.equal(calculatorRoutes.length,19);
assert.ok(home.includes('<link rel="canonical" href="https://metaphai.com/">'));
assert.ok(landing.includes('<link rel="canonical" href="https://metaphai.com/calculadoras/">'));
assert.ok(home.includes('href="/calculadoras/">Ver todas las calculadoras'));
assert.ok(home.includes('href="/calculadoras/" class="site-nav-link">Calculadoras</a>'));
assert.equal(home.includes('href="/calculadoras/" class="site-nav-link" aria-current="page"'),false);
assert.ok(landing.includes('href="/calculadoras/" class="site-nav-link" aria-current="page"'));
assert.ok(landing.includes('<a href="/" class="logo">'));
assert.ok(landing.includes('<a href="/">Inicio</a> › Calculadoras'));
assert.match(landing,/"@type":"CollectionPage"/);
assert.equal((home.match(/class="card"/g)||[]).length,6,'La home debe limitarse a seis herramientas populares');
assert.match(home,/@media \(max-width: 900px\) \{ \.home-paths \{ grid-template-columns: 1fr/);
assert.match(home,/@media \(max-width: 600px\) \{ \.grid \{ grid-template-columns: 1fr/);
assert.match(landing,/@media\(max-width:768px\)\{[\s\S]*?\.grid\{grid-template-columns:repeat\(2/);
assert.match(landing,/@media\(max-width:600px\)\{[\s\S]*?main\{padding-inline:1rem\}[\s\S]*?\.grid\{grid-template-columns:1fr/);
for(const [route,html] of [['/',home],['/calculadoras/',landing]]){const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);assert.equal(new Set(ids).size,ids.length,`${route}: IDs duplicados`);for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(/\bsrc=/.test(script[1]))continue;if(/application\/ld\+json/.test(script[1]))assert.doesNotThrow(()=>JSON.parse(script[2]),`${route}: JSON-LD inválido`);else assert.doesNotThrow(()=>new Function(script[2]),`${route}: JavaScript inline inválido`)}for(const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:\?[^"#]*)?"/g)){const target=match[1];if(!target.startsWith('/')||target.startsWith('//'))continue;const file=target==='/'?join(root,'index.html'):target.endsWith('/')?join(root,...target.split('/').filter(Boolean),'index.html'):join(root,...target.split('/').filter(Boolean));assert.ok(existsSync(file),`${route}: enlace interno roto ${target}`)}}
for(const route of calculatorRoutes){
  assert.ok(existsSync(routeFile(route)),`${route}: archivo ausente`);
  assert.ok(landing.includes(`href="${route}"`),`${route}: falta en el catálogo completo`);
  const html=readFileSync(routeFile(route),'utf8');
  assert.ok(html.includes('href="/calculadoras/" class="site-nav-link" aria-current="page"'),`${route}: Calculadoras no activa`);
  assert.ok(html.includes('<a href="/" class="logo">'),`${route}: el logo no vuelve a Inicio`);
  if(html.includes('"@type": "BreadcrumbList"'))assert.ok(html.includes('"item": "https://metaphai.com/calculadoras/"'),`${route}: BreadcrumbList sin landing`);
}
assert.ok(sitemap.includes('<loc>https://metaphai.com/calculadoras/</loc>'));
assert.equal((sitemap.match(/<loc>https:\/\/metaphai\.com\/calculadoras\/<\/loc>/g)||[]).length,1);

const routes=['/','/calculadoras/',...calculatorRoutes];
const server=createServer((request,response)=>{const pathname=new URL(request.url,'http://127.0.0.1').pathname,file=routeFile(pathname);if(!existsSync(file)||!statSync(file).isFile()){response.writeHead(404);response.end('Not found');return}response.writeHead(200,{'content-type':'text/html; charset=utf-8'});createReadStream(file).pipe(response)});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
try{const {port}=server.address();for(const route of routes){const response=await fetch(`http://127.0.0.1:${port}${route}`);assert.equal(response.status,200,`${route}: HTTP ${response.status}`);assert.match(await response.text(),/<!doctype html>/i)}}finally{await new Promise((resolveClose,reject)=>server.close(error=>error?reject(error):resolveClose()))}

console.log(`calculators-landing: ${routes.length}/${routes.length} HTTP 200; 19/19 URLs antiguas preservadas y catálogo completo`);
