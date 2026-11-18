<div align="center">

<img src="icons/icon128.png" width="84" height="84" alt="Better Chrome Downloads" />

# Better Chrome Downloads

**Chrome'un kendi Material 3 (GM3) görünümünü bozmadan eksik olan tüm indirme özelliklerini geri getiren hafif, %100 yerel Manifest V3 eklentisi.**

*A lightweight, zero-telemetry Manifest V3 extension that upgrades Chrome's native Download Bubble and `chrome://downloads` UI with 1-click URL copying, source tracking, category filters, and full control.*

[![Son Sürümü İndir](https://img.shields.io/badge/%E2%AC%87%EF%B8%8F_Son_S%C3%BCr%C3%BCm%C3%BC_%C4%B0ndir_(ZIP)-1a73e8?style=for-the-badge)](https://github.com/HolyZephyros/better-chrome-downloads/releases/latest/download/better-chrome-downloads.zip)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34a853?style=for-the-badge)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-fbbc04?style=for-the-badge)](LICENSE)

</div>

---

## 🇹🇷 Türkçe

### Özellikler
- **Birebir Chrome Material 3 (GM3) Arayüzü:** Hem sağ üstteki *Son indirmeler* balonu hem de tam sekme görünümü Chrome'un kendi koyu/açık temasıyla birebir aynı görünür.
- **Tek Tıkla İndirme Bağlantısı Kopyalama:** Chrome'un gizlediği tam indirme URL'sini açıkça gösterir ve tek tıkla panoya kopyalar.
- **Kaynak Sayfa (Referrer) Takibi:** Dosyanın hangi siteden indirildiğini gösterir; tıklayınca kaynak URL'yi kopyalar, `Shift + Tık` ile sayfayı yeni sekmede açar.
- **Canlı Hız & Kalan Süre:** Anlık hız (`MB/sn`), inen/toplam boyut, kalan süre ve araç çubuğu simgesinde canlı `%` rozeti.
- **Kategori Filtreleri & Arama:** `Tümü`, `Aktif`, `Arşiv`, `Uygulama`, `Medya`, `Görsel`, `Belge` filtreleri ve hızlı arama (`/`).
- **Tam Kontrol & Güvenli Silme:** Duraklat, devam et, iptal et, tekrar indir, bağlantıdan manuel indirme başlat, listeden kaldır veya dosyayı doğrudan diskten sil.
- **Varsayılan Balonu Gizleme:** Chrome'un kısıtlı varsayılan indirme balonunu otomatik devre dışı bırakır *(ayarlardan değiştirilebilir)*.
- **%100 Çevrimdışı & Şeffaf:** Harici kütüphane, takip kodu veya sunucu bağlantısı yoktur; tüm kod doğrudan tarayıcıda çalışır.

### Kurulum (30 Saniye)
1. Yukarıdaki **[⬇️ Son Sürümü İndir (ZIP)](https://github.com/HolyZephyros/better-chrome-downloads/releases/latest/download/better-chrome-downloads.zip)** butonuna tıklayıp indir ve `.zip` dosyasını kalıcı bir klasöre çıkart *(veya `git clone https://github.com/HolyZephyros/better-chrome-downloads.git` çalıştır)*.
2. Chrome adres çubuğuna `chrome://extensions` yazıp gir ve sağ üstten **Geliştirici modu** anahtarını aç.
3. Sol üstteki **Paketlenmemiş öğe yükle** butonuna tıklayıp çıkarttığın klasörü seç.
4. Sağ üstteki yapboz (`🧩`) simgesinden eklentiyi araç çubuğuna sabitle (📌).

**Kısayollar:** `Alt + J` (Balonu aç) • `Alt + Shift + J` (Tam sayfa aç)

---

## 🇬🇧 English

### Features
- **Authentic Chrome Material 3 (GM3) Design:** Matches Chrome's native *Recent downloads* bubble and `chrome://downloads` page in both Dark and Light modes.
- **1-Click Copy Download Link:** Exposes the full direct download URL hidden by modern Chrome and copies it with a single click.
- **Referrer Page Tracking:** Displays the source domain (`← site.com`) — click to copy the source URL, or `Shift + Click` to open the page.
- **Live Speed, Progress & Toolbar Badge:** Real-time `MB/s` speed, remaining time estimate, and live `%` badge on the toolbar icon.
- **Category Filters & Instant Search:** Filter by `All`, `Active`, `Archive`, `App`, `Media`, `Image`, `Document`, plus instant search (`/`).
- **Full File Management:** Pause, resume, retry, start new downloads from raw URLs, remove from list, or permanently delete files from disk.
- **Suppresses Default Bubble:** Automatically hides Chrome's limited built-in download bubble via `chrome.downloads.setUiOptions`.
- **Zero Dependencies & 100% Local:** Pure vanilla JS/CSS with zero telemetry or network requests.

### Installation (Load Unpacked)
1. Click **[⬇️ Download Latest ZIP](https://github.com/HolyZephyros/better-chrome-downloads/releases/latest/download/better-chrome-downloads.zip)** above and extract it to a permanent folder *(or `git clone` this repository)*.
2. Open `chrome://extensions` in Chrome / Chromium and enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the extracted folder.
4. Pin the extension icon to your toolbar from the Extensions (`🧩`) menu.

---

## License
Released under the [MIT License](LICENSE).
