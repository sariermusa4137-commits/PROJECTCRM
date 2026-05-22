// Gayrimenkul CRM - Ortak Arayüz Yardımcıları (Toast ve Modal Yönetimi)

// 1. Toast Notifications
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon based on type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md" style="color:#10b981;"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md" style="color:#ef4444;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md" style="color:#f59e0b;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-md" style="color:#6366f1;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
    
    toast.innerHTML = `
        ${iconSvg}
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.25s reverse ease-out forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

// 2. Modal Management
let activeCloseCallback = null;

export function openModal(title, contentHtml, onCloseCallback = null) {
    const modal = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const closeBtn = document.getElementById('modal-close');
    
    if (!modal || !titleEl || !bodyEl) return;
    
    titleEl.textContent = title;
    bodyEl.innerHTML = contentHtml;
    
    modal.classList.remove('hidden');
    modal.style.opacity = '1';
    
    activeCloseCallback = onCloseCallback;
    
    // Add close listener
    const closeHandler = () => {
        closeModal();
    };
    
    closeBtn.onclick = closeHandler;
    
    // Close on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
}

export function closeModal() {
    const modal = document.getElementById('modal-container');
    if (!modal) return;
    
    modal.style.opacity = '0';
    modal.classList.add('hidden');
    
    if (activeCloseCallback) {
        activeCloseCallback();
        activeCloseCallback = null;
    }
}
export function closeActiveModal() {
    closeModal();
}
