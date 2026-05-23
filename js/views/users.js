// PROJECTCRM - Danışman Kadrosu Görünümü (Users View)

import { apiFetch } from '../store.js';
import { showToast } from '../components/ui.js';

export async function renderUsersView(container) {
    container.innerHTML = `
        <div class="view-header" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 4px;">
            <h2 style="font-family:'Outfit', sans-serif; font-weight:700; font-size:24px; margin:0;">Danışman Kadrosu</h2>
            <p style="color:var(--text-secondary); font-size:13px; margin:0;">Sistemde kayıtlı olan tüm emlak danışmanları ve yöneticiler.</p>
        </div>

        <div class="card" style="padding: 24px;">
            <div class="table-responsive">
                <table class="crm-table">
                    <thead>
                        <tr>
                            <th>Profil</th>
                            <th>E-posta</th>
                            <th>Kayıt Tarihi</th>
                            <th>Ofis / Çalışma Alanı</th>
                            <th>Rol</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
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

    const tableBody = container.querySelector('#users-table-body');

    try {
        const res = await apiFetch('/api/users');
        if (!res.ok) {
            throw new Error("Kullanıcı listesi alınamadı.");
        }
        const users = await res.json();

        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        Kayıtlı kullanıcı bulunamadı.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = users.map(user => {
            const avatar = user.profile_image || user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60";
            const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '-';
            const office = user.agencyName || 'Bireysel';
            
            const roleBadgeStyle = user.role === 'Yönetici' 
                ? 'background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-weight:600; padding: 4px 10px; border-radius: 20px; font-size:11px; display:inline-block;'
                : 'background: rgba(45, 212, 191, 0.15); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.3); font-weight:600; padding: 4px 10px; border-radius: 20px; font-size:11px; display:inline-block;';

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${avatar}" alt="Avatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);">
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary); font-size: 13px;">${user.displayName || (user.firstName + ' ' + user.lastName)}</div>
                                <div style="font-size: 11px; color: var(--text-muted);">${user.phone || 'Telefon belirtilmemiş'}</div>
                            </div>
                        </div>
                    </td>
                    <td style="font-size: 13px; color: var(--text-secondary);">${user.email}</td>
                    <td style="font-size: 13px; color: var(--text-secondary);">${dateStr}</td>
                    <td style="font-size: 13px; color: var(--text-secondary);">🏢 ${office}</td>
                    <td>
                        <span style="${roleBadgeStyle}">${user.role}</span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        showToast("Kullanıcı listesi yüklenirken hata oluştu.", "error");
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    Yükleme başarısız.
                </td>
            </tr>
        `;
    }
}
