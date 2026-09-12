import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {formatIndicatorChange,formatIndicatorValue,searchCountries} from '../assets/js/data-core.mjs';
import {DATA_LANGUAGES,DATA_PAGES,languageFromPath,pageKeyFromPath,pageRoutes} from '../assets/js/data-routes.mjs';
import {DATA_I18N,languageConfig} from '../assets/js/data-i18n.mjs';
import {indicatorPresentation} from '../assets/js/data-presentation.mjs';

const root=resolve(import.meta.dirname,'..'),json=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const registry=json('assets/data/indicators.json');
assert.deepEqual(Object.keys(DATA_LANGUAGES),['es','en']);assert.equal(Object.keys(DATA_PAGES).length,11);
assert.equal(pageKeyFromPath('/datos-globales/poblacion/'),'population');assert.equal(pageKeyFromPath('/en/global-data/population/'),'population');assert.equal(languageFromPath('/en/global-data/explorer/'),'en');assert.equal(languageFromPath('/datos-globales/explorador/'),'es');assert.deepEqual(pageRoutes('fertility'),{indicator:'fertilidad',es:'/datos-globales/fertilidad/',en:'/en/global-data/fertility/'});

for(const language of ['es','en']){
  const ui=languageConfig(language);assert.equal(ui.locale,language==='es'?'es-ES':'en-US');
  for(const item of registry.indicators){
    const localized=ui.indicators[item.slug],editorial=indicatorPresentation(item.slug,language);
    assert.ok(localized?.name&&localized.description&&localized.methodology&&localized.axisUnit&&localized.unitLabel,`${language}/${item.slug}: traducción incompleta`);
    assert.ok(editorial?.what&&editorial.interpretation&&editorial.limitations.length>=2,`${language}/${item.slug}: editorial incompleta`);
    for(const value of [0,-2.35,7.43,1234.56])for(const context of ['card','table','tooltip','axis','csv'])assert.doesNotThrow(()=>formatIndicatorValue(value,{...item,presentation:{...item.presentation,unitLabel:localized.unitLabel}},ui.locale,context));
  }
}
assert.equal(formatIndicatorValue(1234.56,{presentation:{formatType:'currency',decimals:0,unitLabel:'current international dollars (PPP)'}},'en-US','tooltip'),'1,234.56 current international dollars (PPP)');
assert.equal(formatIndicatorValue(7.43,{presentation:{formatType:'percent',decimals:1}},'en-US','card'),'7.4%');
assert.equal(formatIndicatorValue(7.43,{presentation:{formatType:'percent',decimals:1}},'es-ES','card'),'7,4 %');
assert.equal(formatIndicatorChange(-2.35,{presentation:{decimals:1,changeType:'percentage_points'}},'en-US'),'−2.4 pp');
assert.equal(formatIndicatorChange(-2.35,{presentation:{decimals:1,changeType:'percentage_points'}},'es-ES'),'−2,4 p. p.');
assert.equal(formatIndicatorValue(1234.56,{presentation:{formatType:'currency'}},'es-ES','csv'),formatIndicatorValue(1234.56,{presentation:{formatType:'currency'}},'en-US','csv'));

const countries=json('assets/data/worldbank/countries.json').countries.filter(country=>!country.is_aggregate),spain=countries.find(country=>country.id==='ESP');
assert.equal(spain.iso2,'ES');
const esName=new Intl.DisplayNames(['es-ES'],{type:'region'}).of(spain.iso2),enName=new Intl.DisplayNames(['en-US'],{type:'region'}).of(spain.iso2);
assert.equal(esName,'España');assert.equal(enName,'Spain');
assert.deepEqual(searchCountries([{...spain,name:enName}],'Spain',[],8,DATA_I18N.en.countrySearchAliases).map(country=>country.id),['ESP']);
assert.deepEqual(searchCountries([{...spain,name:enName}],'ES',[],8,DATA_I18N.en.countrySearchAliases).map(country=>country.id),['ESP']);
assert.deepEqual(searchCountries([{...spain,name:enName}],'ESP',[],8,DATA_I18N.en.countrySearchAliases).map(country=>country.id),['ESP']);
assert.deepEqual(searchCountries([{...spain,name:esName}],'Spain',[],8,languageConfig('en').countrySearchAliases).map(country=>country.id),['ESP']);
console.log('data-i18n: 11 pares, 8 indicadores, formatos ES/EN, países e ISO OK');
