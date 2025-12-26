class TabManager {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.nextTabId = 1;
        this.init();
    }
    
    init() {
        this.loadTabs();
        this.setupEventListeners();
        this.renderTabs();
    }
    
    loadTabs() {
        const savedTabs = localStorage.getItem('redio_tabs');
        if (savedTabs) {
            try {
                this.tabs = JSON.parse(savedTabs);
                this.nextTabId = Math.max(...this.tabs.map(t => t.id), 0) + 1;
                
                // Find active tab
                const activeTab = this.tabs.find(tab => tab.active);
                if (activeTab) {
                    this.activeTabId = activeTab.id;
                } else if (this.tabs.length > 0) {
                    this.activeTabId = this.tabs[0].id;
                    this.tabs[0].active = true;
                }
            } catch (e) {
                console.error('Error loading tabs:', e);
                this.tabs = [];
            }
        }
    }
    
    saveTabs() {
        localStorage.setItem('redio_tabs', JSON.stringify(this.tabs));
        this.updateTabCount();
    }
    
    setupEventListeners() {
        // New Tab Button
        const newTabBtn = document.getElementById('newTabBtn');
        if (newTabBtn) {
            newTabBtn.addEventListener('click', () => this.createNewTab());
        }
        
        // Tab switching (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tab-item')) {
                const tabId = parseInt(e.target.closest('.tab-item').dataset.tabId);
                this.switchToTab(tabId);
            }
            
            if (e.target.closest('.tab-close')) {
                const tabId = parseInt(e.target.closest('.tab-item').dataset.tabId);
                this.closeTab(tabId);
            }
        });
    }
    
    createNewTab(title = 'New Tab', url = '', type = 'blank') {
        const newTab = {
            id: this.nextTabId++,
            title: title,
            url: url,
            type: type,
            active: true,
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };
        
        // Deactivate other tabs
        this.tabs.forEach(tab => tab.active = false);
        
        // Add new tab
        this.tabs.push(newTab);
        this.activeTabId = newTab.id;
        
        this.saveTabs();
        this.renderTabs();
        
        // Load tab content
        this.loadTabContent(newTab.id);
        
        return newTab.id;
    }
    
    switchToTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        // Update active states
        this.tabs.forEach(t => t.active = false);
        tab.active = true;
        tab.lastAccessed = new Date().toISOString();
        this.activeTabId = tabId;
        
        this.saveTabs();
        this.renderTabs();
        
        // Load tab content
        this.loadTabContent(tabId);
    }
    
    closeTab(tabId) {
        const tabIndex = this.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        const wasActive = this.tabs[tabIndex].active;
        this.tabs.splice(tabIndex, 1);
        
        if (wasActive && this.tabs.length > 0) {
            // Activate the tab to the left, or the first tab
            const newActiveIndex = Math.max(0, tabIndex - 1);
            this.tabs[newActiveIndex].active = true;
            this.activeTabId = this.tabs[newActiveIndex].id;
            this.loadTabContent(this.activeTabId);
        } else if (this.tabs.length === 0) {
            this.activeTabId = null;
            this.showEmptyState();
        }
        
        this.saveTabs();
        this.renderTabs();
    }
    
    updateTab(tabId, updates) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        Object.assign(tab, updates, { lastAccessed: new Date().toISOString() });
        this.saveTabs();
        this.renderTabs();
    }
    
    renderTabs() {
        const tabsList = document.getElementById('tabsList');
        const tabContent = document.getElementById('tabContent');
        
        if (!tabsList) return;
        
        if (this.tabs.length === 0) {
            tabsList.innerHTML = '<div class="empty-tabs-list">No tabs open</div>';
            this.showEmptyState();
            return;
        }
        
        // Render tabs list
        tabsList.innerHTML = this.tabs.map(tab => `
            <div class="tab-item ${tab.active ? 'active' : ''}" data-tab-id="${tab.id}">
                <div class="tab-header">
                    <span class="tab-title">${this.escapeHtml(tab.title)}</span>
                    <button class="tab-close" title="Close tab">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="tab-url">${this.truncateUrl(tab.url)}</div>
                <div class="tab-meta">
                    <small>${new Date(tab.createdAt).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
        
        // Show active tab content
        if (this.activeTabId) {
            this.loadTabContent(this.activeTabId);
        }
    }
    
    loadTabContent(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        const tabContent = document.getElementById('tabContent');
        if (!tabContent) return;
        
        switch(tab.type) {
            case 'browser':
                tabContent.innerHTML = `
                    <div class="tab-browser">
                        <div class="tab-browser-header">
                            <input type="text" class="tab-url-input" value="${tab.url}" 
                                   placeholder="Enter URL..." data-tab-id="${tab.id}">
                            <button class="btn small primary tab-go-btn" data-tab-id="${tab.id}">
                                <i class="fas fa-external-link-alt"></i> Go
                            </button>
                        </div>
                        <iframe class="tab-browser-frame" 
                                src="${tab.url ? `/proxy/fetch?url=${encodeURIComponent(tab.url)}` : ''}"
                                sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
                    </div>
                `;
                
                // Add event listeners for this tab's browser
                setTimeout(() => {
                    const urlInput = tabContent.querySelector(`.tab-url-input[data-tab-id="${tab.id}"]`);
                    const goBtn = tabContent.querySelector(`.tab-go-btn[data-tab-id="${tab.id}"]`);
                    
                    if (urlInput && goBtn) {
                        const navigate = () => {
                            const url = urlInput.value.trim();
                            if (url) {
                                this.updateTab(tabId, { url: url });
                                const iframe = tabContent.querySelector('.tab-browser-frame');
                                if (iframe) {
                                    iframe.src = `/proxy/fetch?url=${encodeURIComponent(url)}`;
                                }
                            }
                        };
                        
                        urlInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') navigate();
                        });
                        
                        goBtn.addEventListener('click', navigate);
                    }
                }, 0);
                break;
                
            case 'game':
                tabContent.innerHTML = `
                    <div class="tab-game">
                        <h3>${tab.title}</h3>
                        <iframe class="tab-game-frame" 
                                src="${tab.url}"
                                sandbox="allow-scripts allow-same-origin"></iframe>
                    </div>
                `;
                break;
                
            case 'app':
                tabContent.innerHTML = `
                    <div class="tab-app">
                        <h3>${tab.title}</h3>
                        <div class="tab-app-content">
                            <p>App content for ${tab.title}</p>
                            <!-- App-specific content would go here -->
                        </div>
                    </div>
                `;
                break;
                
            default:
                this.showEmptyState();
                break;
        }
    }
    
    showEmptyState() {
        const tabContent = document.getElementById('tabContent');
        if (tabContent) {
            tabContent.innerHTML = `
                <div class="empty-tabs">
                    <i class="fas fa-folder-open fa-3x"></i>
                    <h3>No tabs open</h3>
                    <p>Create a new tab to get started</p>
                    <button class="btn primary" id="createFirstTab">
                        <i class="fas fa-plus"></i> Create New Tab
                    </button>
                </div>
            `;
            
            // Add event listener for create button
            setTimeout(() => {
                const createBtn = document.getElementById('createFirstTab');
                if (createBtn) {
                    createBtn.addEventListener('click', () => this.createNewTab());
                }
            }, 0);
        }
    }
    
    updateTabCount() {
        const count = this.tabs.length;
        const tabCountElement = document.querySelector('.tab-count');
        
        if (tabCountElement) {
            tabCountElement.textContent = count;
            tabCountElement.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }
    
    truncateUrl(url, maxLength = 40) {
        if (!url) return 'No URL';
        if (url.length <= maxLength) return url;
        
        const start = url.substring(0, 15);
        const end = url.substring(url.length - 20);
        return `${start}...${end}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API methods
    addGameTab(game) {
        return this.createNewTab(game.name, game.url, 'game');
    }
    
    addBrowserTab(url, title = 'New Browser Tab') {
        return this.createNewTab(title, url, 'browser');
    }
    
    addAppTab(app) {
        return this.createNewTab(app.name, app.url, 'app');
    }
    
    closeAllTabs() {
        this.tabs = [];
        this.activeTabId = null;
        this.saveTabs();
        this.renderTabs();
    }
    
    closeOtherTabs(tabId) {
        this.tabs = this.tabs.filter(tab => tab.id === tabId);
        if (this.tabs.length > 0) {
            this.tabs[0].active = true;
            this.activeTabId = this.tabs[0].id;
            this.loadTabContent(this.activeTabId);
        } else {
            this.activeTabId = null;
            this.showEmptyState();
        }
        this.saveTabs();
        this.renderTabs();
    }
    
    duplicateTab(tabId) {
        const originalTab = this.tabs.find(t => t.id === tabId);
        if (!originalTab) return;
        
        const newTab = {
            ...originalTab,
            id: this.nextTabId++,
            title: `${originalTab.title} (Copy)`,
            active: true,
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };
        
        // Deactivate other tabs
        this.tabs.forEach(tab => tab.active = false);
        
        this.tabs.push(newTab);
        this.activeTabId = newTab.id;
        
        this.saveTabs();
        this.renderTabs();
        this.loadTabContent(newTab.id);
        
        return newTab.id;
    }
    
    getActiveTab() {
        return this.tabs.find(tab => tab.active);
    }
    
    getAllTabs() {
        return [...this.tabs];
    }
    
    getTabCount() {
        return this.tabs.length;
    }
}

// Initialize tab manager
document.addEventListener('DOMContentLoaded', () => {
    window.tabManager = new TabManager();
    
    // Make tabManager accessible globally
    if (window.redio) {
        window.redio.tabManager = window.tabManager;
    }
});