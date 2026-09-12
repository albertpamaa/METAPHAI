import {DATA_LANGUAGES,pageRoutes,pageKeyFromPath,languageFromPath} from '/assets/js/data-routes.mjs?v=20260912-6';

const switcher=document.querySelector('[data-language-switcher]');
if(switcher){
  const pageKey=switcher.dataset.pageKey||pageKeyFromPath(location.pathname),routes=pageRoutes(pageKey),active=document.documentElement.lang.startsWith('en')?'en':languageFromPath(location.pathname);
  if(routes)for(const link of switcher.querySelectorAll('[data-language]')){
    const language=link.dataset.language,config=DATA_LANGUAGES[language];
    link.href=routes[language];
    link.hreflang=language;
    link.lang=language;
    link.setAttribute('aria-label',active===language?`${config.label} — ${active==='es'?'idioma activo':'active language'}`:`${active==='es'?'Cambiar a':'Switch to'} ${config.label}`);
    if(language===active)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');
  }
}
