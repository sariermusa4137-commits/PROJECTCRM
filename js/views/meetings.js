// Gayrimenkul CRM - Görüşmeler, Takvim ve Kanban Süreç Panosu Görünümü

import { state, addRecord, updateRecord, deleteRecord } from '../store.js';
import { openModal, closeModal, showToast } from '../components/ui.js';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

const KANBAN_STAGES = [
    "İlk Temas",
    "Sunum Yapıldı",
    "Teklif Alındı",
    "Kaparo Alındı",
    "Tapu Süreci",
    "Satış Tamamlandı"
];

export function renderMeetingsView(container) {
    if (container.querySelector('#kanban-board-container')) {
        renderKanbanBoard();
        renderCalendar();
        return;
    }
    container.innerHTML = `
        <div class="view-header">
            <div>
                <h2>Aktiviteler & Süreç Yönetimi</h2>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">Görüşmelerinizi takip edin ve Kanban panosuyla satış aşamalarını yönetin.</p>
            </div>
            <button id="btn-add-meeting" class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Yeni Randevu / Aktivite Ekle
            </button>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:40px;">
            <!-- 1. Section: Kanban Process Board -->
            <div>
                <h3 style="margin-bottom:16px;">Müşteri Takip Aşamaları (Kanban)</h3>
                <div class="kanban-board" id="kanban-board-container">
                    <!-- Dynamic Kanban Columns -->
                </div>
            </div>
            
            <!-- 2. Section: Calendar -->
            <div>
                <h3 style="margin-bottom:16px;">Acente Takvimi</h3>
                <div class="calendar-container" id="calendar-view-container">
                    <!-- Dynamic Calendar Grid -->
                </div>
            </div>
        </div>
    `;
    
    renderKanbanBoard();
    renderCalendar();
    
    // Add Meeting Trigger
    document.getElementById('btn-add-meeting').addEventListener('click', () => {
        openAddMeetingModal();
    });
}

// ----------------- KANBAN BOARD -----------------
function renderKanbanBoard() {
    const container = document.getElementById('kanban-board-container');
    if (!container) return;
    
    container.innerHTML = KANBAN_STAGES.map(stage => {
        // Filter meetings in this stage
        const stageMeetings = state.meetings.filter(m => m.kanbanStage === stage);
        
        return `
            <div class="kanban-column" data-stage="${stage}">
                <div class="kanban-column-header">
                    <span class="kanban-column-title">${stage}</span>
                    <span class="kanban-column-count">${stageMeetings.length}</span>
                </div>
                <div class="kanban-cards" id="kanban-cards-${stage.replace(/\s+/g, '-')}">
                    ${stageMeetings.map(m => `
                        <div class="kanban-card" draggable="true" data-id="${m.id}">
                            <div class="kanban-card-title">${m.customerName}</div>
                            <div class="kanban-card-subtitle">${m.title}</div>
                            <div class="kanban-card-footer">
                                <span>🕒 ${m.time}</span>
                                <span>${m.type}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    setupDragAndDrop();
}

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.id);
            card.style.opacity = '0.5';
        });
        
        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
        });
        
        // Mobile-friendly / Double click to open details
        card.addEventListener('dblclick', () => {
            const m = state.meetings.find(item => item.id === card.dataset.id);
            if (m) openMeetingDetailModal(m);
        });
    });
    
    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault(); // Required to allow drop
            column.style.background = 'rgba(99, 102, 241, 0.05)';
        });
        
        column.addEventListener('dragleave', () => {
            column.style.background = 'rgba(15, 23, 42, 0.3)';
        });
        
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.style.background = 'rgba(15, 23, 42, 0.3)';
            
            const id = e.dataTransfer.getData('text/plain');
            const targetStage = column.dataset.stage;
            
            if (id && targetStage) {
                try {
                    await updateRecord('meetings', id, { kanbanStage: targetStage });
                    showToast(`Süreç "${targetStage}" aşamasına güncellendi.`, "success");
                    renderKanbanBoard();
                } catch (err) {
                    showToast("Süreç güncellenemedi: " + err.message, "error");
                }
            }
        });
    });
}

// ----------------- CALENDAR VIEW -----------------
function renderCalendar() {
    const container = document.getElementById('calendar-view-container');
    if (!container) return;
    
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    
    // First day of current month
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    // Adjusted firstDayIndex for Monday start instead of Sunday start (Mon = 0, Sun = 6)
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    // Days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    container.innerHTML = `
        <div class="calendar-header">
            <h4>${months[currentMonth]} ${currentYear}</h4>
            <div style="display:flex; gap:8px;">
                <button id="btn-cal-prev" class="btn btn-outline" style="padding:6px 12px;">◀</button>
                <button id="btn-cal-next" class="btn btn-outline" style="padding:6px 12px;">▶</button>
            </div>
        </div>
        
        <div class="calendar-grid-header">
            <div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div>
        </div>
        
        <div class="calendar-grid-days" id="calendar-grid-days-container">
            <!-- Day Cells -->
        </div>
    `;
    
    const gridContainer = document.getElementById('calendar-grid-days-container');
    
    // 1. Render empty cells before first day of month
    for (let i = 0; i < adjustedFirstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        gridContainer.appendChild(emptyCell);
    }
    
    // 2. Render actual day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Filter meetings on this date
        const dayMeetings = state.meetings.filter(m => m.date === dateStr);
        
        dayCell.innerHTML = `
            <span class="calendar-day-num">${day}</span>
            <div class="calendar-day-events">
                ${dayMeetings.map(m => {
                    const isBirthday = m.type === 'Doğum Günü';
                    const displayText = isBirthday ? `🎂 Doğum Günü: ${m.customerName}` : `${m.time} ${m.customerName}`;
                    const cleanClass = m.type.toLowerCase().replace(/\s+/g, '-').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ı/g,'i').replace(/ğ/g,'g');
                    return `
                        <span class="calendar-event-pill ${cleanClass}" data-id="${m.id}" title="${displayText}">
                            ${displayText}
                        </span>
                    `;
                }).join('')}
            </div>
        `;
        
        // Click to add meeting on this day
        dayCell.addEventListener('click', (e) => {
            // If target is a meeting pill, handle that instead
            if (e.target.classList.contains('calendar-event-pill')) {
                e.stopPropagation();
                const m = state.meetings.find(item => item.id === e.target.dataset.id);
                if (m) openMeetingDetailModal(m);
            } else {
                openAddMeetingModal(dateStr);
            }
        });
        
        gridContainer.appendChild(dayCell);
    }
    
    // Add Event Listeners for Nav buttons
    document.getElementById('btn-cal-prev').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    document.getElementById('btn-cal-next').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
}

// ----------------- MODAL DETAILS & CRUD -----------------
function openMeetingDetailModal(m) {
    const isBirthday = m.type === 'Doğum Günü';
    const content = `
        <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="specs-grid">
                <div class="spec-entry">
                    <span class="spec-entry-label">Müşteri</span>
                    <span class="spec-entry-value">${m.customerName}</span>
                </div>
                <div class="spec-entry">
                    <span class="spec-entry-label">Etkinlik Türü</span>
                    <span class="spec-entry-value">${m.type}</span>
                </div>
                <div class="spec-entry">
                    <span class="spec-entry-label">Tarih - Saat</span>
                    <span class="spec-entry-value">${m.date} - ${m.time}</span>
                </div>
                ${isBirthday ? '' : `
                <div class="spec-entry">
                    <span class="spec-entry-label">Süreç Aşaması</span>
                    <span class="spec-entry-value">${m.kanbanStage}</span>
                </div>
                `}
            </div>
            
            <div>
                <h4 style="margin-bottom:6px;">Detaylı Notlar</h4>
                <p style="font-size:13px; color:var(--text-secondary); line-height:1.6; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:12px; border-radius:var(--border-radius-md);">${m.notes || "Not eklenmemiş."}</p>
            </div>
            
            ${isBirthday ? '' : `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
                <button id="btn-edit-m" class="btn btn-outline">Düzenle</button>
                <button id="btn-delete-m" class="btn btn-danger">Randevuyu İptal Et</button>
            </div>
            `}
        </div>
    `;
    
    openModal(m.title, content);
    
    if (!isBirthday) {
        // Edit Click
        document.getElementById('btn-edit-m').addEventListener('click', () => {
            closeModal();
            openEditMeetingModal(m);
        });
        
        // Delete/Cancel click
        document.getElementById('btn-delete-m').addEventListener('click', async () => {
            if (confirm("Bu randevu/aktivite kaydını silmek istediğinize emin misiniz?")) {
                try {
                    await deleteRecord('meetings', m.id);
                    closeModal();
                    showToast("Aktivite silindi.", "success");
                    renderKanbanBoard();
                    renderCalendar();
                } catch (err) {
                    showToast("Aktivite silinirken hata: " + err.message, "error");
                }
            }
        });
    }
}

function openAddMeetingModal(defaultDate = '') {
    const clients = state.customers;
    
    const content = `
        <form id="form-meeting-add">
            <div class="form-group">
                <label for="m-title">Görüşme Başlığı</label>
                <input type="text" id="m-title" placeholder="Örn: Ev Gösterme ve Fiyat Pazarlığı" required>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="m-client">Müşteri</label>
                    <select id="m-client" required>
                        <option value="">-- Müşteri Seçin --</option>
                        ${clients.map(c => `
                            <option value="${c.id}">${c.name} (${c.type})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="m-type">Aktivite Türü</label>
                    <select id="m-type">
                        <option value="Ev Gösterme">Ev Gösterme</option>
                        <option value="Arama">Telefon Araması</option>
                        <option value="Yüz yüze">Ofis Görüşmesi</option>
                        <option value="Teklif">Teklif Toplantısı</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="m-date">Tarih</label>
                    <input type="date" id="m-date" value="${defaultDate || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="m-time">Saat</label>
                    <input type="time" id="m-time" value="12:00" required>
                </div>
                <div class="form-group">
                    <label for="m-stage">Satış Aşaması</label>
                    <select id="m-stage">
                        ${KANBAN_STAGES.map(stage => `
                            <option value="${stage}">${stage}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="m-notes">Görüşme Detayları / Notlar</label>
                <textarea id="m-notes" placeholder="Randevu adresi, gösterilecek evler, konuşulacak bütçe detayları..."></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">Randevu Oluştur</button>
        </form>
    `;
    
    openModal("Yeni Aktivite & Randevu Girişi", content);
    
    document.getElementById('form-meeting-add').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const clientSelect = document.getElementById('m-client');
        const selectedClientOpt = clientSelect.options[clientSelect.selectedIndex];
        
        const record = {
            title: document.getElementById('m-title').value.trim(),
            customerId: clientSelect.value,
            customerName: selectedClientOpt.textContent.split(' (')[0], // Extract raw name
            type: document.getElementById('m-type').value,
            date: document.getElementById('m-date').value,
            time: document.getElementById('m-time').value,
            kanbanStage: document.getElementById('m-stage').value,
            notes: document.getElementById('m-notes').value.trim()
        };
        
        try {
            await addRecord('meetings', record);
            closeModal();
            showToast("Randevu başarıyla eklendi.", "success");
            renderKanbanBoard();
            renderCalendar();
        } catch (err) {
            showToast("Randevu ekleme hatası: " + err.message, "error");
        }
    });
}

function openEditMeetingModal(m) {
    const clients = state.customers;
    
    const content = `
        <form id="form-meeting-edit">
            <div class="form-group">
                <label for="me-title">Görüşme Başlığı</label>
                <input type="text" id="me-title" value="${m.title}" required>
            </div>
            
            <div class="form-group-row">
                <div class="form-group">
                    <label for="me-client">Müşteri</label>
                    <select id="me-client" required>
                        ${clients.map(c => `
                            <option value="${c.id}" ${c.id === m.customerId ? 'selected' : ''}>${c.name} (${c.type})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="me-type">Aktivite Türü</label>
                    <select id="me-type">
                        <option value="Ev Gösterme" ${m.type === 'Ev Gösterme' ? 'selected' : ''}>Ev Gösterme</option>
                        <option value="Arama" ${m.type === 'Arama' ? 'selected' : ''}>Telefon Araması</option>
                        <option value="Yüz yüze" ${m.type === 'Yüz yüze' ? 'selected' : ''}>Ofis Görüşmesi</option>
                        <option value="Teklif" ${m.type === 'Teklif' ? 'selected' : ''}>Teklif Toplantısı</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group-three">
                <div class="form-group">
                    <label for="me-date">Tarih</label>
                    <input type="date" id="me-date" value="${m.date}" required>
                </div>
                <div class="form-group">
                    <label for="me-time">Saat</label>
                    <input type="time" id="me-time" value="${m.time}" required>
                </div>
                <div class="form-group">
                    <label for="me-stage">Satış Aşaması</label>
                    <select id="me-stage">
                        ${KANBAN_STAGES.map(stage => `
                            <option value="${stage}" ${m.kanbanStage === stage ? 'selected' : ''}>${stage}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="me-notes">Görüşme Detayları / Notlar</label>
                <textarea id="me-notes">${m.notes || ''}</textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">Değişiklikleri Kaydet</button>
        </form>
    `;
    
    openModal("Görüşme Düzenleme", content);
    
    document.getElementById('form-meeting-edit').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const clientSelect = document.getElementById('me-client');
        const selectedClientOpt = clientSelect.options[clientSelect.selectedIndex];
        
        const updated = {
            title: document.getElementById('me-title').value.trim(),
            customerId: clientSelect.value,
            customerName: selectedClientOpt.textContent.split(' (')[0],
            type: document.getElementById('me-type').value,
            date: document.getElementById('me-date').value,
            time: document.getElementById('me-time').value,
            kanbanStage: document.getElementById('me-stage').value,
            notes: document.getElementById('me-notes').value.trim()
        };
        
        try {
            await updateRecord('meetings', m.id, updated);
            closeModal();
            showToast("Aktivite başarıyla güncellendi.", "success");
            renderKanbanBoard();
            renderCalendar();
        } catch (err) {
            showToast("Güncelleme hatası: " + err.message, "error");
        }
    });
}
