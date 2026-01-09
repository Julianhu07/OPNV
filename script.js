/* ============================================
   TRANSITBUILDER - LANDING PAGE SCRIPTS
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // MOBILE MENU TOGGLE
    // ============================================
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');
    const hamburger = document.querySelector('.hamburger');
    
    if (mobileMenuToggle && nav) {
        mobileMenuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            
            // Animate hamburger to X
            if (nav.classList.contains('active')) {
                hamburger.style.background = 'transparent';
                hamburger.style.setProperty('--before-transform', 'rotate(45deg) translate(5px, 5px)');
                hamburger.style.setProperty('--after-transform', 'rotate(-45deg) translate(7px, -7px)');
            } else {
                hamburger.style.background = '';
            }
        });
        
        // Close menu when clicking on a link
        const navLinks = nav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                nav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
    }
    
    // ============================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ============================================
    // HEADER SCROLL EFFECT
    // ============================================
    const header = document.querySelector('.header');
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        // Add shadow on scroll
        if (currentScroll > 50) {
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            header.style.boxShadow = 'none';
        }
        
        lastScroll = currentScroll;
    });
    
    // ============================================
    // INTERSECTION OBSERVER FOR ANIMATIONS
    // ============================================
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optionally unobserve after animation
                // animateOnScroll.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
        
        animateOnScroll.observe(card);
    });
    
    // Add visible class styles
    const style = document.createElement('style');
    style.textContent = `
        .feature-card.visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
    
    // ============================================
    // TOOL BUTTONS INTERACTION (Preview Section)
    // ============================================
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            toolButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // ============================================
    // PARTICLES ENHANCEMENT
    // ============================================
    const heroParticles = document.querySelector('.hero-particles');
    
    if (heroParticles) {
        // Add more particles dynamically
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('span');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = -Math.random() * 10 + 's';
            particle.style.animationDuration = 10 + Math.random() * 10 + 's';
            particle.style.width = 2 + Math.random() * 4 + 'px';
            particle.style.height = particle.style.width;
            heroParticles.appendChild(particle);
        }
    }
    
    // ============================================
    // TYPING EFFECT FOR HERO CLAIM (Optional)
    // ============================================
    const heroClaim = document.querySelector('.hero-claim');
    
    if (heroClaim && window.innerWidth > 768) {
        const originalText = heroClaim.textContent;
        const claims = [
            'Baue dein eigenes ÖPNV-Netz auf realen Karten',
            'Plane Buslinien, U-Bahnen und mehr',
            'Werde zum Verkehrsplaner deiner Stadt'
        ];
        
        let claimIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeTimeout;
        
        function typeEffect() {
            const currentClaim = claims[claimIndex];
            
            if (!isDeleting) {
                heroClaim.textContent = currentClaim.substring(0, charIndex + 1);
                charIndex++;
                
                if (charIndex === currentClaim.length) {
                    isDeleting = true;
                    typeTimeout = setTimeout(typeEffect, 2000); // Pause at end
                    return;
                }
            } else {
                heroClaim.textContent = currentClaim.substring(0, charIndex - 1);
                charIndex--;
                
                if (charIndex === 0) {
                    isDeleting = false;
                    claimIndex = (claimIndex + 1) % claims.length;
                }
            }
            
            const speed = isDeleting ? 30 : 50;
            typeTimeout = setTimeout(typeEffect, speed);
        }
        
        // Start typing effect after a delay
        setTimeout(() => {
            charIndex = 0;
            typeEffect();
        }, 2000);
    }
    
    // ============================================
    // CONSOLE EASTER EGG
    // ============================================
    console.log('%c🚇 TransitBuilder', 'font-size: 24px; font-weight: bold; color: #3b82f6;');
    console.log('%cBaue dein eigenes ÖPNV-Netz!', 'font-size: 14px; color: #9ca3af;');
    console.log('%cInteressiert an der Entwicklung? Schau auf GitHub vorbei!', 'font-size: 12px; color: #6b7280;');
    
});

// ============================================
// PRELOAD CRITICAL RESOURCES
// ============================================
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});
