/* ============================================
   TRANSITBUILDER - MAP.JS
   Leaflet Karten-Initialisierung und Rendering
   ============================================ */

// ============================================
// GLOBALE VARIABLEN
// ============================================

// Leaflet Map Instanz
let map = null;

// Layer-Gruppen für verschiedene Elemente
const layers = {
    roads: null,      // Straßen-Layer
    railways: null,   // Schienen-Layer
    debug: null       // Debug-Layer (optional)
};

// Karten-Konfiguration
const MAP_CONFIG = {
    // Standard-Startposition (Berlin Mitte)
    defaultCenter: [52.52, 13.405],
    defaultZoom: 14,
    minZoom: 10,
    maxZoom: 19,
    
    // Tile-Server (CartoDB Dark für Game-Look)
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
};

// Polyline-Styles für verschiedene Wegtypen
const ROAD_STYLES = {
    // Hauptstraßen
    primary: {
        color: '#4a5568',
        weight: 4,
        opacity: 0.7
    },
    secondary: {
        color: '#4a5568',
        weight: 3,
        opacity: 0.6
    },
    tertiary: {
        color: '#4a5568',
        weight: 2,
        opacity: 0.5
    },
    residential: {
        color: '#374151',
        weight: 1.5,
        opacity: 0.4
    },
    // Standard für andere Straßen
    default: {
        color: '#374151',
        weight: 1,
        opacity: 0.3
    }
};

const RAILWAY_STYLES = {
    // Straßenbahn
    tram: {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5'
    },
    // U-Bahn
    subway: {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '15, 5'
    },
    // S-Bahn / Regionalbahn
    rail: {
        color: '#10b981',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 4'
    },
    // Stadtbahn / Light Rail
    light_rail: {
        color: '#8b5cf6',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5'
    },
    // Standard
    default: {
        color: '#ef4444',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 5'
    }
};

// ============================================
// KARTEN-INITIALISIERUNG
// ============================================

/**
 * Initialisiert die Leaflet-Karte
 */
function initMap() {
    console.log('🗺️ Initialisiere Karte...');
    
    // Karte erstellen
    map = L.map('map', {
        center: MAP_CONFIG.defaultCenter,
        zoom: MAP_CONFIG.defaultZoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        zoomControl: true,
        attributionControl: true
    });
    
    // Tile-Layer hinzufügen (dunkles Theme)
    L.tileLayer(MAP_CONFIG.tileUrl, {
        attribution: MAP_CONFIG.tileAttribution,
        maxZoom: MAP_CONFIG.maxZoom
    }).addTo(map);
    
    // Layer-Gruppen initialisieren
    layers.roads = L.layerGroup().addTo(map);
    layers.railways = L.layerGroup().addTo(map);
    layers.debug = L.layerGroup(); // Nicht zur Karte hinzugefügt
    
    // Resize-Handler
    window.addEventListener('resize', handleResize);
    
    // Initiales Resize
    handleResize();
    
    // Karten-Events
    setupMapEvents();
    
    console.log('✅ Karte initialisiert');
    
    // OSM-Daten laden
    loadInitialData();
}

/**
 * Behandelt Fenster-Resize
 */
function handleResize() {
    if (map) {
        map.invalidateSize();
    }
}

/**
 * Richtet Karten-Events ein
 */
function setupMapEvents() {
    // Beim Bewegen/Zoomen der Karte
    map.on('moveend', onMapMoveEnd);
    map.on('zoomend', onMapZoomEnd);
    
    // Klick auf Karte (für spätere Interaktionen)
    map.on('click', onMapClick);
}

/**
 * Callback wenn Karte bewegt wurde
 */
function onMapMoveEnd() {
    const center = map.getCenter();
    const bounds = map.getBounds();
    
    // Debug-Info aktualisieren (falls aktiviert)
    updateDebugInfo();
    
    // Hier könnten neue Daten nachgeladen werden
    // wenn sich der Kartenausschnitt ändert
}

/**
 * Callback wenn Zoom geändert wurde
 */
function onMapZoomEnd() {
    const zoom = map.getZoom();
    
    // Bei niedrigem Zoom weniger Details anzeigen
    updateLayerVisibility(zoom);
}

/**
 * Callback bei Klick auf die Karte
 */
function onMapClick(e) {
    const { lat, lng } = e.latlng;
    console.log(`📍 Klick bei: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    
    // Hier später: Haltestellen platzieren, Linien zeichnen, etc.
}

// ============================================
// DATEN LADEN & RENDERN
// ============================================

/**
 * Lädt initiale OSM-Daten für den aktuellen Kartenausschnitt
 */
async function loadInitialData() {
    console.log('📦 Lade OSM-Daten...');
    
    const bounds = map.getBounds();
    
    try {
        // OSM-Daten über Overpass API laden
        const data = await OSMData.loadArea(bounds);
        
        console.log(`✅ Geladen: ${data.roads.length} Straßen, ${data.railways.length} Schienen, ${data.stops.length} Haltestellen`);
        
        // Daten rendern
        renderRoads(data.roads);
        renderRailways(data.railways);
        
        // Haltestellen werden NICHT gerendert, nur gespeichert
        // OSMData.stops enthält die Haltestellen für spätere Logik
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der OSM-Daten:', error);
    }
}

/**
 * Rendert Straßen als Polylines
 * @param {Array} roads - Array von Road-Objekten
 */
function renderRoads(roads) {
    // Bestehende Layer leeren
    layers.roads.clearLayers();
    
    roads.forEach(road => {
        // Style basierend auf Straßentyp
        const style = ROAD_STYLES[road.type] || ROAD_STYLES.default;
        
        // Polyline erstellen
        const polyline = L.polyline(road.coordinates, {
            color: style.color,
            weight: style.weight,
            opacity: style.opacity,
            className: 'road-segment'
        });
        
        // Zur Layer-Gruppe hinzufügen
        layers.roads.addLayer(polyline);
    });
}

/**
 * Rendert Schienen als gestrichelte Polylines
 * @param {Array} railways - Array von Railway-Objekten
 */
function renderRailways(railways) {
    // Bestehende Layer leeren
    layers.railways.clearLayers();
    
    railways.forEach(railway => {
        // Style basierend auf Schienentyp
        const style = RAILWAY_STYLES[railway.type] || RAILWAY_STYLES.default;
        
        // Polyline erstellen
        const polyline = L.polyline(railway.coordinates, {
            color: style.color,
            weight: style.weight,
            opacity: style.opacity,
            dashArray: style.dashArray,
            className: 'railway-segment'
        });
        
        // Zur Layer-Gruppe hinzufügen
        layers.railways.addLayer(polyline);
    });
}

// ============================================
// LAYER MANAGEMENT
// ============================================

/**
 * Aktualisiert Layer-Sichtbarkeit basierend auf Zoom
 * @param {number} zoom - Aktuelle Zoom-Stufe
 */
function updateLayerVisibility(zoom) {
    // Bei niedrigem Zoom weniger Details
    if (zoom < 12) {
        // Nur Hauptstraßen und Schienen
        layers.roads.eachLayer(layer => {
            layer.setStyle({ opacity: 0.2 });
        });
    } else {
        // Volle Details
        layers.roads.eachLayer((layer, index) => {
            // Opacity wiederherstellen - hier vereinfacht
            layer.setStyle({ opacity: 0.5 });
        });
    }
}

/**
 * Zeigt/versteckt einen Layer
 * @param {string} layerName - Name des Layers
 * @param {boolean} visible - Sichtbarkeit
 */
function setLayerVisibility(layerName, visible) {
    if (!layers[layerName]) return;
    
    if (visible) {
        map.addLayer(layers[layerName]);
    } else {
        map.removeLayer(layers[layerName]);
    }
}

// ============================================
// DEBUG FUNKTIONEN
// ============================================

/**
 * Aktualisiert Debug-Informationen
 */
function updateDebugInfo() {
    const debugElement = document.querySelector('.debug-info');
    if (!debugElement) return;
    
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    
    debugElement.innerHTML = `
        Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}<br>
        Zoom: ${zoom}<br>
        Straßen: ${layers.roads.getLayers().length}<br>
        Schienen: ${layers.railways.getLayers().length}<br>
        Haltestellen: ${OSMData.stops.length}
    `;
}

/**
 * Aktiviert Debug-Modus
 */
function enableDebugMode() {
    // Debug-Element erstellen falls nicht vorhanden
    let debugElement = document.querySelector('.debug-info');
    if (!debugElement) {
        debugElement = document.createElement('div');
        debugElement.className = 'debug-info visible';
        document.body.appendChild(debugElement);
    } else {
        debugElement.classList.add('visible');
    }
    
    // Debug-Layer zur Karte hinzufügen
    map.addLayer(layers.debug);
    
    updateDebugInfo();
}

// ============================================
// HILFSFUNKTIONEN
// ============================================

/**
 * Zentriert die Karte auf eine Position
 * @param {number} lat - Breitengrad
 * @param {number} lng - Längengrad
 * @param {number} zoom - Optional: Zoom-Stufe
 */
function centerMap(lat, lng, zoom = null) {
    if (zoom) {
        map.setView([lat, lng], zoom);
    } else {
        map.panTo([lat, lng]);
    }
}

/**
 * Holt die aktuellen Kartengrenzen
 * @returns {Object} Bounds-Objekt
 */
function getMapBounds() {
    return map.getBounds();
}

/**
 * Exportiert die Karten-API für externe Nutzung
 */
const GameMap = {
    init: initMap,
    center: centerMap,
    getBounds: getMapBounds,
    setLayerVisibility,
    enableDebug: enableDebugMode,
    
    // Layer-Referenzen
    get layers() { return layers; },
    get map() { return map; }
};

// ============================================
// INITIALISIERUNG - Wird von Auth.startGame() aufgerufen
// ============================================

// NICHT automatisch starten - Auth-System übernimmt das
// document.addEventListener('DOMContentLoaded', function() {
//     initMap();
// });
