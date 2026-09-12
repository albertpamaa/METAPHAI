export const DATA_LANGUAGES={
  es:{locale:'es-ES',label:'Español',shortLabel:'ES',activeLabel:'idioma activo',switchLabel:'Cambiar a'},
  en:{locale:'en-US',label:'English',shortLabel:'EN',activeLabel:'active language',switchLabel:'Switch to'},
  fr:{locale:'fr-FR',label:'Français',shortLabel:'FR',activeLabel:'langue active',switchLabel:'Passer en'},
  de:{locale:'de-DE',label:'Deutsch',shortLabel:'DE',activeLabel:'aktive Sprache',switchLabel:'Wechseln zu'},
  it:{locale:'it-IT',label:'Italiano',shortLabel:'IT',activeLabel:'lingua attiva',switchLabel:'Passa a'},
  pt:{locale:'pt-PT',label:'Português',shortLabel:'PT',activeLabel:'idioma ativo',switchLabel:'Mudar para'}
};

export const DATA_PAGES={
  home:{indicator:null,es:'/datos-globales/',en:'/en/global-data/',fr:'/fr/donnees-mondiales/',de:'/de/weltdaten/',it:'/it/dati-globali/',pt:'/pt/dados-globais/'},
  explorer:{indicator:null,es:'/datos-globales/explorador/',en:'/en/global-data/explorer/',fr:'/fr/donnees-mondiales/explorateur/',de:'/de/weltdaten/explorer/',it:'/it/dati-globali/esplora/',pt:'/pt/dados-globais/explorador/'},
  sources:{indicator:null,es:'/datos-globales/fuentes/',en:'/en/global-data/sources/',fr:'/fr/donnees-mondiales/sources/',de:'/de/weltdaten/quellen/',it:'/it/dati-globali/fonti/',pt:'/pt/dados-globais/fontes/'},
  population:{indicator:'poblacion',es:'/datos-globales/poblacion/',en:'/en/global-data/population/',fr:'/fr/donnees-mondiales/population/',de:'/de/weltdaten/bevoelkerung/',it:'/it/dati-globali/popolazione/',pt:'/pt/dados-globais/populacao/'},
  lifeExpectancy:{indicator:'esperanza-de-vida',es:'/datos-globales/esperanza-de-vida/',en:'/en/global-data/life-expectancy/',fr:'/fr/donnees-mondiales/esperance-de-vie/',de:'/de/weltdaten/lebenserwartung/',it:'/it/dati-globali/speranza-di-vita/',pt:'/pt/dados-globais/esperanca-de-vida/'},
  fertility:{indicator:'fertilidad',es:'/datos-globales/fertilidad/',en:'/en/global-data/fertility/',fr:'/fr/donnees-mondiales/fecondite/',de:'/de/weltdaten/fruchtbarkeit/',it:'/it/dati-globali/fertilita/',pt:'/pt/dados-globais/fertilidade/'},
  gdpPerCapita:{indicator:'pib-per-capita',es:'/datos-globales/pib-per-capita/',en:'/en/global-data/gdp-per-capita/',fr:'/fr/donnees-mondiales/pib-par-habitant/',de:'/de/weltdaten/bip-pro-kopf/',it:'/it/dati-globali/pil-pro-capite/',pt:'/pt/dados-globais/pib-per-capita/'},
  gdpGrowth:{indicator:'crecimiento-pib',es:'/datos-globales/crecimiento-pib/',en:'/en/global-data/gdp-growth/',fr:'/fr/donnees-mondiales/croissance-du-pib/',de:'/de/weltdaten/bip-wachstum/',it:'/it/dati-globali/crescita-pil/',pt:'/pt/dados-globais/crescimento-pib/'},
  unemployment:{indicator:'desempleo',es:'/datos-globales/desempleo/',en:'/en/global-data/unemployment/',fr:'/fr/donnees-mondiales/chomage/',de:'/de/weltdaten/arbeitslosigkeit/',it:'/it/dati-globali/disoccupazione/',pt:'/pt/dados-globais/desemprego/'},
  internetUse:{indicator:'uso-de-internet',es:'/datos-globales/uso-de-internet/',en:'/en/global-data/internet-use/',fr:'/fr/donnees-mondiales/utilisation-internet/',de:'/de/weltdaten/internetnutzung/',it:'/it/dati-globali/uso-internet/',pt:'/pt/dados-globais/uso-da-internet/'},
  renewableEnergy:{indicator:'energia-renovable',es:'/datos-globales/energia-renovable/',en:'/en/global-data/renewable-energy/',fr:'/fr/donnees-mondiales/energie-renouvelable/',de:'/de/weltdaten/erneuerbare-energie/',it:'/it/dati-globali/energia-rinnovabile/',pt:'/pt/dados-globais/energia-renovavel/'}
};

export function pageRoutes(pageKey){return DATA_PAGES[pageKey]||null}
export function pageKeyFromPath(pathname){return Object.entries(DATA_PAGES).find(([,page])=>Object.keys(DATA_LANGUAGES).some(language=>page[language]===pathname))?.[0]||null}
export function languageFromPath(pathname){return Object.keys(DATA_LANGUAGES).find(language=>language!=='es'&&pathname.startsWith(`/${language}/`))||'es'}
