// Gayrimenkul CRM - Müşteri Yönetimi, Zaman Tüneli ve Eşleştirme Görünümü

import { state, addRecord, updateRecord, deleteRecord, getMatchesForCustomer, canViewPhone, maskPhoneNumber, apiFetch } from '../store.js';
import { openModal, closeModal, showToast } from '../components/ui.js';

let activeTab = 'all'; // all, buyer, seller

export function renderCustomersView(container) {
    if (container.querySelector('#customer-table-body')) {
        updateCustomerTable();
        return;
    }
    container.innerHTML = `
        <div class="view-header">
            <div>
                <h2>Müşteri Havuzu</h2>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">Alıcı ve satıcı müşteri portföyünüzü buradan yönetin.</p>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <button id="btn-export-excel" class="btn btn-excel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-md"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h8M8 9h1"/></svg>
                    Excel Olarak İndir
                </button>
                <button id="btn-add-customer" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Yeni Müşteri Ekle
                </button>
            </div>
        </div>
        
        <!-- Tab Navigation -->
        <div class="tabs">
            <button class="tab-btn ${activeTab === 'all' ? 'active' : ''}" data-tab="all">Tüm Müşteriler</button>
            <button class="tab-btn ${activeTab === 'buyer' ? 'active' : ''}" data-tab="buyer">Alıcılar (Arayışta Olanlar)</button>
            <button class="tab-btn ${activeTab === 'seller' ? 'active' : ''}" data-tab="seller">Satıcılar (Mülk Sahipleri)</button>
        </div>
        
        <!-- Filter Bar -->
        <div class="card filter-bar customer-filter-card" style="margin-bottom: 20px; padding: 16px;">
            <div class="customer-filter-container">
                <!-- Search Box -->
                <div class="form-group customer-filter-group">
                    <label for="filter-search" style="font-size: 11px; margin-bottom: 6px; color: var(--text-secondary); display: block; font-weight: 600;">Müşteri İsim / Tel</label>
                    <input type="text" id="filter-search" placeholder="İsim, soyisim veya telefon..." class="customer-filter-control">
                </div>
                <!-- Talep Tipi (Status Preference) -->
                <div class="form-group customer-filter-group">
                    <label for="filter-status-pref" style="font-size: 11px; margin-bottom: 6px; color: var(--text-secondary); display: block; font-weight: 600;">Talep Tipi (Alıcı)</label>
                    <select id="filter-status-pref" class="customer-filter-control">
                        <option value="All">Hepsi</option>
                        <option value="Satılık">Satılık</option>
                        <option value="Kiralık">Kiralık</option>
                        <option value="Hem Satılık Hem Kiralık">Hem Satılık Hem Kiralık</option>
                    </select>
                </div>
                <!-- Mülk Tipi (Search Property Type) -->
                <div class="form-group customer-filter-group">
                    <label for="filter-prop-type" style="font-size: 11px; margin-bottom: 6px; color: var(--text-secondary); display: block; font-weight: 600;">Mülk Tipi (Alıcı)</label>
                    <select id="filter-prop-type" class="customer-filter-control">
                        <option value="All">Hepsi</option>
                        <option value="Daire">Daire</option>
                        <option value="Villa">Villa</option>
                        <option value="Arsa">Arsa</option>
                        <option value="Ticari">Ticari</option>
                    </select>
                </div>
                <!-- Budget Min -->
                <div class="form-group customer-filter-group">
                    <label for="filter-budget-min" style="font-size: 11px; margin-bottom: 6px; color: var(--text-secondary); display: block; font-weight: 600;">Min Bütçe (TL)</label>
                    <input type="number" id="filter-budget-min" placeholder="Min TL" class="customer-filter-control">
                </div>
                <!-- Budget Max -->
                <div class="form-group customer-filter-group">
                    <label for="filter-budget-max" style="font-size: 11px; margin-bottom: 6px; color: var(--text-secondary); display: block; font-weight: 600;">Max Bütçe (TL)</label>
                    <input type="number" id="filter-budget-max" placeholder="Max TL" class="customer-filter-control">
                </div>
            </div>
        </div>
        
        <!-- Customer Table -->
        <div class="card" style="padding:0; overflow:hidden;">
            <div class="table-responsive">
                <table class="crm-table">
                    <thead>
                        <tr>
                            <th>Müşteri Adı</th>
                            <th>Telefon</th>
                            <th>Müşteri Tipi</th>
                            <th>Durum</th>
                            <th>Bütçe</th>
                            <th>Arayış / Kriterler</th>
                            <th>Sorumlu Danışman</th>
                        </tr>
                    </thead>
                    <tbody id="customer-table-body">
                        <!-- Dynamic Rows -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    updateCustomerTable();
    
    // Bind Filter Panel Listeners
    const filterSearch = document.getElementById('filter-search');
    const filterStatusPref = document.getElementById('filter-status-pref');
    const filterPropType = document.getElementById('filter-prop-type');
    const filterBudgetMin = document.getElementById('filter-budget-min');
    const filterBudgetMax = document.getElementById('filter-budget-max');

    const handleFilterInput = () => {
        updateCustomerTable();
    };

    if (filterSearch) filterSearch.addEventListener('input', handleFilterInput);
    if (filterStatusPref) filterStatusPref.addEventListener('change', handleFilterInput);
    if (filterPropType) filterPropType.addEventListener('change', handleFilterInput);
    if (filterBudgetMin) filterBudgetMin.addEventListener('input', handleFilterInput);
    if (filterBudgetMax) filterBudgetMax.addEventListener('input', handleFilterInput);
    
    // Tab event listeners
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            updateCustomerTable();
        });
    });
    
    // Add Excel Export Button click
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

    // Add Customer Button click
    document.getElementById('btn-add-customer').addEventListener('click', () => {
        openAddCustomerModal();
    });
}

function getStatusLabel(status) {
    const labels = {
        'aktif': 'Aktif',
        'askiya_alindi': 'Askıya Alındı',
        'vazgecti': 'Vazgeçti',
        'tamamlandi': 'Tamamlandı'
    };
    return labels[(status || 'aktif').toLowerCase()] || (status || 'Aktif');
}

function updateCustomerTable() {
    const tableBody = document.getElementById('customer-table-body');
    if (!tableBody) return;
    
    // Get filter element values
    const filterSearch = document.getElementById('filter-search');
    const filterStatusPref = document.getElementById('filter-status-pref');
    const filterPropType = document.getElementById('filter-prop-type');
    const filterBudgetMin = document.getElementById('filter-budget-min');
    const filterBudgetMax = document.getElementById('filter-budget-max');
    
    const query = filterSearch ? filterSearch.value.trim().toLowerCase() : '';
    const statusPref = filterStatusPref ? filterStatusPref.value : 'All';
    const propType = filterPropType ? filterPropType.value : 'All';
    
    const minBudget = (filterBudgetMin && filterBudgetMin.value) ? parseFloat(filterBudgetMin.value) : null;
    const maxBudget = (filterBudgetMax && filterBudgetMax.value) ? parseFloat(filterBudgetMax.value) : null;
    
    // Filter customers
    const filtered = state.customers.filter(c => {
        // Tab filtering
        if (activeTab === 'buyer' && c.type !== 'Alıcı') return false;
        if (activeTab === 'seller' && c.type !== 'Satıcı') return false;
        
        // Search filter (name, phone, email)
        if (query) {
            const nameMatch = c.name ? c.name.toLowerCase().includes(query) : false;
            const phoneMatch = c.phone ? c.phone.toLowerCase().includes(query) : false;
            const emailMatch = c.email ? c.email.toLowerCase().includes(query) : false;
            if (!nameMatch && !phoneMatch && !emailMatch) return false;
        }
        
        // Status Preference (Talep Tipi) filter
        if (statusPref !== 'All') {
            const pref = c.status_preference || '';
            if (statusPref === 'Satılık') {
                if (pref !== 'Satılık' && pref !== 'Hem Satılık Hem Kiralık') return false;
            } else if (statusPref === 'Kiralık') {
                if (pref !== 'Kiralık' && pref !== 'Hem Satılık Hem Kiralık') return false;
            } else if (statusPref === 'Hem Satılık Hem Kiralık') {
                if (pref !== 'Hem Satılık Hem Kiralık') return false;
            }
        }
        
        // Property Type (Mülk Tipi) filter
        if (propType !== 'All') {
            const type = c.searchPropertyType || '';
            if (type !== propType) return false;
        }
        
        // Budget filters
        const budget = parseFloat(c.budget) || 0;
        if (minBudget !== null && budget < minBudget) return false;
        if (maxBudget !== null && budget > maxBudget) return false;
        
        return true;
    });
    
    if (filtered.length === 0) {
        const isFilterActive = query || statusPref !== 'All' || propType !== 'All' || minBudget !== null || maxBudget !== null;
        const emptyMessage = isFilterActive 
            ? "Arama kriterlerine uygun müşteri bulunamadı." 
            : "Kayıtlı müşteri bulunmamaktadır.";
            
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                    ${emptyMessage}
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = filtered.map(c => {
        const formatBudget = c.budget ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(c.budget) : "-";
        
        let criteria = "-";
        if (c.type === 'Alıcı') {
            criteria = `${c.searchPropertyType || ''} | ${c.searchRooms || ''} | ${c.searchLocation || ''}`;
        } else {
            criteria = "Mülk Satış/Kiralama Talebi";
        }
        
        const displayPhone = canViewPhone(c) ? c.phone : maskPhoneNumber(c.phone) + ' <span style="font-size:10px;" title="Diğer danışmanların müşteri numaralarını göremezsiniz.">🔒</span>';
        
        return `
            <tr class="customer-row" data-id="${c.id}">
                <td style="font-weight:600;">${c.name}</td>
                <td>${displayPhone}</td>
                <td>
                    <span class="portfolio-type-badge ${c.type === 'Alıcı' ? 'satilik' : 'kiralik'}">
                        ${c.type}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${(c.status || 'aktif').toLowerCase()}">
                        ${getStatusLabel(c.status)}
                    </span>
                </td>
                <td style="color:var(--secondary); font-weight:600;">${formatBudget}</td>
                <td style="font-size:12px; color:var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${criteria}</td>
                <td style="font-size:12px;">${c.createdByName || 'Atanmamış'}</td>
            </tr>
        `;
    }).join('');
    
    // Add Click Listeners to Rows
    const rows = document.querySelectorAll('.customer-row');
    rows.forEach(row => {
        row.addEventListener('click', () => {
            const id = row.dataset.id;
            const client = state.customers.find(c => c.id === id);
            if (client) {
                openCustomerDetailModal(client);
            }
        });
    });
}

// Update Lifecycle Stage
async function updateLifecycleStage(c, newStage) {
    if (c.lifecycle_stage === newStage) return;
    const userName = state.currentUser ? (state.currentUser.displayName || 'Danışman') : 'Danışman';
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    try {
        await updateRecord('customers', c.id, {
            ...c,
            lifecycle_stage: newStage
        });
        
        await addRecord('meetings', {
            customerId: c.id,
            customerName: c.name,
            title: "Aşama Güncellendi",
            type: "Sistem",
            date: todayStr,
            time: nowTimeStr,
            notes: `${userName}, müşteri yaşam döngüsü aşamasını '${newStage}' olarak güncelledi.`,
            kanbanStage: newStage
        });
        
        showToast(`Müşteri aşaması '${newStage}' olarak güncellendi.`, "success");
        closeModal();
        const freshClient = state.customers.find(item => item.id === c.id);
        openCustomerDetailModal(freshClient);
    } catch (err) {
        showToast("Aşama güncellenirken hata: " + err.message, "error");
    }
}

// Render Customer Detail Modal with Timeline and Matching Portfolios
function openCustomerDetailModal(c) {
    const formattedBudget = c.budget ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(c.budget) : "-";
    const matches = getMatchesForCustomer(c);
    
    // Sort meetings chronologically (newest first)
    const clientMeetings = state.meetings
        .filter(m => m.customerId === c.id)
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
            const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
            return dateB - dateA;
        });

    const isAuthorized = canViewPhone(c);
    const displayPhone = isAuthorized ? c.phone : maskPhoneNumber(c.phone);
    const phoneHtml = isAuthorized
        ? `<a href="tel:${c.phone}" style="color:var(--text-primary); text-decoration:none; font-weight: 600;">${c.phone}</a>`
        : `<span style="color:var(--text-secondary); cursor:not-allowed;" title="Sorumlu danışman dışındaki kullanıcılar numarayı göremez.">${displayPhone} 🔒</span>`;

    // Communication actions
    const commButtonsHtml = `
        <div style="display:flex; gap:8px; margin-top:8px;">
            <a href="${isAuthorized ? 'tel:' + c.phone : '#'}" 
               class="btn btn-sm ${isAuthorized ? 'btn-outline' : 'btn-disabled'}" 
               style="padding:6px 12px; font-size:11px; display:inline-flex; align-items:center; gap:4px; text-decoration:none; color:var(--text-primary); background:rgba(255,255,255,0.02); border:1px solid var(--border-color); ${!isAuthorized ? 'opacity:0.4; cursor:not-allowed; pointer-events:none;' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm" style="width:12px; height:12px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Ara ${!isAuthorized ? '🔒' : ''}
            </a>
            <a href="${isAuthorized ? 'https://wa.me/' + c.phone.replace(/[^0-9]/g, '') : '#'}" 
               target="_blank"
               class="btn btn-sm ${isAuthorized ? 'btn-outline' : 'btn-disabled'}" 
               style="padding:6px 12px; font-size:11px; display:inline-flex; align-items:center; gap:4px; text-decoration:none; color:var(--text-primary); background:rgba(255,255,255,0.02); border:1px solid var(--border-color); ${!isAuthorized ? 'opacity:0.4; cursor:not-allowed; pointer-events:none;' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm" style="width:12px; height:12px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                WhatsApp ${!isAuthorized ? '🔒' : ''}
            </a>
        </div>
    `;

    // Lifecycle progress stepper
    const stages = ["Potansiyel", "Nitelikli", "Sıcak Takip", "Kapanışta", "Sadık Müşteri"];
    const currentStage = c.lifecycle_stage || "Potansiyel";
    const currentStageIndex = stages.indexOf(currentStage);

    const stepperHtml = `
        <div class="lifecycle-stepper-container" style="margin-bottom: 20px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 14px; border-radius: var(--border-radius-md);">
            <h4 style="margin-bottom: 12px; font-size: 13px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Müşteri Yaşam Döngüsü</h4>
            <div class="stepper-bar-wrapper" style="position: relative; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; margin-bottom: 5px; padding: 0 10px;">
                <!-- Progress Line Background -->
                <div style="position: absolute; top: 12px; left: 10px; right: 10px; height: 3px; background: rgba(255,255,255,0.1); z-index: 1;"></div>
                <!-- Active Progress Line -->
                <div style="position: absolute; top: 12px; left: 10px; width: calc(${(currentStageIndex / (stages.length - 1)) * 100}% - 20px); height: 3px; background: #ea580c; z-index: 2; transition: width 0.3s ease;"></div>
                
                ${stages.map((stage, index) => {
                    const isCompleted = index <= currentStageIndex;
                    const isActive = index === currentStageIndex;
                    return `
                        <div class="step-node" data-stage="${stage}" style="position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                            <div class="step-circle" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; transition: all 0.3s ease; 
                                background: ${isActive ? '#ea580c' : (isCompleted ? 'rgba(234, 88, 12, 0.2)' : '#10172d')}; 
                                color: ${isActive ? '#0b0f19' : (isCompleted ? '#ea580c' : 'var(--text-muted)')}; 
                                border: 2px solid ${isActive || isCompleted ? '#ea580c' : 'rgba(255,255,255,0.1)'};">
                                ${isCompleted && !isActive ? '✓' : index + 1}
                            </div>
                            <span class="step-label" style="margin-top: 6px; font-size: 10px; font-weight: ${isActive ? '600' : '500'}; 
                                color: ${isActive ? 'var(--text-primary)' : (isCompleted ? 'var(--text-secondary)' : 'var(--text-muted)')}; 
                                white-space: nowrap; text-align: center;">
                                ${stage}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    const typeIcons = {
        "Arama": "📞",
        "Yüz yüze": "🤝",
        "Ev Gösterme": "🏠",
        "Teklif": "💰",
        "Süreç": "📋",
        "Finans": "💵",
        "Sistem": "⚙️"
    };

    const typeStyles = {
        "Arama": "border-left: 3px solid #3b82f6; background: rgba(59, 130, 246, 0.03);",
        "Yüz yüze": "border-left: 3px solid #10b981; background: rgba(16, 185, 129, 0.03);",
        "Ev Gösterme": "border-left: 3px solid #a855f7; background: rgba(168, 85, 247, 0.03);",
        "Teklif": "border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.03);",
        "Süreç": "border-left: 3px solid #ea580c; background: rgba(234, 88, 12, 0.03);",
        "Finans": "border-left: 3px solid #22c55e; background: rgba(34, 197, 94, 0.03);",
        "Sistem": "border-left: 3px solid #64748b; background: rgba(100, 116, 139, 0.03);"
    };

    const content = `
        <div class="detail-grid">
            
            <!-- Left Side: Profile info & Matching Portfolios -->
            <div>
                ${stepperHtml}
                
                <h3>Müşteri Kartı</h3>
                <div class="specs-grid" style="margin-top:12px; margin-bottom:20px;">
                    <div class="spec-entry">
                        <span class="spec-entry-label">Telefon</span>
                        <span class="spec-entry-value">${phoneHtml}</span>
                        ${commButtonsHtml}
                    </div>
                    <div class="spec-entry">
                        <span class="spec-entry-label">E-posta</span>
                        <span class="spec-entry-value">${c.email || "-"}</span>
                    </div>
                    <div class="spec-entry">
                        <span class="spec-entry-label">Doğum Tarihi</span>
                        <span class="spec-entry-value">${c.birthDate ? formatDOB(c.birthDate) : "Belirtilmemiş"}</span>
                    </div>
                    <div class="spec-entry">
                        <span class="spec-entry-label">Müşteri Tipi</span>
                        <span class="spec-entry-value">${c.type}</span>
                    </div>
                    ${c.type === 'Alıcı' ? `
                        <div class="spec-entry">
                            <span class="spec-entry-label">Maksimum Bütçe</span>
                            <span class="spec-entry-value" style="color:var(--secondary); font-weight: 600;">${formattedBudget}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Hedef Bölge</span>
                            <span class="spec-entry-value">${c.searchLocation || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Konut Tipi</span>
                            <span class="spec-entry-value">${c.searchPropertyType || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Aranan Oda</span>
                            <span class="spec-entry-value">${c.searchRooms || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Finansman Tipi</span>
                            <span class="spec-entry-value">${c.finansman_tipi || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Satın Alma Amacı</span>
                            <span class="spec-entry-value">${c.satin_alma_amaci || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Yabancı Satış</span>
                            <span class="spec-entry-value">${c.yabanci_satis || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Aciliyet Durumu</span>
                            <span class="spec-entry-value">${c.aciliyet_durumu || "-"}</span>
                        </div>
                    ` : `
                        <div class="spec-entry">
                            <span class="spec-entry-label">Sözleşme Tipi</span>
                            <span class="spec-entry-value">${c.sozlesme_tipi || "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Sözleşme Bitiş Tarihi</span>
                            <span class="spec-entry-value">${c.sozlesme_bitis_tarihi ? formatDOB(c.sozlesme_bitis_tarihi) : "-"}</span>
                        </div>
                        <div class="spec-entry">
                            <span class="spec-entry-label">Mülk Durumu</span>
                            <span class="spec-entry-value">${c.mulk_durumu || "-"}</span>
                        </div>
                        <div class="spec-entry" style="grid-column: span 2;">
                            <span class="spec-entry-label">Tapu Durumu Notları</span>
                            <span class="spec-entry-value">${c.tapu_durumu_notlari || "-"}</span>
                        </div>
                    `}
                </div>
                
                <div style="margin-bottom:20px;">
                    <h4>Müşteri Açıklaması</h4>
                    <p style="font-size:13px; color:var(--text-secondary); line-height:1.5; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:12px; border-radius:var(--border-radius-md); margin-top:8px;">${c.notes || "Açıklama eklenmemiş."}</p>
                </div>
                
                <!-- Matching Listings (For Buyers only) -->
                ${c.type === 'Alıcı' ? `
                    <div style="border-top:1px solid var(--border-color); padding-top:16px;">
                        <h4 style="display:flex; justify-content:space-between; align-items:center;">
                            <span>Eşleşen Portföylerimiz</span>
                            <span class="kanban-column-count">${matches.length}</span>
                        </h4>
                        <div class="matches-list" style="margin-top: 10px; display:flex; flex-direction:column; gap:8px;">
                            ${matches.length === 0 ? `
                                <p style="font-size:12px; color:var(--text-muted);">Müşterinin arayış kriterlerine uyan aktif ilanımız bulunmamaktadır.</p>
                            ` : matches.map(p => `
                                <div class="match-item" style="background:rgba(99, 102, 241, 0.08); border:1px solid rgba(99, 102, 241, 0.2); padding:10px; border-radius:var(--border-radius-sm); display:flex; justify-content:space-between; align-items:center;">
                                    <div class="match-client-info" style="display:flex; flex-direction:column;">
                                        <span class="match-name" style="font-size:12px; font-weight:600; color:var(--text-primary);">${p.title}</span>
                                        <span class="match-criteria" style="font-size:10px; color:var(--text-secondary);">${p.district || p.bolge || ''}, ${p.rooms || p.oda_sayisi || ''} | ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p.price || p.fiyat)}</span>
                                    </div>
                                    <button class="btn btn-primary btn-view-p" data-id="${p.id}" style="padding:6px 12px; font-size:11px;">İlana Git</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:24px; border-top:1px solid var(--border-color); padding-top:16px;">
                    <button id="btn-edit-c" class="btn btn-outline">Profili Düzenle</button>
                    <button id="btn-delete-c" class="btn btn-danger">Müşteriyi Sil</button>
                </div>
            </div>
            
            <!-- Right Side: Interaction Timeline & Add Note Form -->
            <div>
                <h3>Görüşme Zaman Tüneli</h3>
                
                <!-- Add Quick Note Form -->
                <form id="form-add-timeline-note" style="margin-top:12px; margin-bottom:20px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:16px; border-radius:var(--border-radius-md);">
                    <div class="form-group-row" style="margin-bottom:12px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div class="form-group" style="margin-bottom:0;">
                            <label for="tn-type">Görüşme Türü</label>
                            <select id="tn-type" style="width:100%; padding:8px; border-radius:6px; background:#10172d; border:1px solid var(--border-color); color:#fff;">
                                <option value="Arama">Telefon Araması</option>
                                <option value="Yüz yüze">Ofis / Yüz Yüze</option>
                                <option value="Ev Gösterme">Ev Gösterme</option>
                                <option value="Teklif">Teklif Görüşmesi</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label for="tn-title">Konu / Başlık</label>
                            <input type="text" id="tn-title" placeholder="Görüşme başlığı..." required style="width:100%; padding:8px; border-radius:6px; background:#10172d; border:1px solid var(--border-color); color:#fff;">
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom:12px;">
                        <label for="tn-notes">Görüşme Notları</label>
                        <textarea id="tn-notes" placeholder="Konuşulan detaylar, mülk geri bildirimleri..." style="min-height:70px; width:100%; padding:8px; border-radius:6px; background:#10172d; border:1px solid var(--border-color); color:#fff;" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" style="padding:8px 16px; font-size:12px;">Notu Zaman Tüneline Ekle</button>
                </form>
                
                <!-- Timeline List -->
                <div class="timeline" id="timeline-list" style="display:flex; flex-direction:column; gap:12px; max-height:400px; overflow-y:auto; padding-right:6px;">
                    ${clientMeetings.length === 0 ? `
                        <p style="font-size:12px; color:var(--text-muted); text-align:center; padding-top:20px;">Bu müşteriye ait görüşme kaydı bulunmuyor.</p>
                    ` : clientMeetings.map(m => {
                        const icon = typeIcons[m.type] || "📝";
                        const customStyle = typeStyles[m.type] || "border-left: 3px solid var(--border-color);";
                        return `
                            <div class="timeline-event" style="padding:10px 14px; border-radius:var(--border-radius-sm); border:1px solid var(--border-color); ${customStyle}">
                                <div class="timeline-event-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <span class="timeline-title" style="font-weight:600; font-size:12px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                                        <span>${icon}</span>
                                        <span>${m.title}</span>
                                    </span>
                                    <span class="timeline-date" style="font-size:10px; color:var(--text-muted);">${formatDOB(m.date)} - ${m.time || ''}</span>
                                </div>
                                <div class="timeline-body" style="font-size:11px; color:var(--text-secondary); line-height:1.4;">${m.notes}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
        </div>
    `;
    
    openModal(c.name, content);

    // Wire up lifecycle step click handlers
    const stepNodes = document.querySelectorAll('.step-node');
    stepNodes.forEach(node => {
        node.addEventListener('click', async () => {
            const newStage = node.dataset.stage;
            await updateLifecycleStage(c, newStage);
        });
    });
    
    // Add Note form listener
    document.getElementById('form-add-timeline-note').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('tn-type').value;
        const title = document.getElementById('tn-title').value.trim();
        const notes = document.getElementById('tn-notes').value.trim();
        
        try {
            await addRecord('meetings', {
                customerId: c.id,
                customerName: c.name,
                title: title,
                type: type,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                notes: notes,
                kanbanStage: 'İlk Temas'
            });
            showToast("Görüşme notu eklendi.", "success");
            closeModal();
            // Re-open detail modal to show fresh timeline
            const freshClient = state.customers.find(item => item.id === c.id);
            openCustomerDetailModal(freshClient);
        } catch (err) {
            showToast("Not ekleme hatası: " + err.message, "error");
        }
    });
    
    // Go to matching portfolio listing
    const viewBtns = document.querySelectorAll('.match-item .btn-view-p');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pid = btn.dataset.id;
            const property = state.portfolios.find(p => p.id === pid);
            if (property) {
                closeModal();
                import('./portfolio.js').then(module => {
                    setTimeout(() => {
                        window.location.hash = "#portfolio";
                        showToast(`Seçilen ilan listelendi.`, "info");
                    }, 100);
                });
            }
        });
    });
    
    // Edit Customer
    document.getElementById('btn-edit-c').addEventListener('click', () => {
        closeModal();
        openEditCustomerModal(c);
    });
    
    // Delete Customer
    document.getElementById('btn-delete-c').addEventListener('click', async () => {
        if (confirm("Bu müşteriyi silmek istediğinize emin misiniz? Tüm geçmiş görüşmeler de etkilenecektir.")) {
            try {
                await deleteRecord('customers', c.id);
                closeModal();
                showToast("Müşteri başarıyla silindi.", "success");
                updateCustomerTable();
            } catch (err) {
                showToast("Müşteri silinirken hata: " + err.message, "error");
            }
        }
    });
}

function formatDOB(dateString) {
    if (!dateString) return "";
    try {
        const parts = dateString.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch(e) {
        return dateString;
    }
}

// Add Customer Modal Form
function openAddCustomerModal() {
    const content = `
        <form id="form-customer-add">
            <div class="form-group-row">
                <div class="form-group">
                    <label for="c-name">Müşteri Ad Soyad</label>
                    <input type="text" id="c-name" placeholder="Örn: Ayşe Korkmaz" required>
                </div>
                <div class="form-group">
                    <label for="c-phone">Telefon Numarası</label>
                    <input type="text" id="c-phone" placeholder="Örn: +90 532 555 1234" required>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="c-email">E-posta Adresi</label>
                    <input type="email" id="c-email" placeholder="Örn: name@example.com">
                </div>
                <div class="form-group">
                    <label for="c-birth">Doğum Tarihi</label>
                    <input type="date" id="c-birth">
                </div>
                <div class="form-group">
                    <label for="c-status">Müşteri Durumu</label>
                    <select id="c-status">
                        <option value="aktif">Aktif</option>
                        <option value="askiya_alindi">Askıya Alındı</option>
                        <option value="vazgecti">Vazgeçti</option>
                        <option value="tamamlandi">Tamamlandı</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="c-type">Müşteri Tipi</label>
                    <select id="c-type">
                        <option value="Alıcı">Alıcı (Arayışta)</option>
                        <option value="Satıcı">Satıcı (Mülk Sahibi)</option>
                    </select>
                </div>
                <div class="form-group" id="c-budget-group">
                    <label for="c-budget">Bütçe (TL)</label>
                    <input type="number" id="c-budget" placeholder="Bütçe girin..." value="0">
                </div>
            </div>
            
            <div class="form-group-row" id="c-prop-type-status-pref-row">
                <div class="form-group" id="c-prop-type-group">
                    <label for="c-prop-type">Aranan Emlak Tipi</label>
                    <select id="c-prop-type">
                        <option value="Daire">Daire</option>
                        <option value="Villa">Villa</option>
                        <option value="Arsa">Arsa</option>
                        <option value="Ticari">Ticari</option>
                    </select>
                </div>
                <div class="form-group" id="c-status-pref-group">
                    <label for="c-status-pref">Talep Tipi (Satılık/Kiralık)</label>
                    <select id="c-status-pref" name="status_preference">
                        <option value="Satılık">Satılık</option>
                        <option value="Kiralık">Kiralık</option>
                        <option value="Hem Satılık Hem Kiralık">Hem Satılık Hem Kiralık</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-row" id="buyer-criteria-row">
                <div class="form-group">
                    <label for="c-rooms">Aranan Oda Sayısı</label>
                    <input type="text" id="c-rooms" placeholder="Örn: 3+1, 2+1">
                </div>
                <div class="form-group">
                    <label for="c-location">Aranan Bölge / Mahalle</label>
                    <input type="text" id="c-location" placeholder="Örn: Kadıköy Göztepe, Suadiye">
                </div>
            </div>
            
            <!-- Alıcı Ek Alanları -->
            <div id="buyer-extra-fields">
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="c-finansman">Finansman Tipi</label>
                        <select id="c-finansman">
                            <option value="Nakit">Nakit</option>
                            <option value="Kredili">Kredili</option>
                            <option value="Takas">Takas</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="c-amac">Satın Alma Amacı</label>
                        <select id="c-amac">
                            <option value="Oturum">Oturum</option>
                            <option value="Yatırım">Yatırım</option>
                        </select>
                    </div>
                </div>
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="c-yabanci">Yabancı Satış</label>
                        <select id="c-yabanci">
                            <option value="Hayır">Hayır</option>
                            <option value="Evet">Evet</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="c-aciliyet">Aciliyet Durumu</label>
                        <select id="c-aciliyet">
                            <option value="Düşük">Düşük</option>
                            <option value="Orta/3 Ay">Orta / 3 Ay</option>
                            <option value="Kritik/1 Ay">Kritik / 1 Ay</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Satıcı Ek Alanları -->
            <div id="seller-extra-fields" style="display:none;">
                <div class="form-group-three">
                    <div class="form-group">
                        <label for="c-sozlesme-tipi">Sözleşme Tipi</label>
                        <select id="c-sozlesme-tipi">
                            <option value="Sözleşmesiz">Sözleşmesiz</option>
                            <option value="Tek Yetkili">Tek Yetkili</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="c-sozlesme-bitis">Sözleşme Bitiş Tarihi</label>
                        <input type="date" id="c-sozlesme-bitis">
                    </div>
                    <div class="form-group">
                        <label for="c-mulk-durumu">Mülk Durumu</label>
                        <select id="c-mulk-durumu">
                            <option value="Boş">Boş</option>
                            <option value="Kiracılı">Kiracılı</option>
                            <option value="Mülk Sahibi Oturuyor">Mülk Sahibi Oturuyor</option>
                        </select>
                    </div>
                </div>
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="c-property-sold">Mülk Satış Tarihi</label>
                        <input type="date" id="c-property-sold">
                    </div>
                    <div class="form-group">
                        <label for="c-tapu-notlari">Tapu Durumu Notları</label>
                        <textarea id="c-tapu-notlari" placeholder="İpotek, Şerh, Hisseli vb. için açıklamalar..." style="min-height:40px;"></textarea>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="c-notes">Danışman Notları / Talepler</label>
                <textarea id="c-notes" placeholder="Müşterinin özel kriterleri, taşınma aciliyeti, finansal detaylar..."></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">Müşteriyi Kaydet</button>
        </form>
    `;
    
    openModal("Yeni Müşteri Girişi", content);
    
    // Toggle buyer/seller inputs on client type change
    const typeSelect = document.getElementById('c-type');
    const criteriaRow = document.getElementById('buyer-criteria-row');
    const buyerExtra = document.getElementById('buyer-extra-fields');
    const sellerExtra = document.getElementById('seller-extra-fields');
    const budgetGroup = document.getElementById('c-budget-group');
    const propTypeRow = document.getElementById('c-prop-type-status-pref-row');
    
    typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'Satıcı') {
            criteriaRow.style.display = 'none';
            buyerExtra.style.display = 'none';
            sellerExtra.style.display = 'block';
            budgetGroup.style.display = 'none';
            propTypeRow.style.display = 'none';
        } else {
            criteriaRow.style.display = 'grid';
            buyerExtra.style.display = 'block';
            sellerExtra.style.display = 'none';
            budgetGroup.style.display = 'block';
            propTypeRow.style.display = 'grid';
        }
    });
    
    // Form Submit
    document.getElementById('form-customer-add').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.getElementById('c-type').value;
        const record = {
            name: document.getElementById('c-name').value.trim(),
            phone: document.getElementById('c-phone').value.trim(),
            email: document.getElementById('c-email').value.trim(),
            birthDate: document.getElementById('c-birth').value,
            birth_date: document.getElementById('c-birth').value,
            type: type,
            status: document.getElementById('c-status').value,
            budget: type === 'Alıcı' ? (Number(document.getElementById('c-budget').value) || 0) : 0,
            searchPropertyType: type === 'Alıcı' ? document.getElementById('c-prop-type').value : "",
            searchRooms: type === 'Alıcı' ? document.getElementById('c-rooms').value.trim() : "",
            searchLocation: type === 'Alıcı' ? document.getElementById('c-location').value.trim() : "",
            notes: document.getElementById('c-notes').value.trim(),
            lifecycle_stage: "Potansiyel",
            
            // New fields
            status_preference: type === 'Alıcı' ? document.getElementById('c-status-pref').value : "Satılık",
            finansman_tipi: type === 'Alıcı' ? document.getElementById('c-finansman').value : "",
            satin_alma_amaci: type === 'Alıcı' ? document.getElementById('c-amac').value : "",
            yabanci_satis: type === 'Alıcı' ? document.getElementById('c-yabanci').value : "",
            aciliyet_durumu: type === 'Alıcı' ? document.getElementById('c-aciliyet').value : "",
            
            sozlesme_tipi: type === 'Satıcı' ? document.getElementById('c-sozlesme-tipi').value : "",
            sozlesme_bitis_tarihi: type === 'Satıcı' ? document.getElementById('c-sozlesme-bitis').value : "",
            contract_end_date: type === 'Satıcı' ? document.getElementById('c-sozlesme-bitis').value : "",
            property_sold_date: type === 'Satıcı' ? document.getElementById('c-property-sold').value : "",
            mulk_durumu: type === 'Satıcı' ? document.getElementById('c-mulk-durumu').value : "",
            tapu_durumu_notlari: type === 'Satıcı' ? document.getElementById('c-tapu-notlari').value.trim() : ""
        };
        
        try {
            await addRecord('customers', record);
            closeModal();
            showToast("Müşteri başarıyla kaydedildi.", "success");
            updateCustomerTable();
        } catch (err) {
            showToast("Müşteri kaydedilirken hata: " + err.message, "error");
        }
    });
}

// Edit Customer Modal Form
function openEditCustomerModal(c) {
    const content = `
        <form id="form-customer-edit">
            <div class="form-group-row">
                <div class="form-group">
                    <label for="ce-name">Müşteri Ad Soyad</label>
                    <input type="text" id="ce-name" value="${c.name}" required>
                </div>
                <div class="form-group">
                    <label for="ce-phone">Telefon Numarası</label>
                    <input type="text" id="ce-phone" value="${c.phone}" required>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="ce-email">E-posta Adresi</label>
                    <input type="email" id="ce-email" value="${c.email || ''}">
                </div>
                <div class="form-group">
                    <label for="ce-birth">Doğum Tarihi</label>
                    <input type="date" id="ce-birth" value="${c.birth_date || c.birthDate || ''}">
                </div>
                <div class="form-group">
                    <label for="ce-status">Müşteri Durumu</label>
                    <select id="ce-status">
                        <option value="aktif" ${(c.status || 'aktif') === 'aktif' ? 'selected' : ''}>Aktif</option>
                        <option value="askiya_alindi" ${c.status === 'askiya_alindi' ? 'selected' : ''}>Askıya Alındı</option>
                        <option value="vazgecti" ${c.status === 'vazgecti' ? 'selected' : ''}>Vazgeçti</option>
                        <option value="tamamlandi" ${c.status === 'tamamlandi' ? 'selected' : ''}>Tamamlandı</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="ce-type">Müşteri Tipi</label>
                    <select id="ce-type">
                        <option value="Alıcı" ${c.type === 'Alıcı' ? 'selected' : ''}>Alıcı (Arayışta)</option>
                        <option value="Satıcı" ${c.type === 'Satıcı' ? 'selected' : ''}>Satıcı (Mülk Sahibi)</option>
                    </select>
                </div>
                <div class="form-group" id="ce-budget-group" style="display:${c.type === 'Satıcı' ? 'none' : 'block'};">
                    <label for="ce-budget">Bütçe (TL)</label>
                    <input type="number" id="ce-budget" value="${c.budget || 0}">
                </div>
            </div>
            
            <div class="form-group-row" id="ce-prop-type-status-pref-row" style="display:${c.type === 'Satıcı' ? 'none' : 'grid'};">
                <div class="form-group" id="ce-prop-type-group">
                    <label for="ce-prop-type">Aranan Emlak Tipi</label>
                    <select id="ce-prop-type">
                        <option value="Daire" ${c.searchPropertyType === 'Daire' ? 'selected' : ''}>Daire</option>
                        <option value="Villa" ${c.searchPropertyType === 'Villa' ? 'selected' : ''}>Villa</option>
                        <option value="Arsa" ${c.searchPropertyType === 'Arsa' ? 'selected' : ''}>Arsa</option>
                        <option value="Ticari" ${c.searchPropertyType === 'Ticari' ? 'selected' : ''}>Ticari</option>
                    </select>
                </div>
                <div class="form-group" id="ce-status-pref-group">
                    <label for="ce-status-pref">Talep Tipi (Satılık/Kiralık)</label>
                    <select id="ce-status-pref" name="status_preference">
                        <option value="Satılık" ${(c.status_preference || 'Satılık') === 'Satılık' ? 'selected' : ''}>Satılık</option>
                        <option value="Kiralık" ${c.status_preference === 'Kiralık' ? 'selected' : ''}>Kiralık</option>
                        <option value="Hem Satılık Hem Kiralık" ${c.status_preference === 'Hem Satılık Hem Kiralık' ? 'selected' : ''}>Hem Satılık Hem Kiralık</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-row" id="edit-buyer-criteria-row" style="display:${c.type === 'Satıcı' ? 'none' : 'grid'};">
                <div class="form-group">
                    <label for="ce-rooms">Aranan Oda Sayısı</label>
                    <input type="text" id="ce-rooms" value="${c.searchRooms || ''}">
                </div>
                <div class="form-group">
                    <label for="ce-location">Aranan Bölge / Mahalle</label>
                    <input type="text" id="ce-location" value="${c.searchLocation || ''}">
                </div>
            </div>
            
            <!-- Alıcı Ek Alanları -->
            <div id="edit-buyer-extra-fields" style="display:${c.type === 'Satıcı' ? 'none' : 'block'};">
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="ce-finansman">Finansman Tipi</label>
                        <select id="ce-finansman">
                            <option value="Nakit" ${c.finansman_tipi === 'Nakit' ? 'selected' : ''}>Nakit</option>
                            <option value="Kredili" ${c.finansman_tipi === 'Kredili' ? 'selected' : ''}>Kredili</option>
                            <option value="Takas" ${c.finansman_tipi === 'Takas' ? 'selected' : ''}>Takas</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="ce-amac">Satın Alma Amacı</label>
                        <select id="ce-amac">
                            <option value="Oturum" ${c.satin_alma_amaci === 'Oturum' ? 'selected' : ''}>Oturum</option>
                            <option value="Yatırım" ${c.satin_alma_amaci === 'Yatırım' ? 'selected' : ''}>Yatırım</option>
                        </select>
                    </div>
                </div>
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="ce-yabanci">Yabancı Satış</label>
                        <select id="ce-yabanci">
                            <option value="Hayır" ${c.yabanci_satis === 'Hayır' ? 'selected' : ''}>Hayır</option>
                            <option value="Evet" ${c.yabanci_satis === 'Evet' ? 'selected' : ''}>Evet</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="ce-aciliyet">Aciliyet Durumu</label>
                        <select id="ce-aciliyet">
                            <option value="Düşük" ${c.aciliyet_durumu === 'Düşük' ? 'selected' : ''}>Düşük</option>
                            <option value="Orta/3 Ay" ${c.aciliyet_durumu === 'Orta/3 Ay' ? 'selected' : ''}>Orta / 3 Ay</option>
                            <option value="Kritik/1 Ay" ${c.aciliyet_durumu === 'Kritik/1 Ay' ? 'selected' : ''}>Kritik / 1 Ay</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Satıcı Ek Alanları -->
            <div id="edit-seller-extra-fields" style="display:${c.type === 'Satıcı' ? 'block' : 'none'};">
                <div class="form-group-three">
                    <div class="form-group">
                        <label for="ce-sozlesme-tipi">Sözleşme Tipi</label>
                        <select id="ce-sozlesme-tipi">
                            <option value="Sözleşmesiz" ${c.sozlesme_tipi === 'Sözleşmesiz' ? 'selected' : ''}>Sözleşmesiz</option>
                            <option value="Tek Yetkili" ${c.sozlesme_tipi === 'Tek Yetkili' ? 'selected' : ''}>Tek Yetkili</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="ce-sozlesme-bitis">Sözleşme Bitiş Tarihi</label>
                        <input type="date" id="ce-sozlesme-bitis" value="${c.sozlesme_bitis_tarihi || ''}">
                    </div>
                    <div class="form-group">
                        <label for="ce-mulk-durumu">Mülk Durumu</label>
                        <select id="ce-mulk-durumu">
                            <option value="Boş" ${c.mulk_durumu === 'Boş' ? 'selected' : ''}>Boş</option>
                            <option value="Kiracılı" ${c.mulk_durumu === 'Kiracılı' ? 'selected' : ''}>Kiracılı</option>
                            <option value="Mülk Sahibi Oturuyor" ${c.mulk_durumu === 'Mülk Sahibi Oturuyor' ? 'selected' : ''}>Mülk Sahibi Oturuyor</option>
                        </select>
                    </div>
                </div>
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="ce-property-sold">Mülk Satış Tarihi</label>
                        <input type="date" id="ce-property-sold" value="${c.property_sold_date || ''}">
                    </div>
                    <div class="form-group">
                        <label for="ce-tapu-notlari">Tapu Durumu Notları</label>
                        <textarea id="ce-tapu-notlari" placeholder="İpotek, Şerh, Hisseli vb. için açıklamalar..." style="min-height:40px;">${c.tapu_durumu_notlari || ''}</textarea>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="ce-notes">Danışman Notları / Talepler</label>
                <textarea id="ce-notes">${c.notes || ''}</textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">Değişiklikleri Kaydet</button>
        </form>
    `;
    
    openModal("Müşteri Profili Düzenleme", content);
    
    const typeSelect = document.getElementById('ce-type');
    const criteriaRow = document.getElementById('edit-buyer-criteria-row');
    const buyerExtra = document.getElementById('edit-buyer-extra-fields');
    const sellerExtra = document.getElementById('edit-seller-extra-fields');
    const budgetGroup = document.getElementById('ce-budget-group');
    const propTypeRow = document.getElementById('ce-prop-type-status-pref-row');
    
    typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'Satıcı') {
            criteriaRow.style.display = 'none';
            buyerExtra.style.display = 'none';
            sellerExtra.style.display = 'block';
            budgetGroup.style.display = 'none';
            propTypeRow.style.display = 'none';
        } else {
            criteriaRow.style.display = 'grid';
            buyerExtra.style.display = 'block';
            sellerExtra.style.display = 'none';
            budgetGroup.style.display = 'block';
            propTypeRow.style.display = 'grid';
        }
    });
    
    // Submit Edit Form
    document.getElementById('form-customer-edit').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.getElementById('ce-type').value;
        const updated = {
            name: document.getElementById('ce-name').value.trim(),
            phone: document.getElementById('ce-phone').value.trim(),
            email: document.getElementById('ce-email').value.trim(),
            birthDate: document.getElementById('ce-birth').value,
            birth_date: document.getElementById('ce-birth').value,
            type: type,
            status: document.getElementById('ce-status').value,
            budget: type === 'Alıcı' ? (Number(document.getElementById('ce-budget').value) || 0) : 0,
            searchPropertyType: type === 'Alıcı' ? document.getElementById('ce-prop-type').value : "",
            searchRooms: type === 'Alıcı' ? document.getElementById('ce-rooms').value.trim() : "",
            searchLocation: type === 'Alıcı' ? document.getElementById('ce-location').value.trim() : "",
            notes: document.getElementById('ce-notes').value.trim(),
            lifecycle_stage: c.lifecycle_stage || "Potansiyel",
            
            // New fields
            status_preference: type === 'Alıcı' ? document.getElementById('ce-status-pref').value : "Satılık",
            finansman_tipi: type === 'Alıcı' ? document.getElementById('ce-finansman').value : "",
            satin_alma_amaci: type === 'Alıcı' ? document.getElementById('ce-amac').value : "",
            yabanci_satis: type === 'Alıcı' ? document.getElementById('ce-yabanci').value : "",
            aciliyet_durumu: type === 'Alıcı' ? document.getElementById('ce-aciliyet').value : "",
            
            sozlesme_tipi: type === 'Satıcı' ? document.getElementById('ce-sozlesme-tipi').value : "",
            sozlesme_bitis_tarihi: type === 'Satıcı' ? document.getElementById('ce-sozlesme-bitis').value : "",
            contract_end_date: type === 'Satıcı' ? document.getElementById('ce-sozlesme-bitis').value : "",
            property_sold_date: type === 'Satıcı' ? document.getElementById('ce-property-sold').value : "",
            mulk_durumu: type === 'Satıcı' ? document.getElementById('ce-mulk-durumu').value : "",
            tapu_durumu_notlari: type === 'Satıcı' ? document.getElementById('ce-tapu-notlari').value.trim() : ""
        };
        
        try {
            await updateRecord('customers', c.id, updated);
            closeModal();
            showToast("Müşteri bilgileri güncellendi.", "success");
            updateCustomerTable();
        } catch (err) {
            showToast("Güncelleme hatası: " + err.message, "error");
        }
    });
}

