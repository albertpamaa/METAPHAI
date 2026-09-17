import { DATA_LANGUAGES, countryRoute } from '../data-routes.mjs';
import { localizedCountries, latestObservation } from '../data-view-core.mjs';
import { GAME_PAGES } from './game-routes.mjs';
import { completeGame, gameState, readStore, setSession, writeStore } from './game-storage.mjs';
import { shareResult } from './game-share.mjs';
import { acceptedAnswers, dailyCountries, framedFeature, hintPlan, isCorrectAnswer, maskedName, normalizeDailySession, roundScore, sessionSummary, trainingCountry, utcDateKey } from './country-silhouette-core.mjs';
import { countrySilhouetteText } from './country-silhouette-i18n.mjs';

const language=document.documentElement.lang||'en',locale=DATA_LANGUAGES[language]?.locale||'en-US',text=countrySilhouetteText(language),root=document.querySelector('[data-country-silhouette]');
const element=(tag,className='',content='')=>{const node=document.createElement(tag);if(className)node.className=className;if(content!==undefined)node.textContent=content;return node};
let countries=[],countryMap=new Map,geometryMap=new Map,statistics={},mode=null,session=null,trainingLevel='all',trainingId=null,trainingRound=null,date=utcDateKey();

const save=()=>{if(mode!=='daily')return;let store=readStore();store=setSession(store,'countrySilhouette',date,session);writeStore(store)};
const displayName=id=>countryMap.get(id)?.name||id;
const flag=iso2=>/^[A-Z]{2}$/.test(iso2||'')?String.fromCodePoint(...[...iso2].map(char=>127397+char.charCodeAt(0))):'';
const scoreFor=round=>roundScore(round.hints.length,round.errors,round.status!=='given-up');

function drawSilhouette(svg,id,resolved=false){
  const original=geometryMap.get(id),feature=framedFeature(original);svg.replaceChildren();svg.setAttribute('viewBox','0 0 720 420');svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('role','img');svg.setAttribute('aria-label',resolved?`${text.resolvedSilhouette} ${displayName(id)}`:text.silhouetteLabel);
  if(!feature)return;
  const projection=globalThis.d3.geoMercator().fitExtent([[30,24],[690,396]],feature),path=globalThis.d3.geoPath(projection),shape=document.createElementNS('http://www.w3.org/2000/svg','path');shape.setAttribute('d',path(feature));shape.setAttribute('class','country-silhouette-shape');svg.append(shape);
}
function progressHeader(round){const wrap=element('div','silhouette-progress'),left=element('strong','',mode==='daily'?`${text.question} ${session.index+1} ${text.of} 5`:text.trainingTitle),right=element('strong','',`${text.score}: ${scoreFor(round)}`);wrap.append(left,right);return wrap}
function roundMarkup(id,round){
  const card=element('section','silhouette-round'),svgWrap=element('div','silhouette-stage'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('country-silhouette');drawSilhouette(svg,id);svgWrap.append(svg);
  const mask=element('div','silhouette-mask',maskedName(displayName(id),round.hints));mask.setAttribute('aria-hidden','true');
  const form=element('form','silhouette-answer'),label=element('label','',text.answerLabel),input=element('input');input.name='answer';input.autocomplete='off';input.spellcheck=false;input.required=true;input.enterKeyHint='done';input.setAttribute('aria-label',text.answerLabel);const submit=element('button','btn',text.check);submit.type='submit';label.append(input);form.append(label,submit);
  const actions=element('div','silhouette-actions'),hint=element('button','btn secondary',text.hint),giveUp=element('button','btn ghost',text.giveUp);hint.type=giveUp.type='button';hint.disabled=round.hints.length>=hintPlan(displayName(id),id).length;actions.append(hint,giveUp);
  const live=element('p','silhouette-live');live.setAttribute('aria-live','polite');
  form.addEventListener('submit',event=>{event.preventDefault();const country=countryMap.get(id);if(isCorrectAnswer(input.value,acceptedAnswers(country,displayName(id),language))){round.status='correct';round.score=scoreFor(round);finishRound(id,round)}else{round.errors++;input.value='';live.textContent=text.incorrect;save();rightScore(card,round);input.focus()}});
  hint.addEventListener('click',()=>{const plan=hintPlan(displayName(id),id);if(round.hints.length<plan.length)round.hints.push(plan[round.hints.length]);save();renderRound(id,round)});
  giveUp.addEventListener('click',()=>{round.status='given-up';round.score=0;finishRound(id,round)});
  card.append(progressHeader(round),svgWrap,mask,form,actions,live);queueMicrotask(()=>input.focus());return card;
}
function rightScore(card,round){const values=card.querySelectorAll('.silhouette-progress strong');values[1].textContent=`${text.score}: ${scoreFor(round)}`}
function currentArea(){return root.querySelector('[data-game-area]')}
function renderRound(id,round){currentArea().replaceChildren(roundMarkup(id,round))}

const formatValue=(slug,value)=>slug==='poblacion'?new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(value):slug==='esperanza-de-vida'?new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(value):new Intl.NumberFormat(locale,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
function statsList(id){const list=element('dl','silhouette-facts');for(const [slug,label] of [['poblacion',text.population],['esperanza-de-vida',text.lifeExpectancy],['pib-per-capita',text.gdpPerCapita]]){const observation=latestObservation(statistics[slug],id);if(!observation)continue;const row=element('div'),term=element('dt','',label),value=element('dd','',`${formatValue(slug,observation.value)} · ${observation.year}`);row.append(term,value);list.append(row)}return list}
function finishRound(id,round){
  save();const area=currentArea(),panel=element('section',`silhouette-result ${round.status==='correct'?'is-correct':'is-given-up'}`),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('country-silhouette','is-resolved');drawSilhouette(svg,id,true);panel.append(svg);
  const country=countryMap.get(id),heading=element('h2','',round.status==='correct'?text.correct:text.answerWas),identity=element('p','silhouette-country',`${flag(country.iso2)} ${displayName(id)}`),points=element('p','silhouette-points',`+${round.score} ${text.points}`);panel.append(heading,identity,points,statsList(id));
  const dataLink=element('a','btn secondary',`${text.viewData} ${displayName(id)} →`);dataLink.href=countryRoute(language,id);panel.append(dataLink);
  const next=element('button','btn',mode==='daily'&&session.index===4?text.completed:mode==='training'?text.another:text.next);next.type='button';next.addEventListener('click',advance);panel.append(next);area.replaceChildren(panel);panel.focus?.();
}
function advance(){
  if(mode==='training'){const previous=trainingId;trainingId=trainingCountry(trainingLevel,previous);trainingRound={country:trainingId,hints:[],errors:0,status:'pending',score:null};renderRound(trainingId,trainingRound);return}
  if(session.index<4){session.index++;save();renderRound(session.countries[session.index],session.rounds[session.index]);return}
  session.completed=true;const summary=sessionSummary(session);let store=setSession(readStore(),'countrySilhouette',date,session);store=completeGame(store,'countrySilhouette',date,summary,1);writeStore(store);renderDailyResult();
}
function renderDailyResult(){
  const summary=sessionSummary(session),stats=gameState(readStore(),'countrySilhouette').stats,box=element('section','silhouette-summary'),title=element('h2','',text.completed);box.append(title,element('p','silhouette-final',`${summary.correct} / 5 ${text.correctCountries}`),element('p','',`${summary.score} / 500 · ${text.hintsUsed}: ${summary.hints}`),element('p','',`${text.dailyStreak}: ${stats.currentStreak}`));
  const share=element('button','btn',text.share),status=element('span','share-status'),training=element('button','btn secondary',text.training);share.type=training.type='button';share.addEventListener('click',async()=>{const rows=session.rounds.map(round=>round.status==='given-up'?'⬛':round.score===100?'🟩':'🟨').join(' '),payload=`MetaphAI · ${text.title}\n${date}\n${rows}\n${summary.score}/500\nhttps://metaphai.com${GAME_PAGES.countrySilhouette[language]}`,result=await shareResult(payload);status.textContent=result==='copied'?text.copied:''});training.addEventListener('click',renderTrainingStart);box.append(share,status,training);currentArea().replaceChildren(box)
}
function startDaily(){mode='daily';date=utcDateKey();const ids=dailyCountries(date),stored=gameState(readStore(),'countrySilhouette').sessions[date];session=normalizeDailySession(stored,date,ids);if(session.completed)return renderDailyResult();const round=session.rounds[session.index],id=session.countries[session.index];round.status==='pending'?renderRound(id,round):finishRound(id,round)}
function renderTrainingStart(){mode='training';const box=element('section','silhouette-start'),title=element('h2','',text.trainingTitle),label=element('label','',text.difficulty),select=element('select');for(const [value,key] of [['all','all'],['easy','easy'],['normal','normal'],['hard','hard']]){const option=element('option','',text[key]);option.value=value;select.append(option)}select.value=trainingLevel;label.append(select);const play=element('button','btn',text.training);play.type='button';play.addEventListener('click',()=>{trainingLevel=select.value;trainingId=trainingCountry(trainingLevel,trainingId);trainingRound={country:trainingId,hints:[],errors:0,status:'pending',score:null};renderRound(trainingId,trainingRound)});box.append(title,label,play);currentArea().replaceChildren(box)}
function renderStart(){const stats=gameState(readStore(),'countrySilhouette').stats,box=element('section','silhouette-start'),daily=element('button','btn silhouette-primary',text.dailyPlay),meta=element('p','',text.dailyMeta),training=element('button','btn secondary',text.training),streak=element('p','silhouette-streak',`${text.streak}: ${stats.currentStreak}`);daily.type=training.type='button';daily.addEventListener('click',startDaily);training.addEventListener('click',renderTrainingStart);box.append(daily,meta,training,streak);currentArea().replaceChildren(box)}

async function init(){try{
  const [topology,countryData,population,life,gdp]=await Promise.all(['/assets/maps/world-50m.topo.json','/assets/data/worldbank/countries.json','/assets/data/worldbank/poblacion.json','/assets/data/worldbank/esperanza-de-vida.json','/assets/data/worldbank/pib-per-capita.json'].map(url=>fetch(url).then(response=>{if(!response.ok)throw new Error(url);return response.json()})));
  countries=localizedCountries(countryData.countries,locale);countryMap=new Map(countries.map(country=>[country.id,country]));const collection=globalThis.topojson.feature(topology,topology.objects.countries);geometryMap=new Map(collection.features.map(feature=>[feature.properties.iso3,feature]));statistics={poblacion:population,'esperanza-de-vida':life,'pib-per-capita':gdp};renderStart();
}catch(error){console.error('Country silhouette:',error);currentArea().replaceChildren(element('p','game-error',text.loadError))}}
init();
