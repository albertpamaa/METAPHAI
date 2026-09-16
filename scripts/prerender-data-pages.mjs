import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as CORE from '../assets/js/data-core.mjs';
import { languageConfig } from '../assets/js/data-i18n.mjs';
import { indicatorPresentation } from '../assets/js/data-presentation.mjs';
import { DATA_LANGUAGES, DATA_PAGES, INSTITUTIONAL_PAGES, countryRoute, countryRoutes } from '../assets/js/data-routes.mjs';
import { dataViews, comparisonSentence } from '../assets/js/data-views-i18n.mjs';
import * as VIEWS from '../assets/js/data-view-core.mjs';
import { mapText } from '../assets/js/data-map-i18n.mjs';
import * as CHANGE from '../assets/js/data-change-core.mjs';
import { changeText } from '../assets/js/data-change-i18n.mjs';
import { GAME_PAGES } from '../assets/js/games/game-routes.mjs';
import { gameText } from '../assets/js/games/games-i18n.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const START = '<!-- DATA_PRERENDER:START -->';
const END = '<!-- DATA_PRERENDER:END -->';
const ASSET_VERSION = '20260914-10';
const LOGO_VERSION = '20260916-1';
const NAV_START = '<!-- DATA_SECTION_NAV:START -->';
const NAV_END = '<!-- DATA_SECTION_NAV:END -->';
const LANDING_START = '<!-- DATA_DISCOVERY:START -->';
const LANDING_END = '<!-- DATA_DISCOVERY:END -->';
const LANDING_INDICATORS_START = '<!-- DATA_LANDING_INDICATORS:START -->';
const LANDING_INDICATORS_END = '<!-- DATA_LANDING_INDICATORS:END -->';
const SOURCES_START = '<!-- DATA_INDICATOR_SOURCES:START -->';
const SOURCES_END = '<!-- DATA_INDICATOR_SOURCES:END -->';
const SITEMAP_START = '<!-- DATA_COUNTRY_SITEMAP:START -->';
const SITEMAP_END = '<!-- DATA_COUNTRY_SITEMAP:END -->';
const ORIGINAL_INDICATORS=new Set(['poblacion','esperanza-de-vida','fertilidad','pib-per-capita','crecimiento-pib','desempleo','uso-de-internet','energia-renovable']);
const FOOTER_LABELS={es:['Fuentes y metodología','Privacidad','Contacto','Sobre nosotros'],en:['Sources and methodology','Privacy','Contact','About us'],fr:['Sources et méthodologie','Confidentialité','Contact','À propos'],de:['Quellen und Methodik','Datenschutz','Kontakt','Über uns'],it:['Fonti e metodologia','Privacy','Contatti','Chi siamo'],pt:['Fontes e metodologia','Privacidade','Contacto','Sobre nós'],ru:['Источники и методология','Конфиденциальность','Контакты','О проекте'],'zh-CN':['来源与方法','隐私','联系','关于我们'],hi:['स्रोत और कार्यप्रणाली','गोपनीयता','संपर्क','हमारे बारे में'],ja:['情報源と方法','プライバシー','お問い合わせ','私たちについて'],ko:['출처 및 방법론','개인정보 보호','문의','소개'],ca:['Fonts i metodologia','Privacitat','Contacte','Sobre nosaltres'],ar:['المصادر والمنهجية','الخصوصية','التواصل','من نحن'],id:['Sumber dan metodologi','Privasi','Kontak','Tentang kami'],bn:['উৎস ও পদ্ধতি','গোপনীয়তা','যোগাযোগ','আমাদের সম্পর্কে']};
const DATA_LABELS={es:'Datos globales',en:'Global data',fr:'Données mondiales',de:'Weltdaten',it:'Dati globali',pt:'Dados globais',ru:'Мировые данные','zh-CN':'全球数据',hi:'वैश्विक डेटा',ja:'世界データ',ko:'세계 데이터',ca:'Dades globals',ar:'البيانات العالمية',id:'Data global',bn:'বৈশ্বিক তথ্য'};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

const routeFile = route => route === '/'
  ? join(ROOT, 'index.html')
  : route.endsWith('/')
    ? join(ROOT, ...route.split('/').filter(Boolean), 'index.html')
    : join(ROOT, ...route.split('/').filter(Boolean));

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

function localizeCountries(countries, locale) {
  let displayNames;
  try { displayNames = new Intl.DisplayNames([locale], { type: 'region' }); } catch {}
  return countries.map(country => {
    const localized = !country.is_aggregate && /^[A-Z]{2}$/.test(country.iso2 || '')
      ? displayNames?.of(country.iso2)
      : null;
    return { ...country, name: localized && localized !== country.iso2 ? localized : country.name };
  });
}

function displayIndicator(item, i18n) {
  const localized = i18n.indicators[item.slug] || item;
  return {
    ...item,
    name: localized.name || item.name,
    description: localized.description || item.description,
    methodology: localized.methodology || item.methodology,
    presentation: {
      ...item.presentation,
      unitLabel: localized.unitLabel || item.presentation?.unitLabel
    }
  };
}

function categoryGroups(registry, language) {
  const labels=languageConfig(language).categories||{};
  return registry.categories.map(category=>({
    ...category,
    label:labels[category.id]||category.id,
    indicators:registry.indicators.filter(item=>item.category===category.id)
  })).filter(category=>category.indicators.length);
}

function groupedOptions(registry, language, filter=()=>true) {
  return categoryGroups(registry,language).map(category=>`<optgroup label="${escapeHtml(category.label)}">${category.indicators.filter(filter).map(item=>`<option value="${item.slug}">${escapeHtml(displayIndicator(item,languageConfig(language)).name)}</option>`).join('')}</optgroup>`).join('');
}

function categoryRows(registry,language,rowFor,colspan){
  return categoryGroups(registry,language).map(category=>`<tr class="indicator-category-row"><th colspan="${colspan}">${escapeHtml(category.label)}</th></tr>${category.indicators.map(rowFor).join('')}`).join('');
}

function snapshotForIndicator({ item, data, countries, language }) {
  const i18n = languageConfig(language);
  const locale = i18n.locale;
  const localizedItem = displayIndicator(item, i18n);
  const presentation = indicatorPresentation(item.slug, language);
  const localizedCountries = localizeCountries(countries, locale);
  const validCodes = new Set(localizedCountries.filter(country => !country.is_aggregate).map(country => country.id));
  const names = new Map(localizedCountries.map(country => [country.id, country.name]));
  const rows = data.observations.filter(row => validCodes.has(row.country));
  const year = CORE.commonYear(rows);
  const ranked = CORE.assignRankingPositions(CORE.ranking(rows, year, item.ranking));
  const ascending = [...ranked].sort((a, b) => a.value - b.value);
  const spain = ranked.find(row => row.country === 'ESP');
  const median = CORE.median(ascending.map(row => row.value));
  const spainChange = CORE.historicalChange(rows, 'ESP', 10, item.presentation.changeType === 'percentage_points');
  const format = (value, context = 'table') => CORE.formatIndicatorValue(value, localizedItem, locale, context) || i18n.noData;
  const stat = (label, value, context = '') => `<article class="highlight-card"><span class="label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${context ? `<span class="context">${escapeHtml(context)}</span>` : ''}</article>`;
  const statistics = [
    stat(i18n.spain, spain ? format(spain.value) : i18n.noData, spain ? i18n.positionInYear(spain.position, year) : ''),
    stat(i18n.highestValue, ascending.at(-1) ? format(ascending.at(-1).value) : i18n.noData, names.get(ascending.at(-1)?.country) || ''),
    stat(i18n.lowestValue, ascending[0] ? format(ascending[0].value) : i18n.noData, names.get(ascending[0]?.country) || ''),
    stat(i18n.median, format(median), i18n.countriesWithDataShort(ranked.length)),
    stat(i18n.spainChange, spainChange ? CORE.formatIndicatorChange(spainChange.value, localizedItem, locale) : i18n.noData, spainChange ? `${spainChange.fromYear}–${spainChange.toYear}` : i18n.noComparableEnds)
  ].join('');
  const limitations = presentation.limitations.map(value => `<li>${escapeHtml(value)}</li>`).join('');
  const sourceOrganization = data.official_metadata.source_organization || data.official_metadata.name;
  const features = [i18n.ranking, i18n.compareCountries, i18n.chartTitle(localizedItem.name), i18n.downloadCsv]
    .map(value => `<li>${escapeHtml(value)}</li>`).join('');
  return `${START}<section class="method data-prerender" data-prerender-snapshot data-common-year="${year}">
    <h2>${escapeHtml(i18n.whatMeasures)}</h2><p>${escapeHtml(presentation.what)}</p>
    <h2>${escapeHtml(i18n.howToInterpret)}</h2><p>${escapeHtml(presentation.interpretation)}</p>
    <h2>${escapeHtml(i18n.dataHighlights)}</h2><div class="highlights-grid">${statistics}</div>
    <h2>${escapeHtml(i18n.source)}</h2><p><strong>World Bank — World Development Indicators</strong></p><p>${escapeHtml(sourceOrganization)}</p>
    <dl class="snapshot-metadata"><div><dt>${escapeHtml(i18n.coverage)}</dt><dd>${data.coverage.min_year}–${data.coverage.max_year} · ${escapeHtml(i18n.territories(data.coverage.country_count))}</dd></div><div><dt>${escapeHtml(i18n.commonYearLabel)}</dt><dd>${year}</dd></div><div><dt>${escapeHtml(i18n.lastDownload)}</dt><dd>${escapeHtml(data.downloaded_at)}</dd></div></dl>
    <h2>${escapeHtml(i18n.limitations)}</h2><ul>${limitations}</ul>
    <ul class="snapshot-features">${features}</ul>
  </section>${END}`;
}

function explorerSnapshot(language, registry) {
  const i18n = languageConfig(language);
  const indicators = categoryGroups(registry,language).map(category=>`<section class="indicator-category"><h3>${escapeHtml(category.label)}</h3><ul>${category.indicators.map(item => {
    const localized = i18n.indicators[item.slug] || item;
    const page = Object.values(DATA_PAGES).find(candidate => candidate.indicator === item.slug);
    return `<li><a href="${page[language]}"><strong>${escapeHtml(localized.name)}</strong></a> — ${escapeHtml(localized.description)}</li>`;
  }).join('')}</ul></section>`).join('');
  const cautions = registry.indicators.map(item => {
    const localized = i18n.indicators[item.slug] || item;
    return `<li><strong>${escapeHtml(localized.name)}:</strong> ${escapeHtml(localized.methodology)}</li>`;
  }).join('');
  const features = [i18n.ranking, i18n.compareCountries, i18n.rangeAll, i18n.downloadCsv]
    .map(value => `<li>${escapeHtml(value)}</li>`).join('');
  return `${START}<section class="method data-prerender explorer-prerender" data-prerender-snapshot>
    <h2>${escapeHtml(i18n.indicator)}</h2><div class="indicator-categories">${indicators}</div>
    <h2>${escapeHtml(i18n.whatDataShows)}</h2><ul>${features}</ul>
    <h2>${escapeHtml(i18n.limitations)}</h2><ul>${cautions}</ul>
    <h2>${escapeHtml(i18n.source)}</h2><p>${escapeHtml(i18n.sourceAttribution)}</p><p><a href="${DATA_PAGES.sources[language]}">${escapeHtml(i18n.source)} · ${escapeHtml(i18n.coverage)}</a></p>
  </section>${END}`;
}

function replaceIndicatorSnapshot(html, snapshot) {
  const marked = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (marked.test(html)) return html.replace(marked, snapshot);
  return html.replace(/<section class="method">[\s\S]*?<\/section>(?=<section id="data_app">)/, snapshot);
}

function replaceExplorerSnapshot(html, snapshot) {
  const marked = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (marked.test(html)) return html.replace(marked, snapshot);
  return html.replace(/(?=<section id="data_app">)/, snapshot);
}

function localizedCountryList(countries, language) {
  return VIEWS.localizedCountries(countries, languageConfig(language).locale);
}

function sectionNav(language, active = '') {
  const text = dataViews(language),changes=changeText(language);
  return `${NAV_START}<nav class="data-section-nav" aria-label="${escapeHtml(text.explore)}"><a href="${DATA_PAGES.explorer[language]}"${active === 'explorer' ? ' aria-current="page"' : ''}>${escapeHtml(text.explore)}</a><a href="${DATA_PAGES.map[language]}"${active === 'map' ? ' aria-current="page"' : ''}>${escapeHtml(mapText(language).mapLabel)}</a><a href="${DATA_PAGES.countries[language]}"${active === 'countries' ? ' aria-current="page"' : ''}>${escapeHtml(text.countries)}</a><a href="${DATA_PAGES.compare[language]}"${active === 'compare' ? ' aria-current="page"' : ''}>${escapeHtml(text.compare)}</a><a href="${DATA_PAGES.rankings[language]}"${active === 'rankings' ? ' aria-current="page"' : ''}>${escapeHtml(text.rankings)}</a><a href="${DATA_PAGES.changes[language]}"${active === 'changes' ? ' aria-current="page"' : ''}>${escapeHtml(changes.nav)}</a></nav>${NAV_END}`;
}

function injectSectionNav(html, language, active = '') {
  const marked = new RegExp(`${NAV_START}[\\s\\S]*?${NAV_END}`);
  const nav = sectionNav(language, active);
  if (marked.test(html)) return html.replace(marked, nav);
  const breadcrumb = /(<main[^>]*>[\s\S]*?<nav class="breadcrumb"[^>]*>[\s\S]*?<\/nav>)/;
  return breadcrumb.test(html) ? html.replace(breadcrumb, `$1${nav}`) : html.replace(/<main([^>]*)>/, `<main$1>${nav}`);
}

function discoveryBlock(language, countries, registry) {
  const text = dataViews(language),changes=changeText(language), featuredCodes = language === 'es' ? ['ESP', 'PRT', 'FRA', 'DEU'] : ['USA', 'CHN', 'IND', 'BRA'];
  const names = new Map(localizedCountryList(countries, language).map(country => [country.id, country.name]));
  const cards = [
    [DATA_PAGES.explorer[language], text.explore, text.availableIndicators],
    [DATA_PAGES.map[language], mapText(language).mapLabel, mapText(language).intro],
    [DATA_PAGES.countries[language], text.countries, text.countriesDesc],
    [DATA_PAGES.compare[language], text.compare, text.compareDesc],
    [DATA_PAGES.rankings[language], text.rankings, text.rankingsDesc],
    [DATA_PAGES.changes[language], changes.nav, changes.card]
  ].map(([href, title, description]) => `<a class="metric-card" href="${href}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></a>`).join('');
  const countryLinks = featuredCodes.map(code => `<a class="btn" href="${countryRoute(language, code)}">${escapeHtml(names.get(code) || code)}</a>`).join(' ');
  return `${LANDING_START}<h2 class="section-title">${escapeHtml(text.explore)}</h2><section class="data-grid data-discovery-grid">${cards}</section><h2 class="section-title">${escapeHtml(text.countries)}</h2><p class="featured-countries">${countryLinks}</p>${LANDING_END}`;
}

function landingIndicatorsBlock(language, registry) {
  const i18n=languageConfig(language),text=dataViews(language);
  const categories=categoryGroups(registry,language).map(category=>`<section class="landing-indicator-group" data-category="${category.id}"><h3>${escapeHtml(category.label)}</h3><div class="data-grid">${category.indicators.map(item=>{const localized=displayIndicator(item,i18n),page=Object.values(DATA_PAGES).find(candidate=>candidate.indicator===item.slug);return`<a class="metric-card" data-indicator-card="${item.slug}" href="${page[language]}"><h2>${escapeHtml(localized.name)}</h2><p>${escapeHtml(localized.description)}</p></a>`}).join('')}</div></section>`).join('');
  return `${LANDING_INDICATORS_START}<h2 class="section-title">${escapeHtml(text.availableIndicators)}</h2><div class="landing-indicator-groups">${categories}</div>${LANDING_INDICATORS_END}`;
}

function updateLanding(html, language, countries, registry) {
  const indicators=landingIndicatorsBlock(language,registry),indicatorMarked=new RegExp(`${LANDING_INDICATORS_START}[\\s\\S]*?${LANDING_INDICATORS_END}`),legacyGrid=new RegExp(`<h2 class="section-title">[\\s\\S]*?</h2><section class="data-grid">[\\s\\S]*?</section>(?=${LANDING_START})`),legacySection=new RegExp(`<section(?: class="data-section")?>[\\s\\S]*?</section>(?=${LANDING_START})`);
  let updated=indicatorMarked.test(html)?html.replace(indicatorMarked,indicators):legacyGrid.test(html)?html.replace(legacyGrid,indicators):html.replace(legacySection,indicators);
  const block = discoveryBlock(language, countries, registry), marked = new RegExp(`${LANDING_START}[\\s\\S]*?${LANDING_END}`);
  return marked.test(updated) ? updated.replace(marked, block) : updated.replace(/(?=<section class="source-box">)/, block);
}

function sourcesRegistryBlock(language,registry,dataBySlug){
  const i18n=languageConfig(language),text=dataViews(language),rows=categoryRows(registry,language,item=>{const localized=displayIndicator(item,i18n),data=dataBySlug.get(item.slug),page=Object.values(DATA_PAGES).find(candidate=>candidate.indicator===item.slug);return`<tr><th scope="row"><a href="${page[language]}">${escapeHtml(localized.name)}</a><small>${escapeHtml(item.code)}</small></th><td>${data.coverage.min_year}–${data.coverage.max_year}</td><td>${escapeHtml(i18n.territories(data.coverage.country_count))}</td><td>${escapeHtml(data.official_metadata.source_organization||data.official_metadata.name)}</td></tr>`},4);
  return `${SOURCES_START}<section class="panel indicator-source-registry"><h2>${escapeHtml(i18n.indicator)}</h2><p>${escapeHtml(i18n.sourceAttribution)}</p><div class="table-wrap"><table><thead><tr><th>${escapeHtml(i18n.indicator)}</th><th>${escapeHtml(i18n.coverage)}</th><th>${escapeHtml(text.countries)}</th><th>${escapeHtml(i18n.sourceOrganization)}</th></tr></thead><tbody>${rows}</tbody></table></div></section>${SOURCES_END}`;
}

function updateSources(html,language,registry,dataBySlug){
  const block=sourcesRegistryBlock(language,registry,dataBySlug),marked=new RegExp(`${SOURCES_START}[\\s\\S]*?${SOURCES_END}`);
  return marked.test(html)?html.replace(marked,block):html.replace(/<\/main>/,`${block}</main>`);
}

function alternateLinks(routes) {
  return Object.keys(DATA_LANGUAGES).map(language => `<link rel="alternate" hreflang="${language}" href="https://metaphai.com${routes[language]}">`).join('') + `<link rel="alternate" hreflang="x-default" href="https://metaphai.com${routes.es}">`;
}

function sitemapEntries(routeGroups) {
  const origin='https://metaphai.com';
  return routeGroups.flatMap(routes=>Object.keys(DATA_LANGUAGES).map(language=>`  <url><loc>${origin}${routes[language]}</loc>${Object.keys(DATA_LANGUAGES).map(code=>`<xhtml:link rel="alternate" hreflang="${code}" href="${origin}${routes[code]}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${origin}${routes.es}"/></url>`)).join('\n');
}

async function updateSitemap(countries) {
  const newIndicators=Object.values(DATA_PAGES).filter(page=>page.indicator&&!ORIGINAL_INDICATORS.has(page.indicator));
  const path=join(ROOT,'sitemap.xml'),previous=await readFile(path,'utf8'),marked=new RegExp(`${SITEMAP_START}[\\s\\S]*?${SITEMAP_END}\\s*`),clean=previous.replace(marked,''),groups=[...newIndicators,DATA_PAGES.map,DATA_PAGES.countries,DATA_PAGES.compare,DATA_PAGES.rankings,DATA_PAGES.changes,...VIEWS.validCountries(countries).map(country=>countryRoutes(country.id))],block=`${SITEMAP_START}\n${sitemapEntries(groups)}\n${SITEMAP_END}\n`;
  return writeIfChanged(path,clean.replace(/<\/urlset>\s*$/,`${block}</urlset>\n`));
}

function languageSwitcher(language, pageKey, routes) {
  const active = DATA_LANGUAGES[language];
  return `<details class="language-switcher" data-language-switcher data-page-key="${pageKey}"><summary aria-label="${escapeHtml(active.label)}"><span class="language-icon" aria-hidden="true">🌐</span><span class="language-name" data-current-language>${escapeHtml(active.label)}</span><span class="language-code" data-current-code>${escapeHtml(active.shortLabel)}</span></summary><div class="language-menu">${Object.entries(DATA_LANGUAGES).map(([code, config]) => `<a data-language="${code}" href="${routes[code]}" hreflang="${code}" lang="${code}" dir="auto"${code === language ? ' aria-current="true"' : ''}><span class="language-name">${escapeHtml(config.label)}</span><span class="language-code">${escapeHtml(config.shortLabel)}</span></a>`).join('')}</div></details>`;
}

function pageChrome({ language, pageKey, routes, title, description, body, schemaType = 'WebPage', bodyAttributes='', interactiveScript='views' }) {
  const route = routes[language], text = dataViews(language), dir = language === 'ar' ? ' dir="rtl"' : '';
  const primary=language==='es'?`<a href="/" class="site-nav-link">Calculadoras</a><a href="/calendarios-laborales/" class="site-nav-link">Calendarios</a><a href="${DATA_PAGES.home.es}" class="site-nav-link" aria-current="page">Datos globales</a><a href="${GAME_PAGES.home.es}" class="site-nav-link">Juegos</a>`:`<a href="${DATA_PAGES.home[language]}" class="site-nav-link" aria-current="page">${escapeHtml(DATA_LABELS[language])}</a><a href="${GAME_PAGES.home[language]}" class="site-nav-link">${escapeHtml(gameText(language).games)}</a>`;
  const globalHeader = `<header><a href="/" class="logo"><img src="/assets/metaphai-logo.png" alt="MetaphAI" width="1000" height="200"></a><nav class="site-nav" aria-label="${language==='es'?'Navegación principal':escapeHtml(text.explore)}"><div class="site-nav-primary">${primary}</div><div class="data-header-tools"><span class="header-tag">${escapeHtml(text.countries)}</span>${languageSwitcher(language, pageKey, routes)}</div></nav></header>`;
  const labels=FOOTER_LABELS[language];
  const footer = `<footer>© 2026 MetaphAI · <a href="${DATA_PAGES.sources[language]}">${escapeHtml(labels[0])}</a> · <a href="${INSTITUTIONAL_PAGES.privacy[language]}">${escapeHtml(labels[1])}</a> · <a href="${INSTITUTIONAL_PAGES.contact[language]}">${escapeHtml(labels[2])}</a> · <a href="${INSTITUTIONAL_PAGES.about[language]}">${escapeHtml(labels[3])}</a></footer>`;
  const breadcrumbItems=[{'@type':'ListItem',position:1,name:DATA_LABELS[language],item:`https://metaphai.com${DATA_PAGES.home[language]}`}];
  if(pageKey.startsWith('country:')) breadcrumbItems.push({'@type':'ListItem',position:2,name:text.countries,item:`https://metaphai.com${DATA_PAGES.countries[language]}`});
  breadcrumbItems.push({'@type':'ListItem',position:breadcrumbItems.length+1,name:title,item:`https://metaphai.com${route}`});
  const jsonLd = JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':schemaType,name:title,url:`https://metaphai.com${route}`,isBasedOn:'https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators'},{'@type':'BreadcrumbList',itemListElement:breadcrumbItems}]}).replace(/</g, '\\u003c');
  const appScript=interactiveScript==='explorer'?`<script defer src="/assets/js/data-explorer.js?v=${ASSET_VERSION}"></script>`:interactiveScript==='map'?`<script defer src="/assets/vendor/d3.v7.9.0.min.js"></script><script defer src="/assets/vendor/topojson-client.v3.1.0.min.js"></script><script type="module" src="/assets/js/data-map.js?v=${ASSET_VERSION}"></script>`:interactiveScript==='changes'?`<script defer src="/assets/vendor/d3.v7.9.0.min.js"></script><script defer src="/assets/vendor/topojson-client.v3.1.0.min.js"></script><script type="module" src="/assets/js/data-changes.js?v=${ASSET_VERSION}"></script>`:`<script type="module" src="/assets/js/data-views.js?v=${ASSET_VERSION}"></script>`;
  return `<!doctype html><html lang="${language}"${dir}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | MetaphAI</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="https://metaphai.com${route}">${alternateLinks(routes)}<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="https://metaphai.com${route}"><meta property="og:type" content="website"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/metaphai-logo.css?v=${LOGO_VERSION}"><link rel="stylesheet" href="/assets/css/data.css?v=${ASSET_VERSION}"><meta name="google-adsense-account" content="ca-pub-7545567251029894"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7545567251029894" crossorigin="anonymous"></script><script async src="https://www.googletagmanager.com/gtag/js?id=G-1P9N4QY0JR"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-1P9N4QY0JR');</script><script type="application/ld+json">${jsonLd}</script></head><body${bodyAttributes?` ${bodyAttributes}`:''}>${globalHeader}<main>${sectionNav(language, pageKey.startsWith('country:') ? 'countries' : pageKey)}${body}</main>${footer}${appScript}<script type="module" src="/assets/js/data-language.js?v=${ASSET_VERSION}"></script></body></html>`;
}

function localizedIndicator(item, language) {
  const localized = languageConfig(language).indicators[item.slug] || item;
  return { ...item, ...localized, presentation: { ...item.presentation, unitLabel: localized.unitLabel || item.presentation.unitLabel } };
}

function indicatorPage(language,pageKey,item,data,countries,registry){
  const i18n=languageConfig(language),text=dataViews(language),localized=localizedIndicator(item,language),routes=DATA_PAGES[pageKey],category=i18n.categories[item.category]||item.category;
  const title=`${localized.name} — ${text.countries}`;
  const description=`${localized.description} ${localized.methodology}`;
  const snapshot=snapshotForIndicator({item,data,countries,language});
  const body=`<nav class="breadcrumb"><a href="${DATA_PAGES.home[language]}">${escapeHtml(text.explore)}</a> › ${escapeHtml(localized.name)}</nav><section class="data-hero"><span class="data-kicker">${escapeHtml(category)} · World Development Indicators</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></section>${snapshot}<section id="data_app"><div class="data-controls"><div><h2 id="indicator_title">${escapeHtml(title)}</h2><p id="indicator_description">${escapeHtml(description)}</p></div><div class="field"><label for="year_select">${escapeHtml(i18n.rankingYear)}</label><select id="year_select"></select></div></div><div class="data-layout"><section class="panel"><h2>${escapeHtml(i18n.ranking)}</h2><label class="field" for="country_search"><span>${escapeHtml(i18n.searchCountry)}</span><input id="country_search" type="search" autocomplete="off"></label><p id="ranking_note" class="rank-note"></p><div class="table-wrap"><table><thead><tr><th>${escapeHtml(i18n.position)}</th><th>${escapeHtml(i18n.country)}</th><th>${escapeHtml(i18n.year)}</th><th>${escapeHtml(i18n.value)}</th></tr></thead><tbody id="ranking_body"></tbody></table></div></section><aside class="panel"><h2>${escapeHtml(i18n.dataHighlights)}</h2><div id="insights" class="insights"></div></aside></div><section class="panel" style="margin-top:16px"><h2>${escapeHtml(i18n.chartTitle(localized.name))}</h2><p id="indicator_method" class="rank-note">${escapeHtml(localized.methodology)}</p><div id="compare_list" class="compare-list"></div><div id="chart" class="chart"></div><div id="chart_legend" class="legend"></div><details><summary>${escapeHtml(i18n.chartExplore)}</summary><div class="table-wrap"><table><thead><tr><th>${escapeHtml(i18n.country)}</th><th>${escapeHtml(i18n.year)}</th><th>${escapeHtml(i18n.value)}</th></tr></thead><tbody id="chart_table_body"></tbody></table></div></details><button id="download_csv" class="btn" type="button">${escapeHtml(i18n.downloadCsv)}</button></section><section id="source_box" class="source-box"></section></section>`;
  return pageChrome({language,pageKey,routes,title,description,body,schemaType:'Dataset',bodyAttributes:`data-indicator="${item.slug}"`,interactiveScript:'explorer'});
}

function countriesIndexPage(language, countries) {
  const text = dataViews(language), list = localizedCountryList(countries, language);
  const links = list.map(country => `<li data-country-name="${escapeHtml(country.name)}" data-country-code="${country.id} ${country.iso2}"><a href="${countryRoute(language, country.id)}"><strong>${escapeHtml(country.name)}</strong><span dir="ltr">${country.iso2} · ${country.id}</span></a></li>`).join('');
  const body = `<nav class="breadcrumb"><a href="${DATA_PAGES.home[language]}">${escapeHtml(text.explore)}</a> › ${escapeHtml(text.countries)}</nav><section class="data-hero"><h1>${escapeHtml(text.countriesTitle)}</h1><p>${escapeHtml(text.countriesDesc)}</p></section><section class="panel"><label class="field" for="country_directory_search">${escapeHtml(text.search)}<input id="country_directory_search" type="search" autocomplete="off" data-country-filter></label><p class="rank-note"><span data-country-count>${list.length}</span> ${escapeHtml(text.territories)}</p><ul class="country-directory" data-country-directory>${links}</ul></section><section class="source-box"><p>${escapeHtml(text.sourceText)}</p><a href="${DATA_PAGES.sources[language]}">${escapeHtml(languageConfig(language).source)}</a></section>`;
  return pageChrome({language,pageKey:'countries',routes:Object.fromEntries(Object.keys(DATA_LANGUAGES).map(code=>[code,DATA_PAGES.countries[code]])),title:text.countriesTitle,description:text.countriesDesc,body,schemaType:'CollectionPage'});
}

function mapPage(language,registry,countries,dataBySlug){
  const text=mapText(language),views=dataViews(language),i18n=languageConfig(language),item=registry.indicators[0],localized=localizedIndicator(item,language),data=dataBySlug.get(item.slug),year=CORE.commonYear(VIEWS.indicatorRows(data,countries),registry.common_year_coverage),routes=Object.fromEntries(Object.keys(DATA_LANGUAGES).map(code=>[code,DATA_PAGES.map[code]]));
  const body=`<nav class="breadcrumb"><a href="${DATA_PAGES.home[language]}">${escapeHtml(views.explore)}</a> › ${escapeHtml(text.mapLabel)}</nav><section class="data-hero"><span class="data-kicker">World Development Indicators</span><h1>${escapeHtml(text.title)}</h1><p>${escapeHtml(text.intro)}</p></section><section id="map_app" class="map-app"><div class="panel map-controls"><label class="field" for="map_indicator">${escapeHtml(i18n.indicator)}<select id="map_indicator">${groupedOptions(registry,language)}</select></label><label class="field" for="map_year">${escapeHtml(text.year)}<select id="map_year"><option>${year}</option></select></label><label class="field" for="map_country">${escapeHtml(text.selectCountry)}<select id="map_country"><option>${escapeHtml(text.selectCountry)}</option></select></label></div><p class="rank-note">${escapeHtml(text.help)}</p><div id="map_legend" class="map-legend"><strong>${escapeHtml(text.legend)}</strong></div><div class="map-layout"><div class="map-frame"><svg id="world_map" class="world-map" viewBox="0 0 960 500" role="img" aria-label="${escapeHtml(text.svgTitle)}"></svg></div><aside id="map_panel" class="panel map-panel" aria-live="polite"><p><strong>${escapeHtml(localized.name)}</strong></p><p>${year}</p></aside></div><p id="map_js_note" class="rank-note">${escapeHtml(text.jsRequired)}</p><p id="map_error" class="error" hidden>${escapeHtml(text.jsRequired)}</p></section><section class="source-box"><h2>${escapeHtml(views.method)}</h2><p>${escapeHtml(text.methodology)}</p><p>${escapeHtml(views.sourceText)}</p><a href="${DATA_PAGES.sources[language]}">${escapeHtml(i18n.source)}</a></section>`;
  const enhancedBody=body.replace(/<label class="field" for="map_country">[\s\S]*?<\/label>/,`<div class="field map-country-field"><label for="map_country">${escapeHtml(text.selectCountry)}</label><div class="combobox-wrap map-country-picker"><span class="map-country-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" focusable="false"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg></span><input id="map_country" type="search" role="combobox" aria-autocomplete="list" aria-controls="map_country_options" aria-expanded="false" autocomplete="off" placeholder="${escapeHtml(text.selectCountry)}"><ul id="map_country_options" class="country-options map-country-options" role="listbox" hidden></ul></div></div>`);
  return pageChrome({language,pageKey:'map',routes,title:text.title,description:text.intro,body:enhancedBody,schemaType:'WebPage',interactiveScript:'map'});
}

function changesPage(language,registry,countries,dataBySlug){
  const text=changeText(language),views=dataViews(language),i18n=languageConfig(language),item=registry.indicators.find(entry=>entry.slug==='esperanza-de-vida')||registry.indicators[0],data=dataBySlug.get(item.slug),localized=displayIndicator(item,i18n),period=CHANGE.defaultPeriod(data,countries,item,registry.common_year_coverage),rows=CHANGE.comparableChanges(data,countries,item,period.from,period.to),ranking=CHANGE.rankedChanges(rows),summary=CHANGE.changeSummary(rows),names=new Map(localizedCountryList(countries,language).map(country=>[country.id,country.name])),extent=CHANGE.robustExtent(rows.map(row=>row.change)),spain=rows.find(row=>row.country==='ESP')||ranking[0],spainRank=ranking.find(row=>row.country===spain?.country),routes=Object.fromEntries(Object.keys(DATA_LANGUAGES).map(code=>[code,DATA_PAGES.changes[code]]));
  const formatValue=value=>CORE.formatIndicatorValue(value,localized,i18n.locale,'table')||text.noData,formatChange=value=>CHANGE.formatChange(value,localized,i18n.locale,'table')||text.noData,tableHead=(withRank=false)=>`<thead><tr><th>${escapeHtml(text.country)}</th><th>${escapeHtml(text.initial)}</th><th>${escapeHtml(text.final)}</th><th>${escapeHtml(text.change)}</th>${withRank?`<th>${escapeHtml(text.rank)}</th>`:''}</tr></thead>`,rowHtml=(row,withRank=false)=>`<tr><th scope="row"><a href="${countryRoute(language,row.country)}">${escapeHtml(names.get(row.country)||row.country)}</a></th><td>${escapeHtml(formatValue(row.from))}</td><td>${escapeHtml(formatValue(row.to))}</td><td class="num" dir="ltr">${escapeHtml(formatChange(row.change))}</td>${withRank?`<td>${ranking.find(entry=>entry.country===row.country)?.position||''}</td>`:''}</tr>`;
  const increases=ranking.filter(row=>row.change>0).slice(0,10),decreases=CHANGE.rankedChanges(rows,'ascending').filter(row=>row.change<0).slice(0,10),years=CHANGE.availableYears(data,countries),yearOptions=selected=>years.map(year=>`<option value="${year}"${year===selected?' selected':''}>${year}</option>`).join(''),legend=CHANGE.legendValues(extent).map(value=>`<span><i style="background:${CHANGE.divergentColor(value,extent)}"></i><b dir="ltr">${escapeHtml(formatChange(value))}</b></span>`).join(''),mode=text.mode(CHANGE.changeType(localized),localized.presentation?.unitLabel||localized.unit||'');
  const body=`<nav class="breadcrumb"><a href="${DATA_PAGES.home[language]}">${escapeHtml(views.explore)}</a> › ${escapeHtml(text.nav)}</nav><section class="data-hero"><span class="data-kicker">World Development Indicators</span><h1>${escapeHtml(text.title)}</h1><p>${escapeHtml(text.intro)}</p></section><section id="change_app" class="change-app"><div class="panel change-controls"><label class="field" for="change_category">${escapeHtml(text.category)}<select id="change_category">${categoryGroups(registry,language).map(category=>`<option value="${category.id}"${category.id===item.category?' selected':''}>${escapeHtml(category.label)}</option>`).join('')}</select></label><label class="field" for="change_indicator">${escapeHtml(text.indicator)}<select id="change_indicator">${registry.indicators.filter(entry=>entry.category===item.category).map(entry=>`<option value="${entry.slug}"${entry.slug===item.slug?' selected':''}>${escapeHtml(displayIndicator(entry,i18n).name)}</option>`).join('')}</select></label><label class="field" for="change_from">${escapeHtml(text.from)}<select id="change_from">${yearOptions(period.from)}</select></label><label class="field" for="change_to">${escapeHtml(text.to)}<select id="change_to">${yearOptions(period.to)}</select></label></div><div class="field change-country-field"><label for="change_country">${escapeHtml(text.selectCountry)}</label><div class="combobox-wrap map-country-picker change-country-picker"><span class="map-country-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" focusable="false"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg></span><input id="change_country" type="search" role="combobox" aria-autocomplete="list" aria-controls="change_country_options" aria-expanded="false" autocomplete="off" placeholder="${escapeHtml(text.selectCountry)}"><ul id="change_country_options" class="country-options map-country-options" role="listbox" hidden></ul></div></div><section class="change-summary" aria-labelledby="change_summary_title"><h2 id="change_summary_title">${escapeHtml(text.comparable)}</h2><p id="change_coverage" class="change-summary-copy">${escapeHtml(text.coverageText(summary.coverage,217))}</p><p id="change_counts" class="change-summary-copy">${escapeHtml(text.countsText(summary.increase,summary.decrease,summary.unchanged))}</p><p id="change_mode" class="rank-note">${escapeHtml(mode)}</p><div class="highlights-grid"><article class="highlight-card"><span class="label">${escapeHtml(text.comparable)}</span><strong id="change_coverage_value">${summary.coverage}</strong></article><article class="highlight-card"><span class="label">${escapeHtml(text.median)}</span><strong id="change_median_value" dir="ltr">${escapeHtml(formatChange(summary.median))}</strong></article><article class="highlight-card"><span class="label">${escapeHtml(text.increase)}</span><strong id="change_increase_value">${summary.increase}</strong></article><article class="highlight-card"><span class="label">${escapeHtml(text.decrease)}</span><strong id="change_decrease_value">${summary.decrease}</strong></article></div></section><div id="change_legend" class="change-legend"><strong>${escapeHtml(text.decrease)}</strong>${legend}<strong>${escapeHtml(text.increase)}</strong></div><div class="map-layout"><div class="map-frame"><svg id="change_world_map" class="world-map" viewBox="0 0 960 500" role="img" aria-label="${escapeHtml(text.title)}"><title>${escapeHtml(text.title)}</title><desc>${escapeHtml(text.methodology)}</desc></svg></div><aside id="change_panel" class="panel map-panel change-map-panel" aria-live="polite">${spain?`<h2>${escapeHtml(names.get(spain.country)||spain.country)}</h2><p><strong dir="ltr">${period.from}</strong>: ${escapeHtml(formatValue(spain.from))}</p><p><strong dir="ltr">${period.to}</strong>: ${escapeHtml(formatValue(spain.to))}</p><p><strong>${escapeHtml(text.change)}:</strong> <span dir="ltr">${escapeHtml(formatChange(spain.change))}</span></p><p>${escapeHtml(text.rankText(spainRank.position,ranking.length))}</p><a class="btn" href="${countryRoute(language,spain.country)}">${escapeHtml(text.viewCountry)}</a>`:`<p>${escapeHtml(text.noData)}</p>`}</aside></div><p id="change_js_note" class="rank-note">${escapeHtml(text.js)}</p><p id="change_error" class="error" hidden>${escapeHtml(text.js)}</p><section class="change-rankings"><article class="panel"><h2>${escapeHtml(text.largestIncreases)}</h2><div class="table-wrap"><table class="change-table">${tableHead()}<tbody id="change_top_increase">${increases.map(row=>rowHtml(row)).join('')}</tbody></table></div></article><article class="panel"><h2>${escapeHtml(text.largestDecreases)}</h2><div class="table-wrap"><table class="change-table">${tableHead()}<tbody id="change_top_decrease">${decreases.map(row=>rowHtml(row)).join('')}</tbody></table></div></article></section><section class="panel"><h2>${escapeHtml(text.allResults)}</h2><div class="table-wrap"><table class="change-table">${tableHead(true)}<tbody id="change_all_results">${ranking.map(row=>rowHtml(row,true)).join('')}</tbody></table></div></section><section class="panel change-context"><h2>${escapeHtml(text.context)}: <span id="change_context_title">${escapeHtml(localized.name)}</span></h2><p id="change_context_description">${escapeHtml(localized.description)}</p><p id="change_context_methodology">${escapeHtml(localized.methodology)}</p></section></section><section class="source-box"><h2>${escapeHtml(text.method)}</h2><p>${escapeHtml(text.methodology)}</p><p>${escapeHtml(text.source)}</p><a href="${DATA_PAGES.sources[language]}">${escapeHtml(i18n.source)}</a></section>`;
  return pageChrome({language,pageKey:'changes',routes,title:text.seoTitle,description:text.description,body,schemaType:'WebPage',interactiveScript:'changes'});
}

function countryPage(language, country, countries, registry, dataBySlug) {
  const text=dataViews(language),i18n=languageConfig(language),locale=i18n.locale,routes=countryRoutes(country.id),summaries=[];
  for(const item of registry.indicators){const localized=localizedIndicator(item,language),summary=VIEWS.countryIndicatorSummary(dataBySlug.get(item.slug),countries,item,country.id);if(!summary.latest)continue;const value=CORE.formatIndicatorValue(summary.latest.value,localized,locale,'table'),change=summary.change?CORE.formatIndicatorChange(summary.change.value,localized,locale,'table'):text.noData,rank=summary.rank?`${summary.rank.position} ${text.of} ${summary.total} · ${summary.commonYear}`:text.noData;summaries.push({slug:item.slug,html:`<tr><th scope="row"><a href="${Object.values(DATA_PAGES).find(page=>page.indicator===item.slug)[language]}">${escapeHtml(localized.name)}</a></th><td>${escapeHtml(value)}</td><td>${summary.latest.year}</td><td>${escapeHtml(rank)}</td><td>${escapeHtml(change)}</td></tr>`})}
  const localizedCountries=localizedCountryList(countries,language),localizedCountry=localizedCountries.find(item=>item.id===country.id)||country,suggestions=VIEWS.suggestedCountries(country,countries).map(item=>localizedCountries.find(candidate=>candidate.id===item.id)||item),suggested=suggestions.map(item=>`<a class="btn" href="${DATA_PAGES.compare[language]}?countries=${country.id},${item.id}">${escapeHtml(item.name)}</a>`).join(' '),first=registry.indicators.find(item=>dataBySlug.get(item.slug).observations.some(row=>row.country===country.id)),body=`<nav class="breadcrumb"><a href="${DATA_PAGES.home[language]}">${escapeHtml(text.explore)}</a> › <a href="${DATA_PAGES.countries[language]}">${escapeHtml(text.countries)}</a> › ${escapeHtml(localizedCountry.name)}</nav><section class="data-hero country-hero"><span class="data-kicker" dir="ltr">${country.iso2} · ${country.id}</span><h1>${escapeHtml(localizedCountry.name)}</h1><p>${escapeHtml(text.countrySubtitle)}</p><a class="btn" href="${DATA_PAGES.compare[language]}?countries=${country.id}">${escapeHtml(text.compareCountry)}</a></section><section class="panel"><h2>${escapeHtml(text.summary)}</h2><div class="table-wrap"><table class="country-summary"><thead><tr><th>${escapeHtml(text.indicator)}</th><th>${escapeHtml(text.value)}</th><th>${escapeHtml(text.year)}</th><th>${escapeHtml(text.position)}</th><th>${escapeHtml(text.change)}</th></tr></thead><tbody>${categoryRows(registry,language,item=>summaries.find(entry=>entry.slug===item.slug)?.html||'',5)}</tbody></table></div></section><section class="panel country-history" data-country-view="${country.id}" data-indicator="${first?.slug||''}"><h2>${escapeHtml(text.history)}</h2><label class="field" for="country_indicator">${escapeHtml(text.chooseIndicator)}<select id="country_indicator">${groupedOptions(registry,language,item=>dataBySlug.get(item.slug).observations.some(row=>row.country===country.id))}</select></label><div id="country_chart" class="chart"></div><div class="table-wrap"><table><thead><tr><th>${escapeHtml(text.year)}</th><th>${escapeHtml(text.value)}</th></tr></thead><tbody id="country_history_body"></tbody></table></div></section><section class="panel"><h2>${escapeHtml(text.compareSuggested)}</h2><p>${suggested}</p></section><section class="source-box"><h2>${escapeHtml(text.method)}</h2><p>${escapeHtml(text.sourceText)}</p><a href="${DATA_PAGES.sources[language]}">${escapeHtml(i18n.source)}</a></section>`;
  return pageChrome({language,pageKey:`country:${country.id}`,routes,title:`${localizedCountry.name} — ${text.countrySubtitle}`,description:`${localizedCountry.name}: ${text.summary}. ${text.sourceText}`,body,schemaType:'Dataset'});
}

function comparisonSummaryHtml(language,countries,registry,dataBySlug,selected){const text=dataViews(language),locale=languageConfig(language).locale,names=new Map(localizedCountryList(countries,language).map(country=>[country.id,country.name])),payloads=registry.indicators.map(item=>dataBySlug.get(item.slug));return VIEWS.comparisonSummary(payloads,registry.indicators,selected).slice(0,6).map(entry=>{const localized=localizedIndicator(entry.item,language),difference=VIEWS.formatComparisonDifference(entry.item,localized,locale,entry.difference,text.points);return`<li><strong>${escapeHtml(localized.name)}:</strong> ${escapeHtml(comparisonSentence(language,{first:names.get(entry.first)||entry.first,second:names.get(entry.second)||entry.second,value:difference,year:entry.year,relation:entry.relation}))}</li>`}).join('')}

function comparePage(language,countries,registry,dataBySlug){
  const text=dataViews(language),list=localizedCountryList(countries,language),defaults=['USA','CHN'],names=new Map(list.map(item=>[item.id,item.name]));
  const rows=categoryRows(registry,language,item=>{const localized=localizedIndicator(item,language);return `<tr><th scope="row"><a href="${Object.values(DATA_PAGES).find(page=>page.indicator===item.slug)[language]}">${escapeHtml(localized.name)}</a></th>${defaults.map(code=>{const latest=VIEWS.latestObservation(dataBySlug.get(item.slug),code);return `<td>${latest?`${escapeHtml(CORE.formatIndicatorValue(latest.value,localized,languageConfig(language).locale,'table'))}<small>${latest.year}</small>`:escapeHtml(text.noData)}</td>`}).join('')}</tr>`},defaults.length+1);
  const indicatorNames=registry.indicators.map(item=>localizedIndicator(item,language).name).join(' · ');
  const body=`<nav class="breadcrumb"><a href="${DATA_PAGES.home[language]}">${escapeHtml(text.explore)}</a> › ${escapeHtml(text.compare)}</nav><section class="data-hero"><h1>${escapeHtml(text.compareTitle)}</h1><p>${escapeHtml(text.intro)}</p><p class="rank-note"><strong>${escapeHtml(text.availableIndicators)}:</strong> ${escapeHtml(indicatorNames)}</p><p class="rank-note">${escapeHtml(text.share)}</p></section><section class="panel compare-controls" data-compare-view><h2>${escapeHtml(text.selected)}</h2><label class="field" for="compare_search">${escapeHtml(text.addCountry)}<input id="compare_search" type="search" role="combobox" aria-controls="compare_options" aria-describedby="compare_search_help" aria-expanded="false" autocomplete="off" placeholder="${escapeHtml(text.search)}"></label><p id="compare_search_help" class="rank-note">${escapeHtml(text.help)}</p><ul id="compare_options" class="country-options" role="listbox" hidden></ul><div id="compare_chips" class="country-chips"></div></section><section class="panel"><h2>${escapeHtml(text.comparison)}</h2><div class="table-wrap"><table id="comparison_table"><thead><tr><th>${escapeHtml(text.indicator)}</th>${defaults.map(code=>`<th><a href="${countryRoute(language,code)}">${escapeHtml(names.get(code)||code)}</a></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section><section class="panel"><h2>${escapeHtml(text.history)}</h2><label class="field" for="compare_indicator">${escapeHtml(text.chooseIndicator)}<select id="compare_indicator">${groupedOptions(registry,language)}</select></label><div id="compare_chart" class="chart"></div><div id="compare_legend" class="legend"></div></section><section class="panel"><h2>${escapeHtml(text.automaticSummary)}</h2><ul id="compare_summary">${comparisonSummaryHtml(language,countries,registry,dataBySlug,defaults)}</ul></section><section class="panel compare-interpretation"><h2>${escapeHtml(text.interpretTitle)}</h2><p>${escapeHtml(text.interpret)}</p></section><section class="source-box"><h2>${escapeHtml(text.method)}</h2><p>${escapeHtml(text.sourceText)}</p><p><a href="${DATA_PAGES.sources[language]}">${escapeHtml(text.sourcesLink)}</a></p><p id="compare_js_note">${escapeHtml(text.jsNote)}</p></section>`;
  const routes=Object.fromEntries(Object.keys(DATA_LANGUAGES).map(code=>[code,DATA_PAGES.compare[code]]));return pageChrome({language,pageKey:'compare',routes,title:text.compareTitle,description:text.compareDesc,body});
}

function rankingsPage(language,countries,registry,dataBySlug){const text=dataViews(language),item=registry.indicators[0],localized=localizedIndicator(item,language),data=dataBySlug.get(item.slug),year=CORE.commonYear(VIEWS.indicatorRows(data,countries)),ranking=VIEWS.rankingFor(data,countries,item,year),names=new Map(localizedCountryList(countries,language).map(country=>[country.id,country.name])),rows=ranking.map(row=>`<tr><td>${row.position}</td><th scope="row"><a href="${countryRoute(language,row.country)}">${escapeHtml(names.get(row.country)||row.country)}</a></th><td>${year}</td><td class="num">${escapeHtml(CORE.formatIndicatorValue(row.value,localized,languageConfig(language).locale,'table'))}</td></tr>`).join(''),body=`<nav class="breadcrumb"><a href="${DATA_PAGES.home[language]}">${escapeHtml(text.explore)}</a> › ${escapeHtml(text.rankings)}</nav><section class="data-hero"><h1>${escapeHtml(text.rankingsTitle)}</h1><p>${escapeHtml(text.rankingsDesc)}</p></section><section class="panel ranking-controls" data-rankings-view><div class="data-controls"><label class="field" for="ranking_indicator">${escapeHtml(text.indicator)}<select id="ranking_indicator">${groupedOptions(registry,language)}</select></label><label class="field" for="ranking_year">${escapeHtml(text.year)}<select id="ranking_year">${VIEWS.offeredRankingYears(data,countries,registry.common_year_coverage).map(entry=>`<option>${entry.year}</option>`).join('')}</select></label><label class="field" for="ranking_order">${escapeHtml(text.order)}<select id="ranking_order"><option value="direction">${escapeHtml(text.descending)}</option><option value="reverse">${escapeHtml(text.ascending)}</option></select></label><label class="field" for="ranking_search">${escapeHtml(text.search)}<input id="ranking_search" type="search" autocomplete="off"></label></div><p>${escapeHtml(text.coverageRule)}</p><div class="table-wrap"><table><thead><tr><th>${escapeHtml(text.position)}</th><th>${escapeHtml(text.countries)}</th><th>${escapeHtml(text.year)}</th><th>${escapeHtml(text.value)}</th></tr></thead><tbody id="rankings_body">${rows}</tbody></table></div></section><section class="source-box"><p>${escapeHtml(text.sourceText)}</p><a href="${Object.values(DATA_PAGES).find(page=>page.indicator===item.slug)[language]}">${escapeHtml(localized.name)}</a></section>`;const routes=Object.fromEntries(Object.keys(DATA_LANGUAGES).map(code=>[code,DATA_PAGES.rankings[code]]));return pageChrome({language,pageKey:'rankings',routes,title:text.rankingsTitle,description:text.rankingsDesc,body,schemaType:'CollectionPage'});}

async function writeIfChanged(path, content) {
  let previous = null;
  try { previous = await readFile(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous === content) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  return true;
}

export async function prerender() {
  const registry = await readJson(join(ROOT, 'assets/data/indicators.json'));
  const countryPayload = await readJson(join(ROOT, 'assets/data/worldbank/countries.json'));
  const dataBySlug = new Map(await Promise.all(registry.indicators.map(async item => [
    item.slug,
    await readJson(join(ROOT, `assets/data/worldbank/${item.slug}.json`))
  ])));
  let changed = 0;
  for (const [pageKey,page] of Object.entries(DATA_PAGES).filter(([,candidate]) => candidate.indicator)) {
    const item = registry.indicators.find(candidate => candidate.slug === page.indicator);
    for (const language of Object.keys(DATA_LANGUAGES)) {
      const path = routeFile(page[language]);
      let html;
      if(!ORIGINAL_INDICATORS.has(item.slug))html=indicatorPage(language,pageKey,item,dataBySlug.get(item.slug),countryPayload.countries,registry);
      else html=await readFile(path,'utf8');
      html = replaceIndicatorSnapshot(html, snapshotForIndicator({ item, data: dataBySlug.get(item.slug), countries: countryPayload.countries, language }));
      html = html.replace(/data-explorer\.js\?v=[0-9-]+/g, `data-explorer.js?v=${ASSET_VERSION}`);
      if (await writeIfChanged(path, html)) changed++;
    }
  }
  for (const language of Object.keys(DATA_LANGUAGES)) {
    const path = routeFile(DATA_PAGES.explorer[language]);
    let html = await readFile(path, 'utf8');
    html = replaceExplorerSnapshot(html, explorerSnapshot(language, registry));
    html = html.replace(/data-explorer\.js\?v=[0-9-]+/g, `data-explorer.js?v=${ASSET_VERSION}`);
    if (await writeIfChanged(path, html)) changed++;
  }
  for(const language of Object.keys(DATA_LANGUAGES))if(await writeIfChanged(routeFile(DATA_PAGES.map[language]),mapPage(language,registry,countryPayload.countries,dataBySlug)))changed++;
  for(const language of Object.keys(DATA_LANGUAGES))if(await writeIfChanged(routeFile(DATA_PAGES.changes[language]),changesPage(language,registry,countryPayload.countries,dataBySlug)))changed++;
  const existingPages = Object.entries(DATA_PAGES).filter(([key]) => !['map','changes','countries', 'compare', 'rankings'].includes(key));
  for (const [key, page] of existingPages) for (const language of Object.keys(DATA_LANGUAGES)) {
    const path = routeFile(page[language]);
    let html = await readFile(path, 'utf8');
    html = injectSectionNav(html, language, key === 'explorer' ? 'explorer' : '');
    if (key === 'home') html = updateLanding(html, language, countryPayload.countries, registry);
    if (key === 'sources') html = updateSources(html, language, registry, dataBySlug);
    html = html.replace(/data\.css\?v=[0-9-]+/g, `data.css?v=${ASSET_VERSION}`).replace(/data-language\.js\?v=[0-9-]+/g, `data-language.js?v=${ASSET_VERSION}`).replace(/metaphai-logo\.css\?v=[0-9-]+/g,`metaphai-logo.css?v=${LOGO_VERSION}`);
    if (await writeIfChanged(path, html)) changed++;
  }
  for (const language of Object.keys(DATA_LANGUAGES)) {
    if (await writeIfChanged(routeFile(DATA_PAGES.countries[language]), countriesIndexPage(language, countryPayload.countries))) changed++;
    if (await writeIfChanged(routeFile(DATA_PAGES.compare[language]), comparePage(language, countryPayload.countries, registry, dataBySlug))) changed++;
    if (await writeIfChanged(routeFile(DATA_PAGES.rankings[language]), rankingsPage(language, countryPayload.countries, registry, dataBySlug))) changed++;
  }
  for (const country of VIEWS.validCountries(countryPayload.countries)) for (const language of Object.keys(DATA_LANGUAGES)) {
    if (await writeIfChanged(routeFile(countryRoute(language, country.id)), countryPage(language, country, countryPayload.countries, registry, dataBySlug))) changed++;
  }
  if (await updateSitemap(countryPayload.countries)) changed++;
  return changed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`Prerender de Datos globales actualizado en ${await prerender()} páginas.`);
}
