// PROJECTCRM - Ciro ve Finansal Raporlar Görünümü

import { state, apiFetch } from '../store.js';
import { showToast } from '../components/ui.js';

export async function renderReportsView(container) {
    if (!state.agency) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h3>Acente çalışma alanı bulunamadı.</h3>
                <p>Ciro raporunu görüntülemek için önce bir acenteye katılmalı veya acente oluşturmalısınız.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="view-header" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 4px;">
            <h2 style="font-family:'Outfit', sans-serif; font-weight:700; font-size:24px; margin:0;">Ciro ve Finansal Raporlar</h2>
            <p style="color:var(--text-secondary); font-size:13px; margin:0;">Acentenizin toplam işlem hacmi, kazanılan komisyonlar ve aylık performans analizleri.</p>
        </div>

        <div id="reports-loading" style="text-align: center; padding: 60px; color: var(--text-secondary);">
            <div class="spinner" style="margin: 0 auto 16px auto;"></div>
            Rapor verileri analiz ediliyor...
        </div>

        <div id="reports-content" style="display: none; flex-direction: column; gap: 24px;">
            <!-- Stat Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                <!-- Card 1 -->
                <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid var(--primary-color);">
                    <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Toplam İşlem Hacmi</span>
                    <h3 id="stat-total-revenue" style="font-family:'Outfit', sans-serif; font-size: 26px; font-weight: 700; margin: 0; color: var(--text-primary);">₺0</h3>
                    <span style="font-size: 11px; color: #10b981; font-weight: 500;">📈 Gerçekleşen Satışlar</span>
                </div>
                <!-- Card 2 -->
                <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid #c084fc;">
                    <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Kazanılan Net Komisyon</span>
                    <h3 id="stat-commission" style="font-family:'Outfit', sans-serif; font-size: 26px; font-weight: 700; margin: 0; color: var(--text-primary);">₺0</h3>
                    <span style="font-size: 11px; color: #c084fc; font-weight: 500;">💼 Ortalama %4 Hizmet Bedeli</span>
                </div>
                <!-- Card 3 -->
                <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid #2dd4bf;">
                    <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Aktif Portföy Değeri</span>
                    <h3 id="stat-active-listings" style="font-family:'Outfit', sans-serif; font-size: 26px; font-weight: 700; margin: 0; color: var(--text-primary);">₺0</h3>
                    <span style="font-size: 11px; color: var(--text-secondary);">🏠 Pazardaki İlanlar</span>
                </div>
            </div>

            <!-- Chart & Progress -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; min-height: 350px;">
                <!-- Chart Card -->
                <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                    <h4 style="font-family:'Outfit', sans-serif; font-weight: 600; font-size: 16px; margin: 0;">Aylık Komisyon Gelir Trendi</h4>
                    <div style="flex-grow: 1; position: relative; height: 260px;">
                        <canvas id="revenue-chart"></canvas>
                    </div>
                </div>

                <!-- Goal & Top Performers Card -->
                <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                    <!-- Goal -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Komisyon Hedefi (Yıllık)</span>
                            <span id="goal-percent" style="font-size: 12px; font-weight: 700; color: var(--primary-color);">0%</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
                            <div id="goal-bar" style="background: var(--primary-color); width: 0%; height: 100%; transition: width 1s ease-in-out;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
                            <span id="goal-current">₺0</span>
                            <span>/ ₺1,000,000</span>
                        </div>
                    </div>

                    <!-- Top Performers -->
                    <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <h4 style="font-family:'Outfit', sans-serif; font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">En Çok Ciro Yapan Danışmanlar</h4>
                        <div id="performers-list" style="display: flex; flex-direction: column; gap: 12px;">
                            <!-- populated dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const loadingEl = container.querySelector('#reports-loading');
    const contentEl = container.querySelector('#reports-content');

    try {
        const res = await apiFetch(`/api/reports/ciro?agencyId=${state.agency.id}`);
        if (!res.ok) {
            throw new Error("Ciro verileri alınamadı.");
        }
        const data = await res.json();

        loadingEl.style.display = 'none';
        contentEl.style.display = 'flex';

        // Render metrics
        container.querySelector('#stat-total-revenue').textContent = formatCurrency(data.totalRevenue);
        container.querySelector('#stat-commission').textContent = formatCurrency(data.commissionEarned);
        container.querySelector('#stat-active-listings').textContent = formatCurrency(data.activeListingsValue);

        // Render Goal
        const targetGoal = data.commissionGoal || 1000000;
        const currentComm = data.commissionEarned || 0;
        const percent = Math.min(100, Math.round((currentComm / targetGoal) * 100));
        container.querySelector('#goal-percent').textContent = `${percent}%`;
        container.querySelector('#goal-bar').style.width = `${percent}%`;
        container.querySelector('#goal-current').textContent = formatCurrency(currentComm);

        // Render performers
        const performersList = container.querySelector('#performers-list');
        performersList.innerHTML = data.topPerformers.map((p, index) => {
            const colors = ['#fbbf24', '#cbd5e1']; // Gold, Silver
            const badgeColor = colors[index] || 'var(--text-muted)';
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; color: ${badgeColor}; font-size: 14px;">#${index + 1}</span>
                        <span style="color: var(--text-primary); font-weight: 500;">${p.name}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: var(--text-primary);">${formatCurrency(p.comm)}</div>
                        <div style="font-size: 10px; color: var(--text-muted);">${p.dealsCount} İşlem</div>
                    </div>
                </div>
            `;
        }).join('');

        // Render Chart.js
        setTimeout(() => {
            const ctx = container.querySelector('#revenue-chart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Aralık', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs'],
                    datasets: [{
                        label: 'Hizmet Bedeli Geliri (₺)',
                        data: data.monthlyRevenue,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#6366f1',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: {
                                    size: 10,
                                    family: 'Outfit'
                                },
                                callback: function(value) {
                                    return value >= 1000 ? (value / 1000) + 'k' : value;
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: {
                                    size: 10,
                                    family: 'Outfit'
                                }
                            }
                        }
                    }
                }
            });
        }, 100);

    } catch (err) {
        console.error("Reports render error:", err);
        // apiFetch redirection to #forbidden will handle the page redirection if status is 403.
        // Otherwise, show standard error notice here.
        loadingEl.innerHTML = `
            <div style="color: #f87171; font-size: 14px;">
                ⚠️ Rapor verileri yüklenirken bir hata oluştu: ${err.message}
            </div>
        `;
    }
}

function formatCurrency(val) {
    if (!val) return '₺0';
    return '₺' + parseFloat(val).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}
