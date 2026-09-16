import { gameState, derivedStats, readStore } from './game-storage.mjs';
import { gameText } from './games-i18n.mjs';

export function renderStats(container,language,gameId='worldDataQuiz'){
  if(!container)return;const text=gameText(language),stats=derivedStats(gameState(readStore(),gameId).stats),items=[[text.played,stats.gamesPlayed],[text.wins,stats.wins],[text.winRate,`${Math.round(stats.winRate)}%`],[text.currentStreak,stats.currentStreak],[text.bestStreak,stats.bestStreak],[text.perfect,stats.perfectGames],[text.average,`${stats.averageScore.toFixed(1)}/10`],[text.questionsAnswered,stats.totalQuestions],[text.totalCorrect,stats.totalCorrect]];
  container.replaceChildren(...items.map(([label,value])=>{const card=document.createElement('div');card.className='game-stat';const strong=document.createElement('strong');strong.textContent=String(value);const span=document.createElement('span');span.textContent=label;card.append(strong,span);return card}));
}

export function bidiSegments(value){return String(value).split(/(\d+(?:[.,/]\d+)?(?:\s*[–—→-]\s*\d+(?:[.,/]\d+)?)?)/g).filter(Boolean).map(text=>({text,isolate:/^\d/.test(text)}))}
export function appendBidiText(container,value,language){if(language!=='ar'){container.append(String(value));return container}for(const part of bidiSegments(value)){if(!part.isolate){container.append(part.text);continue}const isolate=document.createElement('bdi');isolate.className='bidi-number';isolate.dir='ltr';isolate.textContent=part.text;container.append(isolate)}return container}
