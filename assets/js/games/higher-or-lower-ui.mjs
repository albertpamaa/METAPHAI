import { formatIndicatorValue } from '../data-core.mjs';
import { languageConfig } from '../data-i18n.mjs';
import { DATA_PAGES } from '../data-routes.mjs';
import { GAME_PAGES } from './game-routes.mjs?v=20260916-5';
import { gameById } from './game-registry.mjs?v=20260916-5';
import { rawGameState, readStore, replaceGameState, writeStore } from './game-storage.mjs?v=20260916-5';
import { shareResult } from './game-share.mjs';
import { appendBidiText } from './game-ui.mjs';
import { answerHigherLower, createHigherLowerSession, derivedHigherLowerStats, finalizeHigherLower, newSeed, nextHigherLowerRound, normalizeHigherLowerState, validateHigherLowerDataset } from './higher-or-lower-core.mjs';
import { higherLowerText } from './higher-or-lower-i18n.mjs';

const language=document.documentElement.lang||'en';
const text=higherLowerText(language),config=languageConfig(language),locale=config.locale;
const game=gameById('higherOrLower'),root=document.querySelector('[data-higher-or-lower]'),statsRoot=document.querySelector('[data-game-stats]');
const element=(tag,className,content)=>{const node=document.createElement(tag);if(className)node.className=className;if(content!=null)node.textContent=content;return node};
const countryName=code=>{const iso2=dataset.countries[code];try{return new Intl.DisplayNames([locale],{type:'region'}).of(iso2)||code}catch{return code}};
const indicatorRoute=slug=>Object.values(DATA_PAGES).find(page=>page.indicator===slug)?.[language]||DATA_PAGES.home[language];
const indicatorItem=slug=>{const item=dataset.indicators.find(candidate=>candidate.slug===slug),localized=config.indicators?.[slug]||{};return{...item,...localized,presentation:{...item.presentation,unitLabel:localized.unitLabel||item.presentation?.unitLabel}}};
const persist=()=>{store=replaceGameState(readStore(),game.id,state);writeStore(store)};
const renderStats=()=>{if(!statsRoot)return;const stats=derivedHigherLowerStats(state.stats),items=[[text.gamesPlayed,stats.gamesPlayed],[text.bestStreak,stats.bestStreak],[text.averageStreak,new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(stats.averageStreak)],[text.totalRounds,stats.totalRounds],[text.correctAnswers,stats.correctAnswers],[text.accuracy,`${new Intl.NumberFormat(locale,{maximumFractionDigits:0}).format(stats.accuracy)}%`]];statsRoot.replaceChildren(...items.map(([label,value])=>{const card=element('div','game-stat'),strong=element('strong','',value),span=element('span','',label);card.append(strong,span);return card}))};
const valueNode=(value,item)=>{const span=element('span','hol-value bidi-number');appendBidiText(span,formatIndicatorValue(value,item,locale,'tooltip'),language);return span};
let dataset,store,state;

function render(focusRound=false){
  const area=root.querySelector('[data-game-area]'),session=state.activeSession;
  root.querySelector('[data-current-run]').textContent=String(session?.currentRun||0);
  root.querySelector('[data-best-streak]').textContent=String(Math.max(state.stats.bestStreak||0,session?.currentRun||0));
  area.replaceChildren();
  const round=session.currentRound,item=indicatorItem(round.indicator),card=element('section','hol-card');
  card.append(element('p','quiz-category',config.categories?.[round.category]||round.category));
  const question=element('h2','quiz-question');question.tabIndex=-1;appendBidiText(question,text.question(item.name,round.year,text[round.direction]),language);card.append(question);
  const options=element('div','hol-options');
  for(const option of [round.a,round.b]){
    const button=element('button','hol-option',countryName(option.country));button.type='button';button.dataset.country=option.country;button.disabled=session.status!=='active';
    if(session.answer){if(option.country===round.correctCountry){button.classList.add('is-correct');button.append(' ✓')}else if(option.country===session.answer.country){button.classList.add('is-incorrect');button.append(` ✕ ${text.yourChoice}`)}}
    button.addEventListener('click',()=>{state={...state,activeSession:answerHigherLower(session,option.country)};if(state.activeSession.status==='over')state=finalizeHigherLower(state);persist();render();renderStats()});
    options.append(button);
  }
  card.append(options);area.append(card);
  if(session.answer){area.append(feedback(session,item));if(session.status==='over')renderGameOver(area,session)}else if(focusRound)queueMicrotask(()=>question.focus());
}

function feedback(session,item){
  const round=session.currentRound,box=element('section',`quiz-feedback ${session.answer.correct?'':'is-incorrect'}`);box.tabIndex=-1;box.setAttribute('aria-live','polite');
  box.append(element('h2','',session.answer.correct?text.correct:text.incorrect));
  const values=element('ul','quiz-values');
  for(const option of [round.a,round.b].sort((a,b)=>b.value-a.value)){const row=element('li');row.append(element('strong','',countryName(option.country)),valueNode(option.value,item));values.append(row)}
  box.append(values);
  const source=element('p','quiz-source');source.append(`${text.source}: ${dataset.source.name}${item.sourceOrganization&&item.sourceOrganization!==dataset.source.name?` · ${item.sourceOrganization}`:''} · `);appendBidiText(source,round.year,language);box.append(source);
  const explore=element('a','btn',text.explore);explore.href=indicatorRoute(round.indicator);box.append(explore);
  if(session.answer.correct){const next=element('button','btn quiz-next',text.next);next.type='button';next.addEventListener('click',()=>{state={...state,activeSession:nextHigherLowerRound(dataset,session)};persist();render(true)});box.append(next)}
  queueMicrotask(()=>box.focus());return box;
}

function renderGameOver(area,session){
  const panel=element('section','quiz-result hol-result');panel.append(element('h2','',text.gameOver),element('p','hol-final',`${text.yourStreak}: ${session.currentRun}`),element('p','',`${text.bestStreak}: ${state.stats.bestStreak}`));
  const again=element('button','btn quiz-next',text.playAgain);again.type='button';again.addEventListener('click',()=>{state={...state,activeSession:createHigherLowerSession(dataset,newSeed())};persist();render()});
  const share=element('button','btn',text.share);share.type='button';const status=element('span','share-status');share.addEventListener('click',async()=>{const payload=`${text.shareText(session.currentRun)}\nhttps://metaphai.com${GAME_PAGES.higherOrLower[language]}`,outcome=await shareResult(payload);status.textContent=outcome==='copied'?text.copied:''});
  panel.append(again,share,status);area.append(panel);queueMicrotask(()=>panel.focus?.());
}

async function start(){
  try{
    const response=await fetch(game.dataRequirements.path);if(!response.ok)throw new Error('dataset unavailable');dataset=await response.json();if(!validateHigherLowerDataset(dataset))throw new Error('invalid dataset');
    store=readStore();state=normalizeHigherLowerState(rawGameState(store,game.id));if(!state.activeSession)state={...state,activeSession:createHigherLowerSession(dataset,newSeed())};persist();render();renderStats();
  }catch(error){console.error('Higher or Lower:',error);const errorBox=element('div','game-error'),message=element('p','',text.unavailable),back=element('a','',text.backGames);back.href=GAME_PAGES.home[language];errorBox.append(message,back);root.querySelector('[data-game-area]').replaceChildren(errorBox)}
}
if(root)start();
