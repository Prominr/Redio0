class CloakManager {
    constructor() {
        this.settings = {
            enabled: true,
            title: 'Google',
            icon: 'https://www.google.com/favicon.ico',
            urlMask: 'https://www.google.com',
            autoApply: true
        };
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        
        // Check if we should apply cloaking on page load
        if (this.settings.autoApply && !this.isCloakedPage()) {
            this.applyCloaking();
        }
        
        this.setupEventListeners();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('redio_cloak_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Error loading cloak settings:', e);
            }
        }
    }
    
    saveSettings() {
        localStorage.setItem('redio_cloak_settings', JSON.stringify(this.settings));
    }
    
    setupEventListeners() {
        // Listen for messages from cloaked tabs
        window.addEventListener('message', (event) => {
            if (event.data.type === 'cloak_request') {
                this.handleCloakRequest(event);
            }
        });
        
        // Listen for focus/blur events for additional cloaking
        window.addEventListener('blur', () => {
            if (this.settings.enabled) {
                this.applyTitleCloak();
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.settings.enabled) {
                this.restoreTitle();
            }
        });
    }
    
    isCloakedPage() {
        return window.location.href.includes('cloak=true') || 
               document.title !== 'Redio - Web Proxy & Games';
    }
    
    applyCloaking() {
        if (!this.settings.enabled) return;
        
        // Apply title cloaking
        this.applyTitleCloak();
        
        // Apply favicon cloaking
        this.applyFaviconCloak();
        
        // Additional cloaking measures
        this.applyAdditionalCloaking();
        
        // Setup history state cloaking
        this.setupHistoryCloaking();
    }
    
    applyTitleCloak() {
        // Store original title
        if (!document.title.startsWith('Redio')) {
            this.originalTitle = document.title;
        }
        
        // Set cloaked title
        document.title = this.settings.title;
        
        // Also modify the title in the DOM for extra measure
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleElement.textContent = this.settings.title;
        }
    }
    
    restoreTitle() {
        if (this.originalTitle) {
            document.title = this.originalTitle;
        } else {
            document.title = 'Redio - Web Proxy & Games';
        }
    }
    
    applyFaviconCloak() {
        // Create or update favicon
        let favicon = document.querySelector('link[rel="icon"]') || 
                     document.querySelector('link[rel="shortcut icon"]');
        
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        
        favicon.href = this.settings.icon;
        
        // Also set for Apple devices
        let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (!appleTouchIcon) {
            appleTouchIcon = document.createElement('link');
            appleTouchIcon.rel = 'apple-touch-icon';
            document.head.appendChild(appleTouchIcon);
        }
        appleTouchIcon.href = this.settings.icon;
    }
    
    applyAdditionalCloaking() {
        // Modify meta tags
        this.updateMetaTags();
        
        // Modify open graph tags for social media
        this.updateOpenGraphTags();
        
        // Modify twitter card tags
        this.updateTwitterTags();
    }
    
    updateMetaTags() {
        const metaTags = {
            'description': 'Search the world\'s information, including webpages, images, videos and more.',
            'keywords': 'search, google, information, web',
            'author': 'Google',
            'theme-color': '#4285f4'
        };
        
        Object.entries(metaTags).forEach(([name, content]) => {
            let meta = document.querySelector(`meta[name="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = name;
                document.head.appendChild(meta);
            }
            meta.content = content;
        });
    }
    
    updateOpenGraphTags() {
        const ogTags = {
            'og:title': this.settings.title,
            'og:description': 'Search the world\'s information',
            'og:image': 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png',
            'og:url': this.settings.urlMask,
            'og:site_name': 'Google'
        };
        
        Object.entries(ogTags).forEach(([property, content]) => {
            let meta = document.querySelector(`meta[property="${property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', property);
                document.head.appendChild(meta);
            }
            meta.content = content;
        });
    }
    
    updateTwitterTags() {
        const twitterTags = {
            'twitter:card': 'summary',
            'twitter:title': this.settings.title,
            'twitter:description': 'Search the world\'s information',
            'twitter:image': 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png'
        };
        
        Object.entries(twitterTags).forEach(([name, content]) => {
            let meta = document.querySelector(`meta[name="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = name;
                document.head.appendChild(meta);
            }
            meta.content = content;
        });
    }
    
    setupHistoryCloaking() {
        // Store original methods
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        // Override pushState
        history.pushState = function(state, title, url) {
            const cloakedTitle = window.cloakManager?.settings.title || title;
            return originalPushState.call(history, state, cloakedTitle, url);
        };
        
        // Override replaceState
        history.replaceState = function(state, title, url) {
            const cloakedTitle = window.cloakManager?.settings.title || title;
            return originalReplaceState.call(history, state, cloakedTitle, url);
        };
        
        // Listen for popstate events
        window.addEventListener('popstate', () => {
            if (window.cloakManager?.settings.enabled) {
                window.cloakManager.applyTitleCloak();
            }
        });
    }
    
    createCloakedWindow(url, title = null, icon = null) {
        if (!this.settings.enabled) {
            return window.open(url, '_blank');
        }
        
        const cloakedTitle = title || this.settings.title;
        const cloakedIcon = icon || this.settings.icon;
        
        // Open about:blank window
        const cloakedWindow = window.open('about:blank', '_blank');
        
        if (!cloakedWindow) {
            alert('Popup blocked! Please allow popups for this site.');
            return null;
        }
        
        // Write cloaked content to the new window
        const cloakedHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${cloakedTitle}</title>
                <link rel="icon" href="${cloakedIcon}">
                <meta name="description" content="Search the world's information">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background: #0f172a;
                    }
                    iframe {
                        width: 100%;
                        height: 100%;
                        border: none;
                        position: absolute;
                        top: 0;
                        left: 0;
                    }
                    .cloak-notice {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: rgba(0,0,0,0.7);
                        color: white;
                        padding: 5px 10px;
                        border-radius: 5px;
                        font-size: 12px;
                        z-index: 1000;
                        opacity: 0.5;
                        transition: opacity 0.3s;
                    }
                    .cloak-notice:hover {
                        opacity: 1;
                    }
                </style>
            </head>
            <body>
                <div class="cloak-notice" onclick="this.style.display='none'">
                    🔒 Cloaked Tab | Click to hide
                </div>
                <iframe src="${url}" 
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                </iframe>
                <script>
                    // Send cloaked status to parent
                    window.opener?.postMessage({
                        type: 'cloak_ready',
                        url: '${url}',
                        title: '${cloakedTitle}'
                    }, '*');
                    
                    // Listen for parent messages
                    window.addEventListener('message', (event) => {
                        if (event.data.type === 'cloak_update') {
                            if (event.data.title) {
                                document.title = event.data.title;
                            }
                            if (event.data.icon) {
                                document.querySelector('link[rel="icon"]').href = event.data.icon;
                            }
                        }
                    });
                    
                    // Update parent with page changes
                    const iframe = document.querySelector('iframe');
                    iframe.addEventListener('load', () => {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            window.opener?.postMessage({
                                type: 'cloak_page_loaded',
                                title: iframeDoc.title,
                                url: iframe.contentWindow.location.href
                            }, '*');
                        } catch (e) {
                            // Cross-origin error expected
                        }
                    });
                </script>
            </body>
            </html>
        `;
        
        cloakedWindow.document.write(cloakedHTML);
        cloakedWindow.document.close();
        
        return cloakedWindow;
    }
    
    handleCloakRequest(event) {
        if (event.data.type === 'cloak_request') {
            const { url, title, icon } = event.data;
            
            if (url) {
                const cloakedWindow = this.createCloakedWindow(
                    url, 
                    title || this.settings.title, 
                    icon || this.settings.icon
                );
                
                // Send response back
                event.source.postMessage({
                    type: 'cloak_response',
                    success: !!cloakedWindow,
                    window: cloakedWindow ? 'created' : 'blocked'
                }, event.origin);
            }
        }
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        // Re-apply cloaking with new settings
        if (this.settings.enabled) {
            this.applyCloaking();
        }
    }
    
    enable() {
        this.settings.enabled = true;
        this.saveSettings();
        this.applyCloaking();
    }
    
    disable() {
        this.settings.enabled = false;
        this.saveSettings();
        this.restoreTitle();
        this.restoreFavicon();
    }
    
    restoreFavicon() {
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.href = '/assets/icons/favicon.ico';
        }
    }
    
    getStatus() {
        return {
            enabled: this.settings.enabled,
            title: document.title,
            originalTitle: this.originalTitle || 'Redio - Web Proxy & Games',
            isCloaked: this.isCloakedPage()
        };
    }
    
    // Method to cloak current tab without opening new window
    cloakCurrentTab(title = null, icon = null) {
        if (!this.settings.enabled) return;
        
        const cloakedTitle = title || this.settings.title;
        const cloakedIcon = icon || this.settings.icon;
        
        // Update title
        this.originalTitle = document.title;
        document.title = cloakedTitle;
        
        // Update favicon
        this.applyFaviconCloak();
        
        // Update history state
        history.replaceState(history.state, cloakedTitle, window.location.href);
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('cloakapplied', {
            detail: { title: cloakedTitle, icon: cloakedIcon }
        }));
    }
    
    uncloakCurrentTab() {
        this.restoreTitle();
        this.restoreFavicon();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('cloakremoved'));
    }
}

// Initialize cloak manager
document.addEventListener('DOMContentLoaded', () => {
    window.cloakManager = new CloakManager();
    
    // Make cloakManager accessible globally
    if (window.redio) {
        window.redio.cloakManager = window.cloakManager;
    }
    
    // Add cloak button functionality
    const cloakBtn = document.getElementById('cloakBtn');
    if (cloakBtn) {
        cloakBtn.addEventListener('click', () => {
            const modal = document.getElementById('cloakModal');
            if (modal) {
                modal.classList.add('active');
            } else {
                // Fallback: open cloaked tab directly
                window.cloakManager.createCloakedWindow(window.location.origin);
            }
        });
    }
    
    // Handle cloaked tab opening from modal
    const cloakOpenBtn = document.getElementById('cloakOpen');
    if (cloakOpenBtn) {
        cloakOpenBtn.addEventListener('click', () => {
            const modal = document.getElementById('cloakModal');
            if (modal) {
                modal.classList.remove('active');
            }
            window.cloakManager.createCloakedWindow(window.location.origin);
        });
    }
    
    const cloakCancelBtn = document.getElementById('cloakCancel');
    if (cloakCancelBtn) {
        cloakCancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('cloakModal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    }
});