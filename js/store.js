// PROJECTCRM - Bulut Veri Deposu (SQLite REST API Backend Entegrasyonu)
import { showToast } from './components/ui.js';

// App State
export const state = {
    isDemoMode: false,
    currentUser: null,
    agency: null,
    
    // Data Caches
    portfolios: [],
    customers: [],
    meetings: [],
    locations: [],
    todos: [],
    activities: [],
    deals: [],
    regionNews: [],
    
    // Callbacks for UI updates
    listeners: new Set()
};

let pollingInterval = null;

// Initialize Application State
export async function initStore() {
    state.isDemoMode = false;
    const userId = localStorage.getItem("projectcrm_user_id");
    const url = userId ? `/api/auth/status?userId=${userId}` : '/api/auth/status';
    
    try {
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            state.currentUser = data.user;
            state.agency = data.agency;
            
            // Sync userId back to localStorage
            if (data.user && data.user.uid) {
                localStorage.setItem("projectcrm_user_id", data.user.uid);
            }
            
            if (state.agency && state.agency.id) {
                await fetchAllData(state.agency.id);
                startPolling();
            }
        } else {
            // Clear invalid/stale user session (e.g. database reset)
            localStorage.removeItem("projectcrm_user_id");
            state.currentUser = null;
            state.agency = null;
        }
    } catch (e) {
        console.error("initStore error:", e);
    }
    notify();
}

// Fetch all data from backend for this agency
export async function fetchAllData(agencyId) {
    const res = await apiFetch(`/api/data?agencyId=${agencyId}`);
    if (!res.ok) {
        throw new Error("Veriler sunucudan alınamadı.");
    }
    const data = await res.json();
    
    // Check if anything has actually changed in the caches to prevent layout thrashing and focus loss
    const changed = JSON.stringify(state.portfolios) !== JSON.stringify(data.portfolios) ||
                    JSON.stringify(state.customers) !== JSON.stringify(data.customers) ||
                    JSON.stringify(state.meetings) !== JSON.stringify(data.meetings) ||
                    JSON.stringify(state.todos) !== JSON.stringify(data.todos) ||
                    JSON.stringify(state.activities) !== JSON.stringify(data.activities) ||
                    JSON.stringify(state.deals) !== JSON.stringify(data.deals) ||
                    JSON.stringify(state.locations) !== JSON.stringify(data.locations);
                    
    if (changed) {
        state.portfolios = (data.portfolios || []).map(item => syncFields('portfolios', item));
        state.customers = (data.customers || []).map(item => syncFields('customers', item));
        state.meetings = (data.meetings || []).map(item => syncFields('meetings', item));
        state.todos = (data.todos || []).map(item => syncFields('todos', item));
        state.activities = (data.activities || []).map(item => syncFields('activities', item));
        state.deals = (data.deals || []).map(item => syncFields('deals', item));
        state.locations = (data.locations || []).map(item => syncFields('locations', item));
        notify();
    }
}

// Start polling backend every 5 seconds for updates
export function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        if (state.agency && state.agency.id) {
            try {
                await fetchAllData(state.agency.id);
            } catch (e) {
                console.error("Senkronizasyon hatası (polling):", e);
            }
        }
    }, 5000);
}

// Stop polling backend
export function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Subscribe to store updates
export function subscribe(callback) {
    state.listeners.add(callback);
    return () => state.listeners.delete(callback);
}

// Broadcast updates to all listeners
function notify() {
    for (const listener of state.listeners) {
        listener();
    }
}

// ----------------- BUSINESS ACTIONS -----------------

// Login or register user via Google Login Simulator
export async function loginWithGoogleSimulator(email, name, picture) {
    const res = await fetch('/api/auth/google/login-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, picture })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Google simülasyon girişi başarısız oldu.");
    }
    const data = await res.json();
    state.currentUser = data.user;
    state.agency = data.agency;
    
    localStorage.setItem("projectcrm_user_id", data.user.uid);
    
    if (state.agency && state.agency.id) {
        await fetchAllData(state.agency.id);
        startPolling();
    }
    notify();
}

// Login or register local user
export async function loginWithLocalUser(email, displayName) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Giriş yapılamadı.");
    }
    const data = await res.json();
    state.currentUser = data.user;
    state.agency = data.agency;
    
    localStorage.setItem("projectcrm_user_id", data.user.uid);
    
    if (state.agency && state.agency.id) {
        await fetchAllData(state.agency.id);
        startPolling();
    }
    notify();
}

// Logout
export async function logout() {
    stopPolling();
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        console.error("Backend logout error:", e);
    }
    localStorage.removeItem("projectcrm_user_id");
    state.currentUser = null;
    state.agency = null;
    state.portfolios = [];
    state.customers = [];
    state.meetings = [];
    state.todos = [];
    state.activities = [];
    state.deals = [];
    state.locations = [];
    notify();
}

// Wrapper for fetch that catches 401 Unauthorized status codes
export async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        await logout();
        window.location.hash = "#auth";
        showToast("Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.", "error");
        throw new Error("Yetkisiz erişim. Oturum kapatıldı.");
    }
    return res;
}

// Update Current User
export function updateCurrentUser(user) {
    state.currentUser = user;
    notify();
}


// Create Agency
export async function createAgency(agencyName) {
    if (!state.currentUser) throw new Error("Giriş yapılması gerekir.");
    const res = await apiFetch('/api/agency/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.currentUser.uid, name: agencyName })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Acente oluşturulamadı.");
    }
    const data = await res.json();
    state.agency = data.agency;
    state.currentUser.agencyId = data.agency.id;
    
    await fetchAllData(data.agency.id);
    startPolling();
    
    await logActivity(`${agencyName} acentesi oluşturuldu.`);
    notify();
    return data.agency.id;
}

// Join Agency
export async function joinAgency(agencyCode) {
    if (!state.currentUser) throw new Error("Giriş yapılması gerekir.");
    const res = await apiFetch('/api/agency/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.currentUser.uid, agencyCode })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Acenteye katılım başarısız.");
    }
    const data = await res.json();
    state.agency = data.agency;
    state.currentUser.agencyId = data.agency.id;
    
    await fetchAllData(data.agency.id);
    startPolling();
    
    await logActivity(`${data.agency.name} acentesine katıldı.`);
    notify();
    return true;
}

// Log generic activity feed
async function logActivity(actionText) {
    if (!state.agency || !state.currentUser) return;
    const item = {
        agencyId: state.agency.id,
        userName: state.currentUser.displayName,
        userPhoto: state.currentUser.photoURL || "",
        action: actionText,
        time: new Date().toISOString()
    };
    
    try {
        const res = await apiFetch('/api/data/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        if (res.ok) {
            const newAct = await res.json();
            state.activities.unshift(newAct);
            notify();
        }
    } catch (e) {
        console.error("Activity logging failed:", e);
    }
}

// Helper to sync old and new field names for backward compatibility
function syncFields(collectionName, data) {
    if (!data) return data;
    if (collectionName === 'portfolios') {
        // Sync rooms <-> oda_sayisi
        if (data.rooms !== undefined) data.oda_sayisi = data.rooms;
        else if (data.oda_sayisi !== undefined) data.rooms = data.oda_sayisi;
        
        // Sync price <-> fiyat
        if (data.price !== undefined) data.fiyat = Number(data.price);
        else if (data.fiyat !== undefined) data.price = Number(data.fiyat);
        
        // Sync district/neighborhood <-> bolge
        if (data.district !== undefined) data.bolge = data.district;
        else if (data.bolge !== undefined) {
            data.district = data.bolge;
            data.neighborhood = "";
        }
        
        // Sync propertyType <-> konut_tipi
        if (data.propertyType !== undefined) data.konut_tipi = data.propertyType;
        else if (data.konut_tipi !== undefined) data.propertyType = data.konut_tipi;
    } else if (collectionName === 'customers') {
        // Sync searchRooms <-> aralanan_oda_sayisi
        if (data.searchRooms !== undefined) data.aralanan_oda_sayisi = data.searchRooms;
        else if (data.aralanan_oda_sayisi !== undefined) data.searchRooms = data.aralanan_oda_sayisi;
        
        // Sync budget <-> maksimum_butce
        if (data.budget !== undefined) data.maksimum_butce = Number(data.budget);
        else if (data.maksimum_butce !== undefined) data.budget = Number(data.maksimum_butce);
        
        // Sync searchLocation <-> hedef_bolge
        if (data.searchLocation !== undefined) data.hedef_bolge = data.searchLocation;
        else if (data.hedef_bolge !== undefined) data.searchLocation = data.hedef_bolge;
        
        // Sync searchPropertyType <-> konut_tipi
        if (data.searchPropertyType !== undefined) data.konut_tipi = data.searchPropertyType;
        else if (data.konut_tipi !== undefined) data.searchPropertyType = data.konut_tipi;
    }
    return data;
}

// ----------------- CRUD ACTIONS -----------------

// Create Data
export async function addRecord(collectionName, record) {
    if (!state.agency) throw new Error("Acente bilgisi bulunamadı.");
    record.agencyId = state.agency.id;
    record.createdById = state.currentUser.uid;
    record.createdByName = state.currentUser.displayName;
    record.createdByPhoto = state.currentUser.photoURL || "";
    record.createdAt = new Date().toISOString();
    
    // Sync fields for portfolios and customers
    record = syncFields(collectionName, record);
    
    const res = await apiFetch(`/api/data/${collectionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Kayıt eklenemedi.");
    }
    const newRecord = await res.json();
    state[collectionName].unshift(newRecord);
    
    let action = `${newRecord.title || newRecord.name} kaydı oluşturuldu.`;
    if (collectionName === "todos") action = `"${newRecord.task}" görevi eklendi.`;
    await logActivity(action);
    notify();
}

// Update Data
export async function updateRecord(collectionName, id, updatedFields) {
    updatedFields = syncFields(collectionName, updatedFields);
    
    const res = await apiFetch(`/api/data/${collectionName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Kayıt güncellenemedi.");
    }
    const updatedRecord = await res.json();
    const index = state[collectionName].findIndex(item => item.id === id);
    if (index !== -1) {
        state[collectionName][index] = updatedRecord;
        notify();
    }
}

// Delete Data
export async function deleteRecord(collectionName, id) {
    const record = state[collectionName].find(item => item.id === id);
    let title = record ? (record.title || record.name || record.task) : "kayıt";
    
    const res = await apiFetch(`/api/data/${collectionName}/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Kayıt silinemedi.");
    }
    state[collectionName] = state[collectionName].filter(item => item.id !== id);
    
    await logActivity(`"${title}" silindi.`);
    notify();
}

// ----------------- PRIVACY & AUTHORIZATION -----------------

export function canViewPhone(record) {
    if (!state.currentUser) return false;
    const email = (state.currentUser.email || "").toLowerCase();
    const isAdmin = email.includes("admin") || email === "musa@danisman.com";
    if (isAdmin) return true;
    if (record && record.createdById === state.currentUser.uid) return true;
    return false;
}

export function maskPhoneNumber(phone) {
    if (!phone) return "";
    const cleanPhone = phone.trim();
    const parts = cleanPhone.split(" ");
    if (parts.length >= 2) {
        return `${parts[0]} ${parts[1]} *** ** **`;
    }
    return cleanPhone.substring(0, 7) + " *** ** **";
}

// ----------------- TIMELINE AUTOMATIC LOGGING -----------------

export async function logDealEventToTimelines(deal, eventTitle, eventNotes, eventType = "Süreç") {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    // Log for Buyer
    if (deal.buyerId) {
        await addRecord("meetings", {
            customerId: deal.buyerId,
            customerName: deal.buyerName,
            title: eventTitle,
            type: eventType,
            date: todayStr,
            time: nowTimeStr,
            notes: eventNotes,
            kanbanStage: "Süreç Yönetimi"
        });
    }
    
    // Log for Seller
    if (deal.sellerId) {
        await addRecord("meetings", {
            customerId: deal.sellerId,
            customerName: deal.sellerName,
            title: eventTitle,
            type: eventType,
            date: todayStr,
            time: nowTimeStr,
            notes: eventNotes,
            kanbanStage: "Süreç Yönetimi"
        });
    }
}

// ----------------- NEWS SCRAPER SIMULATION -----------------

function generateNewsTemplates(regionName) {
    const regions = regionName ? [regionName] : ["Kartal", "Maltepe", "Pendik"];
    const templates = [];
    
    regions.forEach(region => {
        templates.push({
            region: region,
            source: "Emlak Endeksi",
            title: `${region} Konut Endeksi Yükselişte`,
            content: `${region} bölgesinde konut fiyat endeksi son verilere göre geçen aya oranla %3.5 artış gösterdi. Ulaşım yatırımlarının tamamlanmasıyla bölgedeki kiralık ve satılık daire talebi son 1 yılın en yüksek seviyesine ulaştı. Bölgedeki amortisman süresi ise ortalama 18-20 yıl bandına geriledi.`,
            fallbackSummary: `${region}'da konut fiyat endeksi ulaşım yatırımları ve artan talep nedeniyle geçen aya göre %3.5 yükseldi. Ortalama amortisman süresi 18-20 yıla gerileyerek yatırım cazibesini artırdı.`
        });
        
        templates.push({
            region: region,
            source: "Belediye İmar İşleri",
            title: `${region} Kentsel Dönüşüm Revizyonu`,
            content: `${region} Belediyesi Meclisi tarafından kabul edilen yeni imar planı revizyonu ile riskli yapıların dönüştürülmesi sürecinde ek emsal hakları tanındı. Bu karar, bölgedeki inşaat firmalarının yeni projelere başlamasını hızlandıracak ve stok sıkıntısını çözecek.`,
            fallbackSummary: `${region} Belediyesi riskli yapıların kentsel dönüşümü için ek emsal hakları tanıyan yeni imar revizyonunu onayladı. Bu karar yeni projeleri hızlandıracak.`
        });
        
        templates.push({
            region: region,
            source: "Gayrimenkul Analisti (Barış Soydan)",
            title: "Barış Soydan'dan Bölge Değerlendirmesi",
            content: `Gazeteci Barış Soydan, son yayınında ${region} bölgesindeki konut stoku ve talep dengesini inceledi. Soydan: "${region}, İstanbul'un çeperlerinden merkezine ulaşım kolaylığıyla en çok tercih edilen kentsel dönüşüm alanlarından biri haline geldi. Ancak yüksek kredi faizleri sebebiyle peşin parası olan alıcılar için ciddi indirim fırsatları sunuyor," dedi.`,
            fallbackSummary: `Barış Soydan, ${region} bölgesinin metro/ulaşım avantajıyla öne çıktığını, fakat yüksek faizler nedeniyle nakit alıcıların ciddi pazarlık ve indirim şansına sahip olduğunu belirtti.`
        });
        
        templates.push({
            region: region,
            source: "Ekonomist Yorumu (Selcoin)",
            title: "Selcoin'den Konut ve Nakit Analizi",
            content: `Ekonomist Selcoin, gayrimenkul piyasasındaki son gelişmeleri değerlendirirken ${region} gibi gelişmekte olan lokasyonlara dikkat çekti. Selcoin, "Enflasyon karşısında gayrimenkulde reel bir erime yaşanıyor gibi görünse de, ${region} gibi dinamik lokasyonlarda uzun vadede değerini kaybetmeyecek fırsat daireler bulunuyor. Nakitte bekleyenlerin pazarlık gücünü kullanma vakti," açıklamasında bulundu.`,
            fallbackSummary: `Selcoin, ${region} gibi gelişen bölgelerde enflasyon kaynaklı reel fiyat düşüşlerinin uzun vadeli yatırım için dip fiyatlardan alım ve pazarlık fırsatı sunduğunu ifade etti.`
        });
    });
    
    return templates.sort(() => 0.5 - Math.random()).slice(0, 4);
}

export async function summarizeNewsWithAI(content) {
    const apiKey = localStorage.getItem("crm_gemini_api_key");
    if (!apiKey) {
        throw new Error("API anahtarı bulunamadı.");
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `Lütfen aşağıdaki emlak haber metnini 2-3 cümlelik çok net, profesyonel, Türkçe bir "hap özete" dönüştür. Doğrudan özeti döndür, açıklama veya ek metin ekleme:\n\n${content}` }]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error(`Gemini API hatası: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text.trim();
    }
    throw new Error("Gemini API'den geçersiz yanıt formatı alındı.");
}

export async function triggerNewsScraper(regionName) {
    state.regionNews = [];
    notify();
    return [];
}

// ----------------- MATCHING ALGORITHMS -----------------

// Match Portfolios with Buyers
export function getMatchesForPortfolio(portfolio) {
    if (!portfolio) return [];
    
    const pFiyat = Number(portfolio.fiyat) || Number(portfolio.price) || 0;
    const pOda = portfolio.oda_sayisi || portfolio.rooms;
    const pBolge = (portfolio.bolge || portfolio.district || "").toLowerCase().trim();
    const pTip = portfolio.konut_tipi || portfolio.propertyType;
    
    return state.customers.filter(customer => {
        if (customer.type !== "Alıcı") return false;
        
        // 1. Budget check (buyer max budget >= portfolio price)
        const cButce = Number(customer.maksimum_butce) || Number(customer.budget) || 0;
        if (cButce < pFiyat) return false;
        
        // 2. Region check (hedef_bolge matches portfolio bolge)
        const cBolge = (customer.hedef_bolge || customer.searchLocation || "").toLowerCase().trim();
        if (cBolge && pBolge) {
            if (!cBolge.includes(pBolge) && !pBolge.includes(cBolge)) return false;
        }
        
        // 3. Room check (aranan_oda_sayisi covers portfolio rooms)
        const cOdaStr = customer.aralanan_oda_sayisi || customer.searchRooms || "";
        if (cOdaStr && pOda) {
            const roomsList = cOdaStr.split(",").map(r => r.trim().toLowerCase());
            if (!roomsList.includes(pOda.toLowerCase())) return false;
        }
        
        // 4. Property type check
        const cTip = customer.konut_tipi || customer.searchPropertyType;
        if (cTip && pTip) {
            if (cTip.toLowerCase().trim() !== pTip.toLowerCase().trim()) return false;
        }
        
        return true;
    });
}

// Match Buyers with Portfolios
export function getMatchesForCustomer(customer) {
    if (!customer || customer.type !== "Alıcı") return [];
    
    const cButce = Number(customer.maksimum_butce) || Number(customer.budget) || 0;
    const cBolge = (customer.hedef_bolge || customer.searchLocation || "").toLowerCase().trim();
    const cOdaStr = customer.aralanan_oda_sayisi || customer.searchRooms || "";
    const cTip = customer.konut_tipi || customer.searchPropertyType;
    
    return state.portfolios.filter(portfolio => {
        const pFiyat = Number(portfolio.fiyat) || Number(portfolio.price) || 0;
        const pOda = portfolio.oda_sayisi || portfolio.rooms;
        const pBolge = (portfolio.bolge || portfolio.district || "").toLowerCase().trim();
        const pTip = portfolio.konut_tipi || portfolio.propertyType;
        
        // 1. Budget check
        if (cButce < pFiyat) return false;
        
        // 2. Region check
        if (cBolge && pBolge) {
            if (!cBolge.includes(pBolge) && !pBolge.includes(cBolge)) return false;
        }
        
        // 3. Room check
        if (cOdaStr && pOda) {
            const roomsList = cOdaStr.split(",").map(r => r.trim().toLowerCase());
            if (!roomsList.includes(pOda.toLowerCase())) return false;
        }
        
        // 4. Property type check
        if (cTip && pTip) {
            if (cTip.toLowerCase().trim() !== pTip.toLowerCase().trim()) return false;
        }
        
        return true;
    });
}

// Get birthday notifications (approaching in next 7 days)
export function getApproachingBirthdays() {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    return state.customers.filter(customer => {
        if (!customer.birthDate) return false;
        
        const dob = new Date(customer.birthDate);
        const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
        
        let bday = birthdayThisYear;
        if (birthdayThisYear < today) {
            const isToday = today.getDate() === birthdayThisYear.getDate() && today.getMonth() === birthdayThisYear.getMonth();
            if (!isToday) {
                bday = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
            }
        }
        
        const diffTime = bday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return (diffDays >= 0 && diffDays <= 7) || (today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth());
    });
}

// Get contract expirations (approaching in next 15 days, or already expired)
export function getApproachingContractExpirations() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warnings = [];

    // 1. Scan portfolios
    state.portfolios.forEach(p => {
        if (p.sozlesme_bitis_tarihi) {
            const expDate = new Date(p.sozlesme_bitis_tarihi);
            expDate.setHours(0, 0, 0, 0);
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 15) {
                warnings.push({
                    id: p.id,
                    type: 'portfolio',
                    title: p.title,
                    daysLeft: diffDays,
                    expirationDate: p.sozlesme_bitis_tarihi
                });
            }
        }
    });

    // 2. Scan seller customers
    state.customers.forEach(c => {
        if (c.type === 'Satıcı' && c.sozlesme_bitis_tarihi) {
            const expDate = new Date(c.sozlesme_bitis_tarihi);
            expDate.setHours(0, 0, 0, 0);
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 15) {
                warnings.push({
                    id: c.id,
                    type: 'customer',
                    title: c.name,
                    daysLeft: diffDays,
                    expirationDate: c.sozlesme_bitis_tarihi
                });
            }
        }
    });

    return warnings.sort((a, b) => a.daysLeft - b.daysLeft);
}
