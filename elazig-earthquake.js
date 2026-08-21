
// ==============================================================================
// ELAZIĞ DEPREMİ: TEZ GRAFİKLERİ VE HARİTA KODU
// (calcMOO FONKSİYONU DÜZELTİLMİŞ SÜRÜM)
// ==============================================================================

// --- 1. AYARLAR VE GEOMETRİ (SİVRİCE İLÇESİ VE ELAZIĞ MERKEZ) ---
var geometry = ee.Geometry.Polygon([
  [[38.95, 38.75], [38.95, 38.25], [39.40, 38.25], [39.40, 38.75]]
]);

// Tarihler
var preDateStart = '2019-12-25'; var preDateEnd = '2020-01-23'; 
var postDateStart = '2020-01-25'; var postDateEnd = '2020-02-20'; 
var chartStart = '2019-11-01'; var chartEnd = '2020-04-01';

// --- 2. SENTINEL-1 (RADAR) VERİ HAZIRLIĞI ---
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(geometry)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING')); 

// Speckle (Gürültü) Filtresi
function filterSpeckles(img) { return img.focal_mean(40, 'circle', 'meters'); }
var preImage = s1.filterDate(preDateStart, preDateEnd).map(filterSpeckles).mean().clip(geometry);
var postImage = s1.filterDate(postDateStart, postDateEnd).map(filterSpeckles).mean().clip(geometry);

// ==============================================================================
// --- ANALİZ YÖNTEMLERİ  
// ==============================================================================

// --- YÖNTEM A: SAR Oran Analizi (dB Farkı ile) ---
var diff_dB = postImage.select('VV').subtract(preImage.select('VV')).rename('dB_Farki');

var methodA_collapse = diff_dB.lt(-2.5).selfMask(); // Yıkım (Sinyal Kaybı: -2.5 dB ve altı)
var methodA_debris   = diff_dB.gt(2.5).selfMask();  // Moloz (Sinyal Artışı: +2.5 dB ve üzeri)

// --- YÖNTEM B: Doku Benzerliği Tespiti (Genlik Proxy'si) ---
var preVV = preImage.select('VV');
var postVV = postImage.select('VV');

var kernel = ee.Kernel.square({radius:2, units:'pixels', normalize:true});
var preN = preVV.subtract(preVV.convolve(kernel));
var postN = postVV.subtract(postVV.convolve(kernel));
var diffCoh = preN.subtract(postN).abs();
var denom = preN.abs().add(postN.abs()).add(1e-6);
var cohProxy = ee.Image(1).subtract(diffCoh.divide(denom)).rename('coh');

var methodB_Mask = cohProxy.lt(0.3).selfMask(); // Doku benzerliğinin 0.3'ün altına düştüğü alanlar

// --- YÖNTEM C: Landsat 8 Optik Fark (Kentsel Değişim) ---
function scaleL8(image) {
  var optical = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  return image.addBands(optical, null, true);
}
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').filterBounds(geometry);
var preL8 = l8.filterDate('2019-11-01', preDateEnd).map(scaleL8).median().clip(geometry);
var postL8 = l8.filterDate(postDateStart, '2020-03-30').map(scaleL8).median().clip(geometry);

var optDiff = postL8.select('SR_B4').subtract(preL8.select('SR_B4')).abs();
var methodC_Mask = optDiff.gt(0.15).selfMask();

// ==============================================================================
// --- 3. KONSOL GRAFİKLERİ ---
// ==============================================================================
print('ELAZIĞ DEPREMİ DETAYLI ANALİZ RAPORU');

print('Sinyal Kırılması Grafiği');
var chartTime = ui.Chart.image.series({
  imageCollection: s1.filterDate(chartStart, chartEnd).select('VV'),
  region: geometry, reducer: ee.Reducer.mean(), scale: 100
}).setOptions({title: 'Radar Sinyal Değişimi (24 Ocak Kırılması)', vAxis: {title: 'Backscatter (dB)'}, colors: ['blue'], lineWidth:2});
print(chartTime);

print('Yüzey Dokusu Değişimi (Histogram)');
var combined = preImage.select('VV').rename('Deprem Oncesi').addBands(postImage.select('VV').rename('Deprem Sonrasi'));
var chartHist = ui.Chart.image.histogram({
  image: combined, region: geometry, scale: 200, minBucketWidth: 0.5
}).setOptions({title: 'Piksel Dağılım Histogramı', hAxis: {title: 'Backscatter (dB)'}, colors: ['green', 'red']});
print(chartHist);

print('Radar Sinyal Ortalaması Grafiği');
var chartBar = ui.Chart.image.series({
  imageCollection: s1.filterDate(chartStart, chartEnd).select('VV'),
  region: geometry, reducer: ee.Reducer.mean(), scale: 500
}).setChartType('ColumnChart') 
.setOptions({title: 'Sahne Bazlı Radar Sinyal Ortalamaları', colors: ['orange']});
print(chartBar);

var radarVis = {min: -25, max: 0, palette: ['black', 'white']}; 

// --- SOL PANEL (REFERANS) ---
var leftMap = ui.Map(); leftMap.setOptions('HYBRID');
leftMap.setControlVisibility({scaleControl: true}); 

leftMap.add(ui.Label('DEPREM ÖNCESİ (Referans)', {position: 'top-center', fontWeight: 'bold'}));
leftMap.addLayer(preImage.select('VV'), radarVis, 'Radar Görüntüsü (Siyah-Beyaz)');

var northArrow = ui.Panel({style: {position: 'bottom-left', padding: '8px', backgroundColor: 'rgba(255, 255, 255, 0.7)'}});
northArrow.add(ui.Label({value: 'N ⬆', style: {fontSize: '24px', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0)'}}));
leftMap.add(northArrow);

// --- SAĞ PANEL (HASAR ANALİZİ VE YÖNTEMLER) ---
var rightMap = ui.Map(); rightMap.setOptions('HYBRID');
rightMap.add(ui.Label('HASAR ANALİZİ (Yöntem A, B, C)', {position: 'top-center', fontWeight: 'bold'}));

rightMap.addLayer(postImage.select('VV'), radarVis, 'Radar Sonrası', true, 0.6); 

// Katmanlar
rightMap.addLayer(methodA_collapse, {palette: ['FF0000']}, 'Yöntem A: Sinyal Kaybı (Yıkım)', true);
rightMap.addLayer(methodA_debris, {palette: ['FFFF00']}, 'Yöntem A: Sinyal Artışı (Moloz)', true);
rightMap.addLayer(methodB_Mask, {palette: ['00FFFF']}, 'Yöntem B: Genlik-Doku Kaybı (Cyan)', false);
rightMap.addLayer(methodC_Mask, {palette: ['FF1493']}, 'Yöntem C: Landsat Optik Fark (Pembe)', false);

// --- 5. LEJANT ---
var legend = ui.Panel({style: {position: 'bottom-right', padding: '8px 15px'}});
legend.add(ui.Label({value: 'ANALİZ LEJANTI', style: {fontWeight: 'bold'}}));

var makeRow = function(color, name) {
  return ui.Panel({widgets: [
    ui.Label({style: {backgroundColor: color, padding: '8px', margin: '0 4px 4px 0'}}), 
    ui.Label({value: name, style: {margin: '0 0 4px 0'}})
  ], layout: ui.Panel.Layout.Flow('horizontal')});
};

legend.add(makeRow('#FF0000', 'Yöntem A: Yıkım / Çökme'));
legend.add(makeRow('#FFFF00', 'Yöntem A: Moloz Yığını'));
legend.add(makeRow('#00FFFF', 'Yöntem B: Doku Benzerliği'));
legend.add(makeRow('#FF1493', 'Yöntem C: Optik Yansıma'));
rightMap.add(legend);

// --- BİRLEŞTİRME (WIPE: FALSE) ---
var linker = ui.Map.Linker([leftMap, rightMap]); 
leftMap.centerObject(geometry, 12); 
ui.root.clear(); ui.root.add(ui.SplitPanel({firstPanel: leftMap, secondPanel: rightMap, wipe: false, style: {stretch: 'both'}}));

var alanHa = function(mask, ad){
  var dict = mask.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: geometry, scale: 30, maxPixels: 1e10,
    tileScale: 8, bestEffort: true
  });
  print(ad + '  (hektar):', ee.Number(dict.values().get(0)).divide(1e4).round());
};
 
print('================ DEPREM · ALAN SONUÇLARI ================');
alanHa(methodA_collapse, 'Yöntem A · Yıkım / Çökme');
alanHa(methodA_debris,   'Yöntem A · Moloz Yığını');
alanHa(methodB_Mask,     'Yöntem B · Genlik Doku Kaybı');
alanHa(methodC_Mask,     'Yöntem C · Optik Fark');

// ==============================================================================
// --- Yöntemler Arası Mekânsal Örtüşme Oranı (MOO) Hesaplama Fonksiyonu ---
// (DÜZELTİLDİ: unmask(0) eklendi, GEE'nin .and()/.or() maskeleme davranışından
//  kaynaklanan hatalı %100/%0 sonuçlarını önlemek için)
// ==============================================================================
var calcMOO = function(mask1, mask2, name) {
  var m1 = mask1.unmask(0);
  var m2 = mask2.unmask(0);
  var intersection = m1.and(m2);
  var union = m1.or(m2);
  var intArea = intersection.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: geometry, scale: 30, maxPixels: 1e10,
    tileScale: 8, bestEffort: true
  }).values().get(0);
  var unionArea = union.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: geometry, scale: 30, maxPixels: 1e10,
    tileScale: 8, bestEffort: true
  }).values().get(0);
  var moo = ee.Number(intArea).divide(ee.Number(unionArea)).multiply(100);
  print(name + ' Mekânsal Örtüşme Oranı (%):', moo.round());
};

print('================ MODELLER ARASI TUTARLILIK (MOO) ================');
// Yöntem A'nın toplam etkilenen alanı (Yıkım + Moloz)
var methodA_Total = methodA_collapse.or(methodA_debris);
calcMOO(methodA_Total, methodB_Mask, 'Yöntem A ve Yöntem B');
calcMOO(methodB_Mask, methodC_Mask, 'Yöntem B ve Yöntem C');
calcMOO(methodA_Total, methodC_Mask, 'Yöntem A ve Yöntem C');
