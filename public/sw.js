// Service Worker for Redio
const CACHE_NAME = 'redio-v4.0.3';
const STATIC_CACHE = 'redio-static-v1';
const DYNAMIC_CACHE = 'redio-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/about.html',
    '/games.html',
    '/apps.html',
    '/settings.html',
    '/cloak.html',
    '/css/style.css',
    '/css/themes.css',
    '/js/main.js',
    '/js/proxy.js',
    '/js/tabs.js',
    '/js/cloak.js',
    '/js/settings.js',
    '/js/games.js',
    '/manifest.json',
    '/assets/icons/favicon.ico',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker installed');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old caches
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event with cache-first strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip proxy requests (they should always go to network)
    if (url.pathname.startsWith('/proxy/')) {
        return;
    }
    
    // Skip API requests (they should always go to network)
    if (url.pathname.startsWith('/api/')) {
        return;
    }
    
    // Skip external resources (cache selectively)
    if (url.origin !== self.location.origin) {
        // Cache some external resources
        if (url.href.includes('cdnjs.cloudflare.com')) {
            event.respondWith(
                caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        return fetch(event.request)
                            .then(response => {
                                // Don't cache if not successful
                                if (!response || response.status !== 200) {
                                    return response;
                                }
                                
                                // Clone the response
                                const responseToCache = response.clone();
                                
                                caches.open(DYNAMIC_CACHE)
                                    .then(cache => {
                                        cache.put(event.request, responseToCache);
                                    });
                                
                                return response;
                            })
                            .catch(error => {
                                console.error('Fetch failed:', error);
                                // Return offline page if available
                                return caches.match('/offline.html');
                            });
                    })
            );
        }
        return;
    }
    
    // For same-origin requests, use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Update cache in background
                    event.waitUntil(
                        updateCache(event.request)
                    );
                    return cachedResponse;
                }
                
                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        
                        // Return custom offline response for other requests
                        return new Response(JSON.stringify({
                            error: 'You are offline',
                            message: 'Please check your internet connection'
                        }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
            })
    );
});

// Update cache in background
function updateCache(request) {
    return fetch(request)
        .then(response => {
            if (!response || response.status !== 200) {
                return;
            }
            
            const responseToCache = response.clone();
            
            return caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    return cache.put(request, responseToCache);
                });
        })
        .catch(error => {
            console.error('Background cache update failed:', error);
        });
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-games') {
        event.waitUntil(syncGamesData());
    }
});

// Sync games data when online
function syncGamesData() {
    return fetch('/api/games')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(games => {
            // Store games in IndexedDB
            return storeGamesInDB(games);
        })
        .catch(error => {
            console.error('Background sync failed:', error);
        });
}

// Store games in IndexedDB
function storeGamesInDB(games) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('redio-games', 1);
        
        request.onerror = (event) => {
            reject('Error opening IndexedDB');
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['games'], 'readwrite');
            const store = transaction.objectStore('games');
            
            // Clear existing games
            store.clear();
            
            // Add new games
            games.forEach(game => {
                store.add(game);
            });
            
            transaction.oncomplete = () => {
                console.log('Games synced to IndexedDB');
                resolve();
            };
            
            transaction.onerror = (event) => {
                reject('Error storing games in IndexedDB');
            };
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('games')) {
                db.createObjectStore('games', { keyPath: 'id' });
            }
        };
    });
}

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    
    const options = {
        body: data.body || 'Redio notification',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-96.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Open'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Redio', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open') {
        const url = event.notification.data.url || '/';
        event.waitUntil(
            clients.openWindow(url)
        );
    }
});

// Get games from IndexedDB (for offline use)
self.addEventListener('message', (event) => {
    if (event.data.type === 'GET_GAMES') {
        getGamesFromDB()
            .then(games => {
                event.source.postMessage({
                    type: 'GAMES_RESPONSE',
                    games: games
                });
            })
            .catch(error => {
                event.source.postMessage({
                    type: 'GAMES_ERROR',
                    error: error.message
                });
            });
    }
});

function getGamesFromDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('redio-games', 1);
        
        request.onerror = (event) => {
            reject(new Error('Error opening IndexedDB'));
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['games'], 'readonly');
            const store = transaction.objectStore('games');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = (event) => {
                resolve(event.target.result || []);
            };
            
            getAllRequest.onerror = (event) => {
                reject(new Error('Error getting games from IndexedDB'));
            };
        };
    });
}

// Clean up old cache entries
function cleanupCache() {
    caches.open(DYNAMIC_CACHE)
        .then(cache => {
            return cache.keys()
                .then(keys => {
                    keys.forEach(key => {
                        cache.match(key)
                            .then(response => {
                                if (!response) {
                                    cache.delete(key);
                                    return;
                                }
                                
                                // Check if response is stale (older than 7 days)
                                const dateHeader = response.headers.get('date');
                                if (dateHeader) {
                                    const cachedDate = new Date(dateHeader);
                                    const age = Date.now() - cachedDate.getTime();
                                    
                                    if (age > 7 * 24 * 60 * 60 * 1000) { // 7 days
                                        cache.delete(key);
                                    }
                                }
                            });
                    });
                });
        });
}

// Run cleanup weekly
setInterval(cleanupCache, 7 * 24 * 60 * 60 * 1000);