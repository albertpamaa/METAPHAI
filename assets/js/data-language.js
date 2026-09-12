import {DATA_LANGUAGES,pageRoutes,pageKeyFromPath,languageFromPath} from '/assets/js/data-routes.mjs?v=20260912-7';

const switcher=document.querySelector('[data-language-switcher]');
if(switcher){
  const pageKey=switcher.dataset.pageKey||pageKeyFromPath(location.pathname),routes=pageRoutes(pageKey),active=(document.documentElement.lang||languageFromPath(location.pathname)).split('-')[0],activeConfig=DATA_LANGUAGES[active]||DATA_LANGUAGES.es;
  const currentName=switcher.querySelector('[data-current-language]'),currentCode=switcher.querySelector('[data-current-code]');
  if(currentName)currentName.textContent=activeConfig.label;
  if(currentCode)currentCode.textContent=activeConfig.shortLabel;
  if(routes)for(const link of switcher.querySelectorAll('[data-language]')){
    const language=link.dataset.language,config=DATA_LANGUAGES[language];
    link.href=routes[language];
    link.hreflang=language;
    link.lang=language;
    link.setAttribute('aria-label',active===language?`${config.label} — ${activeConfig.activeLabel}`:`${activeConfig.switchLabel} ${config.label}`);
    if(language===active)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');
  }
}
