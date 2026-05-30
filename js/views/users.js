// PROJECTCRM - Danışman Kadrosu Görünümü (Users View)

import { state, apiFetch } from '../store.js';
import { showToast } from '../components/ui.js';

export async function updateUsersTable(container) {
    const tableBody = container.querySelector('#users-table-body');
    if (!tableBody) return;

    try {
        const activeUser = state.currentUser;
        const isAdmin = activeUser && activeUser.role === 'admin';

        let agencies = [];
        if (isAdmin) {
            try {
                const agRes = await apiFetch('/api/agencies');
                if (agRes.ok) {
                    agencies = await agRes.json();
                }
            } catch (e) {
                console.error("Failed to load agencies in user list:", e);
            }
        }

        const res = await apiFetch('/api/users');
        if (!res.ok) {
            throw new Error("Kullanıcı listesi alınamadı.");
        }
        const users = await res.json();

        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
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
            
            // Format role text and badge
            const isUserAdmin = user.role === 'admin';
            const isUserAssistant = user.role === 'assistant';
            
            let roleLabel = 'Danışman (Agent)';
            let roleBadgeStyle = 'background: rgba(45, 212, 191, 0.15); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.3); font-weight:600; padding: 4px 10px; border-radius: 20px; font-size:11px; display:inline-block;';
            
            if (isUserAdmin) {
                roleLabel = 'Yönetici (Admin)';
                roleBadgeStyle = 'background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-weight:600; padding: 4px 10px; border-radius: 20px; font-size:11px; display:inline-block;';
            } else if (isUserAssistant) {
                roleLabel = 'Asistan (Assistant)';
                roleBadgeStyle = 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); font-weight:600; padding: 4px 10px; border-radius: 20px; font-size:11px; display:inline-block;';
            }

            const showDeleteBtn = isAdmin && user.uid !== activeUser.uid;
            const deleteBtnHtml = showDeleteBtn 
                ? `<button class="btn-delete-user" data-uid="${user.uid}" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--border-radius-sm); width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: #f87171; cursor: pointer; transition: all var(--transition-fast); margin-left: 8px; vertical-align: middle; padding: 0;" title="Kullanıcıyı Sil">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                   </button>` 
                : '';

            let officeHtml = `🏢 ${office}`;
            if (isAdmin) {
                const options = [
                    `<option value="" ${!user.agency_id ? 'selected' : ''}>Bireysel</option>`,
                    ...agencies.map(ag => `<option value="${ag.id}" ${user.agency_id === ag.id ? 'selected' : ''}>${ag.name}</option>`)
                ].join('');
                officeHtml = `
                    <select class="agency-assign-select" data-uid="${user.uid}" style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 6px 12px; color: var(--text-primary); font-size: 12px; cursor: pointer; outline: none; transition: all var(--transition-fast); width: 100%;">
                        ${options}
                    </select>
                `;
            }

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
                    <td style="font-size: 13px; color: var(--text-secondary);">${officeHtml}</td>
                    <td>
                        <span style="${roleBadgeStyle}">${roleLabel}</span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center;">
                            <select class="role-select" data-uid="${user.uid}" ${isAdmin ? '' : 'disabled'} style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 6px 12px; color: var(--text-primary); font-size: 12px; cursor: ${isAdmin ? 'pointer' : 'not-allowed'}; min-width: 140px; outline: none; transition: all var(--transition-fast);">
                                <option value="assistant" ${user.role === 'assistant' ? 'selected' : ''}>Asistan (Assistant)</option>
                                <option value="agent" ${user.role === 'agent' ? 'selected' : ''}>Danışman (Agent)</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Yönetici (Admin)</option>
                            </select>
                            ${deleteBtnHtml}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach event listeners for role selection changes
        const selects = container.querySelectorAll('.role-select');
        selects.forEach(select => {
            select.addEventListener('change', async (e) => {
                const uid = select.getAttribute('data-uid');
                const newRole = select.value;
                
                try {
                    select.disabled = true;
                    showToast("Rol güncelleniyor...", "info");
                    
                    const response = await apiFetch('/api/users/update-role', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: uid, newRole })
                    });
                    
                    if (!response.ok) {
                        const result = await response.json();
                        throw new Error(result.error || "Rol değiştirilemedi.");
                    }
                    
                    showToast("Kullanıcı rolü başarıyla güncellendi.", "success");
                    updateUsersTable(container);
                } catch (err) {
                    console.error("Failed to update role:", err);
                    showToast(err.message, "error");
                    updateUsersTable(container);
                }
            });
        });

        // Attach event listeners for agency assignment changes
        const agencySelects = container.querySelectorAll('.agency-assign-select');
        agencySelects.forEach(select => {
            select.addEventListener('change', async (e) => {
                const uid = select.getAttribute('data-uid');
                const agencyId = select.value ? parseInt(select.value) : null;
                
                try {
                    select.disabled = true;
                    showToast("Acente ataması güncelleniyor...", "info");
                    
                    const response = await apiFetch('/api/users/assign-agency', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: uid, agencyId })
                    });
                    
                    if (!response.ok) {
                        const result = await response.json();
                        throw new Error(result.error || "Acente ataması başarısız.");
                    }
                    
                    showToast("Kullanıcı acentesi başarıyla güncellendi.", "success");
                    updateUsersTable(container);
                } catch (err) {
                    console.error("Failed to update user agency:", err);
                    showToast(err.message, "error");
                    updateUsersTable(container);
                }
            });
        });

        // Attach event listeners for user deletion
        const deleteButtons = container.querySelectorAll('.btn-delete-user');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const uid = btn.getAttribute('data-uid');
                
                if (confirm("Bu kullanıcıyı sistemden kalıcı olarak silmek istediğinizden emin misiniz?")) {
                    try {
                        btn.disabled = true;
                        showToast("Kullanıcı siliniyor...", "info");
                        
                        const response = await apiFetch('/api/users/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: uid })
                        });
                        
                        if (!response.ok) {
                            const result = await response.json();
                            throw new Error(result.error || "Kullanıcı silinemedi.");
                        }
                        
                        showToast("Kullanıcı başarıyla silindi.", "success");
                        updateUsersTable(container);
                    } catch (err) {
                        console.error("Failed to delete user:", err);
                        showToast(err.message, "error");
                        btn.disabled = false;
                    }
                }
            });
        });

    } catch (err) {
        console.error(err);
        showToast("Kullanıcı listesi yüklenirken hata oluştu.", "error");
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    Yükleme başarısız.
                </td>
            </tr>
        `;
    }
}

export async function renderUsersView(container) {
    const activeUser = state.currentUser;
    const isAdmin = activeUser && activeUser.role === 'admin';
    const hasPermissionsTab = !!container.querySelector('[data-tab="permissions"]');

    if (container.querySelector('#users-table-body') && (isAdmin === hasPermissionsTab)) {
        await updateUsersTable(container);
        return;
    }

    container.innerHTML = `
        <div class="view-header" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 4px;">
            <h2 style="font-family:'Outfit', sans-serif; font-weight:700; font-size:24px; margin:0;">Danışman Kadrosu</h2>
            <p style="color:var(--text-secondary); font-size:13px; margin:0;">Sistemde kayıtlı olan tüm emlak danışmanları, asistanlar ve yöneticiler.</p>
        </div>

        <div class="tabs-container" style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
            <button class="tab-btn active" data-tab="list" style="background: transparent; border: none; color: var(--text-primary); font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 14px; padding: 8px 16px; cursor: pointer; border-bottom: 2px solid var(--primary-color); transition: all var(--transition-fast); outline: none;">Danışman Listesi</button>
            ${isAdmin ? `
            <button class="tab-btn" data-tab="permissions" style="background: transparent; border: none; color: var(--text-secondary); font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 14px; padding: 8px 16px; cursor: pointer; border-bottom: 2px solid transparent; transition: all var(--transition-fast); outline: none;">Rol Yetkileri Ayarları</button>
            ` : ''}
        </div>

        <div id="users-tab-list" class="tab-pane">
            <div class="card" style="padding: 24px;">
                <div class="table-responsive">
                    <table class="crm-table">
                        <thead>
                            <tr>
                                <th>Profil</th>
                                <th>E-posta</th>
                                <th>Kayıt Tarihi</th>
                                <th>Ofis / Çalışma Alanı</th>
                                <th>Yetki Rolü</th>
                                <th>Eylemler</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                                    Yükleniyor...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        ${isAdmin ? `
        <div id="users-tab-permissions" class="tab-pane" style="display: none;">
            <div class="card" style="padding: 24px;">
                <h3 style="font-family:'Outfit', sans-serif; font-weight:600; font-size:18px; margin-top:0; margin-bottom:16px;">Rol Yetki Ayarları</h3>
                <p style="color:var(--text-secondary); font-size:13px; margin-bottom:24px;">Sistemde kayıtlı rollerin yapabileceği işlemleri buradan dinamik olarak yapılandırabilirsiniz.</p>
                
                <form id="permissions-form" style="display:flex; flex-direction:column; gap:24px;">
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                        <!-- Admin Permissions Card -->
                        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 20px;">
                            <h4 style="color:#c084fc; font-family:'Outfit', sans-serif; font-size:15px; margin-top:0; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                                <span style="background: rgba(168, 85, 247, 0.15); padding: 4px 8px; border-radius: 4px;">Admin</span> Yönetici Yetkileri
                            </h4>
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="admin_can_delete_portfolio" style="accent-color:var(--primary-color);"> Portföy Silme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="admin_can_edit_customer" style="accent-color:var(--primary-color);"> Müşteri Düzenleme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="admin_can_view_all_agency" style="accent-color:var(--primary-color);"> Tüm Acenteyi Görme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="admin_can_view_reports" style="accent-color:var(--primary-color);"> Ciro Raporlarını Görme
                                </label>
                            </div>
                        </div>

                        <!-- Agent Permissions Card -->
                        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 20px;">
                            <h4 style="color:#2dd4bf; font-family:'Outfit', sans-serif; font-size:15px; margin-top:0; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                                <span style="background: rgba(45, 212, 191, 0.15); padding: 4px 8px; border-radius: 4px;">Agent</span> Danışman Yetkileri
                            </h4>
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="agent_can_delete_portfolio" style="accent-color:var(--primary-color);"> Portföy Silme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="agent_can_edit_customer" style="accent-color:var(--primary-color);"> Müşteri Düzenleme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="agent_can_view_all_agency" style="accent-color:var(--primary-color);"> Tüm Acenteyi Görme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="agent_can_view_reports" style="accent-color:var(--primary-color);"> Ciro Raporlarını Görme
                                </label>
                            </div>
                        </div>

                        <!-- Assistant Permissions Card -->
                        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 20px;">
                            <h4 style="color:#60a5fa; font-family:'Outfit', sans-serif; font-size:15px; margin-top:0; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                                <span style="background: rgba(59, 130, 246, 0.15); padding: 4px 8px; border-radius: 4px;">Assistant</span> Asistan Yetkileri
                            </h4>
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="assistant_can_delete_portfolio" style="accent-color:var(--primary-color);"> Portföy Silme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="assistant_can_edit_customer" style="accent-color:var(--primary-color);"> Müşteri Düzenleme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="assistant_can_view_all_agency" style="accent-color:var(--primary-color);"> Tüm Acenteyi Görme
                                </label>
                                <label style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-primary); cursor:pointer;">
                                    <input type="checkbox" name="assistant_can_view_reports" style="accent-color:var(--primary-color);"> Ciro Raporlarını Görme
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button type="submit" class="btn btn-primary" style="padding: 10px 20px; font-weight:600; font-size:13px;">Yetki Kurallarını Kaydet</button>
                    </div>
                </form>
            </div>
        </div>
        ` : ''}
    `;

    // Tab switching logic
    if (isAdmin) {
        const tabButtons = container.querySelectorAll('.tab-btn');
        const listPane = container.querySelector('#users-tab-list');
        const permissionsPane = container.querySelector('#users-tab-permissions');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => {
                    b.classList.remove('active');
                    b.style.color = 'var(--text-secondary)';
                    b.style.borderBottomColor = 'transparent';
                });
                btn.classList.add('active');
                btn.style.color = 'var(--text-primary)';
                btn.style.borderBottomColor = 'var(--primary-color)';

                const targetTab = btn.getAttribute('data-tab');
                if (targetTab === 'list') {
                    listPane.style.display = 'block';
                    permissionsPane.style.display = 'none';
                } else {
                    listPane.style.display = 'none';
                    permissionsPane.style.display = 'block';
                    loadPermissions(container);
                }
            });
        });

        // Form submission logic
        const form = container.querySelector('#permissions-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const data = {
                        admin: {
                            can_delete_portfolio: form.querySelector('[name="admin_can_delete_portfolio"]').checked,
                            can_edit_customer: form.querySelector('[name="admin_can_edit_customer"]').checked,
                            can_view_all_agency: form.querySelector('[name="admin_can_view_all_agency"]').checked,
                            can_view_reports: form.querySelector('[name="admin_can_view_reports"]').checked
                        },
                        agent: {
                            can_delete_portfolio: form.querySelector('[name="agent_can_delete_portfolio"]').checked,
                            can_edit_customer: form.querySelector('[name="agent_can_edit_customer"]').checked,
                            can_view_all_agency: form.querySelector('[name="agent_can_view_all_agency"]').checked,
                            can_view_reports: form.querySelector('[name="agent_can_view_reports"]').checked
                        },
                        assistant: {
                            can_delete_portfolio: form.querySelector('[name="assistant_can_delete_portfolio"]').checked,
                            can_edit_customer: form.querySelector('[name="assistant_can_edit_customer"]').checked,
                            can_view_all_agency: form.querySelector('[name="assistant_can_view_all_agency"]').checked,
                            can_view_reports: form.querySelector('[name="assistant_can_view_reports"]').checked
                        }
                    };

                    showToast("Yetkiler güncelleniyor...", "info");
                    const res = await apiFetch('/api/users/update-permissions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    if (!res.ok) {
                        const result = await res.json();
                        throw new Error(result.error || "Yetkiler güncellenemedi.");
                    }

                    showToast("Yetkiler başarıyla kaydedildi.", "success");
                } catch (err) {
                    console.error("Failed to update permissions:", err);
                    showToast(err.message, "error");
                }
            });
        }
    }

    // Load initial users
    await updateUsersTable(container);
}

async function loadPermissions(container) {
    try {
        const res = await apiFetch('/api/users/permissions');
        if (!res.ok) {
            throw new Error("Yetkiler yüklenemedi.");
        }
        const perms = await res.json();
        
        const form = container.querySelector('#permissions-form');
        if (!form) return;
        
        for (const role of ['admin', 'agent', 'assistant']) {
            const rolePerms = perms[role] || {};
            for (const key of ['can_delete_portfolio', 'can_edit_customer', 'can_view_all_agency', 'can_view_reports']) {
                const input = form.querySelector(`[name="${role}_${key}"]`);
                if (input) {
                    input.checked = !!rolePerms[key];
                }
            }
        }
    } catch (err) {
        console.error("Failed to load permissions:", err);
        showToast(err.message, "error");
    }
}
