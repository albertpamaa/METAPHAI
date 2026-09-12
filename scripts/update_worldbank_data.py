#!/usr/bin/env python3
"""Descarga y valida indicadores WDI antes de sustituir los JSON publicados."""
from __future__ import annotations
import argparse, json, math, shutil, time
from datetime import date
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "assets/data/indicators.json"
OUTPUT = ROOT / "assets/data/worldbank"
USER_AGENT = "MetaphAI-WDI-Updater/1.0 (+https://metaphai.com/datos/fuentes/)"

class UpdateError(RuntimeError): pass

def request_json(url: str, retries: int = 3, timeout: int = 45):
    last = None
    for attempt in range(retries):
        try:
            with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=timeout) as response:
                if response.status != 200: raise UpdateError(f"HTTP {response.status}: {url}")
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last = exc
            if attempt + 1 < retries: time.sleep(2 ** attempt)
    raise UpdateError(f"No se pudo obtener JSON válido tras {retries} intentos: {last}")

def paged(api_base: str, endpoint: str):
    page, rows = 1, []
    while True:
        sep = "&" if "?" in endpoint else "?"
        payload = request_json(f"{api_base}{endpoint}{sep}{urlencode({'format':'json','per_page':20000,'page':page})}")
        if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[0], dict):
            raise UpdateError(f"Respuesta API inesperada en {endpoint}")
        rows.extend(payload[1] or [])
        pages = int(payload[0].get("pages", 1))
        if page >= pages: break
        page += 1
    return rows

def load_registry():
    with REGISTRY.open(encoding="utf-8") as fh: config = json.load(fh)
    codes = [item["code"] for item in config["indicators"]]
    if len(codes) != len(set(codes)): raise UpdateError("Códigos de indicador duplicados")
    return config

def countries(api_base: str):
    raw = paged(api_base, "/country")
    result = []
    for row in raw:
        region = row.get("region") or {}
        result.append({
            "id": row.get("id"), "iso2": row.get("iso2Code"), "name": row.get("name"),
            "region_id": region.get("id"), "region": region.get("value"),
            "income_level": (row.get("incomeLevel") or {}).get("value"),
            "is_aggregate": not bool(region.get("id")) or region.get("value") == "Aggregates"
        })
    if len(result) < 250 or len([c for c in result if not c["is_aggregate"]]) < 200:
        raise UpdateError("Clasificación de países incompleta")
    return sorted(result, key=lambda x: x["id"] or "")

def indicator_metadata(api_base: str, code: str):
    rows = paged(api_base, f"/indicator/{code}")
    if len(rows) != 1 or rows[0].get("id") != code: raise UpdateError(f"Indicador inexistente: {code}")
    row = rows[0]
    if (row.get("source") or {}).get("value") != "World Development Indicators":
        raise UpdateError(f"{code} no pertenece a WDI")
    return row

def indicator_data(api_base: str, item: dict, country_map: dict):
    rows = paged(api_base, f"/country/all/indicator/{item['code']}?source=2")
    seen, observations = set(), []
    for row in rows:
        value, year, code = row.get("value"), row.get("date"), (row.get("countryiso3code") or "").strip()
        if value is None: continue
        try: value, year = float(value), int(year)
        except (TypeError, ValueError): raise UpdateError(f"Valor/año inválido en {item['code']}")
        if not math.isfinite(value) or year < item["min_year"] or year > date.today().year + 1: raise UpdateError(f"Observación inválida en {item['code']}")
        if code not in country_map: continue
        key = (code, year)
        if key in seen: raise UpdateError(f"Observación duplicada {item['code']} {key}")
        seen.add(key); observations.append({"country":code,"year":year,"value":value})
    observations.sort(key=lambda x: (x["country"], x["year"]))
    country_count = len({o["country"] for o in observations if not country_map[o["country"]]["is_aggregate"]})
    if len(observations) < 1000 or country_count < 150: raise UpdateError(f"Cobertura insuficiente en {item['code']}")
    return observations, country_count

def build(output: Path):
    config = load_registry(); api = config["api_base"]
    country_rows = countries(api); country_map = {c["id"]: c for c in country_rows}
    output.mkdir(parents=True, exist_ok=True)
    (output / "countries.json").write_text(json.dumps({"downloaded_at":date.today().isoformat(),"countries":country_rows},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    manifest = {"downloaded_at":date.today().isoformat(),"dataset":config["dataset"],"license":config["license"],"indicators":[]}
    for item in config["indicators"]:
        meta = indicator_metadata(api, item["code"]); observations, country_count = indicator_data(api, item, country_map)
        years = sorted({o["year"] for o in observations})
        payload = {
            "schema_version":1,"downloaded_at":date.today().isoformat(),"indicator":item,
            "official_metadata":{"name":meta.get("name"),"unit":meta.get("unit") or item["unit"],"source":meta.get("source"),"source_note":meta.get("sourceNote"),"source_organization":meta.get("sourceOrganization")},
            "coverage":{"min_year":min(years),"max_year":max(years),"country_count":country_count,"observation_count":len(observations)},
            "transformations":["exclusión de nulos","clasificación explícita de países y agregados","ordenación por país y año"],
            "observations":observations
        }
        filename = item["slug"] + ".json"
        (output / filename).write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
        manifest["indicators"].append({"code":item["code"],"slug":item["slug"],"file":filename,"latest_year":max(years),"country_count":country_count,"observations":len(observations)})
    (output / "metadata.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")

def equivalent_data(left: Path, right: Path):
    if not left.exists() or not right.exists(): return False
    if {p.name for p in left.glob("*.json")} != {p.name for p in right.glob("*.json")}: return False
    def without_downloaded(value):
        if isinstance(value, dict): return {k:without_downloaded(v) for k,v in value.items() if k != "downloaded_at"}
        if isinstance(value, list): return [without_downloaded(v) for v in value]
        return value
    for generated in left.glob("*.json"):
        try:
            if without_downloaded(json.loads(generated.read_text(encoding="utf-8"))) != without_downloaded(json.loads((right/generated.name).read_text(encoding="utf-8"))): return False
        except (OSError, json.JSONDecodeError): return False
    return True

def main():
    parser=argparse.ArgumentParser();parser.add_argument("--output",type=Path);args=parser.parse_args()
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    temporary = args.output or OUTPUT.with_name(".worldbank-build")
    if not args.output:
        if temporary.exists(): shutil.rmtree(temporary)
        temporary.mkdir(parents=True)
    try:
        build(temporary)
        if not args.output:
            if equivalent_data(temporary, OUTPUT):
                shutil.rmtree(temporary)
                print("Sin cambios estadísticos; se conserva la versión publicada")
                return
            backup=OUTPUT.with_name(OUTPUT.name+".previous")
            if backup.exists(): shutil.rmtree(backup)
            if OUTPUT.exists(): OUTPUT.replace(backup)
            try: temporary.replace(OUTPUT)
            except Exception:
                if backup.exists(): backup.replace(OUTPUT)
                raise
            if backup.exists(): shutil.rmtree(backup)
    except Exception:
        if not args.output and temporary.exists(): shutil.rmtree(temporary)
        raise
    print(f"Datos WDI validados en {temporary if args.output else OUTPUT}")

if __name__ == "__main__": main()
