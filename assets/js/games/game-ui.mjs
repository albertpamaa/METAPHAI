import { gameState, derivedStats, readStore } from './game-storage.mjs';
import { gameText } from './games-i18n.mjs';
import { gameStatsText } from './game-stats-i18n.mjs';

export function renderStats(container,language,gameId='worldDataQuiz'){
  if(!container)return;const text=gameText(language),stats=derivedStats(gameState(readStore(),gameId).stats),items=[[text.played,stats.gamesPlayed],[text.wins,stats.wins],[text.winRate,`${Math.round(stats.winRate)}%`],[text.currentStreak,stats.currentStreak],[text.bestStreak,stats.bestStreak],[text.perfect,stats.perfectGames],[text.average,`${stats.averageScore.toFixed(1)}/10`],[text.questionsAnswered,stats.totalQuestions],[text.totalCorrect,stats.totalCorrect]];
  container.replaceChildren(...items.map(([label,value])=>{const card=document.createElement('div');card.className='game-stat';const strong=document.createElement('strong');strong.textContent=String(value);const span=document.createElement('span');span.textContent=label;card.append(strong,span);return card}));
}

export function renderDailyStats(container,language,gameId,{maximumScore=500,showHints=false,showPerfect=false}={}){
  if(!container)return;const text=gameStatsText(language),stats=derivedStats(gameState(readStore(),gameId).stats),formatter=new Intl.NumberFormat(language==='zh-CN'?'zh-CN':language),number=value=>formatter.format(value),score=value=>`${number(Math.round(value))} / ${number(maximumScore)}`,percent=value=>`${number(Math.round(value))} %`,items=[[text.currentStreak,number(stats.currentStreak)],[text.bestStreak,number(stats.bestStreak)],[text.dailyGames,number(stats.gamesPlayed)],[text.bestScore,score(stats.bestScore)],[text.averageScore,score(stats.averageScore)],[text.correct,number(stats.totalCorrect)],[text.attempts,number(stats.totalQuestions)],[text.accuracy,percent(stats.accuracy)]];if(showHints)items.push([text.hintsUsed,number(stats.totalHints)]);if(showPerfect)items.push([text.perfectGames,number(stats.perfectGames)]);items.push([text.trainingGames,number(stats.trainingGames)]);container.replaceChildren(...items.map(([label,value])=>{const card=document.createElement('div');card.className='game-stat';const strong=document.createElement('strong');strong.className='bidi-number';strong.dir='ltr';strong.textContent=String(value);const span=document.createElement('span');span.textContent=label;card.append(strong,span);return card}));
}

export function bidiSegments(value){return String(value).split(/(\d+(?:[.,/]\d+)?(?:\s*[–—→-]\s*\d+(?:[.,/]\d+)?)?)/g).filter(Boolean).map(text=>({text,isolate:/^\d/.test(text)}))}
export function appendBidiText(container,value,language){if(language!=='ar'){container.append(String(value));return container}for(const part of bidiSegments(value)){if(!part.isolate){container.append(part.text);continue}const isolate=document.createElement('bdi');isolate.className='bidi-number';isolate.dir='ltr';isolate.textContent=part.text;container.append(isolate)}return container}
