import { GAME_PAGES } from './game-routes.mjs';

export const GAME_REGISTRY={
  schemaVersion:1,
  games:[{
    id:'worldDataQuiz',status:'active',routeKey:'worldDataQuiz',routes:GAME_PAGES.worldDataQuiz,
    icon:'quiz',cardCopy:{title:'gameTitle',meta:'cardMeta',description:'tagline',cta:'play'},
    daily:true,statsNamespace:'worldDataQuiz',shareType:'spoiler-free',module:'world-data-quiz-ui.mjs',
    dataRequirements:{type:'wdi',indicators:'central-registry',countries:'central-registry'},
    questionsPerGame:5,maxScore:10,winThreshold:3,generatorVersion:1
  },{
    id:'higherOrLower',status:'active',routeKey:'higherOrLower',routes:GAME_PAGES.higherOrLower,
    icon:'compare',cardCopy:{title:'title',meta:'cardMeta',description:'tagline',cta:'play'},copyNamespace:'higherOrLower',
    daily:false,statsNamespace:'higherOrLower',shareType:'spoiler-free',module:'higher-or-lower-ui.mjs',
    dataRequirements:{type:'compact-wdi',path:'/assets/data/games/higher-or-lower.json',indicators:'central-registry',countries:'central-registry'},generatorVersion:1
  }]
};

export const activeGames=()=>GAME_REGISTRY.games.filter(game=>game.status==='active');
export const gameById=id=>GAME_REGISTRY.games.find(game=>game.id===id)||null;
