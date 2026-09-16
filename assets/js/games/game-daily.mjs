export function localDateKey(date=new Date()){
  const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');
  return`${year}-${month}-${day}`;
}
export const dailySeed=(gameId,date,version=1)=>`${gameId}:v${version}:${date}`;
export function seedNumber(value){let hash=2166136261;for(const character of String(value)){hash^=character.codePointAt(0);hash=Math.imul(hash,16777619)}return hash>>>0}
export function seededRandom(seed){let state=seedNumber(seed)||0x6d2b79f5;return()=>{state+=0x6d2b79f5;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296}}
export function shuffled(values,random){const result=[...values];for(let index=result.length-1;index>0;index--){const target=Math.floor(random()*(index+1));[result[index],result[target]]=[result[target],result[index]]}return result}
export const dailyChallengeUrl=(gameId,date)=>`/assets/data/games/${gameId.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}/${date}.json`;

