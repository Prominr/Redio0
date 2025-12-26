class ProxyManager {
    constructor() {
        this.proxyTypes = {
            domestic: {
                name: 'Domestic',
                endpoint: '/proxy/fetch?url=',
                description: 'Fast local proxy',
                speed: 'fast'
            },
            dynamic: {
                name: 'Dynamic',
                endpoint: '/proxy/fetch?dynamic=true&url=',
                description: 'Dynamic routing proxy',
                speed: 'medium'
            },
            ultraviolet: {
                name: 'Ultraviolet',
                endpoint: 'https://uv.example.com/service/',
                description: 'Advanced web proxy',
                speed: 'medium'
            },
            rammerhead: {
                name: 'Rammerhead',
                endpoint: 'https://rh.example.com/browse?',
                description: 'Session-based proxy',
                speed: 'slow'
            }
        };
        
        this.currentProxy = 'domestic';
        this.cache = new Map();
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.setupCacheCleanup();
    }
    
    loadSettings() {
        const savedProxy = localStorage.getItem('redio_proxy_type');
        if (savedProxy && this.proxyTypes[savedProxy]) {
            this.currentProxy = savedProxy;
        }
    }
    
    saveSettings() {
        localStorage.setItem('redio_proxy_type', this.currentProxy);
    }
    
    setProxy(type) {
        if (this.proxyTypes[type]) {
            this.currentProxy = type;
            this.saveSettings();
            return true;
        }
        return false;
    }
    
    getProxyUrl(targetUrl) {
        const proxy = this.proxyTypes[this.currentProxy];
        
        // Check cache first
        const cacheKey = `${this.currentProxy}:${targetUrl}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        let proxyUrl;
        
        switch(this.currentProxy) {
            case 'domestic':
            case 'dynamic':
                proxyUrl = proxy.endpoint + encodeURIComponent(targetUrl);
                break;
                
            case 'ultraviolet':
                proxyUrl = proxy.endpoint + btoa(targetUrl);
                break;
                
            case 'rammerhead':
                proxyUrl = proxy.endpoint + 'url=' + encodeURIComponent(targetUrl);
                break;
                
            default:
                proxyUrl = '/proxy/fetch?url=' + encodeURIComponent(targetUrl);
        }
        
        // Cache the result
        this.cache.set(cacheKey, proxyUrl);
        
        return proxyUrl;
    }
    
    async fetchThroughProxy(url, options = {}) {
        try {
            const proxyUrl = this.getProxyUrl(url);
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ...options.headers
                },
                mode: 'cors',
                cache: 'no-cache',
                redirect: 'follow',
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || 'text/html';
            const content = await response.text();
            
            return {
                success: true,
                content: content,
                contentType: contentType,
                proxy: this.currentProxy,
                url: url
            };
            
        } catch (error) {
            console.error('Proxy fetch error:', error);
            
            // Fallback to direct fetch if proxy fails
            try {
                const directResponse = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (directResponse.ok) {
                    const content = await directResponse.text();
                    return {
                        success: true,
                        content: content,
                        contentType: directResponse.headers.get('content-type') || 'text/html',
                        proxy: 'direct',
                        url: url
                    };
                }
            } catch (directError) {
                console.error('Direct fetch also failed:', directError);
            }
            
            return {
                success: false,
                error: error.message,
                proxy: this.currentProxy,
                url: url
            };
        }
    }
    
    setupCacheCleanup() {
        // Clear cache every hour
        setInterval(() => {
            this.clearCache();
        }, 60 * 60 * 1000);
        
        // Also clear cache when switching proxies
        window.addEventListener('storage', (e) => {
            if (e.key === 'redio_proxy_type' && e.newValue !== this.currentProxy) {
                this.clearCache();
            }
        });
    }
    
    clearCache() {
        this.cache.clear();
        
        // Also clear localStorage cache
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith('redio_proxy_cache_')
        );
        
        keys.forEach(key => localStorage.removeItem(key));
    }
    
    async testProxySpeed(proxyType, testUrl = 'https://www.google.com') {
        const startTime = Date.now();
        
        try {
            const originalProxy = this.currentProxy;
            this.currentProxy = proxyType;
            
            const result = await this.fetchThroughProxy(testUrl);
            
            this.currentProxy = originalProxy;
            
            if (result.success) {
                const endTime = Date.now();
                return {
                    success: true,
                    speed: endTime - startTime,
                    proxy: proxyType
                };
            } else {
                return {
                    success: false,
                    error: result.error,
                    proxy: proxyType
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                proxy: proxyType
            };
        }
    }
    
    async testAllProxies() {
        const results = [];
        
        for (const proxyType of Object.keys(this.proxyTypes)) {
            const result = await this.testProxySpeed(proxyType);
            results.push(result);
            
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Sort by speed (fastest first)
        const successfulResults = results.filter(r => r.success);
        successfulResults.sort((a, b) => a.speed - b.speed);
        
        return {
            allResults: results,
            fastest: successfulResults[0],
            recommendations: successfulResults.slice(0, 2)
        };
    }
    
    getProxyInfo(type = null) {
        const proxyType = type || this.currentProxy;
        return this.proxyTypes[proxyType] || null;
    }
    
    getAllProxies() {
        return Object.entries(this.proxyTypes).map(([id, info]) => ({
            id,
            ...info
        }));
    }
    
    createProxyIframe(url, elementId = 'proxyFrame', options = {}) {
        const proxyUrl = this.getProxyUrl(url);
        const iframe = document.getElementById(elementId);
        
        if (!iframe) {
            console.error(`Element with id "${elementId}" not found`);
            return null;
        }
        
        const defaultOptions = {
            sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            referrerpolicy: 'no-referrer'
        };
        
        Object.assign(iframe, defaultOptions, options);
        iframe.src = proxyUrl;
        
        // Add load event listener
        iframe.addEventListener('load', () => {
            iframe.dispatchEvent(new CustomEvent('proxyloaded', {
                detail: { url, proxyUrl, proxyType: this.currentProxy }
            }));
        });
        
        iframe.addEventListener('error', () => {
            iframe.dispatchEvent(new CustomEvent('proxyerror', {
                detail: { url, proxyUrl, proxyType: this.currentProxy }
            }));
        });
        
        return iframe;
    }
    
    // Method to rewrite URLs in HTML content to go through proxy
    rewriteUrls(content, baseUrl) {
        if (!content || typeof content !== 'string') return content;
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            // Rewrite various types of URLs
            const attributes = ['href', 'src', 'action', 'data', 'poster', 'background', 'cite'];
            
            attributes.forEach(attr => {
                const elements = doc.querySelectorAll(`[${attr}]`);
                elements.forEach(element => {
                    const url = element.getAttribute(attr);
                    if (url && !url.startsWith('data:') && !url.startsWith('#')) {
                        try {
                            const absoluteUrl = new URL(url, baseUrl).href;
                            const proxyUrl = this.getProxyUrl(absoluteUrl);
                            element.setAttribute(attr, proxyUrl);
                        } catch (e) {
                            // Ignore invalid URLs
                        }
                    }
                });
            });
            
            // Rewrite inline styles
            const styleElements = doc.querySelectorAll('[style]');
            styleElements.forEach(element => {
                const style = element.getAttribute('style');
                const rewritten = style.replace(/url\(['"]?([^'")]+)['"]?\)/gi, (match, url) => {
                    if (!url.startsWith('data:')) {
                        try {
                            const absoluteUrl = new URL(url, baseUrl).href;
                            const proxyUrl = this.getProxyUrl(absoluteUrl);
                            return `url('${proxyUrl}')`;
                        } catch (e) {
                            return match;
                        }
                    }
                    return match;
                });
                element.setAttribute('style', rewritten);
            });
            
            // Rewrite script src
            const scripts = doc.querySelectorAll('script[src]');
            scripts.forEach(script => {
                const src = script.getAttribute('src');
                if (src && !src.startsWith('data:')) {
                    try {
                        const absoluteUrl = new URL(src, baseUrl).href;
                        const proxyUrl = this.getProxyUrl(absoluteUrl);
                        script.setAttribute('src', proxyUrl);
                    } catch (e) {
                        // Ignore invalid URLs
                    }
                }
            });
            
            return doc.documentElement.outerHTML;
            
        } catch (error) {
            console.error('Error rewriting URLs:', error);
            return content;
        }
    }
}

// Initialize proxy manager
document.addEventListener('DOMContentLoaded', () => {
    window.proxyManager = new ProxyManager();
    
    // Make proxyManager accessible globally
    if (window.redio) {
        window.redio.proxyManager = window.proxyManager;
    }
});