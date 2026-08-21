// TÜRKIYE LOKASYON HARİTASI (NOKTASAL)
var turkey = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
               .filter(ee.Filter.eq('country_na', 'Turkey'));

// Afet Merkezlerinin Koordinatları
var elazig = ee.Geometry.Point([39.22, 38.67]); // Elazığ
var kastamonu = ee.Geometry.Point([34.02, 41.95]); // Bozkurt Seli
var manavgat = ee.Geometry.Point([31.45, 36.78]); // Manavgat Yangını

var points = ee.FeatureCollection([
  ee.Feature(elazig, {name: 'Elazığ (Deprem)'}),
  ee.Feature(kastamonu, {name: 'Kastamonu (Sel)'}),
  ee.Feature(manavgat, {name: 'Antalya (Yangın)'})
]);

Map.centerObject(turkey, 5.5);
Map.setOptions('Terrain'); // Topoğrafik fiziksel harita görünümü
Map.addLayer(turkey, {color: 'black'}, 'Türkiye Sınırı', true, 0.2);
Map.addLayer(points, {color: 'red'}, 'Afet Lokasyonları');
