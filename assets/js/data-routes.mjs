export const DATA_LANGUAGES={
  es:{locale:'es-ES',label:'Español',shortLabel:'ES'},
  en:{locale:'en-US',label:'English',shortLabel:'EN'}
};

export const DATA_PAGES={
  home:{indicator:null,es:'/datos-globales/',en:'/en/global-data/'},
  explorer:{indicator:null,es:'/datos-globales/explorador/',en:'/en/global-data/explorer/'},
  sources:{indicator:null,es:'/datos-globales/fuentes/',en:'/en/global-data/sources/'},
  population:{indicator:'poblacion',es:'/datos-globales/poblacion/',en:'/en/global-data/population/'},
  lifeExpectancy:{indicator:'esperanza-de-vida',es:'/datos-globales/esperanza-de-vida/',en:'/en/global-data/life-expectancy/'},
  fertility:{indicator:'fertilidad',es:'/datos-globales/fertilidad/',en:'/en/global-data/fertility/'},
  gdpPerCapita:{indicator:'pib-per-capita',es:'/datos-globales/pib-per-capita/',en:'/en/global-data/gdp-per-capita/'},
  gdpGrowth:{indicator:'crecimiento-pib',es:'/datos-globales/crecimiento-pib/',en:'/en/global-data/gdp-growth/'},
  unemployment:{indicator:'desempleo',es:'/datos-globales/desempleo/',en:'/en/global-data/unemployment/'},
  internetUse:{indicator:'uso-de-internet',es:'/datos-globales/uso-de-internet/',en:'/en/global-data/internet-use/'},
  renewableEnergy:{indicator:'energia-renovable',es:'/datos-globales/energia-renovable/',en:'/en/global-data/renewable-energy/'}
};

export function pageRoutes(pageKey){return DATA_PAGES[pageKey]||null}
export function pageKeyFromPath(pathname){return Object.entries(DATA_PAGES).find(([,page])=>page.es===pathname||page.en===pathname)?.[0]||null}
export function languageFromPath(pathname){return pathname.startsWith('/en/global-data/')?'en':'es'}
