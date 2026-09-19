import {readFileSync} from 'node:fs';
import {sectionPath,SITEMAP_SECTIONS} from '../scripts/sitemap-sections.mjs';

// Existing section tests inspect URL blocks; the index itself contains only child-sitemap links.
export const readSitemapEntries=root=>Object.keys(SITEMAP_SECTIONS).map(section=>readFileSync(sectionPath(root,section),'utf8')).join('\n');
