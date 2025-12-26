// Global state
const state = {
  currentTab: 'home',
  tabs: [],
  settings: {
    aboutBlank: false,
    tabCloak: { enabled: false, title: 'Google Classroom', favicon: '' },
    searchEngine: 'Google',
    proxyType: 'Ultraviolet',
    theme: 'dark',
    password: ''
  }
};

// Games data
const games = [
  { name: '1v1.lol', url: 'https://1v1.lol', icon: '🎮' },
  { name: 'Slope', url: 'https://slope-game.github.io', icon: '⛷️' },
  { name: 'Run 3', url: 'https://run3.io', icon: '🏃' },
  { name: 'Shell Shockers', url: 'https://shellshock.io', icon: '🥚' },
  { name: 'Minecraft', url: 'https://eaglercraft.com', icon: '⛏️' },
  { name: 'Subway Surfers', url: 'https://poki.com/en/g/subway-surfers', icon: '🚇' },
  { name: 'Among Us', url: 'https://www.crazygames.com/game/among-us', icon: '👾' },
  { name: 'Cookie Clicker', url: 'https://orteil.dashnet.org/cookieclicker/', icon: '🍪' },
  { name: 'Tetris', url: 'https://tetris.com/play-tetris', icon: '🧱' },
  { name: 'Zombs Royale', url: 'https://zombsroyale.io', icon: '🧟' },
];

// Apps data
const apps = [
  { name: 'YouTube', url: 'https://youtube.com', icon: '📺' },
  { name: 'Discord', url: 'https://discord.com/app', icon: '💬' },
  { name: 'Spotify', url: 'https://open.spotify.com', icon: '🎵' },
  { name: 'Netflix', url: 'https://netflix.com', icon: '🎬' },
  { name: 'TikTok', url: 'https://tiktok.com', icon: '🎭' },
  { name: 'Reddit', url: 'https://reddit.com', icon: '👽' },
  { name: 'Twitch', url: 'https://twitch.tv', icon: '🟣' },
  { name: 'GeForce NOW', url: 'https://play.geforcenow.com', icon: '🎮' },
  { name: 'Now.gg', url: 'https://now.gg', icon: '☁️' },
  { name: 'Instagram', url: 'https://instagram.com', icon: '📸' },
];

// Initialize app
function init() {
  loadSettings();
  renderGames();
  renderApps();
  setupEventListeners();
  checkPassword();
  applyTheme();
}

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('redio-settings');
  if (saved) {
    state.settings = { ...state.settings, ...JSON.parse(saved) };
  }
  applySettings();
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('redio-settings', JSON.stringify(state.settings));
  applySettings();
}

// Apply settings
function applySettings() {
  if (state.settings.aboutBlank) {
    document.title = 'about:blank';
  } else if (state.settings.tabCloak.enabled) {
    document.title = state.settings.tabCloak.title;
    if (state.settings.tabCloak.favicon) {
      setFavicon(state.settings.tabCloak.favicon);
    }
  } else {
    document.title = 'Redio';
  }
  
  document.getElementById('about-blank-toggle').checked = state.settings.aboutBlank;
  document.getElementById('tab-cloak-toggle').checked = state.settings.tabCloak.enabled;
  document.getElementById('search-engine').value = state.settings.searchEngine;
  document.getElementById('proxy-type').value = state.settings.proxyType;
  document.getElementById('theme-select').value = state.settings.theme;
  
  if (state.settings.tabCloak.enabled) {
    document.getElementById('tab-cloak-options').classList.remove('hidden');
  }
}

// Apply theme
function applyTheme() {
  document.body.className = state.settings.theme;
}

// Set favicon
function setFavicon(url) {
  let link = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

// Check password
function checkPassword() {
  if (state.settings.password) {
    const entered = prompt('Enter password to access Redio:');
    if (entered !== state.settings.password) {
      alert('Incorrect password!');
      window.location.href = 'https://google.com';
    }
  }
}

// Render games
function renderGames() {
  const grid = document.getElementById('games-grid');
  grid.innerHTML = games.map(game => `
    <div class="grid-item" onclick="openSite('${game.url}')">
      <div class="grid-item-icon">${game.icon}</div>
      <div class="grid-item-name">${game.name}</div>
    </div>
  `).join('');
}

// Render apps
function renderApps() {
  const grid = document.getElementById('apps-grid');
  grid.innerHTML = apps.map(app => `
    <div class="grid-item" onclick="openSite('${app.url}')">
      <div class="grid-item-icon">${app.icon}</div>
      <div class="grid-item-name">${app.name}</div>
    </div>
  `).join('');
}

// Open site in proxy
function openSite(url) {
  document.getElementById('proxy-view').classList.remove('hidden');
  document.getElementById('url-bar').value = url;
  loadProxyUrl(url);
  
  // Hide all other tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Add to tabs
  state.tabs.push({
    id: Date.now(),
    title: new URL(url).hostname,
    url: url
  });
  renderTabs();
}

// Load URL in proxy frame
function loadProxyUrl(url) {
  const frame = document.getElementById('proxy-frame');
  frame.src = url;
}

// Render tabs
function renderTabs() {
  const list = document.getElementById('tabs-list');
  list.innerHTML = state.tabs.map(tab => `
    <div class="tab-item">
      <div class="tab-item-info">
        <h3>${tab.title}</h3>
        <div class="tab-item-url">${tab.url}</div>
      </div>
      <button class="btn" onclick="openSite('${tab.url}')">Open</button>
    </div>
  `).join('');
}

// Switch tabs
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(tabName + '-tab').classList.add('active');
  document.getElementById('proxy-view').classList.add('hidden');
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      if (tab) {
        switchTab(tab);
      }
    });
  });

  // Settings modal
  document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.remove('hidden');
  });

  document.getElementById('close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });

  // Search form
  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('search-input').value;
    handleSearch(query);
  });

  // Proxy controls
  document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('proxy-frame').contentWindow.history.back();
  });

  document.getElementById('go-btn').addEventListener('click', () => {
    const url = document.getElementById('url-bar').value;
    loadProxyUrl(url);
  });

  document.getElementById('close-proxy-btn').addEventListener('click', () => {
    document.getElementById('proxy-view').classList.add('hidden');
    switchTab('home');
  });

  // Settings toggles
  document.getElementById('about-blank-toggle').addEventListener('change', (e) => {
    state.settings.aboutBlank = e.target.checked;
    saveSettings();
  });

  document.getElementById('tab-cloak-toggle').addEventListener('change', (e) => {
    state.settings.tabCloak.enabled = e.target.checked;
    const options = document.getElementById('tab-cloak-options');
    if (e.target.checked) {
      options.classList.remove('hidden');
    } else {
      options.classList.add('hidden');
    }
    saveSettings();
  });

  document.getElementById('save-cloak').addEventListener('click', () => {
    state.settings.tabCloak.title = document.getElementById('cloak-title').value;
    state.settings.tabCloak.favicon = document.getElementById('cloak-favicon').value;
    saveSettings();
    alert('Tab cloak settings saved!');
  });

  document.getElementById('search-engine').addEventListener('change', (e) => {
    state.settings.searchEngine = e.target.value;
    saveSettings();
  });

  document.getElementById('proxy-type').addEventListener('change', (e) => {
    state.settings.proxyType = e.target.value;
    saveSettings();
  });

  document.getElementById('theme-select').addEventListener('change', (e) => {
    state.settings.theme = e.target.value;
    saveSettings();
    applyTheme();
  });

  document.getElementById('save-password').addEventListener('click', () => {
    const password = document.getElementById('password-input').value;
    if (password) {
      state.settings.password = password;
      saveSettings();
      alert('Password saved! You will need to enter this password on next visit.');
    }
  });

  document.getElementById('export-data').addEventListener('click', () => {
    const dataStr = JSON.stringify(state);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'redio-data.json';
    link.click();
  });

  document.getElementById('import-data').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          Object.assign(state, data);
          saveSettings();
          alert('Data imported successfully!');
          location.reload();
        } catch (err) {
          alert('Error importing data!');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  document.getElementById('clear-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.clear();
      alert('All data cleared!');
      location.reload();
    }
  });
}

// Handle search
function handleSearch(query) {
  if (!query) return;
  
  let url = query;
  if (!query.includes('.') && !query.startsWith('http')) {
    const engines = {
      'Google': `https://google.com/search?q=${encodeURIComponent(query)}`,
      'DuckDuckGo': `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      'Bing': `https://bing.com/search?q=${encodeURIComponent(query)}`,
    };
    url = engines[state.settings.searchEngine];
  } else if (!query.startsWith('http')) {
    url = 'https://' + query;
  }
  
  openSite(url);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}