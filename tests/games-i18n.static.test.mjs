import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DATA_LANGUAGES, INSTITUTIONAL_PAGES } from '../assets/js/data-routes.mjs';
import { GAME_PAGES } from '../assets/js/games/game-routes.mjs';
import { activeGames } from '../assets/js/games/game-registry.mjs';
import { GAMES_I18N } from '../assets/js/games/games-i18n.mjs';
import { HIGHER_LOWER_I18N } from '../assets/js/games/higher-or-lower-i18n.mjs';
import { COUNTRY_SILHOUETTE_I18N } from '../assets/js/games/country-silhouette-i18n.mjs';
import { GEO_QUIZ_I18N } from '../assets/js/games/geo-quiz-i18n.mjs';
import { appendBidiText, bidiSegments } from '../assets/js/games/game-ui.mjs';
import { ABOUT_DESCRIPTION } from '../scripts/prerender-games.mjs';

const root=resolve(import.meta.dirname,'..'),origin='https://metaphai.com';
const fileFor=route=>join(root,...route.split('/').filter(Boolean),'index.html');
const institutionalFileFor=route=>route.endsWith('/')?fileFor(route):join(root,...route.split('/').filter(Boolean));
const languages=Object.keys(DATA_LANGUAGES);
const quizRequired=['games','gamesTitle','gamesIntro','gameTitle','tagline','cardMeta','play','question','score','correctAnswers','hint','next','finish','correct','incorrect','privacy','unavailable','share','gameStatsTitle','highest','lowest','increase','decrease'];
const higherRequired=['title','tagline','cardMeta','play','higher','lower','question','currentRun','bestStreak','correct','incorrect','next','gameOver','playAgain','share','statsTitle','gamesPlayed','averageStreak','totalRounds','correctAnswers','accuracy','howTitle','how','method','privacy','unavailable','source'];

for(const language of languages){
  const text=GAMES_I18N[language],higher=HIGHER_LOWER_I18N[language],silhouette=COUNTRY_SILHOUETTE_I18N[language],geo=GEO_QUIZ_I18N[language];
  for(const key of quizRequired)assert.ok(typeof text[key]==='function'||String(text[key]||'').trim(),`${language}:${key}`);
  for(const key of higherRequired)assert.ok(typeof higher[key]==='function'||String(higher[key]||'').trim(),`${language}:higher:${key}`);
  for(const key of ['title','tagline','cardMeta','play','dailyPlay','training','hint','giveUp','check','silhouetteLabel','how','method','privacy','loadError'])assert.ok(String(silhouette[key]||'').trim(),`${language}:silhouette:${key}`);
  for(const [pageKey,routes] of Object.entries(GAME_PAGES)){
    const route=routes[language],file=fileFor(route);assert.ok(existsSync(file),route);
    const html=readFileSync(file,'utf8'),head=html.match(/<head>([\s\S]*?)<\/head>/)?.[1]||'';
    assert.match(html,new RegExp(`<html lang="${language}"${language==='ar'?' dir="rtl"':''}>`));
    assert.ok(head.includes(`<link rel="canonical" href="${origin}${route}">`));
    assert.ok(head.includes(`<meta property="og:url" content="${origin}${route}">`));
    assert.ok(head.includes('summary_large_image'));
    assert.ok(html.includes(`data-language="${language}" href="${route}"`));
    for(const alt of languages)assert.ok(head.includes(`hreflang="${alt}" href="${origin}${routes[alt]}"`));
    assert.ok(head.includes(`hreflang="x-default" href="${origin}${routes.es}"`));
    assert.ok(html.includes('games.css?v=20260917-2'));
    assert.equal(html.includes('�'),false);
    const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);assert.equal(new Set(ids).size,ids.length);
    for(const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(block[1]));
    if(pageKey==='home'){
      assert.ok(html.includes('<h1>'+text.games+'</h1>'));
      assert.equal((html.match(/data-game-id=/g)||[]).length,activeGames().length);
      assert.ok(html.includes('data-game-id="worldDataQuiz"'));
      assert.ok(html.includes('data-game-id="higherOrLower"'));
      assert.ok(html.includes('data-game-id="countrySilhouette"'));
      assert.ok(html.includes('data-game-id="geoQuiz"'));
      assert.equal(html.includes('data-game-stats'),false);
    }else if(pageKey==='worldDataQuiz'){
      assert.ok(html.includes('data-world-data-quiz'));assert.ok(html.includes('data-game-stats'));assert.ok(html.includes(text.gameStatsTitle));assert.ok(html.includes(text.howTitle));assert.ok(html.includes(text.how));assert.ok(html.includes(text.winRule));
    }else if(pageKey==='higherOrLower'){
      assert.ok(html.includes('data-higher-or-lower'));assert.ok(html.includes('data-game-stats'));assert.ok(html.includes(higher.statsTitle));assert.ok(html.includes(higher.howTitle));assert.ok(html.includes(higher.how));assert.ok(html.includes(higher.method));assert.ok(html.includes('higher-or-lower-ui.mjs?v=20260917-2'));
    }else if(pageKey==='countrySilhouette'){
      assert.ok(html.includes('data-country-silhouette'));assert.ok(html.includes(silhouette.howTitle));assert.ok(html.includes(silhouette.how));assert.ok(html.includes('country-silhouette-ui.mjs?v=20260917-2'));assert.ok(html.includes('/assets/maps/world-50m.topo.json')===false);assert.ok(html.includes('d3.v7.9.0.min.js'));assert.ok(html.includes('topojson-client.v3.1.0.min.js'));
    }else{
      assert.ok(html.includes('data-geo-quiz'));assert.ok(html.includes(geo.howTitle));assert.ok(html.includes('geo-quiz-ui.mjs?v=20260917-2'));assert.ok(html.includes('Wikidata (CC0)'));
    }
    if(pageKey!=='home')assert.ok(html.includes('World Bank — World Development Indicators'));
  }
  const about=readFileSync(institutionalFileFor(INSTITUTIONAL_PAGES.about[language]),'utf8');
  assert.equal((about.match(/data-about-overview/g)||[]).length,1,`${language}: marcador About`);
  assert.ok(about.includes(`<p data-about-overview>${ABOUT_DESCRIPTION[language]}</p>`),`${language}: descripción About`);
  for(const other of languages.filter(code=>code!==language))assert.equal(about.includes(`<p data-about-overview>${ABOUT_DESCRIPTION[other]}</p>`),false,`${language}: descripción de ${other}`);
}

assert.deepEqual(bidiSegments('2004'),[{text:'2004',isolate:true}]);
assert.deepEqual(bidiSegments('2004–2024'),[{text:'2004–2024',isolate:true}]);
assert.deepEqual(bidiSegments('من 2004 إلى 2024'),[{text:'من ',isolate:false},{text:'2004',isolate:true},{text:' إلى ',isolate:false},{text:'2024',isolate:true}]);
const bidiNodes=[];globalThis.document={createElement:tag=>({tag})};appendBidiText({append:(...nodes)=>bidiNodes.push(...nodes)},'من 2004 إلى 2024','ar');delete globalThis.document;
assert.deepEqual(bidiNodes.map(node=>typeof node==='string'?node:{tag:node.tag,dir:node.dir,className:node.className,textContent:node.textContent}),['من ',{tag:'bdi',dir:'ltr',className:'bidi-number',textContent:'2004'},' إلى ',{tag:'bdi',dir:'ltr',className:'bidi-number',textContent:'2024'}]);
const sitemap=readFileSync(join(root,'sitemap.xml'),'utf8');for(const routes of Object.values(GAME_PAGES))for(const route of Object.values(routes))assert.equal((sitemap.match(new RegExp(`<loc>${origin}${route}</loc>`,'g'))||[]).length,1);assert.doesNotMatch(sitemap,/assets\/data\/games|world-data-quiz\/20\d\d-/);
const higherUi=readFileSync(join(root,'assets/js/games/higher-or-lower-ui.mjs'),'utf8'),gamesCss=readFileSync(join(root,'assets/css/games.css'),'utf8');
assert.equal((higherUi.match(/\bfetch\(/g)||[]).length,1);assert.ok(higherUi.includes('game.dataRequirements.path'));assert.doesNotMatch(higherUi,/worldbank\/.+\.json|d3|topojson/i);
assert.match(gamesCss,/\.games-list\{[^}]*grid-template-columns:repeat\(auto-fit/);assert.match(gamesCss,/@media\(max-width:820px\)\{\.games-list\{grid-template-columns:1fr\}\}/);assert.match(gamesCss,/@media\(max-width:620px\)[\s\S]*\.quiz-options,\.hol-options\{grid-template-columns:1fr\}/);
console.log('games-i18n-static: 75 pages, 15 languages, SEO, RTL, switcher and sitemap OK');
