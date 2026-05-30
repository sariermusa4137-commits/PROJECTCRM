// PROJECTCRM - User Profile Settings View Module

import { state, updateCurrentUser, apiFetch, createAgency, joinAgency } from '../store.js';
import { showToast } from '../components/ui.js';

export function renderProfileView(container) {
    if (!state.currentUser) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h2>Profil sayfasına erişmek için giriş yapmalısınız.</h2>
            </div>
        `;
        return;
    }

    const user = state.currentUser;
    // Split displayName if firstName/lastName is missing in local memory
    let fName = user.firstName || "";
    let lName = user.lastName || "";
    if (!fName && user.displayName) {
        const parts = user.displayName.split(' ', 2);
        fName = parts[0] || "";
        lName = parts[1] || "";
    }

    const avatarUrl = user.profile_image || user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=60";

    container.innerHTML = `
        <div class="profile-container">
            <div class="profile-layout">
                
                <!-- Left Column: Avatar & Summary Card -->
                <div class="profile-card avatar-card">
                    <div class="avatar-upload-container">
                        <div class="avatar-preview-wrapper" id="avatar-preview-wrapper">
                            <img id="profile-avatar-preview" src="${avatarUrl}" alt="Profil Fotoğrafı" class="profile-avatar-large">
                            <div class="avatar-hover-overlay">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-lg">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                    <circle cx="12" cy="13" r="4"/>
                                </svg>
                                <span>Resim Yükle</span>
                            </div>
                        </div>
                        <input type="file" id="profile-avatar-input" accept="image/*" style="display: none;">
                        <p class="upload-tip">Değiştirmek için resmin üzerine tıklayın veya sürükleyin.<br>Sadece .png, .jpg, .jpeg, .gif, .webp uzantıları desteklenir.</p>
                    </div>
                    
                    <div class="profile-summary">
                        <h3>${user.displayName || "Emlak Danışmanı"}</h3>
                        <p class="role-badge">Gayrimenkul Danışmanı</p>
                        <p class="agency-info">🏢 ${state.agency ? state.agency.name : 'Acente Yok'}</p>
                    </div>
                </div>
                
                <!-- Right Column: Personal Info Form & Security Form -->
                <div class="profile-form-area">
                    <div class="profile-card info-card">
                        <div class="card-header-simple">
                            <div class="card-icon-wrapper">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-md"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <h3>Kişisel Bilgiler</h3>
                        </div>
                        
                        <form id="form-profile-info" class="profile-form">
                            <div class="form-row-two">
                                <div class="form-group">
                                    <label for="p-firstname">Adınız</label>
                                    <input type="text" id="p-firstname" value="${fName}" required placeholder="Adınız">
                                </div>
                                <div class="form-group">
                                    <label for="p-lastname">Soyadınız</label>
                                    <input type="text" id="p-lastname" value="${lName}" placeholder="Soyadınız">
                                </div>
                            </div>
                            
                            <div class="form-row-two">
                                <div class="form-group">
                                    <label for="p-email">E-posta Adresi</label>
                                    <input type="email" id="p-email" value="${user.email || ''}" required placeholder="E-posta">
                                </div>
                                <div class="form-group">
                                    <label for="p-phone">Telefon Numarası</label>
                                    <input type="tel" id="p-phone" value="${user.phone || ''}" placeholder="Örn: 0555 123 4567">
                                </div>
                            </div>
                            
                            <div class="form-actions-profile">
                                <button type="submit" class="btn btn-primary" id="btn-save-profile">Bilgileri Güncelle</button>
                            </div>
                        </form>
                    </div>
                    
                    <div class="profile-card info-card">
                        <div class="card-header-simple">
                            <div class="card-icon-wrapper highlight" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-md"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
                            </div>
                            <h3>Acente / Ofis Bilgileri</h3>
                        </div>
                        
                        <form id="form-profile-agency" class="profile-form">
                            <div class="form-group">
                                <label for="p-agency-name">Aktif Acente / Çalışma Alanı Adı</label>
                                <input type="text" id="p-agency-name" value="${state.agency ? state.agency.name : ''}" required placeholder="Örn: RE/MAX İkon">
                                <span style="font-size:11px; color:var(--text-muted); display:block; margin-top:6px;">
                                    ${state.agency && state.agency.agency_code ? `Ortak Acente Kodu: <strong style="color:var(--secondary); letter-spacing:0.5px;">${state.agency.agency_code}</strong> (Bu kodla çalışma arkadaşlarınız bağlanabilir)` : 'Şu anda bireysel çalışma alanındasınız.'}
                                </span>
                            </div>
                            
                            <div class="form-actions-profile">
                                <button type="submit" class="btn btn-primary" id="btn-save-agency">Acente Adını Güncelle</button>
                            </div>
                        </form>
                        
                        <div style="border-top: 1px solid var(--border-color); margin-top: 24px; padding-top: 20px;">
                            <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">Ortak Çalışma Alanı Değiştir</h4>
                            <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                Diğer danışmanlarla ortak portföy havuzuna geçmek için yeni bir ortak acente kurabilir ya da mevcut bir acente koduna bağlanabilirsiniz.
                            </p>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
                                <div style="background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--border-radius-md); display: flex; flex-direction: column; justify-content: space-between;">
                                    <div>
                                        <h5 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: var(--primary);">Yeni Acente Oluştur</h5>
                                        <input type="text" id="p-agency-create-name" placeholder="Örn: Danışman Emlak" style="font-size: 12px; padding: 6px 10px; margin-bottom: 10px; width: 100%; box-sizing: border-box; background: var(--bg-dark); border: 1px solid var(--border-color); color: white; border-radius: 4px;">
                                    </div>
                                    <button id="btn-profile-agency-create" type="button" class="btn btn-secondary" style="font-size: 11px; padding: 6px 12px; width: 100%;">Kur ve Kod Üret</button>
                                </div>
                                
                                <div style="background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--border-radius-md); display: flex; flex-direction: column; justify-content: space-between;">
                                    <div>
                                        <h5 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: var(--secondary);">Ortak Acenteye Katıl</h5>
                                        <input type="text" id="p-agency-join-code" placeholder="6 Haneli Kod" maxlength="6" style="text-transform: uppercase; font-size: 12px; padding: 6px 10px; margin-bottom: 10px; width: 100%; box-sizing: border-box; background: var(--bg-dark); border: 1px solid var(--border-color); color: white; border-radius: 4px;">
                                    </div>
                                    <button id="btn-profile-agency-join" type="button" class="btn btn-outline" style="font-size: 11px; padding: 6px 12px; width: 100%;">Koda Katıl</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-card info-card">
                        <div class="card-header-simple">
                            <div class="card-icon-wrapper secondary">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-md"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </div>
                            <h3>Şifre Değiştir</h3>
                        </div>
                        
                        <form id="form-profile-password" class="profile-form">
                            <div class="form-row-two">
                                <div class="form-group">
                                    <label for="p-password">Yeni Şifre</label>
                                    <input type="password" id="p-password" placeholder="••••••••" minlength="4">
                                </div>
                                <div class="form-group">
                                    <label for="p-password-confirm">Yeni Şifre (Tekrar)</label>
                                    <input type="password" id="p-password-confirm" placeholder="••••••••" minlength="4">
                                </div>
                            </div>
                            
                            <div class="form-actions-profile">
                                <button type="submit" class="btn btn-secondary" id="btn-save-password">Şifreyi Güncelle</button>
                            </div>
                        </form>
                    </div>
                </div>
                
            </div>
        </div>
    `;

    setupProfileEventListeners(container, user.uid);
}

function setupProfileEventListeners(container, uid) {
    const avatarWrapper = container.querySelector('#avatar-preview-wrapper');
    const avatarInput = container.querySelector('#profile-avatar-input');
    const avatarPreview = container.querySelector('#profile-avatar-preview');
    
    // Avatar upload triggers
    if (avatarWrapper && avatarInput) {
        avatarWrapper.addEventListener('click', () => {
            avatarInput.click();
        });
        
        // Drag and Drop
        avatarWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            avatarWrapper.classList.add('dragover');
        });
        
        avatarWrapper.addEventListener('dragleave', () => {
            avatarWrapper.classList.remove('dragover');
        });
        
        avatarWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            avatarWrapper.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleAvatarFile(e.dataTransfer.files[0], uid, avatarPreview);
            }
        });
        
        avatarInput.addEventListener('change', () => {
            if (avatarInput.files && avatarInput.files[0]) {
                handleAvatarFile(avatarInput.files[0], uid, avatarPreview);
            }
        });
    }

    // Update Personal Profile Info Form
    const infoForm = container.querySelector('#form-profile-info');
    if (infoForm) {
        infoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = container.querySelector('#p-firstname').value.trim();
            const lastName = container.querySelector('#p-lastname').value.trim();
            const email = container.querySelector('#p-email').value.trim();
            const phone = container.querySelector('#p-phone').value.trim();
            const saveBtn = container.querySelector('#btn-save-profile');

            if (!firstName || !email) {
                showToast("Ad ve E-posta alanları zorunludur.", "warning");
                return;
            }

            try {
                saveBtn.disabled = true;
                saveBtn.textContent = "Kaydediliyor...";
                
                const response = await apiFetch('/api/profile/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid,
                        firstName,
                        lastName,
                        email,
                        phone
                    })
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Güncelleme sırasında bir hata oluştu.");
                }

                updateCurrentUser(result.user);
                showToast("Profil bilgileri başarıyla güncellendi.", "success");
            } catch (err) {
                console.error("Profile update failed:", err);
                showToast(err.message, "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "Bilgileri Güncelle";
            }
        });
    }

    // Password Update Form
    const passwordForm = container.querySelector('#form-profile-password');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = container.querySelector('#p-password').value;
            const passwordConfirm = container.querySelector('#p-password-confirm').value;
            const saveBtn = container.querySelector('#btn-save-password');

            if (!password) {
                showToast("Lütfen yeni bir şifre girin.", "warning");
                return;
            }

            if (password !== passwordConfirm) {
                showToast("Şifreler eşleşmiyor.", "warning");
                return;
            }

            try {
                saveBtn.disabled = true;
                saveBtn.textContent = "Güncelleniyor...";
                
                // Get other user values to not reset them
                const firstName = container.querySelector('#p-firstname').value.trim();
                const lastName = container.querySelector('#p-lastname').value.trim();
                const email = container.querySelector('#p-email').value.trim();
                const phone = container.querySelector('#p-phone').value.trim();

                const response = await apiFetch('/api/profile/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid,
                        firstName,
                        lastName,
                        email,
                        phone,
                        password
                    })
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Şifre güncellenemedi.");
                }

                updateCurrentUser(result.user);
                showToast("Şifreniz başarıyla güncellendi.", "success");
                passwordForm.reset();
            } catch (err) {
                console.error("Password update failed:", err);
                showToast(err.message, "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "Şifreyi Güncelle";
            }
        });
    }

    // Update Agency Name Form
    const agencyForm = container.querySelector('#form-profile-agency');
    if (agencyForm) {
        agencyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = container.querySelector('#p-agency-name').value.trim();
            const saveBtn = container.querySelector('#btn-save-agency');
            
            if (!name) {
                showToast("Acente adı boş olamaz.", "warning");
                return;
            }
            
            try {
                saveBtn.disabled = true;
                saveBtn.textContent = "Kaydediliyor...";
                
                const response = await apiFetch('/api/agency/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agencyId: state.agency.id,
                        name
                    })
                });
                
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Acente ismi güncellenemedi.");
                }
                
                state.agency = result.agency;
                
                // Re-render profile page to reflect changes
                renderProfileView(container);
                showToast("Acente/Ofis bilgileri başarıyla güncellendi.", "success");
            } catch (err) {
                console.error("Agency update failed:", err);
                showToast(err.message, "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "Acente Adını Güncelle";
            }
        });
    }

    // Create Shared Agency from Profile Page
    const btnCreateAgency = container.querySelector('#btn-profile-agency-create');
    if (btnCreateAgency) {
        btnCreateAgency.addEventListener('click', async () => {
            const agencyName = container.querySelector('#p-agency-create-name').value.trim();
            if (!agencyName) {
                showToast("Lütfen oluşturmak istediğiniz acente adını girin.", "warning");
                return;
            }
            
            try {
                btnCreateAgency.disabled = true;
                showToast("Acente oluşturuluyor...", "info");
                const code = await createAgency(agencyName);
                showToast(`Acente Başarıyla Oluşturuldu! Kodu: ${code}`, "success");
                renderProfileView(container);
            } catch (err) {
                console.error(err);
                showToast("Acente oluşturulurken hata: " + err.message, "error");
            } finally {
                btnCreateAgency.disabled = false;
            }
        });
    }

    // Join Shared Agency from Profile Page
    const btnJoinAgency = container.querySelector('#btn-profile-agency-join');
    if (btnJoinAgency) {
        btnJoinAgency.addEventListener('click', async () => {
            const code = container.querySelector('#p-agency-join-code').value.trim();
            if (!code) {
                showToast("Lütfen 6 haneli katılım kodunu girin.", "warning");
                return;
            }
            
            try {
                btnJoinAgency.disabled = true;
                showToast("Acenteye bağlanıyor...", "info");
                await joinAgency(code);
                showToast("Acenteye başarıyla katıldınız!", "success");
                renderProfileView(container);
            } catch (err) {
                console.error(err);
                showToast("Acenteye katılırken hata: " + err.message, "error");
            } finally {
                btnJoinAgency.disabled = false;
            }
        });
    }
}

async function handleAvatarFile(file, uid, avatarPreviewElement) {
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        showToast("Sadece resim dosyaları (.png, .jpg, .jpeg, .gif, .webp) yüklenebilir.", "error");
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uid', uid);

        showToast("Fotoğraf yükleniyor...", "info");
        
        const response = await apiFetch('/api/profile/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Fotoğraf yüklenirken hata oluştu.");
        }

        // Update local state & preview image
        const updatedUser = { ...state.currentUser, profile_image: result.profile_image, photoURL: result.profile_image };
        updateCurrentUser(updatedUser);
        avatarPreviewElement.src = result.profile_image;
        showToast("Profil fotoğrafı güncellendi.", "success");
    } catch (err) {
        console.error("Upload failed:", err);
        showToast(err.message, "error");
    }
}
