import { seededRandom } from './game-daily.mjs';

export const HOL_STATS=()=>({gamesPlayed:0,bestStreak:0,totalStreak:0,totalRounds:0,correctAnswers:0});
export const difficultyForRun=run=>run<5?'easy':run<12?'medium':'hard';
export const derivedHigherLowerStats=stats=>({...stats,averageStreak:stats.gamesPlayed?stats.totalStreak/stats.gamesPlayed:0,accuracy:stats.totalRounds?stats.correctAnswers/stats.totalRounds*100:0});
export function normalizeHigherLowerState(value={}){const stats={...HOL_STATS(),...(value.stats||{})},candidate=value.activeSession,activeSession=candidate&&typeof candidate.seed==='string'&&candidate.currentRound&&Number.isFinite(candidate.currentRun)&&['active','answered','over'].includes(candidate.status)?candidate:null;return{...value,stats,activeSession}}
export const newSeed=(cryptoObject=globalThis.crypto)=>{const values=new Uint32Array(2);if(cryptoObject?.getRandomValues)cryptoObject.getRandomValues(values);else{values[0]=Date.now()>>>0;values[1]=(Date.now()/4294967296)>>>0}return`${values[0].toString(36)}${values[1].toString(36)}`};
export function validateHigherLowerDataset(data){if(!data||data.schemaVersion!==1||data.gameId!=='higherOrLower'||!Array.isArray(data.indicators)||!data.indicators.length||!data.countries)return false;return data.indicators.every(item=>item.slug&&Number.isInteger(item.year)&&item.presentation&&item.values?.length>=20&&item.values.every(row=>Array.isArray(row)&&row.length===2&&data.countries[row[0]]&&Number.isFinite(row[1]))&&['easy','medium','hard'].every(level=>item.pairs?.[level]?.length>=20&&item.pairs[level].every(pair=>pair.length===2&&pair[0]>=0&&pair[1]<item.values.length&&pair[0]<pair[1])))}
const pairKey=(indicator,a,b)=>`${indicator}:${[a,b].sort().join(':')}`;

export function selectRound(data,session){
  const random=seededRandom(`${session.seed}:${session.round}`),difficulty=difficultyForRun(session.currentRun),history=new Set(session.history||[]),recentIndicators=session.recentIndicators||[],recentCategories=session.recentCategories||[],recentCountries=session.recentCountries||[];
  const varied=data.indicators.filter(item=>item.pairs[difficulty].length&&item.slug!==recentIndicators.at(-1)&&item.category!==recentCategories.at(-1));
  const indicatorPool=varied.length?varied:data.indicators.filter(item=>item.pairs[difficulty].length&&item.slug!==recentIndicators.at(-1));
  const fallback=data.indicators.filter(item=>item.pairs[difficulty].length),pool=indicatorPool.length?indicatorPool:fallback;
  for(let attempt=0;attempt<800;attempt++){
    const item=pool[Math.floor(random()*pool.length)],values=item.values,pair=item.pairs[difficulty][Math.floor(random()*item.pairs[difficulty].length)],left=values[pair[0]],right=values[pair[1]],key=pairKey(item.slug,left[0],right[0]);
    if(history.has(key)||recentCountries.slice(-4).filter(code=>code===left[0]||code===right[0]).length>1)continue;
    const higher=random()<.5,swapped=random()<.5,a=swapped?right:left,b=swapped?left:right;
    return{indicator:item.slug,category:item.category,year:item.year,direction:higher?'higher':'lower',a:{country:a[0],value:a[1]},b:{country:b[0],value:b[1]},correctCountry:higher?(a[1]>b[1]?a[0]:b[0]):(a[1]<b[1]?a[0]:b[0]),difficulty,key};
  }
  throw new Error('No valid Higher or Lower round');
}

export function createHigherLowerSession(data,seed){const session={seed,round:0,currentRun:0,status:'active',history:[],recentIndicators:[],recentCategories:[],recentCountries:[],currentRound:null,counted:false};session.currentRound=selectRound(data,session);return session}
export function answerHigherLower(session,country){if(session.status!=='active')return session;const correct=country===session.currentRound.correctCountry,currentRun=session.currentRun+(correct?1:0);return{...session,currentRun,status:correct?'answered':'over',answer:{country,correct},counted:false}}
export function nextHigherLowerRound(data,session){if(session.status!=='answered'||!session.answer?.correct)return session;const round=session.currentRound,next={...session,round:session.round+1,status:'active',answer:null,history:[...(session.history||[]),round.key],recentIndicators:[...(session.recentIndicators||[]),round.indicator].slice(-3),recentCategories:[...(session.recentCategories||[]),round.category].slice(-3),recentCountries:[...(session.recentCountries||[]),round.a.country,round.b.country].slice(-8)};next.currentRound=selectRound(data,next);return next}
export function finalizeHigherLower(state){const session=state.activeSession;if(!session||session.status!=='over'||session.counted)return state;const stats=state.stats,streak=session.currentRun,nextStats={...stats,gamesPlayed:stats.gamesPlayed+1,bestStreak:Math.max(stats.bestStreak,streak),totalStreak:stats.totalStreak+streak,totalRounds:stats.totalRounds+streak+1,correctAnswers:stats.correctAnswers+streak};return{...state,stats:nextStats,activeSession:{...session,counted:true}}}
