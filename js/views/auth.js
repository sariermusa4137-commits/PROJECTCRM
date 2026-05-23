// PROJECTCRM - Giriş Görünümü (Auth View - Google Account Chooser Simulator)

import { state, loginWithGoogleSimulator } from '../store.js';
import { showToast } from '../components/ui.js';

export function renderAuthView(container) {
    if (!state.currentUser) {
        renderLoginView(container);
    }
}

// Renders the glassmorphic Google Sign-In button
function renderLoginView(container) {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card auth-card">
                <div class="auth-header">
                    <h1 style="font-family:'Outfit', sans-serif; font-weight:800; font-size:32px; letter-spacing:-0.5px; background:linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:12px;">PROJECTCRM</h1>
                    <p style="color:var(--text-secondary); font-size:14px; line-height:1.6; max-width:320px; margin:0 auto 24px auto;">
                        Müşteri portföyünüzü ve ortak ilan havuzunuzu otonom ve gerçek zamanlı yönetin.
                    </p>
                </div>
                
                <div style="display:flex; flex-direction:column; align-items:center; gap:20px; width:100%;">
                    <button id="btn-google-sign-in" class="btn-google-login">
                        <svg viewBox="0 0 24 24" width="20" height="20" style="margin-right:12px;">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        Google ile Giriş Yap
                    </button>
                    
                    <span style="font-size:11px; color:var(--text-muted); text-align:center;">
                        Giriş yaparak kullanım koşullarını kabul etmiş olursunuz.
                    </span>
                </div>
            </div>
        </div>
    `;

    // Listen to Google Sign In Button Click
    const btnGoogle = container.querySelector('#btn-google-sign-in');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', () => {
            openGoogleSimulatorModal(container);
        });
    }
}

// Opens the simulated Google Account Chooser pop-up modal
function openGoogleSimulatorModal(parentContainer) {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'google-sim-modal';
    modalOverlay.className = 'google-modal-overlay';
    
    modalOverlay.innerHTML = `
        <div class="google-modal-card">
            <div class="google-modal-header">
                <svg viewBox="0 0 24 24" width="32" height="32" style="margin-bottom:12px;">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <h2>Hesap Seçin</h2>
                <p>PROJECTCRM uygulamasına devam etmek için</p>
            </div>
            
            <form id="google-sim-form">
                <div class="form-group-sim">
                    <label for="sim-name">Ad Soyad</label>
                    <input type="text" id="sim-name" value="Musa Danışman" placeholder="Örn: Musa Danışman" required>
                </div>
                <div class="form-group-sim">
                    <label for="sim-email">E-posta</label>
                    <input type="email" id="sim-email" value="musa@danisman.com" placeholder="danisman@projectcrm.com" required>
                </div>
                
                <div class="form-group-sim">
                    <label>Profil Fotoğrafı</label>
                    <div class="avatar-selector">
                        <img class="sim-avatar-option active" data-url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=60">
                        <img class="sim-avatar-option" data-url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=60">
                        <img class="sim-avatar-option" data-url="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=60" src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&auto=format&fit=crop&q=60">
                        <img class="sim-avatar-option" data-url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=60" src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=60&auto=format&fit=crop&q=60">
                    </div>
                </div>
                
                <div class="google-modal-actions">
                    <button type="button" id="btn-sim-cancel" class="btn-sim-secondary">İptal</button>
                    <button type="submit" id="btn-sim-submit" class="btn-sim-primary">Giriş Yap</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    // Fade in animation helper
    setTimeout(() => {
        modalOverlay.style.opacity = '1';
    }, 10);

    // Avatar Selection Event Listener
    const avatars = modalOverlay.querySelectorAll('.sim-avatar-option');
    let selectedPicture = avatars[0].getAttribute('data-url');
    
    avatars.forEach(avatar => {
        avatar.addEventListener('click', () => {
            avatars.forEach(a => a.classList.remove('active'));
            avatar.classList.add('active');
            selectedPicture = avatar.getAttribute('data-url');
        });
    });

    // Cancel Button Event Listener
    const btnCancel = modalOverlay.querySelector('#btn-sim-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            closeModal();
        });
    }

    // Submit / Login Form Event Listener
    const form = modalOverlay.querySelector('#google-sim-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = modalOverlay.querySelector('#sim-name').value.trim();
            const email = modalOverlay.querySelector('#sim-email').value.trim();
            const submitBtn = modalOverlay.querySelector('#btn-sim-submit');

            if (!name || !email) {
                showToast("Ad Soyad ve E-posta alanları zorunludur.", "warning");
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "Bağlanıyor...";
                
                showToast("Google hesabı doğrulanıyor...", "info");
                await loginWithGoogleSimulator(email, name, selectedPicture);
                showToast("Giriş başarılı! Hoş geldiniz.", "success");
                closeModal();
            } catch (err) {
                console.error(err);
                showToast(err.message, "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Giriş Yap";
            }
        });
    }

    // Close Modal helper
    function closeModal() {
        modalOverlay.style.opacity = '0';
        modalOverlay.addEventListener('transitionend', () => {
            modalOverlay.remove();
        });
    }
}
