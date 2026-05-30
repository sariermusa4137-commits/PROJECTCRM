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
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
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
                            <button class="btn-copy-code" data-code="${agency.agency_code}" style="background: none; border: none; padding: 0; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; hover: { color: var(--text-primary) }">
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

    } catch (err) {
        console.error(err);
        showToast("Acenteler yüklenirken hata oluştu.", "error");
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
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
                        </tr>
                    </thead>
                    <tbody id="agencies-table-body">
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
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
                        const activeUser = JSON.parse(localStorage.getItem("projectcrm_user_id")) || "";
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
