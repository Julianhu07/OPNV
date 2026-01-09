/* ============================================
   TRANSITBUILDER - AUTH.JS
   Login/Anmelde-Logik
   ============================================ */

// ============================================
// AUTH STATE
// ============================================

const AuthState = {
    isLoggedIn: false,
    isGuest: false,
    user: null
};

// ============================================
// AUTH MODUL
// ============================================

const Auth = {
    
    /**
     * Initialisiert das Auth-System
     */
    async init() {
        console.log('🔐 Auth-System initialisiert');
        
        // Auth-Overlay HTML laden
        await this.loadAuthOverlay();
        
        // Event-Listener für Buttons
        this.setupEventListeners();
        
        // Prüfen ob bereits eingeloggt (z.B. aus localStorage)
        this.checkExistingSession();
    },
    
    /**
     * Lädt das Auth-Overlay HTML aus externer Datei
     */
    async loadAuthOverlay() {
        try {
            const response = await fetch('src/html/auth-overlay.html');
            if (!response.ok) {
                throw new Error('Auth-Overlay konnte nicht geladen werden');
            }
            
            const html = await response.text();
            const container = document.getElementById('auth-container');
            
            if (container) {
                container.innerHTML = html;
                console.log('✅ Auth-Overlay geladen');
            }
        } catch (error) {
            console.error('❌ Fehler beim Laden des Auth-Overlays:', error);
            // Fallback: Direkt als Gast starten
            this.loginAsGuest();
        }
    },
    
    /**
     * Richtet Event-Listener ein
     */
    setupEventListeners() {
        // Login-Button
        const loginBtn = document.getElementById('auth-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Gast-Button
        const guestBtn = document.getElementById('auth-guest-btn');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                this.loginAsGuest();
            });
        }
        
        // Enter-Taste im Formular
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }
    },
    
    /**
     * Prüft bestehende Session
     */
    checkExistingSession() {
        const savedSession = localStorage.getItem('transitbuilder_session');
        
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                
                if (session.isGuest) {
                    // Gast-Session wiederherstellen
                    this.restoreGuestSession();
                } else if (session.user) {
                    // User-Session wiederherstellen
                    // TODO: Token validieren
                    this.restoreUserSession(session.user);
                }
            } catch (e) {
                // Ungültige Session, löschen
                localStorage.removeItem('transitbuilder_session');
            }
        }
    },
    
    /**
     * Stellt Gast-Session wieder her
     */
    restoreGuestSession() {
        AuthState.isLoggedIn = true;
        AuthState.isGuest = true;
        AuthState.user = { name: 'Gast', isGuest: true };
        
        this.hideAuthOverlay();
        this.showGuestBadge();
        this.startGame();
    },
    
    /**
     * Stellt User-Session wieder her
     */
    restoreUserSession(user) {
        AuthState.isLoggedIn = true;
        AuthState.isGuest = false;
        AuthState.user = user;
        
        this.hideAuthOverlay();
        this.startGame();
    },
    
    /**
     * Verarbeitet Login
     */
    handleLogin() {
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        
        // Validierung
        if (!email || !password) {
            this.showError('Bitte alle Felder ausfüllen');
            return;
        }
        
        // TODO: Echte API-Anfrage
        console.log('🔐 Login-Versuch:', email);
        
        // Placeholder: Login noch nicht implementiert
        this.showError('Login wird bald verfügbar sein. Spiele erstmal als Gast!');
    },
    
    /**
     * Login als Gast
     */
    loginAsGuest() {
        console.log('👤 Login als Gast');
        
        AuthState.isLoggedIn = true;
        AuthState.isGuest = true;
        AuthState.user = {
            name: 'Gast',
            isGuest: true,
            createdAt: Date.now()
        };
        
        // Session speichern
        localStorage.setItem('transitbuilder_session', JSON.stringify({
            isGuest: true,
            createdAt: Date.now()
        }));
        
        // UI aktualisieren
        this.hideAuthOverlay();
        this.showGuestBadge();
        this.startGame();
    },
    
    /**
     * Logout
     */
    logout() {
        AuthState.isLoggedIn = false;
        AuthState.isGuest = false;
        AuthState.user = null;
        
        localStorage.removeItem('transitbuilder_session');
        
        // Auth-Overlay wieder anzeigen
        this.showAuthOverlay();
        this.hideGuestBadge();
    },
    
    /**
     * Versteckt das Auth-Overlay
     */
    hideAuthOverlay() {
        const overlay = document.getElementById('auth-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },
    
    /**
     * Zeigt das Auth-Overlay
     */
    showAuthOverlay() {
        const overlay = document.getElementById('auth-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    },
    
    /**
     * Zeigt Gast-Badge an
     */
    showGuestBadge() {
        const badge = document.getElementById('guest-badge');
        if (badge) {
            badge.classList.add('visible');
        }
    },
    
    /**
     * Versteckt Gast-Badge
     */
    hideGuestBadge() {
        const badge = document.getElementById('guest-badge');
        if (badge) {
            badge.classList.remove('visible');
        }
    },
    
    /**
     * Zeigt Fehlermeldung
     */
    showError(message) {
        // Bestehende Fehlermeldung entfernen
        const existingError = document.querySelector('.auth-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Neue Fehlermeldung erstellen
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.style.cssText = `
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            margin-bottom: 1rem;
            text-align: center;
        `;
        errorDiv.textContent = message;
        
        // Vor dem Formular einfügen
        const form = document.getElementById('auth-form');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
            
            // Nach 5 Sekunden ausblenden
            setTimeout(() => {
                errorDiv.style.opacity = '0';
                errorDiv.style.transition = 'opacity 0.3s ease';
                setTimeout(() => errorDiv.remove(), 300);
            }, 5000);
        }
    },
    
    /**
     * Startet das Spiel nach erfolgreicher Authentifizierung
     */
    startGame() {
        console.log('🎮 Starte Spiel...');
        
        // Karte initialisieren (falls noch nicht geschehen)
        if (typeof initMap === 'function' && !map) {
            initMap();
        }
    },
    
    /**
     * Gibt aktuellen Auth-Status zurück
     */
    getStatus() {
        return {
            isLoggedIn: AuthState.isLoggedIn,
            isGuest: AuthState.isGuest,
            user: AuthState.user
        };
    }
};

// ============================================
// INITIALISIERUNG BEI DOM READY
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    Auth.init();
});

// Export für globale Nutzung
console.log('🔐 Auth Modul geladen');
