import {sendDailyGameNotifications} from '../assets/js/games/game-push-notifications.mjs';

const appId=process.env.ONESIGNAL_APP_ID,apiKey=process.env.ONESIGNAL_API_KEY;
if(!appId||!apiKey)throw new Error('OneSignal credentials are required');
const results=await sendDailyGameNotifications({appId,apiKey});
console.log(`Sent ${results.length} game notifications.`);
