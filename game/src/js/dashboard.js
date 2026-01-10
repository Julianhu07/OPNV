/* ============================================
   TRANSITBUILDER - DASHBOARD.JS
   Dashboard-Logik und Spielverwaltung
   ============================================ */

// ============================================
// DASHBOARD STATE
// ============================================

const DashboardState = {
    games: [],
    maxGames: 3, // Free-Version Limit
    friends: [],
    searchTimeout: null
};

// ============================================
// NOMINATIM API FÜR STADTSUCHE
// ============================================

const CitySearch = {
    /**
     * Sucht nach Städten/PLZ über Nominatim API
     */
    async search(query) {
        if (!query || query.length < 2) return [];
        
        try {
            // Prüfen ob es eine PLZ ist (nur Zahlen)
            const isPostcode = /^\d+$/.test(query.trim());
            
            let url;
            if (isPostcode) {
                // Bei PLZ-Suche spezifischer suchen
                url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(query)}&countrycodes=de,at,ch&limit=10&addressdetails=1`;
            } else {
                // Bei Städtesuche
                url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=de,at,ch&limit=10&addressdetails=1`;
            }
            
            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'de'
                }
            });
            
            if (!response.ok) throw new Error('Suche fehlgeschlagen');
            
            const results = await response.json();
            
            // Ergebnisse formatieren (weniger streng filtern)
            const formatted = results
                .map(r => {
                    const address = r.address || {};
                    const city = address.city || address.town || address.village || address.municipality || address.county || '';
                    const postcode = address.postcode || '';
                    
                    return {
                        name: this.formatName(r),
                        postcode: postcode,
                        city: city,
                        displayName: r.display_name,
                        lat: parseFloat(r.lat),
                        lng: parseFloat(r.lon),
                        type: r.type
                    };
                })
                .filter(r => r.city || r.postcode); // Mindestens Stadt ODER PLZ
            
            // Duplikate entfernen (nach Name)
            const unique = [];
            const seen = new Set();
            for (const item of formatted) {
                if (!seen.has(item.name)) {
                    seen.add(item.name);
                    unique.push(item);
                }
            }
            
            return unique.slice(0, 8);
        } catch (error) {
            console.error('Stadtsuche Fehler:', error);
            return [];
        }
    },
    
    /**
     * Formatiert den Anzeigenamen
     */
    formatName(result) {
        const address = result.address || {};
        const city = address.city || address.town || address.village || address.municipality || address.county || '';
        const postcode = address.postcode || '';
        
        if (postcode && city) {
            return `${postcode} ${city}`;
        } else if (postcode) {
            return postcode;
        } else if (city) {
            return city;
        } else if (result.name) {
            return result.name;
        }
        return result.display_name.split(',')[0];
    }
};

// ============================================
// DASHBOARD MODUL
// ============================================

const Dashboard = {
    
    /**
     * Initialisiert das Dashboard
     */
    async init() {
        console.log('📊 Dashboard initialisiert');
        
        // Dashboard HTML laden
        await this.loadDashboardHTML();
        
        // Gespeicherte Spiele laden
        this.loadSavedGames();
        
        // Event-Listener
        this.setupEventListeners();
        
        // UI aktualisieren
        this.updateUI();
    },
    
    /**
     * Lädt das Dashboard HTML
     */
    async loadDashboardHTML() {
        try {
            const response = await fetch('src/html/dashboard.html');
            if (!response.ok) throw new Error('Dashboard konnte nicht geladen werden');
            
            const html = await response.text();
            const container = document.getElementById('dashboard-container');
            
            if (container) {
                container.innerHTML = html;
                console.log('✅ Dashboard geladen');
                
                // Dashboard anzeigen
                this.show();
            }
        } catch (error) {
            console.error('❌ Fehler beim Laden des Dashboards:', error);
        }
    },
    
    /**
     * Event-Listener einrichten
     */
    setupEventListeners() {
        // Add Game Button
        const addBtn = document.getElementById('add-game-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showNewGameModal());
        }
        
        // Close Modal
        const closeBtn = document.getElementById('close-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideNewGameModal());
        }
        
        // Modal Background Click
        const modal = document.getElementById('new-game-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideNewGameModal();
            });
        }
        
        // New Game Form
        const form = document.getElementById('new-game-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewGame();
            });
        }
        
        // Settings Button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                console.log('⚙️ Einstellungen (noch nicht implementiert)');
            });
        }
        
        // Profile Button
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                console.log('👤 Profil (noch nicht implementiert)');
            });
        }
        
        // Klick außerhalb schließt Dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.game-item-actions')) {
                document.querySelectorAll('.game-item-dropdown.visible').forEach(dd => {
                    dd.classList.remove('visible');
                });
            }
            // Stadtsuche-Dropdown schließen
            if (!e.target.closest('.city-search-wrapper')) {
                const results = document.getElementById('city-search-results');
                if (results) results.classList.remove('visible');
            }
        });
        
        // Stadtsuche Input
        this.setupCitySearch();
    },
    
    /**
     * Richtet die Stadtsuche ein
     */
    setupCitySearch() {
        const cityInput = document.getElementById('game-city');
        const resultsContainer = document.getElementById('city-search-results');
        
        if (!cityInput || !resultsContainer) return;
        
        cityInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            // Debounce - warte 300ms nach letzter Eingabe
            clearTimeout(DashboardState.searchTimeout);
            
            if (query.length < 2) {
                resultsContainer.classList.remove('visible');
                return;
            }
            
            DashboardState.searchTimeout = setTimeout(async () => {
                resultsContainer.innerHTML = '<div class="city-search-loading">Suche...</div>';
                resultsContainer.classList.add('visible');
                
                const results = await CitySearch.search(query);
                
                if (results.length === 0) {
                    resultsContainer.innerHTML = '<div class="city-search-empty">Keine Ergebnisse gefunden</div>';
                    return;
                }
                
                resultsContainer.innerHTML = results.map((city, index) => `
                    <div class="city-search-item" data-index="${index}" data-lat="${city.lat}" data-lng="${city.lng}" data-name="${city.name}">
                        <div class="city-info">
                            ${city.postcode ? `<span class="city-postcode">${city.postcode}</span>` : ''}
                            <span class="city-name">${city.city || city.name}</span>
                        </div>
                        <span class="city-type">${this.getCityTypeLabel(city.type)}</span>
                    </div>
                `).join('');
                
                // Click-Events für Ergebnisse
                resultsContainer.querySelectorAll('.city-search-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.selectCity(item);
                    });
                });
            }, 300);
        });
        
        // Bei Focus Ergebnisse zeigen falls vorhanden
        cityInput.addEventListener('focus', () => {
            if (resultsContainer.children.length > 0) {
                resultsContainer.classList.add('visible');
            }
        });
    },
    
    /**
     * Gibt Label für Stadttyp zurück
     */
    getCityTypeLabel(type) {
        const labels = {
            'city': 'Stadt',
            'town': 'Stadt',
            'village': 'Gemeinde',
            'postcode': 'PLZ',
            'administrative': 'Gebiet'
        };
        return labels[type] || '';
    },
    
    /**
     * Wählt eine Stadt aus
     */
    selectCity(item) {
        const name = item.dataset.name;
        const lat = item.dataset.lat;
        const lng = item.dataset.lng;
        
        // Input-Felder setzen
        document.getElementById('game-city').value = name;
        document.getElementById('game-city-lat').value = lat;
        document.getElementById('game-city-lng').value = lng;
        document.getElementById('game-city-name').value = name;
        
        // Dropdown schließen
        document.getElementById('city-search-results').classList.remove('visible');
    },
    
    /**
     * Lädt gespeicherte Spiele aus localStorage
     */
    loadSavedGames() {
        const saved = localStorage.getItem('transitbuilder_games');
        if (saved) {
            try {
                DashboardState.games = JSON.parse(saved);
            } catch (e) {
                DashboardState.games = [];
            }
        }
    },
    
    /**
     * Speichert Spiele in localStorage
     */
    saveGames() {
        localStorage.setItem('transitbuilder_games', JSON.stringify(DashboardState.games));
    },
    
    /**
     * Aktualisiert die UI
     */
    updateUI() {
        this.updateGamesCounter();
        this.renderGamesList();
        this.updateCoins();
    },
    
    /**
     * Aktualisiert den Spiele-Zähler
     */
    updateGamesCounter() {
        const counter = document.getElementById('games-counter');
        if (counter) {
            counter.textContent = `${DashboardState.games.length} / ${DashboardState.maxGames}`;
        }
    },
    
    /**
     * Aktualisiert Coins-Anzeige
     */
    updateCoins() {
        const coins = document.getElementById('user-coins');
        const savedCoins = localStorage.getItem('transitbuilder_coins') || '0';
        if (coins) {
            coins.textContent = savedCoins;
        }
    },
    
    /**
     * Rendert die Spieleliste
     */
    renderGamesList() {
        const list = document.getElementById('games-list');
        if (!list) return;
        
        if (DashboardState.games.length === 0) {
            list.innerHTML = `
                <div class="games-empty" style="color: #6b7280; text-align: center; padding: 2rem;">
                    <p>Noch keine Netzwerke erstellt</p>
                    <p style="font-size: 0.85rem; margin-top: 0.5rem;">Klicke auf + um loszulegen</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = DashboardState.games.map(game => `
            <div class="game-item" data-id="${game.id}">
                <div class="game-item-play">▶</div>
                <div class="game-item-info">
                    <div class="game-item-name">${game.name}</div>
                    <div class="game-item-meta">${game.cityName} • Erstellt: ${this.formatDate(game.createdAt)}</div>
                </div>
                <div class="game-item-actions">
                    <button class="game-item-menu" data-menu="${game.id}" title="Optionen">⋯</button>
                    <div class="game-item-dropdown" id="dropdown-${game.id}">
                        <button class="dropdown-item dropdown-delete" data-delete="${game.id}">
                            🗑️ Löschen
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Click-Events für Spiele
        list.querySelectorAll('.game-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignorieren wenn auf Menü oder Aktionen geklickt
                if (e.target.closest('.game-item-actions')) return;
                
                const gameId = item.dataset.id;
                this.startGame(gameId);
            });
        });
        
        // Menü-Buttons
        list.querySelectorAll('.game-item-menu').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameId = btn.dataset.menu;
                this.toggleDropdown(gameId);
            });
        });
        
        // Löschen-Buttons
        list.querySelectorAll('.dropdown-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameId = btn.dataset.delete;
                this.confirmDeleteGame(gameId);
            });
        });
    },
    
    /**
     * Zeigt/versteckt Dropdown-Menü
     */
    toggleDropdown(gameId) {
        // Alle anderen Dropdowns schließen
        document.querySelectorAll('.game-item-dropdown.visible').forEach(dd => {
            if (dd.id !== `dropdown-${gameId}`) {
                dd.classList.remove('visible');
            }
        });
        
        const dropdown = document.getElementById(`dropdown-${gameId}`);
        if (dropdown) {
            dropdown.classList.toggle('visible');
        }
    },
    
    /**
     * Bestätigung vor dem Löschen
     */
    confirmDeleteGame(gameId) {
        const game = DashboardState.games.find(g => g.id === gameId);
        if (!game) return;
        
        if (confirm(`Möchtest du "${game.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
            this.deleteGame(gameId);
        }
        
        // Dropdown schließen
        this.toggleDropdown(gameId);
    },
    
    /**
     * Löscht ein Spiel
     */
    deleteGame(gameId) {
        DashboardState.games = DashboardState.games.filter(g => g.id !== gameId);
        this.saveGames();
        this.updateUI();
        console.log('🗑️ Spiel gelöscht:', gameId);
    },
    
    /**
     * Formatiert Datum
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    },
    
    /**
     * Zeigt Modal für neues Spiel
     */
    showNewGameModal() {
        if (DashboardState.games.length >= DashboardState.maxGames) {
            alert('Maximale Anzahl an Spielen erreicht! Upgrade auf PRO für unbegrenzte Spiele.');
            return;
        }
        
        const modal = document.getElementById('new-game-modal');
        if (modal) {
            modal.classList.add('visible');
        }
    },
    
    /**
     * Versteckt Modal
     */
    hideNewGameModal() {
        const modal = document.getElementById('new-game-modal');
        if (modal) {
            modal.classList.remove('visible');
        }
        
        // Form zurücksetzen
        const form = document.getElementById('new-game-form');
        if (form) form.reset();
        
        // Hidden-Felder zurücksetzen
        const latInput = document.getElementById('game-city-lat');
        const lngInput = document.getElementById('game-city-lng');
        const cityNameInput = document.getElementById('game-city-name');
        if (latInput) latInput.value = '';
        if (lngInput) lngInput.value = '';
        if (cityNameInput) cityNameInput.value = '';
        
        // Suchergebnisse leeren
        const results = document.getElementById('city-search-results');
        if (results) {
            results.innerHTML = '';
            results.classList.remove('visible');
        }
    },
    
    /**
     * Erstellt neues Spiel
     */
    createNewGame() {
        const nameInput = document.getElementById('game-name');
        const latInput = document.getElementById('game-city-lat');
        const lngInput = document.getElementById('game-city-lng');
        const cityNameInput = document.getElementById('game-city-name');
        
        const name = nameInput?.value.trim();
        const lat = parseFloat(latInput?.value);
        const lng = parseFloat(lngInput?.value);
        const cityName = cityNameInput?.value.trim();
        
        if (!name) {
            alert('Bitte gib einen Namen ein');
            return;
        }
        
        if (!lat || !lng || !cityName) {
            alert('Bitte wähle eine Stadt aus der Liste');
            return;
        }
        
        const newGame = {
            id: 'game_' + Date.now(),
            name: name,
            cityName: cityName,
            lat: lat,
            lng: lng,
            createdAt: Date.now(),
            lastPlayed: null,
            data: {} // Spielstand-Daten
        };
        
        DashboardState.games.push(newGame);
        this.saveGames();
        this.updateUI();
        this.hideNewGameModal();
        
        console.log('🎮 Neues Spiel erstellt:', newGame);
        
        // Direkt starten
        this.startGame(newGame.id);
    },
    
    /**
     * Startet ein Spiel
     */
    startGame(gameId) {
        const game = DashboardState.games.find(g => g.id === gameId);
        if (!game) return;
        
        console.log('🚀 Starte Spiel:', game.name);
        
        // Aktives Spiel speichern
        localStorage.setItem('transitbuilder_activeGame', JSON.stringify(game));
        
        // Last played aktualisieren
        game.lastPlayed = Date.now();
        this.saveGames();
        
        // Dashboard ausblenden
        this.hide();
        
        // Karte initialisieren mit Spielkoordinaten
        if (typeof initMap === 'function') {
            // Map-Config überschreiben
            if (typeof MAP_CONFIG !== 'undefined') {
                MAP_CONFIG.defaultCenter = [game.lat, game.lng];
            }
            initMap();
        }
    },
    
    /**
     * Zeigt das Dashboard
     */
    show() {
        const overlay = document.getElementById('dashboard-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    },
    
    /**
     * Versteckt das Dashboard
     */
    hide() {
        const overlay = document.getElementById('dashboard-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },
    
    /**
     * Zurück zum Dashboard (vom Spiel aus)
     */
    backToDashboard() {
        // Karte verstecken/clearen könnte hier passieren
        this.show();
    }
};

// ============================================
// EXPORT
// ============================================

console.log('📊 Dashboard Modul geladen');
