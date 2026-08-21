# satellite-based-environmental-change-analysis
<div align="center">

# Satellite-Based Environmental Change Analysis

**English** | [Türkçe](#türkçe)

</div>

---

## English

Spatiotemporal analysis of environmental change following multiple disaster events (wildfire, flood, earthquake) using satellite imagery on Google Earth Engine (GEE). This repository contains the GEE JavaScript scripts developed for a Master's thesis in Software Engineering at Fırat University.

### Case Studies

| Disaster | Location | Method(s) |
|---|---|---|
| Wildfire | Manavgat | NBR / dNBR / RdNBR, Landsat 8 optical difference |
| Flood | Kastamonu–Bozkurt | MNDWI, SAR backscatter difference |
| Earthquake | Elazığ–Sivrice | SAR backscatter difference, coherence proxy |

### Data Sources

- **Sentinel-1** (SAR — C-band)
- **Sentinel-2** (multispectral optical)
- **Landsat 8** (optical)

All data was accessed and processed through Google Earth Engine.

### Methodology

Each case study uses a pre-/post-event comparative analysis:

- **SAR Backscatter Difference** — computed as a direct subtraction, since GRD data is already in dB (not a ratio + log10 transform).
- **Coherence Proxy** — used to detect structural/surface change after the earthquake.
- **MNDWI** (Modified Normalized Difference Water Index) — used to map flood-related water extent change.
- **NBR / dNBR / RdNBR** — used to assess burn severity and burned area extent.
- **Landsat 8 Optical Difference** — used as a complementary validation layer.

### Usage

1. Create a [Google Earth Engine](https://earthengine.google.com/) account.
2. Paste the relevant `.js` script into the [GEE Code Editor](https://code.earthengine.google.com/).
3. Update the date range and AOI (area of interest) parameters for the disaster you're analyzing.
4. Run the script to generate pre-/post-event difference maps and statistics.

### Repository Structure

```
├── manavgat-wildfire/
│   └── nbr-dnbr-analysis.js
├── kastamonu-flood/
│   └── mndwi-sar-analysis.js
├── elazig-earthquake/
│   └── sar-coherence-analysis.js
└── README.md
```

### Citation

This code is associated with the following Master's thesis:

> Ayşenur Toprak Can, "Spatiotemporal Analysis of Environmental Change Using Satellite Imagery," Master's Thesis, Fırat University, 2026. Supervisor: Dr. Muhammed Emre Çolak.

### Contact

Feel free to open an issue, or reach out via [LinkedIn](https://www.linkedin.com).

---

## Türkçe

Google Earth Engine (GEE) tabanlı, çoklu afet senaryolarında (orman yangını, sel, deprem) çevresel değişimin uydu verileriyle tespit ve analizine yönelik bir çalışma. Bu depo, Fırat Üniversitesi Yazılım Mühendisliği Anabilim Dalı yüksek lisans tezi kapsamında geliştirilen GEE JavaScript kodlarını içerir.

### İncelenen Afetler

| Afet | Bölge | Kullanılan Yöntem(ler) |
|---|---|---|
| Orman Yangını | Manavgat | NBR / dNBR / RdNBR, Landsat 8 optik fark |
| Sel | Kastamonu–Bozkurt | MNDWI, SAR geri saçılım farkı |
| Deprem | Elazığ–Sivrice | SAR geri saçılım farkı, koherans proxy |

### Veri Kaynakları

- **Sentinel-1** (SAR — C-band)
- **Sentinel-2** (çok bantlı optik)
- **Landsat 8** (optik)

Tüm veriler Google Earth Engine üzerinden erişilmiş ve işlenmiştir.

### Yöntem

Her afet için olay öncesi/sonrası karşılaştırmalı analiz yapılmıştır:

- **SAR Geri Saçılım Farkı** — GRD verisi dB cinsinden olduğundan öncesi/sonrası fark alınarak hesaplanmıştır (oranlama + log10 değil, doğrudan çıkarma).
- **Koherans Proxy** — Deprem sonrası yapısal/yüzeysel değişimin tespiti için kullanılmıştır.
- **MNDWI** (Modified Normalized Difference Water Index) — Sel kaynaklı su yüzeyi değişiminin haritalanması için kullanılmıştır.
- **NBR / dNBR / RdNBR** — Yangın şiddeti ve yanmış alan tespiti için kullanılmıştır.
- **Landsat 8 Optik Fark Analizi** — Tamamlayıcı doğrulama katmanı olarak kullanılmıştır.

### Kullanım

1. [Google Earth Engine](https://earthengine.google.com/) hesabı oluşturun.
2. İlgili `.js` script dosyasını [GEE Code Editor](https://code.earthengine.google.com/)'e yapıştırın.
3. İlgilendiğiniz afete göre tarih aralığı ve AOI (ilgi alanı) parametrelerini güncelleyin.
4. Script'i çalıştırarak öncesi/sonrası fark haritalarını ve istatistikleri üretin.

### Klasör Yapısı

```
├── manavgat-yangin/
│   └── nbr-dnbr-analiz.js
├── kastamonu-sel/
│   └── mndwi-sar-analiz.js
├── elazig-deprem/
│   └── sar-koherans-analiz.js
└── README.md
```

### Kaynak Gösterimi

Bu kod, aşağıdaki yüksek lisans teziyle ilişkilidir:

> Ayşenur Toprak Can, "Uydu Görüntüleri ile Çevresel Değişimlerin Mekânsal ve Zamansal Olarak İncelenmesi", Yüksek Lisans Tezi, Fırat Üniversitesi, 2026. Danışman: Dr. Öğr. Üyesi Muhammed Emre Çolak.

### İletişim

Sorularınız için bir issue açabilir ya da [LinkedIn](https://www.linkedin.com) üzerinden ulaşabilirsiniz.
