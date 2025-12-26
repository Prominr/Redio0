class HistoryManager {
    constructor() {
        this.history = [];
        this.filteredHistory = [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.searchTerm = '';
        this.startDate = null;
        this.endDate = null;
        this.groupByDomain = true;
        this.sortBy = 'date';
        this.sortOrder = 'desc';
        this.init();
    }
    
    init() {
        this.loadHistory();
        this.setupEventListeners();
        this.renderHistory();
        this.setupSearch();
    }
    
    loadHistory() {
        try {
            const saved = localStorage.getItem('redio_browser_history');
            if (saved) {
                const data = JSON.parse(saved);
                this.history = data.history || [];
                this.filteredHistory = [...this.history];
                
                // Clean up old entries
                this.cleanupOldEntries();
            }
        } catch (error) {
            console.error('Error loading history:', error);
            this.history = [];
            this.filteredHistory = [];
        }
    }
    
    cleanupOldEntries() {
        const retentionDays = 90;
        const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        
        this.history = this.history.filter(entry => {
            return entry.timestamp >= cutoffDate;
        });
        
        this.saveHistory();
    }
    
    saveHistory() {
        const data = {
            history: this.history,
            lastUpdated: Date.now(),
            totalEntries: this.history.length
        };
        
        try {
            localStorage.setItem('redio_browser_history', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }
    
    setupEventListeners() {
        // History item clicks (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.history-item')) {
                const entryId = e.target.closest('.history-item').dataset.entryId;
                this.openHistoryEntry(entryId);
            }
            
            if (e.target.closest('.delete-history-btn')) {
                const entryId = e.target.closest('.history-item').dataset.entryId;
                this.deleteHistoryEntry(entryId);
            }
            
            if (e.target.closest('.clear-history-btn')) {
                this.clearHistory();
            }
            
            if (e.target.closest('.export-history-btn')) {
                this.exportHistory();
            }
        });
        
        // Date filter changes
        const startDateInput = document.getElementById('historyStartDate');
        const endDateInput = document.getElementById('historyEndDate');
        
        if (startDateInput) {
            startDateInput.addEventListener('change', () => {
                this.startDate = startDateInput.value ? new Date(startDateInput.value) : null;
                this.filterHistory();
                this.renderHistory();
            });
        }
        
        if (endDateInput) {
            endDateInput.addEventListener('change', () => {
                this.endDate = endDateInput.value ? new Date(endDateInput.value) : null;
                this.filterHistory();
                this.renderHistory();
            });
        }
        
        // Sort options
        const sortSelect = document.getElementById('historySort');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                const [sortBy, order] = sortSelect.value.split('_');
                this.sortBy = sortBy;
                this.sortOrder = order;
                this.sortHistory();
                this.renderHistory();
            });
        }
        
        // Group by domain toggle
        const groupToggle = document.getElementById('groupByDomain');
        if (groupToggle) {
            groupToggle.addEventListener('change', () => {
                this.groupByDomain = groupToggle.checked;
                this.renderHistory();
            });
        }
    }
    
    setupSearch() {
        const searchInput = document.getElementById('historySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterHistory();
                this.renderHistory();
            });
        }
    }
    
    addHistoryEntry(url, title = '', favicon = '') {
        const entry = {
            id: 'history_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            url,
            title: title || this.extractTitleFromUrl(url),
            favicon: favicon || this.getFaviconUrl(url),
            timestamp: Date.now(),
            visitCount: 1,
            lastVisit: Date.now()
        };
        
        // Check if URL already exists in history
        const existingIndex = this.history.findIndex(e => e.url === url);
        
        if (existingIndex !== -1) {
            // Update existing entry
            this.history[existingIndex].visitCount++;
            this.history[existingIndex].lastVisit = Date.now();
            this.history[existingIndex].title = title || this.history[existingIndex].title;
        } else {
            // Add new entry at beginning
            this.history.unshift(entry);
            
            // Limit history size
            if (this.history.length > 1000) {
                this.history = this.history.slice(0, 1000);
            }
        }
        
        this.saveHistory();
        this.filterHistory();
        
        // Only render if on history page
        if (document.getElementById('historyPage')?.classList.contains('active')) {
            this.renderHistory();
        }
    }
    
    filterHistory() {
        let filtered = [...this.history];
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(entry => 
                entry.title.toLowerCase().includes(this.searchTerm) ||
                entry.url.toLowerCase().includes(this.searchTerm)
            );
        }
        
        // Apply date filter
        if (this.startDate) {
            filtered = filtered.filter(entry => 
                new Date(entry.timestamp) >= this.startDate
            );
        }
        
        if (this.endDate) {
            filtered = filtered.filter(entry => 
                new Date(entry.timestamp) <= this.endDate
            );
        }
        
        this.filteredHistory = filtered;
        this.sortHistory();
    }
    
    sortHistory() {
        this.filteredHistory.sort((a, b) => {
            let comparison = 0;
            
            switch(this.sortBy) {
                case 'date':
                    comparison = b.timestamp - a.timestamp;
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'url':
                    comparison = a.url.localeCompare(b.url);
                    break;
                case 'visits':
                    comparison = b.visitCount - a.visitCount;
                    break;
            }
            
            return this.sortOrder === 'desc' ? comparison : -comparison;
        });
    }
    
    renderHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const entriesToShow = this.filteredHistory.slice(startIndex, endIndex);
        
        if (entriesToShow.length === 0) {
            container.innerHTML = this.getEmptyState();
            this.renderPagination();
            return;
        }
        
        if (this.groupByDomain) {
            container.innerHTML = this.renderGroupedHistory(entriesToShow);
        } else {
            container.innerHTML = this.renderListHistory(entriesToShow);
        }
        
        this.renderPagination();
        this.updateStats();
    }
    
    renderGroupedHistory(entries) {
        // Group entries by domain
        const groups = {};
        
        entries.forEach(entry => {
            const domain = this.extractDomain(entry.url);
            if (!groups[domain]) {
                groups[domain] = {
                    domain,
                    favicon: entry.favicon,
                    entries: []
                };
            }
            groups[domain].entries.push(entry);
        });
        
        // Convert to array and sort by most recent
        const sortedGroups = Object.values(groups).sort((a, b) => {
            const latestA = Math.max(...a.entries.map(e => e.timestamp));
            const latestB = Math.max(...b.entries.map(e => e.timestamp));
            return latestB - latestA;
        });
        
        return sortedGroups.map(group => `
            <div class="history-group">
                <div class="group-header">
                    <img src="${group.favicon}" alt="" class="group-favicon" onerror="this.src='/assets/icons/globe.svg'">
                    <h3 class="group-domain">${group.domain}</h3>
                    <span class="group-count">${group.entries.length} visits</span>
                </div>
                <div class="group-entries">
                    ${group.entries.map(entry => this.renderHistoryEntry(entry)).join('')}
                </div>
            </div>
        `).join('');
    }
    
    renderListHistory(entries) {
        return entries.map(entry => this.renderHistoryEntry(entry)).join('');
    }
    
    renderHistoryEntry(entry) {
        const visitDate = new Date(entry.timestamp);
        const now = new Date();
        const timeDiff = now - visitDate;
        
        let timeDisplay;
        if (timeDiff < 60000) {
            timeDisplay = 'Just now';
        } else if (timeDiff < 3600000) {
            const minutes = Math.floor(timeDiff / 60000);
            timeDisplay = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (timeDiff < 86400000) {
            const hours = Math.floor(timeDiff / 3600000);
            timeDisplay = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (timeDiff < 604800000) {
            const days = Math.floor(timeDiff / 86400000);
            timeDisplay = `${days} day${days !== 1 ? 's' : ''} ago`;
        } else {
            timeDisplay = visitDate.toLocaleDateString();
        }
        
        return `
            <div class="history-item" data-entry-id="${entry.id}">
                <div class="history-icon">
                    <img src="${entry.favicon}" alt="" class="history-favicon" onerror="this.src='/assets/icons/globe.svg'">
                </div>
                <div class="history-info">
                    <div class="history-title">${entry.title}</div>
                    <div class="history-url">${entry.url}</div>
                    <div class="history-meta">
                        <span class="history-time">${timeDisplay}</span>
                        <span class="history-visits">${entry.visitCount} visit${entry.visitCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="history-action-btn open-history" title="Open">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="history-action-btn delete-history-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderPagination() {
        const container = document.getElementById('historyPagination');
        if (!container) return;
        
        const totalPages = Math.ceil(this.filteredHistory.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="historyManager.goToPage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;
        
        // Show page numbers
        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="historyManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        paginationHTML += `
            <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="historyManager.goToPage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        container.innerHTML = paginationHTML;
    }
    
    updateStats() {
        const statsContainer = document.getElementById('historyStats');
        if (!statsContainer) return;
        
        const totalEntries = this.history.length;
        const filteredEntries = this.filteredHistory.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayVisits = this.history.filter(entry => 
            new Date(entry.timestamp) >= today
        ).length;
        
        const uniqueDomains = new Set(this.history.map(entry => 
            this.extractDomain(entry.url)
        )).size;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${totalEntries}</div>
                <div class="stat-label">Total Visits</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${todayVisits}</div>
                <div class="stat-label">Today</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${uniqueDomains}</div>
                <div class="stat-label">Unique Sites</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${filteredEntries}</div>
                <div class="stat-label">Filtered</div>
            </div>
        `;
    }
    
    getEmptyState() {
        if (this.searchTerm || this.startDate || this.endDate) {
            return `
                <div class="empty-history">
                    <i class="fas fa-search"></i>
                    <h3>No matching history found</h3>
                    <p>Try adjusting your search or filters</p>
                    <button class="btn secondary" onclick="historyManager.clearFilters()">
                        Clear Filters
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <h3>No browsing history yet</h3>
                <p>Your visited pages will appear here</p>
                <button class="btn primary" onclick="window.location.href = '/'">
                    Start Browsing
                </button>
            </div>
        `;
    }
    
    openHistoryEntry(entryId) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;
        
        // Use main app's navigation if available
        if (window.redio) {
            window.redio.navigateToUrl(entry.url);
        } else {
            window.open(entry.url, '_blank');
        }
        
        // Update visit count
        entry.visitCount++;
        entry.lastVisit = Date.now();
        this.saveHistory();
    }
    
    deleteHistoryEntry(entryId) {
        const index = this.history.findIndex(e => e.id === entryId);
        if (index !== -1) {
            this.history.splice(index, 1);
            this.saveHistory();
            this.filterHistory();
            this.renderHistory();
            this.showToast('History entry deleted');
        }
    }
    
    clearHistory() {
        if (confirm('Clear all browsing history? This action cannot be undone.')) {
            this.history = [];
            this.filteredHistory = [];
            this.saveHistory();
            this.renderHistory();
            this.showToast('History cleared');
        }
    }
    
    clearFilters() {
        this.searchTerm = '';
        this.startDate = null;
        this.endDate = null;
        
        // Reset form inputs
        const searchInput = document.getElementById('historySearch');
        const startDateInput = document.getElementById('historyStartDate');
        const endDateInput = document.getElementById('historyEndDate');
        
        if (searchInput) searchInput.value = '';
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        
        this.filterHistory();
        this.renderHistory();
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredHistory.length / this.itemsPerPage);
        
        if (page < 1 || page > totalPages || page === this.currentPage) {
            return;
        }
        
        this.currentPage = page;
        this.renderHistory();
        
        // Scroll to top of history list
        const historyList = document.getElementById('historyList');
        if (historyList) {
            historyList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    exportHistory() {
        const exportData = {
            history: this.history,
            exportDate: new Date().toISOString(),
            totalEntries: this.history.length,
            format: 'redio-history-json'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redio-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('History exported successfully');
    }
    
    importHistory(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.history && Array.isArray(data.history)) {
                        // Merge with existing history
                        this.history = [...data.history, ...this.history];
                        
                        // Remove duplicates by URL and timestamp
                        const seen = new Set();
                        this.history = this.history.filter(entry => {
                            const key = `${entry.url}_${entry.timestamp}`;
                            if (seen.has(key)) {
                                return false;
                            }
                            seen.add(key);
                            return true;
                        });
                        
                        // Sort by timestamp
                        this.history.sort((a, b) => b.timestamp - a.timestamp);
                        
                        this.saveHistory();
                        this.filterHistory();
                        this.renderHistory();
                        
                        this.showToast('History imported successfully');
                        resolve();
                    } else {
                        this.showToast('Invalid history file format');
                        reject(new Error('Invalid format'));
                    }
                } catch (error) {
                    this.showToast('Error reading history file');
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
    
    getFaviconUrl(url) {
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
        } catch {
            return '/assets/icons/globe.svg';
        }
    }
    
    extractTitleFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.replace('www.', '');
            const path = urlObj.pathname.split('/').filter(p => p).join(' - ');
            return path ? `${hostname} - ${path}` : hostname;
        } catch {
            return url;
        }
    }
    
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
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
    getHistory() {
        return [...this.history];
    }
    
    getFilteredHistory() {
        return [...this.filteredHistory];
    }
    
    getRecentHistory(limit = 10) {
        return this.history
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    
    getMostVisited(limit = 10) {
        const visited = {};
        
        this.history.forEach(entry => {
            if (!visited[entry.url]) {
                visited[entry.url] = {
                    ...entry,
                    totalVisits: 0
                };
            }
            visited[entry.url].totalVisits += entry.visitCount;
        });
        
        return Object.values(visited)
            .sort((a, b) => b.totalVisits - a.totalVisits)
            .slice(0, limit);
    }
    
    searchHistory(query, limit = 20) {
        const results = this.history.filter(entry => 
            entry.title.toLowerCase().includes(query.toLowerCase()) ||
            entry.url.toLowerCase().includes(query.toLowerCase())
        );
        
        return results.slice(0, limit);
    }
    
    getHistoryByDomain(domain, limit = 50) {
        return this.history
            .filter(entry => this.extractDomain(entry.url) === domain)
            .slice(0, limit);
    }
    
    getHistoryByDateRange(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        return this.history.filter(entry => 
            entry.timestamp >= start && entry.timestamp <= end
        );
    }
    
    deleteHistoryByDomain(domain) {
        const initialLength = this.history.length;
        this.history = this.history.filter(entry => 
            this.extractDomain(entry.url) !== domain
        );
        
        const deletedCount = initialLength - this.history.length;
        this.saveHistory();
        this.filterHistory();
        this.renderHistory();
        
        this.showToast(`Deleted ${deletedCount} entries from ${domain}`);
        return deletedCount;
    }
    
    deleteHistoryByDateRange(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        const initialLength = this.history.length;
        this.history = this.history.filter(entry => 
            entry.timestamp < start || entry.timestamp > end
        );
        
        const deletedCount = initialLength - this.history.length;
        this.saveHistory();
        this.filterHistory();
        this.renderHistory();
        
        this.showToast(`Deleted ${deletedCount} entries from date range`);
        return deletedCount;
    }
}

// Initialize history manager
document.addEventListener('DOMContentLoaded', () => {
    window.historyManager = new HistoryManager();
    
    // Add CSS for history
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .history-group {
            background: var(--surface-color);
            border-radius: 10px;
            margin-bottom: 20px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .group-header {
            display: flex;
            align-items: center;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .group-favicon {
            width: 20px;
            height: 20px;
            margin-right: 10px;
        }
        .group-domain {
            flex: 1;
            font-size: 1.1rem;
            margin: 0;
        }
        .group-count {
            background: rgba(99, 102, 241, 0.2);
            color: var(--primary-color);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.85rem;
        }
        .group-entries {
            padding: 10px;
        }
        .history-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            background: rgba(255, 255, 255, 0.02);
            transition: background 0.3s ease;
            cursor: pointer;
        }
        .history-item:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        .history-favicon {
            width: 16px;
            height: 16px;
            margin-right: 12px;
        }
        .history-info {
            flex: 1;
            min-width: 0;
        }
        .history-title {
            font-weight: 600;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .history-url {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .history-meta {
            display: flex;
            gap: 15px;
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        .history-actions {
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .history-item:hover .history-actions {
            opacity: 1;
        }
        .history-action-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-color);
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        .history-action-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--primary-color);
        }
        .history-action-btn.delete-history-btn:hover {
            background: var(--danger-color);
            border-color: var(--danger-color);
            color: white;
        }
        .empty-history {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary);
        }
        .empty-history i {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        .history-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-item {
            background: var(--surface-color);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
    `;
    document.head.appendChild(style);
});