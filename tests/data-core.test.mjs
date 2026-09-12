import assert from 'node:assert/strict';
import {commonYear,ranking,assignRankingPositions,historicalChange,formatIndicatorValue,formatIndicatorChange,normalizeSearch,searchCountries,addCountry,removeCountry,sortRanking,rangeSeries,splitOnGaps,median} from '../assets/js/data-core.mjs';
const rows=[{country:'AAA',year:2023,value:2},{country:'BBB',year:2023,value:2},{country:'CCC',year:2023,value:1},{country:'AAA',year:2022,value:1},{country:'BBB',year:2022,value:3},{country:'AAA',year:2013,value:1},{country:'PCT',year:2023,value:20},{country:'PCT',year:2013,value:10}];
assert.equal(commonYear(rows.filter(x=>x.country!=='PCT'),.7),2023);
assert.deepEqual(ranking(rows,2023,'descending').map(x=>x.country),['PCT','AAA','BBB','CCC']);
assert.deepEqual(ranking(rows,2023,'ascending').map(x=>x.country),['CCC','AAA','BBB','PCT']);
assert.deepEqual(assignRankingPositions(ranking(rows,2023,'descending')).map(x=>x.position),[1,2,2,4]);
assert.equal(ranking([...rows,{country:'NULL',year:2023,value:null}],2023).some(x=>x.country==='NULL'),false);
assert.equal(historicalChange(rows,'AAA',10).value,100);
assert.equal(historicalChange(rows,'PCT',10,true).value,10);
assert.equal(historicalChange(rows,'CCC',10),null);

const presentations={
  population:{presentation:{formatType:'population',decimals:0,unitLabel:'personas'}},
  years:{presentation:{formatType:'years',decimals:1,unitLabel:'años'}},
  fertility:{presentation:{formatType:'fertility',decimals:1,unitLabel:'hijos por mujer'}},
  percent:{presentation:{formatType:'percent',decimals:1,unitLabel:'%',changeType:'percentage_points'}},
  signed:{presentation:{formatType:'signedPercent',decimals:1,unitLabel:'%'}},
  currency:{presentation:{formatType:'currency',decimals:0,unitLabel:'$ internacionales'}}
};
const population=formatIndicatorValue(1460000000,presentations.population,'es-ES','card');
assert.equal(population,'1.460 millones');
assert.equal(population.includes('mil M'),false);
assert.doesNotThrow(()=>formatIndicatorValue(764,presentations.population,'es-ES','card'));
assert.equal(formatIndicatorValue(764,presentations.population,'es-ES','card'),'764 personas');
assert.equal(formatIndicatorValue(49355143,presentations.population,'es-ES','tooltip'),'49.355.143 personas');
assert.equal(formatIndicatorValue(84.53,presentations.years,'es-ES','card'),'84,5 años');
assert.equal(formatIndicatorValue(1.87,presentations.fertility,'es-ES','card'),'1,9 hijos por mujer');
assert.equal(formatIndicatorValue(7.43,presentations.percent,'es-ES','card'),'7,4 %');
assert.equal(formatIndicatorValue(-2.35,presentations.signed,'es-ES','card'),'−2,4 %');
assert.doesNotThrow(()=>formatIndicatorValue(1234.56,presentations.currency,'es-ES','card'));
for(const locale of ['en-US','fr-FR','de-DE'])assert.doesNotThrow(()=>formatIndicatorValue(84.53,presentations.years,locale,'tooltip'));
assert.equal(formatIndicatorValue(84.53,presentations.years,'es-ES','csv'),'84.53');

const countries=[
  {id:'ESP',iso2:'ES',name:'España',is_aggregate:false},
  {id:'USA',iso2:'US',name:'Estados Unidos',is_aggregate:false},
  {id:'ARE',iso2:'AE',name:'Emiratos Árabes Unidos',is_aggregate:false},
  {id:'EMU',iso2:'XC',name:'Zona euro',is_aggregate:true}
];
assert.deepEqual(searchCountries(countries,'esp').map(x=>x.id),['ESP']);
assert.deepEqual(searchCountries(countries,'ESP').map(x=>x.id),['ESP']);
assert.deepEqual(searchCountries(countries,'arabes').map(x=>x.id),['ARE']);
assert.deepEqual(searchCountries(countries,'uni').map(x=>x.id),['ARE','USA']);
assert.deepEqual(searchCountries(countries,'euro').map(x=>x.id),[]);
assert.deepEqual(searchCountries(countries,'esp',['ESP']).map(x=>x.id),[]);
assert.deepEqual(searchCountries([{id:'ESP',iso2:'ES',name:'Spain',is_aggregate:false}],'España',[],8,{ESP:['España']}).map(x=>x.id),['ESP']);
assert.equal(normalizeSearch('Côte d’Ivoire'),"cote d'ivoire");
assert.deepEqual(addCountry(['ESP'],'FRA'),['ESP','FRA']);
assert.deepEqual(addCountry(['ESP'],'ESP'),['ESP']);
assert.deepEqual(addCountry(['A','B','C','D','E'],'F'),['A','B','C','D','E']);
assert.deepEqual(removeCountry(['ESP','FRA'],'ESP'),['FRA']);

const ranked=[{name:'B',value:5,position:1},{name:'A',value:3,position:2},{name:'C',value:1,position:3}];
assert.deepEqual(sortRanking(ranked,'value-desc').map(x=>x.value),[5,3,1]);
assert.deepEqual(sortRanking(ranked,'value-asc').map(x=>x.value),[1,3,5]);
assert.deepEqual(sortRanking(ranked,'country-asc').map(x=>x.name),['A','B','C']);
assert.deepEqual(sortRanking(ranked,'country-desc').map(x=>x.name),['C','B','A']);
assert.deepEqual(ranked.map(x=>x.position),[1,2,3]);

const timeline=Array.from({length:25},(_,i)=>({year:2000+i,value:i}));
assert.equal(rangeSeries(timeline,'10').length,10);
assert.equal(rangeSeries(timeline,'20').length,20);
assert.equal(rangeSeries(timeline,'all').length,25);
assert.deepEqual(rangeSeries(timeline,'10',2018).map(x=>x.year),[2009,2010,2011,2012,2013,2014,2015,2016,2017,2018]);
assert.equal(formatIndicatorValue(-0,presentations.signed,'es-ES','card'),'0,0 %');
assert.equal(formatIndicatorChange(-0,presentations.percent,'es-ES','card'),'0,0 p. p.');
assert.deepEqual(splitOnGaps([{year:2000,value:1},{year:2001,value:2},{year:2004,value:4}]).map(x=>x.length),[2,1]);
assert.equal(median([4,1,3,2]),2.5);
assert.equal(median([4,1,3]),3);
assert.equal(median([]),null);

console.log('data-core: 52 assertions OK');
