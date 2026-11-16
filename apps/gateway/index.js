const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config({ path: '.env.development' });

const app = express();
const PORT = process.env.PORT || 3000;
const requiredEnvironment = [
  'IDENTITY_URL',
  'ACADEMIC_URL',
  'ATTENDANCE_URL',
  'LMS_URL',
  'FRONTEND_ORIGIN'
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`${name} wajib diset sebelum API Gateway dijalankan.`);
  }
}

const serviceUrl = (name) => process.env[name].replace(/\/+$/, '');

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true
}));

app.use((req, res, next) => {
    console.log(`[GATEWAY] Menangkap request: ${req.method} ${req.url}`);
    next();
});

app.use('/adapter/academic', createProxyMiddleware({
    target: serviceUrl('ACADEMIC_URL'),
    changeOrigin: true,
    pathRewrite: (path) => path
}));

app.use('/identity', createProxyMiddleware({
    target: serviceUrl('IDENTITY_URL'),
    changeOrigin: true,
    pathRewrite: (path) => `/identity${path}`
}));

app.use('/adapter/attendance', createProxyMiddleware({
    target: serviceUrl('ATTENDANCE_URL'),
    changeOrigin: true,
    pathRewrite: (path) => `/adapter/attendance${path}`
}));

app.use('/adapter/lms', createProxyMiddleware({
    target: serviceUrl('LMS_URL'),
    changeOrigin: true,
    pathRewrite: (path) => `/adapter/lms${path}`
}));

app.listen(PORT, () => {
    console.log(`API Gateway berjalan pada port ${PORT}`);
});