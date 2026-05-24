// Gayrimenkul CRM - Portföy Yönetimi ve Harita Görünümü

import { state, addRecord, updateRecord, deleteRecord, getMatchesForPortfolio, canViewPhone, maskPhoneNumber, apiFetch } from '../store.js';
import { initMap, renderPortfolioMarkers, enableLocationSelection, setSelectMarkerPosition } from '../components/map.js';
import { openModal, closeModal, showToast } from '../components/ui.js';

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
                            <span>${p.district}, ${p.neighborhood}</span>
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
                        <p style="font-size:13px; color:var(--text-secondary); line-height:1.6; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:12px; border-radius:var(--border-radius-md);">${p.notes || "Not eklenmemiş."}</p>
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
                            <span class="spec-entry-value">${p.district}, ${p.neighborhood}</span>
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
                            <button id="btn-edit-p" class="btn btn-outline">Düzenle</button>
                            <button id="btn-delete-p" class="btn btn-danger">İlanı Sil</button>
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
                <button id="btn-edit-p-financial" class="btn btn-primary" style="margin: 0 auto; display: block; padding: 8px 24px;">Mülkü Düzenle</button>
            </div>
        `;
        document.getElementById('btn-edit-p-financial').addEventListener('click', () => {
            closeModal();
            openEditPortfolioModal(p);
        });
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
                    <input type="text" id="p-city" value="İstanbul" required>
                </div>
                <div class="form-group">
                    <label for="p-district">İlçe</label>
                    <input type="text" id="p-district" placeholder="Örn: Kadıköy" required>
                </div>
                <div class="form-group">
                    <label for="p-neighborhood">Mahalle</label>
                    <input type="text" id="p-neighborhood" placeholder="Örn: Göztepe" required>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="p-image">Fotoğraf URL</label>
                    <input type="text" id="p-image" placeholder="Görsel linkini yapıştırın...">
                </div>
                <div class="form-group">
                    <label for="p-commission">Komisyon Oranı (%)</label>
                    <input type="number" id="p-commission" value="2" step="0.5">
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="p-age">Bina Yaşı</label>
                    <input type="number" id="p-age" placeholder="Bina yaşı...">
                </div>
                <div class="form-group">
                    <label for="p-heating">Isınma</label>
                    <input type="text" id="p-heating" value="Doğalgaz (Kombi)">
                </div>
                <div class="form-group">
                    <label for="p-title-status">Tapu Durumu</label>
                    <input type="text" id="p-title-status" value="Kat Mülkiyeti">
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
            age: Number(document.getElementById('p-age').value) || 0,
            heating: document.getElementById('p-heating').value.trim(),
            titleStatus: document.getElementById('p-title-status').value.trim(),
            notes: document.getElementById('p-notes').value.trim(),
            latitude: tempCoordinates.lat,
            longitude: tempCoordinates.lng,
            sozlesme_tipi: document.getElementById('p-sozlesme-tipi').value,
            sozlesme_bitis_tarihi: document.getElementById('p-sozlesme-bitis').value,
            mulk_durumu: document.getElementById('p-mulk-durumu').value,
            tapu_durumu_notlari: document.getElementById('p-tapu-notlari').value.trim(),
            current_rent: Number(document.getElementById('p-rent').value) || 0,
            annual_growth_estimate: Number(document.getElementById('p-growth').value) || 15,
            inflation_estimate: 25
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
                    <input type="text" id="pe-city" value="${p.city || 'İstanbul'}" required>
                </div>
                <div class="form-group">
                    <label for="pe-district">İlçe</label>
                    <input type="text" id="pe-district" value="${p.district}" required>
                </div>
                <div class="form-group">
                    <label for="pe-neighborhood">Mahalle</label>
                    <input type="text" id="pe-neighborhood" value="${p.neighborhood}" required>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="pe-image">Fotoğraf URL</label>
                    <input type="text" id="pe-image" value="${p.imageUrl}">
                </div>
                <div class="form-group">
                    <label for="pe-commission">Komisyon Oranı (%)</label>
                    <input type="number" id="pe-commission" value="${p.commission || 2}" step="0.5">
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="pe-age">Bina Yaşı</label>
                    <input type="number" id="pe-age" value="${p.age || 0}">
                </div>
                <div class="form-group">
                    <label for="pe-heating">Isınma</label>
                    <input type="text" id="pe-heating" value="${p.heating || 'Doğalgaz (Kombi)'}">
                </div>
                <div class="form-group">
                    <label for="pe-title-status">Tapu Durumu</label>
                    <input type="text" id="pe-title-status" value="${p.titleStatus || 'Kat Mülkiyeti'}">
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
            age: Number(document.getElementById('pe-age').value) || 0,
            heating: document.getElementById('pe-heating').value.trim(),
            titleStatus: document.getElementById('pe-title-status').value.trim(),
            notes: document.getElementById('pe-notes').value.trim(),
            latitude: tempCoordinates.lat,
            longitude: tempCoordinates.lng,
            sozlesme_tipi: document.getElementById('pe-sozlesme-tipi').value,
            sozlesme_bitis_tarihi: document.getElementById('pe-sozlesme-bitis').value,
            mulk_durumu: document.getElementById('pe-mulk-durumu').value,
            tapu_durumu_notlari: document.getElementById('pe-tapu-notlari').value.trim(),
            current_rent: Number(document.getElementById('pe-rent').value) || 0,
            annual_growth_estimate: Number(document.getElementById('pe-growth').value) || 15,
            inflation_estimate: p.inflation_estimate || 25
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
