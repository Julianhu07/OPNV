/* ============================================
   TRANSITBUILDER - OSMDATA.JS
   OSM-Datenlogik: Laden, Parsen, Speichern
   ============================================ */

// ============================================
// DATENSTRUKTUREN
// ============================================

/**
 * ROAD-OBJEKT:
 * {
 *   id: number,           // OSM Way ID
 *   type: string,         // Straßentyp (primary, secondary, residential, etc.)
 *   name: string,         // Straßenname (falls vorhanden)
 *   maxSpeed: number,     // Höchstgeschwindigkeit in km/h
 *   coordinates: Array,   // [[lat, lng], [lat, lng], ...]
 *   lanes: number,        // Anzahl Fahrspuren (falls bekannt)
 *   oneway: boolean       // Einbahnstraße?
 * }
 * 
 * RAILWAY-OBJEKT:
 * {
 *   id: number,           // OSM Way ID
 *   type: string,         // Schienentyp (tram, subway, rail, light_rail)
 *   name: string,         // Linienname (falls vorhanden)
 *   maxSpeed: number,     // Höchstgeschwindigkeit
 *   coordinates: Array,   // [[lat, lng], [lat, lng], ...]
 *   electrified: boolean  // Elektrifiziert?
 * }
 * 
 * STOP-OBJEKT:
 * {
 *   id: number,           // OSM Node ID
 *   type: string,         // bus_stop, tram_stop, platform
 *   name: string,         // Haltestellenname
 *   coordinates: Array,   // [lat, lng]
 *   routes: Array,        // Linien die hier halten (falls bekannt)
 *   shelter: boolean      // Überdachung vorhanden?
 * }
 */

// ============================================
// OVERPASS API KONFIGURATION
// ============================================

const OVERPASS_CONFIG = {
    // Overpass API Endpunkte (Fallbacks)
    endpoints: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ],
    currentEndpoint: 0,
    
    // Timeout in Millisekunden
    timeout: 30000,
    
    // Maximale Fläche für Abfragen (in Grad²)
    maxArea: 0.01
};

// ============================================
// OSM DATA MODUL
// ============================================

const OSMData = {
    // Gespeicherte Daten
    roads: [],
    railways: [],
    stops: [],
    
    // Cache für bereits geladene Bereiche
    loadedAreas: [],
    
    // ============================================
    // HAUPTFUNKTIONEN
    // ============================================
    
    /**
     * Lädt OSM-Daten für einen Kartenbereich
     * @param {LatLngBounds} bounds - Leaflet Bounds-Objekt
     * @returns {Object} - { roads, railways, stops }
     */
    async loadArea(bounds) {
        const bbox = this.boundsToBBox(bounds);
        
        // Prüfen ob Bereich bereits geladen
        if (this.isAreaLoaded(bbox)) {
            console.log('📦 Bereich bereits im Cache');
            return {
                roads: this.roads,
                railways: this.railways,
                stops: this.stops
            };
        }
        
        try {
            // Overpass-Query erstellen
            const query = this.buildQuery(bbox);
            
            // Daten abrufen
            const rawData = await this.fetchOverpass(query);
            
            // Daten parsen
            const parsedData = this.parseOverpassData(rawData);
            
            // In lokalen Speicher übernehmen
            this.roads = [...this.roads, ...parsedData.roads];
            this.railways = [...this.railways, ...parsedData.railways];
            this.stops = [...this.stops, ...parsedData.stops];
            
            // Duplikate entfernen
            this.removeDuplicates();
            
            // Bereich als geladen markieren
            this.loadedAreas.push(bbox);
            
            return parsedData;
            
        } catch (error) {
            console.error('Fehler beim Laden der OSM-Daten:', error);
            
            // Fallback: Leere Daten zurückgeben
            return {
                roads: [],
                railways: [],
                stops: []
            };
        }
    },
    
    /**
     * Konvertiert Leaflet Bounds zu BBox-String
     * @param {LatLngBounds} bounds
     * @returns {string} - "south,west,north,east"
     */
    boundsToBBox(bounds) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        return `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
    },
    
    /**
     * Prüft ob ein Bereich bereits geladen wurde
     * @param {string} bbox
     * @returns {boolean}
     */
    isAreaLoaded(bbox) {
        // Vereinfachte Prüfung - könnte verfeinert werden
        return this.loadedAreas.includes(bbox);
    },
    
    // ============================================
    // OVERPASS QUERY
    // ============================================
    
    /**
     * Erstellt die Overpass-Query
     * @param {string} bbox - Bounding Box
     * @returns {string} - Overpass QL Query
     */
    buildQuery(bbox) {
        return `
            [out:json][timeout:25][bbox:${bbox}];
            (
                // Straßen - Hauptkategorien
                way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street)$"];
                
                // Schienen
                way["railway"~"^(tram|subway|light_rail|rail)$"];
                
                // Haltestellen (Nodes)
                node["highway"="bus_stop"];
                node["public_transport"="platform"];
                node["railway"="tram_stop"];
                node["railway"="station"];
                node["railway"="halt"];
            );
            out body;
            >;
            out skel qt;
        `;
    },
    
    /**
     * Führt Overpass-Anfrage aus
     * @param {string} query
     * @returns {Object} - Rohe OSM-Daten
     */
    async fetchOverpass(query) {
        const endpoint = OVERPASS_CONFIG.endpoints[OVERPASS_CONFIG.currentEndpoint];
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `data=${encodeURIComponent(query)}`
        });
        
        if (!response.ok) {
            // Bei Fehler: Nächsten Endpunkt versuchen
            OVERPASS_CONFIG.currentEndpoint = 
                (OVERPASS_CONFIG.currentEndpoint + 1) % OVERPASS_CONFIG.endpoints.length;
            throw new Error(`Overpass API Fehler: ${response.status}`);
        }
        
        return await response.json();
    },
    
    // ============================================
    // DATEN PARSEN
    // ============================================
    
    /**
     * Parst die rohen Overpass-Daten
     * @param {Object} data - Rohe Overpass-Antwort
     * @returns {Object} - { roads, railways, stops }
     */
    parseOverpassData(data) {
        const roads = [];
        const railways = [];
        const stops = [];
        
        // Node-Lookup für Koordinaten erstellen
        const nodes = {};
        data.elements.forEach(element => {
            if (element.type === 'node') {
                nodes[element.id] = [element.lat, element.lon];
                
                // Prüfen ob es eine Haltestelle ist
                if (element.tags) {
                    const stop = this.parseStop(element);
                    if (stop) stops.push(stop);
                }
            }
        });
        
        // Ways verarbeiten
        data.elements.forEach(element => {
            if (element.type === 'way' && element.tags) {
                // Koordinaten aus Nodes zusammensetzen
                const coordinates = element.nodes
                    .map(nodeId => nodes[nodeId])
                    .filter(coord => coord !== undefined);
                
                if (coordinates.length < 2) return;
                
                // Straße oder Schiene?
                if (element.tags.highway) {
                    roads.push(this.parseRoad(element, coordinates));
                } else if (element.tags.railway) {
                    railways.push(this.parseRailway(element, coordinates));
                }
            }
        });
        
        return { roads, railways, stops };
    },
    
    /**
     * Parst einen Straßen-Way
     * @param {Object} element - OSM Way
     * @param {Array} coordinates - Koordinaten
     * @returns {Object} - Road-Objekt
     */
    parseRoad(element, coordinates) {
        const tags = element.tags;
        
        return {
            id: element.id,
            type: tags.highway,
            name: tags.name || '',
            maxSpeed: this.parseMaxSpeed(tags.maxspeed),
            coordinates: coordinates,
            lanes: parseInt(tags.lanes) || 2,
            oneway: tags.oneway === 'yes'
        };
    },
    
    /**
     * Parst einen Schienen-Way
     * @param {Object} element - OSM Way
     * @param {Array} coordinates - Koordinaten
     * @returns {Object} - Railway-Objekt
     */
    parseRailway(element, coordinates) {
        const tags = element.tags;
        
        return {
            id: element.id,
            type: tags.railway,
            name: tags.name || tags.ref || '',
            maxSpeed: this.parseMaxSpeed(tags.maxspeed),
            coordinates: coordinates,
            electrified: tags.electrified !== 'no'
        };
    },
    
    /**
     * Parst eine Haltestelle
     * @param {Object} element - OSM Node
     * @returns {Object|null} - Stop-Objekt oder null
     */
    parseStop(element) {
        const tags = element.tags;
        
        // Typ bestimmen
        let type = null;
        if (tags.highway === 'bus_stop') type = 'bus_stop';
        else if (tags.railway === 'tram_stop') type = 'tram_stop';
        else if (tags.railway === 'station') type = 'station';
        else if (tags.railway === 'halt') type = 'halt';
        else if (tags.public_transport === 'platform') type = 'platform';
        
        if (!type) return null;
        
        return {
            id: element.id,
            type: type,
            name: tags.name || 'Unbenannt',
            coordinates: [element.lat, element.lon],
            routes: this.parseRoutes(tags),
            shelter: tags.shelter === 'yes'
        };
    },
    
    /**
     * Parst Geschwindigkeitsangabe
     * @param {string} maxspeed - OSM maxspeed Tag
     * @returns {number} - Geschwindigkeit in km/h
     */
    parseMaxSpeed(maxspeed) {
        if (!maxspeed) return 50; // Standard
        
        // "50" oder "50 km/h"
        const match = maxspeed.match(/(\d+)/);
        if (match) {
            return parseInt(match[1]);
        }
        
        // Spezielle Werte
        if (maxspeed === 'walk') return 5;
        if (maxspeed === 'none') return 999;
        
        return 50;
    },
    
    /**
     * Parst Linien/Routen aus Tags
     * @param {Object} tags
     * @returns {Array} - Liniennummern
     */
    parseRoutes(tags) {
        const routes = [];
        
        // ref-Tag enthält oft Liniennummern
        if (tags.ref) {
            routes.push(...tags.ref.split(';').map(r => r.trim()));
        }
        
        // route_ref für Bushaltestellen
        if (tags.route_ref) {
            routes.push(...tags.route_ref.split(';').map(r => r.trim()));
        }
        
        return [...new Set(routes)]; // Duplikate entfernen
    },
    
    // ============================================
    // HILFSFUNKTIONEN
    // ============================================
    
    /**
     * Entfernt Duplikate aus den gespeicherten Daten
     */
    removeDuplicates() {
        const seenRoads = new Set();
        this.roads = this.roads.filter(road => {
            if (seenRoads.has(road.id)) return false;
            seenRoads.add(road.id);
            return true;
        });
        
        const seenRailways = new Set();
        this.railways = this.railways.filter(railway => {
            if (seenRailways.has(railway.id)) return false;
            seenRailways.add(railway.id);
            return true;
        });
        
        const seenStops = new Set();
        this.stops = this.stops.filter(stop => {
            if (seenStops.has(stop.id)) return false;
            seenStops.add(stop.id);
            return true;
        });
    },
    
    /**
     * Findet Haltestellen in der Nähe einer Koordinate
     * @param {number} lat
     * @param {number} lng
     * @param {number} radius - Radius in Metern
     * @returns {Array} - Nahegelegene Haltestellen
     */
    findNearbyStops(lat, lng, radius = 100) {
        return this.stops.filter(stop => {
            const distance = this.calculateDistance(
                lat, lng,
                stop.coordinates[0], stop.coordinates[1]
            );
            return distance <= radius;
        });
    },
    
    /**
     * Berechnet Entfernung zwischen zwei Koordinaten (Haversine)
     * @returns {number} - Entfernung in Metern
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Erdradius in Metern
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },
    
    /**
     * Konvertiert Grad zu Radiant
     */
    toRad(deg) {
        return deg * (Math.PI / 180);
    },
    
    /**
     * Leert alle gespeicherten Daten
     */
    clear() {
        this.roads = [];
        this.railways = [];
        this.stops = [];
        this.loadedAreas = [];
    },
    
    /**
     * Gibt Statistiken zurück
     * @returns {Object}
     */
    getStats() {
        return {
            roads: this.roads.length,
            railways: this.railways.length,
            stops: this.stops.length,
            loadedAreas: this.loadedAreas.length
        };
    }
};

// ============================================
// EXPORT FÜR GLOBALE NUTZUNG
// ============================================

// OSMData ist bereits global verfügbar
console.log('📦 OSMData Modul geladen');
