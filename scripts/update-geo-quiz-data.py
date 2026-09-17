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
LANGS=['en','es','fr','de','it','pt','ru','zh','hi','ja','ko','ca','ar','id','bn']

def load(path): return json.loads(path.read_text(encoding='utf-8'))
def entities(catalog): return [*catalog['cities'],*catalog['mountains'],*catalog['rivers'],*catalog['islands']]
def validate(catalog,metadata):
    assert catalog['schema_version']==metadata['schema_version']==1
    sources={item['id'] for item in metadata['sources']}
    assert sources==set(catalog['source_registry'])
    for source in metadata['sources']:
        for key in ('source_name','source_url','license_name','license_url','retrieved_at','transformation_notes'): assert source.get(key)
    seen=set()
    for item in entities(catalog):
        assert re.fullmatch(r'Q\d+',item['id']) and item['id'] not in seen;seen.add(item['id'])
        assert item['source'] in sources and item.get('labels',{}).get('en')
        if 'coordinates' in item:
            lon,lat=item['coordinates'];assert -180<=lon<=180 and -90<=lat<=90
        for code in ([item['country']] if 'country' in item else item.get('countries',[])): assert re.fullmatch(r'[A-Z]{3}',code)
    for river in catalog['rivers']:
        assert river['validated'] and river['countries']
        if river.get('source_country'): assert river['source_country'] in river['countries']
    assert metadata['counts']=={'cities':len(catalog['cities']),'capitals':sum(x['capital'] for x in catalog['cities']),'mountains':len(catalog['mountains']),'rivers':len(catalog['rivers']),'islands':len(catalog['islands']),'seas':0,'lakes':0}

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
    parser=argparse.ArgumentParser();parser.add_argument('--refresh-labels',action='store_true');args=parser.parse_args()
    catalog,metadata=load(CATALOG),load(METADATA)
    if args.refresh_labels: refresh_labels(catalog);metadata['generated_at']=datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z');metadata['sources'][1]['retrieved_at']=metadata['generated_at'][:10]
    validate(catalog,metadata)
    if args.refresh_labels: atomic_json(CATALOG,catalog);atomic_json(METADATA,metadata)
    print(json.dumps({'valid':True,'entities':len(entities(catalog)),'refresh':args.refresh_labels,'counts':metadata['counts']},ensure_ascii=False))
if __name__=='__main__': main()
