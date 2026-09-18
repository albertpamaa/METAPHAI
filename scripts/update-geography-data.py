"""Build and validate the independent Geography data snapshot.

Network refreshes use only Wikidata (CC0). River geometry is selected from the
bundled Natural Earth 1:50m river/lake-centerline file (public domain).

Usage:
  python scripts/update-geography-data.py             # validate local snapshot
  python scripts/update-geography-data.py --refresh   # refresh from Wikidata
"""
from __future__ import annotations

import argparse
import gzip
import json
import math
import re
import shutil
import tempfile
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'data'/'geography'
RIVER_BASELINE=OUT/'river-baseline.json'
COUNTRIES=ROOT/'assets'/'data'/'worldbank'/'countries.json'
NATURAL_EARTH=ROOT/'assets'/'maps'/'natural-earth-rivers-50m.geojson'
LANGS=['en','es','fr','de','it','pt','ru','zh','hi','ja','ko','ca','ar','id','bn']
ROOT_CLASSES={'volcano':'Q8072','mountain':'Q8502','river':'Q4022','desert':'Q8514'}
TARGETS={'volcano':60,'mountain':60,'river':120,'desert':35}
FILES={'volcano':'volcanoes.json','mountain':'mountains.json','river':'rivers.json','desert':'deserts.json'}
CONTINENTS={'Q15':'africa','Q46':'europe','Q48':'asia','Q49':'america','Q18':'america','Q538':'oceania','Q51':'antarctica'}
VOLCANO_TYPES={'Q8072','Q169358','Q1330974','Q131681'}
RIVER_OVERRIDES={
    'chang jiang':'yangtze','yangtze river':'yangtze','yellow river':'huang','ganges':'ganga',
    'congo river':'congo','zaire river':'congo','irrawaddy':'ayeyarwady','euphrates':'al furat',
    'tigris river':'tigris','dnieper':'dnieper','dnipro':'dnieper','yenisei':'yenisey',
    'rhine':'rhein','amazon':'amazonas','zambezi':'zambezi','danube':'danube','volga':'volga',
    'parana':'parana','niger river':'niger','mekong river':'mekong','nile river':'nile',
    'rio grande':'rio grande','murray river':'murray','indus river':'indus','ob river':'ob',
    'amur river':'amur','mackenzie river':'mackenzie','mississippi river':'mississippi',
    'missouri river':'missouri','colorado river':'colorado','columbia river':'columbia',
    'orange river':'orange','ural river':'ural','jordan river':'jordan','volta river':'volta',
    'dniester':'dniester','vistula':'vistula','tagus':'tajo','sao francisco river':'sao francisco',
    'tocantins river':'tocantins','orinoco':'orinoco','lena river':'lena','aldan river':'aldan',
    'syr darya':'syr darya','amu darya':'amu darya','krishna river':'krishna',
    'godavari river':'godavari','brahmaputra':'brahmaputra','red river':'red',
    'salween':'salween','chao phraya':'chao phraya','fraser river':'fraser',
    'saskatchewan river':'saskatchewan','nelson river':'nelson','yukon river':'yukon',
    'arkansas river':'arkansas','ohio river':'ohio','tennessee river':'tennessee',
    'rio de la plata':'rio de la plata','limpopo river':'limpopo','okavango':'okavango',
    'senegal river':'senegal','gambia river':'gambia','shannon':'shannon','po river':'po',
    'rhone':'rhone','elbe':'elbe','oder':'oder','don river':'don'
}

# Reviewed identity mappings for the large river systems explicitly audited by
# MetaphAI.  Natural Earth names are generation-time identifiers only; the QID
# remains the semantic identity.  Entries without a safe named Natural Earth
# feature are kept in MAJOR_RIVER_AUDIT below, not published approximately.
RIVER_EXPLICIT_MAPPINGS={
    'Q3783':['Amazonas'], 'Q131792':['Orinoco'], 'Q127892':['Paraná'],
    'Q18278':['Uruguay'], 'Q142148':['São  Francisco'], 'Q191829':['Magdalena'],
    'Q156054':['Tocantins'], 'Q171847':['Araguaia'], 'Q118251':['Madeira'],
    'Q752674':['Tapajós'], 'Q49544':['Xingu'], 'Q26271':['Purús'],
    'Q1497':['Mississippi'], 'Q5419':['Missouri'],
    'Q4915':['Ohio'], 'Q8319':['Arkansas'],
    'Q160636':['Rio Grande'], 'Q1265':['Colorado'], 'Q2251':['Columbia'],
    'Q272074':['Snake'], 'Q104437':['Yukon'], 'Q3411':['Mackenzie'],
    'Q3047':['Saskatchewan'], 'Q269710':['Fraser'], 'Q3292':['Nelson'],
    'Q3392':['Nile'], 'Q4814791':['White Nile'], 'Q882739':['Blue Nile'],
    'Q3503':['Congo'], 'Q3542':['Niger'], 'Q43106':['Zambezi'],
    'Q181475':['Orange'], 'Q173017':['Limpopo'], 'Q3569':['Sénégal'],
    'Q192415':['Volta'], 'Q1259188':['White Volta'], 'Q1256528':['Black Volta'],
    'Q204806':['Benue','Bénoué'], 'Q171649':['Ubangi'], 'Q186541':['Kasai'],
    'Q188773':['Okavango','Cubango'], 'Q138491':['Jubba'],
    'Q1653':['Danube','Donau'], 'Q41179':['Mekong'],
    'Q584':['Rhine','Rhein','Rhin'], 'Q626':['Volga']
}
PROTECTED_RIVERS={'Q3783','Q1653','Q41179','Q3542','Q127892','Q584','Q43106','Q626'}
KNOWN_FALSE_POSITIVE_MAPPINGS={
    'Q11087615':'chang jiang','Q1108959':'kem','Q11728226':'jordan','Q21198444':'rhin',
    'Q21409625':'congo','Q21860134':'volta','Q22625143':'gan','Q23021556':'la grande riviere',
    'Q24004927':'rhein','Q2599627':'yarlung','Q2624925':'naryn','Q2995554':'lom',
    'Q31970682':'donau','Q32225053':'amur','Q34765748':'chari','Q34924351':'tanana',
    'Q36190139':'meta','Q36234629':'ural','Q36318495':'lena','Q36396131':'kamchatka',
    'Q37755556':'yenisey','Q3995693':'verde','Q4054234':'abay','Q4363930':'pit',
    'Q4458127':'tisa','Q6115455':'negro','Q6115632':'salado','Q95629532':'san juan'
}
MAJOR_RIVER_AUDIT=[
    ('Amazonas','Q3783',['Amazonas']),('Orinoco','Q131792',['Orinoco']),
    ('Paraná','Q127892',['Paraná']),('Paraguay','Q179396',[]),
    ('Uruguay','Q18278',['Uruguay']),('São Francisco','Q142148',['São  Francisco']),
    ('Magdalena','Q191829',['Magdalena']),('Tocantins','Q156054',['Tocantins']),
    ('Araguaia','Q171847',['Araguaia']),('Negro',None,['Negro']),
    ('Madeira','Q118251',['Madeira']),('Tapajós','Q752674',['Tapajós']),
    ('Xingu','Q49544',['Xingu']),('Purús','Q26271',['Purús']),('Juruá','Q117526',[]),
    ('Mississippi','Q1497',['Mississippi']),('Missouri','Q5419',['Missouri']),
    ('Ohio','Q4915',['Ohio']),('Arkansas','Q8319',['Arkansas']),
    ('Red River','Q156032',[]),('Rio Grande / Río Bravo','Q160636',['Rio Grande']),
    ('Colorado','Q1265',['Colorado']),('Columbia','Q2251',['Columbia']),
    ('Snake','Q272074',['Snake']),('Yukon','Q104437',['Yukon']),
    ('Mackenzie','Q3411',['Mackenzie']),('Saskatchewan','Q3047',['Saskatchewan']),
    ('Fraser','Q269710',['Fraser']),('Nelson','Q3292',['Nelson']),
    ('Nilo','Q3392',['Nile']),('Nilo Blanco','Q4814791',['White Nile']),
    ('Nilo Azul','Q882739',['Blue Nile']),('Congo','Q3503',['Congo']),
    ('Níger','Q3542',['Niger']),('Zambeze','Q43106',['Zambezi']),
    ('Orange','Q181475',['Orange']),('Limpopo','Q173017',['Limpopo']),
    ('Senegal','Q3569',['Sénégal']),('Gambia','Q160819',[]),
    ('Volta','Q192415',['Volta']),('Volta Blanco','Q1259188',['White Volta']),
    ('Volta Negro','Q1256528',['Black Volta']),('Benue','Q204806',['Benue','Bénoué']),
    ('Ubangi','Q171649',['Ubangi']),('Kasai','Q186541',['Kasai']),
    ('Okavango','Q188773',['Okavango','Cubango']),('Rufiji','Q936023',[]),
    ('Jubba','Q138491',['Jubba']),('Shabelle','Q141915',[])
]

def load(path:Path): return json.loads(path.read_text(encoding='utf-8'))
def dump(path:Path,data): path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def request_json(url):
    for attempt in range(4):
        try:
            request=url if isinstance(url,urllib.request.Request) else urllib.request.Request(url,headers={'User-Agent':'MetaphAI-Geography/2.0 (info@metaphai.com)','Accept-Encoding':'gzip'})
            with urllib.request.urlopen(request,timeout=180) as response:
                body=response.read()
                if response.headers.get('Content-Encoding')=='gzip': body=gzip.decompress(body)
            return json.loads(body)
        except Exception:
            if attempt==3:raise
            time.sleep(4*(attempt+1))
def sparql(query:str):
    if len(query)<4000:
        target='https://query.wikidata.org/sparql?format=json&query='+urllib.parse.quote(query)
    else:
        data=urllib.parse.urlencode({'format':'json','query':query}).encode('utf-8')
        target=urllib.request.Request('https://query.wikidata.org/sparql',data=data,headers={'User-Agent':'MetaphAI-Geography/2.1 (info@metaphai.com)','Accept-Encoding':'gzip','Content-Type':'application/x-www-form-urlencoded'})
    return request_json(target)['results']['bindings']
def point(value:str):
    match=re.fullmatch(r'Point\(([-+0-9.eE]+) ([-+0-9.eE]+)\)',value)
    if not match: return None
    return [float(match.group(1)),float(match.group(2))]
def norm(value:str):
    value=''.join(char for char in unicodedata.normalize('NFD',value) if unicodedata.category(char)!='Mn').lower()
    value=re.sub(r"\b(the|river|rio|rivière|fleuve|fluss|río|река)\b",' ',value)
    return re.sub(r'[^a-z0-9]+',' ',value).strip()
def entity_payload(ids,props='labels|aliases|claims'):
    output={}
    for start in range(0,len(ids),40):
        params=urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(ids[start:start+40]),'props':props,'languages':'|'.join(LANGS),'format':'json','origin':'*'})
        payload=request_json('https://www.wikidata.org/w/api.php?'+params)
        for qid,entity in payload['entities'].items():
            labels={('zh-CN' if code=='zh' else code):row['value'] for code,row in entity.get('labels',{}).items()}
            aliases=[row['value'] for row in entity.get('aliases',{}).get('en',[])]
            output[qid]={'labels':labels,'aliases':aliases,'claims':entity.get('claims',{})}
    return output
def entity_claims(claims,prop):
    values=[]
    for claim in claims.get(prop,[]):
        value=claim.get('mainsnak',{}).get('datavalue',{}).get('value')
        if isinstance(value,dict) and value.get('entity-type')=='item':values.append('Q'+str(value['numeric-id']))
    return values
def quantity_claim(claims,prop):
    for claim in claims.get(prop,[]):
        value=claim.get('mainsnak',{}).get('datavalue',{}).get('value')
        if isinstance(value,dict) and 'amount' in value:
            try:return float(value['amount'])
            except ValueError:pass
    return None
def normalized_quantity(claims,prop,units):
    for claim in claims.get(prop,[]):
        value=claim.get('mainsnak',{}).get('datavalue',{}).get('value')
        if not isinstance(value,dict) or 'amount' not in value:continue
        unit=str(value.get('unit','')).rsplit('/',1)[-1]
        if unit not in units:continue
        try:return float(value['amount'])*units[unit]
        except (TypeError,ValueError):continue
    return None
def query_candidates(kind):
    if kind=='river':return query_river_candidates()
    exclude=''
    query=f'''SELECT ?item ?itemLabel ?coord ?sitelinks WHERE {{
      ?item wdt:P31 wd:{ROOT_CLASSES[kind]}; wdt:P625 ?coord; wikibase:sitelinks ?sitelinks.
      {exclude} FILTER(?sitelinks >= 5)
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }} ORDER BY DESC(?sitelinks) LIMIT 180'''
    print(f'Wikidata candidates: {kind}',flush=True)
    grouped={}
    for row in sparql(query):
        qid=row['item']['value'].rsplit('/',1)[-1]
        grouped.setdefault(qid,{'id':qid,'kind':kind,'name_en':row['itemLabel']['value'],'coordinates':point(row['coord']['value']),'sitelinks':int(row['sitelinks']['value'])})
    candidates=[]
    for item in grouped.values():
        if not item['coordinates']:continue
        lon,lat=item['coordinates']
        if not(-180<=lon<=180 and -90<=lat<=90):continue
        candidates.append(item)
    return sorted(candidates,key=lambda row:(-row['sitelinks'],row['id']))
def query_river_candidates():
    source=load(NATURAL_EARTH)
    names=sorted({name.strip() for feature in source['features'] for field in ('name','name_en','name_alt') if isinstance((name:=feature['properties'].get(field)),str) and name.strip()})
    grouped={};print('Wikidata candidates: river (Natural Earth labels/aliases + reviewed QIDs)',flush=True)
    # Natural Earth -> Wikidata: exact labels and aliases in the site's real
    # languages.  This is candidate discovery only; spatial and identity checks
    # below decide whether a permanent explicit mapping may be published.
    for start in range(0,len(names),20):
        literals=' '.join(f'{json.dumps(name,ensure_ascii=False)}@{language}' for name in names[start:start+20] for language in LANGS)
        query=f'''SELECT DISTINCT ?item ?itemLabel ?coord ?sitelinks WHERE {{ VALUES ?name {{ {literals} }} {{ ?item rdfs:label ?name. }} UNION {{ ?item skos:altLabel ?name. }} ?item wdt:P31 wd:Q4022; wdt:P625 ?coord; wikibase:sitelinks ?sitelinks. SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }} }}'''
        for row in sparql(query):
            qid=row['item']['value'].rsplit('/',1)[-1]
            grouped.setdefault(qid,{'id':qid,'kind':'river','name_en':row['itemLabel']['value'],'coordinates':point(row['coord']['value']),'sitelinks':int(row['sitelinks']['value'])})
    # Reviewed major systems and the permanent published baseline must never be
    # lost merely because a label changes upstream.
    seed_ids=set(RIVER_EXPLICIT_MAPPINGS)|set(KNOWN_FALSE_POSITIVE_MAPPINGS)
    if RIVER_BASELINE.exists():seed_ids.update(load(RIVER_BASELINE)['ids'])
    for start in range(0,len(seed_ids),60):
        values=' '.join('wd:'+qid for qid in sorted(seed_ids)[start:start+60])
        query=f'''SELECT ?item ?itemLabel ?coord ?sitelinks WHERE {{ VALUES ?item {{ {values} }} ?item wdt:P31/wdt:P279* wd:Q4022; wdt:P625 ?coord; wikibase:sitelinks ?sitelinks. SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }} }}'''
        for row in sparql(query):
            qid=row['item']['value'].rsplit('/',1)[-1]
            grouped.setdefault(qid,{'id':qid,'kind':'river','name_en':row['itemLabel']['value'],'coordinates':point(row['coord']['value']),'sitelinks':int(row['sitelinks']['value'])})['_class_root_validated']=True
    return sorted((item for item in grouped.values() if item['coordinates']),key=lambda row:(-row['sitelinks'],row['id']))
def hydrate(candidates,payload,country_payload):
    valid_countries={row['id'] for row in load(COUNTRIES)['countries'] if not row['is_aggregate']}
    output=[]
    for item in candidates:
        claims=payload[item['id']]['claims'];countries=set();continents=set()
        for country_qid in entity_claims(claims,'P17'):
            country_claims=country_payload.get(country_qid,{}).get('claims',{})
            for claim in country_claims.get('P298',[]):
                code=claim.get('mainsnak',{}).get('datavalue',{}).get('value')
                if isinstance(code,str) and code.upper() in valid_countries:countries.add(code.upper())
            for continent_qid in entity_claims(country_claims,'P30'):
                if continent_qid in CONTINENTS:continents.add(CONTINENTS[continent_qid])
        if not countries or not continents:continue
        item['countries']=sorted(countries);item['continents']=sorted(continents);item['instance_of']=sorted(set(entity_claims(claims,'P31'))|({ROOT_CLASSES[item['kind']]} if item.pop('_class_root_validated',False) else set()))
        elevation=quantity_claim(claims,'P2044')
        if elevation is not None and math.isfinite(elevation) and -500<=elevation<=9000:item['elevation_m']=round(elevation)
        if item['kind']=='river':
            length=normalized_quantity(claims,'P2043',{'Q11573':.001,'Q828224':1,'Q174728':1.609344})
            if length is not None and math.isfinite(length) and 1<=length<=10000:item['length_km']=round(length,1);item['length_source']='wikidata:P2043'
            item['_source_ids']=entity_claims(claims,'P885')[:3];item['_mouth_ids']=entity_claims(claims,'P403')[:3]
        if item['kind']=='desert':
            area=normalized_quantity(claims,'P2046',{'Q712226':1,'Q25343':.000001})
            if area is not None and math.isfinite(area) and 1<=area<=20_000_000:item['area_km2']=round(area,1);item['area_source']='wikidata:P2046'
        output.append(item)
    return output
def balanced(candidates,target):
    selected=[];seen=set();counts=defaultdict(int)
    for minimum in (4,8,12,999):
        for item in candidates:
            if item['id'] in seen:continue
            continent=item['continents'][0]
            if minimum!=999 and counts[continent]>=minimum:continue
            selected.append(item);seen.add(item['id']);counts[continent]+=1
            if len(selected)>=target:return selected
    return selected
def enrich(items,label_payload):
    for item in items:
        labels=label_payload[item['id']]['labels']
        labels.setdefault('en',item.pop('name_en'))
        item['labels']=labels;item.pop('sitelinks',None)
        item['source']='wikidata';item['validation']={'class_root':ROOT_CLASSES[item['kind']],'instance_of':item.pop('instance_of'),'status':'validated'}
    return items
def enrich_river_endpoints(items,label_payload):
    endpoint_ids=sorted({qid for item in items for qid in [*item.pop('_source_ids',[]),*item.pop('_mouth_ids',[])]})
    endpoints=entity_payload(endpoint_ids,props='labels') if endpoint_ids else {}
    for item in items:
        claims=label_payload[item['id']]['claims']
        for field,prop in [('sources','P885'),('mouths','P403')]:
            values=[]
            for qid in entity_claims(claims,prop)[:3]:
                labels=endpoints.get(qid,{}).get('labels',{})
                if labels.get('en'):values.append({'id':qid,'labels':labels})
            if values:item[field]=values
    return items
def natural_earth_index():
    source=load(NATURAL_EARTH);index=defaultdict(list)
    for feature in source['features']:
        props=feature['properties'];names=[props.get('name'),props.get('name_en'),props.get('name_alt')]
        for name in filter(None,names):
            for part in re.split(r'[,;/]',name):
                key=norm(part)
                if key:index[key].append(feature)
    return source,index
def feature_distance(point_value,features):
    lon,lat=point_value;best=math.inf
    for feature in features:
        values=list(flatten(feature['geometry']['coordinates']))
        if len(values)<2:continue
        xs=values[0::2];ys=values[1::2]
        dx=max(min(xs)-lon,0,lon-max(xs));dy=max(min(ys)-lat,0,lat-max(ys))
        best=min(best,math.hypot(dx*math.cos(math.radians(lat)),dy))
    return best
def feature_stats(features):
    points=[]
    for feature in features:
        values=list(flatten(feature['geometry']['coordinates']))
        points.extend(zip(values[0::2],values[1::2]))
    if not points:return {'bounds':None,'centroid':None}
    xs=[point[0] for point in points];ys=[point[1] for point in points]
    return {'bounds':[round(min(xs),6),round(min(ys),6),round(max(xs),6),round(max(ys),6)],'centroid':[round(sum(xs)/len(xs),6),round(sum(ys)/len(ys),6)]}
def river_match(candidates,labels,index):
    matched=[];used_features=set();rejected=defaultdict(int);spatial_rejections=[];historical_false_positives=[]
    # Reviewed mappings go first; remaining exact multilingual label/alias
    # matches are accepted only when the Wikidata coordinate is spatially
    # compatible with the Natural Earth feature.
    ordered=sorted(candidates,key=lambda item:(item['id'] not in RIVER_EXPLICIT_MAPPINGS,-item['sitelinks'],item['id']))
    for item in ordered:
        entity_labels=labels[item['id']]['labels'];aliases=labels[item['id']]['aliases']
        if item['id'] in KNOWN_FALSE_POSITIVE_MAPPINGS:
            key=KNOWN_FALSE_POSITIVE_MAPPINGS[item['id']];features=list({id(feature):feature for feature in index.get(key,[])}.values())
            historical_false_positives.append({'qid':item['id'],'label':item['name_en'],'wikidata_coordinates':item['coordinates'],'natural_earth_names':[key],'distance_degrees_approx':round(feature_distance(item['coordinates'],features),3) if features else None,**feature_stats(features),'decision':'excluded_known_historical_false_positive'})
            rejected['known_historical_false_positive']+=1;continue
        explicit=RIVER_EXPLICIT_MAPPINGS.get(item['id'])
        if explicit:
            keys=[norm(name) for name in explicit]
        else:
            names=[item['name_en'],*entity_labels.values(),*aliases];keys=[]
            for name in names:
                key=norm(name);keys.extend([key,norm(RIVER_OVERRIDES.get(key,''))])
        keys=list(dict.fromkeys(key for key in keys if key and key in index))
        if not keys:rejected['no_name_match']+=1;continue
        features=[];matched_keys=[]
        for key in keys:
            available=[feature for feature in index[key] if id(feature) not in used_features]
            if available:features.extend(available);matched_keys.append(key)
            if explicit and available:continue
            if available:break
        features=list({id(feature):feature for feature in features}.values())
        if not features:rejected['feature_already_mapped']+=1;continue
        distance=feature_distance(item['coordinates'],features)
        if distance>8:
            rejected['spatial_mismatch']+=1
            spatial_rejections.append({'qid':item['id'],'label':item['name_en'],'wikidata_coordinates':item['coordinates'],'natural_earth_names':matched_keys,'distance_degrees_approx':round(distance,3),**feature_stats(features),'decision':'excluded_spatial_mismatch'})
            continue
        coordinates=[]
        for feature in features:
            geometry=feature['geometry']
            if geometry['type']=='LineString' and len(geometry['coordinates'])>=2:coordinates.append(geometry['coordinates'])
            elif geometry['type']=='MultiLineString':coordinates.extend(line for line in geometry['coordinates'] if len(line)>=2)
        if not coordinates:rejected['empty_geometry']+=1;continue
        item['natural_earth_name']=matched_keys[0];item['natural_earth_names']=matched_keys
        item['geometry_segments']=len(coordinates);item['_geometry']={'type':'MultiLineString','coordinates':coordinates}
        matched.append(item);used_features.update(id(feature) for feature in features)
    return matched,dict(rejected),sorted(spatial_rejections,key=lambda row:(-row['distance_degrees_approx'],row['qid'])),sorted(historical_false_positives,key=lambda row:row['qid'])
def river_region(features):
    points=[]
    for feature in features:
        values=list(flatten(feature['geometry']['coordinates']))
        points.extend(zip(values[0::2],values[1::2]))
    if not points:return 'unknown'
    lon=sum(point[0] for point in points)/len(points);lat=sum(point[1] for point in points)/len(points)
    if lat<=-60:return 'antarctica'
    if -25<=lon<=45 and lat>=35:return 'europe'
    if -90<=lon<=-30 and -60<=lat<15:return 'south_america'
    if -170<=lon<=-50 and lat>=15:return 'north_america'
    if -20<=lon<=34 and -38<=lat<35:return 'africa'
    if 110<=lon<=180 and -50<=lat<0:return 'oceania'
    return 'asia'
def river_audit(source,index,candidates,selected,rejected,spatial_rejections,historical_false_positives):
    named=[feature for feature in source['features'] if any(feature['properties'].get(field) for field in ('name','name_en','name_alt'))]
    named_by_region=defaultdict(int)
    for feature in named:named_by_region[river_region([feature])]+=1
    published_by_region=defaultdict(int)
    for item in selected:
        features=[]
        for key in item['natural_earth_names']:features.extend(index[key])
        published_by_region[river_region(list({id(feature):feature for feature in features}.values()))]+=1
    published_ids={item['id'] for item in selected}
    major=[]
    for name,qid,names in MAJOR_RIVER_AUDIT:
        keys=[norm(value) for value in names]
        if not keys:status='excluded';reason='no_named_natural_earth_feature'
        elif qid is None:status='excluded';reason='ambiguous_natural_earth_name'
        elif qid in published_ids:status='published';reason='validated_explicit_mapping'
        else:status='excluded';reason='wikidata_identity_or_spatial_validation_failed'
        major.append({'name':name,'qid':qid,'natural_earth_names':names,'status':status,'reason':reason})
    named_names=sorted({norm(value) for feature in named for field in ('name','name_en','name_alt') if (value:=feature['properties'].get(field)) and norm(value)})
    return {
        'natural_earth_features':len(source['features']),
        'natural_earth_named_features':len(named),
        'natural_earth_unique_normalized_names':len(named_names),
        'wikidata_candidates':len(candidates),
        'valid_mappings':len(selected),'published':len(selected),
        'unpublished_named_features':len(named)-len({id(feature) for item in selected for key in item['natural_earth_names'] for feature in index[key]}),
        'named_features_by_region':dict(sorted(named_by_region.items())),
        'published_by_region':dict(sorted(published_by_region.items())),
        'rejected_candidates':rejected,'spatial_rejections':spatial_rejections,'historical_false_positives':historical_false_positives,'major_rivers':major,
        'name_fields':['name','name_en','name_alt'],
        'non_name_fields_inspected':['note','featurecla','scalerank','min_zoom','min_label']
    }
def refresh(rivers_only=False):
    OUT.mkdir(parents=True,exist_ok=True)
    requested=('river',) if rivers_only else tuple(ROOT_CLASSES)
    candidates={kind:query_candidates(kind) for kind in requested}
    river_source,river_index=natural_earth_index()
    labels=entity_payload(sorted({row['id'] for rows in candidates.values() for row in rows}))
    country_qids=sorted({qid for entity in labels.values() for qid in entity_claims(entity['claims'],'P17')})
    country_payload=entity_payload(country_qids,props='claims')
    candidates={kind:hydrate(rows,labels,country_payload) for kind,rows in candidates.items()}
    if not rivers_only:
        volcano_ids={item['id'] for item in candidates['volcano']}
        candidates['mountain']=[item for item in candidates['mountain'] if item['id'] not in volcano_ids and not set(item['instance_of'])&VOLCANO_TYPES]
    for kind in candidates:
        candidates[kind]=[item for item in candidates[kind] if labels[item['id']]['labels'].get('en') and labels[item['id']]['labels']['en']!=item['id']]
    if not rivers_only:
        candidates['volcano']=[item for item in candidates['volcano'] if not re.search(r'\b(island|peninsula)\b|île',labels[item['id']]['labels']['en'],re.I)]
        candidates['desert']=[item for item in candidates['desert'] if not re.search(r'\b(peninsula|island)\b',labels[item['id']]['labels']['en'],re.I)]
        selected={kind:balanced(candidates[kind],TARGETS[kind]) for kind in ('volcano','mountain','desert')}
    else:selected={kind:load(OUT/FILES[kind])['entities'] for kind in ('volcano','mountain','desert')}
    selected['river'],river_rejected,spatial_rejections,historical_false_positives=river_match(candidates['river'],labels,river_index)
    audit=river_audit(river_source,river_index,candidates['river'],selected['river'],river_rejected,spatial_rejections,historical_false_positives)
    missing_protected=PROTECTED_RIVERS-{item['id'] for item in selected['river']}
    assert not missing_protected,f'protected rivers disappeared: {sorted(missing_protected)}'
    if RIVER_BASELINE.exists():
        missing_baseline=set(load(RIVER_BASELINE)['ids'])-{item['id'] for item in selected['river']}
        assert not missing_baseline,f'published river baseline disappeared without an explicit migration: {sorted(missing_baseline)}'
    with tempfile.TemporaryDirectory(prefix='.refresh-',dir=OUT) as temporary:
        staging=Path(temporary)
        for kind in ('volcano','mountain','desert'):
            if rivers_only:shutil.copyfile(OUT/FILES[kind],staging/FILES[kind]);continue
            enrich(selected[kind],labels)
            if kind=='desert':
                for item in selected[kind]:item['geometry_mode']='centroid'
            dump(staging/FILES[kind],{'schema_version':1,'kind':kind,'generated_at':str(date.today()),'sources':['wikidata'],'entities':selected[kind]})
        river_features=[]
        enrich_river_endpoints(selected['river'],labels)
        for item in enrich(selected['river'],labels):
            geometry=item.pop('_geometry');river_features.append({'type':'Feature','id':item['id'],'properties':{'qid':item['id'],'natural_earth_name':item['natural_earth_name'],'natural_earth_names':item['natural_earth_names'],'source':'Natural Earth 1:50m rivers_lake_centerlines v5.0.0'},'geometry':geometry})
        dump(staging/'rivers.json',{'schema_version':1,'kind':'river','generated_at':str(date.today()),'sources':['wikidata','natural-earth'],'entities':selected['river']})
        dump(staging/'rivers-50m.geojson',{'type':'FeatureCollection','metadata':{'source':'Natural Earth','dataset':'ne_50m_rivers_lake_centerlines','version':'5.0.0','license':'Public domain','matching':'Explicit snapshot mapping by natural_earth_name'},'features':river_features})
        reasons={
            'volcano':'target cap or missing/invalid required identity, class, label, coordinate or country fields',
            'mountain':'target cap, volcanic class overlap or missing/invalid required identity, class, label, coordinate or country fields',
            'river':'missing/invalid required fields, ambiguous identity, spatial mismatch or no explicit Natural Earth name/geometry match',
            'desert':'target cap or missing/invalid required identity, class, label, coordinate or country fields'
        }
        previous_exclusions=load(OUT/'metadata.json').get('exclusions',{}) if rivers_only else {}
        exclusions={kind:(previous_exclusions[kind] if rivers_only and kind!='river' else {'candidates':len(candidates[kind]),'published':len(selected[kind]),'excluded':len(candidates[kind])-len(selected[kind]),'reason':reasons[kind]}) for kind in ROOT_CLASSES}
        dump(staging/'metadata.json',{'schema_version':1,'generated_at':str(date.today()),'licenses':{'wikidata':'CC0 1.0','natural-earth':'Public domain'},'counts':{kind:len(selected[kind]) for kind in ROOT_CLASSES},'exclusions':exclusions,'river_audit':audit,'notes':{'deserts':'Natural Earth assets bundled by MetaphAI contain no validated desert polygons; all published deserts use a Wikidata representative coordinate.','geo_quiz':'The Geo Quiz catalog remains independent and unchanged.'}})
        validate(staging)
        for filename in [*FILES.values(),'rivers-50m.geojson','metadata.json']:
            shutil.copyfile(staging/filename,OUT/filename)
def validate(base=OUT):
    metadata=load(base/'metadata.json');valid_countries={row['id'] for row in load(COUNTRIES)['countries'] if not row['is_aggregate']};seen=set()
    for kind in ROOT_CLASSES:
        data=load(base/FILES[kind]);assert data['kind']==kind
        for item in data['entities']:
            assert re.fullmatch(r'Q\d+',item['id']) and item['id'] not in seen;seen.add(item['id'])
            assert item['kind']==kind and item['labels'].get('en') and item['countries'] and item['continents']
            assert all(code in valid_countries for code in item['countries'])
            lon,lat=item['coordinates'];assert math.isfinite(lon) and math.isfinite(lat) and -180<=lon<=180 and -90<=lat<=90
            assert item['validation']['class_root']==ROOT_CLASSES[kind] and item['validation']['status']=='validated' and ROOT_CLASSES[kind] in item['validation']['instance_of']
            assert item['labels']['en']!=item['id']
            if kind=='mountain':assert not set(item['validation']['instance_of'])&VOLCANO_TYPES
            if 'elevation_m' in item:assert -500<=item['elevation_m']<=9000
            if kind=='desert':assert item['geometry_mode']=='centroid'
        assert len(data['entities'])==metadata['counts'][kind]
    geo=load(base/'rivers-50m.geojson');river_ids={item['id'] for item in load(base/'rivers.json')['entities']};assert {feature['id'] for feature in geo['features']}==river_ids
    if RIVER_BASELINE.exists():assert set(load(RIVER_BASELINE)['ids'])<=river_ids
    assert PROTECTED_RIVERS<=river_ids
    assert not set(KNOWN_FALSE_POSITIVE_MAPPINGS)&river_ids
    for feature in geo['features']:
        assert feature['geometry']['type']=='MultiLineString' and feature['geometry']['coordinates']
        points=feature['geometry']['coordinates']
        assert all(math.isfinite(value) for value in flatten(points))
        assert sum(len(line) for line in points)>=2
        assert any(line[0]!=line[-1] for line in points if len(line)>=2)
    return metadata
def flatten(value):
    for item in value:
        if isinstance(item,list):yield from flatten(item)
        else:yield item
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--refresh',action='store_true');parser.add_argument('--rivers-only',action='store_true');args=parser.parse_args()
    if args.refresh:refresh(rivers_only=args.rivers_only)
    metadata=validate();print(json.dumps({'valid':True,'counts':metadata['counts']},ensure_ascii=False))
if __name__=='__main__':main()
