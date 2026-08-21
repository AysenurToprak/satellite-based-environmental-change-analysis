// ==============================================================================
// KASTAMONU/BOZKURT SELİ: TEZ GRAFİKLERİ VE İKİLİ HARİTA KODU
//  
// ==============================================================================

// --- 1. AYARLAR VE GEOMETRİ (BOZKURT) ---
var geometry = ee.Geometry.Polygon([
  [[33.98, 41.98], [33.98, 41.93], [34.04, 41.93], [34.04, 41.98]]
]);

var preDateStart = '2021-07-01'; var preDateEnd = '2021-07-30'; 
var postDateStart = '2021-08-12'; var postDateEnd = '2021-08-30'; 
var chartStart = '2021-07-10'; var chartEnd = '2021-09-10';

// --- 2. OPTİK VE YAĞIŞ VERİSİ HAZIRLIĞI ---
function prepareS2(image) {
  var scl = image.select('SCL');
  var mask = scl.eq(3).or(scl.eq(8)).or(scl.eq(9)).or(scl.eq(10)).or(scl.eq(11)).not();
  var mndwi = image.normalizedDifference(['B3', 'B11']).rename('MNDWI');
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  var nir = image.select('B8').rename('NIR'); 
  return image.updateMask(mask).divide(10000)
              .addBands(mndwi).addBands(ndwi).addBands(nir)
              .copyProperties(image, ['system:time_start']);
}

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
           .filterBounds(geometry).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40));
           
var precip = ee.ImageCollection("NASA/GPM_L3/IMERG_V06")
               .filterBounds(geometry).filterDate(chartStart, chartEnd).select('precipitationCal');

var preImage = s2.filterDate(preDateStart, preDateEnd).map(prepareS2).median().clip(geometry);
var postImage = s2.filterDate(postDateStart, postDateEnd).map(prepareS2).median().clip(geometry);

// --- 3. GRAFİKLER ---
var chartRain = ui.Chart.image.series({
  imageCollection: precip, region: geometry, reducer: ee.Reducer.mean(), scale: 10000
}).setOptions({
  title: 'Kastamonu Sel Felaketi Yarım Saatlik Yağış Şiddeti Grafiği', 
  vAxis: {title: 'Yağış (mm/saat)'}, hAxis: {title: 'Tarih'}, colors: ['blue'], lineWidth: 2
});
print(chartRain);

var chartIndices = ui.Chart.image.series({
  imageCollection: s2.filterDate(chartStart, chartEnd).map(prepareS2).select(['MNDWI', 'NDWI']), 
  region: geometry, reducer: ee.Reducer.mean(), scale: 30 
}).setOptions({
  title: 'Kastamonu Sel Felaketi Su İndeksleri Grafiği', 
  vAxis: {title: 'İndeks Değeri'}, hAxis: {title: 'Tarih'}, 
  series: {0: {color: 'red', lineWidth: 2, labelInLegend: 'MNDWI'}, 1: {color:'gray', lineDashStyle:[4,4], lineWidth: 2, labelInLegend: 'NDWI'}}
});
print(chartIndices);

// ŞEKİL 4.8: NIR Yansıma Grafiği
var chartNIR = ui.Chart.image.series({
  imageCollection: s2.filterDate(chartStart, chartEnd).map(prepareS2).select('NIR'), 
  region: geometry, reducer: ee.Reducer.mean(), scale: 30
}).setOptions({
  title: 'Kastamonu Sel Felaketi NIR Yansıma Değişimi Grafiği', 
  vAxis: {title: 'NIR Yansıması'}, hAxis: {title: 'Tarih'}, colors: ['green'], lineWidth: 2
});
print(chartNIR);


// ==============================================================================
// --- 4. HASAR ANALİZ YÖNTEMLERİ ---
// ==============================================================================

// YÖNTEM A: MNDWI (Optik)
var methodA_Mask = postImage.select('MNDWI').gt(-0.15).selfMask();

// YÖNTEM B: SAR Log-Ratio (Radar) - YÖRÜNGE SABİTLENDİ
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(geometry)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')); 
  
function speckle(img){ return img.focal_mean(40,'circle','meters'); }

var preSAR = s1.filterDate(preDateStart,preDateEnd).map(speckle).mean().select('VV').clip(geometry);
var postSAR = s1.filterDate(postDateStart,postDateEnd).map(speckle).mean().select('VV').clip(geometry);

// GEE S1 verisi zaten dB olduğundan oran analizi için çıkarma (subtract) işlemi yapılır.
var difference = postSAR.subtract(preSAR).rename('LR');
var methodB_Mask = difference.lte(-3).selfMask();

// YÖNTEM C: JRC Geçici Taşkın
var jrcMonthly = ee.ImageCollection('JRC/GSW1_4/MonthlyHistory');
var floodMonth = jrcMonthly.filter(ee.Filter.and(ee.Filter.eq('year',2021), ee.Filter.eq('month',8))).first().select('water').eq(2).rename('fw').clip(geometry);
var refMonths = jrcMonthly.filter(ee.Filter.and(ee.Filter.eq('month',8), ee.Filter.lt('year',2021))).map(function(img){ return img.select('water').eq(2); });
var refFreq = refMonths.mean().rename('rf').clip(geometry);
var permanentWater = refFreq.gt(0.5); 
var methodC_Mask = floodMonth.and(permanentWater.not()).selfMask(); 


// ==============================================================================
// --- 5. HARİTA ARAYÜZÜ (İKİ AYRI HARİTA) ---
// ==============================================================================
var rgbVis = {min: 0.0, max: 0.3, bands: ['B4', 'B3', 'B2'], gamma: 1.4}; 

// --- SOL PANEL (SEL ÖNCESİ) ---
var leftMap = ui.Map(); leftMap.setOptions('HYBRID');
leftMap.setControlVisibility({scaleControl: true}); 
leftMap.add(ui.Label('SEL ÖNCESİ', {position: 'top-center', fontWeight: 'bold'}));
leftMap.addLayer(preImage, rgbVis, 'Gerçek Renk (RGB)');
var northArrow = ui.Panel({style: {position: 'bottom-left', padding: '8px', backgroundColor: 'rgba(255, 255, 255, 0.7)'}});
northArrow.add(ui.Label({value: 'N ⬆', style: {fontSize: '24px', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0)'}}));
leftMap.add(northArrow);

// --- SAĞ PANEL (SEL SONRASI VE KATMANLAR) ---
var rightMap = ui.Map(); rightMap.setOptions('HYBRID');
rightMap.add(ui.Label('SEL SONRASI HARİTASI', {position: 'top-center', fontWeight: 'bold'}));
rightMap.addLayer(postImage, rgbVis, 'Gerçek Renk (RGB)');

rightMap.addLayer(methodA_Mask, {palette: ['0066FF']}, 'Yöntem A: Optik (MNDWI)', true);
rightMap.addLayer(methodB_Mask, {palette: ['FF0000']}, 'Yöntem B: Radar (SAR Farkı)', false);
rightMap.addLayer(methodC_Mask, {palette: ['FFD700']}, 'Yöntem C: JRC Geçici Taşkın', false);
rightMap.addLayer(permanentWater.selfMask(), {palette: ['1E90FF']}, 'Referans: JRC Kalıcı Su', false);

// --- LEJANT ---
var legend = ui.Panel({style: {position: 'bottom-right', padding: '8px 15px'}});
legend.add(ui.Label({value: 'ANALİZ LEJANTI', style: {fontWeight: 'bold'}}));
var makeRow = function(color, name) {
  return ui.Panel({widgets: [
    ui.Label({style: {backgroundColor: color, padding: '8px', margin: '0 4px 4px 0'}}), 
    ui.Label({value: name, style: {margin: '0 0 4px 0'}})
  ], layout: ui.Panel.Layout.Flow('horizontal')});
};
legend.add(makeRow('#0066FF', 'Yöntem A: Optik Taşkın'));
legend.add(makeRow('#FF0000', 'Yöntem B: Radar Taşkın'));
legend.add(makeRow('#FFD700', 'Yöntem C: Geçici Taşkın'));
rightMap.add(legend);

// --- BİRLEŞTİRME ---
var linker = ui.Map.Linker([leftMap, rightMap]); leftMap.centerObject(geometry, 14);
ui.root.clear(); ui.root.add(ui.SplitPanel({firstPanel: leftMap, secondPanel: rightMap, wipe: false, style: {stretch: 'both'}}));

var alanHa = function(mask, ad){
  var dict = mask.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: geometry, scale: 30, maxPixels: 1e10,
    tileScale: 8, bestEffort: true
  });
  print(ad + '  (hektar):', ee.Number(dict.values().get(0)).divide(1e4).round());
};
 
print('================ SEL · ALAN SONUÇLARI ================');
alanHa(methodA_Mask, 'Yöntem A · Optik Taşkın (MNDWI)');
alanHa(methodB_Mask, 'Yöntem B · Radar Taşkın (SAR)');
alanHa(methodC_Mask, 'Yöntem C · Geçici Taşkın (JRC)');

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
calcMOO(methodA_Mask, methodB_Mask, 'Yöntem A ve Yöntem B');
calcMOO(methodA_Mask, methodC_Mask, 'Yöntem A ve Yöntem C');
calcMOO(methodB_Mask, methodC_Mask, 'Yöntem B ve Yöntem C');
