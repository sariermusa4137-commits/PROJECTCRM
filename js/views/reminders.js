// PROJECTCRM - Apple Reminders ('Anımsatıcılar') View Module

import { state, addReminder, updateReminder, deleteReminder } from '../store.js';
import { showToast } from '../components/ui.js';

// Module-level state for selected category
let activeCategory = 'Tümü';

// Helper to get local date in YYYY-MM-DD format
function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Simple date formatter
function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString;
    } catch(e) {
        return dateString;
    }
}

export function renderRemindersView(container) {
    if (!state.currentUser) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h2>Anımsatıcılar modülünü görüntülemek için giriş yapmalısınız.</h2>
            </div>
        `;
        return;
    }

    const todayStr = getTodayString();

    // 1. Calculate counts for Counter Cards
    const countBugun = state.reminders.filter(r => !r.is_completed && r.due_date === todayStr).length;
    const countZamanlanmis = state.reminders.filter(r => !r.is_completed && r.due_date).length;
    const countTumu = state.reminders.filter(r => !r.is_completed).length;
    const countTamamlananlar = state.reminders.filter(r => r.is_completed).length;

    // 2. Filter reminders list based on selected category
    let filteredReminders = [];
    if (activeCategory === 'Bugün') {
        filteredReminders = state.reminders.filter(r => !r.is_completed && r.due_date === todayStr);
    } else if (activeCategory === 'Zamanlanmış') {
        filteredReminders = state.reminders.filter(r => !r.is_completed && r.due_date);
    } else if (activeCategory === 'Tümü') {
        filteredReminders = state.reminders.filter(r => !r.is_completed);
    } else if (activeCategory === 'Tamamlananlar') {
        filteredReminders = state.reminders.filter(r => r.is_completed);
    }

    // Sort: Uncompleted by due_date ascending (closest first), completed by created_at descending (latest first)
    if (activeCategory === 'Tamamlananlar') {
        filteredReminders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else {
        filteredReminders.sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date) - new Date(b.due_date);
        });
    }

    // 3. Render base layout
    container.innerHTML = `
        <div class="reminders-container">
            <div class="reminders-layout">
                
                <!-- Left Column: Apple-style Smart Counter Cards -->
                <div class="reminders-sidebar-col">
                    <div class="reminders-grid">
                        
                        <!-- Bugün Card -->
                        <div class="reminder-counter-card blue ${activeCategory === 'Bugün' ? 'active' : ''}" data-category="Bugün">
                            <div class="card-top">
                                <div class="icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                </div>
                                <span class="counter-number">${countBugun}</span>
                            </div>
                            <span class="card-label">Bugün</span>
                        </div>
                        
                        <!-- Zamanlanmış Card -->
                        <div class="reminder-counter-card orange ${activeCategory === 'Zamanlanmış' ? 'active' : ''}" data-category="Zamanlanmış">
                            <div class="card-top">
                                <div class="icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                </div>
                                <span class="counter-number">${countZamanlanmis}</span>
                            </div>
                            <span class="card-label">Zamanlanmış</span>
                        </div>
                        
                        <!-- Tümü Card -->
                        <div class="reminder-counter-card grey ${activeCategory === 'Tümü' ? 'active' : ''}" data-category="Tümü">
                            <div class="card-top">
                                <div class="icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                </div>
                                <span class="counter-number">${countTumu}</span>
                            </div>
                            <span class="card-label">Tümü</span>
                        </div>
                        
                        <!-- Tamamlananlar Card -->
                        <div class="reminder-counter-card green ${activeCategory === 'Tamamlananlar' ? 'active' : ''}" data-category="Tamamlananlar">
                            <div class="card-top">
                                <div class="icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                                <span class="counter-number">${countTamamlananlar}</span>
                            </div>
                            <span class="card-label">Tamamlananlar</span>
                        </div>
                        
                    </div>
                </div>
                
                <!-- Right Column: Reminders List -->
                <div class="reminders-list-col">
                    <div class="reminders-header-row">
                        <h2 class="category-title ${getCategoryColorClass(activeCategory)}">${activeCategory}</h2>
                        <span class="category-total-badge ${getCategoryColorClass(activeCategory)}">${filteredReminders.length} anımsatıcı</span>
                    </div>
                    
                    <div class="reminders-list-container">
                        ${filteredReminders.length === 0 ? `
                            <div class="empty-reminders-state">
                                <span class="empty-icon">☕</span>
                                <p>Bu kategoride anımsatıcı bulunmamaktadır.</p>
                            </div>
                        ` : filteredReminders.map(reminder => {
                            const isOverdue = reminder.due_date && !reminder.is_completed && new Date(reminder.due_date) < new Date(todayStr);
                            return `
                                <div class="reminder-list-item ${reminder.is_completed ? 'completed' : ''}" data-id="${reminder.id}">
                                    <div class="reminder-item-main">
                                        <!-- Apple Style Circular Checkbox -->
                                        <div class="apple-checkbox-outer ${reminder.is_completed ? 'checked' : ''} ${getCategoryColorClass(activeCategory)}">
                                            <div class="apple-checkbox-inner"></div>
                                        </div>
                                        
                                        <div class="reminder-content">
                                            <div class="reminder-title">${reminder.title}</div>
                                            ${reminder.description ? `<div class="reminder-desc">${reminder.description}</div>` : ''}
                                            <div class="reminder-meta-row">
                                                ${reminder.due_date ? `
                                                    <span class="reminder-date-tag ${isOverdue ? 'overdue' : ''}">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                                        ${formatDate(reminder.due_date)} ${isOverdue ? '(Gecikti)' : ''}
                                                    </span>
                                                ` : ''}
                                                ${reminder.category && activeCategory === 'Tümü' ? `
                                                    <span class="reminder-cat-tag">${reminder.category}</span>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button class="reminder-action-btn delete-btn" title="Anımsatıcıyı Sil">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <!-- Bottom: Inline Add Reminder Form -->
                    <div class="add-reminder-footer">
                        <button id="btn-toggle-add-form" class="btn-toggle-add">
                            <span class="plus-icon">+</span> Yeni Anımsatıcı Ekle
                        </button>
                        
                        <form id="form-reminder-add" class="reminder-inline-form hidden">
                            <div class="form-inputs-grid">
                                <div class="form-input-group span-full">
                                    <input type="text" id="rem-title" placeholder="Başlık (örn: Müşteriyi ara)" required>
                                </div>
                                <div class="form-input-group span-full">
                                    <textarea id="rem-desc" placeholder="Açıklama (isteğe bağlı)" rows="2"></textarea>
                                </div>
                                <div class="form-input-group">
                                    <label for="rem-date">Tarih</label>
                                    <input type="date" id="rem-date">
                                </div>
                                <div class="form-input-group">
                                    <label for="rem-cat">Kategori</label>
                                    <select id="rem-cat">
                                        <option value="Bugün">Bugün</option>
                                        <option value="Zamanlanmış">Zamanlanmış</option>
                                        <option value="Tümü" selected>Tümü</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-actions-row">
                                <button type="button" id="btn-cancel-add" class="btn btn-secondary btn-sm">Vazgeç</button>
                                <button type="submit" class="btn btn-primary btn-sm">Ekle</button>
                            </div>
                        </form>
                    </div>
                    
                </div>
                
            </div>
        </div>
    `;

    // 4. Attach Event Listeners
    setupRemindersListeners(container);
}

// Helpers for Category color schemes
function getCategoryColorClass(cat) {
    switch (cat) {
        case 'Bugün': return 'blue';
        case 'Zamanlanmış': return 'orange';
        case 'Tümü': return 'grey';
        case 'Tamamlananlar': return 'green';
        default: return 'grey';
    }
}

// Attach event listeners
function setupRemindersListeners(container) {
    if (!container) return;

    // A. Sidebar cards clicks (switch active category)
    const cards = container.querySelectorAll('.reminder-counter-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const cat = card.dataset.category;
            if (cat) {
                activeCategory = cat;
                renderRemindersView(container);
            }
        });
    });

    // B. Toggle inline form display
    const btnToggleForm = container.querySelector('#btn-toggle-add-form');
    const formAdd = container.querySelector('#form-reminder-add');
    const btnCancel = container.querySelector('#btn-cancel-add');

    if (btnToggleForm && formAdd) {
        btnToggleForm.addEventListener('click', () => {
            btnToggleForm.classList.add('hidden');
            formAdd.classList.remove('hidden');
            const titleInput = formAdd.querySelector('#rem-title');
            if (titleInput) titleInput.focus();
            
            // Auto populate date if category is 'Bugün'
            const dateInput = formAdd.querySelector('#rem-date');
            const catSelect = formAdd.querySelector('#rem-cat');
            if (activeCategory === 'Bugün') {
                if (dateInput) dateInput.value = getTodayString();
                if (catSelect) catSelect.value = 'Bugün';
            } else if (activeCategory === 'Zamanlanmış') {
                // Set tomorrow's date by default
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const year = tomorrow.getFullYear();
                const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                const day = String(tomorrow.getDate()).padStart(2, '0');
                if (dateInput) dateInput.value = `${year}-${month}-${day}`;
                if (catSelect) catSelect.value = 'Zamanlanmış';
            } else {
                if (dateInput) dateInput.value = '';
                if (catSelect) catSelect.value = 'Tümü';
            }
        });
    }

    if (btnCancel && btnToggleForm && formAdd) {
        btnCancel.addEventListener('click', () => {
            formAdd.classList.add('hidden');
            btnToggleForm.classList.remove('hidden');
            formAdd.reset();
        });
    }

    // C. Submit New Reminder Form
    if (formAdd) {
        formAdd.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = formAdd.querySelector('#rem-title').value.trim();
            const description = formAdd.querySelector('#rem-desc').value.trim();
            const due_date = formAdd.querySelector('#rem-date').value || null;
            const category = formAdd.querySelector('#rem-cat').value;

            if (title) {
                try {
                    await addReminder({
                        title,
                        description,
                        due_date,
                        category,
                        is_completed: false
                    });
                    showToast("Anımsatıcı başarıyla eklendi.", "success");
                    formAdd.reset();
                    formAdd.classList.add('hidden');
                    btnToggleForm.classList.remove('hidden');
                    renderRemindersView(container);
                } catch (err) {
                    showToast("Ekleme hatası: " + err.message, "error");
                }
            }
        });
    }

    // D. Item Checkbox Toggles & Delete Clicks using Event Delegation
    const listContainer = container.querySelector('.reminders-list-container');
    if (listContainer) {
        listContainer.addEventListener('click', async (e) => {
            const item = e.target.closest('.reminder-list-item');
            if (!item) return;

            const id = item.dataset.id;
            
            // Check if clicked the checkbox
            const checkbox = e.target.closest('.apple-checkbox-outer');
            if (checkbox) {
                const wasCompleted = checkbox.classList.contains('checked');
                try {
                    await updateReminder(id, { is_completed: !wasCompleted });
                    showToast(!wasCompleted ? "Anımsatıcı tamamlandı." : "Anımsatıcı geri alındı.", "info");
                    renderRemindersView(container);
                } catch (err) {
                    showToast("Güncelleme hatası: " + err.message, "error");
                }
                return;
            }

            // Check if clicked the delete button
            const btnDelete = e.target.closest('.delete-btn');
            if (btnDelete) {
                if (confirm("Bu anımsatıcıyı tamamen silmek istediğinize emin misiniz?")) {
                    try {
                        await deleteReminder(id);
                        showToast("Anımsatıcı silindi.", "success");
                        renderRemindersView(container);
                    } catch (err) {
                        showToast("Silme hatası: " + err.message, "error");
                    }
                }
                return;
            }
        });
    }
}
