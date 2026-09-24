const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use((req, res, next) => {
    console.log(`[GATEWAY] Menangkap request: ${req.method} ${req.url}`);
    next();
});

// Route SPESIFIK didaftarkan lebih dulu, sebelum catch-all
app.use('/adapter/academic', createProxyMiddleware({
    target: 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: { '^/adapter/academic': '' }
}));

// Proxy catch-all untuk sisanya, didaftarkan belakangan
app.use('/', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    router: (req) => {
        if (req.url.startsWith('/identity')) {
            return 'http://localhost:3001';
        }
        if (req.url.startsWith('/adapter')) {
            return 'http://localhost:3002';
        }
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[GATEWAY] Meneruskan ke -> ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
    }
}));

app.listen(PORT, () => {
    console.log(`🚀 API Gateway berjalan di http://localhost:${PORT}`);
});