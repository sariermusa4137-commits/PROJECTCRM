// Gayrimenkul CRM - Leaflet.js Harita Entegrasyon Yardımcısı

let mapInstance = null;
let markersGroup = null;
let selectMarker = null;

// Initialize a standard view map
export function initMap(containerId, center = [40.9800, 29.0800], zoom = 13) {
    // If map already exists, remove it first
    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
        markersGroup = null;
        selectMarker = null;
    }
    
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    // Create map instance
    mapInstance = L.map(containerId).setView(center, zoom);
    
    // Premium Dark Mode Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(mapInstance);
    
    markersGroup = L.layerGroup().addTo(mapInstance);
    
    return mapInstance;
}

// Add markers for all portfolios on the map
export function renderPortfolioMarkers(portfolios, onMarkerClick) {
    if (!mapInstance || !markersGroup) return;
    
    // Clear old markers
    markersGroup.clearLayers();
    
    const bounds = [];
    
    portfolios.forEach(p => {
        if (!p.latitude || !p.longitude) return;
        
        // Define color based on status
        let color = '#6366f1'; // Indigo
        if (p.status === 'Rezerve') color = '#f59e0b'; // Amber
        if (p.status === 'Satıldı' || p.status === 'Kiralandı') color = '#64748b'; // Muted
        if (p.type === 'Kiralık') color = '#10b981'; // Emerald
        
        // Custom SVG Marker Icon
        const svgIcon = L.divIcon({
            html: `
                <div style="
                    background-color: ${color};
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 10px ${color};
                    transform: translate(-3px, -3px);
                "></div>
            `,
            className: 'custom-map-marker',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
        
        const marker = L.marker([p.latitude, p.longitude], { icon: svgIcon });
        
        // Create custom popup HTML
        const formatPrice = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(p.price);
        
        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; width: 180px; padding: 4px;">
                <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&auto=format&fit=crop&q=60'}" 
                     style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;">
                <h4 style="margin: 0 0 4px 0; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.title}</h4>
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8;">${p.district}, ${p.neighborhood}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; font-weight: 700; color: #10b981;">${formatPrice}</span>
                    <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: #94a3b8;">${p.rooms}</span>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent, {
            closeButton: false,
            className: 'dark-popup'
        });
        
        marker.on('click', () => {
            if (onMarkerClick) onMarkerClick(p);
        });
        
        markersGroup.addLayer(marker);
        bounds.push([p.latitude, p.longitude]);
    });
    
    // Fit map view to markers bounds
    if (bounds.length > 0 && mapInstance) {
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Enable clicking on map to choose a position in forms
export function enableLocationSelection(onSelect) {
    if (!mapInstance) return;
    
    // Remove existing select marker if any
    if (selectMarker) {
        mapInstance.removeLayer(selectMarker);
        selectMarker = null;
    }
    
    mapInstance.on('click', (e) => {
        const { lat, lng } = e.latlng;
        
        if (selectMarker) {
            selectMarker.setLatLng(e.latlng);
        } else {
            const svgIcon = L.divIcon({
                html: `
                    <div style="
                        background-color: #6366f1;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        border: 3px solid #ffffff;
                        box-shadow: 0 0 15px #6366f1;
                        transform: translate(-4px, -4px);
                    "></div>
                `,
                className: 'select-map-marker',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            selectMarker = L.marker(e.latlng, { icon: svgIcon }).addTo(mapInstance);
        }
        
        if (onSelect) {
            onSelect(lat, lng);
        }
    });
}

// Manually position select marker (e.g. when editing)
export function setSelectMarkerPosition(lat, lng) {
    if (!mapInstance) return;
    
    const latlng = [lat, lng];
    mapInstance.setView(latlng, 15);
    
    if (selectMarker) {
        selectMarker.setLatLng(latlng);
    } else {
        const svgIcon = L.divIcon({
            html: `
                <div style="
                    background-color: #6366f1;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 3px solid #ffffff;
                    box-shadow: 0 0 15px #6366f1;
                    transform: translate(-4px, -4px);
                "></div>
            `,
            className: 'select-map-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        selectMarker = L.marker(latlng, { icon: svgIcon }).addTo(mapInstance);
    }
}
