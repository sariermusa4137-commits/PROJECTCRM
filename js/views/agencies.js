// PROJECTCRM - Acente Yönetimi Görünümü (Agencies View)

import { apiFetch } from '../store.js';
import { showToast, openModal, closeModal } from '../components/ui.js';

export async function updateAgenciesTable(container) {
    const tableBody = container.querySelector('#agencies-table-body');
    if (!tableBody) return;

    try {
        const res = await apiFetch('/api/agencies');
        if (!res.ok) {
            throw new Error("Acente listesi alınamadı.");
        }
        const agencies = await res.json();

        if (agencies.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        Kayıtlı acente bulunamadı.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = agencies.map(agency => {
            const dateStr = agency.created_at ? new Date(agency.created_at).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '-';

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="font-size: 24px;">🏢</div>
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary); font-size: 13px;">${agency.name}</div>
                                <div style="font-size: 11px; color: var(--text-muted);">Kurucu ID: ${agency.created_by || '-'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 4px 10px; border-radius: var(--border-radius-sm);">
                            <code style="font-family: monospace; font-size: 13px; font-weight: 700; color: var(--primary-color); letter-spacing: 0.5px;">${agency.agency_code}</code>
                            <button class="btn-copy-code" data-code="${agency.agency_code}" style="background: none; border: none; padding: 0; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; transition: color var(--transition-fast);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                    </td>
                    <td>
                        <span style="background: rgba(45, 212, 191, 0.15); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.3); font-weight: 600; padding: 4px 10px; border-radius: 20px; font-size: 11px; display: inline-block;">
                            ${agency.agent_count} Danışman
                        </span>
                    </td>
                    <td>
                        <span style="background: rgba(234, 88, 12, 0.15); color: #f97316; border: 1px solid rgba(234, 88, 12, 0.3); font-weight: 600; padding: 4px 10px; border-radius: 20px; font-size: 11px; display: inline-block;">
                            ${agency.portfolio_count} Aktif İlan
                        </span>
                    </td>
                    <td style="font-size: 13px; color: var(--text-secondary);">${dateStr}</td>
                    <td>
                        <button class="btn btn-secondary btn-manage-agents" data-id="${agency.id}" data-name="${agency.name}" data-code="${agency.agency_code}" style="font-size: 11px; padding: 6px 12px; font-weight: 600;">
                            Danışmanları Yönet
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach event listeners for copy button
        const copyBtns = container.querySelectorAll('.btn-copy-code');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                navigator.clipboard.writeText(code).then(() => {
                    showToast("Acente katılım kodu kopyalandı!", "success");
                });
            });
        });

        // Attach event listeners for Danışmanları Yönet button
        const manageBtns = container.querySelectorAll('.btn-manage-agents');
        manageBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const agencyId = parseInt(btn.getAttribute('data-id'));
                const agencyName = btn.getAttribute('data-name');
                
                try {
                    showToast("Kullanıcı listesi yükleniyor...", "info");
                    const usersRes = await apiFetch('/api/users');
                    if (!usersRes.ok) {
                        throw new Error("Kullanıcı listesi yüklenemedi.");
                    }
                    const users = await usersRes.json();
                    
                    // Filter out admins (only display advisors/assistants) if preferred,
                    // but displaying all users is fine.
                    const userChecklistHtml = users.map(user => {
                        const isChecked = user.agency_id === agencyId;
                        const userOffice = user.agencyName ? `🏢 ${user.agencyName}` : 'Bireysel';
                        
                        return `
                            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); cursor: pointer; transition: all var(--transition-fast); margin-bottom: 4px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="checkbox" class="user-assign-checkbox" data-uid="${user.uid}" ${isChecked ? 'checked' : ''} style="accent-color: var(--primary-color); width: 16px; height: 16px; cursor: pointer;">
                                    <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">
                                        ${user.displayName || (user.firstName + ' ' + user.lastName)} (${user.role === 'admin' ? 'Admin' : user.role === 'assistant' ? 'Asistan' : 'Danışman'})
                                    </span>
                                </div>
                                <span style="font-size: 11px; color: ${isChecked ? '#2dd4bf' : 'var(--text-muted)'}; font-weight: 600;">
                                    ${isChecked ? 'Bu Acentede' : userOffice}
                                </span>
                            </label>
                        `;
                    }).join('');
                    
                    const modalContent = `
                        <div style="display: flex; flex-direction: column; gap: 16px; max-height: 450px; overflow-y: auto; padding-right: 4px;">
                            <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 8px 0; line-height: 1.5;">
                                Bu acenteye atamak istediğiniz danışmanları işaretleyin. İşareti kaldırılan kullanıcılar acenteden çıkarılarak <strong>Bireysel</strong> alana taşınacaktır.
                            </p>
                            <div style="display: flex; flex-direction: column; gap: 4px;" id="assign-users-list-container">
                                ${userChecklistHtml}
                            </div>
                            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;">
                                <button type="button" class="btn btn-secondary" id="btn-close-assign-modal" style="font-size: 13px; padding: 10px 18px;">İptal</button>
                                <button type="button" class="btn btn-primary" id="btn-save-assign" style="font-size: 13px; padding: 10px 18px; font-weight: 600;">Değişiklikleri Kaydet</button>
                            </div>
                        </div>
                    `;
                    
                    openModal(`Danışman Yönetimi: ${agencyName}`, modalContent);
                    
                    const btnClose = document.getElementById('btn-close-assign-modal');
                    if (btnClose) {
                        btnClose.addEventListener('click', closeModal);
                    }
                    
                    const btnSave = document.getElementById('btn-save-assign');
                    if (btnSave) {
                        btnSave.addEventListener('click', async () => {
                            try {
                                btnSave.disabled = true;
                                btnSave.textContent = "Kaydediliyor...";
                                
                                const checkedBoxes = document.querySelectorAll('.user-assign-checkbox:checked');
                                const userIds = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-uid'));
                                
                                const assignRes = await apiFetch('/api/admin/assign-user-to-agency', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ agencyId, userIds })
                                });
                                
                                if (!assignRes.ok) {
                                    const err = await assignRes.json();
                                    throw new Error(err.error || "Danışmanlar atanamadı.");
                                }
                                
                                showToast("Danışman atamaları başarıyla güncellendi.", "success");
                                closeModal();
                                await updateAgenciesTable(container);
                            } catch (error) {
                                console.error(error);
                                showToast(error.message, "error");
                                btnSave.disabled = false;
                                btnSave.textContent = "Değişiklikleri Kaydet";
                            }
                        });
                    }
                } catch (err) {
                    console.error(err);
                    showToast(err.message, "error");
                }
            });
        });

    } catch (err) {
        console.error(err);
        showToast("Acenteler yüklenirken hata oluştu.", "error");
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    Yükleme başarısız.
                </td>
            </tr>
        `;
    }
}

export async function renderAgenciesView(container) {
    container.innerHTML = `
        <div class="view-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <h2 style="font-family:'Outfit', sans-serif; font-weight:700; font-size:24px; margin:0;">Acente Yönetimi</h2>
                <p style="color:var(--text-secondary); font-size:13px; margin:0;">CRM sistemindeki tüm acenteleri izleyin, katılım kodlarını yönetin ve istatistikleri görüntüleyin.</p>
            </div>
            <button id="btn-create-agency" class="btn btn-primary" style="font-size:13px; font-weight:600; padding:10px 20px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Yeni Acente Ekle
            </button>
        </div>

        <div class="card" style="padding: 24px;">
            <div class="table-responsive">
                <table class="crm-table">
                    <thead>
                        <tr>
                            <th>Acente Adı</th>
                            <th>Katılım Kodu</th>
                            <th>Üye Sayısı</th>
                            <th>Aktif Portföy</th>
                            <th>Kuruluş Tarihi</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="agencies-table-body">
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                                Yükleniyor...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Add agency click handler
    const btnCreateAgency = container.querySelector('#btn-create-agency');
    if (btnCreateAgency) {
        btnCreateAgency.addEventListener('click', () => {
            const modalContent = `
                <form id="create-agency-modal-form" style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label for="agency-name-input" style="font-size: 13px; color: var(--text-primary); font-weight: 500;">Acente Adı</label>
                        <input type="text" id="agency-name-input" placeholder="Örn: Sarier Gayrimenkul Beşiktaş" required style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 10px 14px; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color var(--transition-fast);">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                        <button type="button" class="btn btn-secondary" id="btn-close-agency-modal" style="font-size: 13px; padding: 10px 18px;">İptal</button>
                        <button type="submit" class="btn btn-primary" style="font-size: 13px; padding: 10px 18px;">Oluştur</button>
                    </div>
                </form>
            `;

            openModal("Yeni Acente Ekle", modalContent);

            const form = document.getElementById('create-agency-modal-form');
            const btnClose = document.getElementById('btn-close-agency-modal');

            if (btnClose) {
                btnClose.addEventListener('click', closeModal);
            }

            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const name = document.getElementById('agency-name-input').value.trim();
                    if (!name) return;

                    try {
                        showToast("Acente oluşturuluyor...", "info");
                        const res = await apiFetch('/api/agency/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: localStorage.getItem("projectcrm_user_id"), name })
                        });

                        if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || "Acente oluşturulamadı.");
                        }

                        showToast("Acente başarıyla oluşturuldu.", "success");
                        closeModal();
                        await updateAgenciesTable(container);
                    } catch (err) {
                        console.error(err);
                        showToast(err.message, "error");
                    }
                });
            }
        });
    }

    await updateAgenciesTable(container);
}
