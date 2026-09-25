import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DATA_LANGUAGES,INSTITUTIONAL_PAGES} from '../assets/js/data-routes.mjs';
import {dailyNotificationPayloads} from '../assets/js/games/game-push-notifications.mjs';

const root=resolve(import.meta.dirname,'..'),read=path=>readFileSync(join(root,path),'utf8');
const workflow=read('.github/workflows/send-daily-game-notification.yml');
assert.match(workflow,/workflow_dispatch:/);assert.match(workflow,/cron: "5 8 \* \* \*"/);assert.match(workflow,/vars\.METAPHAI_PUSH_ENABLED/);assert.match(workflow,/vars\.ONESIGNAL_APP_ID/);assert.match(workflow,/secrets\.ONESIGNAL_API_KEY/);assert.match(workflow,/Daily push not configured; skipping\./);assert.match(workflow,/send-daily-game-notifications\.mjs/);assert.doesNotMatch(workflow,/sk-[A-Za-z0-9]|Basic [A-Za-z0-9+/=]{20,}/);
assert.equal(existsSync(join(root,'onesignal/OneSignalSDKWorker.js')),true);assert.match(read('onesignal/OneSignalSDKWorker.js'),/OneSignalSDK\.sw\.js/);assert.equal(existsSync(join(root,'games.webmanifest')),true);
const config=read('assets/js/games/game-push-config.mjs');assert.match(config,/appId:'9cf50ea2-eac8-4bba-a61f-fe13fd23a39a'/);assert.match(config,/enabled:true/);assert.match(config,/daily_world_data_quiz/);assert.match(config,/daily_guess_country/);assert.match(config,/daily_geo_quiz/);assert.doesNotMatch(config,/daily_challenge/);assert.match(config,/serviceWorkerPath:'\/onesignal\/OneSignalSDKWorker\.js'/);assert.match(config,/serviceWorkerScope:'\/onesignal\/'/);
const payloads=dailyNotificationPayloads('test-app');assert.equal(payloads.length,3);assert.deepEqual(payloads.map(item=>item.filters[0].key),['daily_world_data_quiz','daily_guess_country','daily_geo_quiz']);assert.deepEqual(payloads.map(item=>item.url),['https://metaphai.com/juegos/quiz-datos-mundiales/','https://metaphai.com/juegos/adivina-el-pais/','https://metaphai.com/juegos/geo-quiz/']);assert.deepEqual(payloads.map(item=>item.headings.es),['🌍 Nuevo World Data Quiz','🗺️ Nuevo país del día','🌋 Nuevo Geo Quiz']);for(const payload of payloads){assert.equal(Object.keys(payload.headings).length,15);assert.equal(Object.keys(payload.contents).length,15);assert.doesNotMatch(Object.values(payload.contents).join(' '),/tomorrow|mañana/i)}
for(const file of ['world-data-quiz-ui.mjs','country-silhouette-ui.mjs','geo-quiz-ui.mjs'])assert.match(read(`assets/js/games/${file}`),/appendDailyPushControls/);assert.doesNotMatch(read('assets/js/games/higher-or-lower-ui.mjs'),/appendDailyPushControls/);
for(const route of Object.values(INSTITUTIONAL_PAGES.privacy)){const file=route.endsWith('.html')?route.slice(1):`${route.slice(1)}index.html`,html=read(file);assert.match(html,/OneSignal/)}
console.log(`game-push-static: 3 segments/URLs, workflow, no secrets, dedicated worker and ${Object.keys(DATA_LANGUAGES).length} privacy pages OK`);
