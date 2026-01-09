/* ============================================
   TRANSITBUILDER - NEWS PAGE SCRIPTS
   Lädt News aus news.json und zeigt sie an
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // NEWS LADEN UND ANZEIGEN
    // ============================================
    
    const newsContainer = document.getElementById('news-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    let allNews = [];
    
    // News aus JSON laden
    async function loadNews() {
        try {
            const response = await fetch('news.json');
            if (!response.ok) throw new Error('News konnten nicht geladen werden');
            
            const data = await response.json();
            allNews = data.news;
            
            // Sortieren: Pinned zuerst, dann nach ID (höchste zuerst)
            allNews.sort((a, b) => {
                // Pinned immer oben
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                // Bei gleichem pinned-Status nach ID sortieren
                return b.id - a.id;
            });
            
            displayNews(allNews);
        } catch (error) {
            console.error('Fehler beim Laden der News:', error);
            newsContainer.innerHTML = `
                <div class="news-error">
                    <span>⚠️</span>
                    <p>News konnten nicht geladen werden.</p>
                </div>
            `;
        }
    }
    
    // News anzeigen
    function displayNews(newsItems) {
        if (newsItems.length === 0) {
            newsContainer.innerHTML = `
                <div class="news-empty">
                    <span>📭</span>
                    <p>Keine News in dieser Kategorie.</p>
                </div>
            `;
            return;
        }
        
        // News nach Datum gruppieren
        const groupedNews = groupNewsByDate(newsItems);
        
        let html = '';
        
        for (const [dateLabel, items] of Object.entries(groupedNews)) {
            html += `<div class="news-date-group">`;
            html += `<h3 class="date-label">${dateLabel}</h3>`;
            
            items.forEach(news => {
                html += createNewsCard(news);
            });
            
            html += `</div>`;
        }
        
        newsContainer.innerHTML = html;
        
        // Event Listener für News-Cards hinzufügen
        addNewsCardListeners();
    }
    
    // News nach Datum gruppieren (Heute, Gestern, Datum)
    function groupNewsByDate(newsItems) {
        const groups = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        newsItems.forEach(news => {
            const newsDate = new Date(news.date);
            newsDate.setHours(0, 0, 0, 0);
            
            let label;
            
            if (newsDate.getTime() === today.getTime()) {
                label = 'HEUTE';
            } else if (newsDate.getTime() === yesterday.getTime()) {
                label = 'GESTERN';
            } else {
                // Format: 27. DEZ. 2025
                label = formatDate(newsDate);
            }
            
            if (!groups[label]) {
                groups[label] = [];
            }
            groups[label].push(news);
        });
        
        return groups;
    }
    
    // Datum formatieren
    function formatDate(date) {
        const months = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}. ${month}. ${year}`;
    }
    
    // Kategorie-Label erstellen
    function getCategoryLabel(category) {
        const labels = {
            'devlog': 'DEVLOG',
            'update': 'UPDATE',
            'spotlight': 'SPOTLIGHT',
            'announcement': 'ANKÜNDIGUNG'
        };
        return labels[category] || 'NEUIGKEITEN';
    }
    
    // Kategorie-Klasse
    function getCategoryClass(category) {
        return `category-${category}`;
    }
    
    // News-Card HTML erstellen
    function createNewsCard(news) {
        const categoryLabel = getCategoryLabel(news.category);
        const categoryClass = getCategoryClass(news.category);
        const pinnedClass = news.pinned ? 'pinned' : '';
        const pinnedBadge = news.pinned ? '<span class="pin-badge">📌 ANGEPINNT</span>' : '';
        
        // Platzhalter-Bild wenn keins vorhanden
        const imageHtml = news.image 
            ? `<img src="${news.image}" alt="${news.title}" class="news-image">`
            : `<div class="news-image-placeholder">
                <span class="placeholder-icon">${getPlaceholderIcon(news.category)}</span>
                <span class="placeholder-title">${news.category.toUpperCase()}</span>
               </div>`;
        
        return `
            <article class="news-card ${pinnedClass}" data-id="${news.id}" data-category="${news.category}">
                ${pinnedBadge}
                <div class="news-thumbnail">
                    ${imageHtml}
                </div>
                <div class="news-content">
                    <div class="news-meta">
                        <span class="news-category ${categoryClass}">${categoryLabel}</span>
                    </div>
                    <h2 class="news-title">${news.title}</h2>
                    <p class="news-excerpt">${news.excerpt}</p>
                </div>
            </article>
        `;
    }
    
    // Platzhalter-Icon für Kategorie
    function getPlaceholderIcon(category) {
        const icons = {
            'devlog': '📝',
            'update': '🔄',
            'spotlight': '🔦',
            'announcement': '📢'
        };
        return icons[category] || '📰';
    }
    
    // Event Listener für News-Cards
    function addNewsCardListeners() {
        const newsCards = document.querySelectorAll('.news-card');
        
        newsCards.forEach(card => {
            card.addEventListener('click', function() {
                const newsId = parseInt(this.dataset.id);
                const news = allNews.find(n => n.id === newsId);
                
                if (news) {
                    openNewsModal(news);
                }
            });
        });
    }
    
    // ============================================
    // NEWS MODAL
    // ============================================
    
    function openNewsModal(news) {
        // Modal erstellen
        const modal = document.createElement('div');
        modal.className = 'news-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                
                <div class="modal-header">
                    <span class="news-category ${getCategoryClass(news.category)}">${getCategoryLabel(news.category)}</span>
                    <span class="modal-date">${formatDate(new Date(news.date))}</span>
                </div>
                
                <h1 class="modal-title">${news.title}</h1>
                
                <div class="modal-body">
                    ${news.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Animation
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
        // Schließen Events
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        
        function closeModal() {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 300);
        }
        
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        
        // ESC zum Schließen
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }
    
    // ============================================
    // FILTER
    // ============================================
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Active state
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            
            if (filter === 'all') {
                displayNews(allNews);
            } else {
                const filtered = allNews.filter(news => news.category === filter);
                displayNews(filtered);
            }
        });
    });
    
    // ============================================
    // INITIALISIERUNG
    // ============================================
    
    loadNews();
    
});
