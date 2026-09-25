import {DATA_LANGUAGES} from '../data-routes.mjs';
import {GAME_PAGES} from './game-routes.mjs';
import {GAME_PUSH_CONFIG} from './game-push-config.mjs';
import {gamePushGameName} from './game-push-i18n.mjs';

const oneSignalLanguage=language=>language==='zh-CN'?'zh-Hans':language;
const emoji={worldDataQuiz:'🌍',countrySilhouette:'🗺️',geoQuiz:'🌋'};
const spanish={
  worldDataQuiz:['🌍 Nuevo World Data Quiz','Ya está disponible el reto de hoy. ¿Superarás tu puntuación?'],
  countrySilhouette:['🗺️ Nuevo país del día','¿Serás capaz de reconocer el país de hoy?'],
  geoQuiz:['🌋 Nuevo Geo Quiz','Ya tienes un nuevo reto geográfico para hoy.']
};
const localized={
  en:name=>[`New ${name}`,`Today's ${name} challenge is now available.`],fr:name=>[`Nouveau ${name}`,`Le défi ${name} du jour est disponible.`],de:name=>[`Neues ${name}`,`Die heutige ${name}-Herausforderung ist verfügbar.`],it:name=>[`Nuovo ${name}`,`La sfida ${name} di oggi è disponibile.`],pt:name=>[`Novo ${name}`,`O desafio ${name} de hoje já está disponível.`],ru:name=>[`Новое задание ${name}`,`Сегодняшнее задание ${name} уже доступно.`],'zh-CN':name=>[`新的 ${name}`,`今天的 ${name} 挑战已上线。`],hi:name=>[`नया ${name}`,`आज की ${name} चुनौती उपलब्ध है।`],ja:name=>[`新しい${name}`,`今日の${name}チャレンジが公開されました。`],ko:name=>[`새로운 ${name}`,`오늘의 ${name} 도전이 열렸습니다.`],ca:name=>[`Nou ${name}`,`El repte ${name} d’avui ja està disponible.`],ar:name=>[`تحدي ${name} جديد`,`تحدي ${name} لليوم متاح الآن.`],id:name=>[`Tantangan ${name} baru`,`Tantangan ${name} hari ini sudah tersedia.`],bn:name=>[`নতুন ${name}`,`আজকের ${name} চ্যালেঞ্জ প্রস্তুত।`]
};

export function dailyNotificationPayloads(appId,config=GAME_PUSH_CONFIG){
  return Object.entries(config.games).map(([gameId,{tagKey}])=>{
    const headings={},contents={};
    for(const language of Object.keys(DATA_LANGUAGES)){
      const key=oneSignalLanguage(language),notification=language==='es'?spanish[gameId]:localized[language](gamePushGameName(language,gameId));
      headings[key]=language==='es'?notification[0]:`${emoji[gameId]} ${notification[0]}`;
      contents[key]=notification[1];
    }
    return{app_id:appId,target_channel:'push',name:`MetaphAI ${gameId} daily challenge`,headings,contents,url:`https://metaphai.com${GAME_PAGES[gameId].es}`,filters:[{field:'tag',key:tagKey,relation:'=',value:'true'}]};
  });
}

export async function sendDailyGameNotifications({appId,apiKey,fetchImpl=globalThis.fetch}={}){
  const results=[];
  for(const payload of dailyNotificationPayloads(appId)){
    const response=await fetchImpl('https://api.onesignal.com/notifications',{method:'POST',headers:{Authorization:`Key ${apiKey}`,'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error(`OneSignal notification failed (${response.status}): ${await response.text()}`);
    results.push(await response.json());
  }
  return results;
}
