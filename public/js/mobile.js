// Mobile JavaScript for Redio

class MobileManager {
    constructor() {
        this.isMobile = false;
        this.isTablet = false;
        this.isTouch = false;
        this.currentView = 'home';
        this.init();
    }
    
    init() {
        this.detectDevice();
        this.setupEventListeners();
        this.setupMobileUI();
        this.setupTouchGestures();
        this.setupKeyboardHandling();
    }
    
    detectDevice() {
        // Detect mobile/tablet
        const userAgent = navigator.userAgent.toLowerCase();
        this.isMobile = /mobile|android|iphone|ipod|ipad/.test(userAgent);
        this.isTablet = /ipad|tablet|playbook|silk/.test(userAgent);
        this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Add device classes to body
        document.body.classList.toggle('is-mobile', this.isMobile);
        document.body.classList.toggle('is-tablet', this.isTablet);
        document.body.classList.toggle('is-touch', this.isTouch);
        
        // Detect iOS specifically
        const isIOS = /ipad|iphone|ipod/.test(userAgent);
        document.body.classList.toggle('is-ios', isIOS);
        
        // Detect Android
        const isAndroid = /android/.test(userAgent);
        document.body.classList.toggle('is-android', isAndroid);
    }
    
    setupEventListeners() {
        // Mobile menu toggle
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const sidebar = document.querySelector('.mobile-sidebar');
        const closeBtn = document.querySelector('.mobile-sidebar-close');
        
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
            
            closeBtn?.addEventListener('click', () => {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
            });
            
            // Close sidebar when clicking outside
            sidebar.addEventListener('click', (e) => {
                if (e.target === sidebar) {
                    sidebar.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
        
        // Mobile search toggle
        const searchBtn = document.querySelector('.mobile-search-btn');
        const searchOverlay = document.querySelector('.mobile-search-overlay');
        const searchClose = document.querySelector('.mobile-search-close');
        
        if (searchBtn && searchOverlay) {
            searchBtn.addEventListener('click', () => {
                searchOverlay.classList.add('active');
                const input = searchOverlay.querySelector('.mobile-search-input');
                if (input) {
                    input.focus();
                }
                document.body.style.overflow = 'hidden';
            });
            
            searchClose?.addEventListener('click', () => {
                searchOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
            
            // Handle search input
            const searchInput = searchOverlay.querySelector('.mobile-search-input');
            if (searchInput) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.performMobileSearch(searchInput.value);
                    }
                });
            }
        }
        
        // Mobile navigation items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) {
                    this.switchView(view);
                    this.updateMobileNav(view);
                }
            });
        });
        
        // Mobile sidebar items
        document.querySelectorAll('.mobile-sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) {
                    this.switchView(view);
                    this.closeSidebar();
                }
            });
        });
        
        // Handle back button on Android
        if (this.isAndroid) {
            window.addEventListener('popstate', () => {
                this.handleBackButton();
            });
        }
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    setupMobileUI() {
        // Create mobile elements if they don't exist
        this.createMobileElements();
        
        // Initialize current view
        this.updateMobileNav(this.currentView);
        
        // Adjust UI for mobile
        if (this.isMobile) {
            this.optimizeForMobile();
        }
    }
    
    createMobileElements() {
        // Create mobile header if not exists
        if (!document.querySelector('.mobile-header')) {
            const header = document.createElement('header');
            header.className = 'mobile-header';
            header.innerHTML = `
                <div class="mobile-header-content">
                    <button class="mobile-menu-btn">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="mobile-logo">Redio</div>
                    <button class="mobile-search-btn">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            `;
            document.body.prepend(header);
        }
        
        // Create mobile sidebar if not exists
        if (!document.querySelector('.mobile-sidebar')) {
            const sidebar = document.createElement('div');
            sidebar.className = 'mobile-sidebar';
            sidebar.innerHTML = `
                <div class="mobile-sidebar-header">
                    <h3>Redio</h3>
                    <button class="mobile-sidebar-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mobile-sidebar-nav">
                    <a href="#" class="mobile-sidebar-item" data-view="home">
                        <i class="fas fa-home"></i>
                        <span>Home</span>
                    </a>
                    <a href="#" class="mobile-sidebar-item" data-view="browse">
                        <i class="fas fa-globe"></i>
                        <span>Browse</span>
                    </a>
                    <a href="#" class="mobile-sidebar-item" data-view="games">
                        <i class="fas fa-gamepad"></i>
                        <span>Games</span>
                    </a>
                    <a href="#" class="mobile-sidebar-item" data-view="apps">
                        <i class="fas fa-th"></i>
                        <span>Apps</span>
                    </a>
                    <a href="#" class="mobile-sidebar-item" data-view="tabs">
                        <i class="fas fa-folder"></i>
                        <span>Tabs</span>
                    </a>
                    <a href="#" class="mobile-sidebar-item" data-view="settings">
                        <i class="fas fa-cog"></i>
                        <span>Settings</span>
                    </a>
                    <div class="mobile-sidebar-divider"></div>
                    <a href="#" class="mobile-sidebar-item" data-view="cloak">
                        <i class="fas fa-mask"></i>
                        <span>Cloaking</span>
                    </a>
                    <a href="#" class="mobile-sidebar-item" data-view="about">
                        <i class="fas fa-info-circle"></i>
                        <span>About</span>
                    </a>
                </div>
            `;
            document.body.appendChild(sidebar);
        }
        
        // Create mobile nav if not exists
        if (!document.querySelector('.mobile-nav')) {
            const nav = document.createElement('nav');
            nav.className = 'mobile-nav';
            nav.innerHTML = `
                <div class="mobile-nav-items">
                    <a href="#" class="mobile-nav-item" data-view="home">
                        <i class="fas fa-home"></i>
                        <span>Home</span>
                    </a>
                    <a href="#" class="mobile-nav-item" data-view="browse">
                        <i class="fas fa-globe"></i>
                        <span>Browse</span>
                    </a>
                    <a href="#" class="mobile-nav-item" data-view="games">
                        <i class="fas fa-gamepad"></i>
                        <span>Games</span>
                    </a>
                    <a href="#" class="mobile-nav-item" data-view="apps">
                        <i class="fas fa-th"></i>
                        <span>Apps</span>
                    </a>
                    <a href="#" class="mobile-nav-item" data-view="more">
                        <i class="fas fa-ellipsis-h"></i>
                        <span>More</span>
                    </a>
                </div>
            `;
            document.body.appendChild(nav);
        }
        
        // Create mobile search overlay if not exists
        if (!document.querySelector('.mobile-search-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'mobile-search-overlay';
            overlay.innerHTML = `
                <div class="mobile-search-header">
                    <h3>Search</h3>
                    <button class="mobile-search-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <input type="text" class="mobile-search-input" placeholder="Search or enter URL...">
                <div class="mobile-search-results">
                    <!-- Search results will appear here -->
                </div>
            `;
            document.body.appendChild(overlay);
        }
    }
    
    setupTouchGestures() {
        if (!this.isTouch) return;
        
        // Swipe gestures for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        });
        
        // Prevent pull-to-refresh on mobile
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Double tap to go back
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 300 && tapLength > 0) {
                // Double tap detected
                this.handleDoubleTap(e);
            }
            
            lastTap = currentTime;
        });
    }
    
    setupKeyboardHandling() {
        // Handle keyboard showing/hiding on mobile
        if (this.isMobile) {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                window.addEventListener('resize', () => {
                    this.adjustViewportForKeyboard();
                });
            }
            
            // Prevent zoom on input focus
            document.addEventListener('touchstart', (e) => {
                if (e.target.matches('input, select, textarea')) {
                    viewport?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                }
            });
            
            document.addEventListener('blur', (e) => {
                if (e.target.matches('input, select, textarea')) {
                    viewport?.setAttribute('content', 'width=device-width, initial-scale=1.0');
                }
            }, true);
        }
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const pageElement = document.getElementById(`${view}Page`);
        if (pageElement) {
            pageElement.classList.add('active');
        } else {
            // Load page dynamically if not exists
            this.loadPage(view);
        }
        
        // Update URL
        history.pushState({ view }, '', `/#${view}`);
        
        // Close sidebar if open
        this.closeSidebar();
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('viewchanged', {
            detail: { view }
        }));
    }
    
    loadPage(view) {
        // Load page content dynamically
        const pages = {
            home: '/',
            games: '/games.html',
            apps: '/apps.html',
            settings: '/settings.html',
            cloak: '/cloak.html',
            about: '/about.html'
        };
        
        if (pages[view]) {
            fetch(pages[view])
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const content = doc.querySelector('.main-content') || doc.body;
                    
                    // Create page container if not exists
                    let pageContainer = document.getElementById(`${view}Page`);
                    if (!pageContainer) {
                        pageContainer = document.createElement('div');
                        pageContainer.id = `${view}Page`;
                        pageContainer.className = 'page';
                        document.querySelector('.main-content')?.appendChild(pageContainer);
                    }
                    
                    pageContainer.innerHTML = content.innerHTML;
                    pageContainer.classList.add('active');
                    
                    // Initialize page-specific scripts
                    this.initializePage(view);
                })
                .catch(error => {
                    console.error(`Error loading page ${view}:`, error);
                    this.showError(`Failed to load ${view} page`);
                });
        }
    }
    
    initializePage(view) {
        // Initialize page-specific functionality
        switch(view) {
            case 'games':
                if (window.gamesManager) {
                    gamesManager.loadGames();
                }
                break;
            case 'apps':
                // Initialize apps page
                break;
            case 'settings':
                if (window.settingsManager) {
                    settingsManager.updateUI();
                }
                break;
        }
    }
    
    updateMobileNav(view) {
        // Update active state in mobile nav
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        
        document.querySelectorAll('.mobile-sidebar-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
    }
    
    closeSidebar() {
        const sidebar = document.querySelector('.mobile-sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    closeSearchOverlay() {
        const overlay = document.querySelector('.mobile-search-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    performMobileSearch(query) {
        if (!query.trim()) return;
        
        // Use main app's search if available
        if (window.redio) {
            window.redio.performSearch(query);
        } else {
            // Fallback: redirect to home with search
            window.location.href = `/?search=${encodeURIComponent(query)}`;
        }
        
        this.closeSearchOverlay();
    }
    
    handleSwipe(startX, startY, endX, endY) {
        const threshold = 50;
        const diffX = endX - startX;
        const diffY = endY - startY;
        
        // Check if it's a horizontal swipe
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    // Swipe right - open sidebar
                    const sidebar = document.querySelector('.mobile-sidebar');
                    if (sidebar && !sidebar.classList.contains('active')) {
                        sidebar.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    }
                } else {
                    // Swipe left - close sidebar
                    this.closeSidebar();
                }
            }
        }
    }
    
    handleDoubleTap(event) {
        // Double tap at top to scroll to top
        if (event.changedTouches[0].clientY < 100) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    handleBackButton() {
        // Handle Android back button
        const sidebar = document.querySelector('.mobile-sidebar');
        const searchOverlay = document.querySelector('.mobile-search-overlay');
        
        if (sidebar?.classList.contains('active')) {
            this.closeSidebar();
        } else if (searchOverlay?.classList.contains('active')) {
            this.closeSearchOverlay();
        } else if (this.currentView !== 'home') {
            this.switchView('home');
        } else {
            // Exit app or show confirmation
            this.showExitConfirmation();
        }
    }
    
    handleOrientationChange() {
        // Adjust UI for orientation changes
        const isPortrait = window.innerHeight > window.innerWidth;
        
        document.body.classList.toggle('portrait', isPortrait);
        document.body.classList.toggle('landscape', !isPortrait);
        
        // Dispatch orientation change event
        window.dispatchEvent(new CustomEvent('orientationchanged', {
            detail: { isPortrait }
        }));
    }
    
    handleResize() {
        // Update device detection on resize
        this.detectDevice();
        
        // Adjust UI based on new size
        this.optimizeForMobile();
    }
    
    adjustViewportForKeyboard() {
        // Adjust viewport when keyboard is shown
        const isKeyboardVisible = window.innerHeight < window.outerHeight * 0.8;
        
        document.body.classList.toggle('keyboard-visible', isKeyboardVisible);
        
        if (isKeyboardVisible) {
            // Scroll active input into view
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                setTimeout(() => {
                    activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }
    
    optimizeForMobile() {
        if (!this.isMobile) return;
        
        // Adjust font sizes for mobile
        const baseFontSize = Math.min(16, window.innerWidth / 25);
        document.documentElement.style.fontSize = `${baseFontSize}px`;
        
        // Optimize images for mobile
        document.querySelectorAll('img').forEach(img => {
            if (!img.hasAttribute('data-srcset')) {
                img.setAttribute('data-srcset', img.srcset || '');
                img.removeAttribute('srcset');
            }
        });
        
        // Lazy load images
        this.setupLazyLoading();
        
        // Optimize animations for mobile
        if (this.isTouch) {
            document.body.classList.add('reduced-motion');
        }
    }
    
    setupLazyLoading() {
        // Lazy load images and iframes
        const lazyLoadElements = document.querySelectorAll('[data-src], [data-srcset]');
        
        const lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    
                    if (element.dataset.src) {
                        element.src = element.dataset.src;
                        element.removeAttribute('data-src');
                    }
                    
                    if (element.dataset.srcset) {
                        element.srcset = element.dataset.srcset;
                        element.removeAttribute('data-srcset');
                    }
                    
                    lazyLoadObserver.unobserve(element);
                }
            });
        });
        
        lazyLoadElements.forEach(element => {
            lazyLoadObserver.observe(element);
        });
    }
    
    showExitConfirmation() {
        if (this.isAndroid || this.isIOS) {
            const modal = document.createElement('div');
            modal.className = 'mobile-modal';
            modal.innerHTML = `
                <div class="mobile-modal-content">
                    <h3 class="mobile-modal-title">Exit Redio?</h3>
                    <p class="mobile-modal-message">Press back again to exit</p>
                    <div class="mobile-modal-actions">
                        <button class="mobile-modal-btn secondary" id="cancelExit">
                            Cancel
                        </button>
                        <button class="mobile-modal-btn primary" id="confirmExit">
                            Exit
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('#cancelExit').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.querySelector('#confirmExit').addEventListener('click', () => {
                // Close app or navigate away
                if (window.navigator.app) {
                    window.navigator.app.exitApp();
                } else {
                    window.location.href = 'about:blank';
                }
            });
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    modal.remove();
                }
            }, 3000);
        }
    }
    
    showError(message) {
        const errorToast = document.createElement('div');
        errorToast.className = 'mobile-toast error';
        errorToast.textContent = message;
        errorToast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: var(--danger-color);
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            z-index: 1004;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(errorToast);
        
        setTimeout(() => {
            errorToast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => errorToast.remove(), 300);
        }, 3000);
    }
    
    // Public API methods
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isTouch: this.isTouch,
            isIOS: document.body.classList.contains('is-ios'),
            isAndroid: document.body.classList.contains('is-android'),
            orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
            view: this.currentView
        };
    }
    
    vibrate(pattern = [100]) {
        if (navigator.vibrate && this.isMobile) {
            navigator.vibrate(pattern);
        }
    }
    
    shareContent(title, text, url) {
        if (navigator.share && this.isMobile) {
            navigator.share({
                title,
                text,
                url
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(url)
                .then(() => this.showToast('Link copied to clipboard'))
                .catch(() => this.showError('Failed to copy link'));
        }
    }
    
    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            right: 20px;
            background: var(--surface-color);
            color: var(--text-color);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            z-index: 1004;
            animation: slideUp 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// Initialize mobile manager
document.addEventListener('DOMContentLoaded', () => {
    window.mobileManager = new MobileManager();
    
    // Add CSS animations for mobile
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .reduced-motion * {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
        }
    `;
    document.head.appendChild(style);
});