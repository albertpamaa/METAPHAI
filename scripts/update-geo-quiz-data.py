"""Validate and optionally refresh the compact Geo Quiz snapshot.

Usage:
  python scripts/update-geo-quiz-data.py
  python scripts/update-geo-quiz-data.py --refresh-labels

The optional network step requests only the QIDs already present in the local
catalog through Wikidata's wbgetentities API. Validation happens before an
atomic os.replace; a failed request never destroys the previous snapshot.
"""
from __future__ import annotations
import argparse, json, os, re, tempfile, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'assets'/'data'/'geo-quiz'
CATALOG=DATA/'catalog.json'; METADATA=DATA/'metadata.json'
COUNTRIES=ROOT/'assets'/'data'/'worldbank'/'countries.json'
GEOGRAPHY=ROOT/'assets'/'data'/'geography'
GEOGRAPHY_FILES={'volcano':'volcanoes.json','mountain':'mountains.json','river':'rivers.json','desert':'deserts.json'}
LANGS=['en','es','fr','de','it','pt','ru','zh','hi','ja','ko','ca','ar','id','bn']

def load(path): return json.loads(path.read_text(encoding='utf-8'))
def entities(catalog): return [*catalog['cities'],*catalog['mountains'],*catalog['rivers'],*catalog['islands'],*catalog['volcanoes'],*catalog['seas'],*catalog['oceans']]
def volcanoes(catalog): return [*catalog['volcanoes'],*(item for item in catalog['mountains'] if item.get('is_volcano'))]
def validate(catalog,metadata):
    assert catalog['schema_version']==metadata['schema_version']==2
    sources={item['id'] for item in metadata['sources']}
    assert sources==set(catalog['source_registry'])
    valid_countries={item['id'] for item in load(COUNTRIES)['countries'] if not item['is_aggregate']}
    for source in metadata['sources']:
        for key in ('source_name','source_url','license_name','license_url','retrieved_at','transformation_notes'): assert source.get(key)
    seen=set()
    for item in entities(catalog):
        assert re.fullmatch(r'Q\d+',item['id']) and item['id'] not in seen;seen.add(item['id'])
        assert item['source'] in sources and item.get('labels',{}).get('en')
        if 'coordinates' in item:
            lon,lat=item['coordinates'];assert -180<=lon<=180 and -90<=lat<=90
        for code in ([item['country']] if 'country' in item else item.get('countries',[])): assert code in valid_countries
    for river in catalog['rivers']:
        assert river['validated'] and river['countries']
        if river.get('source_country'): assert river['source_country'] in river['countries']
    for volcano in volcanoes(catalog):
        assert (volcano.get('validation') or volcano.get('volcano_validation')) and volcano['countries'] and len(volcano['countries'])==len(set(volcano['countries']))
        assert all(code in valid_countries for code in volcano['countries'])
        assert all(code in valid_countries and code not in volcano['countries'] for code in volcano['country_distractors'])
        if len(volcano['countries'])>1: assert not volcano['country_distractors'] and 'excluded' in volcano['validation']
    ocean_codes={item['code'] for item in catalog['oceans']}
    assert ocean_codes=={'PAC','ATL','IND','ARC','SOU'}
    for sea in catalog['seas']:
        assert sea['validation'] and sea['coastal_countries'] and len(sea['coastal_countries'])==len(set(sea['coastal_countries']))
        assert all(code in valid_countries for code in [*sea['coastal_countries'],*sea['country_prompts'],*sea['regional_distractors']])
        assert not set(sea['coastal_countries'])&set(sea['regional_distractors'])
        assert sea['parent_ocean'] is None or sea['parent_ocean'] in ocean_codes
    for ocean in catalog['oceans']:
        assert ocean['validation'] and len(ocean['coastal_countries'])==len(set(ocean['coastal_countries']))
        assert all(code in valid_countries for code in [*ocean['coastal_countries'],*ocean['country_prompts'],*ocean['regional_distractors']])
        assert not set(ocean['coastal_countries'])&set(ocean['regional_distractors'])
    volcano_catalog=volcanoes(catalog)
    expected={'cities':len(catalog['cities']),'capitals':sum(x['capital'] for x in catalog['cities']),'mountains':len(catalog['mountains']),'rivers':len(catalog['rivers']),'islands':len(catalog['islands']),'volcanoes':len(volcano_catalog),'volcanoes_single_country_eligible':sum(len(x['countries'])==1 for x in volcano_catalog),'volcanoes_border_excluded':sum(len(x['countries'])>1 for x in volcano_catalog),'seas':len(catalog['seas']),'oceans':len(catalog['oceans']),'lakes':0}
    assert metadata['counts']==expected
    if 'geography' in catalog:
        assert set(catalog['geography'])==set(GEOGRAPHY_FILES)
        assert metadata['geography_counts']=={kind:len(catalog['geography'][kind]) for kind in GEOGRAPHY_FILES}
        for kind,filename in GEOGRAPHY_FILES.items():
            originals={item['id']:item for item in load(GEOGRAPHY/filename)['entities']}
            derived=catalog['geography'][kind]
            assert {item['id'] for item in derived}==set(originals),f'{kind}: geography snapshot mismatch'
            for item in derived:
                original=originals[item['id']]
                assert item['labels']==original['labels'] and item['countries']==original['countries'] and item['continents']==original['continents']
                assert item['validation']==original['validation'] and item['coordinates']==original['coordinates']
                assert all(code in valid_countries for code in item['countries'])
                for metric in ('elevation_m','length_km','area_km2'):
                    assert item.get(metric)==original.get(metric)
                if kind=='river': assert item['sources']==original.get('sources',[]) and item['mouths']==original.get('mouths',[])
                if kind=='desert': assert original['geometry_mode']=='centroid'

def derive_geography():
    selected={}
    for kind,filename in GEOGRAPHY_FILES.items():
        rows=load(GEOGRAPHY/filename)['entities']
        selected[kind]=[]
        for original in rows:
            item={key:original[key] for key in ('id','labels','countries','continents','coordinates','validation','source')}
            for metric in ('elevation_m','length_km','area_km2'):
                if metric in original:item[metric]=original[metric]
            if kind=='river':
                item['sources']=original.get('sources',[])
                item['mouths']=original.get('mouths',[])
            selected[kind].append(item)
    return selected

def refresh_labels(catalog):
    ids=sorted({item['id'] for item in entities(catalog)}|{river['mouth']['id'] for river in catalog['rivers'] if river.get('mouth')})
    labels={}
    for start in range(0,len(ids),40):
        params=urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(ids[start:start+40]),'props':'labels','languages':'|'.join(LANGS),'format':'json','origin':'*'})
        request=urllib.request.Request('https://www.wikidata.org/w/api.php?'+params,headers={'User-Agent':'MetaphAI-GeoQuiz/1.0 (info@metaphai.com)'})
        with urllib.request.urlopen(request,timeout=45) as response: payload=json.load(response)
        if 'entities' not in payload: raise RuntimeError(f"Wikidata API error: {payload.get('error',payload)}")
        labels.update({qid:{('zh-CN' if lang=='zh' else lang):data['value'] for lang,data in entity.get('labels',{}).items()} for qid,entity in payload['entities'].items()})
    for item in entities(catalog): item['labels'].update(labels.get(item['id'],{}))
    for river in catalog['rivers']:
        if river.get('mouth'): river['mouth']['labels'].update(labels.get(river['mouth']['id'],{}))

def atomic_json(path,data):
    fd,tmp=tempfile.mkstemp(prefix=path.name+'.',suffix='.tmp',dir=path.parent)
    try:
        with os.fdopen(fd,'w',encoding='utf-8',newline='\n') as handle: json.dump(data,handle,ensure_ascii=False,indent=2);handle.write('\n')
        os.replace(tmp,path)
    except Exception:
        try: os.unlink(tmp)
        except FileNotFoundError: pass
        raise

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--refresh-labels',action='store_true');parser.add_argument('--refresh-geography',action='store_true');args=parser.parse_args()
    assert not(args.refresh_labels and args.refresh_geography)
    catalog,metadata=load(CATALOG),load(METADATA)
    if args.refresh_geography:
        catalog['geography']=derive_geography()
        metadata['geography_counts']={kind:len(rows) for kind,rows in catalog['geography'].items()}
        metadata['geography_source']='Local validated Geografía snapshot; generated, never fetched at runtime'
    if args.refresh_labels: refresh_labels(catalog);metadata['generated_at']=datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z');metadata['sources'][1]['retrieved_at']=metadata['generated_at'][:10]
    validate(catalog,metadata)
    if args.refresh_labels or args.refresh_geography: atomic_json(CATALOG,catalog);atomic_json(METADATA,metadata)
    print(json.dumps({'valid':True,'entities':len(entities(catalog)),'refresh':args.refresh_labels or args.refresh_geography,'counts':metadata['counts'],'geography_counts':metadata.get('geography_counts')},ensure_ascii=False))
if __name__=='__main__': main()
