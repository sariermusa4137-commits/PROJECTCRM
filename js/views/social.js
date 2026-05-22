// Gayrimenkul CRM - Sosyal Medya Taslak Üretici Görünümü

import { state } from '../store.js';
import { showToast } from '../components/ui.js';

let selectedPortfolioId = "";
let selectedPlatform = "reels";
let selectedTone = "luxury";
let customFocus = "";

export function renderSocialView(container) {
    const portfolioSelect = container.querySelector('#social-portfolio');
    if (portfolioSelect) {
        const currentVal = portfolioSelect.value;
        const portfolioOptions = state.portfolios.map(p => 
            `<option value="${p.id}">${p.title} (${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p.price)})</option>`
        ).join('');
        portfolioSelect.innerHTML = `
            <option value="">-- Serbest Metin Girişi (Manuel Özellikler) --</option>
            ${portfolioOptions}
        `;
        if (state.portfolios.some(p => p.id === currentVal) || currentVal === "") {
            portfolioSelect.value = currentVal;
        } else {
            portfolioSelect.value = "";
            const manualSection = container.querySelector('#manual-specs-section');
            if (manualSection) manualSection.style.display = "block";
        }
        return;
    }

    // 1. Get portfolios options
    const portfolioOptions = state.portfolios.map(p => 
        `<option value="${p.id}">${p.title} (${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p.price)})</option>`
    ).join('');

    // 2. Render layout
    container.innerHTML = `
        <div class="view-header">
            <div>
                <h2>Sosyal Medya İçerik Taslakları</h2>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">Portföyleriniz için hazır ilan açıklamaları, Reels senaryoları ve LinkedIn gönderileri hazırlayın.</p>
            </div>
        </div>

        <div class="social-layout">
            <!-- Left Side: Customizer Form -->
            <div class="card">
                <h3>İçerik Yapılandırıcı</h3>
                <p style="font-size:11px; color:var(--text-secondary); margin-top:4px; margin-bottom:20px;">Bir portföy seçin veya özellikleri özelleştirerek anında metin oluşturun.</p>
                
                <form id="form-social-gen">
                    <div class="form-group">
                        <label for="social-portfolio">Portföy Seçin</label>
                        <select id="social-portfolio">
                            <option value="">-- Serbest Metin Girişi (Manuel Özellikler) --</option>
                            ${portfolioOptions}
                        </select>
                    </div>

                    <!-- Manual specs (only shown or editable if portfolio is empty) -->
                    <div id="manual-specs-section">
                        <div class="form-group">
                            <label for="s-title">Başlık / Açıklama</label>
                            <input type="text" id="s-title" placeholder="Örn: Caddebostan Sahilde Sıfır Lüks Daire" value="Göztepe Harika Konumlu Lüks Daire">
                        </div>
                        <div class="form-group-three">
                            <div class="form-group">
                                <label for="s-price">Fiyat (TL)</label>
                                <input type="number" id="s-price" placeholder="Fiyat..." value="10500000">
                            </div>
                            <div class="form-group">
                                <label for="s-type">İlan Türü</label>
                                <select id="s-type">
                                    <option value="Satılık">Satılık</option>
                                    <option value="Kiralık">Kiralık</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="s-prop-type">Emlak Tipi</label>
                                <select id="s-prop-type">
                                    <option value="Daire">Daire</option>
                                    <option value="Villa">Villa</option>
                                    <option value="Arsa">Arsa</option>
                                    <option value="Ticari">Ticari</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group-three">
                            <div class="form-group">
                                <label for="s-rooms">Oda</label>
                                <input type="text" id="s-rooms" placeholder="Örn: 3+1" value="3+1">
                            </div>
                            <div class="form-group">
                                <label for="s-area">Net m²</label>
                                <input type="number" id="s-area" placeholder="Net Alan..." value="130">
                            </div>
                            <div class="form-group">
                                <label for="s-district">İlçe / Mahalle</label>
                                <input type="text" id="s-district" placeholder="Örn: Kadıköy Göztepe" value="Kadıköy Göztepe">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="s-focus">Öne Çıkarılacak Özellik (Vurgu)</label>
                        <input type="text" id="s-focus" placeholder="Örn: Bağdat Caddesi'ne yürüme mesafesinde, ebeveyn banyolu ve otoparklı" value="Bağdat Caddesi'ne 2. parsel, lüks işçilik ve çift kapalı otoparklı">
                    </div>

                    <div class="form-group-row">
                        <div class="form-group">
                            <label for="social-platform">Platform / Format</label>
                            <select id="social-platform">
                                <option value="reels">Instagram Reels Senaryosu</option>
                                <option value="feed">Instagram/Facebook Gönderi Metni</option>
                                <option value="linkedin">LinkedIn Profesyonel İnceleme</option>
                                <option value="story">Instagram Story Fikirleri & Akışı</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="social-tone">Yazım Dili / Tonu</label>
                            <select id="social-tone">
                                <option value="luxury">Lüks & Prestijli</option>
                                <option value="energetic">Heyecanlı & Dikkat Çekici</option>
                                <option value="professional">Profesyonel & Bilgilendirici</option>
                                <option value="friendly">Samimi & Hikaye Anlatımı</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-full">✨ Sosyal Medya Taslağı Üret</button>
                </form>
            </div>

            <!-- Right Side: Output Preview & Checklist -->
            <div style="display:flex; flex-direction:column; gap:32px;">
                <div class="card social-output-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>Oluşturulan Taslak Metin</h3>
                        <button id="btn-copy-social" class="btn btn-outline" style="padding:6px 12px; font-size:12px;">📋 Kopyala</button>
                    </div>
                    
                    <div class="social-text-preview" id="social-preview-box">
                        <!-- Text will be rendered here -->
                    </div>
                </div>

                <!-- Social Media Checklist Card -->
                <div class="card">
                    <h3>Danışman Paylaşım Kontrol Listesi</h3>
                    <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">Sosyal medyada paylaşım yapmadan önce bu adımları mutlaka kontrol edin:</p>
                    
                    <ul class="social-checklist">
                        <li class="social-checklist-item">
                            <span class="social-check">✓</span>
                            <span><strong>Doğru Saat Seçimi:</strong> Reels paylaşımlarını 12:00-14:00 veya 18:30-20:30 saatleri arasında yapın.</span>
                        </li>
                        <li class="social-checklist-item">
                            <span class="social-check">✓</span>
                            <span><strong>Görsel Kalitesi:</strong> Fotoğraf veya videoların en az 1080p olmasına dikkat edin, merceği silmeyi unutmayın!</span>
                        </li>
                        <li class="social-checklist-item">
                            <span class="social-check">✓</span>
                            <span><strong>Konum Etiketi:</strong> Gönderiye mutlaka mülkün bulunduğu ilçe/mahalle konum etiketini ekleyin.</span>
                        </li>
                        <li class="social-checklist-item">
                            <span class="social-check">✓</span>
                            <span><strong>Call to Action (Eylem Çağrısı):</strong> Profilinizdeki WhatsApp linkinin güncel olduğunu ve açıklamada telefon numaranızın yazdığını doğrulayın.</span>
                        </li>
                        <li class="social-checklist-item">
                            <span class="social-check">✓</span>
                            <span><strong>Ekip Etkileşimi:</strong> Paylaştığınız gönderiyi acente grubuna atarak çalışma arkadaşlarınızın beğenmesini ve yorum yapmasını sağlayın.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    // 3. Setup Listeners
    setupSocialListeners();
    generateDraft(); // Generate initial draft
}

function setupSocialListeners() {
    const portfolioSelect = document.getElementById('social-portfolio');
    const manualSection = document.getElementById('manual-specs-section');

    portfolioSelect.addEventListener('change', (e) => {
        selectedPortfolioId = e.target.value;
        if (selectedPortfolioId) {
            // Hide manual entry elements, fill values
            manualSection.style.display = "none";
            const p = state.portfolios.find(item => item.id === selectedPortfolioId);
            if (p) {
                document.getElementById('s-focus').value = p.notes || "";
            }
        } else {
            manualSection.style.display = "block";
        }
        generateDraft();
    });

    document.getElementById('social-platform').addEventListener('change', (e) => {
        selectedPlatform = e.target.value;
        generateDraft();
    });

    document.getElementById('social-tone').addEventListener('change', (e) => {
        selectedTone = e.target.value;
        generateDraft();
    });

    document.getElementById('form-social-gen').addEventListener('submit', (e) => {
        e.preventDefault();
        customFocus = document.getElementById('s-focus').value.trim();
        generateDraft();
        showToast("Yeni içerik taslağı başarıyla oluşturuldu.", "success");
    });

    document.getElementById('btn-copy-social').addEventListener('click', () => {
        const text = document.getElementById('social-preview-box').innerText;
        navigator.clipboard.writeText(text).then(() => {
            showToast("Taslak başarıyla kopyalandı!", "success");
        }).catch(err => {
            showToast("Kopyalama başarısız oldu.", "error");
        });
    });
}

function generateDraft() {
    const previewBox = document.getElementById('social-preview-box');
    if (!previewBox) return;

    let title, price, type, propertyType, rooms, area, district, focus, notes;
    const agentName = state.currentUser ? state.currentUser.displayName : "Emlak Danışmanı";
    const agencyName = state.agency ? state.agency.name : "PROJECTCRM";

    if (selectedPortfolioId) {
        const p = state.portfolios.find(item => item.id === selectedPortfolioId);
        if (p) {
            title = p.title;
            price = p.price;
            type = p.type;
            propertyType = p.propertyType;
            rooms = p.rooms;
            area = p.area;
            district = `${p.district}, ${p.neighborhood}`;
            focus = document.getElementById('s-focus').value.trim() || p.notes || "";
            notes = p.notes;
        }
    } else {
        title = document.getElementById('s-title').value.trim();
        price = Number(document.getElementById('s-price').value) || 0;
        type = document.getElementById('s-type').value;
        propertyType = document.getElementById('s-prop-type').value;
        rooms = document.getElementById('s-rooms').value.trim();
        area = Number(document.getElementById('s-area').value) || 0;
        district = document.getElementById('s-district').value.trim();
        focus = document.getElementById('s-focus').value.trim();
        notes = focus;
    }

    const formatPrice = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price);

    let outputText = "";

    // Platform-specific content generators
    if (selectedPlatform === "reels") {
        outputText = generateReelsScript(title, formatPrice, type, propertyType, rooms, area, district, focus, agentName, agencyName);
    } else if (selectedPlatform === "feed") {
        outputText = generateFeedCaption(title, formatPrice, type, propertyType, rooms, area, district, focus, agentName, agencyName);
    } else if (selectedPlatform === "linkedin") {
        outputText = generateLinkedinPost(title, formatPrice, type, propertyType, rooms, area, district, focus, agentName, agencyName);
    } else if (selectedPlatform === "story") {
        outputText = generateStoryFlow(title, formatPrice, type, propertyType, rooms, area, district, focus, agentName, agencyName);
    }

    previewBox.innerText = outputText;
}

// 1. REELS SENARYOSU GENERATOR
function generateReelsScript(title, price, type, propType, rooms, area, district, focus, agentName, agencyName) {
    let hook = "";
    let voiceover1 = "";
    let ending = "";

    if (selectedTone === "luxury") {
        hook = `🔑 "İstanbul'un en prestijli caddesinde yaşam standartlarınızı yeniden tanımlamaya hazır mısınız?"`;
        voiceover1 = `Göz alıcı detayları, elit komşuları ve birinci sınıf işçiliğiyle burası sıradan bir ${propType} değil, adeta bir prestij simgesi. ${area} m² genişliğinde, ${rooms} odalı bu harika portföyümüz nihayet satışta.`;
        ending = `Bu olağanüstü mülkü yakından incelemek ve özel sunum randevusu almak için hemen profilimdeki linkten bana ulaşın.`;
    } else if (selectedTone === "energetic") {
        hook = `🔥 "DİKKAT! Son dönemin en hızlı satılacak portföyünün kapısından giriyoruz. Hazır mısınız?!"`;
        voiceover1 = `Kadıköy'ün kalbi ${district}'te, ${rooms} oda, geniş ve ferah ${area} metrekare kullanım alanı! Hem de fiyatı piyasa şartlarına göre harika! Fırsatı kaçırmamak için videoyu sonuna kadar izleyin!`;
        ending = `Acele edin, bu mülk bu fiyata çok durmaz! Hemen DM atın veya arayın!`;
    } else if (selectedTone === "professional") {
        hook = `📊 "Bölgedeki son 6 ayın m² birim fiyatı artış oranını ve bu harika yatırım fırsatını inceliyoruz."`;
        voiceover1 = `${district} bölgesinde yer alan ${area} m² genişliğindeki bu ${propType}, hem konumu hem de amortisman süresiyle güçlü bir yatırım argümanı sunuyor. Kentsel dönüşüm avantajları ve yüksek talep gören yapısıyla kaçırılmayacak bir fırsat.`;
        ending = `Bölge değer raporu ve detaylı finansal analizler için benimle iletişime geçebilirsiniz.`;
    } else {
        hook = `😊 "Merhaba arkadaşlar! Bugün size gezerken kendimi evimde hissettiğim, çok keyifli bir daireyi göstereceğim."`;
        voiceover1 = `${district}'te, o eski samimi mahalle kültürünün tam ortasında ama sıfır ve modern bir binada yaşamak isteyenler için harika bir ${rooms} daire burası. ${focus}`;
        ending = `Gelin kahvemizi yudumlarken bu güzel mülkü birlikte gezelim. Mesaj atmanız yeterli.`;
    }

    return `🎬 REELS SENARYOSU & VİDEO PLANI (${selectedTone.toUpperCase()} TONU)

⏱️ Toplam Süre: 30-40 Saniye
🎵 Müzik Önerisi: Yumuşak ama ritmik, telifsiz Deep House veya Modern Piyano tonları.

---------------------------------------------------
🎥 1. SAHNE: KANCA (0-5 Saniye)
[Görsel Plan]: Mülkün en etkileyici yerinden (örn. büyük salon pencerelerinden cadde manzarası veya şık bir mutfak adası) hızlı bir geçiş görüntüsü. Ekranda büyük yazı: "Hayalinizdeki Ev mi?"
[Seslendirme (Dış Ses)]: 
"${hook}"

🎥 2. SAHNE: DETAYLAR (5-20 Saniye)
[Görsel Plan]: Sırayla ebeveyn banyosu, ankastre mutfak, salonun ferahlığı ve balkon açısı gösterilir. Hızlı kesmeler ve geçiş efektleri kullanılır.
[Seslendirme (Dış Ses)]: 
"Bölgemiz ${district}. ${rooms} konseptindeki mülkümüz tam ${area} m² net kullanım alanına sahip. ${focus}"

🎥 3. SAHNE: EYLEM ÇAĞRISI (20-30 Saniye)
[Görsel Plan]: Kameraya gülümseyen emlak danışmanı kartvizitini gösterir veya elindeki anahtarı kameraya uzatır. Ekranda telefon numarası yazar.
[Seslendirme (Dış Ses)]: 
"${ending}"

---------------------------------------------------
✍️ Reels Alt Başlık (Açıklama Kısmı):
📍 Konum: ${district}
💰 Değer: ${price} (${type})
📐 Ölçü: ${rooms} - ${area} m²

Bu mülkü kaçırmamak için hemen kaydedin ve ilgilenebilecek arkadaşınıza gönderin! 📲

#emlak #gayrimenkul #reelsvideo #realty #remax #satilikdaire #luksutasarim #${district.split(',')[0].trim().toLowerCase()} #crm`;
}

// 2. INSTAGRAM/FACEBOOK POST GENERATOR
function generateFeedCaption(title, price, type, propType, rooms, area, district, focus, agentName, agencyName) {
    let emojiHeader = "✨";
    let bodyText = "";

    if (selectedTone === "luxury") {
        emojiHeader = "💎 PRESTİJ VE KONFOR BİR ARADA!";
        bodyText = `Seçkin bir yaşamın kapılarını aralayan bu özel portföyümüz, estetik mimarisi ve benzersiz konumu ile sizleri bekliyor.

🌟 Öne Çıkan Ayrıcalıklar:
• ${district} bölgesinin en prestijli noktasında
• Geniş ve fonksiyonel ${rooms} oda planı
• ${area} m² konforlu net yaşam alanı
• ${focus}

Hayatınıza değer katacak bu ${propType} hakkında detaylı bilgi ve randevu almak için bizimle özel olarak iletişime geçebilirsiniz.`;
    } else if (selectedTone === "energetic") {
        emojiHeader = "🔥 KAÇIRILMAYACAK FIRSAT! YENİ İLAN!";
        bodyText = `Hızla gelişen ve her geçen gün değeri artan ${district} bölgesinde, tam aradığınız gibi bir ev bulduk! 😍

Hem oturumluk hem de yüksek kira getirili bu şahane dairede yok yok!
👉 ${rooms} son derece ferah odalar
👉 ${area} m² net genişlik
👉 ${focus}

Fiyatı sadece ve sadece ${price}! Bu fiyata bu kalite gerçekten çok nadir gelir. 🏃‍♂️💨`;
    } else if (selectedTone === "professional") {
        emojiHeader = "📊 BÖLGESEL PAZAR ANALİZİ VE YENİ PORTFÖY RAPORU";
        bodyText = `Gayrimenkul yatırımında doğru zaman ve doğru lokasyon kazandırır. ${district} bölgesindeki pazar payını ve m² birim fiyat gelişimini destekleyen yeni portföyümüzü portföy havuzumuza ekledik.

Mülk Teknik Detayları:
- Lokasyon: ${district}
- Fiyat: ${price}
- Oda Dağılımı: ${rooms}
- Net Alan: ${area} m²
- Yatırım Avantajı: ${focus}

Acentemiz güvencesiyle satın alım/kiralama süreçleri profesyonel ekiplerimizce yönetilmektedir.`;
    } else {
        emojiHeader = "🏡 HAYALİNİZDEKİ EVE İLK ADIMI ATIN!";
        bodyText = `Herkese merhaba! Bugün size çok seveceğiniz sıcacık bir yuva önerisiyle geldik.

Balkonunda çayınızı yudumlarken huzur bulacağınız, çocuklarınızla güvenle yaşayacağınız ${rooms} dairemiz satışta. Bölge olarak sakinliği ve yeşiliyle bilinen ${district} mahallesindeyiz. 

Merak ettiğiniz tüm detayları sormak, mülkü görmek için bana istediğiniz an yazabilirsiniz. Çayımızı içerken detayları konuşalım. 😊`;
    }

    return `${emojiHeader}

📍 Lokasyon: ${district}
📐 Özellikler: ${rooms} | ${area} m² | ${propType}
💰 Fiyat: ${price} (${type})

---------------------------------------------------
${bodyText}
---------------------------------------------------

👤 Danışman: ${agentName}
🏢 Acente: ${agencyName}
📞 İletişim: Profildeki WhatsApp linki veya DM

#emlakdanismani #satilikkonut #gayrimenkuldanismani #yatirimfirsati #evsahibiol #${district.split(',')[0].trim().toLowerCase()}emlak #konutyatirimi #crm`;
}

// 3. LINKEDIN POST GENERATOR
function generateLinkedinPost(title, price, type, propType, rooms, area, district, focus, agentName, agencyName) {
    return `📈 Gayrimenkul Yatırım Analizi: ${district} Pazarı ve Yeni Fırsatlar

Gayrimenkul sektörü dinamiklerinde lokasyon avantajı ve m² birim verimliliği, yatırımın geri dönüş (amortisman) süresini belirleyen en kritik parametrelerdir.

Bu bağlamda portföy havuzumuza dahil ettiğimiz ${district} bölgesindeki yeni mülkümüzü profesyonel ağımın dikkatine sunmak isterim. 

📋 Mülk Özellikleri ve Değerlemesi:
• Tip / Konsept: ${rooms} ${propType}
• Net Alan: ${area} m² efektif kullanım alanı
• Hedef Kitle: Prestijli konut arayışında olan çekirdek aileler ve üst düzey yöneticiler
• Birincil Avantaj: ${focus}
• Değerleme Skalası: ${price} üzerinden ${type.toLowerCase()} pazarlama sürecine başlanmıştır.

Yatırım potansiyeli yüksek bu mülkün ekspertiz raporları, bölge fiyat endeksi verileri ve yerinde inceleme randevusu oluşturmak için LinkedIn üzerinden veya doğrudan iletişime geçebilirsiniz.

Saygılarımla,

👤 ${agentName}
💼 Gayrimenkul Danışmanı / ${agencyName}

#RealEstateInvestment #GayrimenkulSektoru #YatirimAnalizi #PortfoyYonetimi #CommercialRealEstate #PROJECTCRM`;
}

// 4. STORY FLOW GENERATOR
function generateStoryFlow(title, price, type, propType, rooms, area, district, focus, agentName, agencyName) {
    return `📲 STORY (HİKAYE) AKIŞI PLANI - 3'LÜ SERİ (${selectedTone.toUpperCase()} TONU)

📸 1. HİKAYE: ANKET & İLGİ UYANDIRMA
👉 [Görsel]: Mülkün geniş salonundan veya dış cephesinden flu/gizemli bir fotoğraf.
👉 [Etiket / Widget]: Instagram "Anket" veya "Test" widget'ı ekleyin.
👉 [Soru]: "${district}'te böyle bir dairede oturmak ister miydiniz?"
👉 [Seçenekler]: "Evet, kesinlikle!" / "Fiyatı ne kadar?"
👉 [Yazı]: "Birkaç dakika içinde yeni bir fırsat geliyor... Takipte kalın! 🔔"

---------------------------------------------------
📸 2. HİKAYE: ÖZELLİKLER & VURGU
👉 [Görsel]: Evin en iyi ışık alan odasından veya mutfağından net, şık bir fotoğraf.
👉 [Yazı]: 
📍 Konum: ${district}
📐 Ölçüler: ${rooms} | ${area} m² Net
⭐ Özellik: ${focus}
🔑 "Aradığınız o geniş ve konforlu alan sonunda satışta!"

---------------------------------------------------
📸 3. HİKAYE: FİYAT & CALL TO ACTION (İLETİŞİM)
👉 [Görsel]: Emlak danışmanının profesyonel portresi veya mülkün anahtarıyla çekilmiş estetik bir kare.
👉 [Yazı]: 
💰 Yatırım Tutarı: ${price}
👉 [Etiket / Widget]: Instagram "Bağlantı (Link)" etiketi ekleyin (WhatsApp numaranıza yönlendiren link).
👉 [Buton Yazısı]: "Randevu ve Bilgi Al 📞"
👉 [Ek Metin]: "Detayları DM üzerinden konuşalım veya yukarıdaki linke tıklayarak doğrudan WhatsApp'tan yazın!"`;
}
