// PROJECTCRM - Giriş/Kayıt Görünümü (Auth View)

import { login, register } from '../store.js';
import { showToast } from '../components/ui.js';

export function renderAuthView(container) {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card auth-card">
                <div class="auth-header">
                    <h1 style="font-family:'Outfit', sans-serif; font-weight:800; font-size:32px; letter-spacing:-0.5px; background:linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:12px;">PROJECTCRM</h1>
                    <p style="color:var(--text-secondary); font-size:14px; line-height:1.6; max-width:320px; margin:0 auto 24px auto;">
                        Müşteri portföyünüzü ve ortak ilan havuzunuzu otonom ve gerçek zamanlı yönetin.
                    </p>
                </div>

                <div class="auth-tabs">
                    <button id="tab-login" class="auth-tab active">Giriş Yap</button>
                    <button id="tab-register" class="auth-tab">Kayıt Ol</button>
                </div>

                <!-- GİRİŞ FORM -->
                <form id="form-login" class="auth-form" style="display: block;">
                    <div style="margin-bottom:16px;">
                        <label for="login-email" style="display:block; margin-bottom:8px; font-size:12px; color:var(--text-secondary); font-weight:600;">E-posta Adresi</label>
                        <input type="email" id="login-email" placeholder="isim@domain.com" required>
                    </div>
                    <div style="margin-bottom:24px;">
                        <label for="login-password" style="display:block; margin-bottom:8px; font-size:12px; color:var(--text-secondary); font-weight:600;">Şifre</label>
                        <input type="password" id="login-password" placeholder="••••••••" required>
                    </div>
                    <button type="submit" id="btn-login-submit" class="btn" style="width:100%; padding:12px; font-weight:600; background:var(--primary); color:#fff; border:none; border-radius:var(--border-radius-md); cursor:pointer; transition:all var(--transition-fast);">
                        Giriş Yap
                    </button>
                </form>

                <!-- KAYIT FORM -->
                <form id="form-register" class="auth-form" style="display: none;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                        <div>
                            <label for="register-firstname" style="display:block; margin-bottom:8px; font-size:12px; color:var(--text-secondary); font-weight:600;">Ad</label>
                            <input type="text" id="register-firstname" placeholder="Musa" required>
                        </div>
                        <div>
                            <label for="register-lastname" style="display:block; margin-bottom:8px; font-size:12px; color:var(--text-secondary); font-weight:600;">Soyad</label>
                            <input type="text" id="register-lastname" placeholder="Sarıer" required>
                        </div>
                    </div>
                    <div style="margin-bottom:16px;">
                        <label for="register-email" style="display:block; margin-bottom:8px; font-size:12px; color:var(--text-secondary); font-weight:600;">E-posta Adresi</label>
                        <input type="email" id="register-email" placeholder="isim@domain.com" required>
                    </div>
                    <div style="margin-bottom:24px;">
                        <label for="register-password" style="display:block; margin-bottom:8px; font-size:12px; color:var(--text-secondary); font-weight:600;">Şifre</label>
                        <input type="password" id="register-password" placeholder="••••••••" required>
                    </div>
                    <button type="submit" id="btn-register-submit" class="btn" style="width:100%; padding:12px; font-weight:600; background:var(--primary); color:#fff; border:none; border-radius:var(--border-radius-md); cursor:pointer; transition:all var(--transition-fast);">
                        Kayıt Ol
                    </button>
                </form>
            </div>
        </div>
    `;

    const tabLogin = container.querySelector('#tab-login');
    const tabRegister = container.querySelector('#tab-register');
    const formLogin = container.querySelector('#form-login');
    const formRegister = container.querySelector('#form-register');

    // Switch to Login Tab
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
    });

    // Switch to Register Tab
    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formLogin.style.display = 'none';
        formRegister.style.display = 'block';
    });

    // Login Form Submit
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = container.querySelector('#login-email').value.trim();
        const password = container.querySelector('#login-password').value;
        const btnSubmit = container.querySelector('#btn-login-submit');

        try {
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Giriş yapılıyor...";
            await login(email, password);
            showToast("Giriş başarılı! Hoş geldiniz.", "success");
            window.location.hash = "#dashboard";
        } catch (err) {
            console.error(err);
            showToast(err.message || "Giriş başarısız oldu. E-posta veya şifre hatalı.", "error");
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Giriş Yap";
        }
    });

    // Register Form Submit
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = container.querySelector('#register-firstname').value.trim();
        const lastName = container.querySelector('#register-lastname').value.trim();
        const email = container.querySelector('#register-email').value.trim();
        const password = container.querySelector('#register-password').value;
        const btnSubmit = container.querySelector('#btn-register-submit');

        try {
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Kayıt olunuyor...";
            await register(firstName, lastName, email, password);
            showToast("Kayıt başarılı! Hoş geldiniz.", "success");
            window.location.hash = "#dashboard";
        } catch (err) {
            console.error(err);
            showToast(err.message || "Kayıt başarısız oldu.", "error");
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Kayıt Ol";
        }
    });
}
