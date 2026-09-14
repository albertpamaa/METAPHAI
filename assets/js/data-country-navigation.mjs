import {countryRoute} from './data-routes.mjs';

export function countryProfileRoute(language,code,validCodes){
  const normalized=String(code||'').toUpperCase();
  return validCodes?.has(normalized)?countryRoute(language,normalized):null;
}

export function navigateToCountryProfile(language,code,validCodes,target=globalThis.location){
  const route=countryProfileRoute(language,code,validCodes);
  if(!route)return false;
  target.assign(route);
  return true;
}
