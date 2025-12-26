const cors = require('cors');

// Allowed origins for CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://redio.site',
    'https://www.redio.site',
    'https://redio.railway.app',
    'https://*.railway.app',
    'https://*.vercel.app'
];

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Check for wildcard domains
            const isAllowed = allowedOrigins.some(allowedOrigin => {
                if (allowedOrigin.includes('*')) {
                    const regex = new RegExp('^' + allowedOrigin.replace('*', '.*') + '$');
                    return regex.test(origin);
                }
                return false;
            });
            
            if (isAllowed) {
                callback(null, true);
            } else {
                console.log('Blocked by CORS:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ['X-Proxy-Server', 'X-Cache-Hit'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'User-Agent',
        'Referer',
        'Accept-Language',
        'Accept-Encoding',
        'DNT',
        'Connection',
        'Upgrade-Insecure-Requests'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    maxAge: 86400 // 24 hours
};

// Additional CORS middleware for specific routes
const proxyCorsOptions = {
    ...corsOptions,
    origin: true, // Allow all origins for proxy (but we'll validate in the proxy itself)
    credentials: false // No credentials for proxy
};

// Custom CORS middleware for error handling
const corsMiddleware = (req, res, next) => {
    cors(corsOptions)(req, res, (err) => {
        if (err) {
            console.error('CORS Error:', err.message);
            res.status(403).json({
                error: 'CORS Error',
                message: 'Cross-origin request blocked',
                allowedOrigins: allowedOrigins.filter(o => !o.includes('*'))
            });
        } else {
            next();
        }
    });
};

// CORS middleware for proxy routes
const proxyCorsMiddleware = (req, res, next) => {
    cors(proxyCorsOptions)(req, res, (err) => {
        if (err) {
            console.error('Proxy CORS Error:', err.message);
            res.status(403).json({
                error: 'Proxy CORS Error',
                message: 'Cross-origin proxy request blocked'
            });
        } else {
            // Additional security headers for proxy
            res.set({
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Referrer-Policy': 'no-referrer',
                'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
            });
            next();
        }
    });
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
    }
});

// Specific rate limiter for proxy endpoints
const proxyRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // More restrictive for proxy
    message: {
        error: 'Proxy rate limit exceeded',
        message: 'Too many proxy requests. Please wait.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Remove unnecessary headers
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    const securityHeadersConfig = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "font-src 'self' https://cdnjs.cloudflare.com",
            "img-src 'self' data: https: http:",
            "connect-src 'self' https://* http://*",
            "frame-src 'self' https://* http://*",
            "media-src 'self' https: http:"
        ].join('; ')
    };
    
    Object.entries(securityHeadersConfig).forEach(([header, value]) => {
        res.setHeader(header, value);
    });
    
    next();
};

// Error handling middleware for CORS and security
const errorHandler = (err, req, res, next) => {
    console.error('Security Middleware Error:', err);
    
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'File too large',
            message: 'The file you are trying to upload is too large'
        });
    }
    
    if (err.name === 'PayloadTooLargeError') {
        return res.status(413).json({
            error: 'Payload too large',
            message: 'Request payload is too large'
        });
    }
    
    res.status(err.status || 500).json({
        error: 'Security Error',
        message: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = {
    corsMiddleware,
    proxyCorsMiddleware,
    rateLimiter,
    proxyRateLimiter,
    securityHeaders,
    errorHandler,
    allowedOrigins
};