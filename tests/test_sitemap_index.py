import pathlib
import unittest
import xml.etree.ElementTree as ET


ROOT = pathlib.Path(__file__).resolve().parents[1]
NS = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}


class SitemapIndexTest(unittest.TestCase):
    def test_index_and_children_are_valid_xml(self):
        index = ET.parse(ROOT / 'sitemap.xml').getroot()
        self.assertEqual(index.tag, '{%s}sitemapindex' % NS['s'])
        links = [node.text for node in index.findall('s:sitemap/s:loc', NS)]
        self.assertEqual(len(links), 5)
        self.assertEqual(len(links), len(set(links)))
        urls = []
        for link in links:
            self.assertTrue(link.startswith('https://metaphai.com/sitemaps/'))
            child = ROOT / 'sitemaps' / link.rsplit('/', 1)[-1]
            root = ET.parse(child).getroot()
            self.assertEqual(root.tag, '{%s}urlset' % NS['s'])
            entries = [node.text for node in root.findall('s:url/s:loc', NS)]
            self.assertTrue(entries)
            urls.extend(entries)
        self.assertEqual(len(urls), len(set(urls)))


if __name__ == '__main__':
    unittest.main()
