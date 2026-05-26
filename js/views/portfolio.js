// Gayrimenkul CRM - Portföy Yönetimi ve Harita Görünümü

import { state, addRecord, updateRecord, deleteRecord, getMatchesForPortfolio, canViewPhone, maskPhoneNumber, apiFetch, canDelete, canEditRecord } from '../store.js';
import { initMap, renderPortfolioMarkers, enableLocationSelection, setSelectMarkerPosition } from '../components/map.js';
import { openModal, closeModal, showToast } from '../components/ui.js';
import { LOCATIONS_DATA } from '../locations_data.js';

function getAgeSelectValue(age) {
    if (typeof age === 'string') {
        const trimmed = age.trim();
        const validOptions = ["Sıfır (Yeni)", "1-5 Yıl", "6-10 Yıl", "11-15 Yıl", "16-20 Yıl", "21-25 Yıl", "26-30 Yıl", "31 Yıl ve Üzeri"];
        if (validOptions.includes(trimmed)) return trimmed;
    }
    const num = Number(age);
    if (isNaN(num) || num <= 0) return "Sıfır (Yeni)";
    if (num <= 5) return "1-5 Yıl";
    if (num <= 10) return "6-10 Yıl";
    if (num <= 15) return "11-15 Yıl";
    if (num <= 20) return "16-20 Yıl";
    if (num <= 25) return "21-25 Yıl";
    if (num <= 30) return "26-30 Yıl";
    return "31 Yıl ve Üzeri";
}

let activeFilters = {
    search: '',
    type: 'Hepsi',
    status: 'aktif'
};

let tempCoordinates = { lat: 40.9800, lng: 29.0800 };

export function renderPortfolioView(container) {
    if (container.querySelector('#map-container')) {
        updatePortfolioList();
        return;
    }
    // Render HTML shell for Portfolio view
    container.innerHTML = `
        <div class="view-header">
            <div>
                <h2>Acente Portföy Havuzu</h2>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">Ekibinizin eklediği tüm ilanlar ve harita dağılımı.</p>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <button id="btn-export-excel" class="btn btn-excel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-md"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h8M8 9h1"/></svg>
                    Excel Olarak İndir
                </button>
                <button id="btn-add-portfolio" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Yeni İlan Ekle
                </button>
            </div>
        </div>
        
        <!-- Filter Bar -->
        <div class="filter-bar">
            <div class="filter-item">
                <label for="filter-search">Arama</label>
                <input type="text" id="filter-search" placeholder="Başlık, konum veya danışman..." value="${activeFilters.search}">
            </div>
            <div class="filter-item">
                <label for="filter-type">Tür</label>
                <select id="filter-type">
                    <option value="Hepsi" ${activeFilters.type === 'Hepsi' ? 'selected' : ''}>Satılık & Kiralık</option>
                    <option value="Satılık" ${activeFilters.type === 'Satılık' ? 'selected' : ''}>Satılık</option>
                    <option value="Kiralık" ${activeFilters.type === 'Kiralık' ? 'selected' : ''}>Kiralık</option>
                </select>
            </div>
            <div class="filter-item">
                <label for="filter-status">İlan Durumu</label>
                <select id="filter-status">
                    <option value="Hepsi" ${activeFilters.status === 'Hepsi' ? 'selected' : ''}>Tüm İlanlar</option>
                    <option value="aktif" ${activeFilters.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                    <option value="beklemede" ${activeFilters.status === 'beklemede' ? 'selected' : ''}>Beklemede</option>
                    <option value="iptal" ${activeFilters.status === 'iptal' ? 'selected' : ''}>İptal</option>
                    <option value="satildi" ${activeFilters.status === 'satildi' ? 'selected' : ''}>Satıldı / Kiralandı</option>
                </select>
            </div>
        </div>
        
        <!-- Side-by-Side Content Grid -->
        <div class="portfolio-layout">
            <!-- Left: Portfolio Cards -->
            <div class="portfolio-list-pane">
                <div class="portfolio-grid" id="portfolio-list-container">
                    <!-- Dynamic Portfolio Cards -->
                </div>
            </div>
            
            <!-- Right: Leaflet Map -->
            <div class="map-pane">
                <div id="map-container"></div>
            </div>
        </div>
    `;
    
    // Initialize Map on container load
    setTimeout(() => {
        initMap('map-container');
        updatePortfolioList();
    }, 100);
    
    // Filter Listeners
    document.getElementById('filter-search').addEventListener('input', (e) => {
        activeFilters.search = e.target.value;
        updatePortfolioList();
    });
    
    document.getElementById('filter-type').addEventListener('change', (e) => {
        activeFilters.type = e.target.value;
        updatePortfolioList();
    });
    
    document.getElementById('filter-status').addEventListener('change', (e) => {
        activeFilters.status = e.target.value;
        updatePortfolioList();
    });
    
    // Add Excel Export Button Click
    const btnExport = document.getElementById('btn-export-excel');
    if (btnExport) {
        btnExport.addEventListener('click', async () => {
            try {
                // Show loading state
                btnExport.disabled = true;
                btnExport.innerHTML = `
                    <svg class="animate-spin icon-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25" stroke="currentColor"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"></path></svg>
                    İndiriliyor...
                `;
                
                const response = await apiFetch('/api/export', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customers: state.customers,
                        portfolios: state.portfolios
                    })
                });

                if (!response.ok) {
                    throw new Error("Dışa aktarım başarısız oldu.");
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'crm_verileri_export.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showToast("Excel dosyası başarıyla indirildi.", "success");
            } catch (err) {
                showToast("Excel indirilirken hata: " + err.message, "error");
            } finally {
                btnExport.disabled = false;
                btnExport.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-md"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h8M8 9h1"/></svg>
                    Excel Olarak İndir
                `;
            }
        });
    }

    // Add Portfolio Button Click
    document.getElementById('btn-add-portfolio').addEventListener('click', () => {
        openAddPortfolioModal();
    });
}

function getPortfolioStatusLabel(status) {
    const labels = {
        'aktif': 'Aktif',
        'beklemede': 'Beklemede',
        'iptal': 'İptal',
        'satildi': 'Satıldı'
    };
    return labels[(status || 'aktif').toLowerCase()] || (status || 'Aktif');
}

// Filter and render list + map markers
function updatePortfolioList() {
    const listContainer = document.getElementById('portfolio-list-container');
    if (!listContainer) return;
    
    // Apply filters
    const filtered = state.portfolios.filter(p => {
        // Search filter
        const matchSearch = !activeFilters.search || 
                            p.title.toLowerCase().includes(activeFilters.search.toLowerCase()) ||
                            p.district.toLowerCase().includes(activeFilters.search.toLowerCase()) ||
                            p.neighborhood.toLowerCase().includes(activeFilters.search.toLowerCase());
        
        // Type filter
        const matchType = activeFilters.type === 'Hepsi' || p.type === activeFilters.type;
        
        // Status filter
        let matchStatus = true;
        if (activeFilters.status !== 'Hepsi') {
            matchStatus = (p.status || 'aktif').toLowerCase() === activeFilters.status.toLowerCase();
        }
        
        return matchSearch && matchType && matchStatus;
    });
    
    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:80px 40px; color:var(--text-muted);">
                <div style="font-size:48px; margin-bottom:16px;">🏠</div>
                <p>Arama veya filtre kriterlerinize uyan gayrimenkul kaydı bulunmamaktadır.</p>
            </div>
        `;
        renderPortfolioMarkers([], null);
        return;
    }
    
    listContainer.innerHTML = filtered.map(p => {
        const formatPrice = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p.price);
        
        return `
            <div class="card portfolio-card" data-id="${p.id}">
                <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&auto=format&fit=crop&q=60'}" class="portfolio-image" alt="Mülk Fotoğrafı">
                <div class="portfolio-details">
                    <div class="portfolio-top">
                        <span class="portfolio-price">${formatPrice}</span>
                        <span class="portfolio-type-badge ${p.type.toLowerCase()}">${p.type}</span>
                    </div>
                    <div>
                        <h4 class="portfolio-title" title="${p.title}">${p.title}</h4>
                        <div class="portfolio-specs">
                            <span class="portfolio-spec-item">${p.rooms}</span>
                            <span class="portfolio-spec-item">${p.area} m²</span>
                            <span class="portfolio-spec-item">${p.propertyType}</span>
                        </div>
                        <div class="portfolio-location">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-md" style="color:var(--primary);"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>${p.city ? p.city + ' / ' : ''}${p.district} / ${p.neighborhood}</span>
                        </div>
                    </div>
                    <div class="portfolio-bottom">
                        <div class="agent-profile">
                            <img src="${p.createdByPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'}" class="agent-avatar" alt="Profil">
                            <span>${p.createdByName}</span>
                        </div>
                        <span class="status-badge ${(p.status || 'aktif').toLowerCase()}">${getPortfolioStatusLabel(p.status)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Render on Map
    renderPortfolioMarkers(filtered, (clickedPortfolio) => {
        openPortfolioDetailModal(clickedPortfolio);
    });
    
    // Add Click Listeners to Cards
    const cards = document.querySelectorAll('.portfolio-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const item = state.portfolios.find(p => p.id === id);
            if (item) {
                openPortfolioDetailModal(item);
            }
        });
    });
}

function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const parts = dateString.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch(e) {
        return dateString;
    }
}

// Open Detail Modal
function openPortfolioDetailModal(p) {
    const formattedPrice = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p.price);
    const formatComm = p.commission ? `%${p.commission}` : "-";
    const matchingBuyers = getMatchesForPortfolio(p);
    
    const owner = state.customers.find(c => c.id === p.owner_id);
    const userRole = (state.currentUser?.role || 'agent').toLowerCase();
    const isOwnRecord = p.createdById === state.currentUser?.uid;
    const ownerMasked = (userRole === 'agent' && !isOwnRecord);
    const ownerName = ownerMasked ? '*** YETKİNİZ YOK ***' : (owner ? owner.name : "-");
    
    const content = `
        <div class="tabs" style="margin-bottom: 20px;">
            <button class="tab-btn active" id="tab-btn-general" style="font-size: 13px;">Genel Bilgiler</button>
            <button class="tab-btn" id="tab-btn-financial" style="font-size: 13px;">📊 Yatırım & Finansal Analiz</button>
        </div>
        
        <div id="tab-content-general">
            <div class="detail-grid">
                <div>
                    <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&auto=format&fit=crop&q=60'}" class="detail-img" alt="Mülk Resmi">
                    <div style="margin-top:16px;">
                        <h4 style="margin-bottom:8px;">Danışman Notları</h4>
                        <p style="font-size:13px; color:var(--text-secondary); line-height:1.6; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:12px; border-radius:var(--border-radius-md); white-space: pre-wrap; word-wrap: break-word;">${ownerMasked ? '*** YETKİNİZ YOK ***' : (p.notes || "Not eklenmemiş.")}</p>
                    </div>
                    
                    <!-- Matching Buyers Section -->
                    <div class="detail-matches">
                        <h4 style="display:flex; justify-content:space-between; align-items:center;">
                            <span>Eşleşen Alıcı Müşteriler</span>
                            <span class="kanban-column-count">${matchingBuyers.length}</span>
                        </h4>
                        <div class="matches-list">
                            ${matchingBuyers.length === 0 ? `
                                <p style="font-size:12px; color:var(--text-muted);">Bu portföyün kriterlerine uyan alıcı müşteri bulunamadı.</p>
                            ` : matchingBuyers.map(b => {
                                const isAuthorized = canViewPhone(b);
                                return `
                                    <div class="match-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border-color);">
                                        <div class="match-client-info" style="display:flex; flex-direction:column;">
                                            <span class="match-name" style="font-weight:600; font-size:12px;">${b.name}</span>
                                            <span class="match-criteria" style="font-size:10px; color:var(--text-secondary);">${b.searchRooms || b.aralanan_oda_sayisi || ''} | Bütçe: ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(b.budget || b.maksimum_butce)}</span>
                                        </div>
                                        <div style="display:flex; gap:8px; align-items:center;">
                                            <a href="${isAuthorized ? 'tel:' + b.phone : '#'}" 
                                               class="btn btn-sm ${isAuthorized ? 'btn-outline' : 'btn-disabled'}" 
                                               style="padding:6px 12px; font-size:11px; text-decoration:none; ${!isAuthorized ? 'opacity:0.4; cursor:not-allowed; pointer-events:none;' : ''}">
                                                Ara ${!isAuthorized ? '🔒' : ''}
                                            </a>
                                            <button class="btn btn-sm btn-secondary btn-congratulate" 
                                                    style="padding:6px 12px; font-size:11px; ${!isAuthorized ? 'opacity:0.4; cursor:not-allowed;' : ''}" 
                                                    data-client-name="${b.name}" 
                                                    data-client-phone="${b.phone}"
                                                    ${!isAuthorized ? 'disabled' : ''}>
                                                Paylaş ${!isAuthorized ? '🔒' : ''}
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="detail-info">
                    <div class="detail-price-row">
                        <span class="detail-price">${formattedPrice}</span>
                        <span class="portfolio-type-badge ${p.type.toLowerCase()}">${p.type}</span>
                    </div>
                    
                    <div class="specs-grid">
                        <div class="spec-entry">
                            <span class="spec-entry-label">Emlak Tipi</span>
                            <span class="spec-entry-value">${p.propertyType}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Oda Sayısı</span>
                            <span class="spec-entry-value">${p.rooms}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Net Metrekare</span>
                            <span class="spec-entry-value">${p.area} m²</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Konum</span>
                            <span class="spec-entry-value">${p.city ? p.city + ' / ' : ''}${p.district} / ${p.neighborhood}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Bina Yaşı</span>
                            <span class="spec-entry-value">${p.age || "Belirtilmemiş"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Isınma</span>
                            <span class="spec-entry-value">${p.heating || "Belirtilmemiş"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Tapu Durumu</span>
                            <span class="spec-entry-value">${p.titleStatus || "Belirtilmemiş"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Komisyon Oranı</span>
                            <span class="spec-entry-value">${formatComm}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Sözleşme Tipi</span>
                            <span class="spec-entry-value">${p.sozlesme_tipi || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Sözleşme Bitiş</span>
                            <span class="spec-entry-value">${p.sozlesme_bitis_tarihi ? formatDate(p.sozlesme_bitis_tarihi) : "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Mülk Durumu</span>
                            <span class="spec-entry-value">${p.mulk_durumu || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Mülk Sahibi</span>
                            <span class="spec-entry-value">
                                ${ownerMasked 
                                    ? `<span class="client-type-badge satici" style="cursor:not-allowed; opacity:0.6; margin-top:2px;">*** YETKİNİZ YOK ***</span>` 
                                    : (owner ? `<span class="client-type-badge satici" style="cursor:pointer; margin-top:2px;" id="view-portfolio-owner-btn" data-id="${owner.id}">${ownerName}</span>` : "-")
                                }
                            </span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Mülk Sahibi Tel</span>
                            <span class="spec-entry-value">
                                ${ownerMasked 
                                    ? '*** YETKİNİZ YOK ***' 
                                    : (owner ? (canViewPhone(owner) ? owner.phone : maskPhoneNumber(owner.phone)) : "-")
                                }
                            </span>
                        </div>
                        <div class="spec-entry" style="grid-column: span 2;">
                            <span class="spec-entry-label">Tapu Durumu Notları</span>
                            <span class="spec-entry-value">${p.tapu_durumu_notlari || "-"}</span>
                        </div>
                    </div>
                    
                    <div style="border-top:1px solid var(--border-color); padding-top:16px;">
                        <div class="agent-profile">
                            <img src="${p.createdByPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'}" class="agent-avatar" style="width:30px; height:30px;" alt="Avatar">
                            <div>
                                <div style="font-weight:600;">${p.createdByName}</div>
                                <div style="font-size:10px; color:var(--text-muted);">İlan Sahibi Danışman</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:8px; margin-top:20px;">
                        <button id="btn-social-gen" class="btn btn-secondary">
                            ✨ Sosyal Medya İlan Metni Üret
                        </button>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                            <button id="btn-edit-p" class="btn btn-outline" ${canEditRecord(p) ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>Düzenle</button>
                            ${canDelete() ? '<button id="btn-delete-p" class="btn btn-danger">İlanı Sil</button>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="tab-content-financial" class="hidden">
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div class="spinner" style="margin: 0 auto 12px auto;"></div>
                <p>Finansal analiz verileri yükleniyor...</p>
            </div>
        </div>
    `;
    
    openModal(p.title, content);
    
    // View Owner click handler
    const viewOwnerBtn = document.getElementById('view-portfolio-owner-btn');
    if (viewOwnerBtn) {
        viewOwnerBtn.addEventListener('click', () => {
            const ownerId = viewOwnerBtn.dataset.id;
            state.autoOpenCustomerId = ownerId;
            closeModal();
            window.location.hash = "#customers";
        });
    }
    
    // Tab Switching functionality
    const tabBtnGeneral = document.getElementById('tab-btn-general');
    const tabBtnFinancial = document.getElementById('tab-btn-financial');
    const tabContentGeneral = document.getElementById('tab-content-general');
    const tabContentFinancial = document.getElementById('tab-content-financial');
    
    tabBtnGeneral.addEventListener('click', () => {
        tabBtnGeneral.classList.add('active');
        tabBtnFinancial.classList.remove('active');
        tabContentGeneral.classList.remove('hidden');
        tabContentFinancial.classList.add('hidden');
    });
    
    tabBtnFinancial.addEventListener('click', async () => {
        tabBtnFinancial.classList.add('active');
        tabBtnGeneral.classList.remove('active');
        tabContentFinancial.classList.remove('hidden');
        tabContentGeneral.classList.add('hidden');
        
        await loadFinancialAnalysis(p);
    });
    
    // 1. Social Generator Click
    document.getElementById('btn-social-gen').addEventListener('click', () => {
        openSocialDraftModal(p);
    });
    
    // 2. Edit Listing
    document.getElementById('btn-edit-p').addEventListener('click', () => {
        closeModal();
        openEditPortfolioModal(p);
    });
    
    // 3. Delete Listing
    if (document.getElementById('btn-delete-p')) {
        document.getElementById('btn-delete-p').addEventListener('click', async () => {
            if (confirm("Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
                try {
                    await deleteRecord('portfolios', p.id);
                    closeModal();
                    showToast("İlan başarıyla silindi.", "success");
                    updatePortfolioList();
                } catch (err) {
                    showToast("Silme hatası: " + err.message, "error");
                }
            }
        });
    }
    
    // Share Matching info via WhatsApp
    const shareBtns = document.querySelectorAll('.match-item .btn-congratulate');
    shareBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const clientName = btn.dataset.clientName;
            const clientPhone = btn.dataset.clientPhone;
            const formatPrice = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p.price);
            
            const message = `Merhaba ${clientName}, arayışınız doğrultusunda ${p.district} ${p.neighborhood} bölgesindeki ${p.rooms} - ${p.area}m² büyüklüğündeki ${p.type.toLowerCase()} dairemiz sizin için eşleşmiştir. \n\nDetaylı bilgi ve randevu için iletişime geçebilirsiniz. \nFiyat: ${formatPrice}`;
            
            navigator.clipboard.writeText(message).then(() => {
                showToast("Paylaşım metni kopyalandı! WhatsApp web açılıyor.", "success");
                window.open(`https://web.whatsapp.com/send?phone=${clientPhone.replace(/\s+/g, '')}&text=${encodeURIComponent(message)}`, '_blank');
            });
        });
    });
}

async function loadFinancialAnalysis(p) {
    const tabContentFinancial = document.getElementById('tab-content-financial');
    
    // Check if current rent is not entered or zero
    if (!p.current_rent || p.current_rent <= 0) {
        tabContentFinancial.innerHTML = `
            <div class="card" style="padding: 32px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed var(--border-color); border-radius: var(--border-radius-md);">
                <div style="font-size: 40px; margin-bottom: 12px;">📊</div>
                <h4 style="margin-bottom: 8px;">Kira Getiri Bilgisi Eksik</h4>
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                    Bu mülk için aylık kira getiri verisi tanımlanmamış. ROI analizi ve 5 yıllık alternatif yatırım projeksiyonlarını görmek için lütfen ilan detaylarını düzenleyin.
                </p>
                <button id="btn-edit-p-financial" class="btn btn-primary" style="margin: 0 auto; display: block; padding: 8px 24px;" ${canEditRecord(p) ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>Mülkü Düzenle</button>
            </div>
        `;
        if (canEditRecord(p)) {
            document.getElementById('btn-edit-p-financial').addEventListener('click', () => {
                closeModal();
                openEditPortfolioModal(p);
            });
        }
        return;
    }
    
    try {
        tabContentFinancial.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div class="spinner" style="margin: 0 auto 12px auto;"></div>
                <p>Finansal analiz verileri yükleniyor...</p>
            </div>
        `;
        
        const res = await apiFetch(`/api/portfolio/${p.id}/roi-analysis`);
        if (!res.ok) {
            throw new Error("Analiz verisi yüklenirken hata oluştu.");
        }
        const data = await res.json();
        
        const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
        
        tabContentFinancial.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div class="card" style="padding: 12px; background: rgba(16, 185, 129, 0.03); border: 1px solid rgba(16, 185, 129, 0.1);">
                    <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Kira Getirisi (Cap Rate)</div>
                    <div style="font-size: 20px; font-weight: 700; color: #10b981; margin-top: 4px;">%${data.capRate.toFixed(2)}</div>
                </div>
                <div class="card" style="padding: 12px; background: rgba(167, 139, 250, 0.03); border: 1px solid rgba(167, 139, 250, 0.1);">
                    <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Amortisman Süresi</div>
                    <div style="font-size: 20px; font-weight: 700; color: #a78bfa; margin-top: 4px;">${data.amortizationYears.toFixed(1)} Yıl</div>
                </div>
                <div class="card" style="padding: 12px; background: rgba(234, 88, 12, 0.03); border: 1px solid rgba(234, 88, 12, 0.1);">
                    <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Aylık Kira Getirisi</div>
                    <div style="font-size: 16px; font-weight: 700; color: #ea580c; margin-top: 4px;">${formatCurrency(data.currentRent)}</div>
                </div>
                <div class="card" style="padding: 12px; background: rgba(59, 130, 246, 0.03); border: 1px solid rgba(59, 130, 246, 0.1);">
                    <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Yıllık Değer Artışı</div>
                    <div style="font-size: 20px; font-weight: 700; color: #3b82f6; margin-top: 4px;">%${data.growthRate}</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; margin-bottom: 16px;">
                <div class="card" style="padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px;">
                    <h5 style="margin-bottom: 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); text-align: center; width: 100%;">Yatırım Verimlilik Oranı</h5>
                    <div style="width: 140px; height: 140px; position: relative;">
                        <canvas id="chart-cap-rate"></canvas>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
                            <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">%${data.capRate.toFixed(2)}</div>
                            <div style="font-size: 8px; color: var(--text-muted); text-transform: uppercase;">Cap Rate</div>
                        </div>
                    </div>
                </div>
                <div class="card" style="padding: 16px; min-height: 220px; display: flex; flex-direction: column;">
                    <h5 style="margin-bottom: 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">5. Yıl Sonu Alternatif Kıyaslama</h5>
                    <div style="flex: 1; min-height: 150px; position: relative;">
                        <canvas id="chart-alternative-comparison"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="card" style="padding: 16px; display: flex; flex-direction: column;">
                <h5 style="margin-bottom: 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">Mülk Değeri ve Kira Büyüme Eğrisi</h5>
                <div style="height: 220px; position: relative; width: 100%;">
                    <canvas id="chart-growth-curve"></canvas>
                </div>
            </div>
        `;
        
        // Destroy existing chart instances to avoid canvas reuse error
        if (window.activeFinancialCharts) {
            window.activeFinancialCharts.forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
        }
        window.activeFinancialCharts = [];
        
        // Render Chart.js instances
        // 1. Doughnut Gauge Chart for Cap Rate
        const capRateCtx = document.getElementById('chart-cap-rate').getContext('2d');
        const maxCap = Math.max(10, data.capRate);
        const capChart = new Chart(capRateCtx, {
            type: 'doughnut',
            data: {
                labels: ['Cap Rate', 'Kalan'],
                datasets: [{
                    data: [data.capRate, maxCap - data.capRate],
                    backgroundColor: ['#8b5cf6', 'rgba(255, 255, 255, 0.05)'],
                    borderWidth: 0,
                    hoverBackgroundColor: ['#8b5cf6', 'rgba(255, 255, 255, 0.05)']
                }]
            },
            options: {
                cutout: '80%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
        window.activeFinancialCharts.push(capChart);
        
        // 2. Bar Chart for 5th-year alternative comparison
        const compCtx = document.getElementById('chart-alternative-comparison').getContext('2d');
        const labelsComp = data.datasets.map(d => d.label);
        const valuesComp = data.datasets.map(d => d.data[5]);
        const compChart = new Chart(compCtx, {
            type: 'bar',
            data: {
                labels: labelsComp,
                datasets: [{
                    data: valuesComp,
                    backgroundColor: ['#10b981', '#8b5cf6', '#ea580c'],
                    borderRadius: 6,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: 'var(--text-secondary)', font: { size: 9 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: { size: 9 },
                            callback: function(value) {
                                return (value / 1000000).toFixed(1) + 'M ₺';
                            }
                        }
                    }
                }
            }
        });
        window.activeFinancialCharts.push(compChart);
        
        // 3. Line Chart for 5-Year projections
        const growthCtx = document.getElementById('chart-growth-curve').getContext('2d');
        const growthChart = new Chart(growthCtx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Mülk Değeri',
                        data: data.propertyValueProjection,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Kümülatif Kira Getirisi',
                        data: data.cumulativeRentProjection,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.05)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { color: 'var(--text-secondary)', font: { size: 10 }, boxWidth: 12 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.dataset.label + ': ' + formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: 'var(--text-secondary)', font: { size: 9 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: { size: 9 },
                            callback: function(value) {
                                return (value / 1000000).toFixed(1) + 'M ₺';
                            }
                        }
                    }
                }
            }
        });
        window.activeFinancialCharts.push(growthChart);
        
    } catch (e) {
        console.error("loadFinancialAnalysis error:", e);
        tabContentFinancial.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-danger);">
                <p>Veriler yüklenirken bir hata oluştu: ${e.message}</p>
            </div>
        `;
    }
}

// Social Media Caption Builder
function openSocialDraftModal(p) {
    const formattedPrice = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p.price);
    const agencyName = state.agency ? state.agency.name : "Gayrimenkul Acentesi";
    
    // Build templates
    const text = `✨ YENİ PORTFÖY İLANI! ✨

📍 İstanbul, ${p.district} - ${p.neighborhood} mahallesinde harika bir fırsat!

🏡 Özellikler:
• Oda Sayısı: ${p.rooms}
• Net Alan: ${p.area} m²
• Emlak Tipi: ${p.propertyType}
• Bina Yaşı: ${p.age || "Yeni Bina"}
• Isınma: ${p.heating || "Kombi"}
• Tapu Durumu: ${p.titleStatus || "Kat Mülkiyeti"}

💰 Fiyat: ${formattedPrice} (${p.type})

📝 Açıklama: ${p.notes || "Harika konumda lüks gayrimenkul."}

📞 Detaylı bilgi, sunum ve randevu için hemen iletişime geçin:
👤 ${p.createdByName}
🏢 ${agencyName}

#emlak #gayrimenkul #satilik #kiralik #daire #istanbul #konut #yatirim #realestate #remax #crm #turkiye`;

    const subContent = `
        <div style="display:flex; flex-direction:column; gap:16px;">
            <p style="font-size:13px; color:var(--text-secondary);">Instagram, Facebook veya LinkedIn gönderilerinizde kullanabileceğiniz, ilan özelliklerine göre derlenmiş sosyal medya taslağı:</p>
            <textarea id="social-draft-text" style="height:250px; font-family:monospace; font-size:12px; line-height:1.6;" readonly>${text}</textarea>
            <button id="btn-copy-draft" class="btn btn-secondary">📋 Taslağı Kopyala</button>
        </div>
    `;
    
    openModal("Sosyal Medya İlan Metni", subContent);
    
    document.getElementById('btn-copy-draft').addEventListener('click', () => {
        const txtArea = document.getElementById('social-draft-text');
        navigator.clipboard.writeText(txtArea.value).then(() => {
            showToast("Sosyal medya taslağı panoya kopyalandı!", "success");
            closeModal();
        });
    });
}

// Add Portfolio Modal Form
function openAddPortfolioModal() {
    tempCoordinates = { lat: 40.9800, lng: 29.0800 };
    
    const content = `
        <form id="form-portfolio-add">
            <div class="form-group">
                <label for="p-title">İlan Başlığı</label>
                <input type="text" id="p-title" placeholder="Örn: Suadiye Sahile Yakın Kentsel Dönüşümlü 3+1" required>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="p-price">Fiyat (TL)</label>
                    <input type="number" id="p-price" placeholder="Fiyat girin..." required>
                </div>
                <div class="form-group">
                    <label for="p-type">İlan Türü</label>
                    <select id="p-type">
                        <option value="Satılık">Satılık</option>
                        <option value="Kiralık">Kiralık</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="p-prop-type">Emlak Tipi</label>
                    <select id="p-prop-type">
                        <option value="Daire">Daire</option>
                        <option value="Villa">Villa</option>
                        <option value="Arsa">Arsa</option>
                        <option value="Ticari">Ticari</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="p-rooms">Oda Sayısı</label>
                    <select id="p-rooms">
                        <option value="1+1">1+1</option>
                        <option value="2+1">2+1</option>
                        <option value="3+1" selected>3+1</option>
                        <option value="4+1">4+1</option>
                        <option value="5+2">5+2</option>
                        <option value="Stüdyo">Stüdyo / 1+0</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="p-area">Metrekare (Net)</label>
                    <input type="number" id="p-area" placeholder="Alan m²..." required>
                </div>
                <div class="form-group">
                    <label for="p-status">İlan Durumu</label>
                    <select id="p-status">
                        <option value="aktif">Aktif</option>
                        <option value="beklemede">Beklemede</option>
                        <option value="iptal">İptal</option>
                        <option value="satildi">Satıldı</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="p-rent">Aylık Kira Getirisi (TL)</label>
                    <input type="number" id="p-rent" placeholder="Varsayılan: 0" value="0">
                </div>
                <div class="form-group">
                    <label for="p-growth">Tahmini Yıllık Değer Artışı (%)</label>
                    <input type="number" id="p-growth" placeholder="Varsayılan: 15" value="15">
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="p-city">Şehir</label>
                    <select id="p-city" required>
                        <option value="">Şehir Seçin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="p-district">İlçe</label>
                    <select id="p-district" required disabled>
                        <option value="">İlçe Seçin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="p-neighborhood">Mahalle</label>
                    <select id="p-neighborhood" required disabled>
                        <option value="">Mahalle Seçin</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="p-image">Fotoğraf URL</label>
                    <input type="text" id="p-image" placeholder="Görsel linkini yapıştırın...">
                    <div class="upload-safeguard-container" style="margin-top: 8px;">
                        <label for="portfolio-file" class="file-upload-label" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(99, 102, 241, 0.15); border: 1px dashed #6366f1; border-radius: 6px; color: #a5b4fc; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span>Görsel Yükle</span>
                        </label>
                        <input type="file" id="portfolio-file" accept="image/*" style="display: none;">
                        <span id="p-upload-status" style="font-size: 11px; margin-left: 8px; display: inline-block; vertical-align: middle;"></span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="p-commission">Komisyon Oranı (%)</label>
                    <input type="number" id="p-commission" value="2" step="0.5">
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="p-age">Bina Yaşı</label>
                    <select id="p-age">
                        <option value="Sıfır (Yeni)">Sıfır (Yeni)</option>
                        <option value="1-5 Yıl">1-5 Yıl</option>
                        <option value="6-10 Yıl">6-10 Yıl</option>
                        <option value="11-15 Yıl">11-15 Yıl</option>
                        <option value="16-20 Yıl">16-20 Yıl</option>
                        <option value="21-25 Yıl">21-25 Yıl</option>
                        <option value="26-30 Yıl">26-30 Yıl</option>
                        <option value="31 Yıl ve Üzeri">31 Yıl ve Üzeri</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="p-heating">Isınma</label>
                    <select id="p-heating">
                        <option value="Doğalgaz (Kombi)">Doğalgaz (Kombi)</option>
                        <option value="Merkezi Sistem">Merkezi Sistem</option>
                        <option value="Merkezi (Pay Ölçer)">Merkezi (Pay Ölçer)</option>
                        <option value="Yerden Isıtma">Yerden Isıtma</option>
                        <option value="Klima">Klima</option>
                        <option value="Isı Pompası">Isı Pompası</option>
                        <option value="Yok">Yok</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="p-title-status">Tapu Durumu</label>
                    <select id="p-title-status">
                        <option value="Kat Mülkiyeti">Kat Mülkiyeti</option>
                        <option value="Kat İrtifakı">Kat İrtifakı</option>
                        <option value="Arsa Tapulu">Arsa Tapulu</option>
                        <option value="Hisseli Tapu">Hisseli Tapu</option>
                        <option value="Milli Emlak">Milli Emlak</option>
                        <option value="İntikalli">İntikalli</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="p-sozlesme-tipi">Sözleşme Tipi</label>
                    <select id="p-sozlesme-tipi">
                        <option value="Sözleşmesiz">Sözleşmesiz</option>
                        <option value="Tek Yetkili">Tek Yetkili</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="p-sozlesme-bitis">Sözleşme Bitiş Tarihi</label>
                    <input type="date" id="p-sozlesme-bitis">
                </div>
                <div class="form-group">
                    <label for="p-mulk-durumu">Mülk Durumu</label>
                    <select id="p-mulk-durumu">
                        <option value="Boş">Boş</option>
                        <option value="Kiracılı">Kiracılı</option>
                        <option value="Mülk Sahibi Oturuyor">Mülk Sahibi Oturuyor</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="p-owner-search">Mülk Sahibi / Satıcı</label>
                <div style="display: flex; gap: 8px; align-items: center; position: relative;">
                    <div style="flex: 1; position: relative;">
                        <input type="text" id="p-owner-search" placeholder="Mülk Sahibi ara (İsim veya Telefon)..." autocomplete="off" style="width: 100%;">
                        <input type="hidden" id="p-owner-id" value="">
                        <div id="p-owner-autocomplete-results" class="autocomplete-results-container hidden">
                            <!-- Dynamic Search Results -->
                        </div>
                    </div>
                    <button type="button" id="btn-add-quick-owner" class="btn btn-outline" style="padding: 10px 14px; font-weight: bold; font-size: 16px; line-height: 1;" title="Yeni Mal Sahibi Ekle">+</button>
                </div>
            </div>
            
            <div class="form-group">
                <label for="p-tapu-notlari">Tapu Durumu Notları</label>
                <textarea id="p-tapu-notlari" placeholder="İpotek, Şerh, Hisseli vb. için açıklamalar..." style="min-height:60px;"></textarea>
            </div>
            
            <div class="form-group">
                <label>Haritada Konum Seçimi</label>
                <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
                    <button type="button" id="btn-select-location" class="btn btn-outline" style="font-size:12px; padding:8px 12px;">Haritadan Konum Seç (Aktif et)</button>
                    <span id="coord-indicator" style="font-size:11px; color:var(--text-secondary);">Varsayılan: Kadıköy</span>
                </div>
                <div style="font-size:10px; color:var(--text-muted);">
                    Butona bastıktan sonra arkadaki haritaya tıklayarak mülkün yerini işaretleyebilirsiniz.
                </div>
            </div>
            
            <div class="form-group">
                <label for="p-notes">Açıklama / Detaylı Notlar</label>
                <textarea id="p-notes" placeholder="Mülkle ilgili detaylar, ulaşım bilgileri, artı ve eksi yönleri..."></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">Portföyü Kaydet</button>
        </form>
    `;
    
    openModal("Yeni İlan Girişi", content);
    
    // Setup Chained Selects for Location
    initLocationChainedSelects('p');
    
    // Setup Autocomplete and Quick Add Owner
    setupOwnerAutocompleteAndQuickAdd('p');
    
    // Setup File Upload Safeguard Listener
    const fileInput = document.getElementById('portfolio-file');
    const imageInput = document.getElementById('p-image');
    const statusSpan = document.getElementById('p-upload-status');
    if (fileInput && imageInput && statusSpan) {
        fileInput.addEventListener('change', async () => {
            if (!fileInput.files || !fileInput.files[0]) return;
            const file = fileInput.files[0];
            
            // Check size locally (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                showToast("Hata: Dosya boyutu 10MB'tan küçük olmalıdır.", "error");
                statusSpan.innerHTML = `<span style="color:#ef4444; font-weight: 500;">Limit Aşımı (Max 10MB)</span>`;
                return;
            }
            
            statusSpan.innerHTML = `<span style="color:#818cf8; font-weight: 500;">Resim yükleniyor...</span>`;
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await apiFetch('/api/portfolios/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Sunucu yükleme hatası.");
                }
                
                imageInput.value = result.url;
                statusSpan.innerHTML = `<span style="color:#10b981; font-weight: 500;">✓ Yüklendi</span>`;
                showToast("Görsel başarıyla yüklendi.", "success");
            } catch (err) {
                console.error("Image upload failed:", err);
                statusSpan.innerHTML = `<span style="color:#ef4444; font-weight: 500;">Yükleme Hatası</span>`;
                showToast(`Dosya yükleme sunucu hatası nedeniyle başarısız oldu. Lütfen resmi manuel URL olarak girin.`, "error");
            }
        });
    }
    
    // Map Location Picker Trigger
    document.getElementById('btn-select-location').addEventListener('click', (e) => {
        e.target.textContent = "Haritaya Tıklayarak İşaretleyin...";
        e.target.classList.add('btn-secondary');
        
        enableLocationSelection((lat, lng) => {
            tempCoordinates = { lat, lng };
            document.getElementById('coord-indicator').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            e.target.textContent = "Konum İşaretlendi!";
            e.target.classList.remove('btn-secondary');
            e.target.classList.add('btn-outline');
            showToast("Harita üzerinde konum seçildi.", "info");
        });
    });
    
    // Submit Add Portfolio Form
    document.getElementById('form-portfolio-add').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const record = {
            title: document.getElementById('p-title').value.trim(),
            price: Number(document.getElementById('p-price').value),
            type: document.getElementById('p-type').value,
            propertyType: document.getElementById('p-prop-type').value,
            rooms: document.getElementById('p-rooms').value,
            area: Number(document.getElementById('p-area').value),
            city: document.getElementById('p-city').value.trim(),
            district: document.getElementById('p-district').value.trim(),
            neighborhood: document.getElementById('p-neighborhood').value.trim(),
            status: document.getElementById('p-status').value,
            imageUrl: document.getElementById('p-image').value.trim() || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&auto=format&fit=crop&q=60',
            commission: Number(document.getElementById('p-commission').value) || 0,
            age: document.getElementById('p-age').value,
            heating: document.getElementById('p-heating').value,
            titleStatus: document.getElementById('p-title-status').value,
            notes: document.getElementById('p-notes').value.trim(),
            latitude: tempCoordinates.lat,
            longitude: tempCoordinates.lng,
            sozlesme_tipi: document.getElementById('p-sozlesme-tipi').value,
            sozlesme_bitis_tarihi: document.getElementById('p-sozlesme-bitis').value,
            mulk_durumu: document.getElementById('p-mulk-durumu').value,
            tapu_durumu_notlari: document.getElementById('p-tapu-notlari').value.trim(),
            current_rent: Number(document.getElementById('p-rent').value) || 0,
            annual_growth_estimate: Number(document.getElementById('p-growth').value) || 15,
            inflation_estimate: 25,
            owner_id: document.getElementById('p-owner-id').value || ""
        };
        
        try {
            await addRecord('portfolios', record);
            closeModal();
            showToast("Yeni portföy başarıyla kaydedildi.", "success");
            updatePortfolioList();
        } catch (err) {
            showToast("Portföy kaydedilirken hata: " + err.message, "error");
        }
    });
}

// Edit Portfolio Modal Form
function openEditPortfolioModal(p) {
    tempCoordinates = { lat: p.latitude || 40.9800, lng: p.longitude || 29.0800 };
    const owner = state.customers.find(c => c.id === p.owner_id);
    const ownerName = owner ? owner.name : "";
    
    const content = `
        <form id="form-portfolio-edit">
            <div class="form-group">
                <label for="pe-title">İlan Başlığı</label>
                <input type="text" id="pe-title" value="${p.title}" required>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="pe-price">Fiyat (TL)</label>
                    <input type="number" id="pe-price" value="${p.price}" required>
                </div>
                <div class="form-group">
                    <label for="pe-type">İlan Türü</label>
                    <select id="pe-type">
                        <option value="Satılık" ${p.type === 'Satılık' ? 'selected' : ''}>Satılık</option>
                        <option value="Kiralık" ${p.type === 'Kiralık' ? 'selected' : ''}>Kiralık</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pe-prop-type">Emlak Tipi</label>
                    <select id="pe-prop-type">
                        <option value="Daire" ${p.propertyType === 'Daire' ? 'selected' : ''}>Daire</option>
                        <option value="Villa" ${p.propertyType === 'Villa' ? 'selected' : ''}>Villa</option>
                        <option value="Arsa" ${p.propertyType === 'Arsa' ? 'selected' : ''}>Arsa</option>
                        <option value="Ticari" ${p.propertyType === 'Ticari' ? 'selected' : ''}>Ticari</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="pe-rooms">Oda Sayısı</label>
                    <select id="pe-rooms">
                        <option value="1+1" ${p.rooms === '1+1' ? 'selected' : ''}>1+1</option>
                        <option value="2+1" ${p.rooms === '2+1' ? 'selected' : ''}>2+1</option>
                        <option value="3+1" ${p.rooms === '3+1' ? 'selected' : ''}>3+1</option>
                        <option value="4+1" ${p.rooms === '4+1' ? 'selected' : ''}>4+1</option>
                        <option value="5+2" ${p.rooms === '5+2' ? 'selected' : ''}>5+2</option>
                        <option value="Stüdyo" ${p.rooms === 'Stüdyo' ? 'selected' : ''}>Stüdyo / 1+0</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pe-area">Metrekare (Net)</label>
                    <input type="number" id="pe-area" value="${p.area}" required>
                </div>
                <div class="form-group">
                    <label for="pe-status">İlan Durumu</label>
                    <select id="pe-status">
                        <option value="aktif" ${(p.status || 'aktif').toLowerCase() === 'aktif' ? 'selected' : ''}>Aktif</option>
                        <option value="beklemede" ${(p.status || '').toLowerCase() === 'beklemede' ? 'selected' : ''}>Beklemede</option>
                        <option value="iptal" ${(p.status || '').toLowerCase() === 'iptal' ? 'selected' : ''}>İptal</option>
                        <option value="satildi" ${(p.status || '').toLowerCase() === 'satildi' ? 'selected' : ''}>Satıldı</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="pe-rent">Aylık Kira Getirisi (TL)</label>
                    <input type="number" id="pe-rent" value="${p.current_rent || 0}">
                </div>
                <div class="form-group">
                    <label for="pe-growth">Tahmini Yıllık Değer Artışı (%)</label>
                    <input type="number" id="pe-growth" value="${p.annual_growth_estimate || 15}">
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="pe-city">Şehir</label>
                    <select id="pe-city" required>
                        <option value="">Şehir Seçin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pe-district">İlçe</label>
                    <select id="pe-district" required disabled>
                        <option value="">İlçe Seçin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pe-neighborhood">Mahalle</label>
                    <select id="pe-neighborhood" required disabled>
                        <option value="">Mahalle Seçin</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="pe-image">Fotoğraf URL</label>
                    <input type="text" id="pe-image" value="${p.imageUrl}">
                    <div class="upload-safeguard-container" style="margin-top: 8px;">
                        <label for="portfolio-file" class="file-upload-label" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(99, 102, 241, 0.15); border: 1px dashed #6366f1; border-radius: 6px; color: #a5b4fc; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span>Görsel Değiştir/Yükle</span>
                        </label>
                        <input type="file" id="portfolio-file" accept="image/*" style="display: none;">
                        <span id="pe-upload-status" style="font-size: 11px; margin-left: 8px; display: inline-block; vertical-align: middle;"></span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="pe-commission">Komisyon Oranı (%)</label>
                    <input type="number" id="pe-commission" value="${p.commission || 2}" step="0.5">
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="pe-age">Bina Yaşı</label>
                    <select id="pe-age">
                        <option value="Sıfır (Yeni)" ${getAgeSelectValue(p.age) === 'Sıfır (Yeni)' ? 'selected' : ''}>Sıfır (Yeni)</option>
                        <option value="1-5 Yıl" ${getAgeSelectValue(p.age) === '1-5 Yıl' ? 'selected' : ''}>1-5 Yıl</option>
                        <option value="6-10 Yıl" ${getAgeSelectValue(p.age) === '6-10 Yıl' ? 'selected' : ''}>6-10 Yıl</option>
                        <option value="11-15 Yıl" ${getAgeSelectValue(p.age) === '11-15 Yıl' ? 'selected' : ''}>11-15 Yıl</option>
                        <option value="16-20 Yıl" ${getAgeSelectValue(p.age) === '16-20 Yıl' ? 'selected' : ''}>16-20 Yıl</option>
                        <option value="21-25 Yıl" ${getAgeSelectValue(p.age) === '21-25 Yıl' ? 'selected' : ''}>21-25 Yıl</option>
                        <option value="26-30 Yıl" ${getAgeSelectValue(p.age) === '26-30 Yıl' ? 'selected' : ''}>26-30 Yıl</option>
                        <option value="31 Yıl ve Üzeri" ${getAgeSelectValue(p.age) === '31 Yıl ve Üzeri' ? 'selected' : ''}>31 Yıl ve Üzeri</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pe-heating">Isınma</label>
                    <select id="pe-heating">
                        <option value="Doğalgaz (Kombi)" ${p.heating === 'Doğalgaz (Kombi)' ? 'selected' : ''}>Doğalgaz (Kombi)</option>
                        <option value="Merkezi Sistem" ${p.heating === 'Merkezi Sistem' ? 'selected' : ''}>Merkezi Sistem</option>
                        <option value="Merkezi (Pay Ölçer)" ${p.heating === 'Merkezi (Pay Ölçer)' ? 'selected' : ''}>Merkezi (Pay Ölçer)</option>
                        <option value="Yerden Isıtma" ${p.heating === 'Yerden Isıtma' ? 'selected' : ''}>Yerden Isıtma</option>
                        <option value="Klima" ${p.heating === 'Klima' ? 'selected' : ''}>Klima</option>
                        <option value="Isı Pompası" ${p.heating === 'Isı Pompası' ? 'selected' : ''}>Isı Pompası</option>
                        <option value="Yok" ${p.heating === 'Yok' ? 'selected' : ''}>Yok</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pe-title-status">Tapu Durumu</label>
                    <select id="pe-title-status">
                        <option value="Kat Mülkiyeti" ${p.titleStatus === 'Kat Mülkiyeti' ? 'selected' : ''}>Kat Mülkiyeti</option>
                        <option value="Kat İrtifakı" ${p.titleStatus === 'Kat İrtifakı' ? 'selected' : ''}>Kat İrtifakı</option>
                        <option value="Arsa Tapulu" ${p.titleStatus === 'Arsa Tapulu' ? 'selected' : ''}>Arsa Tapulu</option>
                        <option value="Hisseli Tapu" ${p.titleStatus === 'Hisseli Tapu' ? 'selected' : ''}>Hisseli Tapu</option>
                        <option value="Milli Emlak" ${p.titleStatus === 'Milli Emlak' ? 'selected' : ''}>Milli Emlak</option>
                        <option value="İntikalli" ${p.titleStatus === 'İntikalli' ? 'selected' : ''}>İntikalli</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="pe-sozlesme-tipi">Sözleşme Tipi</label>
                    <select id="pe-sozlesme-tipi">
                        <option value="Sözleşmesiz" ${p.sozlesme_tipi === 'Sözleşmesiz' ? 'selected' : ''}>Sözleşmesiz</option>
                        <option value="Tek Yetkili" ${p.sozlesme_tipi === 'Tek Yetkili' ? 'selected' : ''}>Tek Yetkili</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pe-sozlesme-bitis">Sözleşme Bitiş Tarihi</label>
                    <input type="date" id="pe-sozlesme-bitis" value="${p.sozlesme_bitis_tarihi || ''}">
                </div>
                <div class="form-group">
                    <label for="pe-mulk-durumu">Mülk Durumu</label>
                    <select id="pe-mulk-durumu">
                        <option value="Boş" ${p.mulk_durumu === 'Boş' ? 'selected' : ''}>Boş</option>
                        <option value="Kiracılı" ${p.mulk_durumu === 'Kiracılı' ? 'selected' : ''}>Kiracılı</option>
                        <option value="Mülk Sahibi Oturuyor" ${p.mulk_durumu === 'Mülk Sahibi Oturuyor' ? 'selected' : ''}>Mülk Sahibi Oturuyor</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="pe-owner-search">Mülk Sahibi / Satıcı</label>
                <div style="display: flex; gap: 8px; align-items: center; position: relative;">
                    <div style="flex: 1; position: relative;">
                        <input type="text" id="pe-owner-search" placeholder="Mülk Sahibi ara (İsim veya Telefon)..." autocomplete="off" style="width: 100%;" value="${ownerName}">
                        <input type="hidden" id="pe-owner-id" value="${p.owner_id || ''}">
                        <div id="pe-owner-autocomplete-results" class="autocomplete-results-container hidden">
                            <!-- Dynamic Search Results -->
                        </div>
                    </div>
                    <button type="button" id="btn-edit-quick-owner" class="btn btn-outline" style="padding: 10px 14px; font-weight: bold; font-size: 16px; line-height: 1;" title="Yeni Mal Sahibi Ekle">+</button>
                </div>
            </div>
            
            <div class="form-group">
                <label for="pe-tapu-notlari">Tapu Durumu Notları</label>
                <textarea id="pe-tapu-notlari" placeholder="İpotek, Şerh, Hisseli vb. için açıklamalar..." style="min-height:60px;">${p.tapu_durumu_notlari || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Haritada Konumu Düzenle</label>
                <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
                    <button type="button" id="btn-edit-location" class="btn btn-outline" style="font-size:12px; padding:8px 12px;">Haritadan Konum Seç</button>
                    <span id="coord-edit-indicator" style="font-size:11px; color:var(--text-secondary);">${tempCoordinates.lat.toFixed(5)}, ${tempCoordinates.lng.toFixed(5)}</span>
                </div>
            </div>
            
            <div class="form-group">
                <label for="pe-notes">Açıklama / Detaylı Notlar</label>
                <textarea id="pe-notes">${p.notes || ''}</textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">Değişiklikleri Kaydet</button>
        </form>
    `;
    
    openModal("İlan Düzenleme", content);
    
    // Setup Chained Selects for Location
    initLocationChainedSelects('pe', p.city || 'İstanbul', p.district, p.neighborhood);
    
    // Setup Autocomplete and Quick Add Owner
    setupOwnerAutocompleteAndQuickAdd('pe');
    
    // Setup File Upload Safeguard Listener
    const fileInput = document.getElementById('portfolio-file');
    const imageInput = document.getElementById('pe-image');
    const statusSpan = document.getElementById('pe-upload-status');
    if (fileInput && imageInput && statusSpan) {
        fileInput.addEventListener('change', async () => {
            if (!fileInput.files || !fileInput.files[0]) return;
            const file = fileInput.files[0];
            
            // Check size locally (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                showToast("Hata: Dosya boyutu 10MB'tan küçük olmalıdır.", "error");
                statusSpan.innerHTML = `<span style="color:#ef4444; font-weight: 500;">Limit Aşımı (Max 10MB)</span>`;
                return;
            }
            
            statusSpan.innerHTML = `<span style="color:#818cf8; font-weight: 500;">Resim yükleniyor...</span>`;
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await apiFetch('/api/portfolios/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Sunucu yükleme hatası.");
                }
                
                imageInput.value = result.url;
                statusSpan.innerHTML = `<span style="color:#10b981; font-weight: 500;">✓ Yüklendi</span>`;
                showToast("Görsel başarıyla güncellendi.", "success");
            } catch (err) {
                console.error("Image upload failed:", err);
                statusSpan.innerHTML = `<span style="color:#ef4444; font-weight: 500;">Yükleme Hatası</span>`;
                showToast(`Dosya yükleme sunucu hatası nedeniyle başarısız oldu. Lütfen resmi manuel URL olarak girin.`, "error");
            }
        });
    }
    
    // Position select pin initially on edit map
    setTimeout(() => {
        if (p.latitude && p.longitude) {
            setSelectMarkerPosition(p.latitude, p.longitude);
        }
    }, 100);
    
    // Location Picker edit mode
    document.getElementById('btn-edit-location').addEventListener('click', (e) => {
        e.target.textContent = "Haritaya Tıklayarak İşaretleyin...";
        e.target.classList.add('btn-secondary');
        
        enableLocationSelection((lat, lng) => {
            tempCoordinates = { lat, lng };
            document.getElementById('coord-edit-indicator').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            e.target.textContent = "Konum Güncellendi!";
            e.target.classList.remove('btn-secondary');
            e.target.classList.add('btn-outline');
            showToast("Harita konumu güncellendi.", "info");
        });
    });
    
    // Submit Edit Form
    document.getElementById('form-portfolio-edit').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updated = {
            title: document.getElementById('pe-title').value.trim(),
            price: Number(document.getElementById('pe-price').value),
            type: document.getElementById('pe-type').value,
            propertyType: document.getElementById('pe-prop-type').value,
            rooms: document.getElementById('pe-rooms').value,
            area: Number(document.getElementById('pe-area').value),
            city: document.getElementById('pe-city').value.trim(),
            district: document.getElementById('pe-district').value.trim(),
            neighborhood: document.getElementById('pe-neighborhood').value.trim(),
            status: document.getElementById('pe-status').value,
            imageUrl: document.getElementById('pe-image').value.trim(),
            commission: Number(document.getElementById('pe-commission').value) || 0,
            age: document.getElementById('pe-age').value,
            heating: document.getElementById('pe-heating').value,
            titleStatus: document.getElementById('pe-title-status').value,
            notes: document.getElementById('pe-notes').value.trim(),
            latitude: tempCoordinates.lat,
            longitude: tempCoordinates.lng,
            sozlesme_tipi: document.getElementById('pe-sozlesme-tipi').value,
            sozlesme_bitis_tarihi: document.getElementById('pe-sozlesme-bitis').value,
            mulk_durumu: document.getElementById('pe-mulk-durumu').value,
            tapu_durumu_notlari: document.getElementById('pe-tapu-notlari').value.trim(),
            current_rent: Number(document.getElementById('pe-rent').value) || 0,
            annual_growth_estimate: Number(document.getElementById('pe-growth').value) || 15,
            inflation_estimate: p.inflation_estimate || 25,
            owner_id: document.getElementById('pe-owner-id').value || ""
        };
        
        try {
            await updateRecord('portfolios', p.id, updated);
            closeModal();
            showToast("İlan başarıyla güncellendi.", "success");
            updatePortfolioList();
        } catch (err) {
            showToast("Güncelleme hatası: " + err.message, "error");
        }
    });
}

function initLocationChainedSelects(prefix, selectedCity = '', selectedDistrict = '', selectedNeighborhood = '') {
    const citySelect = document.getElementById(`${prefix}-city`);
    const districtSelect = document.getElementById(`${prefix}-district`);
    const neighborhoodSelect = document.getElementById(`${prefix}-neighborhood`);

    if (!citySelect || !districtSelect || !neighborhoodSelect) return;

    // 1. Populate Cities
    citySelect.innerHTML = '<option value="">Şehir Seçin</option>' + 
        Object.keys(LOCATIONS_DATA).map(city => `<option value="${city}">${city}</option>`).join('');

    // Set initial city
    if (selectedCity) {
        citySelect.value = selectedCity;
        populateDistricts(selectedCity, selectedDistrict, selectedNeighborhood);
    }

    // City Change Event
    citySelect.addEventListener('change', () => {
        const city = citySelect.value;
        if (!city) {
            districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
            districtSelect.disabled = true;
            neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
            neighborhoodSelect.disabled = true;
        } else {
            populateDistricts(city);
        }
    });

    // District Change Event
    districtSelect.addEventListener('change', () => {
        const city = citySelect.value;
        const district = districtSelect.value;
        if (!district) {
            neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
            neighborhoodSelect.disabled = true;
        } else {
            populateNeighborhoods(city, district);
        }
    });

    function populateDistricts(city, initDistrict = '', initNeighborhood = '') {
        const districts = LOCATIONS_DATA[city] ? Object.keys(LOCATIONS_DATA[city]) : [];
        districtSelect.innerHTML = '<option value="">İlçe Seçin</option>' +
            districts.map(d => `<option value="${d}">${d}</option>`).join('');
        districtSelect.disabled = false;
        
        neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
        neighborhoodSelect.disabled = true;

        if (initDistrict) {
            districtSelect.value = initDistrict;
            populateNeighborhoods(city, initDistrict, initNeighborhood);
        }
    }

    function populateNeighborhoods(city, district, initNeighborhood = '') {
        const neighborhoods = (LOCATIONS_DATA[city] && LOCATIONS_DATA[city][district]) ? LOCATIONS_DATA[city][district] : [];
        neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>' +
            neighborhoods.map(n => `<option value="${n}">${n}</option>`).join('');
        neighborhoodSelect.disabled = false;

        if (initNeighborhood) {
            neighborhoodSelect.value = initNeighborhood;
        }
    }
}

function setupOwnerAutocompleteAndQuickAdd(prefix) {
    const ownerSearch = document.getElementById(`${prefix}-owner-search`);
    const ownerIdInput = document.getElementById(`${prefix}-owner-id`);
    const autocompleteResults = document.getElementById(`${prefix}-owner-autocomplete-results`);
    const quickOwnerBtn = document.getElementById(`btn-${prefix === 'p' ? 'add' : 'edit'}-quick-owner`);

    if (!ownerSearch || !ownerIdInput || !autocompleteResults || !quickOwnerBtn) return;

    ownerSearch.addEventListener('input', () => {
        const val = ownerSearch.value.trim().toLowerCase();
        if (!val) {
            autocompleteResults.innerHTML = '';
            autocompleteResults.classList.add('hidden');
            return;
        }
        const matches = state.customers.filter(c => {
            const nameMatch = c.name ? c.name.toLowerCase().includes(val) : false;
            const phoneMatch = c.phone ? c.phone.toLowerCase().includes(val) : false;
            return nameMatch || phoneMatch;
        });

        if (matches.length === 0) {
            autocompleteResults.innerHTML = `<div style="padding: 10px; font-size:12px; color:var(--text-muted); text-align:center;">Müşteri bulunamadı</div>`;
        } else {
            autocompleteResults.innerHTML = matches.map(c => {
                const clientType = c.client_type || (c.type === 'Satıcı' ? 'Satıcı/Mülk Sahibi' : 'Alıcı');
                return `
                    <div class="autocomplete-item" data-id="${c.id}" data-name="${c.name}">
                        <strong>${c.name}</strong>
                        <span class="autocomplete-item-sub">${clientType} | ${c.phone}</span>
                    </div>
                `;
            }).join('');
        }
        autocompleteResults.classList.remove('hidden');
    });

    // Add Blur Listener to hide dropdown when losing focus
    ownerSearch.addEventListener('blur', () => {
        setTimeout(() => {
            autocompleteResults.innerHTML = '';
            autocompleteResults.classList.add('hidden');
        }, 200);
    });

    const clickOutsideHandler = (ev) => {
        if (!ownerSearch.contains(ev.target) && !autocompleteResults.contains(ev.target)) {
            autocompleteResults.innerHTML = '';
            autocompleteResults.classList.add('hidden');
        }
    };
    document.addEventListener('click', clickOutsideHandler);

    autocompleteResults.addEventListener('click', (ev) => {
        const item = ev.target.closest('.autocomplete-item');
        if (item) {
            ownerSearch.value = item.dataset.name;
            ownerIdInput.value = item.dataset.id;
            autocompleteResults.innerHTML = '';
            autocompleteResults.classList.add('hidden');
        }
    });

    quickOwnerBtn.addEventListener('click', () => {
        const miniModal = document.createElement('div');
        miniModal.id = 'mini-modal-quick-owner';
        miniModal.style.position = 'fixed';
        miniModal.style.top = '0';
        miniModal.style.left = '0';
        miniModal.style.width = '100vw';
        miniModal.style.height = '100vh';
        miniModal.style.background = 'rgba(0, 0, 0, 0.7)';
        miniModal.style.display = 'flex';
        miniModal.style.alignItems = 'center';
        miniModal.style.justifyContent = 'center';
        miniModal.style.zIndex = '9999';

        miniModal.innerHTML = `
            <div class="card" style="width: 90%; max-width: 450px; padding: 24px; border: 1px solid var(--border-color); background: var(--bg-card); position: relative; box-shadow: var(--shadow-lg);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h3 style="margin:0;">Hızlı Mal Sahibi Ekle</h3>
                    <button type="button" id="btn-close-quick-owner" style="background:transparent; border:none; color:var(--text-muted); font-size:20px; cursor:pointer;">&times;</button>
                </div>
                <form id="form-quick-owner">
                    <div class="form-group">
                        <label>Adı Soyadı</label>
                        <input type="text" id="qo-name" placeholder="Müşteri adı soyadı..." required style="width: 100%;">
                    </div>
                    <div class="form-group">
                        <label>Telefon</label>
                        <input type="text" id="qo-phone" placeholder="Telefon numarası..." required style="width: 100%;">
                    </div>
                    <div class="form-group">
                        <label>E-posta</label>
                        <input type="email" id="qo-email" placeholder="E-posta adresi..." style="width: 100%;">
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" style="margin-top:16px;">Müşteriyi Kaydet</button>
                </form>
            </div>
        `;

        document.body.appendChild(miniModal);

        const closeQO = () => {
            miniModal.remove();
        };
        document.getElementById('btn-close-quick-owner').addEventListener('click', closeQO);
        miniModal.addEventListener('click', (e) => {
            if (e.target === miniModal) closeQO();
        });

        document.getElementById('form-quick-owner').addEventListener('submit', async (e) => {
            e.preventDefault();
            const qoName = document.getElementById('qo-name').value.trim();
            const qoPhone = document.getElementById('qo-phone').value.trim();
            const qoEmail = document.getElementById('qo-email').value.trim();

            const record = {
                name: qoName,
                phone: qoPhone,
                email: qoEmail,
                type: 'Satıcı',
                client_type: 'Satıcı/Mülk Sahibi',
                status: 'aktif',
                lifecycle_stage: 'Potansiyel',
                createdAt: new Date().toISOString()
            };

            try {
                await addRecord('customers', record);
                const newCust = state.customers.find(cust => cust.phone === qoPhone);
                if (newCust) {
                    ownerSearch.value = newCust.name;
                    ownerIdInput.value = newCust.id;
                } else {
                    ownerSearch.value = qoName;
                }
                showToast("Yeni mal sahibi başarıyla oluşturuldu.", "success");
                closeQO();
            } catch (err) {
                showToast("Mal sahibi kaydedilirken hata: " + err.message, "error");
            }
        });
    });
}
