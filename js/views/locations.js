// Gayrimenkul CRM - Bölge Analizleri ve Fiyat Trendleri Görünümü

import { state, addRecord, updateRecord, deleteRecord, triggerNewsScraper } from '../store.js';
import { openModal, closeModal, showToast } from '../components/ui.js';

let activeLocationId = null;
let trendChartInstance = null;

export function renderLocationsView(container) {
    // 1. Set default active location if not set or if it doesn't exist anymore
    if (state.locations.length > 0) {
        const activeExists = state.locations.some(l => l.id === activeLocationId);
        if (!activeExists) {
            activeLocationId = state.locations[0].id;
        }
    } else {
        activeLocationId = null;
    }

    if (container.querySelector('.locations-grid')) {
        updateLocationsList();
        renderLocationDetails();
        return;
    }

    // 2. Render base layout
    container.innerHTML = `
        <div class="view-header">
            <div>
                <h2>Bölge (Lokasyon) Analizleri</h2>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">Portföylerinizin bulunduğu bölgelerdeki pazar eğilimleri, m² birim fiyatları ve AI piyasa radarı.</p>
            </div>
            <button id="btn-add-location" class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Yeni Bölge Ekle
            </button>
        </div>

        ${state.locations.length === 0 ? `
            <div class="card empty-state" style="padding:60px 20px; text-align:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="empty-icon" style="width:48px; height:48px; margin-bottom:16px; color:var(--text-muted);"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                <h3>Kayıtlı Bölge Bulunmamaktadır</h3>
                <p style="color:var(--text-secondary); margin-bottom:20px;">Danışmanlık yaptığınız lokasyonlardaki ortalama fiyatları ve trend grafiğini takip etmek için ilk bölgeyi ekleyin.</p>
                <button id="btn-empty-add-location" class="btn btn-primary">İlk Bölgeyi Ekle</button>
            </div>
        ` : `
            <div class="locations-grid new-radar-layout">
                <!-- Left Column: Region Selector & Detail/Chart/Sub-Neighborhoods -->
                <div class="locations-left-panel">
                    <!-- Location Selector Card -->
                    <div class="card region-selector-card">
                        <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; font-family:'Outfit', sans-serif; letter-spacing: 0.5px;">Uzmanlık Bölgeleri</h4>
                        <div class="region-cards-wrap" id="locations-list-container">
                            <!-- Dynamic Location Cards -->
                        </div>
                    </div>

                    <!-- Selected Region Details Pane -->
                    <div class="chart-pane" id="location-details-pane">
                        <!-- Dynamic details rendered here -->
                    </div>
                </div>

                <!-- Right Column: Live News & AI Summary -->
                <div class="locations-right-panel">
                    <!-- Gemini Settings Panel -->
                    <div class="card gemini-settings-card">
                        <div id="gemini-settings-header">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 16px;">✨</span>
                                <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-primary); font-family:'Outfit', sans-serif; margin: 0; letter-spacing: 0.5px;">AI Yapay Zeka Ayarları</h4>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span id="gemini-status-badge" class="badge" style="font-size: 9px; padding: 2px 6px;">Yükleniyor...</span>
                                <svg id="gemini-settings-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm" style="transition: transform 0.2s; color: var(--text-muted);"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                        </div>
                        <div id="gemini-settings-body" style="display: none;">
                            <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; margin-top: 10px; line-height: 1.4;">Haber özetlerini otomatik üretmek için Gemini API anahtarınızı girin. Girilmezse sistem hazır şablon özetlerini kullanacaktır.</p>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label for="gemini-api-key-input" style="font-size: 11px; margin-bottom: 4px; display: block; color: var(--text-secondary);">Gemini API Key</label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="password" id="gemini-api-key-input" placeholder="AIzaSy..." style="flex-grow: 1; padding: 8px 10px; font-size: 12px; background: rgba(15,23,42,0.6); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); color: var(--text-primary);">
                                    <button id="btn-save-gemini-key" class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;">Kaydet</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Canlı Piyasa Radarı Feed Card -->
                    <div class="card news-radar-card">
                        <div class="radar-header">
                            <div>
                                <h3 style="font-size: 15px; font-weight: 700; font-family:'Outfit', sans-serif; color: var(--text-primary); margin:0;">Canlı Piyasa Radarı</h3>
                                <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px; margin-bottom:0;">Bölgesel gelişmeler ve AI analiz özetleri</p>
                            </div>
                            <button id="btn-refresh-news" class="btn btn-outline" style="padding: 6px 10px; font-size: 11px; display: flex; align-items: center; gap: 6px;">
                                <svg id="icon-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm" style="transition: transform 0.5s;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                Yenile
                            </button>
                        </div>
                        <div class="news-radar-feed" id="news-feed-container">
                            <!-- Dynamic news feed items -->
                        </div>
                    </div>
                </div>
            </div>
        `}
    `;

    // 3. Setup event listeners
    if (state.locations.length > 0) {
        updateLocationsList();
        renderLocationDetails();
        
        // Setup news refresh button
        const btnRefresh = document.getElementById('btn-refresh-news');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                const activeLoc = state.locations.find(l => l.id === activeLocationId);
                if (activeLoc) {
                    loadNewsForRegion(activeLoc.name, true);
                }
            });
        }

        // Setup Gemini Settings
        setupGeminiSettings();
    } else {
        const btnEmptyAdd = document.getElementById('btn-empty-add-location');
        if (btnEmptyAdd) {
            btnEmptyAdd.addEventListener('click', openAddLocationModal);
        }
    }

    document.getElementById('btn-add-location').addEventListener('click', openAddLocationModal);
}

// Update the list of locations in the selector container (Horizontal pills/chips)
function updateLocationsList() {
    const listContainer = document.getElementById('locations-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = state.locations.map(loc => {
        const formatSale = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(loc.sqmPriceSale);
        const isActive = loc.id === activeLocationId;

        return `
            <div class="location-pill-card ${isActive ? 'active-pill' : ''}" data-id="${loc.id}">
                <div class="pill-name">${loc.name}</div>
                <div class="pill-meta">Ort. ${formatSale}/m²</div>
            </div>
        `;
    }).join('');

    // Attach click listeners to cards
    const cards = listContainer.querySelectorAll('.location-pill-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            activeLocationId = card.dataset.id;
            updateLocationsList();
            renderLocationDetails();
        });
    });
}

// Render the detail view & chart & sub-neighborhoods in the left column detail pane
function renderLocationDetails() {
    const detailsPane = document.getElementById('location-details-pane');
    if (!detailsPane) return;

    const loc = state.locations.find(l => l.id === activeLocationId);
    if (!loc) {
        detailsPane.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); min-height: 300px;">
                <p>Detayları görmek için listeden bir bölge seçin.</p>
            </div>
        `;
        return;
    }

    const formatSale = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(loc.sqmPriceSale);
    const formatRent = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(loc.sqmPriceRent);
    
    // Amortization Period: sqmPriceSale / (sqmPriceRent * 12)
    const mainAmort = (loc.sqmPriceSale / (loc.sqmPriceRent * 12)).toFixed(1);

    // Sub-neighborhoods list/table
    const subNeighborhoodsHtml = loc.subNeighborhoods && loc.subNeighborhoods.length > 0 ? `
        <div class="sub-neighborhoods-section" style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 20px;">
            <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 12px; font-family:'Outfit', sans-serif; color: var(--text-primary);">Mahalle Bazlı Fiyat Dağılımı</h4>
            <div style="overflow-x: auto;">
                <table class="crm-table sub-neigh-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
                            <th style="padding: 8px 4px; font-weight: 500;">Mahalle</th>
                            <th style="padding: 8px 4px; font-weight: 500; text-align: right;">Ort. Satılık m²</th>
                            <th style="padding: 8px 4px; font-weight: 500; text-align: right;">Ort. Kiralık m²</th>
                            <th style="padding: 8px 4px; font-weight: 500; text-align: right;">Amortisman</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loc.subNeighborhoods.map(sub => {
                            const subAmort = (sub.sale / (sub.rent * 12)).toFixed(1);
                            const formatSubSale = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(sub.sale);
                            const formatSubRent = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(sub.rent);
                            return `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.015);">
                                    <td style="padding: 8px 4px; font-weight: 600; color: var(--text-primary);">${sub.name}</td>
                                    <td style="padding: 8px 4px; text-align: right; color: var(--text-secondary);">${formatSubSale}</td>
                                    <td style="padding: 8px 4px; text-align: right; color: var(--text-secondary);">${formatSubRent}</td>
                                    <td style="padding: 8px 4px; text-align: right; font-weight: 600; color: #ea580c;">${subAmort} Yıl</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    ` : `
        <div class="sub-neighborhoods-section" style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 20px;">
            <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px; font-family:'Outfit', sans-serif; color: var(--text-primary);">Mahalle Bazlı Fiyat Dağılımı</h4>
            <p style="font-size: 12px; color: var(--text-muted); font-style: italic; margin: 0;">Bu bölge için tanımlanmış alt mahalle detayı bulunmamaktadır.</p>
        </div>
    `;

    detailsPane.innerHTML = `
        <div class="details-pane-header">
            <div>
                <h3 style="font-size:18px; font-family:'Outfit', sans-serif; font-weight:700; color: var(--text-primary); margin:0;">${loc.name} Analiz Raporu</h3>
                <p style="font-size:11px; color:var(--text-muted); margin-top:3px; margin-bottom:0;">Oluşturulma: ${new Date(loc.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
            <div style="display:flex; gap:8px;">
                <button id="btn-edit-location" class="btn btn-outline" style="padding:6px 10px; font-size:11px;">Düzenle</button>
                <button id="btn-delete-location" class="btn btn-danger" style="padding:6px 10px; font-size:11px;">Sil</button>
            </div>
        </div>

        <div class="metrics-grid-three" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; margin-top:16px;">
            <div class="location-card-price-item" style="padding:12px; background:rgba(99,102,241,0.03);">
                <span class="location-card-price-label" style="font-size:10px;">Ortalama Satılık m²</span>
                <span class="location-card-price-val" style="font-size:16px; color:var(--primary); margin-top:4px; display:block;">${formatSale}</span>
            </div>
            <div class="location-card-price-item" style="padding:12px; background:rgba(16,185,129,0.03);">
                <span class="location-card-price-label" style="font-size:10px;">Ortalama Kiralık m²</span>
                <span class="location-card-price-val" style="font-size:16px; color:var(--secondary); margin-top:4px; display:block;">${formatRent}</span>
            </div>
            <div class="location-card-price-item highlighted-amort" style="padding:12px; background:rgba(234,88,12,0.03); border-color: rgba(234,88,12,0.15);">
                <span class="location-card-price-label" style="font-size:10px; color:rgba(255,255,255,0.4);">Amortisman Süresi</span>
                <span class="location-card-price-val" style="font-size:16px; color:#ea580c; margin-top:4px; display:block; font-weight:700;">${mainAmort} Yıl</span>
            </div>
        </div>

        <!-- Chart Section -->
        <div style="margin-bottom:20px;">
            <h4 style="font-size:13px; font-weight:600; margin-bottom:10px; font-family:'Outfit', sans-serif; color: var(--text-primary);">Yıllara Göre Birim Fiyat Gelişimi (m²)</h4>
            <div class="chart-wrapper" style="min-height:220px;">
                <canvas id="location-trend-chart"></canvas>
            </div>
        </div>

        <!-- Sub-neighborhoods breakdowns -->
        ${subNeighborhoodsHtml}

        <!-- Informative Details -->
        <div style="display:flex; flex-direction:column; gap:14px; border-top:1px solid var(--border-color); padding-top:20px; margin-top:20px;">
            <div>
                <h4 style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Demografik Yapı & Profil</h4>
                <p style="font-size:12px; line-height:1.5; color:var(--text-primary); margin:0;">${loc.demographics || 'Demografik bilgi girilmemiş.'}</p>
            </div>
            <div>
                <h4 style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Bölgedeki Rekabet ve Piyasa Notları</h4>
                <p style="font-size:12px; line-height:1.5; color:var(--text-primary); margin:0;">${loc.competitorNotes || 'Piyasa notu girilmemiş.'}</p>
            </div>
            <div>
                <h4 style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Genel Lokasyon Değerlendirmesi</h4>
                <p style="font-size:12px; line-height:1.5; color:var(--text-primary); margin:0;">${loc.notes || 'Genel değerlendirme girilmemiş.'}</p>
            </div>
        </div>
    `;

    // Initialize/Render the Chart.js
    setTimeout(() => {
        renderTrendChart(loc);
    }, 50);

    // Attach actions
    document.getElementById('btn-edit-location').addEventListener('click', () => {
        openEditLocationModal(loc);
    });

    document.getElementById('btn-delete-location').addEventListener('click', async () => {
        if (confirm(`"${loc.name}" bölgesini silmek istediğinize emin misiniz?`)) {
            try {
                await deleteRecord('locations', loc.id);
                showToast("Bölge başarıyla silindi.", "success");
                
                // Select another active one
                const remaining = state.locations.filter(l => l.id !== loc.id);
                activeLocationId = remaining.length > 0 ? remaining[0].id : null;
                
                // Re-render
                renderLocationsView(detailsPane.closest('#app-view'));
            } catch (err) {
                showToast("Silme hatası: " + err.message, "error");
            }
        }
    });

    // Trigger loading of news for this region
    loadNewsForRegion(loc.name);
}

// Load and display news feed cards with summaries for active region
async function loadNewsForRegion(regionName, forceRefresh = false) {
    const feedContainer = document.getElementById('news-feed-container');
    if (!feedContainer) return;

    // Filter regional news
    let regionNews = (state.regionNews || []).filter(n => n.region.toLowerCase() === regionName.toLowerCase());

    if (regionNews.length === 0 || forceRefresh) {
        // Show skeleton loading state
        feedContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:12px; padding: 10px 0;">
                <div class="skeleton-news" style="height:90px; border-radius:var(--border-radius-md); background:rgba(255,255,255,0.015); border: 1px solid var(--border-color); animation: pulse 1.5s infinite ease-in-out;"></div>
                <div class="skeleton-news" style="height:90px; border-radius:var(--border-radius-md); background:rgba(255,255,255,0.015); border: 1px solid var(--border-color); animation: pulse 1.5s infinite ease-in-out;"></div>
                <div class="skeleton-news" style="height:90px; border-radius:var(--border-radius-md); background:rgba(255,255,255,0.015); border: 1px solid var(--border-color); animation: pulse 1.5s infinite ease-in-out;"></div>
            </div>
        `;
        
        // Show spinning refresh icon
        const refreshIcon = document.getElementById('icon-refresh');
        if (refreshIcon) refreshIcon.classList.add('spin-animation');

        try {
            await triggerNewsScraper(regionName);
            // Re-fetch
            regionNews = (state.regionNews || []).filter(n => n.region.toLowerCase() === regionName.toLowerCase());
        } catch (e) {
            console.error("Error loading news scraper", e);
            feedContainer.innerHTML = `<p style="color:#ef4444; font-size:12px; text-align:center; padding: 20px 0;">Haberler taranırken veya AI ile özetlenirken hata oluştu.</p>`;
            return;
        } finally {
            if (refreshIcon) refreshIcon.classList.remove('spin-animation');
        }
    }

    if (regionNews.length === 0) {
        feedContainer.innerHTML = `<p style="color:var(--text-muted); font-size:12px; text-align:center; padding: 30px 0;">Bu bölge için taranmış canlı pazar verisi bulunmamaktadır.</p>`;
        return;
    }

    // Sort news by date descending
    regionNews.sort((a, b) => new Date(b.date) - new Date(a.date));

    feedContainer.innerHTML = regionNews.map(item => {
        const timeAgo = formatTimeAgo(new Date(item.date));
        return `
            <div class="card news-card" style="padding:14px; background:rgba(255,255,255,0.015); border:1px solid var(--border-color); border-radius:var(--border-radius-md); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="badge" style="font-size:9px; background:rgba(234, 88, 12, 0.1); color:#ea580c; border:1px solid rgba(234, 88, 12, 0.2); padding: 2px 6px; font-weight:600;">${item.source}</span>
                    <span style="font-size:10px; color:var(--text-muted);">${timeAgo}</span>
                </div>
                <h4 class="news-title" style="font-size:13px; font-weight:600; margin-bottom:6px; line-height:1.4; color:var(--text-primary);">${item.title}</h4>
                
                <!-- Summary bubble -->
                <div class="news-summary-box" style="margin-top:8px; padding:10px 12px; background:rgba(234, 88, 12, 0.02); border-left:2px solid #ea580c; border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;">
                    <span style="font-size:9px; font-weight:700; color:#ea580c; text-transform:uppercase; display:block; margin-bottom:4px; letter-spacing:0.5px;">✨ AI Özet</span>
                    <p style="font-size:11px; line-height:1.4; color:var(--text-secondary); font-style:italic; margin:0;">"${item.summary}"</p>
                </div>
                
                <!-- Expandable Original Content -->
                <div class="news-full-content" style="display:none; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-color); font-size:11px; line-height:1.5; color:var(--text-muted);">
                    ${item.content}
                </div>
            </div>
        `;
    }).join('');

    // Attach expand/collapse toggle
    const newsCards = feedContainer.querySelectorAll('.news-card');
    newsCards.forEach(card => {
        const fullContent = card.querySelector('.news-full-content');
        card.addEventListener('click', (e) => {
            // Ignore if clicking on other interactive elements inside (if any)
            const isVisible = fullContent.style.display === 'block';
            fullContent.style.display = isVisible ? 'none' : 'block';
            card.style.transform = isVisible ? 'none' : 'translateY(-2px)';
            card.style.boxShadow = isVisible ? 'none' : '0 4px 12px rgba(0,0,0,0.15)';
        });
    });
}

// Setup the Gemini settings panel inputs, badges, and toggle transitions
function setupGeminiSettings() {
    const header = document.getElementById('gemini-settings-header');
    const body = document.getElementById('gemini-settings-body');
    const toggleIcon = document.getElementById('gemini-settings-toggle-icon');
    const statusBadge = document.getElementById('gemini-status-badge');
    const apiKeyInput = document.getElementById('gemini-api-key-input');
    const btnSave = document.getElementById('btn-save-gemini-key');

    if (!header || !body || !toggleIcon || !statusBadge || !apiKeyInput || !btnSave) return;

    // Toggle panel visibility
    header.addEventListener('click', () => {
        const isCollapsed = body.style.display === 'none';
        body.style.display = isCollapsed ? 'block' : 'none';
        toggleIcon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // Check localStorage for key
    const existingKey = localStorage.getItem("crm_gemini_api_key");
    if (existingKey) {
        apiKeyInput.value = existingKey;
        statusBadge.textContent = "AI Aktif";
        statusBadge.style.background = "rgba(16, 185, 129, 0.1)";
        statusBadge.style.color = "#10b981";
        statusBadge.style.border = "1px solid rgba(16, 185, 129, 0.2)";
    } else {
        statusBadge.textContent = "Hazır Şablon (Bölgesel)";
        statusBadge.style.background = "rgba(100, 116, 139, 0.1)";
        statusBadge.style.color = "#94a3b8";
        statusBadge.style.border = "1px solid rgba(100, 116, 139, 0.2)";
    }

    // Save key action
    btnSave.addEventListener('click', (e) => {
        e.preventDefault();
        const newKey = apiKeyInput.value.trim();
        if (newKey) {
            localStorage.setItem("crm_gemini_api_key", newKey);
            showToast("Gemini API Anahtarı kaydedildi.", "success");
            statusBadge.textContent = "AI Aktif";
            statusBadge.style.background = "rgba(16, 185, 129, 0.1)";
            statusBadge.style.color = "#10b981";
            statusBadge.style.border = "1px solid rgba(16, 185, 129, 0.2)";
        } else {
            localStorage.removeItem("crm_gemini_api_key");
            showToast("Gemini API Anahtarı kaldırıldı. Şablonlar kullanılacak.", "info");
            statusBadge.textContent = "Hazır Şablon (Bölgesel)";
            statusBadge.style.background = "rgba(100, 116, 139, 0.1)";
            statusBadge.style.color = "#94a3b8";
            statusBadge.style.border = "1px solid rgba(100, 116, 139, 0.2)";
        }
        
        // Reload news feed for active region with new configuration
        const activeLoc = state.locations.find(l => l.id === activeLocationId);
        if (activeLoc) {
            loadNewsForRegion(activeLoc.name, true);
        }
    });
}

// Utility: format time relative to now
function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'şimdi';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} sa önce`;
    return date.toLocaleDateString('tr-TR');
}

// Render the Line Chart using Chart.js
function renderTrendChart(loc) {
    const canvas = document.getElementById('location-trend-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart to prevent rendering bugs
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    // Sort trends by year ascending
    const trendsSorted = [...loc.trends].sort((a, b) => parseInt(a.year) - parseInt(b.year));
    const labels = trendsSorted.map(t => t.year + " Yılı");
    const saleData = trendsSorted.map(t => t.salePrice);
    const rentData = trendsSorted.map(t => t.rentPrice);

    // If Chart.js library is loaded
    if (window.Chart) {
        trendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Satılık m² (TL)',
                        data: saleData,
                        borderColor: '#6366f1', // primary color
                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        borderWidth: 2.5,
                        tension: 0.3,
                        yAxisID: 'ySale',
                        fill: true
                    },
                    {
                        label: 'Kiralık m² (TL)',
                        data: rentData,
                        borderColor: '#10b981', // secondary color
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        borderWidth: 2.5,
                        tension: 0.3,
                        yAxisID: 'yRent',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 10 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#0f172a',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: '#334155',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.02)' },
                        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
                    },
                    ySale: {
                        type: 'linear',
                        position: 'left',
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 9 },
                            callback: function(value) {
                                return value >= 1000 ? (value / 1000) + 'k TL' : value + ' TL';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Satılık m²',
                            color: '#6366f1',
                            font: { family: 'Outfit', weight: '600', size: 10 }
                        }
                    },
                    yRent: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 9 },
                            callback: function(value) {
                                return value + ' TL';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Kiralık m²',
                            color: '#10b981',
                            font: { family: 'Outfit', weight: '600', size: 10 }
                        }
                    }
                }
            }
        });
    }
}

// Add Location Modal Form
function openAddLocationModal() {
    const currentYear = new Date().getFullYear();
    const content = `
        <form id="form-location-add">
            <div class="form-group">
                <label for="l-name">Bölge / Lokasyon Adı</label>
                <input type="text" id="l-name" placeholder="Örn: Kadıköy Caddebostan, Ataşehir Batı" required>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="l-price-sale">Güncel Ort. Satılık m² Fiyatı (TL)</label>
                    <input type="number" id="l-price-sale" placeholder="Örn: 110000" required>
                </div>
                <div class="form-group">
                    <label for="l-price-rent">Güncel Ort. Kiralık m² Fiyatı (TL)</label>
                    <input type="number" id="l-price-rent" placeholder="Örn: 400" required>
                </div>
            </div>

            <div style="border: 1px dashed var(--border-color); border-radius: var(--border-radius-md); padding: 12px; margin-bottom: 16px; background: rgba(255,255,255,0.01);">
                <div style="font-size:11px; font-weight:600; margin-bottom:6px; color:var(--text-secondary);">Fiyat Trendi Geçmişi (Grafik için)</div>
                <div style="font-size:10px; color:var(--text-muted); margin-bottom:10px;">Önceki yıllara ait ortalama satılık m² fiyatlarını girin. Boş bırakırsanız otomatik hesaplanacaktır.</div>
                
                <div class="form-group-row" style="margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:10px; width:40px; font-weight:600; color:var(--text-muted);">${currentYear - 2}:</span>
                        <input type="number" id="l-trend-sale-2" placeholder="Örn: 65000" style="padding:6px; font-size:12px;">
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:10px; width:40px; font-weight:600; color:var(--text-muted);">${currentYear - 1}:</span>
                        <input type="number" id="l-trend-sale-1" placeholder="Örn: 85000" style="padding:6px; font-size:12px;">
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="l-demographics">Demografik Profil</label>
                <textarea id="l-demographics" placeholder="Örn: Genelde yüksek gelir düzeyli aileler ve beyaz yakalı çalışanlar..."></textarea>
            </div>

            <div class="form-group">
                <label for="l-competitor">Rakip Analizi & Bölge Dinamikleri</label>
                <textarea id="l-competitor" placeholder="Örn: Bölgede butik acenteler hakim. Portföy sirkülasyonu hızlı..."></textarea>
            </div>

            <div class="form-group">
                <label for="l-notes">Genel Notlar ve Değerlendirmeler</label>
                <textarea id="l-notes" placeholder="Örnek: Ulaşım ağlarına yakın, kentsel dönüşüm teşviki yüksek bölge..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-full">Bölgeyi Kaydet</button>
        </form>
    `;

    openModal("Yeni Bölge Ekle", content);

    document.getElementById('form-location-add').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('l-name').value.trim();
        const sqmPriceSale = Number(document.getElementById('l-price-sale').value);
        const sqmPriceRent = Number(document.getElementById('l-price-rent').value);
        const demographics = document.getElementById('l-demographics').value.trim();
        const competitorNotes = document.getElementById('l-competitor').value.trim();
        const notes = document.getElementById('l-notes').value.trim();

        // Build trends
        const val2 = Number(document.getElementById('l-trend-sale-2').value) || Math.round(sqmPriceSale * 0.7);
        const val1 = Number(document.getElementById('l-trend-sale-1').value) || Math.round(sqmPriceSale * 0.85);

        const rent2 = Math.round(sqmPriceRent * 0.7);
        const rent1 = Math.round(sqmPriceRent * 0.85);

        const trends = [
            { year: String(currentYear - 2), salePrice: val2, rentPrice: rent2 },
            { year: String(currentYear - 1), salePrice: val1, rentPrice: rent1 },
            { year: String(currentYear), salePrice: sqmPriceSale, rentPrice: sqmPriceRent }
        ];

        try {
            await addRecord('locations', {
                name,
                sqmPriceSale,
                sqmPriceRent,
                demographics,
                competitorNotes,
                notes,
                trends
            });

            closeModal();
            showToast("Bölge başarıyla eklendi.", "success");
            
            // Set active to newly created
            if (state.locations.length > 0) {
                activeLocationId = state.locations[state.locations.length - 1].id;
            }

            // Re-render
            const activeViewContainer = document.getElementById('app-view');
            renderLocationsView(activeViewContainer);
        } catch (err) {
            showToast("Bölge eklenirken hata: " + err.message, "error");
        }
    });
}

// Edit Location Modal Form
function openEditLocationModal(loc) {
    const currentYear = new Date().getFullYear();
    
    // Find trend values
    const trend2 = loc.trends.find(t => t.year === String(currentYear - 2))?.salePrice || Math.round(loc.sqmPriceSale * 0.7);
    const trend1 = loc.trends.find(t => t.year === String(currentYear - 1))?.salePrice || Math.round(loc.sqmPriceSale * 0.85);

    const content = `
        <form id="form-location-edit">
            <div class="form-group">
                <label for="le-name">Bölge / Lokasyon Adı</label>
                <input type="text" id="le-name" value="${loc.name}" required>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="le-price-sale">Ort. Satılık m² Fiyatı (TL)</label>
                    <input type="number" id="le-price-sale" value="${loc.sqmPriceSale}" required>
                </div>
                <div class="form-group">
                    <label for="le-price-rent">Ort. Kiralık m² Fiyatı (TL)</label>
                    <input type="number" id="le-price-rent" value="${loc.sqmPriceRent}" required>
                </div>
            </div>

            <div style="border: 1px dashed var(--border-color); border-radius: var(--border-radius-md); padding: 12px; margin-bottom: 16px; background: rgba(255,255,255,0.01);">
                <div style="font-size:11px; font-weight:600; margin-bottom:6px; color:var(--text-secondary);">Fiyat Trendi Geçmişi (Grafik için)</div>
                <div class="form-group-row" style="margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:10px; width:40px; font-weight:600; color:var(--text-muted);">${currentYear - 2}:</span>
                        <input type="number" id="le-trend-sale-2" value="${trend2}" style="padding:6px; font-size:12px;">
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:10px; width:40px; font-weight:600; color:var(--text-muted);">${currentYear - 1}:</span>
                        <input type="number" id="le-trend-sale-1" value="${trend1}" style="padding:6px; font-size:12px;">
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="le-demographics">Demografik Profil</label>
                <textarea id="le-demographics">${loc.demographics || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="le-competitor">Rakip Analizi & Bölge Dinamikleri</label>
                <textarea id="le-competitor">${loc.competitorNotes || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="le-notes">Genel Notlar ve Değerlendirmeler</label>
                <textarea id="le-notes">${loc.notes || ''}</textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-full">Değişiklikleri Kaydet</button>
        </form>
    `;

    openModal("Bölge Bilgilerini Düzenle", content);

    document.getElementById('form-location-edit').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('le-name').value.trim();
        const sqmPriceSale = Number(document.getElementById('le-price-sale').value);
        const sqmPriceRent = Number(document.getElementById('le-price-rent').value);
        const demographics = document.getElementById('le-demographics').value.trim();
        const competitorNotes = document.getElementById('le-competitor').value.trim();
        const notes = document.getElementById('le-notes').value.trim();

        const val2 = Number(document.getElementById('le-trend-sale-2').value);
        const val1 = Number(document.getElementById('le-trend-sale-1').value);

        const rent2 = Math.round(sqmPriceRent * 0.7);
        const rent1 = Math.round(sqmPriceRent * 0.85);

        const trends = [
            { year: String(currentYear - 2), salePrice: val2, rentPrice: rent2 },
            { year: String(currentYear - 1), salePrice: val1, rentPrice: rent1 },
            { year: String(currentYear), salePrice: sqmPriceSale, rentPrice: sqmPriceRent }
        ];

        try {
            await updateRecord('locations', loc.id, {
                name,
                sqmPriceSale,
                sqmPriceRent,
                demographics,
                competitorNotes,
                notes,
                trends
            });

            closeModal();
            showToast("Bölge bilgileri başarıyla güncellendi.", "success");
            
            // Re-render
            const activeViewContainer = document.getElementById('app-view');
            renderLocationsView(activeViewContainer);
        } catch (err) {
            showToast("Güncelleme hatası: " + err.message, "error");
        }
    });
}
