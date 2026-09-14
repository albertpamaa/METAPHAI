# World map geometry

`world-50m.topo.json` is derived from `world-atlas@2` `countries-50m.json`, itself built from Natural Earth 1:50m Admin 0 Countries. Natural Earth data is public domain. World Atlas is distributed under the ISC license; its license is included beside the asset.

The source numeric ISO 3166-1 identifiers were normalized once to MetaphAI/WDI ISO3 codes using [Unicode CLDR territory codes](https://github.com/unicode-org/cldr). Runtime matching uses only `properties.iso3`, never translated country names. Audited exceptions are Kosovo (`XKX`), the combined World Bank Channel Islands entity (`CHI`, represented by the Jersey and Guernsey geometries), and Australia (`AUS`, represented by Australia plus Ashmore and Cartier Islands). Gibraltar (`GIB`) and Tuvalu (`TUV`) have no polygon at this scale and remain available through the country selector and tables.

The map uses the Equal Earth projection: it is an equal-area world projection suited to comparing statistical choropleths without the area distortion of Web Mercator. It is rendered as responsive SVG and requires no tiles or remote map service.

Sources and licences: [World Atlas (ISC)](https://github.com/topojson/world-atlas), [Natural Earth (public domain)](https://www.naturalearthdata.com/about/terms-of-use/) and [Unicode data licence](https://www.unicode.org/license.txt).
