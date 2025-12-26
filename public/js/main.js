// Main JavaScript for Redio

class RedioApp {
    constructor() {
        this.currentPage = 'home';
        this.currentTheme = 'dark';
        this.searchEngines = {
            google: 'https://www.google.com/search?q=',
            duckduckgo: 'https://duckduckgo.com/?q=',
            bing: 'https://www.bing.com/search?q=',
            youtube: 'https://www.youtube.com/results?search_query=',
            custom: ''
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadSettings();
        this.loadFeaturedContent();
        this.checkCloaking();
        this.setupErrorHandling();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchPage(btn.dataset.page));
        });

        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Proxy
        document.getElementById('proxyBtn').addEventListener('click', () => this.openProxy());
        
        // URL Navigation
        document.getElementById('goUrl').addEventListener('click', () => this.navigateToUrl());
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.navigateToUrl();
        });

        // Browser Controls
        document.getElementById('goBack').addEventListener('click', () => this.browserGoBack());
        document.getElementById('goForward').addEventListener('click', () => this.browserGoForward());
        document.getElementById('refreshPage').addEventListener('click', () => this.refreshBrowser());

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Fullscreen
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());

        // Cloak
        document.getElementById('cloakBtn').addEventListener('click', () => this.showCloakModal());
        document.getElementById('cloakOpen')?.addEventListener('click', () => this.openCloakedTab());
        document.getElementById('cloakCancel')?.addEventListener('click', () => this.hideCloakModal());

        // Quick Links
        document.querySelectorAll('.quick-link').forEach(link => {
            link.addEventListener('click', () => this.openQuickLink(link.dataset.url));
        });

        // Export/Import
        document.getElementById('exportBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportData();
        });
        
        document.getElementById('importBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.importData();
        });

        // Error handling
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    }

    switchPage(page) {
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show selected page
        const pageElement = document.getElementById(`${page}Page`);
        if (pageElement) {
            pageElement.classList.add('active');
            this.currentPage = page;
            
            // Load page-specific content
            switch(page) {
                case 'games':
                    this.loadGames();
                    break;
                case 'apps':
                    this.loadApps();
                    break;
                case 'tabs':
                    this.loadTabs();
                    break;
            }
        }

        this.showToast(`Switched to ${page.charAt(0).toUpperCase() + page.slice(1)}`);
    }

    async performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        const engine = document.getElementById('searchEngine').value;
        
        if (!query) {
            this.showToast('Please enter a search query', 'warning');
            return;
        }

        if (this.isUrl(query)) {
            this.navigateToUrl(query);
            return;
        }

        const searchUrl = this.searchEngines[engine] + encodeURIComponent(query);
        
        if (engine === 'custom') {
            const customEngine = localStorage.getItem('customSearchEngine') || this.searchEngines.google;
            window.open(customEngine + encodeURIComponent(query), '_blank');
        } else {
            this.openInProxy(searchUrl);
        }
    }

    isUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    navigateToUrl(url = null) {
        const urlInput = document.getElementById('urlInput');
        const urlToNavigate = url || urlInput.value.trim();
        
        if (!urlToNavigate) {
            this.showToast('Please enter a URL', 'warning');
            return;
        }

        let finalUrl = urlToNavigate;
        if (!urlToNavigate.startsWith('http')) {
            finalUrl = 'https://' + urlToNavigate;
        }

        try {
            new URL(finalUrl);
            
            // Switch to browse page
            this.switchPage('browse');
            
            // Load in iframe
            const iframe = document.getElementById('browserFrame');
            const overlay = document.getElementById('browserOverlay');
            
            iframe.src = `/proxy/fetch?url=${encodeURIComponent(finalUrl)}`;
            overlay.style.display = 'none';
            
            // Update URL input
            urlInput.value = finalUrl;
            
        } catch (error) {
            this.showToast('Invalid URL format', 'error');
        }
    }

    openInProxy(url) {
        this.switchPage('browse');
        const iframe = document.getElementById('browserFrame');
        const overlay = document.getElementById('browserOverlay');
        
        iframe.src = `/proxy/fetch?url=${encodeURIComponent(url)}`;
        overlay.style.display = 'none';
        document.getElementById('urlInput').value = url;
    }

    browserGoBack() {
        const iframe = document.getElementById('browserFrame');
        try {
            iframe.contentWindow.history.back();
        } catch (error) {
            this.showToast('Cannot go back', 'warning');
        }
    }

    browserGoForward() {
        const iframe = document.getElementById('browserFrame');
        try {
            iframe.contentWindow.history.forward();
        } catch (error) {
            this.showToast('Cannot go forward', 'warning');
        }
    }

    refreshBrowser() {
        const iframe = document.getElementById('browserFrame');
        iframe.src = iframe.src;
    }

    openQuickLink(url) {
        this.navigateToUrl(url);
    }

    async loadFeaturedContent() {
        try {
            const response = await fetch('/api/games?limit=4');
            const games = await response.json();
            
            const container = document.getElementById('featuredGames');
            container.innerHTML = games.slice(0, 4).map(game => `
                <div class="game-card" data-game="${game.id}">
                    <div class="game-thumbnail">
                        <i class="${game.icon || 'fas fa-gamepad'}"></i>
                    </div>
                    <div class="game-info">
                        <h4>${game.name}</h4>
                        <p>${game.description || 'Fun game to play'}</p>
                        <div class="game-actions">
                            <button class="btn primary small play-game" data-url="${game.url}">
                                <i class="fas fa-play"></i> Play
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add event listeners to play buttons
            container.querySelectorAll('.play-game').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openGame(btn.dataset.url);
                });
            });

            // Add click event to game cards
            container.querySelectorAll('.game-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.switchPage('games');
                });
            });

        } catch (error) {
            console.error('Error loading featured games:', error);
            this.showToast('Failed to load featured games', 'error');
        }
    }

    async loadGames() {
        try {
            const response = await fetch('/api/games');
            const games = await response.json();
            
            const container = document.getElementById('gamesGrid');
            container.innerHTML = games.map(game => `
                <div class="game-card">
                    <div class="game-thumbnail">
                        <i class="${game.icon || 'fas fa-gamepad'}"></i>
                    </div>
                    <div class="game-info">
                        <h4>${game.name}</h4>
                        <p>${game.description || 'Fun game to play'}</p>
                        <p class="game-category">${game.category || 'Arcade'}</p>
                        <div class="game-actions">
                            <button class="btn primary small play-game" data-url="${game.url}">
                                <i class="fas fa-play"></i> Play
                            </button>
                            <button class="btn secondary small add-to-tabs" data-game='${JSON.stringify(game)}'>
                                <i class="fas fa-plus"></i> Tab
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add event listeners
            container.querySelectorAll('.play-game').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openGame(btn.dataset.url);
                });
            });

            container.querySelectorAll('.add-to-tabs').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const game = JSON.parse(btn.dataset.game);
                    this.addToTabs(game);
                });
            });

            // Search functionality
            const searchInput = document.getElementById('gameSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const cards = container.querySelectorAll('.game-card');
                    
                    cards.forEach(card => {
                        const name = card.querySelector('h4').textContent.toLowerCase();
                        const category = card.querySelector('.game-category')?.textContent.toLowerCase() || '';
                        const isVisible = name.includes(searchTerm) || category.includes(searchTerm);
                        card.style.display = isVisible ? 'block' : 'none';
                    });
                });
            }

        } catch (error) {
            console.error('Error loading games:', error);
            this.showToast('Failed to load games', 'error');
        }
    }

    async loadApps() {
        try {
            const response = await fetch('/api/apps');
            const apps = await response.json();
            
            const container = document.getElementById('appsGrid');
            container.innerHTML = apps.map(app => `
                <div class="app-card">
                    <div class="game-thumbnail">
                        <i class="${app.icon || 'fas fa-app-store'}"></i>
                    </div>
                    <div class="app-info">
                        <h4>${app.name}</h4>
                        <p>${app.description || 'Useful application'}</p>
                        <div class="app-actions">
                            <button class="btn primary small open-app" data-url="${app.url}">
                                <i class="fas fa-external-link-alt"></i> Open
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add event listeners
            container.querySelectorAll('.open-app').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openApp(btn.dataset.url);
                });
            });

        } catch (error) {
            console.error('Error loading apps:', error);
            this.showToast('Failed to load apps', 'error');
        }
    }

    openGame(url) {
        this.switchPage('browse');
        const iframe = document.getElementById('browserFrame');
        const overlay = document.getElementById('browserOverlay');
        
        iframe.src = url;
        overlay.style.display = 'none';
        document.getElementById('urlInput').value = url;
        
        this.showToast('Game loaded successfully');
    }

    openApp(url) {
        this.switchPage('browse');
        const iframe = document.getElementById('browserFrame');
        const overlay = document.getElementById('browserOverlay');
        
        iframe.src = url;
        overlay.style.display = 'none';
        document.getElementById('urlInput').value = url;
        
        this.showToast('App loaded successfully');
    }

    addToTabs(item) {
        // This would integrate with the tabs system
        this.showToast(`${item.name} added to tabs`);
    }

    loadTabs() {
        // Load saved tabs from localStorage
        const tabs = JSON.parse(localStorage.getItem('redio_tabs') || '[]');
        this.updateTabCount(tabs.length);
        
        // Implementation would continue here...
    }

    updateTabCount(count) {
        const tabCountElement = document.querySelector('.tab-count');
        if (tabCountElement) {
            tabCountElement.textContent = count;
            tabCountElement.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', this.currentTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = this.currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        
        localStorage.setItem('redio_theme', this.currentTheme);
        this.showToast(`Theme: ${this.currentTheme}`);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                this.showToast(`Error attempting to enable fullscreen: ${err.message}`, 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }

    showCloakModal() {
        const modal = document.getElementById('cloakModal');
        modal.classList.add('active');
    }

    hideCloakModal() {
        const modal = document.getElementById('cloakModal');
        modal.classList.remove('active');
    }

    openCloakedTab() {
        const cloakWindow = window.open('about:blank', '_blank');
        if (cloakWindow) {
            // Write cloaked content
            cloakWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Google</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        iframe { width: 100vw; height: 100vh; border: none; }
                    </style>
                </head>
                <body>
                    <iframe src="${window.location.origin}" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
                </body>
                </html>
            `);
            cloakWindow.document.close();
            this.hideCloakModal();
            this.showToast('Cloaked tab opened');
        } else {
            this.showToast('Popup blocked. Please allow popups for this site.', 'warning');
        }
    }

    checkCloaking() {
        // Check if we're in a cloaked tab
        if (window.location.href.includes('cloak=true')) {
            document.title = 'Google';
            // Additional cloaking measures can be added here
        }
    }

    loadSettings() {
        // Load theme
        const savedTheme = localStorage.getItem('redio_theme') || 'dark';
        this.currentTheme = savedTheme;
        document.body.setAttribute('data-theme', savedTheme);
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }

        // Load search engine
        const savedEngine = localStorage.getItem('redio_search_engine') || 'google';
        const engineSelect = document.getElementById('searchEngine');
        if (engineSelect) {
            engineSelect.value = savedEngine;
        }

        // Load other settings...
    }

    exportData() {
        const data = {
            settings: {
                theme: this.currentTheme,
                searchEngine: document.getElementById('searchEngine').value,
                // Add more settings as needed
            },
            tabs: JSON.parse(localStorage.getItem('redio_tabs') || '[]'),
            bookmarks: JSON.parse(localStorage.getItem('redio_bookmarks') || '[]')
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'redio-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    // Import settings
                    if (data.settings) {
                        localStorage.setItem('redio_theme', data.settings.theme);
                        localStorage.setItem('redio_search_engine', data.settings.searchEngine);
                        this.loadSettings();
                    }
                    
                    // Import other data
                    if (data.tabs) {
                        localStorage.setItem('redio_tabs', JSON.stringify(data.tabs));
                    }
                    
                    if (data.bookmarks) {
                        localStorage.setItem('redio_bookmarks', JSON.stringify(data.bookmarks));
                    }
                    
                    this.showToast('Data imported successfully');
                } catch (error) {
                    this.showToast('Invalid backup file', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    showToast(message, type = 'success') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'check-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        this.showToast(`An error occurred: ${event.message}`, 'error');
        return true; // Prevent default error handling
    }

    handlePromiseRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        this.showToast('An unexpected error occurred', 'error');
    }

    setupErrorHandling() {
        // Handle iframe errors
        const iframe = document.getElementById('browserFrame');
        if (iframe) {
            iframe.addEventListener('load', () => {
                try {
                    // Check for iframe errors
                    if (iframe.contentDocument && iframe.contentDocument.body.innerHTML.includes('error')) {
                        this.showToast('Error loading page', 'error');
                    }
                } catch (error) {
                    // Cross-origin errors are expected
                }
            });

            iframe.addEventListener('error', () => {
                this.showToast('Failed to load page', 'error');
            });
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.redio = new RedioApp();
    
    // Handle offline/online status
    window.addEventListener('online', () => {
        redio.showToast('You are back online');
    });
    
    window.addEventListener('offline', () => {
        redio.showToast('You are offline', 'warning');
    });
});

// Service Worker for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}