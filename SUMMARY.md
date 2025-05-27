# Proje Özeti ve Servislerin Görevleri

Bu proje, Node.js tabanlı, mikroservis mimarisi ile geliştirilmiş bir sosyal medya/vlog platformudur. Her ana işlev için ayrı bir servis vardır. Servisler arası iletişim için HTTP (REST API) ve event-driven (Kafka) mimarisi kullanılır. Veritabanı olarak genellikle MongoDB, cache için Redis, arama için Elasticsearch, medya için MinIO kullanılır.

---

## 1. Genel Mimari ve Akış

- **Mikroservis mimarisi**: Her ana işlev için ayrı bir Node.js servisi.
- **API Gateway**: Tüm dış istekleri karşılar, ilgili servise yönlendirir, güvenlik ve rate limit uygular.
- **JWT ile Kimlik Doğrulama**: Tüm servislerde korumalı endpoint'ler için JWT doğrulama middleware'i kullanılır.
- **Kafka ile Event-Driven Mimari**: Servisler arası haberleşme ve asenkron işlemler için Kafka kullanılır.
- **Redis ile Cache**: Sık erişilen veriler Redis'te cache'lenir.
- **Docker Compose ile Orkestrasyon**: Tüm servisler, veritabanları ve yardımcı servisler Docker Compose ile ayağa kaldırılır.

---

## 2. Servisler ve Görevleri

### API Gateway
- Tüm dış istekleri karşılar, ilgili servise yönlendirir (proxy).
- Rate limit, CORS, güvenlik, JWT doğrulama gibi genel middleware'leri uygular.

### Auth Service
- Kullanıcı kimlik doğrulama (login, register), JWT token üretimi, rol yönetimi (admin, user) sağlar.

### User Service
- Kullanıcı profili, ayarları, takipçi/takip edilen yönetimi, kullanıcı istatistikleri.
- Takip/çıkart işlemleri, profil güncelleme, Redis ile cache, Kafka ile event yayını.

### Content Service
- Vlog (içerik) oluşturma, güncelleme, silme, onaylama, içeriklerin kategorilere atanması, içerik istatistikleri.
- İçerik CRUD işlemleri, admin onayı, içerik durum yönetimi, Kafka ile event yayını.

### Comment Service
- İçeriklere ve diğer yorumlara (nested) yorum ekleme, düzenleme, silme, beğenme.
- Yorum CRUD, nested (hiyerarşik) yapı, Redis ile cache, Kafka ile event yayını.

### Category Service
- İçerik kategorileri oluşturma, güncelleme, silme, kategori ağacı (tree) yönetimi.
- Kategori CRUD, parent-child ilişkisi, slug üretimi, Redis ile cache, Kafka ile event yayını.

### Media Service
- Video, resim, ses dosyası gibi medya içeriklerinin yüklenmesi, işlenmesi, saklanması.
- MinIO ile dosya saklama, presigned URL ile upload/download, medya işleme (thumbnail, transcode), Redis ile cache, Kafka ile event yayını.

### Notification Service
- Kullanıcıya bildirim gönderme (yeni takipçi, beğeni, yorum, sistem mesajı vs).
- Bildirim CRUD, okunma durumu, Redis ile cache, Kafka ile event dinleme ve yayını.

### Search Service
- İçerik, kullanıcı, kategori gibi nesnelerde tam metin arama ve filtreleme.
- Elasticsearch ile arama, otomatik indexleme, öneri (autocomplete), Kafka ile event dinleme.

### Analytics Service
- Platformdaki kullanıcı ve içerik etkileşimlerini (görüntüleme, beğeni, paylaşım, arama, tıklama vb.) toplar ve raporlar.
- Event tracking, toplu analiz, günlük/haftalık/aylık raporlar, Redis ile cache, Kafka ile event yayını.

### Admin Service
- Yöneticiler için içerik, kullanıcı, kategori, bildirim, istatistik yönetimi.
- Sadece admin rolündeki kullanıcılar erişebilir. Diğer servislerle entegre çalışır.

---

## 3. Ortak Özellikler ve Güvenlik

- **JWT ile Kimlik Doğrulama:** Tüm servislerde korumalı endpoint'ler için JWT doğrulama middleware'i eklendi.
- **Kafka ile Event-Driven Mimari:** Servisler arası haberleşme ve asenkron işlemler için Kafka kullanıldı.
- **Redis ile Cache:** Sık erişilen veriler Redis'te cache'leniyor.
- **Docker Compose ile Orkestrasyon:** Tüm servisler, veritabanları ve yardımcı servisler Docker Compose ile ayağa kaldırılıyor.
- **Her servisin kendi Dockerfile'ı ve package.json'u var.**

---

## 4. Şu Ana Kadar Neler Yaptık?

- Tüm servislerin temel dosya yapısı ve Dockerfile'ları oluşturuldu.
- Her servisin model, controller, route ve middleware dosyaları yazıldı.
- Tüm servislerde JWT auth middleware'i eklendi.
- Servisler arası event akışı için Kafka entegrasyonu yapıldı.
- Redis ile cache mekanizması kuruldu.
- MinIO, Elasticsearch, MongoDB gibi altyapı servisleri entegre edildi.
- API Gateway ile merkezi yönlendirme ve güvenlik sağlandı.
- Her servisin package.json ve .env örnekleri oluşturuldu.
- Eksik veya hatalı olan yerler (ör: auth middleware, fonksiyon isimleri, eksik paketler) düzeltildi.
- Tüm servisler ayağa kaldırıldı ve çalışır duruma getirildi.

---

## 5. Servislerin Çalışma Akışı Örneği

1. **Kullanıcı kayıt olur:**  
   API Gateway → Auth Service → User Service
2. **Kullanıcı içerik ekler:**  
   API Gateway → Content Service → Media Service (dosya yükleme) → Category Service (kategori seçimi)
3. **Kullanıcı içerik arar:**  
   API Gateway → Search Service (Elasticsearch)
4. **Kullanıcı içerik beğenir:**  
   API Gateway → Content Service → Analytics Service → Notification Service
5. **Yorum eklenir:**  
   API Gateway → Comment Service → Notification Service
6. **Admin paneli:**  
   API Gateway → Admin Service → Diğer servisler

---

## 6. Kısaca Her Servisin Görevi

| Servis            | Görev                                                                 |
|-------------------|-----------------------------------------------------------------------|
| API Gateway       | Tüm istekleri karşılar, yönlendirir, güvenlik ve rate limit uygular   |
| Auth Service      | Kimlik doğrulama, JWT üretimi, rol yönetimi                           |
| User Service      | Kullanıcı profili, takip sistemi, ayarlar                             |
| Content Service   | İçerik (vlog) yönetimi, onay, istatistik                              |
| Comment Service   | Yorum ekleme, silme, beğenme, nested yapı                             |
| Category Service  | Kategori yönetimi, hiyerarşi, slug                                    |
| Media Service     | Medya dosyası yükleme, işleme, MinIO ile saklama                      |
| Notification Svc  | Bildirim gönderme, okuma, silme, Kafka ile event dinleme              |
| Search Service    | Tam metin arama, filtreleme, Elasticsearch                            |
| Analytics Service | Etkileşim takibi, raporlama, toplu analiz                             |
| Admin Service     | Yönetici işlemleri, istatistik, içerik ve kullanıcı yönetimi          |

---

Daha fazla detay veya bir servisin kodunu/akışını özel olarak incelemek istersen, belirtmen yeterli! 