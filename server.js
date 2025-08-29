require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { readdirSync } = require('fs');
const path = require('path');

const { checkBlacklistedToken } = require('./controllers/auth');

const logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 5000;

// ====== CONFIG สำหรับ Dev (ไม่มี Domain) ======
const FRONTEND_DEV = "http://localhost:5173"; // React dev server
const FRONTEND_PROD = [
    "https://rungruang-mookratha-frontend.vercel.app",
    "https://rungruang-mookratha-frontend-git-main-rrmks-projects.vercel.app",
    "https://rungruang-mookratha-frontend-lyrocpt5u-rrmks-projects.vercel.app"
];
const API_DEV = `http://localhost:${port}`;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dybgekx5y";
const CLOUDINARY_RES = `https://res.cloudinary.com/${CLOUD_NAME}`;
const CLOUDINARY_API = "https://api.cloudinary.com";

// ปิด x-powered-by
app.disable("x-powered-by");

// เปิด helmet เบื้องต้น
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CSP แบบ Report-Only (ไม่บล็อกจริง)
const devBuildDirectives = {
    "default-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "script-src": ["'self'", "'report-sample'"],
    "style-src": [
        "'self'",
        "https://fonts.googleapis.com",
        "'unsafe-inline'",
        "'report-sample'"
    ],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": ["'self'", "data:", "blob:", CLOUDINARY_RES],
    "media-src": ["'self'", CLOUDINARY_RES],
    "connect-src": [
        "'self'",
        API_DEV,
        CLOUDINARY_API
    ],
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"]
};

app.use(helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: devBuildDirectives,
    reportOnly: true // ✅ ยังไม่บล็อกจริง
}));

// Headers เสริม
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));
app.use(helmet.noSniff());

// ===== Middleware หลัก =====
const morganStream = {
    write: (message) => logger.info(message.trim())
};

app.use(morgan('combined', { stream: morganStream }));

app.use(express.json());

const ALLOWED_ORIGINS = [
    ...FRONTEND_PROD,
    FRONTEND_DEV,
    API_DEV
];

app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true
}));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== Routes หลัก =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api', require('./routes/receipt'));
app.use('/api/admin/alert', require('./routes/alert'));
app.use('/api/cashier', require('./routes/cashier'));
const changePasswordRoutes = require('./routes/admin');
app.use('/api/admin', changePasswordRoutes);
app.use('/api/user', changePasswordRoutes);
app.use('/api/cashier', changePasswordRoutes);

// โหลด routes อัตโนมัติ (ยกเว้น auth.js)
readdirSync('./routes').forEach((file) => {
    if (file !== 'auth.js') {
        const route = require(`./routes/${file}`);
        app.use('/api', route);
    }
});

// ===== React Build (Vite) =====
const staticRoot = path.join(__dirname, '..', 'client', 'dist')
console.log('Serving static from:', staticRoot);

app.use(express.static(staticRoot));

app.get('*', (req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'));
});

app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth')) {
        return next();
    }
    return checkBlacklistedToken(req, res, next);
});

// ===== Error Handler Logger =====
app.use((err, req, res, next) => {
    logger.error(`${req.method} ${req.url} - ${err.message}`);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
});

// ===== Start Server =====
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
