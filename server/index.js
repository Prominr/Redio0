const express = require('express');
const cors = require('./cors');
const helmet = require('helmet');
const compression = require('compression');
const proxyRouter = require('./proxy');
const aiRouter = require('./ai');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors.corsMiddleware);
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
app.use('/proxy/', cors.proxyRateLimiter);
app.use('/api/ai/', cors.rateLimiter);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/proxy', proxyRouter);
app.use('/api/ai', aiRouter);

// API endpoints
app.get('/api/search-engines', (req, res) => {
  const engines = require('../config/search-engines.json');
  res.json(engines);
});

app.get('/api/games', (req, res) => {
  const games = require('../config/games.json');
  res.json(games);
});

app.get('/api/apps', (req, res) => {
  const apps = require('../config/apps.json');
  res.json(apps);
});

app.get('/api/settings', (req, res) => {
  const settings = require('../config/site-config.json');
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  try {
    const newSettings = req.body;
    const configPath = path.join(__dirname, '../config/site-config.json');
    
    // Backup existing settings
    const backupPath = path.join(__dirname, '../config/site-config.backup.json');
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
    }
    
    // Save new settings
    fs.writeFileSync(configPath, JSON.stringify(newSettings, null, 2));
    
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// AI-powered error fixing endpoint
app.post('/api/fix-errors', async (req, res) => {
  try {
    const { url, html, errors } = req.body;
    
    // Analyze HTML for common errors
    const fixes = await analyzeAndFixHTML(html, errors);
    
    // Also fix common proxy errors
    const proxyFixes = fixProxyErrors(html);
    
    res.json({
      success: true,
      fixes: [...fixes, ...proxyFixes],
      fixedHTML: applyFixes(html, [...fixes, ...proxyFixes])
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fix errors' });
  }
});

async function analyzeAndFixHTML(html, errors) {
  const fixes = [];
  
  // Fix common HTML errors
  if (!html.includes('<!DOCTYPE html>')) {
    fixes.push({ type: 'doctype', fix: 'Add missing DOCTYPE' });
  }
  
  if (!html.includes('<meta charset="UTF-8">')) {
    fixes.push({ type: 'charset', fix: 'Add missing charset meta tag' });
  }
  
  if (!html.includes('<meta name="viewport"')) {
    fixes.push({ 
      type: 'viewport', 
      fix: 'Add viewport meta tag for mobile',
      code: '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    });
  }
  
  // Fix broken links
  const brokenLinks = findBrokenLinks(html);
  if (brokenLinks.length > 0) {
    fixes.push({
      type: 'links',
      fix: `Fix ${brokenLinks.length} broken links`,
      details: brokenLinks
    });
  }
  
  // Fix CSS issues
  const cssIssues = findCSSIssues(html);
  if (cssIssues.length > 0) {
    fixes.push({
      type: 'css',
      fix: `Fix ${cssIssues.length} CSS issues`,
      details: cssIssues
    });
  }
  
  // Fix JavaScript errors
  const jsErrors = findJSErrors(errors);
  if (jsErrors.length > 0) {
    fixes.push({
      type: 'javascript',
      fix: `Fix ${jsErrors.length} JavaScript errors`,
      details: jsErrors
    });
  }
  
  return fixes;
}

function findBrokenLinks(html) {
  const links = [];
  const linkRegex = /href="([^"]*)"|src="([^"]*)"/g;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1] || match[2];
    if (url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('#') && !url.startsWith('mailto:')) {
      links.push(url);
    }
  }
  
  return links.slice(0, 10); // Limit to first 10
}

function findCSSIssues(html) {
  const issues = [];
  
  // Check for inline style errors
  const styleRegex = /style="([^"]*)"/g;
  let match;
  
  while ((match = styleRegex.exec(html)) !== null) {
    const style = match[1];
    if (style.includes('undefined') || style.includes('null')) {
      issues.push(`Invalid style: ${style.substring(0, 50)}...`);
    }
  }
  
  return issues;
}

function findJSErrors(errors) {
  return errors || [];
}

function fixProxyErrors(html) {
  const fixes = [];
  
  // Fix relative URLs for proxy
  if (html.includes('href="/') || html.includes('src="/')) {
    fixes.push({
      type: 'proxy_urls',
      fix: 'Fix relative URLs for proxy',
      code: 'Convert relative URLs to absolute'
    });
  }
  
  // Fix iframe sandbox issues
  if (html.includes('<iframe') && !html.includes('sandbox')) {
    fixes.push({
      type: 'iframe_sandbox',
      fix: 'Add sandbox attribute to iframes',
      code: 'sandbox="allow-scripts allow-same-origin allow-forms"'
    });
  }
  
  return fixes;
}

function applyFixes(html, fixes) {
  let fixedHTML = html;
  
  fixes.forEach(fix => {
    switch (fix.type) {
      case 'doctype':
        if (!fixedHTML.startsWith('<!DOCTYPE')) {
          fixedHTML = '<!DOCTYPE html>\n' + fixedHTML;
        }
        break;
        
      case 'charset':
        if (!fixedHTML.includes('charset')) {
          fixedHTML = fixedHTML.replace('<head>', '<head>\n<meta charset="UTF-8">');
        }
        break;
        
      case 'viewport':
        if (!fixedHTML.includes('viewport')) {
          fixedHTML = fixedHTML.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">');
        }
        break;
        
      case 'iframe_sandbox':
        fixedHTML = fixedHTML.replace(/<iframe(?!.*sandbox)/g, '<iframe sandbox="allow-scripts allow-same-origin allow-forms" ');
        break;
    }
  });
  
  return fixedHTML;
}

// Serve app pages
app.get('/app/:appName', (req, res) => {
  const appName = req.params.appName;
  const appPath = path.join(__dirname, '../public/apps', `${appName}.html`);
  
  if (fs.existsSync(appPath)) {
    res.sendFile(appPath);
  } else {
    res.status(404).send('App not found');
  }
});

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/games', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/games.html'));
});

app.get('/apps', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/apps.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/settings.html'));
});

app.get('/cloak', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cloak.html'));
});

app.get('/ai', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/ai.html'));
});

app.get('/error-fixer', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/error-fixer.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// Error handling middleware
app.use(cors.errorHandler);

app.listen(PORT, () => {
  console.log(`Redio server running on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}`);
  console.log('AI Features: Enabled');
  console.log('Error Fixer: Enabled');
  console.log('Image Processing: Enabled');
});