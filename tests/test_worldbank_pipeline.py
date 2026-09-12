import importlib.util, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("updater",ROOT/"scripts/update_worldbank_data.py")
updater=importlib.util.module_from_spec(spec);spec.loader.exec_module(updater)

class PipelineTests(unittest.TestCase):
    def test_retry_is_limited_for_timeouts_and_corrupt_json(self):
        with patch.object(updater,"urlopen",side_effect=TimeoutError("slow")) as call, patch.object(updater.time,"sleep"):
            with self.assertRaises(updater.UpdateError):updater.request_json("https://example.test",retries=3)
            self.assertEqual(call.call_count,3)
        class Response:
            status=200
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self):return b"not-json"
        with patch.object(updater,"urlopen",return_value=Response()) as call, patch.object(updater.time,"sleep"):
            with self.assertRaises(updater.UpdateError):updater.request_json("https://example.test",retries=2)
            self.assertEqual(call.call_count,2)
    def test_registry_and_generated_data(self):
        config=updater.load_registry();self.assertEqual(len(config["indicators"]),8)
        countries=json.loads((ROOT/"assets/data/worldbank/countries.json").read_text(encoding="utf-8"))["countries"]
        self.assertGreaterEqual(len([c for c in countries if not c["is_aggregate"]]),200)
        ids={c["id"] for c in countries};self.assertIn("ESP",ids);self.assertTrue(next(c for c in countries if c["id"]=="WLD")["is_aggregate"])
        for item in config["indicators"]:
            data=json.loads((ROOT/"assets/data/worldbank"/(item["slug"]+".json")).read_text(encoding="utf-8"))
            self.assertEqual(data["indicator"]["code"],item["code"]);self.assertGreater(data["coverage"]["country_count"],150)
            self.assertTrue(data["official_metadata"]["source_organization"]);seen=set();last={}
            for row in data["observations"]:
                self.assertIsInstance(row["value"],(int,float));self.assertIn(row["country"],ids)
                key=(row["country"],row["year"]);self.assertNotIn(key,seen);seen.add(key)
                self.assertGreater(row["year"],last.get(row["country"],0));last[row["country"]]=row["year"]
    def test_pagination(self):
        replies=[ [{"pages":2},[{"id":1}]], [{"pages":2},[{"id":2}]] ]
        with patch.object(updater,"request_json",side_effect=replies) as call:self.assertEqual(updater.paged("https://example.test","/x"),[{"id":1},{"id":2}]);self.assertEqual(call.call_count,2)
    def test_corrupt_and_empty_responses(self):
        with patch.object(updater,"request_json",return_value={"error":1}):
            with self.assertRaises(updater.UpdateError):updater.paged("https://example.test","/x")
        with patch.object(updater,"paged",return_value=[]):
            with self.assertRaises(updater.UpdateError):updater.indicator_metadata("x","BAD")
    def test_nulls_duplicates_and_empty_dataset(self):
        cmap={f"C{i:03}":{"is_aggregate":False} for i in range(200)}
        item={"code":"X","min_year":2000}
        with patch.object(updater,"paged",return_value=[{"countryiso3code":"C000","date":"2020","value":None}]):
            with self.assertRaises(updater.UpdateError):updater.indicator_data("x",item,cmap)
        duplicate=[{"countryiso3code":"C000","date":"2020","value":1},{"countryiso3code":"C000","date":"2020","value":2}]
        with patch.object(updater,"paged",return_value=duplicate):
            with self.assertRaises(updater.UpdateError):updater.indicator_data("x",item,cmap)
    def test_equivalent_ignores_only_download_date(self):
        with tempfile.TemporaryDirectory() as a,tempfile.TemporaryDirectory() as b:
            Path(a,"x.json").write_text('{"downloaded_at":"2026-01-01","v":1}')
            Path(b,"x.json").write_text('{"downloaded_at":"2026-09-12","v":1}')
            self.assertTrue(updater.equivalent_data(Path(a),Path(b)))

if __name__=="__main__":unittest.main()
