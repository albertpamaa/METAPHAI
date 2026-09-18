import { DATA_LANGUAGES } from './data-routes.mjs';

export const GEOGRAPHY_ROUTES={
  home:{es:'/geografia/',en:'/en/geography/',fr:'/fr/geographie/',de:'/de/geografie/',it:'/it/geografia/',pt:'/pt/geografia/',ru:'/ru/geografiya/','zh-CN':'/zh-cn/dili/',hi:'/hi/bhugol/',ja:'/ja/chiri/',ko:'/ko/jiri/',ca:'/ca/geografia/',ar:'/ar/jughrafia/',id:'/id/geografi/',bn:'/bn/bhugol/'},
  volcanoes:{es:'/geografia/volcanes/',en:'/en/geography/volcanoes/',fr:'/fr/geographie/volcans/',de:'/de/geografie/vulkane/',it:'/it/geografia/vulcani/',pt:'/pt/geografia/vulcoes/',ru:'/ru/geografiya/vulkany/','zh-CN':'/zh-cn/dili/huoshan/',hi:'/hi/bhugol/jwalamukhi/',ja:'/ja/chiri/kazan/',ko:'/ko/jiri/hwasan/',ca:'/ca/geografia/volcans/',ar:'/ar/jughrafia/barakin/',id:'/id/geografi/gunung-api/',bn:'/bn/bhugol/agneyogiri/'},
  mountains:{es:'/geografia/montanas/',en:'/en/geography/mountains/',fr:'/fr/geographie/montagnes/',de:'/de/geografie/berge/',it:'/it/geografia/montagne/',pt:'/pt/geografia/montanhas/',ru:'/ru/geografiya/gory/','zh-CN':'/zh-cn/dili/shanmai/',hi:'/hi/bhugol/parvat/',ja:'/ja/chiri/sangaku/',ko:'/ko/jiri/san/',ca:'/ca/geografia/muntanyes/',ar:'/ar/jughrafia/jibal/',id:'/id/geografi/gunung/',bn:'/bn/bhugol/porbot/'},
  rivers:{es:'/geografia/rios/',en:'/en/geography/rivers/',fr:'/fr/geographie/rivieres/',de:'/de/geografie/fluesse/',it:'/it/geografia/fiumi/',pt:'/pt/geografia/rios/',ru:'/ru/geografiya/reki/','zh-CN':'/zh-cn/dili/heliu/',hi:'/hi/bhugol/nadiyan/',ja:'/ja/chiri/kasen/',ko:'/ko/jiri/gang/',ca:'/ca/geografia/rius/',ar:'/ar/jughrafia/anhar/',id:'/id/geografi/sungai/',bn:'/bn/bhugol/nodi/'},
  deserts:{es:'/geografia/desiertos/',en:'/en/geography/deserts/',fr:'/fr/geographie/deserts/',de:'/de/geografie/wuesten/',it:'/it/geografia/deserti/',pt:'/pt/geografia/desertos/',ru:'/ru/geografiya/pustyni/','zh-CN':'/zh-cn/dili/shamo/',hi:'/hi/bhugol/registan/',ja:'/ja/chiri/sabaku/',ko:'/ko/jiri/samak/',ca:'/ca/geografia/deserts/',ar:'/ar/jughrafia/sahari/',id:'/id/geografi/gurun/',bn:'/bn/bhugol/morubhumi/'},
  sources:{es:'/geografia/fuentes/',en:'/en/geography/sources/',fr:'/fr/geographie/sources/',de:'/de/geografie/quellen/',it:'/it/geografia/fonti/',pt:'/pt/geografia/fontes/',ru:'/ru/geografiya/istochniki/','zh-CN':'/zh-cn/dili/laiyuan/',hi:'/hi/bhugol/srot/',ja:'/ja/chiri/shiryo/',ko:'/ko/jiri/chulcheo/',ca:'/ca/geografia/fonts/',ar:'/ar/jughrafia/masadir/',id:'/id/geografi/sumber/',bn:'/bn/bhugol/utso/'}
};

export const GEOGRAPHY_KEYS=Object.keys(GEOGRAPHY_ROUTES);
export const geographyItemRoute=(language,type,id)=>`${GEOGRAPHY_ROUTES[type][language]}${String(id).toLowerCase()}/`;
export const geographyItemRoutes=(type,id)=>Object.fromEntries(Object.keys(DATA_LANGUAGES).map(language=>[language,geographyItemRoute(language,type,id)]));
