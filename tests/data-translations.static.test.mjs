import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DATA_LANGUAGES,DATA_PAGES} from '../assets/js/data-routes.mjs';

const root=resolve(import.meta.dirname,'..');
const phrases={
  es:['Buscar país','Datos destacados','Fuentes y metodología'],
  en:['Search country','Key figures','Sources and methodology'],
  fr:['Rechercher un pays','Chiffres clés','Sources et méthodologie'],
  de:['Land suchen','Kennzahlen','Quellen und Methodik'],
  it:['Cerca paese','Dati principali','Fonti e metodologia'],
  pt:['Pesquisar país','Dados em destaque','Fontes e metodologia'],
  ru:['Поиск страны','Ключевые показатели','Источники и методология'],
  'zh-CN':['搜索国家或地区','关键数据','来源与方法'],
  hi:['देश खोजें','मुख्य आँकड़े','स्रोत और कार्यप्रणाली'],
  ja:['国・地域を検索','主な数値','情報源と方法'],
  ko:['국가 검색','주요 수치','출처 및 방법론'],
  ca:['Cerca un país','Dades destacades','Fonts i metodologia'],
  ar:['ابحث عن بلد','أبرز الأرقام','المصادر والمنهجية'],
  id:['Cari negara','Angka utama','Sumber dan metodologi'],
  bn:['দেশ খুঁজুন','মূল পরিসংখ্যান','উৎস ও পদ্ধতি']
};
for(const [key,page] of Object.entries(DATA_PAGES)){
  if(key==='home'||key==='sources')continue;
  for(const language of Object.keys(DATA_LANGUAGES)){
    const file=join(root,...page[language].split('/').filter(Boolean),'index.html');
    const html=readFileSync(file,'utf8').replace(/<head>[\s\S]*?<\/head>/,'').replace(/<details class="language-switcher"[\s\S]*?<\/details>/,'').replace(/<script[\s\S]*?<\/script>/g,'');
    const own=phrases[language];
    for(const phrase of own)assert.ok(html.includes(phrase),`${page[language]}: falta "${phrase}"`);
    for(const other of Object.keys(phrases).filter(code=>code!==language))for(const phrase of phrases[other])assert.equal(html.includes(phrase),false,`${page[language]}: contaminación ${other} "${phrase}"`);
  }
}
console.log('data-translations-static: interfaz principal localizada sin contaminación entre 15 idiomas');
