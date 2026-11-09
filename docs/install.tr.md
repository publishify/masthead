# Publishify Masthead kurulum rehberi

Masthead, kitabını bir yayınevi kadrosu gibi okuyan yapay zekâ yayın kuruludur. Kurmak için programlama bilmen gerekmez; birkaç satır yapıştırıp Enter'a basacaksın.

> **Erken erişim:** Masthead için lisans gerekir. İstemek için info@publishify.app adresine yaz.

## 1. Gerekenler

- Ücretli bir [Claude](https://claude.com/pricing) hesabı
- [Claude Code](https://claude.com/claude-code): sayfadaki kurulum adımlarını izle
- [Node.js](https://nodejs.org): LTS yazan sürümü indir, normal bir uygulama gibi kur
- Google hesabının e-postasına tanımlı bir Masthead lisansı

## 2. Terminal'i aç

- **Mac:** `Cmd` + `Boşluk`, `Terminal` yaz, Enter.
- **Windows:** Başlat menüsünde `Terminal` yaz, Enter.

## 3. Kitabının klasörüne git

`cd` yaz, bir boşluk bırak, kitabının klasörünü Terminal penceresine sürükle ve Enter'a bas. Sonra Claude'u başlat:

```
claude
```

## 4. Masthead'i ekle

Claude'un içinde şunları tek tek yapıştır, her birinden sonra Enter'a bas:

```
/plugin marketplace add publishify/masthead
```

```
/plugin install masthead@publishify
```

**Install for you** seçeneğini seç. Sonra `/exit` yaz, yeniden `claude` komutunu çalıştır.

## 5. Kitabını incelet

```
/masthead:review kitabim.docx novel
```

Dosya adını kendi kitabınla değiştir. İlk seferde tarayıcı açılır: **Continue with Google**'a bas ve lisansının olduğu hesapla gir.

İnceleme bitince rapor kendiliğinden açılır; aynı klasörde `masthead-dashboard.html` olarak durur. Sonra yeniden görmek için:

```
/masthead:status
```

**Dosya türleri:** Word (`.docx`), kopya korumasız EPUB (`.epub`), Markdown (`.md`), düz metin (`.txt`).

**Kitap türleri:** `novel` (roman), `novella`, `short-story` (öykü), `memoir` (anı), `biography` (biyografi), `play` (oyun). Beta: `essay` (deneme), `flash-fiction` (küçürek), `non-fiction` (kurgu dışı).

## Sorun çıkarsa

| Gördüğün | Yapılacak |
|---|---|
| `claude: command not found` | Claude Code'u kur, Terminal'i kapatıp yeniden aç |
| `node: command not found` | Node.js'i kur, Terminal'i kapatıp yeniden aç |
| Erişim yok diyor (`NO_LICENSE`) | Lisansın olduğu Google hesabıyla gir ya da lisans iste |
| Dosyayı bulamıyor | Claude'u kitabın olduğu klasörde başlattığından emin ol |
| Kullanım sınırında duruyor | Sınır yenilenince aynı komutu çalıştır; biten iş tekrarlanmaz |

Yapay zekâ hata yapabilir; her notu kendi yargınla oku.

[English](install.md)
