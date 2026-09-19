import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DATA_PAGES,INSTITUTIONAL_PAGES} from '../assets/js/data-routes.mjs';
import {ORIGIN,SITEMAP_SECTIONS,entryLocation,sectionPath,sitemapIndex,urlEntries,urlset} from './sitemap-sections.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const marker=(xml,name)=>xml.match(new RegExp(`<!-- ${name}:START -->([\\s\\S]*?)<!-- ${name}:END -->`))?.[1]||'';
const locations=entries=>entries.map(entryLocation);
const assertUnique=entries=>{const urls=locations(entries);if(urls.some(url=>!url.startsWith(`${ORIGIN}/`)||new URL(url).search||new URL(url).hash)||new Set(urls).size!==urls.length)throw Error('Invalid or duplicate sitemap URL');return urls};
const writeIfChanged=async(path,content)=>{let previous='';try{previous=await readFile(path,'utf8')}catch{}if(previous===content)return false;await mkdir(dirname(path),{recursive:true});await writeFile(path,content,'utf8');return true};

export async function splitSitemap(){
  const indexPath=join(ROOT,'sitemap.xml'),current=await readFile(indexPath,'utf8');
  if(current.includes('<sitemapindex')){
    const counts={};for(const [section] of Object.entries(SITEMAP_SECTIONS)){const xml=await readFile(sectionPath(ROOT,section),'utf8');counts[section]=assertUnique(urlEntries(xml)).length}
    return{changed:Number(await writeIfChanged(indexPath,sitemapIndex())),counts};
  }
  if(!current.includes('<urlset'))throw Error('Expected original sitemap urlset');
  const game=urlEntries(marker(current,'GAMES_SITEMAP')),geo=urlEntries(marker(current,'GEOGRAPHY_SITEMAP')),generatedData=urlEntries(marker(current,'DATA_COUNTRY_SITEMAP'));
  if(!game.length||!geo.length||!generatedData.length)throw Error('Missing original section markers');
  const base=urlEntries(current.replace(/<!-- (?:GAMES_SITEMAP|GEOGRAPHY_SITEMAP|DATA_COUNTRY_SITEMAP):START -->[\s\S]*?<!-- (?:GAMES_SITEMAP|GEOGRAPHY_SITEMAP|DATA_COUNTRY_SITEMAP):END -->/g,''));
  const dataRoutes=new Set(Object.values(DATA_PAGES).flatMap(routes=>Object.values(routes).filter(value=>typeof value==='string'&&value.startsWith('/'))));
  const institutionalRoutes=new Set([INSTITUTIONAL_PAGES.contact,INSTITUTIONAL_PAGES.about].flatMap(routes=>Object.values(routes)));
  const sections={calculadoras:[],datos:[],geografia:geo,juegos:game,institucional:[]};
  for(const entry of base){const route=new URL(entryLocation(entry)).pathname;
    if(route==='/'||institutionalRoutes.has(route))sections.institucional.push(entry);
    else if(dataRoutes.has(route))sections.datos.push(entry);
    else if(/^\/(?:calculadoras\/|calculadora-|simulador-|planificador-|calendarios-laborales\/)/.test(route))sections.calculadoras.push(entry);
    else throw Error(`Unclassified sitemap URL: ${route}`);
  }
  sections.datos.push(...generatedData);
  const before=assertUnique(urlEntries(current)),after=assertUnique(Object.values(sections).flat());
  const afterSet=new Set(after);if(before.length!==after.length||new Set(before).size!==afterSet.size||before.some(url=>!afterSet.has(url)))throw Error('Sitemap URLs changed during split');
  let changed=0;for(const [section,entries] of Object.entries(sections)){
    if(!entries.length)throw Error(`Empty sitemap: ${section}`);
    const body=section==='datos'?`${sections.datos.slice(0,sections.datos.length-generatedData.length).join('\n')}\n<!-- DATA_COUNTRY_SITEMAP:START -->\n${generatedData.join('\n')}\n<!-- DATA_COUNTRY_SITEMAP:END -->`:entries.join('\n');
    changed+=Number(await writeIfChanged(sectionPath(ROOT,section),urlset(body)));
  }
  changed+=Number(await writeIfChanged(indexPath,sitemapIndex()));
  return{changed,counts:Object.fromEntries(Object.entries(sections).map(([section,entries])=>[section,entries.length])),total:before.length};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log(JSON.stringify(await splitSitemap()));
