const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { URL } = require('url');

// Proxy endpoint
router.get('/fetch', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Block sensitive domains (optional)
    const blockedDomains = ['localhost', '127.0.0.1', '192.168.', '10.', '172.16.'];
    const isBlocked = blockedDomains.some(domain => url.includes(domain));
    
    if (isBlocked) {
      return res.status(403).json({ error: 'Access to this domain is restricted' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow',
      follow: 20
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    const content = await response.text();

    // Modify content to work through proxy
    let modifiedContent = content
      .replace(/<head>/i, `<head><base href="${url}">`)
      .replace(/(href|src)=("|')(?!https?:|\/\/)/gi, `$1=$2${parsedUrl.origin}/`)
      .replace(/(action)=("|')(?!https?:|\/\/)/gi, `$1=$2/proxy/fetch?url=${encodeURIComponent(parsedUrl.origin)}/`);

    res.set('Content-Type', contentType);
    res.set('X-Proxy-Server', 'Redio/4.0.3');
    res.send(modifiedContent);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch URL',
      message: error.message 
    });
  }
});

// POST proxy for forms
router.post('/fetch', async (req, res) => {
  try {
    const url = req.query.url;
    const body = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: new URLSearchParams(body).toString(),
      redirect: 'follow'
    });

    const content = await response.text();
    res.set('Content-Type', 'text/html');
    res.send(content);

  } catch (error) {
    console.error('POST Proxy error:', error);
    res.status(500).json({ error: 'Failed to process form' });
  }
});

module.exports = router;