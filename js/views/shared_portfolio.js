// PROJECTCRM - Ortak Portföy Havuzu Görünümü (Shared Portfolio View)

import { apiFetch } from '../store.js';
import { showToast, openModal, closeModal } from '../components/ui.js';

let sharedPortfolios = [];

export async function updateSharedPortfolioTable(container) {
    const tableBody = container.querySelector('#shared-portfolio-table-body');
    if (!tableBody) return;

    try {
        const res = await apiFetch('/api/portfolios/shared');
        if (!res.ok) {
            throw new Error("Ortak portföy havuzu verileri alınamadı.");
        }
        sharedPortfolios = await res.json();
        
        renderFilteredTable(container, sharedPortfolios);
    } catch (err) {
        console.error(err);
        showToast("Ortak portföy havuzu yüklenirken hata oluştu.", "error");
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    Yükleme başarısız.
                </td>
            </tr>
        `;
    }
}

function renderFilteredTable(container, list) {
    const tableBody = container.querySelector('#shared-portfolio-table-body');
    if (!tableBody) return;

    if (list.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    Gösterilecek ortak ilan bulunamadı.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = list.map(item => {
        const priceFormatted = Number(item.price || item.fiyat || 0).toLocaleString('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            maximumFractionDigits: 0
        });
        const typeLower = (item.type || '').toLowerCase();
        const isSatilik = typeLower.includes('sat') || typeLower.includes('satilik') || typeLower.includes('satılık');
        const typeLabel = isSatilik ? 'Satılık' : 'Kiralık';
        const typeBadgeStyle = isSatilik
            ? 'background: rgba(99, 102, 241, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);'
            : 'background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);';
        
        const image = item.imageUrl || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&auto=format&fit=crop&q=60";
        const district = item.district || item.bolge || '-';
        const neighborhood = item.neighborhood ? `, ${item.neighborhood}` : '';
        const rooms = item.rooms || item.oda_sayisi || '-';
        
        return `
            <tr style="transition: background-color var(--transition-fast);">
                <td>
                    <img src="${image}" alt="Mülk" style="width: 50px; height: 40px; border-radius: var(--border-radius-sm); object-fit: cover; border: 1px solid var(--border-color);">
                </td>
                <td>
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 13px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.title}">
                        ${item.title}
                    </div>
                </td>
                <td>
                    <span style="font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; display: inline-block; ${typeBadgeStyle}">
                        ${typeLabel}
                    </span>
                </td>
                <td style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">
                    📍 ${district}${neighborhood}
                </td>
                <td style="font-size: 13px; color: var(--text-primary); font-weight: 700;">
                    ${priceFormatted}
                </td>
                <td style="font-size: 13px; color: var(--text-secondary); text-align: center;">
                    ${rooms}
                </td>
                <td>
                    <div style="font-weight: 500; color: var(--text-primary); font-size: 12px;">👤 ${item.agent_name}</div>
                </td>
                <td>
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">🏢 ${item.agency_name}</div>
                </td>
                <td>
                    <button class="btn btn-secondary btn-shared-detail" data-id="${item.id}" style="font-size: 11px; padding: 6px 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        İletişime Geç / Detay
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Attach click listeners to detail button
    const detailBtns = container.querySelectorAll('.btn-shared-detail');
    detailBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const item = sharedPortfolios.find(p => p.id === id);
            if (item) {
                openSharedDetailModal(item);
            }
        });
    });
}

function openSharedDetailModal(item) {
    const priceFormatted = Number(item.price || item.fiyat || 0).toLocaleString('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0
    });
    const typeLower = (item.type || '').toLowerCase();
    const isSatilik = typeLower.includes('sat') || typeLower.includes('satilik') || typeLower.includes('satılık');
    const typeLabel = isSatilik ? 'Satılık' : 'Kiralık';
    const image = item.imageUrl || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&auto=format&fit=crop&q=60";
    
    const phone = item.agent_phone || "Belirtilmemiş";
    const email = item.agent_email || "Belirtilmemiş";
    const agency = item.agency_name || "Bireysel / Acentesiz";
    
    const detailsHtml = `
        <div style="display: flex; flex-direction: column; gap: 20px; color: var(--text-primary);">
            <!-- Image Header -->
            <div style="position: relative; border-radius: var(--border-radius-md); overflow: hidden; height: 200px; border: 1px solid var(--border-color);">
                <img src="${image}" alt="Mülk Görseli" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; bottom: 12px; left: 12px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid var(--border-color); color: #c084fc;">
                    ${typeLabel}
                </div>
            </div>

            <!-- Description -->
            <div>
                <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">${item.title}</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: rgba(255, 255, 255, 0.02); padding: 14px; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); font-size: 12px;">
                    <div><strong>Fiyat:</strong> <span style="color: var(--primary); font-weight: 700;">${priceFormatted}</span></div>
                    <div><strong>Bölge:</strong> ${item.district || item.bolge || '-'} ${item.neighborhood ? `, ${item.neighborhood}` : ''}</div>
                    <div><strong>Oda Sayısı:</strong> ${item.rooms || item.oda_sayisi || '-'}</div>
                    <div><strong>Alan:</strong> ${item.area ? `${item.area} m²` : '-'}</div>
                </div>
                ${item.notes && item.notes !== '*** YETKİNİZ YOK ***' ? `
                    <div style="margin-top: 12px;">
                        <span style="font-size: 11px; color: var(--text-muted); display: block; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">İlan Notları</span>
                        <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 10px; margin: 0;">${item.notes}</p>
                    </div>
                ` : ''}
            </div>

            <!-- Partner Contact Info -->
            <div style="background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.15); border-radius: var(--border-radius-sm); padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                <h5 style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; margin: 0; color: var(--primary); display: flex; align-items: center; gap: 6px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Portföy Sahibi / İletişim Ortağı
                </h5>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-secondary);">Danışman Adı:</span>
                        <strong style="color: var(--text-primary);">${item.agent_name}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-secondary);">Acente Ofisi:</span>
                        <strong style="color: var(--text-primary); text-transform: uppercase;">🏢 ${agency}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color); padding-top: 8px;">
                        <span style="color: var(--text-secondary);">Telefon:</span>
                        <a href="tel:${phone}" style="color: var(--secondary); text-decoration: none; font-weight: 600;">📞 ${phone}</a>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-secondary);">E-posta:</span>
                        <a href="mailto:${email}" style="color: var(--primary); text-decoration: none; font-weight: 600;">✉️ ${email}</a>
                    </div>
                </div>
            </div>

            <!-- Footer Action -->
            <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                <button type="button" class="btn btn-primary" id="btn-close-shared-detail" style="font-size: 13px; padding: 10px 20px;">Kapat</button>
            </div>
        </div>
    `;

    openModal("İlan İletişim Kartı", detailsHtml);

    const btnClose = document.getElementById('btn-close-shared-detail');
    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }
}

export async function renderSharedPortfolioView(container) {
    container.innerHTML = `
        <div class="view-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <h2 style="font-family:'Outfit', sans-serif; font-weight:700; font-size:24px; margin:0;">Ortak Portföy Havuzu</h2>
                <p style="color:var(--text-secondary); font-size:13px; margin:0;">Acente veya çalışma alanı fark etmeksizin sistemdeki tüm danışmanların paylaştığı ortak aktif ilan havuzu.</p>
            </div>
        </div>

        <!-- Filter Card -->
        <div class="card" style="padding: 16px 24px; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
            <div style="flex: 1; min-width: 250px; position: relative;">
                <input type="text" id="shared-portfolio-search" placeholder="İlan başlığı, bölge veya danışman adı ile ara..." style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 10px 14px 10px 40px; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color var(--transition-fast); width: 100%;">
                <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </span>
            </div>
            
            <div style="display: flex; gap: 12px;">
                <select id="shared-portfolio-filter-type" style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 10px 16px; color: var(--text-primary); font-size: 13px; outline: none; cursor: pointer;">
                    <option value="">Tüm İlanlar</option>
                    <option value="satilik">Satılık</option>
                    <option value="kiralik">Kiralık</option>
                </select>
                
                <select id="shared-portfolio-filter-region" style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 10px 16px; color: var(--text-primary); font-size: 13px; outline: none; cursor: pointer;">
                    <option value="">Tüm Bölgeler</option>
                    <option value="kadikoy">Kadıköy</option>
                    <option value="kartal">Kartal</option>
                    <option value="maltepe">Maltepe</option>
                    <option value="pendik">Pendik</option>
                </select>
            </div>
        </div>

        <!-- Data Grid -->
        <div class="card" style="padding: 24px;">
            <div class="table-responsive">
                <table class="crm-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;">Görsel</th>
                            <th>İlan Başlığı</th>
                            <th>Tür</th>
                            <th>Bölge</th>
                            <th>Fiyat</th>
                            <th style="text-align: center;">Oda</th>
                            <th>Danışman</th>
                            <th>Acente</th>
                            <th style="width: 160px;">Eylemler</th>
                        </tr>
                    </thead>
                    <tbody id="shared-portfolio-table-body">
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                                Yükleniyor...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Filter listener logic
    const searchInput = container.querySelector('#shared-portfolio-search');
    const typeSelect = container.querySelector('#shared-portfolio-filter-type');
    const regionSelect = container.querySelector('#shared-portfolio-filter-region');

    const filterListings = () => {
        const query = (searchInput.value || '').toLowerCase().trim();
        const type = (typeSelect.value || '').toLowerCase();
        const region = (regionSelect.value || '').toLowerCase();

        const filtered = sharedPortfolios.filter(item => {
            const titleMatch = (item.title || '').toLowerCase().includes(query);
            const districtMatch = (item.district || item.bolge || '').toLowerCase().includes(query);
            const agentMatch = (item.agent_name || '').toLowerCase().includes(query);
            const agencyMatch = (item.agency_name || '').toLowerCase().includes(query);
            
            const matchesSearch = titleMatch || districtMatch || agentMatch || agencyMatch;
            
            const typeLower = (item.type || '').toLowerCase();
            const isSatilik = typeLower.includes('sat') || typeLower.includes('satilik') || typeLower.includes('satılık');
            const matchesType = !type || 
                (type === 'satilik' && isSatilik) ||
                (type === 'kiralik' && !isSatilik);
            
            const matchesRegion = !region || (item.district || item.bolge || '').toLowerCase().includes(region);
            
            return matchesSearch && matchesType && matchesRegion;
        });

        renderFilteredTable(container, filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterListings);
    if (typeSelect) typeSelect.addEventListener('change', filterListings);
    if (regionSelect) regionSelect.addEventListener('change', filterListings);

    await updateSharedPortfolioTable(container);
}
