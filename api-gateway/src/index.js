require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { auth } = require('./middleware/auth');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Service configurations
const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    routes: ['/api/auth/*']
  },
  user: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    routes: ['/api/users/*']
  },
  content: {
    url: process.env.CONTENT_SERVICE_URL || 'http://localhost:3003',
    routes: ['/api/content/*']
  },
  media: {
    url: process.env.MEDIA_SERVICE_URL || 'http://localhost:3004',
    routes: ['/api/media/*']
  },
  category: {
    url: process.env.CATEGORY_SERVICE_URL || 'http://localhost:3005',
    routes: ['/api/categories/*']
  },
  comment: {
    url: process.env.COMMENT_SERVICE_URL || 'http://localhost:3006',
    routes: ['/api/comments/*']
  },
  notification: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    routes: ['/api/notifications/*']
  },
  analytics: {
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3008',
    routes: ['/api/analytics/*']
  },
  search: {
    url: process.env.SEARCH_SERVICE_URL || 'http://localhost:3009',
    routes: ['/api/search/*']
  },
  admin: {
    url: process.env.ADMIN_SERVICE_URL || 'http://localhost:3010',
    routes: ['/api/admin/*']
  }
};

// Proxy options
const proxyOptions = {
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add original IP to headers
    proxyReq.setHeader('X-Original-IP', req.ip);
    proxyReq.setHeader('X-Forwarded-For', req.ip);
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).json({
      error: {
        message: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      }
    });
  }
};

// Setup proxies for each service
Object.entries(services).forEach(([serviceName, config]) => {
  config.routes.forEach(route => {
    const proxy = createProxyMiddleware({
      ...proxyOptions,
      target: config.url,
      router: (req) => {
        // Add service name to request for logging
        req.serviceName = serviceName;
        return config.url;
      }
    });

    // Apply auth middleware to protected routes
    if (route !== '/api/auth/*') {
      app.use(route, auth, proxy);
    } else {
      app.use(route, proxy);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
}); 