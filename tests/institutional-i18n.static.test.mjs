import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {DATA_LANGUAGES,DATA_PAGES,INSTITUTIONAL_PAGES,pageKeyFromPath,pageRoutes} from '../assets/js/data-routes.mjs';

const root=resolve(import.meta.dirname,'..'),origin='https://metaphai.com',version='20260913-2';
const languages=Object.keys(DATA_LANGUAGES),identities=Object.entries(INSTITUTIONAL_PAGES);
const fileFor=route=>route.endsWith('.html')?join(root,route.slice(1)):join(root,...route.split('/').filter(Boolean),'index.html');
const labels={es:['Fuentes y metodología','Privacidad','Contacto','Sobre nosotros'],en:['Sources and methodology','Privacy','Contact','About us'],fr:['Sources et méthodologie','Confidentialité','Contact','À propos'],de:['Quellen und Methodik','Datenschutz','Kontakt','Über uns'],it:['Fonti e metodologia','Privacy','Contatti','Chi siamo'],pt:['Fontes e metodologia','Privacidade','Contacto','Sobre nós'],ru:['Источники и методология','Конфиденциальность','Контакты','О проекте'],'zh-CN':['来源与方法','隐私','联系','关于我们'],hi:['स्रोत और कार्यप्रणाली','गोपनीयता','संपर्क','हमारे बारे में'],ja:['情報源と方法','プライバシー','お問い合わせ','私たちについて'],ko:['출처 및 방법론','개인정보 보호','문의','소개'],ca:['Fonts i metodologia','Privacitat','Contacte','Sobre nosaltres'],ar:['المصادر والمنهجية','الخصوصية','التواصل','من نحن'],id:['Sumber dan metodologi','Privasi','Kontak','Tentang kami'],bn:['উৎস ও পদ্ধতি','গোপনীয়তা','যোগাযোগ','আমাদের সম্পর্কে']};
const spanishMarkers=['Volver a Datos globales','¿Quién hay detrás?','Escríbenos directamente','Política de Privacidad y Cookies'];
const substantial={privacy:{h2:14,p:18,li:10},contact:{h2:2,p:4,li:0},about:{h2:4,p:9,li:0}};

assert.equal(identities.length,3);assert.equal(languages.length,15);
assert.equal(new Set(identities.flatMap(([,page])=>languages.map(lang=>page[lang]))).size,45);
for(const [key,page] of identities)for(const lang of languages){
  const route=page[lang],file=fileFor(route);assert.ok(existsSync(file),`${route}: archivo ausente`);
  const html=readFileSync(file,'utf8'),head=html.match(/<head>([\s\S]*?)<\/head>/)?.[1]||'',withoutSwitcher=html.replace(/<details class="language-switcher"[\s\S]*?<\/details>/,'');
  assert.equal(pageKeyFromPath(route),key);assert.deepEqual(pageRoutes(key),page);assert.match(html,new RegExp(`<html lang="${lang}"`));
  assert.ok(head.includes(`<link rel="canonical" href="${origin}${route}">`));assert.ok(head.includes(`<meta property="og:url" content="${origin}${route}">`));
  assert.match(head,/<title>[^<]{8,}<\/title>/);assert.match(head,/<meta name="description" content="[^"]{30,}">/);assert.ok(head.includes(`<meta name="robots" content="${key==='privacy'?'noindex, follow':'index, follow'}">`));
  for(const [tag,minimum] of Object.entries(substantial[key]))assert.ok((html.match(new RegExp(`<${tag}(?:\\s|>)`,'g'))||[]).length>=minimum,`${route}: contenido incompleto (${tag})`);
  for(const alt of languages)assert.ok(head.includes(`<link rel="alternate" hreflang="${alt}" href="${origin}${page[alt]}">`),`${route}: hreflang ${alt}`);
  assert.ok(head.includes(`<link rel="alternate" hreflang="x-default" href="${origin}${page.es}">`));assert.ok(html.includes(`data-page-key="${key}"`));
  for(const alt of languages)assert.ok(html.includes(`data-language="${alt}" href="${page[alt]}"`),`${route}: selector ${alt}`);
  assert.match(html,new RegExp(`data-language="${lang}"[^>]+aria-current="true"`));assert.ok(html.includes(`<a href="${DATA_PAGES.home[lang]}" class="site-nav-link">`));
  for(const target of [DATA_PAGES.sources[lang],INSTITUTIONAL_PAGES.privacy[lang],INSTITUTIONAL_PAGES.contact[lang],INSTITUTIONAL_PAGES.about[lang]])assert.ok(html.includes(`<a href="${target}">`),`${route}: footer ${target}`);
  for(const label of labels[lang])assert.ok(html.includes(label),`${route}: etiqueta ausente ${label}`);
  if(lang!=='es'){for(const old of ['/privacidad.html','/contacto.html','/sobre-nosotros.html'])assert.equal(withoutSwitcher.includes(`href="${old}"`),false,`${route}: enlace institucional español accidental ${old}`);for(const marker of spanishMarkers)assert.equal(html.includes(marker),false,`${route}: bloque español accidental (${marker})`)}
  const ids=[...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match=>match[1]);assert.equal(ids.length,new Set(ids).size,`${route}: ID duplicado`);
  assert.match(html,new RegExp(`data\\.css\\?v=${version}`));assert.match(html,new RegExp(`data-language\\.js\\?v=${version}`));
  for(const link of html.matchAll(/(?:href|src)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)){const target=link[1];if(!target.startsWith('/')||target.startsWith('//'))continue;const local=target.endsWith('/')?join(root,target.slice(1),'index.html'):join(root,target.slice(1));assert.ok(existsSync(local),`${relative(root,file)}: ruta inexistente ${target}`)}
  if(key==='privacy'){assert.ok((html.match(/mailto:info@metaphai\.com/g)||[]).length>=1,`${route}: contacto de privacidad ausente`);assert.equal(html.includes('adsbygoogle.js'),false);assert.equal(html.includes('googletagmanager.com/gtag/js'),false)}else{assert.ok(html.includes('adsbygoogle.js?client=ca-pub-7545567251029894'));assert.ok(html.includes('googletagmanager.com/gtag/js?id=G-1P9N4QY0JR'))}
  if(key==='contact'){assert.ok(html.includes('href="mailto:info@metaphai.com"'));assert.match(html,/navigator\.clipboard\.writeText\((?:'info@metaphai\.com'|this\.dataset\.copyEmail)\)/);assert.match(html,/data-copy-label="[^"]+" data-copied-label="[^"]+"/)}
  assert.equal(html.includes('1metaphai@gmail.com'),false);
}
const sitemap=readFileSync(join(root,'sitemap.xml'),'utf8'),locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
for(const key of ['contact','about'])for(const lang of languages){const page=INSTITUTIONAL_PAGES[key],url=origin+page[lang],entry=sitemap.match(new RegExp(`<url><loc>${url.replaceAll('.','\\.')}<\\/loc>([\\s\\S]*?)<\\/url>`))?.[1]||'';assert.ok(entry,`sitemap: falta ${url}`);for(const alt of languages)assert.ok(entry.includes(`hreflang="${alt}" href="${origin}${page[alt]}"`),`sitemap ${key}/${lang}: hreflang ${alt}`);assert.ok(entry.includes(`hreflang="x-default" href="${origin}${page.es}"`))}
for(const lang of languages)assert.equal(locs.includes(origin+INSTITUTIONAL_PAGES.privacy[lang]),false,`sitemap: privacidad noindex incluida (${lang})`);
console.log('institutional-i18n-static: 45 páginas, 3 equivalencias, SEO, selector, footers, email y enlaces OK');
