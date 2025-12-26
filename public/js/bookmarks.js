class BookmarksManager {
    constructor() {
        this.bookmarks = [];
        this.categories = [];
        this.quickAccess = [];
        this.recentlyVisited = [];
        this.mostVisited = [];
        this.init();
    }
    
    async init() {
        await this.loadBookmarks();
        this.setupEventListeners();
        this.renderBookmarks();
        this.setupSearch();
    }
    
    async loadBookmarks() {
        try {
            // Load from server first
            const response = await fetch('/api/bookmarks');
            if (response.ok) {
                const data = await response.json();
                this.bookmarks = data.bookmarks || [];
                this.categories = data.categories || [];
                this.quickAccess = data.quickAccess || [];
                this.recentlyVisited = data.recentlyVisited || [];
                this.mostVisited = data.mostVisited || [];
            } else {
                // Fallback to local file
                await this.loadLocalBookmarks();
            }
            
            // Load user bookmarks from localStorage
            this.loadUserBookmarks();
            
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            await this.loadLocalBookmarks();
        }
    }
    
    async loadLocalBookmarks() {
        try {
            const response = await fetch('/config/bookmarks.json');
            if (response.ok) {
                const data = await response.json();
                this.bookmarks = data.bookmarks || [];
                this.categories = data.categories || [];
                this.quickAccess = data.quickAccess || [];
                this.recentlyVisited = data.recentlyVisited || [];
                this.mostVisited = data.mostVisited || [];
            }
        } catch (error) {
            console.error('Error loading local bookmarks:', error);
            // Use default bookmarks
            this.loadDefaultBookmarks();
        }
    }
    
    loadDefaultBookmarks() {
        this.categories = [
            {
                id: 'social',
                name: 'Social Media',
                icon: 'fas fa-share-alt',
                bookmarks: [
                    {
                        id: 'youtube',
                        name: 'YouTube',
                        url: 'https://www.youtube.com',
                        icon: 'fab fa-youtube',
                        description: 'Watch videos'
                    }
                ]
            }
        ];
        
        this.quickAccess = [
            {
                id: 'google',
                name: 'Google',
                url: 'https://www.google.com',
                icon: 'fab fa-google'
            }
        ];
    }
    
    loadUserBookmarks() {
        try {
            const userBookmarks = localStorage.getItem('redio_user_bookmarks');
            if (userBookmarks) {
                const data = JSON.parse(userBookmarks);
                this.mergeUserBookmarks(data);
            }
        } catch (error) {
            console.error('Error loading user bookmarks:', error);
        }
    }
    
    mergeUserBookmarks(userData) {
        // Merge user bookmarks with system bookmarks
        if (userData.bookmarks) {
            this.bookmarks = [...this.bookmarks, ...userData.bookmarks];
        }
        
        if (userData.categories) {
            this.categories = [...this.categories, ...userData.categories];
        }
        
        if (userData.quickAccess) {
            this.quickAccess = [...this.quickAccess, ...userData.quickAccess];
        }
        
        // Load visited sites
        this.loadVisitedSites();
    }
    
    loadVisitedSites() {
        try {
            const visited = JSON.parse(localStorage.getItem('redio_visited_sites') || '[]');
            this.recentlyVisited = visited.slice(0, 10);
            
            // Calculate most visited
            this.calculateMostVisited(visited);
            
        } catch (error) {
            console.error('Error loading visited sites:', error);
        }
    }
    
    calculateMostVisited(visited) {
        const visitCount = {};
        
        visited.forEach(site => {
            const url = site.url || site;
            visitCount[url] = (visitCount[url] || 0) + 1;
        });
        
        this.mostVisited = Object.entries(visitCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([url]) => {
                const site = visited.find(s => (s.url || s) === url) || { url };
                return {
                    url: site.url || site,
                    name: site.name || this.extractDomain(url),
                    icon: site.icon || 'fas fa-globe',
                    visits: visitCount[url]
                };
            });
    }
    
    setupEventListeners() {
        // Bookmark button in browser
        document.addEventListener('DOMContentLoaded', () => {
            this.setupBookmarkButton();
        });
        
        // Delegated events for bookmark actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.bookmark-item')) {
                const bookmarkId = e.target.closest('.bookmark-item').dataset.bookmarkId;
                this.openBookmark(bookmarkId);
            }
            
            if (e.target.closest('.add-bookmark-btn')) {
                this.addCurrentPageToBookmarks();
            }
            
            if (e.target.closest('.edit-bookmark-btn')) {
                const bookmarkId = e.target.closest('.bookmark-item').dataset.bookmarkId;
                this.editBookmark(bookmarkId);
            }
            
            if (e.target.closest('.delete-bookmark-btn')) {
                const bookmarkId = e.target.closest('.bookmark-item').dataset.bookmarkId;
                this.deleteBookmark(bookmarkId);
            }
        });
        
        // Drag and drop for bookmarks
        this.setupDragAndDrop();
    }
    
    setupBookmarkButton() {
        // Add bookmark button to browser toolbar
        const browserToolbar = document.querySelector('.url-bar');
        if (browserToolbar && !document.querySelector('.bookmark-button')) {
            const bookmarkBtn = document.createElement('button');
            bookmarkBtn.className = 'bookmark-button icon-btn';
            bookmarkBtn.title = 'Bookmark this page';
            bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
            bookmarkBtn.addEventListener('click', () => {
                this.addCurrentPageToBookmarks();
            });
            
            browserToolbar.appendChild(bookmarkBtn);
        }
    }
    
    setupSearch() {
        const searchInput = document.getElementById('bookmarksSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchBookmarks(e.target.value);
            });
        }
    }
    
    setupDragAndDrop() {
        const bookmarksContainer = document.querySelector('.bookmarks-grid');
        if (!bookmarksContainer) return;
        
        let draggedItem = null;
        
        bookmarksContainer.addEventListener('dragstart', (e) => {
            if (e.target.closest('.bookmark-item')) {
                draggedItem = e.target.closest('.bookmark-item');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedItem.dataset.bookmarkId);
                draggedItem.classList.add('dragging');
            }
        });
        
        bookmarksContainer.addEventListener('dragend', (e) => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });
        
        bookmarksContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(bookmarksContainer, e.clientY);
            const draggable = document.querySelector('.bookmark-item.dragging');
            
            if (afterElement == null) {
                bookmarksContainer.appendChild(draggable);
            } else {
                bookmarksContainer.insertBefore(draggable, afterElement);
            }
        });
        
        bookmarksContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const bookmarkId = e.dataTransfer.getData('text/plain');
            this.saveBookmarkOrder();
        });
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.bookmark-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    renderBookmarks() {
        this.renderQuickAccess();
        this.renderCategories();
        this.renderRecentlyVisited();
        this.renderMostVisited();
    }
    
    renderQuickAccess() {
        const container = document.getElementById('quickAccessBookmarks');
        if (!container) return;
        
        if (this.quickAccess.length === 0) {
            container.innerHTML = '<p class="no-bookmarks">No quick access bookmarks</p>';
            return;
        }
        
        container.innerHTML = this.quickAccess.map(bookmark => `
            <div class="bookmark-item quick-access" data-bookmark-id="${bookmark.id}">
                <div class="bookmark-icon">
                    <i class="${bookmark.icon || 'fas fa-globe'}"></i>
                </div>
                <div class="bookmark-info">
                    <div class="bookmark-name">${bookmark.name}</div>
                    <div class="bookmark-url">${this.extractDomain(bookmark.url)}</div>
                </div>
                <div class="bookmark-actions">
                    <button class="bookmark-action-btn edit-bookmark-btn" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="bookmark-action-btn delete-bookmark-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    renderCategories() {
        const container = document.getElementById('bookmarksCategories');
        if (!container) return;
        
        if (this.categories.length === 0) {
            container.innerHTML = '<p class="no-categories">No bookmark categories</p>';
            return;
        }
        
        container.innerHTML = this.categories.map(category => `
            <div class="bookmark-category" data-category-id="${category.id}">
                <div class="category-header">
                    <i class="${category.icon || 'fas fa-folder'}"></i>
                    <h3>${category.name}</h3>
                    <span class="bookmark-count">${category.bookmarks?.length || 0}</span>
                </div>
                <div class="category-bookmarks">
                    ${category.bookmarks ? this.renderBookmarkList(category.bookmarks) : ''}
                </div>
            </div>
        `).join('');
    }
    
    renderBookmarkList(bookmarks) {
        if (!bookmarks || bookmarks.length === 0) {
            return '<p class="no-bookmarks">No bookmarks in this category</p>';
        }
        
        return bookmarks.map(bookmark => `
            <div class="bookmark-item" data-bookmark-id="${bookmark.id}" draggable="true">
                <div class="bookmark-icon">
                    <i class="${bookmark.icon || 'fas fa-globe'}"></i>
                </div>
                <div class="bookmark-info">
                    <div class="bookmark-name">${bookmark.name}</div>
                    <div class="bookmark-description">${bookmark.description || ''}</div>
                    <div class="bookmark-url">${this.extractDomain(bookmark.url)}</div>
                </div>
                <div class="bookmark-actions">
                    <button class="bookmark-action-btn edit-bookmark-btn" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="bookmark-action-btn delete-bookmark-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    renderRecentlyVisited() {
        const container = document.getElementById('recentlyVisited');
        if (!container) return;
        
        if (this.recentlyVisited.length === 0) {
            container.innerHTML = '<p class="no-history">No recently visited sites</p>';
            return;
        }
        
        container.innerHTML = this.recentlyVisited.map(site => `
            <div class="history-item" data-url="${site.url || site}">
                <div class="history-icon">
                    <i class="${site.icon || 'fas fa-globe'}"></i>
                </div>
                <div class="history-info">
                    <div class="history-name">${site.name || this.extractDomain(site.url || site)}</div>
                    <div class="history-url">${site.url || site}</div>
                    <div class="history-time">${this.formatTime(site.timestamp)}</div>
                </div>
                <button class="history-action-btn add-to-bookmarks" title="Add to bookmarks">
                    <i class="fas fa-bookmark"></i>
                </button>
            </div>
        `).join('');
        
        // Add event listeners for add to bookmarks buttons
        container.querySelectorAll('.add-to-bookmarks').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const historyItem = e.target.closest('.history-item');
                const url = historyItem.dataset.url;
                const name = historyItem.querySelector('.history-name').textContent;
                this.addBookmark({ url, name });
            });
        });
    }
    
    renderMostVisited() {
        const container = document.getElementById('mostVisited');
        if (!container) return;
        
        if (this.mostVisited.length === 0) {
            container.innerHTML = '<p class="no-history">No frequently visited sites</p>';
            return;
        }
        
        container.innerHTML = this.mostVisited.map(site => `
            <div class="visited-item" data-url="${site.url}">
                <div class="visited-rank">${site.visits}</div>
                <div class="visited-icon">
                    <i class="${site.icon || 'fas fa-globe'}"></i>
                </div>
                <div class="visited-info">
                    <div class="visited-name">${site.name}</div>
                    <div class="visited-url">${this.extractDomain(site.url)}</div>
                </div>
            </div>
        `).join('');
    }
    
    openBookmark(bookmarkId) {
        const bookmark = this.findBookmark(bookmarkId);
        if (!bookmark) return;
        
        // Use main app's navigation if available
        if (window.redio) {
            window.redio.navigateToUrl(bookmark.url);
        } else {
            window.open(bookmark.url, '_blank');
        }
        
        // Track visit
        this.trackVisit(bookmark);
    }
    
    findBookmark(bookmarkId) {
        // Search in all categories
        for (const category of this.categories) {
            if (category.bookmarks) {
                const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
                if (bookmark) return bookmark;
            }
        }
        
        // Search in quick access
        return this.quickAccess.find(b => b.id === bookmarkId);
    }
    
    addCurrentPageToBookmarks() {
        const currentUrl = document.getElementById('urlInput')?.value || window.location.href;
        const currentTitle = document.title;
        
        this.showAddBookmarkModal(currentTitle, currentUrl);
    }
    
    showAddBookmarkModal(name = '', url = '') {
        const modal = document.createElement('div');
        modal.className = 'bookmark-modal';
        modal.innerHTML = `
            <div class="bookmark-modal-content">
                <h3>Add Bookmark</h3>
                <div class="form-group">
                    <label for="bookmarkName">Name</label>
                    <input type="text" id="bookmarkName" value="${name}" placeholder="Bookmark name">
                </div>
                <div class="form-group">
                    <label for="bookmarkUrl">URL</label>
                    <input type="url" id="bookmarkUrl" value="${url}" placeholder="https://example.com">
                </div>
                <div class="form-group">
                    <label for="bookmarkCategory">Category</label>
                    <select id="bookmarkCategory">
                        <option value="">Select category</option>
                        ${this.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                        <option value="new">New Category</option>
                    </select>
                </div>
                <div id="newCategoryGroup" style="display: none;">
                    <label for="newCategoryName">New Category Name</label>
                    <input type="text" id="newCategoryName" placeholder="Category name">
                </div>
                <div class="form-group">
                    <label for="bookmarkIcon">Icon</label>
                    <input type="text" id="bookmarkIcon" value="fas fa-globe" placeholder="Font Awesome icon class">
                </div>
                <div class="form-group">
                    <label for="bookmarkDescription">Description (optional)</label>
                    <textarea id="bookmarkDescription" placeholder="Bookmark description"></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn secondary" id="cancelBookmark">Cancel</button>
                    <button class="btn primary" id="saveBookmark">Save Bookmark</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show/hide new category field
        const categorySelect = modal.querySelector('#bookmarkCategory');
        const newCategoryGroup = modal.querySelector('#newCategoryGroup');
        
        categorySelect.addEventListener('change', () => {
            newCategoryGroup.style.display = categorySelect.value === 'new' ? 'block' : 'none';
        });
        
        // Event listeners
        modal.querySelector('#cancelBookmark').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#saveBookmark').addEventListener('click', () => {
            this.saveNewBookmark(modal);
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    saveNewBookmark(modal) {
        const name = modal.querySelector('#bookmarkName').value.trim();
        const url = modal.querySelector('#bookmarkUrl').value.trim();
        const categoryId = modal.querySelector('#bookmarkCategory').value;
        const newCategoryName = modal.querySelector('#newCategoryName')?.value.trim();
        const icon = modal.querySelector('#bookmarkIcon').value.trim() || 'fas fa-globe';
        const description = modal.querySelector('#bookmarkDescription').value.trim();
        
        if (!name || !url) {
            alert('Please enter both name and URL');
            return;
        }
        
        const newBookmark = {
            id: 'bookmark_' + Date.now(),
            name,
            url,
            icon,
            description
        };
        
        let targetCategoryId = categoryId;
        
        // Create new category if selected
        if (categoryId === 'new' && newCategoryName) {
            const newCategory = {
                id: 'category_' + Date.now(),
                name: newCategoryName,
                icon: 'fas fa-folder',
                bookmarks: []
            };
            this.categories.push(newCategory);
            targetCategoryId = newCategory.id;
        }
        
        // Add bookmark to category
        if (targetCategoryId) {
            const category = this.categories.find(c => c.id === targetCategoryId);
            if (category) {
                if (!category.bookmarks) category.bookmarks = [];
                category.bookmarks.push(newBookmark);
            }
        } else {
            // Add to quick access if no category selected
            this.quickAccess.push(newBookmark);
        }
        
        this.saveBookmarks();
        this.renderBookmarks();
        modal.remove();
        
        this.showToast('Bookmark added successfully');
    }
    
    editBookmark(bookmarkId) {
        const bookmark = this.findBookmark(bookmarkId);
        if (!bookmark) return;
        
        // Find category containing this bookmark
        let category = null;
        for (const cat of this.categories) {
            if (cat.bookmarks?.some(b => b.id === bookmarkId)) {
                category = cat;
                break;
            }
        }
        
        const modal = document.createElement('div');
        modal.className = 'bookmark-modal';
        modal.innerHTML = `
            <div class="bookmark-modal-content">
                <h3>Edit Bookmark</h3>
                <div class="form-group">
                    <label for="bookmarkName">Name</label>
                    <input type="text" id="bookmarkName" value="${bookmark.name}">
                </div>
                <div class="form-group">
                    <label for="bookmarkUrl">URL</label>
                    <input type="url" id="bookmarkUrl" value="${bookmark.url}">
                </div>
                <div class="form-group">
                    <label for="bookmarkIcon">Icon</label>
                    <input type="text" id="bookmarkIcon" value="${bookmark.icon || 'fas fa-globe'}">
                </div>
                <div class="form-group">
                    <label for="bookmarkDescription">Description</label>
                    <textarea id="bookmarkDescription">${bookmark.description || ''}</textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn danger" id="deleteBookmark">Delete</button>
                    <button class="btn secondary" id="cancelEdit">Cancel</button>
                    <button class="btn primary" id="saveEdit">Save Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('#cancelEdit').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#deleteBookmark').addEventListener('click', () => {
            if (confirm('Delete this bookmark?')) {
                this.deleteBookmark(bookmarkId);
                modal.remove();
            }
        });
        
        modal.querySelector('#saveEdit').addEventListener('click', () => {
            bookmark.name = modal.querySelector('#bookmarkName').value.trim();
            bookmark.url = modal.querySelector('#bookmarkUrl').value.trim();
            bookmark.icon = modal.querySelector('#bookmarkIcon').value.trim();
            bookmark.description = modal.querySelector('#bookmarkDescription').value.trim();
            
            this.saveBookmarks();
            this.renderBookmarks();
            modal.remove();
            
            this.showToast('Bookmark updated');
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    deleteBookmark(bookmarkId) {
        // Remove from categories
        for (const category of this.categories) {
            if (category.bookmarks) {
                const index = category.bookmarks.findIndex(b => b.id === bookmarkId);
                if (index !== -1) {
                    category.bookmarks.splice(index, 1);
                    break;
                }
            }
        }
        
        // Remove from quick access
        const quickIndex = this.quickAccess.findIndex(b => b.id === bookmarkId);
        if (quickIndex !== -1) {
            this.quickAccess.splice(quickIndex, 1);
        }
        
        this.saveBookmarks();
        this.renderBookmarks();
        
        this.showToast('Bookmark deleted');
    }
    
    searchBookmarks(query) {
        if (!query.trim()) {
            this.renderBookmarks();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const results = [];
        
        // Search in all bookmarks
        this.categories.forEach(category => {
            if (category.bookmarks) {
                category.bookmarks.forEach(bookmark => {
                    if (
                        bookmark.name.toLowerCase().includes(searchTerm) ||
                        bookmark.url.toLowerCase().includes(searchTerm) ||
                        (bookmark.description && bookmark.description.toLowerCase().includes(searchTerm))
                    ) {
                        results.push({
                            ...bookmark,
                            category: category.name
                        });
                    }
                });
            }
        });
        
        // Search in quick access
        this.quickAccess.forEach(bookmark => {
            if (
                bookmark.name.toLowerCase().includes(searchTerm) ||
                bookmark.url.toLowerCase().includes(searchTerm)
            ) {
                results.push({
                    ...bookmark,
                    category: 'Quick Access'
                });
            }
        });
        
        this.renderSearchResults(results);
    }
    
    renderSearchResults(results) {
        const container = document.querySelector('.bookmarks-search-results');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = '<p class="no-results">No matching bookmarks found</p>';
            return;
        }
        
        container.innerHTML = results.map(bookmark => `
            <div class="search-result-item" data-bookmark-id="${bookmark.id}">
                <div class="result-icon">
                    <i class="${bookmark.icon || 'fas fa-globe'}"></i>
                </div>
                <div class="result-info">
                    <div class="result-name">${bookmark.name}</div>
                    <div class="result-url">${bookmark.url}</div>
                    <div class="result-category">${bookmark.category}</div>
                </div>
                <button class="result-action-btn open-bookmark" title="Open">
                    <i class="fas fa-external-link-alt"></i>
                </button>
            </div>
        `).join('');
        
        // Add event listeners
        container.querySelectorAll('.open-bookmark').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resultItem = e.target.closest('.search-result-item');
                const bookmarkId = resultItem.dataset.bookmarkId;
                this.openBookmark(bookmarkId);
            });
        });
    }
    
    trackVisit(bookmark) {
        const visit = {
            url: bookmark.url,
            name: bookmark.name,
            icon: bookmark.icon,
            timestamp: Date.now()
        };
        
        try {
            let visited = JSON.parse(localStorage.getItem('redio_visited_sites') || '[]');
            
            // Remove if already exists (to maintain recency)
            visited = visited.filter(v => v.url !== bookmark.url);
            
            // Add to beginning
            visited.unshift(visit);
            
            // Keep only last 50 visits
            visited = visited.slice(0, 50);
            
            localStorage.setItem('redio_visited_sites', JSON.stringify(visited));
            
            // Update recently visited
            this.recentlyVisited = visited.slice(0, 10);
            this.calculateMostVisited(visited);
            this.renderRecentlyVisited();
            this.renderMostVisited();
            
        } catch (error) {
            console.error('Error tracking visit:', error);
        }
    }
    
    saveBookmarks() {
        const data = {
            categories: this.categories,
            quickAccess: this.quickAccess,
            recentlyVisited: this.recentlyVisited,
            mostVisited: this.mostVisited,
            lastUpdated: Date.now()
        };
        
        try {
            localStorage.setItem('redio_user_bookmarks', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving bookmarks:', error);
        }
    }
    
    saveBookmarkOrder() {
        // Save the current order of bookmarks
        this.saveBookmarks();
    }
    
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
    }
    
    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' minutes ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
        if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago';
        
        return date.toLocaleDateString();
    }
    
    showToast(message) {
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
    
    // Public API methods
    addBookmark(bookmarkData) {
        const newBookmark = {
            id: 'bookmark_' + Date.now(),
            name: bookmarkData.name || this.extractDomain(bookmarkData.url),
            url: bookmarkData.url,
            icon: bookmarkData.icon || 'fas fa-globe',
            description: bookmarkData.description || ''
        };
        
        // Add to quick access by default
        this.quickAccess.push(newBookmark);
        this.saveBookmarks();
        this.renderBookmarks();
        
        this.showToast('Bookmark added');
        return newBookmark;
    }
    
    getBookmarkByUrl(url) {
        for (const category of this.categories) {
            if (category.bookmarks) {
                const bookmark = category.bookmarks.find(b => b.url === url);
                if (bookmark) return bookmark;
            }
        }
        
        return this.quickAccess.find(b => b.url === url);
    }
    
    exportBookmarks() {
        const data = {
            categories: this.categories,
            quickAccess: this.quickAccess,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redio-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    importBookmarks(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate data structure
                    if (data.categories && Array.isArray(data.categories)) {
                        this.categories = data.categories;
                    }
                    
                    if (data.quickAccess && Array.isArray(data.quickAccess)) {
                        this.quickAccess = data.quickAccess;
                    }
                    
                    this.saveBookmarks();
                    this.renderBookmarks();
                    
                    this.showToast('Bookmarks imported successfully');
                    resolve();
                    
                } catch (error) {
                    this.showToast('Invalid bookmarks file');
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                this.showToast('Error reading file');
                reject(new Error('File read error'));
            };
            
            reader.readAsText(file);
        });
    }
    
    clearHistory() {
        if (confirm('Clear all browsing history?')) {
            localStorage.removeItem('redio_visited_sites');
            this.recentlyVisited = [];
            this.mostVisited = [];
            this.renderRecentlyVisited();
            this.renderMostVisited();
            this.showToast('History cleared');
        }
    }
}

// Initialize bookmarks manager
document.addEventListener('DOMContentLoaded', () => {
    window.bookmarksManager = new BookmarksManager();
});