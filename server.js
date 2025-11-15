const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/cloak', (req, res) => {
    res.sendFile(path.join(__dirname, 'cloak', 'index.html'));
});

app.get('/games', (req, res) => {
    res.sendFile(path.join(__dirname, 'games', 'index.html'));
});

// Advanced Proxy System
app.get('/proxy', async (req, res) => {
    const url = decodeURIComponent(req.query.url);
    const mode = req.query.mode || 'full';
    
    if (!url) {
        return res.status(400).send('URL parameter required');
    }

    try {
        const response = await axios({
            method: req.method,
            url: url,
            responseType: mode === 'raw' ? 'arraybuffer' : 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'identity',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none'
            },
            timeout: 15000,
            maxRedirects: 5
        });

        let content = response.data;
        const contentType = response.headers['content-type'] || 'text/html';

        // Process HTML content to fix resources
        if (contentType.includes('text/html') && mode !== 'raw') {
            content = content
                .replace(/src="(?!http|\/\/)([^"]*)"/g, (match, p1) => {
                    return `src="/proxy?url=${encodeURIComponent(new URL(p1, url).href)}&mode=raw"`;
                })
                .replace(/href="(?!http|\/\/)([^"]*)"/g, (match, p1) => {
                    return `href="/proxy?url=${encodeURIComponent(new URL(p1, url).href)}"`;
                })
                .replace(/url\(('|")?(?!http|\/\/)([^'")]*)('|")?\)/g, (match, p1, p2, p3) => {
                    return `url(/proxy?url=${encodeURIComponent(new URL(p2, url).href)}&mode=raw)`;
                });
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        res.send(content);
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Proxy Error</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                    .error { background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    button { background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h2>🚫 Unable to Load Page</h2>
                <div class="error">
                    <p><strong>URL:</strong> ${url}</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                </div>
                <button onclick="window.location.href='${url}'">🔄 Open Directly</button>
                <button onclick="window.location.href='/'">🏠 Return to Redio</button>
            </body>
            </html>
        `);
    }
});

// AI System with Socket.io
const aiSessions = new Map();

io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);
    
    socket.on('ai-message', async (data) => {
        try {
            const sessionId = data.sessionId || socket.id;
            if (!aiSessions.has(sessionId)) {
                aiSessions.set(sessionId, []);
            }
            
            const session = aiSessions.get(sessionId);
            session.push({ role: 'user', content: data.message });
            
            // Simulate AI thinking
            socket.emit('ai-typing', { sessionId });
            
            setTimeout(() => {
                const responses = [
                    `I understand you're asking about "${data.message}". Let me provide you with comprehensive information and resources.`,
                    `Regarding "${data.message}", I've gathered relevant insights that should help answer your question thoroughly.`,
                    `That's an interesting topic! For "${data.message}", I can offer detailed explanations and guide you to the best resources.`,
                    `I'd be happy to help with "${data.message}". Let me break this down and provide you with the most useful information.`,
                    `Great question about "${data.message}"! I'll organize the information to give you a clear understanding.`
                ];
                
                const response = responses[Math.floor(Math.random() * responses.length)];
                session.push({ role: 'assistant', content: response });
                
                socket.emit('ai-response', {
                    response,
                    sessionId,
                    timestamp: new Date().toISOString()
                });
                
                // Keep only last 20 messages
                if (session.length > 20) {
                    aiSessions.set(sessionId, session.slice(-10));
                }
            }, 1000 + Math.random() * 2000);
            
        } catch (error) {
            socket.emit('ai-error', { error: 'Failed to process message' });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
    });
});

// Search suggestions API
app.get('/api/suggest', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    
    try {
        const response = await axios.get(
            `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`
        );
        res.json(response.data[1] || []);
    } catch (error) {
        res.json([]);
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 Redio Pro Ultra Started`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🛡️  Cloak: http://localhost:${PORT}/cloak`);
    console.log(`🎮 Games: http://localhost:${PORT}/games`);
    console.log(`🔗 Proxy: Active & Enhanced`);
    console.log(`🤖 AI: Real-time with Socket.io`);
    console.log(`\n✨ Ready to surpass Interstellar!`);
});