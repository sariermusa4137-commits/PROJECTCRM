// PROJECTCRM - Giriş ve Kurulum Görünümü (Auth & Onboarding)

import { state, loginWithLocalUser, createAgency, joinAgency, logout } from '../store.js';
import { showToast } from '../components/ui.js';

export function renderAuthView(container) {
    // 1. Case: Not logged in
    if (!state.currentUser) {
        renderLoginView(container);
    } 
    // 2. Case: Logged in, but hasn't created/joined an agency yet
    else if (state.currentUser && !state.currentUser.agencyId) {
        renderAgencySetupView(container);
    }
}

// 1. LOGIN VIEW (Simple Form to authenticate/register on local DB)
function renderLoginView(container) {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card auth-card">
                <div class="auth-header">
                    <h1>PROJECTCRM</h1>
                    <p>Ekip arkadaşlarınızla ortak havuzu kullanmak için oturum açın.</p>
                </div>
                
                <form id="form-local-login" style="display:flex; flex-direction:column; gap:16px; width:100%;">
                    <div class="form-group">
                        <label for="login-name">Ad Soyad</label>
                        <input type="text" id="login-name" placeholder="Örn: Musa Danışman" required>
                    </div>
                    <div class="form-group">
                        <label for="login-email">E-posta</label>
                        <input type="email" id="login-email" placeholder="danisman@projectcrm.com" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" style="margin-top:8px;">
                        Giriş Yap / Kayıt Ol
                    </button>
                </form>
            </div>
        </div>
    `;
    
    // Submit Login Form
    document.getElementById('form-local-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('login-name').value.trim();
        const email = document.getElementById('login-email').value.trim();
        
        try {
            showToast("Giriş yapılıyor...", "info");
            await loginWithLocalUser(email, displayName);
            showToast("Başarıyla giriş yapıldı!", "success");
        } catch (err) {
            console.error(err);
            showToast("Giriş yapılamadı: " + err.message, "error");
        }
    });
}

// 2. AGENCY SETUP VIEW (Logged in, but no agency yet)
function renderAgencySetupView(container) {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card auth-card">
                <div class="auth-header">
                    <img src="${state.currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'}" style="width:64px; height:64px; border-radius:50%; margin: 0 auto 16px auto; border:2px solid var(--primary); display:block;">
                    <h1>Merhaba, ${state.currentUser.displayName}!</h1>
                    <p>Çalışma alanınızı kurmak için bir adım kaldı.</p>
                </div>
                
                <div class="auth-tabs">
                    <button class="auth-tab active" id="tab-join">Acenteye Katıl</button>
                    <button class="auth-tab" id="tab-create">Acente Oluştur</button>
                </div>
                
                <!-- Join Agency Panel -->
                <div id="panel-join" class="auth-panel">
                    <form id="form-join-agency">
                        <div class="form-group">
                            <label for="input-agency-code">Acente Katılım Kodu (6 Haneli)</label>
                            <input type="text" id="input-agency-code" placeholder="Örn: XF5G8A" maxlength="6" style="text-transform: uppercase;" required>
                            <span style="font-size:11px; color:var(--text-muted); display:block; margin-top:6px; line-height:1.4;">
                                Çalışma arkadaşınızın oluşturduğu 6 haneli kodu girerek onunla ortak portföy ve müşteri havuzuna bağlanabilirsiniz.
                            </span>
                        </div>
                        <button type="submit" class="btn btn-secondary btn-full">
                            Ortak Havuza Katıl
                        </button>
                    </form>
                </div>
                
                <!-- Create Agency Panel -->
                <div id="panel-create" class="auth-panel hidden">
                    <form id="form-create-agency">
                        <div class="form-group">
                            <label for="input-agency-name">Acente / Ofis Adı</label>
                            <input type="text" id="input-agency-name" placeholder="Örn: Musa Gayrimenkul" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-full">
                            Acente Oluştur ve Kod Üret
                        </button>
                    </form>
                </div>
                
                <button id="btn-auth-logout" class="btn btn-outline btn-full" style="margin-top:20px;">
                    Oturumu Kapat
                </button>
            </div>
        </div>
    `;
    
    // Toggle Panels
    const tabJoin = document.getElementById('tab-join');
    const tabCreate = document.getElementById('tab-create');
    const panelJoin = document.getElementById('panel-join');
    const panelCreate = document.getElementById('panel-create');
    
    tabJoin.addEventListener('click', () => {
        tabJoin.classList.add('active');
        tabCreate.classList.remove('active');
        panelJoin.classList.remove('hidden');
        panelCreate.classList.add('hidden');
    });
    
    tabCreate.addEventListener('click', () => {
        tabCreate.classList.add('active');
        tabJoin.classList.remove('active');
        panelCreate.classList.remove('hidden');
        panelJoin.classList.add('hidden');
    });
    
    // Logout Action
    document.getElementById('btn-auth-logout').addEventListener('click', async () => {
        await logout();
        showToast("Oturum kapatıldı.", "info");
    });
    
    // Create Agency Submit
    document.getElementById('form-create-agency').addEventListener('submit', async (e) => {
        e.preventDefault();
        const agencyName = document.getElementById('input-agency-name').value.trim();
        try {
            showToast("Acente oluşturuluyor...", "info");
            const code = await createAgency(agencyName);
            showToast(`Acente Başarıyla Oluşturuldu! Kodu: ${code}`, "success");
            window.location.hash = "#dashboard";
        } catch (err) {
            console.error(err);
            showToast("Acente oluşturulurken hata: " + err.message, "error");
        }
    });
    
    // Join Agency Submit
    document.getElementById('form-join-agency').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('input-agency-code').value.trim();
        try {
            showToast("Acenteye bağlanıyor...", "info");
            await joinAgency(code);
            showToast("Acenteye başarıyla katıldınız!", "success");
            window.location.hash = "#dashboard";
        } catch (err) {
            console.error(err);
            showToast("Acenteye katılırken hata: " + err.message, "error");
        }
    });
}
