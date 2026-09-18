import { DATA_LANGUAGES } from './data-routes.mjs';
import { geographyItemRoute } from './geography-routes.mjs';
import { geographyText } from './geography-i18n.mjs';

const GEOGRAPHY_DATA_VERSION='20260918-4';
const root=document.querySelector('[data-geography-map]');
if(root){
  const language=document.documentElement.lang||'es',text=geographyText(language),locale=DATA_LANGUAGES[language]?.locale||'en-US',category=root.dataset.category||'all',itemId=root.dataset.item||'';
  const normalize=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const [topology,countriesPayload,...datasets]=await Promise.all([
    '/assets/maps/world-50m.topo.json','/assets/data/worldbank/countries.json',
    '/assets/data/geography/volcanoes.json','/assets/data/geography/mountains.json','/assets/data/geography/rivers.json','/assets/data/geography/deserts.json'
  ].map(url=>fetch(`${url}?v=${GEOGRAPHY_DATA_VERSION}`).then(response=>{if(!response.ok)throw new Error(`${url}: ${response.status}`);return response.json()})));
  const countryRows=countriesPayload.countries.filter(country=>!country.is_aggregate),countryById=new Map(countryRows.map(country=>[country.id,country])),displayNames=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames([locale],{type:'region'}):null,countryName=id=>{const row=countryById.get(id);return displayNames?.of(row?.iso2)||row?.name||id},entityLabel=item=>item.labels?.[language]||item.labels?.[language==='zh-CN'?'zh':language]||item.labels?.en||item.id;
  const [volcanoes,mountains,rivers,deserts]=datasets.map(data=>data.entities);
  const items=[...volcanoes,...mountains,...rivers,...deserts];
  const svg=d3.select(root).select('svg.geo-map'),width=960,height=540,countries=topojson.feature(topology,topology.objects.countries),land=topojson.feature(topology,topology.objects.land),projection=d3.geoNaturalEarth1().fitExtent([[12,12],[width-12,height-12]],countries),path=d3.geoPath(projection),viewport=svg.append('g').attr('class','geo-viewport');
  svg.attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label',text.interactiveMap);
  viewport.append('path').datum(land).attr('class','geo-land').attr('d',path);
  viewport.selectAll('.geo-country').data(countries.features).join('path').attr('class','geo-country').attr('d',path);
  viewport.append('path').datum(topojson.mesh(topology,topology.objects.countries)).attr('class','geo-borders').attr('d',path);
  const riverLayer=viewport.append('g').attr('class','geo-river-layer'),mountainLayer=viewport.append('g').attr('class','geo-mountain-layer'),volcanoLayer=viewport.append('g').attr('class','geo-volcano-layer'),desertLayer=viewport.append('g').attr('class','geo-desert-layer'),layers={volcano:volcanoLayer,mountain:mountainLayer,river:riverLayer,desert:desertLayer},mapWrap=root.querySelector('.geo-map-wrap'),popup=root.querySelector('[data-geo-popup]'),zoom=d3.zoom().scaleExtent([1,9]).on('zoom',event=>viewport.attr('transform',event.transform));
  svg.call(zoom).on('dblclick.zoom',null);
  const routes={volcano:'volcanoes',mountain:'mountains',river:'rivers',desert:'deserts'},layerNames={...routes},typeLabel=kind=>text[kind],countriesOf=item=>(item.countries||[]).map(countryName).join(' · '),elevationOf=item=>Number.isFinite(item.elevation_m)?`${new Intl.NumberFormat(locale).format(item.elevation_m)} m`:'',profile=item=>geographyItemRoute(language,routes[item.kind],item.id);
  let riverGeometryPromise=null;
  async function ensureRiverGeometry(){
    if(!riverGeometryPromise)riverGeometryPromise=fetch(`/assets/data/geography/rivers-50m.geojson?v=${GEOGRAPHY_DATA_VERSION}`).then(response=>{if(!response.ok)throw new Error(`rivers-50m.geojson: ${response.status}`);return response.json()}).then(geojson=>{
      const featureById=new Map(geojson.features.map(feature=>[feature.id,feature]));
      for(const item of rivers)item.feature=featureById.get(item.id);
      riverLayer.selectAll('path').data(rivers.filter(item=>item.feature)).join('path').attr('class','geo-river').attr('data-geo-id',item=>item.id).attr('d',item=>path(item.feature)).attr('tabindex',0).attr('aria-label',entityLabel).on('click',(event,item)=>showPopup(item,event)).on('keydown',(event,item)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showPopup(item,event)}});
      return geojson;
    });
    return riverGeometryPromise;
  }
  function representativePoint(item){if(item.kind!=='river')return projection(item.coordinates);const lines=item.feature?.geometry.coordinates||[],longest=lines.reduce((best,line)=>line.length>best.length?line:best,[]),coordinate=longest[Math.floor(longest.length/2)];return coordinate?projection(coordinate):projection(item.coordinates)}
  function markSelected(item){viewport.selectAll('.is-selected').classed('is-selected',false);layers[item.kind].selectAll('[data-geo-id]').filter(row=>row.id===item.id).classed('is-selected',true)}
  function popupPoint(item,event){const mapNode=svg.node(),wrapBox=mapWrap.getBoundingClientRect();if(event?.clientX!=null)return[event.clientX-wrapBox.left,event.clientY-wrapBox.top];const [x,y]=d3.zoomTransform(mapNode).apply(representativePoint(item)),mapBox=mapNode.getBoundingClientRect();return[mapBox.left-wrapBox.left+x/width*mapBox.width,mapBox.top-wrapBox.top+y/height*mapBox.height]}
  function showPopup(item,event){markSelected(item);const name=entityLabel(item),country=countriesOf(item),elevation=elevationOf(item),region=item.kind==='desert'?(item.continents||[]).map(value=>text[value]||value).join(' · '):'';popup.innerHTML=`<strong>${escapeHtml(name)}</strong>${country?`<span>${escapeHtml(country)}</span>`:''}${region?`<span>${escapeHtml(region)}</span>`:''}${elevation?`<span>${escapeHtml(elevation)}</span>`:''}<a href="${profile(item)}">${escapeHtml(text.viewProfile)} →</a>`;popup.hidden=false;const box=mapWrap.getBoundingClientRect(),point=popupPoint(item,event);popup.style.left=`${Math.max(12,Math.min(box.width-292,point[0]+10))}px`;popup.style.top=`${Math.max(12,Math.min(box.height-150,point[1]+10))}px`}
  function pointPath(kind,item){const [x,y]=projection(item.coordinates);if(kind==='volcano')return`M${x},${y-8}L${x-7},${y+6}L${x+7},${y+6}Z`;if(kind==='mountain')return`M${x},${y-8}L${x-7},${y+6}L${x},${y+2}L${x+7},${y+6}Z`;return`M${x-6},${y-6}L${x+6},${y-6}L${x+6},${y+6}L${x-6},${y+6}Z`}
  for(const [kind,data] of [['mountain',mountains],['volcano',volcanoes],['desert',deserts]])layers[kind].selectAll('path').data(data).join('path').attr('class',`geo-marker ${kind}`).attr('data-geo-id',item=>item.id).attr('d',item=>pointPath(kind,item)).attr('tabindex',0).attr('aria-label',entityLabel).on('click',(event,item)=>showPopup(item,event)).on('keydown',(event,item)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showPopup(item,event)}});
  async function setLayer(kind,on){if(kind==='river'&&on)await ensureRiverGeometry();layers[kind].style('display',on?null:'none');const button=root.querySelector(`[data-layer="${kind}"]`);if(!button)return;button.setAttribute('aria-pressed',String(on));const state=button.querySelector('[data-layer-state]');if(state)state.textContent=on?text.on:text.off}
  for(const button of root.querySelectorAll('[data-layer]'))button.addEventListener('click',async()=>setLayer(button.dataset.layer,button.getAttribute('aria-pressed')!=='true'));
  for(const kind of Object.keys(layers))await setLayer(kind,category==='all'?kind==='volcano':category===layerNames[kind]);
  root.querySelector('[data-zoom-in]')?.addEventListener('click',()=>svg.transition().duration(180).call(zoom.scaleBy,1.6));
  root.querySelector('[data-zoom-out]')?.addEventListener('click',()=>svg.transition().duration(180).call(zoom.scaleBy,.625));
  root.querySelector('[data-reset]')?.addEventListener('click',()=>{svg.transition().duration(180).call(zoom.transform,d3.zoomIdentity);popup.hidden=true;viewport.selectAll('.is-selected').classed('is-selected',false)});
  const input=root.querySelector('[data-geo-search]'),results=root.querySelector('[data-geo-results]'),searchPool=category==='all'?items:items.filter(item=>layerNames[item.kind]===category);
  function renderResults(){const query=normalize(input.value),matched=searchPool.filter(item=>normalize(`${entityLabel(item)} ${item.labels?.en||''} ${countriesOf(item)}`).includes(query)).sort((a,b)=>entityLabel(a).localeCompare(entityLabel(b),locale)).slice(0,40);results.innerHTML=matched.length?matched.map(item=>`<a href="${profile(item)}" data-result="${item.kind}:${item.id}"><strong>${escapeHtml(entityLabel(item))}</strong><small>${escapeHtml(typeLabel(item.kind))} · ${escapeHtml(countriesOf(item))}</small></a>`).join(''):`<span>${escapeHtml(text.noResults)}</span>`;results.hidden=false;for(const link of results.querySelectorAll('[data-result]'))link.addEventListener('click',async event=>{event.preventDefault();const [kind,id]=link.dataset.result.split(':'),item=items.find(row=>row.kind===kind&&row.id===id);await focusItem(item)})}
  input?.addEventListener('input',renderResults);input?.addEventListener('focus',renderResults);document.addEventListener('click',event=>{if(!event.target.closest('.geo-search'))results.hidden=true});
  async function focusItem(item){if(!item)return;await setLayer(item.kind,true);let bounds;if(item.kind==='river'&&item.feature)bounds=path.bounds(item.feature);else{const point=projection(item.coordinates),span=item.kind==='desert'?100:70;bounds=[[point[0]-span,point[1]-span*.65],[point[0]+span,point[1]+span*.65]]}const dx=bounds[1][0]-bounds[0][0],dy=bounds[1][1]-bounds[0][1],scale=Math.min(7,.85/Math.max(dx/width,dy/height)),translate=[width/2-scale*(bounds[0][0]+bounds[1][0])/2,height/2-scale*(bounds[0][1]+bounds[1][1])/2];svg.call(zoom.transform,d3.zoomIdentity.translate(...translate).scale(scale));results.hidden=true;input.value=entityLabel(item);showPopup(item)}
  if(itemId){const current=items.find(item=>item.id===itemId&&layerNames[item.kind]===category);if(current)setTimeout(()=>focusItem(current),0)}
}
