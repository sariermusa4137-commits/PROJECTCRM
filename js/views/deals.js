// Gayrimenkul CRM - Süreç Yönetimi (Deal Flow Checklist & Financial Commission Panel)

import { state, addRecord, updateRecord, deleteRecord, logDealEventToTimelines } from '../store.js';
import { openModal, closeModal, showToast } from '../components/ui.js';

export function renderDealsView(container) {
    const deals = state.deals || [];
    
    const hasDealsGrid = container.querySelector('#deals-list-container');
    const hasEmptyState = container.querySelector('#btn-add-deal-placeholder');
    
    if ((hasDealsGrid && deals.length > 0) || (hasEmptyState && deals.length === 0)) {
        if (hasDealsGrid) {
            updateDealsSummary(container, deals);
            populateDealCards();
            return;
        }
        if (hasEmptyState) {
            return;
        }
    }
    
    container.innerHTML = `
        <div class="view-header">
            <div>
                <h2>Süreç Yönetimi (Deal Flow)</h2>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">Aktif satış ve kiralama süreçlerinin adım adım takibi ve finansal hak ediş yönetimi.</p>
            </div>
            <button id="btn-add-deal" class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Yeni Süreç Başlat
            </button>
        </div>

        <div class="deals-dashboard-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div class="summary-card" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 16px; border-radius: var(--border-radius-md);">
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Aktif Süreç Sayısı</span>
                <h3 id="deal-summary-count" style="font-size: 28px; font-weight: 700; margin-top: 8px; color: #ea580c;">${deals.length}</h3>
            </div>
            <div class="summary-card" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 16px; border-radius: var(--border-radius-md);">
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Toplam Anlaşılan Hacim</span>
                <h3 id="deal-summary-volume" style="font-size: 28px; font-weight: 700; margin-top: 8px; color: var(--text-primary);">${formatCurrency(deals.reduce((sum, d) => sum + (Number(d.agreedPrice) || 0), 0))}</h3>
            </div>
            <div class="summary-card" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 16px; border-radius: var(--border-radius-md);">
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Beklenen Komisyon</span>
                <h3 id="deal-summary-expected" style="font-size: 28px; font-weight: 700; margin-top: 8px; color: var(--secondary);">${formatCurrency(deals.reduce((sum, d) => {
                    const price = Number(d.agreedPrice) || 0;
                    let commission = 0;
                    if (d.buyerInvoiceStatus !== "Tahsil Edildi") commission += price * 0.02;
                    if (d.sellerInvoiceStatus !== "Tahsil Edildi") commission += price * 0.02;
                    return sum + commission;
                }, 0))}</h3>
            </div>
            <div class="summary-card" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 16px; border-radius: var(--border-radius-md);">
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Tahsil Edilen Komisyon</span>
                <h3 id="deal-summary-collected" style="font-size: 28px; font-weight: 700; margin-top: 8px; color: #10b981;">${formatCurrency(deals.reduce((sum, d) => {
                    const price = Number(d.agreedPrice) || 0;
                    let commission = 0;
                    if (d.buyerInvoiceStatus === "Tahsil Edildi") commission += price * 0.02;
                    if (d.sellerInvoiceStatus === "Tahsil Edildi") commission += price * 0.02;
                    return sum + commission;
                }, 0))}</h3>
            </div>
        </div>
        
        <div class="deals-layout">
            ${deals.length === 0 ? `
                <div style="text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.01); border: 1px dashed var(--border-color); border-radius: var(--border-radius-lg);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📑</div>
                    <h3 style="font-family: 'Outfit', sans-serif; font-size: 18px; margin-bottom: 8px;">Henüz Süreç Başlatılmadı</h3>
                    <p style="color: var(--text-secondary); font-size: 13px; max-width: 400px; margin: 0 auto 20px auto;">
                        Satışı kesinleşmek üzere olan veya tapu işlemlerine başlanan portföyleriniz için süreç başlatarak yasal evrak ve hizmet bedeli takibini yapabilirsiniz.
                    </p>
                    <button id="btn-add-deal-placeholder" class="btn btn-primary btn-sm">Süreç Başlat</button>
                </div>
            ` : `
                <div class="deals-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;" id="deals-list-container">
                    <!-- Cards will be populated here -->
                </div>
            `}
        </div>
    `;

    // Render cards if deals exist
    if (deals.length > 0) {
        populateDealCards();
    }

    // Attach Action Listeners
    const btnAdd = document.getElementById('btn-add-deal');
    if (btnAdd) {
        btnAdd.addEventListener('click', openCreateDealModal);
    }
    const btnAddPlaceholder = document.getElementById('btn-add-deal-placeholder');
    if (btnAddPlaceholder) {
        btnAddPlaceholder.addEventListener('click', openCreateDealModal);
    }
}

function formatCurrency(val) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
}

function updateDealsSummary(container, deals) {
    const elCount = container.querySelector('#deal-summary-count');
    const elVolume = container.querySelector('#deal-summary-volume');
    const elExpected = container.querySelector('#deal-summary-expected');
    const elCollected = container.querySelector('#deal-summary-collected');
    
    if (elCount) elCount.textContent = deals.length;
    if (elVolume) elVolume.textContent = formatCurrency(deals.reduce((sum, d) => sum + (Number(d.agreedPrice) || 0), 0));
    if (elExpected) {
        elExpected.textContent = formatCurrency(deals.reduce((sum, d) => {
            const price = Number(d.agreedPrice) || 0;
            let commission = 0;
            if (d.buyerInvoiceStatus !== "Tahsil Edildi") commission += price * 0.02;
            if (d.sellerInvoiceStatus !== "Tahsil Edildi") commission += price * 0.02;
            return sum + commission;
        }, 0));
    }
    if (elCollected) {
        elCollected.textContent = formatCurrency(deals.reduce((sum, d) => {
            const price = Number(d.agreedPrice) || 0;
            let commission = 0;
            if (d.buyerInvoiceStatus === "Tahsil Edildi") commission += price * 0.02;
            if (d.sellerInvoiceStatus === "Tahsil Edildi") commission += price * 0.02;
            return sum + commission;
        }, 0));
    }
}

function populateDealCards() {
    const container = document.getElementById('deals-list-container');
    if (!container) return;

    const deals = state.deals || [];
    container.innerHTML = deals.map(deal => {
        const totalItems = deal.checklist ? deal.checklist.length : 0;
        const completedItems = deal.checklist ? deal.checklist.filter(item => item.completed).length : 0;
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        return `
            <div class="deal-card card-hover" data-deal-id="${deal.id}" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 20px; cursor: pointer; display: flex; flex-direction: column; gap: 14px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="max-width: 80%;">
                        <h4 style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--text-primary);">${deal.portfolioTitle}</h4>
                        <span style="font-size: 11px; color: var(--text-secondary); display: block; margin-top: 4px;">Bedel: ${formatCurrency(deal.agreedPrice)}</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 20px; background: rgba(234, 88, 12, 0.1); color: #ea580c; border: 1px solid rgba(234, 88, 12, 0.2);">
                        %${percentage}
                    </div>
                </div>
                
                <hr style="border: none; border-top: 1px solid var(--border-color); margin: 0;">

                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--text-muted); width: 60px;">Alıcı:</span>
                        <span style="font-weight: 500;">🤝 ${deal.buyerName}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--text-muted); width: 60px;">Satıcı:</span>
                        <span style="font-weight: 500;">🏡 ${deal.sellerName}</span>
                    </div>
                </div>

                <!-- Progress bar -->
                <div style="margin-top: 4px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                        <span>İşlem Adımları</span>
                        <span>${completedItems}/${totalItems} Tamamlandı</span>
                    </div>
                    <div style="height: 6px; width: 100%; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #ea580c, #f97316); border-radius: 4px;"></div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11px;">
                    <div>
                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${deal.buyerInvoiceStatus === 'Tahsil Edildi' ? '#10b981' : '#f59e0b'}; margin-right: 4px;"></span>
                        Alıcı Hizmet: ${deal.buyerInvoiceStatus}
                    </div>
                    <div>
                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${deal.sellerInvoiceStatus === 'Tahsil Edildi' ? '#10b981' : '#f59e0b'}; margin-right: 4px;"></span>
                        Satıcı Hizmet: ${deal.sellerInvoiceStatus}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach Click Events to Cards
    document.querySelectorAll('.deal-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-deal-id');
            openDealDetailsModal(id);
        });
    });
}

function openCreateDealModal() {
    // Portfolios options list
    const portfoliosOptions = state.portfolios
        .filter(p => p.status !== "Satıldı")
        .map(p => `<option value="${p.id}">${p.title} (${formatCurrency(p.fiyat || p.price)})</option>`)
        .join('');

    // Buyers options list
    const buyersOptions = state.customers
        .filter(c => c.type === "Alıcı")
        .map(c => `<option value="${c.id}">${c.name} (${c.searchLocation || 'Lokasyon Yok'})</option>`)
        .join('');

    // Sellers options list
    const sellersOptions = state.customers
        .filter(c => c.type === "Satıcı")
        .map(c => `<option value="${c.id}">${c.name}</option>`)
        .join('');

    const content = `
        <form id="form-create-deal" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="form-group">
                <label for="deal-portfolio-id">Satışa Konu Portföy</label>
                <select id="deal-portfolio-id" required>
                    <option value="">Seçiniz...</option>
                    ${portfoliosOptions}
                </select>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                    <label for="deal-buyer-id">Alıcı Müşteri</label>
                    <select id="deal-buyer-id" required>
                        <option value="">Seçiniz...</option>
                        ${buyersOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="deal-seller-id">Satıcı Müşteri</label>
                    <select id="deal-seller-id" required>
                        <option value="">Seçiniz...</option>
                        ${sellersOptions}
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="deal-agreed-price">Anlaşılan Satış Bedeli (TL)</label>
                <input type="number" id="deal-agreed-price" required placeholder="Örn: 12000000">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                <button type="button" class="btn btn-secondary" id="btn-cancel-deal">İptal</button>
                <button type="submit" class="btn btn-primary">Süreci Başlat</button>
            </div>
        </form>
    `;

    openModal("Yeni Satış Süreci Başlat", content);

    // Cancel Button Action
    document.getElementById('btn-cancel-deal').addEventListener('click', closeModal);

    // Handle Form Submit
    const form = document.getElementById('form-create-deal');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pId = document.getElementById('deal-portfolio-id').value;
        const buyerId = document.getElementById('deal-buyer-id').value;
        const sellerId = document.getElementById('deal-seller-id').value;
        const agreedPrice = Number(document.getElementById('deal-agreed-price').value);

        const portfolio = state.portfolios.find(p => p.id === pId);
        const buyer = state.customers.find(c => c.id === buyerId);
        const seller = state.customers.find(c => c.id === sellerId);

        if (!portfolio || !buyer || !seller) {
            showToast("Lütfen tüm alanları doğru seçiniz.", "error");
            return;
        }

        const newDeal = {
            portfolioId: pId,
            portfolioTitle: portfolio.title,
            buyerId: buyerId,
            buyerName: buyer.name,
            sellerId: sellerId,
            sellerName: seller.name,
            agreedPrice: agreedPrice,
            buyerInvoiceStatus: "Bekliyor",
            sellerInvoiceStatus: "Bekliyor",
            checklist: [
                { id: "ipotekSerh", name: "İpotek/Şerh Kontrolü", completed: false, completedAt: null, completedBy: null },
                { id: "intikalMiras", name: "İntikal/Miras Durumu", completed: false, completedAt: null, completedBy: null },
                { id: "vekaletname", name: "Vekaletname Kontrolü", completed: false, completedAt: null, completedBy: null },
                { id: "rayicBedel", name: "Belediye Rayiç Bedeli", completed: false, completedAt: null, completedBy: null },
                { id: "vergiBorcu", name: "Emlak Vergisi Borcu", completed: false, completedAt: null, completedBy: null },
                { id: "webTapu", name: "WebTapu Başvurusu", completed: false, completedAt: null, completedBy: null },
                { id: "tapuHarclari", name: "Tapu Harçları", completed: false, completedAt: null, completedBy: null },
                { id: "blokeCek", name: "Bloke Çek / Güvenli Ödeme", completed: false, completedAt: null, completedBy: null }
            ]
        };

        try {
            await addRecord("deals", newDeal);
            
            // Log process started on timelines
            await logDealEventToTimelines(
                newDeal, 
                "Satış Süreci Başlatıldı", 
                `"${portfolio.title}" gayrimenkulü için ${formatCurrency(agreedPrice)} bedel üzerinden resmi satış/tapu süreci başlatıldı. (Danışman: ${state.currentUser.displayName})`,
                "Süreç"
            );

            // Mark portfolio as Reserved/Rezerve
            await updateRecord("portfolios", pId, { status: "Rezerve" });

            showToast("Satış süreci başarıyla başlatıldı ve portföy rezerve edildi.", "success");
            closeModal();
            renderDealsView(document.getElementById('app-view'));
        } catch (err) {
            showToast("Hata: " + err.message, "error");
        }
    });
}

function openDealDetailsModal(dealId) {
    const deal = state.deals.find(d => d.id === dealId);
    if (!deal) return;

    renderDealDetailsModalContent(deal);
}

function renderDealDetailsModalContent(deal) {
    const totalItems = deal.checklist.length;
    const completedItems = deal.checklist.filter(item => item.completed).length;
    const percentage = Math.round((completedItems / totalItems) * 100);

    const buyerFee = deal.agreedPrice * 0.02;
    const sellerFee = deal.agreedPrice * 0.02;

    const checklistHtml = deal.checklist.map((item, index) => {
        return `
            <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                <input type="checkbox" id="chk-${item.id}" ${item.completed ? 'checked' : ''} style="margin-top: 4px; cursor: pointer; accent-color: #ea580c;">
                <div style="flex-grow: 1;">
                    <label for="chk-${item.id}" style="font-size: 13px; font-weight: 500; cursor: pointer; color: ${item.completed ? 'var(--text-muted)' : 'var(--text-primary)'}; text-decoration: ${item.completed ? 'line-through' : 'none'};">
                        ${item.name}
                    </label>
                    ${item.completed ? `
                        <span style="display: block; font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                            ✔️ Onaylandı: ${new Date(item.completedAt).toLocaleDateString('tr-TR')} - ${item.completedBy}
                        </span>
                    ` : `
                        <span style="display: block; font-size: 10px; color: var(--text-muted); margin-top: 2px;">Onay bekliyor</span>
                    `}
                </div>
            </div>
        `;
    }).join('');

    const content = `
        <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 24px;">
            <!-- Left Column: Checklist -->
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h4 style="font-family:'Outfit', sans-serif; font-size: 16px; font-weight: 600;">Süreç Kontrol Listesi</h4>
                    <span style="font-size: 12px; color:#ea580c; font-weight: 600;">%${percentage} Tamamlandı</span>
                </div>
                <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 16px; max-height: 400px; overflow-y: auto;">
                    ${checklistHtml}
                </div>
            </div>
            
            <!-- Right Column: Financial Panel & Details -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 16px;">
                    <h4 style="font-family:'Outfit', sans-serif; font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Süreç Detayları</h4>
                    <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
                        <div>
                            <span style="color: var(--text-muted);">Alıcı:</span> <span style="font-weight:500;">${deal.buyerName}</span>
                        </div>
                        <div>
                            <span style="color: var(--text-muted);">Satıcı:</span> <span style="font-weight:500;">${deal.sellerName}</span>
                        </div>
                        <div>
                            <span style="color: var(--text-muted);">Gayrimenkul:</span> <span style="font-weight:500;">${deal.portfolioTitle}</span>
                        </div>
                        <div>
                            <span style="color: var(--text-muted);">Anlaşılan Fiyat:</span> <span style="font-weight:600; color: #ea580c;">${formatCurrency(deal.agreedPrice)}</span>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 16px;">
                    <h4 style="font-family:'Outfit', sans-serif; font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Finansal Hak Ediş Bedelleri</h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 14px; font-size: 12px;">
                        <!-- Buyer Commission -->
                        <div style="border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-weight:500;">Alıcı Hizmet Bedeli (%2):</span>
                                <span style="font-weight: 600; color: var(--secondary);">${formatCurrency(buyerFee)}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="color: var(--text-muted); font-size: 11px;">Fatura Durumu:</span>
                                <select id="sel-buyer-invoice" style="font-size: 11px; padding: 4px; border-radius: 4px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <option value="Bekliyor" ${deal.buyerInvoiceStatus === 'Bekliyor' ? 'selected' : ''}>Bekliyor</option>
                                    <option value="Tahsil Edildi" ${deal.buyerInvoiceStatus === 'Tahsil Edildi' ? 'selected' : ''}>Tahsil Edildi</option>
                                </select>
                            </div>
                        </div>

                        <!-- Seller Commission -->
                        <div style="border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-weight:500;">Satıcı Hizmet Bedeli (%2):</span>
                                <span style="font-weight: 600; color: var(--secondary);">${formatCurrency(sellerFee)}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="color: var(--text-muted); font-size: 11px;">Fatura Durumu:</span>
                                <select id="sel-seller-invoice" style="font-size: 11px; padding: 4px; border-radius: 4px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: var(--text-primary);">
                                    <option value="Bekliyor" ${deal.sellerInvoiceStatus === 'Bekliyor' ? 'selected' : ''}>Bekliyor</option>
                                    <option value="Tahsil Edildi" ${deal.sellerInvoiceStatus === 'Tahsil Edildi' ? 'selected' : ''}>Tahsil Edildi</option>
                                </select>
                            </div>
                        </div>

                        <!-- Total Commission -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 4px;">
                            <span style="font-weight: 700;">Toplam Hizmet Bedeli:</span>
                            <span style="font-weight: 800; font-size: 14px; color: #10b981;">${formatCurrency(buyerFee + sellerFee)}</span>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; gap: 12px;">
                    <button id="btn-delete-deal" class="btn btn-danger btn-sm" style="flex-grow: 1;">Süreci Sil / İptal Et</button>
                    <button id="btn-close-details" class="btn btn-secondary btn-sm">Kapat</button>
                </div>
            </div>
        </div>
    `;

    openModal("Süreç Kontrol & Finans Paneli", content);

    // Attach Checkbox listeners
    deal.checklist.forEach((item, index) => {
        const chk = document.getElementById(`chk-${item.id}`);
        if (chk) {
            chk.addEventListener('change', async (e) => {
                const checked = e.target.checked;
                
                // Update item properties
                deal.checklist[index].completed = checked;
                deal.checklist[index].completedAt = checked ? new Date().toISOString() : null;
                deal.checklist[index].completedBy = checked ? state.currentUser.displayName : null;

                try {
                    await updateRecord("deals", deal.id, { checklist: deal.checklist });
                    
                    // Log event to customer timelines
                    await logDealEventToTimelines(
                        deal,
                        `Süreç Onayı: ${item.name}`,
                        `"${deal.portfolioTitle}" gayrimenkulünün satışı sürecinde "${item.name}" adımı ${checked ? 'ONAYLANDI' : 'IPTAL EDILDI'}. (İşlem: ${state.currentUser.displayName})`,
                        "Süreç"
                    );

                    // If all 8 items are completed, auto mark portfolio as Satıldı
                    const allDone = deal.checklist.every(item => item.completed);
                    if (allDone) {
                        await updateRecord("portfolios", deal.portfolioId, { status: "Satıldı" });
                        showToast("Tüm süreç adımları tamamlandı! Portföy durumu 'Satıldı' olarak güncellendi.", "success");
                    }

                    showToast(`"${item.name}" adımı güncellendi.`, "success");
                    
                    // Re-render modal to show updated checklists and logs
                    renderDealDetailsModalContent(deal);
                    
                    // Refresh main view
                    renderDealsView(document.getElementById('app-view'));
                } catch (err) {
                    showToast("Hata: " + err.message, "error");
                }
            });
        }
    });

    // Attach Invoice Dropdown Listeners
    const selBuyer = document.getElementById('sel-buyer-invoice');
    if (selBuyer) {
        selBuyer.addEventListener('change', async (e) => {
            const val = e.target.value;
            try {
                await updateRecord("deals", deal.id, { buyerInvoiceStatus: val });
                deal.buyerInvoiceStatus = val;

                await logDealEventToTimelines(
                    deal,
                    `Finansal Güncelleme: Alıcı Komisyonu`,
                    `Alıcı (${deal.buyerName}) hizmet bedeli tahsilat durumu '${val}' olarak güncellendi. (Tutar: ${formatCurrency(buyerFee)}, İşlem: ${state.currentUser.displayName})`,
                    "Finans"
                );

                showToast("Alıcı hizmet bedeli durumu güncellendi.", "success");
                renderDealDetailsModalContent(deal);
                renderDealsView(document.getElementById('app-view'));
            } catch (err) {
                showToast("Hata: " + err.message, "error");
            }
        });
    }

    const selSeller = document.getElementById('sel-seller-invoice');
    if (selSeller) {
        selSeller.addEventListener('change', async (e) => {
            const val = e.target.value;
            try {
                await updateRecord("deals", deal.id, { sellerInvoiceStatus: val });
                deal.sellerInvoiceStatus = val;

                await logDealEventToTimelines(
                    deal,
                    `Finansal Güncelleme: Satıcı Komisyonu`,
                    `Satıcı (${deal.sellerName}) hizmet bedeli tahsilat durumu '${val}' olarak güncellendi. (Tutar: ${formatCurrency(sellerFee)}, İşlem: ${state.currentUser.displayName})`,
                    "Finans"
                );

                showToast("Satıcı hizmet bedeli durumu güncellendi.", "success");
                renderDealDetailsModalContent(deal);
                renderDealsView(document.getElementById('app-view'));
            } catch (err) {
                showToast("Hata: " + err.message, "error");
            }
        });
    }

    // Attach Close Button listener
    document.getElementById('btn-close-details').addEventListener('click', closeModal);

    // Attach Delete Button listener
    document.getElementById('btn-delete-deal').addEventListener('click', async () => {
        if (confirm("Bu satış/tapu sürecini silmek istediğinize emin misiniz? Portföy durumu aktif hale getirilecektir.")) {
            try {
                // Delete deal record
                await deleteRecord("deals", deal.id);
                
                // Return portfolio status back to "Aktif"
                await updateRecord("portfolios", deal.portfolioId, { status: "Aktif" });

                // Log deletion on customer timelines
                await logDealEventToTimelines(
                    deal,
                    "Satış Süreci İptal Edildi",
                    `"${deal.portfolioTitle}" gayrimenkulü satış süreci iptal edildi ve silindi. (İşlem: ${state.currentUser.displayName})`,
                    "Süreç"
                );

                showToast("Satış süreci silindi ve portföy tekrar aktife alındı.", "info");
                closeModal();
                renderDealsView(document.getElementById('app-view'));
            } catch (err) {
                showToast("Süreç silinemedi: " + err.message, "error");
            }
        }
    });
}
