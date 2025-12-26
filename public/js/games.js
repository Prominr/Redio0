class GamesManager {
    constructor() {
        this.games = [];
        this.filteredGames = [];
        this.currentPage = 1;
        this.gamesPerPage = 12;
        this.currentCategory = 'all';
        this.currentSort = 'name';
        this.searchTerm = '';
        this.init();
    }
    
    async init() {
        await this.loadGamesFromServer();
        this.setupEventListeners();
        this.renderGames();
        this.renderCategories();
        this.renderFeaturedGames();
    }
    
    async loadGamesFromServer() {
        try {
            const response = await fetch('/api/games');
            if (!response.ok) throw new Error('Failed to load games');
            
            this.games = await response.json();
            this.filteredGames = [...this.games];
            
            // Cache games in localStorage for offline use
            localStorage.setItem('redio_games_cache', JSON.stringify({
                games: this.games,
                timestamp: Date.now()
            }));
            
        } catch (error) {
            console.error('Error loading games from server:', error);
            
            // Try to load from cache
            this.loadGamesFromCache();
        }
    }
    
    loadGamesFromCache() {
        try {
            const cached = localStorage.getItem('redio_games_cache');
            if (cached) {
                const data = JSON.parse(cached);
                const cacheAge = Date.now() - data.timestamp;
                
                // Use cache if less than 24 hours old
                if (cacheAge < 24 * 60 * 60 * 1000) {
                    this.games = data.games;
                    this.filteredGames = [...data.games];
                    return true;
                }
            }
        } catch (error) {
            console.error('Error loading games from cache:', error);
        }
        
        // Fallback to default games
        this.games = this.getDefaultGames();
        this.filteredGames = [...this.games];
        return false;
    }
    
    getDefaultGames() {
        return [
            {
                id: 'slope',
                name: 'Slope',
                description: '3D running game with challenging obstacles',
                url: 'https://slope-game.github.io',
                icon: 'fas fa-running',
                category: 'Racing',
                rating: 4.5,
                featured: true
            },
            {
                id: 'minecraft',
                name: 'Minecraft',
                description: 'Browser version of Minecraft',
                url: 'https://classic.minecraft.net',
                icon: 'fas fa-cube',
                category: 'Adventure',
                rating: 4.8,
                featured: true
            },
            {
                id: 'retrobowl',
                name: 'Retro Bowl',
                description: 'American football management game',
                url: 'https://www.retrobowl.app',
                icon: 'fas fa-football-ball',
                category: 'Sports',
                rating: 4.3
            },
            {
                id: 'tetris',
                name: 'Tetris',
                description: 'Classic block stacking game',
                url: 'https://tetris.com/play-tetris',
                icon: 'fas fa-th',
                category: 'Puzzle',
                rating: 4.7,
                featured: true
            }
        ];
    }
    
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('gamesSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterGames();
                this.renderGames();
                this.renderPagination();
            });
        }
        
        // Category filters (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.category-btn')) {
                const category = e.target.closest('.category-btn').dataset.category;
                this.setCategory(category);
            }
        });
        
        // Game card actions (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.play-btn')) {
                const gameId = e.target.closest('.game-card').dataset.gameId;
                this.playGame(gameId);
            }
            
            if (e.target.closest('.tab-btn')) {
                const gameId = e.target.closest('.game-card').dataset.gameId;
                this.addGameToTab(gameId);
            }
        });
    }
    
    filterGames() {
        let filtered = [...this.games];
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(game => 
                game.name.toLowerCase().includes(this.searchTerm) ||
                (game.description && game.description.toLowerCase().includes(this.searchTerm)) ||
                (game.category && game.category.toLowerCase().includes(this.searchTerm))
            );
        }
        
        // Apply category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(game => 
                game.category === this.currentCategory
            );
        }
        
        // Apply sort
        filtered.sort((a, b) => {
            switch(this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'rating':
                    return (b.rating || 0) - (a.rating || 0);
                case 'featured':
                    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
                default:
                    return 0;
            }
        });
        
        this.filteredGames = filtered;
    }
    
    setCategory(category) {
        this.currentCategory = category;
        this.currentPage = 1;
        
        // Update UI
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        this.filterGames();
        this.renderGames();
        this.renderPagination();
    }
    
    setSort(sortType) {
        this.currentSort = sortType;
        this.filterGames();
        this.renderGames();
    }
    
    renderGames() {
        const container = document.getElementById('gamesGrid');
        if (!container) return;
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.gamesPerPage;
        const endIndex = startIndex + this.gamesPerPage;
        const gamesToShow = this.filteredGames.slice(startIndex, endIndex);
        
        if (gamesToShow.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            container.innerHTML = '';
            return;
        }
        
        document.getElementById('emptyState').style.display = 'none';
        
        container.innerHTML = gamesToShow.map(game => `
            <div class="game-card" data-game-id="${game.id}">
                <div class="game-image">
                    <i class="${game.icon || 'fas fa-gamepad'}"></i>
                    ${game.featured ? '<span class="game-badge">Featured</span>' : ''}
                </div>
                <div class="game-content">
                    <h3 class="game-title">${game.name}</h3>
                    <p class="game-description">${game.description || 'Fun game to play'}</p>
                    <div class="game-meta">
                        <span class="game-category">${game.category || 'Arcade'}</span>
                        <span class="game-rating">
                            ${this.renderStars(game.rating || 0)}
                        </span>
                    </div>
                    <div class="game-actions">
                        <button class="play-btn">
                            <i class="fas fa-play"></i> Play Now
                        </button>
                        <button class="tab-btn" title="Open in New Tab">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }
    
    renderCategories() {
        const container = document.getElementById('categoryFilters');
        if (!container) return;
        
        // Get unique categories
        const categories = ['all', ...new Set(this.games.map(game => game.category || 'Other'))];
        
        container.innerHTML = categories.map(category => `
            <button class="category-btn ${category === this.currentCategory ? 'active' : ''}" 
                    data-category="${category}">
                ${category === 'all' ? 'All Games' : category}
            </button>
        `).join('');
    }
    
    renderFeaturedGames() {
        const container = document.getElementById('featuredGames');
        if (!container) return;
        
        const featuredGames = this.games.filter(game => game.featured).slice(0, 4);
        
        if (featuredGames.length === 0) return;
        
        container.innerHTML = featuredGames.map(game => `
            <div class="game-card" data-game-id="${game.id}">
                <div class="game-image">
                    <i class="${game.icon || 'fas fa-gamepad'}"></i>
                    <span class="game-badge">Featured</span>
                </div>
                <div class="game-content">
                    <h3 class="game-title">${game.name}</h3>
                    <p class="game-description">${game.description || 'Fun game to play'}</p>
                    <div class="game-actions">
                        <button class="play-btn">
                            <i class="fas fa-play"></i> Play Now
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;
        
        const totalPages = Math.ceil(this.filteredGames.length / this.gamesPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="gamesManager.goToPage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="gamesManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        paginationHTML += `
            <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="gamesManager.goToPage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        container.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredGames.length / this.gamesPerPage);
        
        if (page < 1 || page > totalPages || page === this.currentPage) {
            return;
        }
        
        this.currentPage = page;
        this.renderGames();
        this.renderPagination();
        
        // Scroll to top of games grid
        const gamesGrid = document.getElementById('gamesGrid');
        if (gamesGrid) {
            gamesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    playGame(gameId) {
        const game = this.games.find(g => g.id === gameId);
        if (!game) return;
        
        // Use the main app's method if available
        if (window.redio) {
            window.redio.openGame(game.url);
        } else {
            // Fallback: open in new window
            window.open(game.url, '_blank');
        }
        
        // Track game play (optional)
        this.trackGamePlay(gameId);
    }
    
    addGameToTab(gameId) {
        const game = this.games.find(g => g.id === gameId);
        if (!game) return;
        
        // Use tab manager if available
        if (window.tabManager) {
            window.tabManager.addGameTab(game);
            this.showToast(`${game.name} added to tabs`);
        } else {
            this.playGame(gameId);
        }
    }
    
    trackGamePlay(gameId) {
        // Track game plays in localStorage
        try {
            const plays = JSON.parse(localStorage.getItem('redio_game_plays') || '{}');
            plays[gameId] = (plays[gameId] || 0) + 1;
            localStorage.setItem('redio_game_plays', JSON.stringify(plays));
            
            // Update recent games
            const recent = JSON.parse(localStorage.getItem('redio_recent_games') || '[]');
            const updatedRecent = [gameId, ...recent.filter(id => id !== gameId)].slice(0, 10);
            localStorage.setItem('redio_recent_games', JSON.stringify(updatedRecent));
            
        } catch (error) {
            console.error('Error tracking game play:', error);
        }
    }
    
    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--surface-color);
            color: var(--text-color);
            padding: 12px 20px;
            border-radius: 8px;
            border-left: 4px solid var(--primary-color);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    getRecentlyPlayed(limit = 5) {
        try {
            const recentIds = JSON.parse(localStorage.getItem('redio_recent_games') || '[]');
            return recentIds
                .map(id => this.games.find(game => game.id === id))
                .filter(game => game)
                .slice(0, limit);
        } catch (error) {
            return [];
        }
    }
    
    getMostPlayed(limit = 5) {
        try {
            const plays = JSON.parse(localStorage.getItem('redio_game_plays') || '{}');
            
            return Object.entries(plays)
                .sort(([,a], [,b]) => b - a)
                .map(([id]) => this.games.find(game => game.id === id))
                .filter(game => game)
                .slice(0, limit);
        } catch (error) {
            return [];
        }
    }
    
    searchGames(query) {
        this.searchTerm = query.toLowerCase();
        this.filterGames();
        this.renderGames();
        this.renderPagination();
    }
    
    // Public API methods
    loadGames() {
        this.renderGames();
        this.renderCategories();
        this.renderPagination();
        this.renderFeaturedGames();
    }
    
    reloadGames() {
        return this.loadGamesFromServer();
    }
}

// Initialize games manager
document.addEventListener('DOMContentLoaded', () => {
    window.gamesManager = new GamesManager();
});