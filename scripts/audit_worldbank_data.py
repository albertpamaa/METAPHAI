#!/usr/bin/env python3
"""Audita los JSON WDI locales y, opcionalmente, los contrasta con la API oficial."""
from __future__ import annotations
import argparse, json, math
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
REGISTRY=ROOT/"assets/data/indicators.json"
DATA=ROOT/"assets/data/worldbank"
SAMPLE=("ESP","USA","CHN","IND","DEU","FRA","JPN","BRA","NGA","ERI")

def read(path:Path):return json.loads(path.read_text(encoding="utf-8"))
def common_year(rows:list[dict],threshold:float):
    counts={}
    for row in rows:counts[row["year"]]=counts.get(row["year"],0)+1
    habitual=max(counts.values())
    return max(year for year,count in counts.items() if count>=habitual*threshold)

def request_api(base:str,codes:tuple[str,...],indicator:str,start:int,end:int):
    endpoint=f"/country/{';'.join(codes)}/indicator/{indicator}"
    query=urlencode({"source":2,"date":f"{start}:{end}","format":"json","per_page":20000})
    request=Request(f"{base}{endpoint}?{query}",headers={"User-Agent":"MetaphAI-WDI-Audit/1.0 (+https://metaphai.com/datos-globales/fuentes/)"})
    with urlopen(request,timeout=60) as response:payload=json.loads(response.read().decode("utf-8"))
    if not isinstance(payload,list) or len(payload)<2:raise RuntimeError(f"Respuesta API inválida para {indicator}")
    return {(row.get("countryiso3code"),int(row["date"])):row["value"] for row in (payload[1] or []) if row.get("value") is not None}

def audit(compare_api:bool):
    registry=read(REGISTRY);countries=read(DATA/"countries.json")["countries"]
    country_map={country["id"]:country for country in countries};valid={code for code,country in country_map.items() if not country["is_aggregate"]}
    summaries=[];comparisons=[];differences=[]
    for item in registry["indicators"]:
        payload=read(DATA/f"{item['slug']}.json");rows=payload["observations"];seen=set();last={}
        if payload["indicator"]["code"]!=item["code"]:raise AssertionError(f"Código incorrecto: {item['slug']}")
        if payload["indicator"]["unit"]!=item["unit"]:raise AssertionError(f"Unidad incorrecta: {item['slug']}")
        for row in rows:
            key=(row["country"],row["year"])
            if row["country"] not in country_map or key in seen or not isinstance(row["year"],int) or not isinstance(row["value"],(int,float)) or not math.isfinite(row["value"]):raise AssertionError(f"Fila inválida: {item['slug']} {key}")
            if row["year"]<=last.get(row["country"],0):raise AssertionError(f"Orden temporal inválido: {item['slug']} {key}")
            seen.add(key);last[row["country"]]=row["year"]
        valid_rows=[row for row in rows if row["country"] in valid]
        year=common_year(valid_rows,registry["common_year_coverage"])
        ranking=[row for row in valid_rows if row["year"]==year]
        if any(country_map[row["country"]]["is_aggregate"] for row in ranking):raise AssertionError("Agregado en ranking")
        summaries.append({"slug":item["slug"],"code":item["code"],"common_year":year,"ranking_count":len(ranking),"observations":len(rows),"first_year":min(row["year"] for row in rows),"last_year":max(row["year"] for row in rows)})
        if compare_api:
            local={(row["country"],row["year"]):row["value"] for row in rows if row["country"] in SAMPLE}
            api=request_api(registry["api_base"],SAMPLE,item["code"],min(row["year"] for row in rows),max(row["year"] for row in rows))
            for key,local_value in local.items():
                if key not in api:continue
                comparisons.append((item["code"],*key))
                if api[key]!=local_value:differences.append({"indicator":item["code"],"country":key[0],"year":key[1],"local":local_value,"api":api[key]})
    return {"sample_countries":SAMPLE,"summaries":summaries,"api_comparisons":len(comparisons),"differences":differences}

def main():
    parser=argparse.ArgumentParser();parser.add_argument("--compare-api",action="store_true");parser.add_argument("--output",type=Path);args=parser.parse_args()
    result=audit(args.compare_api);text=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output:args.output.write_text(text+"\n",encoding="utf-8")
    print(text)

if __name__=="__main__":main()
