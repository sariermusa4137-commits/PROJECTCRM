// Gayrimenkul CRM - Dashboard / Gösterge Paneli Görünümü

import { state, getApproachingBirthdays, getApproachingContractExpirations } from '../store.js';
import { showToast } from '../components/ui.js';

// Simple date formatter
function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const parts = dateString.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch(e) {
        return dateString;
    }
}

// Price formatter
function formatPrice(price) {
    if (!price) return "";
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price);
}

export function renderDashboardView(container) {
    // 1. Calculate statistics
    const totalPortfolios = state.portfolios.length;
    const totalCustomers = state.customers.length;
    
    // Calculate meetings this week
    const today = new Date();
    const currentDay = today.getDay(); // 0: Sunday, 1: Monday, ...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const meetingsThisWeek = state.meetings.filter(m => {
        const mDate = new Date(m.date);
        return mDate >= startOfWeek && mDate <= endOfWeek;
    }).length;
    
    // Pending tasks count
    const contractExpirations = getApproachingContractExpirations();
    const pendingTodos = state.reminders.filter(r => !r.is_completed).length + contractExpirations.length;
    
    // 2. Fetch approaching birthdays
    const birthdays = getApproachingBirthdays();
    
    const contractWarningsHtml = contractExpirations.map(exp => {
        const badgeText = exp.daysLeft < 0 ? 'Süresi Geçti' : exp.daysLeft === 0 ? 'Bugün Bitiyor' : `${exp.daysLeft} Gün Kaldı`;
        const name = exp.type === 'portfolio' ? `Portföy: ${exp.title}` : `Satıcı: ${exp.title}`;
        return `
            <div class="todo-item" style="border-left: 4px solid #ea580c; background: rgba(234, 88, 12, 0.1); cursor: default; margin-bottom: 8px;">
                <div class="todo-left">
                    <span style="color: #ea580c; font-weight: bold; font-size: 14px; margin-right: 8px;">⚠️</span>
                    <span class="todo-text" style="font-weight: 500;">Sözleşme Bitiş Uyarısı: ${name}</span>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="badge" style="background: #ea580c; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${badgeText}</span>
                    <span class="todo-meta">${formatDate(exp.expirationDate)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Check if shell is already rendered
    const statsGrid = container.querySelector('.stats-grid');
    if (statsGrid) {
        // Update Stats
        const statValues = statsGrid.querySelectorAll('.stat-value');
        if (statValues.length >= 4) {
            statValues[0].textContent = totalPortfolios;
            statValues[1].textContent = totalCustomers;
            statValues[2].textContent = meetingsThisWeek;
            statValues[3].textContent = pendingTodos;
        }
        
        // Update Recent Activities
        const activityList = container.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = state.activities.length === 0 ? `
                <p style="color:var(--text-muted); font-size:13px; text-align:center; padding-top:40px;">Henüz bir hareket kaydedilmedi.</p>
            ` : state.activities.map(act => `
                <div class="activity-item">
                    <img src="${act.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'}" class="activity-avatar" alt="Avatar">
                    <div class="activity-details">
                        <div class="activity-meta">
                            <span class="activity-user">${act.userName}</span>
                            <span class="activity-time">${formatActivityTime(act.time)}</span>
                        </div>
                        <div class="activity-text">${act.action}</div>
                    </div>
                </div>
            `).join('');
        }
        
        // Todos card is removed from dashboard view
        
        // Update Birthdays
        const birthdayList = container.querySelector('.birthday-list');
        if (birthdayList) {
            birthdayList.innerHTML = birthdays.length === 0 ? `
                <p style="color:var(--text-muted); font-size:13px; text-align:center; padding-top:40px;">Yakın zamanda doğum günü olan müşteri yok.</p>
            ` : birthdays.map(client => `
                <div class="birthday-item">
                    <div class="birthday-user-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="birthday-cake-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <div>
                            <div class="birthday-client-name">${client.name}</div>
                            <div class="birthday-date">${formatBirthdayDate(client.birthDate)}</div>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-congratulate" data-name="${client.name}">
                        Tebrik Et
                    </button>
                </div>
            `).join('');
        }

        // Update Matchmaking
        const matchmakingList = container.querySelector('.matchmaking-list');
        if (matchmakingList) {
            const opps = state.opportunities || [];
            matchmakingList.innerHTML = opps.length === 0 ? `
                <p style="color:var(--text-muted); font-size:13px; text-align:center; padding-top:40px;">Eşleşen aktif fırsat bulunamadı.</p>
            ` : opps.slice(0, 5).map(opp => `
                <div class="match-item" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: all 0.2s ease;">
                    <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0; flex-grow: 1;">
                        <div style="font-weight: 600; font-size: 13px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                            ${opp.customer.name} ↔ ${opp.portfolio.title}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 4px 12px;">
                            <span>📍 ${opp.portfolio.neighborhood ? opp.portfolio.neighborhood + ', ' : ''}${opp.portfolio.district}</span>
                            <span>🛏️ ${opp.portfolio.rooms}</span>
                            <span>💰 ${formatPrice(opp.portfolio.price)}</span>
                        </div>
                    </div>
                    <div style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(139, 92, 246, 0.4); flex-shrink: 0;">
                        %${opp.score}
                    </div>
                </div>
            `).join('');
        }
        
        setupBirthdayListeners(container);
        return;
    }

    // 3. Render base layout
    container.innerHTML = `
        <div class="stats-grid">
            <div class="card stat-card">
                <div class="stat-icon-wrapper primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-icon"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div class="stat-info">
                    <span class="stat-value">${totalPortfolios}</span>
                    <span class="stat-label">Toplam Portföy</span>
                </div>
            </div>
            
            <div class="card stat-card">
                <div class="stat-icon-wrapper secondary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div class="stat-info">
                    <span class="stat-value">${totalCustomers}</span>
                    <span class="stat-label">Kayıtlı Müşteri</span>
                </div>
            </div>
            
            <div class="card stat-card">
                <div class="stat-icon-wrapper warning">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div class="stat-info">
                    <span class="stat-value">${meetingsThisWeek}</span>
                    <span class="stat-label">Haftalık Randevu</span>
                </div>
            </div>
            
            <div class="card stat-card">
                <div class="stat-icon-wrapper" style="background:rgba(239, 68, 68, 0.15); color:var(--danger);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-icon"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div class="stat-info">
                    <span class="stat-value">${pendingTodos}</span>
                    <span class="stat-label">Bekleyen Görev</span>
                </div>
            </div>
        </div>
        
        <div class="dashboard-grid">
            
            <!-- Left Side: Recent Activities & Task List -->
            <div style="display:flex; flex-direction:column; gap:32px;">
                
                <!-- Activity Feed Card -->
                <div class="card activity-feed-card">
                    <h3>Canlı Aktivite Akışı</h3>
                    <div class="activity-list">
                        ${state.activities.length === 0 ? `
                            <p style="color:var(--text-muted); font-size:13px; text-align:center; padding-top:40px;">Henüz bir hareket kaydedilmedi.</p>
                        ` : state.activities.map(act => `
                            <div class="activity-item">
                                <img src="${act.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'}" class="activity-avatar" alt="Avatar">
                                <div class="activity-details">
                                    <div class="activity-meta">
                                        <span class="activity-user">${act.userName}</span>
                                        <span class="activity-time">${formatActivityTime(act.time)}</span>
                                    </div>
                                    <div class="activity-text">${act.action}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                

                
            </div>
            
            <!-- Right Side: Matchmaking & Birthday Reminders -->
            <div style="display:flex; flex-direction:column; gap:32px;">
                <!-- AI Matchmaking Card -->
                <div class="card ai-matchmaking-card" style="border: 1px solid rgba(139, 92, 246, 0.35); box-shadow: 0 8px 32px 0 rgba(139, 92, 246, 0.15), 0 0 16px 0 rgba(59, 130, 246, 0.1); background: rgba(30, 20, 50, 0.25); backdrop-filter: blur(8px); position: relative; overflow: hidden;">
                    <!-- Ambient Glow Effects inside card -->
                    <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(0,0,0,0) 70%); pointer-events: none;"></div>
                    <div style="position: absolute; bottom: -50px; left: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0,0,0,0) 70%); pointer-events: none;"></div>
                    
                    <h3 style="color: #c084fc; display: flex; align-items: center; gap: 8px; font-family: 'Outfit', sans-serif; font-size: 16px; margin: 0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: #a855f7; filter: drop-shadow(0 0 4px rgba(168, 85, 247, 0.5));"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        AI Akıllı Eşleştirme Fırsatları
                    </h3>
                    <p style="font-size:12px; color:var(--text-secondary); margin-top:4px; margin-bottom: 16px;">Müşteri talepleri ve aktif portföyler arasında en yüksek uyumlu eşleşmeler.</p>
                    
                    <div class="matchmaking-list" style="display:flex; flex-direction:column; gap:12px;">
                        ${(state.opportunities || []).length === 0 ? `
                            <p style="color:var(--text-muted); font-size:13px; text-align:center; padding-top:40px;">Eşleşen aktif fırsat bulunamadı.</p>
                        ` : (state.opportunities || []).slice(0, 5).map(opp => `
                            <div class="match-item" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: all 0.2s ease;">
                                <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0; flex-grow: 1;">
                                    <div style="font-weight: 600; font-size: 13px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                                        ${opp.customer.name} ↔ ${opp.portfolio.title}
                                    </div>
                                    <div style="font-size: 11px; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 4px 12px;">
                                        <span>📍 ${opp.portfolio.neighborhood ? opp.portfolio.neighborhood + ', ' : ''}${opp.portfolio.district}</span>
                                        <span>🛏️ ${opp.portfolio.rooms}</span>
                                        <span>💰 ${formatPrice(opp.portfolio.price)}</span>
                                    </div>
                                </div>
                                <div style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(139, 92, 246, 0.4); flex-shrink: 0;">
                                    %${opp.score}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Doğum Günü Hatırlatmaları -->
                <div class="card" style="height:100%;">
                    <h3>Doğum Günü Hatırlatmaları</h3>
                    <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">Gelecek 7 gün içindeki doğum günleri listelenir.</p>
                    
                    <div class="birthday-list">
                        ${birthdays.length === 0 ? `
                            <p style="color:var(--text-muted); font-size:13px; text-align:center; padding-top:40px;">Yakın zamanda doğum günü olan müşteri yok.</p>
                        ` : birthdays.map(client => `
                            <div class="birthday-item">
                                <div class="birthday-user-info">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="birthday-cake-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    <div>
                                        <div class="birthday-client-name">${client.name}</div>
                                        <div class="birthday-date">${formatBirthdayDate(client.birthDate)}</div>
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-congratulate" data-name="${client.name}">
                                    Tebrik Et
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
        </div>
    `;
    
    // Add Event Listeners for Birthdays
    setupBirthdayListeners(container);
}

// Format Relative Time for activity feed
function formatActivityTime(isoString) {
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return "Şimdi";
        if (diffMins < 60) return `${diffMins} dk önce`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} sa önce`;
        
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    } catch (e) {
        return "";
    }
}

// Format Birthday Date
function formatBirthdayDate(dateString) {
    if (!dateString) return "";
    try {
        const parts = dateString.split('-');
        const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const day = parseInt(parts[2]);
        const monthIndex = parseInt(parts[1]) - 1;
        return `${day} ${months[monthIndex]}`;
    } catch (e) {
        return dateString;
    }
}



// Setup Event Listeners for Birthdays (Tebrik Et Button)
function setupBirthdayListeners(container) {
    if (!container) return;
    
    const birthdayList = container.querySelector('.birthday-list');
    if (birthdayList && !birthdayList.dataset.listenerAttached) {
        birthdayList.dataset.listenerAttached = 'true';
        birthdayList.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-congratulate');
            if (btn) {
                const clientName = btn.dataset.name;
                const agencyName = state.agency ? state.agency.name : "PROJECTCRM";
                
                // Generate WhatsApp message
                const message = `Sayın ${clientName}, doğum gününüzü en içten dileklerimle kutlar; yeni yaşınızın size sağlık, huzur ve bol şans getirmesini dilerim. Mutlu yıllar! \n\n- ${agencyName}`;
                
                // Copy to Clipboard
                navigator.clipboard.writeText(message)
                    .then(() => {
                        showToast(`${clientName} için kutlama mesajı panoya kopyalandı! WhatsApp'ta doğrudan yapıştırabilirsiniz.`, "success");
                        
                        // Optional: open whatsapp web
                        const encodedMsg = encodeURIComponent(message);
                        window.open(`https://web.whatsapp.com/send?text=${encodedMsg}`, '_blank');
                    })
                    .catch(err => {
                        showToast("Mesaj kopyalanamadı.", "error");
                    });
            }
        });
    }
}
