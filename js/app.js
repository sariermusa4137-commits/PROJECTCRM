// PROJECTCRM - SPA Router and Application Orchestrator

import { state, initStore, subscribe, logout } from './store.js';
import { renderAuthView } from './views/auth.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderPortfolioView } from './views/portfolio.js';
import { renderCustomersView } from './views/customers.js';
import { renderMeetingsView } from './views/meetings.js';
import { renderLocationsView } from './views/locations.js';
import { renderSocialView } from './views/social.js';
import { renderDealsView } from './views/deals.js';
import { renderProfileView } from './views/profile.js';
import { showToast, openModal, closeModal } from './components/ui.js';

// DOM Elements
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');
const topbar = document.getElementById('topbar');
const appView = document.getElementById('app-view');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const agencyNameBadge = document.getElementById('agency-name-badge');
const txtAgencyCode = document.getElementById('txt-agency-code');
const demoModeIndicator = document.getElementById('demo-mode-indicator');
const btnLogout = document.getElementById('btn-logout');
const btnAgencySettings = document.getElementById('btn-agency-settings');

// Active view state
let currentView = "";
let previousAuthStatus = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    // Show spinner inside loading container
    appView.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>PROJECTCRM yükleniyor...</p>
        </div>
    `;

    try {
        // Init Store (Handles localStorage, Firebase initialization and listeners)
        await initStore();
        
        // Subscribe to store updates (Firebase real-time sync / Demo updates)
        subscribe(handleStateChange);
        
        // Listen to URL hash change
        window.addEventListener('hashchange', handleRouting);
        
        // Setup static global event handlers
        setupGlobalEvents();
        
        // Run initial state check and routing
        handleStateChange();
        handleRouting();
    } catch (e) {
        console.error("Init failed:", e);
        showToast("Uygulama yüklenirken hata oluştu: " + e.message, "error");
    }
});

// Setup sidebar clicks, logout, agency info clicks
function setupGlobalEvents() {
    // Logout Action
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (confirm("Oturumu kapatmak istediğinize emin misiniz?")) {
                try {
                    await logout();
                    showToast("Oturum kapatıldı.", "info");
                    window.location.hash = "#auth";
                } catch (err) {
                    showToast("Çıkış hatası: " + err.message, "error");
                }
            }
        });
    }

    // Agency Info click - Show Acente details and copy code
    if (btnAgencySettings) {
        btnAgencySettings.addEventListener('click', () => {
            if (!state.agency) return;
            
            const content = `
                <div style="text-align:center; display:flex; flex-direction:column; gap:16px;">
                    <div style="font-size:36px;">🏢</div>
                    <div>
                        <h3 style="font-family:'Outfit', sans-serif; font-size:22px; font-weight:700;">${state.agency.name}</h3>
                        <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">Acente Çalışma Alanı</p>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:16px; border-radius:var(--border-radius-md); margin-top:8px;">
                        <span style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Acente Katılım Kodu</span>
                        <div style="font-family:monospace; font-size:26px; font-weight:800; color:var(--secondary); letter-spacing:2px; margin-bottom:12px;">${state.agency.id}</div>
                        <button id="btn-copy-agency-code" class="btn btn-secondary" style="font-size:12px; padding:6px 12px;">Kodu Panoya Kopyala</button>
                    </div>

                    <p style="font-size:12px; color:var(--text-secondary); line-height:1.6; max-width:350px; margin:0 auto;">
                        Çalışma arkadaşlarınızın da bu veritabanına bağlanması için yukarıdaki 6 haneli kodu paylaşın. Ortak portföyleri ve müşterileri gerçek zamanlı yönetin.
                    </p>
                </div>
            `;
            
            openModal("Acente Bilgileri", content);
            
            document.getElementById('btn-copy-agency-code').addEventListener('click', () => {
                navigator.clipboard.writeText(state.agency.id).then(() => {
                    showToast("Acente kodu kopyalandı! İş arkadaşlarınızla paylaşabilirsiniz.", "success");
                    closeModal();
                });
            });
        });
    }

    // User Status Card - Click to view profile
    const userStatusCard = document.getElementById('user-status-card');
    if (userStatusCard) {
        userStatusCard.addEventListener('click', () => {
            window.location.hash = "#profile";
        });
    }
}

// Router - Renders views based on location hash
function handleRouting() {
    let hash = window.location.hash || "#dashboard";
    
    // Auth Check
    const isAuthenticated = !!state.currentUser;
    
    // If not authenticated, force them to Auth View
    if (!isAuthenticated) {
        hash = "#auth";
        window.location.hash = "#auth";
    } else if (hash === "#auth") {
        // If authenticated and trying to access #auth, redirect to #dashboard
        hash = "#dashboard";
        window.location.hash = "#dashboard";
    }

    const viewName = hash.replace("#", "");
    currentView = viewName;

    // Update Sidebar Navigation Active Class
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === hash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update topbar breadcrumbs
    const breadcrumbActive = document.getElementById('breadcrumb-active');
    if (breadcrumbActive) {
        const viewTitles = {
            auth: "Giriş Paneli",
            dashboard: "Dashboard",
            portfolio: "Portföy Havuzu",
            customers: "Müşteri Rehberi",
            meetings: "Görüşmeler & Süreçler",
            locations: "Bölge Analizleri",
            social: "Sosyal Medya",
            deals: "Süreç Yönetimi",
            profile: "Profilim"
        };
        breadcrumbActive.textContent = viewTitles[viewName] || viewName.toUpperCase();
    }

    // Toggle layout container views (sidebar vs full screen auth)
    toggleLayout(isAuthenticated);

    // Render corresponding view
    renderActiveView(viewName);
}

// Shows/Hides Sidebar and Topbar depending on Auth
function toggleLayout(isAuthenticated) {
    if (isAuthenticated) {
        sidebar.classList.remove('hidden');
        mainContent.classList.remove('full-width');
        topbar.classList.remove('hidden');
    } else {
        sidebar.classList.add('hidden');
        mainContent.classList.add('full-width');
        topbar.classList.add('hidden');
    }
}

// Render selected view template into app-view
function renderActiveView(viewName) {
    switch (viewName) {
        case "auth":
            renderAuthView(appView);
            break;
        case "dashboard":
            renderDashboardView(appView);
            break;
        case "portfolio":
            renderPortfolioView(appView);
            break;
        case "customers":
            renderCustomersView(appView);
            break;
        case "meetings":
            renderMeetingsView(appView);
            break;
        case "locations":
            renderLocationsView(appView);
            break;
        case "social":
            renderSocialView(appView);
            break;
        case "deals":
            renderDealsView(appView);
            break;
        case "profile":
            renderProfileView(appView);
            break;
        default:
            appView.innerHTML = `<div style="padding:40px; text-align:center;"><h2>Görünüm bulunamadı (404)</h2></div>`;
    }
}

// Detect if user is currently typing in form input
function isUserTyping() {
    const active = document.activeElement;
    if (!active) return false;
    
    // Check if focused element is inside #app-view and is text input
    const isInsideAppView = appView.contains(active);
    const isInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable;
    
    // Also ignore when modal container is open (preventing background updates from re-rendering modal inputs)
    const modalContainer = document.getElementById('modal-container');
    const isModalOpen = modalContainer && !modalContainer.classList.contains('hidden');
    
    return (isInsideAppView && isInput) || isModalOpen;
}

// Handler triggered whenever store state updates (real-time Firebase updates)
function handleStateChange() {
    const isAuthenticated = !!(state.currentUser && state.currentUser.agencyId);
    
    // Update User Profile details in Sidebar
    if (isAuthenticated && state.currentUser) {
        if (userAvatar) userAvatar.src = state.currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60";
        if (userName) userName.textContent = state.currentUser.displayName || "Emlak Danışmanı";
        if (agencyNameBadge) agencyNameBadge.textContent = state.agency ? state.agency.name : "Acente Yok";
        if (txtAgencyCode) txtAgencyCode.textContent = state.agency ? `Kod: ${state.agency.id}` : "Kod: -";
    }

    // Toggle Demo Mode text in topbar
    if (demoModeIndicator) {
        if (state.isDemoMode) {
            demoModeIndicator.classList.remove('hidden');
        } else {
            demoModeIndicator.classList.add('hidden');
        }
    }

    // Detect login status change (e.g. logged in or logged out)
    const authStatusChanged = (previousAuthStatus !== isAuthenticated);
    previousAuthStatus = isAuthenticated;

    if (authStatusChanged) {
        // Redo routing completely on auth state shift
        handleRouting();
    } else {
        // If already authenticated and state changes in the background (like firestore sync),
        // we can safely update lists on the active view, UNLESS user is currently typing in an input.
        if (isAuthenticated && currentView !== "auth") {
            if (!isUserTyping()) {
                // Safely update the view without breaking focus
                renderActiveView(currentView);
            }
        }
    }
}
