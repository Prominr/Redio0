class SettingsManager {
    constructor() {
        this.settings = {
            theme: 'dark',
            searchEngine: 'google',
            customSearchEngine: '',
            proxyType: 'domestic',
            autoCloak: true,
            cloakTitle: 'Google',
            cloakIcon: 'https://www.google.com/favicon.ico',
            passwordEnabled: false,
            password: '',
            defaultPage: 'home',
            animationSpeed: 5,
            threads: ['main', 'worker1']
        };
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('redio_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
    }
    
    saveSettings() {
        localStorage.setItem('redio_settings', JSON.stringify(this.settings));
        this.showToast('Settings saved successfully');
    }
    
    setupEventListeners() {
        // Search Engine
        document.getElementById('searchEngineSelect')?.addEventListener('change', (e) => {
            this.settings.searchEngine = e.target.value;
        });
        
        // Custom Search Engine
        document.getElementById('customSearchEngine')?.addEventListener('input', (e) => {
            this.settings.customSearchEngine = e.target.value;
        });
        
        // Proxy Type
        document.getElementById('proxySelect')?.addEventListener('change', (e) => {
            this.settings.proxyType = e.target.value;
        });
        
        // Password Protection
        document.getElementById('enablePassword')?.addEventListener('change', (e) => {
            this.settings.passwordEnabled = e.target.checked;
        });
        
        document.getElementById('sitePassword')?.addEventListener('input', (e) => {
            this.settings.password = e.target.value;
        });
        
        // Cloaking Settings
        document.getElementById('autoCloak')?.addEventListener('change', (e) => {
            this.settings.autoCloak = e.target.checked;
        });
        
        document.getElementById('cloakTitle')?.addEventListener('input', (e) => {
            this.settings.cloakTitle = e.target.value;
        });
        
        document.getElementById('cloakIcon')?.addEventListener('input', (e) => {
            this.settings.cloakIcon = e.target.value;
        });
        
        // Themes
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
            });
        });
        
        // Default Page
        document.getElementById('defaultPage')?.addEventListener('change', (e) => {
            this.settings.defaultPage = e.target.value;
        });
        
        // Animation Speed
        const animationSpeed = document.getElementById('animationSpeed');
        const animationSpeedValue = document.getElementById('animationSpeedValue');
        
        if (animationSpeed && animationSpeedValue) {
            animationSpeed.addEventListener('input', (e) => {
                this.settings.animationSpeed = parseInt(e.target.value);
                const speeds = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
                animationSpeedValue.textContent = speeds[Math.floor(this.settings.animationSpeed / 2)];
            });
        }
        
        // Save All Button
        document.getElementById('saveAllSettings')?.addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Reset Button
        document.getElementById('resetSettings')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all settings to defaults?')) {
                this.resetToDefaults();
            }
        });
        
        // Export Settings
        document.getElementById('exportSettingsBtn')?.addEventListener('click', () => {
            this.exportSettings();
        });
        
        // Import Settings
        document.getElementById('importSettingsFile')?.addEventListener('change', (e) => {
            this.importSettings(e.target.files[0]);
        });
        
        // Clear Cache
        document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
            if (confirm('Clear all cached data?')) {
                this.clearCache();
            }
        });
        
        // Clear All Data
        document.getElementById('clearDataBtn')?.addEventListener('click', () => {
            if (confirm('This will delete ALL saved data including settings, tabs, and bookmarks. Continue?')) {
                this.clearAllData();
            }
        });
        
        // Export Store
        document.getElementById('exportStoreBtn')?.addEventListener('click', () => {
            this.exportStore();
        });
        
        // Thread checkboxes
        document.querySelectorAll('.threads-list input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateThreads();
            });
        });
    }
    
    updateUI() {
        // Set current values
        document.getElementById('searchEngineSelect').value = this.settings.searchEngine;
        document.getElementById('customSearchEngine').value = this.settings.customSearchEngine;
        document.getElementById('proxySelect').value = this.settings.proxyType;
        document.getElementById('enablePassword').checked = this.settings.passwordEnabled;
        document.getElementById('sitePassword').value = this.settings.password;
        document.getElementById('autoCloak').checked = this.settings.autoCloak;
        document.getElementById('cloakTitle').value = this.settings.cloakTitle;
        document.getElementById('cloakIcon').value = this.settings.cloakIcon;
        document.getElementById('defaultPage').value = this.settings.defaultPage;
        document.getElementById('animationSpeed').value = this.settings.animationSpeed;
        
        // Update theme active state
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === this.settings.theme);
        });
        
        // Update animation speed label
        const animationSpeedValue = document.getElementById('animationSpeedValue');
        if (animationSpeedValue) {
            const speeds = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
            animationSpeedValue.textContent = speeds[Math.floor(this.settings.animationSpeed / 2)];
        }
    }
    
    setTheme(theme) {
        this.settings.theme = theme;
        document.body.setAttribute('data-theme', theme);
        
        // Update UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });
    }
    
    updateThreads() {
        const threads = [];
        document.querySelectorAll('.threads-list input[type="checkbox"]:checked').forEach(checkbox => {
            threads.push(checkbox.id.replace('thread', '').toLowerCase());
        });
        this.settings.threads = threads;
    }
    
    exportSettings() {
        const data = {
            settings: this.settings,
            exportDate: new Date().toISOString(),
            version: '4.0.3'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redio-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Settings exported successfully');
    }
    
    importSettings(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                    this.saveSettings();
                    this.updateUI();
                    this.showToast('Settings imported successfully');
                } else {
                    this.showToast('Invalid settings file', 'error');
                }
            } catch (error) {
                console.error('Error importing settings:', error);
                this.showToast('Error importing settings', 'error');
            }
        };
        reader.readAsText(file);
    }
    
    exportStore() {
        const data = {
            settings: this.settings,
            tabs: JSON.parse(localStorage.getItem('redio_tabs') || '[]'),
            bookmarks: JSON.parse(localStorage.getItem('redio_bookmarks') || '[]'),
            games: JSON.parse(localStorage.getItem('redio_favorite_games') || '[]'),
            history: JSON.parse(localStorage.getItem('redio_history') || '[]'),
            exportDate: new Date().toISOString(),
            version: '4.0.3'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redio-full-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Full store exported successfully');
    }
    
    clearCache() {
        // Clear localStorage cache
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith('redio_cache_') || 
            key.startsWith('redio_game_cache_')
        );
        
        keys.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear IndexedDB (if used)
        this.clearIndexedDB();
        
        this.showToast('Cache cleared successfully');
    }
    
    clearIndexedDB() {
        // Clear any IndexedDB databases
        const databases = ['redio-games', 'redio-cache'];
        
        databases.forEach(dbName => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onerror = () => console.error(`Failed to delete database: ${dbName}`);
            request.onsuccess = () => console.log(`Database deleted: ${dbName}`);
        });
    }
    
    clearAllData() {
        // Clear all localStorage items starting with 'redio_'
        const keys = Object.keys(localStorage).filter(key => key.startsWith('redio_'));
        keys.forEach(key => localStorage.removeItem(key));
        
        // Clear all sessionStorage
        sessionStorage.clear();
        
        // Clear IndexedDB
        this.clearIndexedDB();
        
        // Reset settings to default
        this.resetToDefaults();
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
        this.showToast('All data cleared successfully');
    }
    
    resetToDefaults() {
        this.settings = {
            theme: 'dark',
            searchEngine: 'google',
            customSearchEngine: '',
            proxyType: 'domestic',
            autoCloak: true,
            cloakTitle: 'Google',
            cloakIcon: 'https://www.google.com/favicon.ico',
            passwordEnabled: false,
            password: '',
            defaultPage: 'home',
            animationSpeed: 5,
            threads: ['main', 'worker1']
        };
        
        this.saveSettings();
        this.updateUI();
        this.showToast('Settings reset to defaults');
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
}

// Initialize settings manager
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});