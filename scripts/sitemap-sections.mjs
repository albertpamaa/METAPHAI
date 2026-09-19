export const ORIGIN='https://metaphai.com';
export const SITEMAP_SECTIONS={
  calculadoras:'sitemap-calculadoras.xml',
  datos:'sitemap-datos-globales.xml',
  geografia:'sitemap-geografia.xml',
  juegos:'sitemap-juegos.xml',
  institucional:'sitemap-institucional.xml'
};
export const sectionPath=(root,section)=>`${root}/sitemaps/${SITEMAP_SECTIONS[section]}`;
export const urlset=body=>`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body.trim()}\n</urlset>\n`;
export const sitemapIndex=()=>`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.values(SITEMAP_SECTIONS).map(file=>`  <sitemap><loc>${ORIGIN}/sitemaps/${file}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
export const urlEntries=xml=>[...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map(match=>match[0]);
export const entryLocation=entry=>entry.match(/<loc>([^<]+)<\/loc>/)?.[1]||'';
