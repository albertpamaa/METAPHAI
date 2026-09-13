import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as CORE from '../assets/js/data-core.mjs';
import { languageConfig } from '../assets/js/data-i18n.mjs';
import { indicatorPresentation } from '../assets/js/data-presentation.mjs';
import { DATA_LANGUAGES, DATA_PAGES } from '../assets/js/data-routes.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const START = '<!-- DATA_PRERENDER:START -->';
const END = '<!-- DATA_PRERENDER:END -->';
const ASSET_VERSION = '20260913-3';

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
  const indicators = registry.indicators.map(item => {
    const localized = i18n.indicators[item.slug] || item;
    const page = Object.values(DATA_PAGES).find(candidate => candidate.indicator === item.slug);
    return `<li><a href="${page[language]}"><strong>${escapeHtml(localized.name)}</strong></a> — ${escapeHtml(localized.description)}</li>`;
  }).join('');
  const cautions = registry.indicators.map(item => {
    const localized = i18n.indicators[item.slug] || item;
    return `<li><strong>${escapeHtml(localized.name)}:</strong> ${escapeHtml(localized.methodology)}</li>`;
  }).join('');
  const features = [i18n.ranking, i18n.compareCountries, i18n.rangeAll, i18n.downloadCsv]
    .map(value => `<li>${escapeHtml(value)}</li>`).join('');
  return `${START}<section class="method data-prerender explorer-prerender" data-prerender-snapshot>
    <h2>${escapeHtml(i18n.indicator)}</h2><ul>${indicators}</ul>
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

async function writeIfChanged(path, content) {
  const previous = await readFile(path, 'utf8');
  if (previous === content) return false;
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
  for (const page of Object.values(DATA_PAGES).filter(candidate => candidate.indicator)) {
    const item = registry.indicators.find(candidate => candidate.slug === page.indicator);
    for (const language of Object.keys(DATA_LANGUAGES)) {
      const path = routeFile(page[language]);
      let html = await readFile(path, 'utf8');
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
  return changed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`Prerender de Datos globales actualizado en ${await prerender()} páginas.`);
}
