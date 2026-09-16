export const resultSquares=answers=>answers.map(answer=>answer.correct?(answer.hintUsed?'🟨':'🟩'):'⬛').join('');
export function shareText({title,date,score,correct,answers,streak,url,labels}){return[`${title} 🌍`,date,`${score}/10 · ${correct}/5`,resultSquares(answers),streak?`🔥 ${streak} ${labels.streak}`:'',url].filter(Boolean).join('\n');}
export async function shareResult(payload,navigatorObject=globalThis.navigator){if(navigatorObject?.share){try{await navigatorObject.share({text:payload});return'shared'}catch(error){if(error?.name==='AbortError')return'aborted'}}if(navigatorObject?.clipboard?.writeText){await navigatorObject.clipboard.writeText(payload);return'copied'}return'unavailable'}

