require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { readdirSync } = require('fs');
const path = require('path');
const { subHours } = require('date-fns');

const { checkBlacklistedToken } = require('./controllers/auth');

const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);

const port = process.env.PORT || 5000;

const FRONTEND_DEV = "http://localhost:5173"; // React dev server
const FRONTEND_PROD = [
    "https://rungruang-mookratha-frontend.vercel.app",
    "https://rungruang-mookratha-frontend-git-main-rrmks-projects.vercel.app",
    "https://rungruang-mookratha-frontend-8dtlv4f4u-rrmks-projects.vercel.app"
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

const ALLOWED_ORIGINS = [
    ...FRONTEND_PROD,
    FRONTEND_DEV,
    API_DEV,
    /\.vercel\.app$/
];

app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true);
        const ok = ALLOWED_ORIGINS.some(o =>
            o instanceof RegExp ? o.test(origin) : o === origin
        );
        cb(ok ? null : new Error("Not allowed by CORS"), ok);
    },
    credentials: true,
}));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
    if (
        req.path.startsWith('/api/auth') ||
        req.path.startsWith('/api/tables') ||
        req.path.startsWith('/api/guest') ||
        req.path.startsWith('/api/g-menu') ||
        req.path.startsWith('/api/g-category')
    ) {
        return next();
    }
    return checkBlacklistedToken(req, res, next);
});

app.use('/api/', require('./routes/menu'));

app.use(express.json());
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
app.use('/api', require('./routes/guest'))
app.use('/api/reservations', require('./routes/tables'));
app.use('/api', require('./routes/tables'));


// โหลด routes อัตโนมัติ (ยกเว้น auth.js)
readdirSync('./routes').forEach((file) => {
    if (file !== 'auth.js' && file !== 'menu.js') {
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

// ===== Error Handler Logger =====
app.use((err, req, res, next) => {
    console.error("🔥 Global Error:", {
        method: req.method,
        url: req.url,
        message: err.message,
        name: err.name,
        stack: err.stack,
        body: req.body,
        file: req.file,
        cause: err.cause,
    });

    res.status(500).json({
        message: "เกิดข้อผิดพลาดในระบบ",
        error: err.message,
        name: err.name,
        stack: err.stack,
        body: req.body,
        file: req.file,
    });
});



// ===== Start Server =====
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

const cleanExpiredTokens = async () => {
    const eightHoursAgo = subHours(new Date(), 8);

    try {
        const result = await prisma.tokenBlacklist.deleteMany({
            where: {
                createdAt: {
                    lt: eightHoursAgo,
                },
            },
        });

        if (result.count > 0) {
            console.log(`🧹 ลบ token blacklist ที่หมดอายุแล้ว ${result.count} รายการ`);
        }
    } catch (err) {
        console.error("❌ ล้าง token blacklist ล้มเหลว:", err);
    }
};

setInterval(cleanExpiredTokens, 6 * 60 * 60 * 1000);