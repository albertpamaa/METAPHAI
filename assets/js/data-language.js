import {DATA_LANGUAGES,countryRoutes,pageRoutes,pageKeyFromPath,languageFromPath} from '/assets/js/data-routes.mjs?v=20260914-2';

const switcher=document.querySelector('[data-language-switcher]');
if(switcher){
  const pageKey=switcher.dataset.pageKey||pageKeyFromPath(location.pathname),routes=pageKey?.startsWith('country:')?countryRoutes(pageKey.slice(8)):pageRoutes(pageKey),htmlLanguage=document.documentElement.lang||languageFromPath(location.pathname),active=htmlLanguage.toLowerCase()==='zh-cn'?'zh-CN':htmlLanguage.split('-')[0],activeConfig=DATA_LANGUAGES[active]||DATA_LANGUAGES.es;
  const currentName=switcher.querySelector('[data-current-language]'),currentCode=switcher.querySelector('[data-current-code]');
  if(currentName)currentName.textContent=activeConfig.label;
  if(currentCode)currentCode.textContent=activeConfig.shortLabel;
  if(routes)for(const link of switcher.querySelectorAll('[data-language]')){
    const language=link.dataset.language,config=DATA_LANGUAGES[language];
    const query=pageKey==='compare'?location.search:'';link.href=routes[language]+query;
    link.hreflang=language;
    link.lang=language;
    link.setAttribute('aria-label',active===language?`${config.label} — ${activeConfig.activeLabel}`:`${activeConfig.switchLabel} ${config.label}`);
    if(language===active)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');
  }
}
