// ==============================================================================
// MANAVGAT ORMAN YANGINI: ÜÇ YÖNTEMLİ (A, B, C) İKİ AYRI HARİTA KODU
// (SU ALANLARI MASKELENMİŞ + BELLEK HATASI DÜZELTİLMİŞ + MOO + NDVI ORTALAMA EKLENMİŞ SÜRÜM)
// ==============================================================================

// --- 1. AYARLAR VE GEOMETRİ (MANAVGAT) ---
var geometry = ee.Geometry.Polygon([
  [[31.15, 37.15], [31.15, 36.55], [31.85, 36.55], [31.85, 37.15]]
]);

// Tarihler
var preDateStart = '2021-06-15'; var preDateEnd = '2021-07-25'; // Yangın öncesi
var postDateStart = '2021-08-05'; var postDateEnd = '2021-09-15'; // Yangın sonrası
var chartStart = '2021-05-01'; var chartEnd = '2021-10-01'; // Grafik aralığı

// --- SU MASKESİ (JRC Global Surface Water) ---
var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');
var waterMask = gsw.select('occurrence').gt(50).unmask(0); // %50+ zamanda su olan pikseller
var landMask = waterMask.not(); // Kara alanı = su olmayan

// --- 2. VERİ HAZIRLIĞI ---
function prepareS2(image) {
  var scl = image.select('SCL');
  var mask = scl.eq(3).or(scl.eq(8)).or(scl.eq(9)).or(scl.eq(10)).or(scl.eq(11)).not();
  var nbr = image.normalizedDifference(['B8', 'B12']).rename('NBR'); 
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI'); 
  return image.updateMask(mask).divide(10000).addBands(nbr).addBands(ndvi)
              .copyProperties(image, ['system:time_start']);
}

// Sentinel-2 (Optik)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geometry)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

// Görüntüleri Oluştur (kara maskesi uygulanmış)
var preImage = s2.filterDate(preDateStart, preDateEnd).map(prepareS2).median().clip(geometry).updateMask(landMask);
var postImage = s2.filterDate(postDateStart, postDateEnd).map(prepareS2).median().clip(geometry).updateMask(landMask);

// ==============================================================================
// --- ANALİZ YÖNTEMLERİ (TABLO 4.1) ---
// ==============================================================================

var dNBR = preImage.select('NBR').subtract(postImage.select('NBR')).rename('dNBR');

// --- YÖNTEM A: dNBR Eşik Tespiti ---
var methodA_Mask = dNBR.gt(0.25).selfMask();

// --- YÖNTEM B: USGS/FIREMON Şiddet Sınıflandırması ---
var lowSev   = dNBR.gte(0.100).and(dNBR.lt(0.270)); // Düşük Şiddet
var modSev   = dNBR.gte(0.270).and(dNBR.lt(0.440)); // Orta Şiddet
var highSev  = dNBR.gte(0.440).and(dNBR.lt(0.660)); // Yüksek Şiddet
var vHighSev = dNBR.gte(0.660);                     // Çok Yüksek Şiddet

var methodB_Classified = ee.Image(0)
  .where(lowSev, 1)
  .where(modSev, 2)
  .where(highSev, 3)
  .where(vHighSev, 4).selfMask();

// --- YÖNTEM C: RdNBR (Göreceli dNBR) ---
// RdNBR = dNBR / sqrt(|PreNBR|)
var preNbrAbs = preImage.select('NBR').abs();
var rdNBR = dNBR.divide(preNbrAbs.sqrt()).rename('RdNBR');
var methodC_Mask = rdNBR.gt(0.3).selfMask(); // RdNBR eşiği ile maskeleme

// ==============================================================================
// --- 3. KONSOL GRAFİKLERİ VE ANALİZ ---
// ==============================================================================
print('🔥 MANAVGAT YANGINI DETAYLI ANALİZ RAPORU (ÜÇ YÖNTEMLİ)');

// Grafikler için de kara maskesi uygulanmış koleksiyon
var s2ChartMasked = s2.filterDate(chartStart, chartEnd).map(prepareS2).map(function(img) {
  return img.updateMask(landMask);
});

// GRAFİK 1: NBR (YANMA İNDEKSİ)
var chartNBR = ui.Chart.image.series({
  imageCollection: s2ChartMasked.select('NBR'), 
  region: geometry, reducer: ee.Reducer.mean(), scale: 250
}).setOptions({
  title: 'NBR Yanma İndeksi (Yangın anında düşüş)', 
  vAxis: {title: 'NBR Değeri'}, colors: ['red'], lineWidth: 2
});
print(chartNBR);

// GRAFİK 2: NDVI (BİTKİ SAĞLIĞI)
var chartNDVI = ui.Chart.image.series({
  imageCollection: s2ChartMasked.select('NDVI'), 
  region: geometry, reducer: ee.Reducer.mean(), scale: 250
}).setOptions({
  title: 'NDVI Bitki Sağlığı Değişimi', 
  vAxis: {title: 'NDVI Değeri'}, colors: ['green'], lineWidth: 2
});
print(chartNDVI);

// ==============================================================================
// --- 4. HARİTA AYARLARI VE ARAYÜZ (İKİ AYRI HARİTA) ---
// ==============================================================================
var rgbVis = {min: 0.0, max: 0.3, bands: ['B4', 'B3', 'B2'], gamma: 1.4};
var falseColorVis = {min: 0.0, max: 0.4, bands: ['B8', 'B4', 'B3'], gamma: 1.2};

// --- SOL PANEL (YANGIN ÖNCESİ) ---
var leftMap = ui.Map(); leftMap.setOptions('HYBRID');
leftMap.setControlVisibility({scaleControl: true}); 

leftMap.add(ui.Label('YANGIN ÖNCESİ', {position: 'top-center', fontWeight: 'bold'}));
leftMap.addLayer(preImage, rgbVis, 'Gerçek Renk (RGB)');
leftMap.addLayer(preImage, falseColorVis, 'Analiz Modu (False Color)', false);

// Kuzey Oku
var northArrow = ui.Panel({
  style: {position: 'bottom-left', padding: '8px', backgroundColor: 'rgba(255, 255, 255, 0.7)'}
});
northArrow.add(ui.Label({value: 'N ⬆', style: {fontSize: '24px', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0)'}}));
leftMap.add(northArrow);

// --- SAĞ PANEL (YANGIN SONRASI VE HASAR YÖNTEMLERİ) ---
var rightMap = ui.Map(); rightMap.setOptions('HYBRID');
rightMap.add(ui.Label('YANGIN SONRASI HASAR TESPİTİ', {position: 'top-center', fontWeight: 'bold'}));

rightMap.addLayer(postImage, rgbVis, 'Gerçek Renk (RGB)', false);
rightMap.addLayer(postImage, falseColorVis, 'Analiz Modu (False Color)', true); 

// Yöntem Katmanları (B ve C karmaşa olmasın diye başlangıçta kapalı - false)
rightMap.addLayer(methodA_Mask, {palette: ['FF4500']}, 'Yöntem A: dNBR Eşik (>0.25)', true);
rightMap.addLayer(methodB_Classified, {min: 1, max: 4, palette: ['FFFF00', 'FFA500', 'FF4500', '8B0000']}, 'Yöntem B: USGS Şiddet Sınıflandırması', false);
rightMap.addLayer(methodC_Mask, {palette: ['8A2BE2']}, 'Yöntem C: RdNBR Hasar Alanı', false);

// --- 5. LEJANT ---
var legend = ui.Panel({style: {position: 'bottom-right', padding: '8px 15px'}});
legend.add(ui.Label({value: 'ANALİZ LEJANTI', style: {fontWeight: 'bold'}}));

var makeRow = function(color, name) {
  return ui.Panel({widgets: [
    ui.Label({style: {backgroundColor: color, padding: '8px', margin: '0 4px 4px 0'}}), 
    ui.Label({value: name, style: {margin: '0 0 4px 0'}})
  ], layout: ui.Panel.Layout.Flow('horizontal')});
};

legend.add(makeRow('#FF4500', 'Yöntem A: dNBR Tek Sınıf'));
legend.add(makeRow('#FFFF00', 'Yöntem B: Düşük Şiddet'));
legend.add(makeRow('#FFA500', 'Yöntem B: Orta Şiddet'));
legend.add(makeRow('#8B0000', 'Yöntem B: Çok Yüksek Şiddet'));
legend.add(makeRow('#8A2BE2', 'Yöntem C: RdNBR Hasar'));
rightMap.add(legend);

// --- BİRLEŞTİRME (WIPE: FALSE) ---
var linker = ui.Map.Linker([leftMap, rightMap]); leftMap.centerObject(geometry, 11);
ui.root.clear(); ui.root.add(ui.SplitPanel({firstPanel: leftMap, secondPanel: rightMap, wipe: false, style: {stretch: 'both'}}));

// ==============================================================================
// --- 6. ALAN HESAPLARI (BELLEK HATASI İÇİN tileScale + bestEffort EKLENDİ) ---
// ==============================================================================
var alanHa = function(mask, ad){
  var dict = mask.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geometry,
    scale: 30,
    maxPixels: 1e10,
    tileScale: 8,       // hesabı küçük parçalara bölerek bellek kullanımını azaltır
    bestEffort: true     // gerekirse ölçeği otomatik hafifçe kabalaştırır
  });
  print(ad + '  (hektar):', ee.Number(dict.values().get(0)).divide(1e4).round());
};

print('================ YANGIN · ALAN SONUÇLARI ================');
alanHa(methodA_Mask,  'Yöntem A · Toplam Yanan (dNBR>0.25)');

// Yöntem B Toplam Alan (basitleştirilmiş, methodB_Classified'e bağımlı değil)
var methodB_TotalMask = dNBR.gte(0.100).selfMask();
alanHa(methodB_TotalMask, 'Yöntem B · TOPLAM YANAN ALAN (dNBR>=0.100)');

alanHa(lowSev,        'Yöntem B · Düşük Şiddet (0.10-0.27)');
alanHa(modSev,        'Yöntem B · Orta Şiddet (0.27-0.44)');
alanHa(highSev,       'Yöntem B · Yüksek Şiddet (0.44-0.66)');
alanHa(vHighSev,      'Yöntem B · Çok Yüksek Şiddet (>0.66)');
alanHa(methodC_Mask,  'Yöntem C · RdNBR Hasar');

// ==============================================================================
// --- 7. YÖNTEMLER ARASI MEKÂNSAL ÖRTÜŞME ORANI (MOO) ---
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
calcMOO(methodA_Mask, methodB_TotalMask, 'Yöntem A ve Yöntem B');
calcMOO(methodA_Mask, methodC_Mask, 'Yöntem A ve Yöntem C');
calcMOO(methodB_TotalMask, methodC_Mask, 'Yöntem B ve Yöntem C');

// ==============================================================================
// --- 8. NDVI ORTALAMA DEĞİŞİM HESABI (Özet/Abstract için gerçek yüzde) ---
// (Yalnızca Yöntem A'nın hasarlı bulduğu alan içinde, poligon geneli değil)
// ==============================================================================
var ndviMean = function(image, label){
  var dict = image.select('NDVI').updateMask(methodA_Mask).reduceRegion({
    reducer: ee.Reducer.mean(), geometry: geometry, scale: 30, maxPixels: 1e10,
    tileScale: 8, bestEffort: true
  });
  print(label + ' - Ortalama NDVI (yalnızca Yöntem A hasar alanı içinde):',
        ee.Number(dict.values().get(0)));
};

print('================ NDVI ORTALAMA DEĞİŞİM (yalnızca yanmış alan) ================');
ndviMean(preImage,  'Yangın ÖNCESİ');
ndviMean(postImage, 'Yangın SONRASI');
