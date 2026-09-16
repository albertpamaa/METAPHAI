import { seededRandom, shuffled } from './game-daily.mjs';

export const scoreAnswer=(correct,hintUsed)=>correct?(hintUsed?1:2):0;
export const isWin=(correct,threshold=3)=>correct>=threshold;
export function hintEliminations(question){const wrong=question.options.filter(option=>option.country!==question.correctCountry).map(option=>option.country);return shuffled(wrong,seededRandom(`${question.id}:hint`)).slice(0,2)}
export function freshSession(challenge){return{challengeDate:challenge.date,challengeVersion:challenge.generatorVersion,current:0,answers:[],hintByQuestion:{},completed:false,score:0,correct:0}}
export function normalizeSession(value,challenge){const fresh=freshSession(challenge);if(!value||value.challengeDate!==challenge.date||value.challengeVersion!==challenge.generatorVersion)return fresh;const answers=Array.isArray(value.answers)?value.answers.slice(0,challenge.questions.length):[];return{...fresh,...value,answers,current:Math.min(Number(value.current)||0,challenge.questions.length),score:answers.reduce((sum,item)=>sum+scoreAnswer(Boolean(item.correct),Boolean(item.hintUsed)),0),correct:answers.filter(item=>item.correct).length,completed:answers.length===challenge.questions.length}}
export function answerQuestion(session,question,country){if(session.completed||session.answers.some(answer=>answer.questionId===question.id))return session;const hintUsed=Boolean(session.hintByQuestion[question.id]),correct=country===question.correctCountry,answer={questionId:question.id,country,correct,hintUsed,points:scoreAnswer(correct,hintUsed)};const answers=[...session.answers,answer];return{...session,answers,score:session.score+answer.points,correct:session.correct+(correct?1:0)}}
export function continueSession(session,total=5){if(session.answers.length<=session.current)return session;const current=Math.min(total,session.current+1);return{...session,current,completed:current===total}}
export function useHint(session,question){if(session.answers.some(answer=>answer.questionId===question.id)||session.hintByQuestion[question.id])return session;return{...session,hintByQuestion:{...session.hintByQuestion,[question.id]:hintEliminations(question)}}}
export function validateChallenge(challenge){
  if(!challenge||challenge.schemaVersion!==1||challenge.generatorVersion!==2||!/^\d{4}-\d{2}-\d{2}$/.test(challenge.date)||challenge.gameId!=='worldDataQuiz'||challenge.questions?.length!==5)return false;
  const ids=new Set;
  for(const question of challenge.questions){
    if(!question.id||ids.has(question.id)||!['highest','lowest','largestIncrease','largestDecrease'].includes(question.type)||question.options?.length!==4||new Set(question.options.map(option=>option.country)).size!==4||question.options.filter(option=>option.country===question.correctCountry).length!==1)return false;
    ids.add(question.id);
  }
  return true;
}
