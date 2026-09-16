import { DATA_LANGUAGES } from '../data-routes.mjs';

export const GAME_PAGES={
  home:{es:'/juegos/',en:'/en/games/',fr:'/fr/jeux/',de:'/de/spiele/',it:'/it/giochi/',pt:'/pt/jogos/',ru:'/ru/games/','zh-CN':'/zh-cn/games/',hi:'/hi/games/',ja:'/ja/games/',ko:'/ko/games/',ca:'/ca/jocs/',ar:'/ar/games/',id:'/id/games/',bn:'/bn/games/'},
  worldDataQuiz:{es:'/juegos/quiz-datos-mundiales/',en:'/en/games/world-data-quiz/',fr:'/fr/jeux/quiz-donnees-mondiales/',de:'/de/spiele/weltdaten-quiz/',it:'/it/giochi/quiz-dati-globali/',pt:'/pt/jogos/quiz-dados-globais/',ru:'/ru/games/world-data-quiz/','zh-CN':'/zh-cn/games/world-data-quiz/',hi:'/hi/games/world-data-quiz/',ja:'/ja/games/world-data-quiz/',ko:'/ko/games/world-data-quiz/',ca:'/ca/jocs/quiz-dades-globals/',ar:'/ar/games/world-data-quiz/',id:'/id/games/world-data-quiz/',bn:'/bn/games/world-data-quiz/'},
  higherOrLower:{es:'/juegos/mas-o-menos/',en:'/en/games/higher-or-lower/',fr:'/fr/jeux/plus-ou-moins/',de:'/de/spiele/hoeher-oder-niedriger/',it:'/it/giochi/piu-o-meno/',pt:'/pt/jogos/mais-ou-menos/',ru:'/ru/games/higher-or-lower/','zh-CN':'/zh-cn/games/higher-or-lower/',hi:'/hi/games/higher-or-lower/',ja:'/ja/games/higher-or-lower/',ko:'/ko/games/higher-or-lower/',ca:'/ca/jocs/mes-o-menys/',ar:'/ar/games/higher-or-lower/',id:'/id/games/higher-or-lower/',bn:'/bn/games/higher-or-lower/'}
};

export const gamePageRoutes=key=>GAME_PAGES[key]||null;
export const gamePageKeyFromPath=pathname=>Object.entries(GAME_PAGES).find(([,page])=>Object.keys(DATA_LANGUAGES).some(language=>page[language]===pathname))?.[0]||null;
