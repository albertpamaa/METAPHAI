import assert from 'node:assert/strict';
import {createReadStream,existsSync,readFileSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import {DATA_LANGUAGES,DATA_PAGES,INSTITUTIONAL_PAGES} from '../assets/js/data-routes.mjs';
import {GAME_PAGES} from '../assets/js/games/game-routes.mjs';

const root=resolve(import.meta.dirname,'..'),languages=Object.keys(DATA_LANGUAGES);
const routes=[...Object.values(DATA_PAGES).flatMap(page=>languages.map(language=>page[language])),...Object.values(INSTITUTIONAL_PAGES).flatMap(page=>languages.map(language=>page[language])),...Object.values(GAME_PAGES).flatMap(page=>languages.map(language=>page[language]))];
assert.equal(routes.length,570);assert.equal(new Set(routes).size,570);
const localFile=pathname=>pathname.endsWith('.html')?join(root,pathname.slice(1)):join(root,pathname.slice(1),'index.html');
const server=createServer((request,response)=>{const url=new URL(request.url,'http://127.0.0.1'),file=localFile(url.pathname);if(!existsSync(file)||!statSync(file).isFile()){response.writeHead(404);response.end('Not found');return}response.writeHead(200,{'content-type':'text/html; charset=utf-8'});createReadStream(file).pipe(response)});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
try{
  const {port}=server.address();
  for(const route of routes){const response=await fetch(`http://127.0.0.1:${port}${route}`);assert.equal(response.status,200,`${route}: HTTP ${response.status}`);const html=await response.text();assert.match(html,/<!doctype html>/i,`${route}: documento HTML inválido`);assert.equal(html.includes('�'),false,`${route}: carácter de reemplazo UTF-8`);for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(/\bsrc=|application\/ld\+json/.test(match[1]))continue;assert.doesNotThrow(()=>new Function(match[2]),`${route}: JavaScript inline inválido`)}}
}finally{await new Promise((resolveClose,reject)=>server.close(error=>error?reject(error):resolveClose()))}

const scripts={ru:/[А-Яа-яЁё]/u,'zh-CN':/[\u3400-\u9fff]/u,hi:/[\u0900-\u097f]/u,ja:/[\u3040-\u30ff\u3400-\u9fff]/u,ko:/[\uac00-\ud7af]/u};
for(const [language,pattern] of Object.entries(scripts))for(const page of Object.values(DATA_PAGES)){const html=readFileSync(localFile(page[language]),'utf8').replace(/<head>[\s\S]*?<\/head>/,'');assert.match(html,pattern,`${page[language]}: escritura principal ausente`)}
console.log('multilingual-http: 570/570 URLs base HTTP 200 y scripts 15 idiomas válidos');
