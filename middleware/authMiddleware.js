require('dotenv').config();
const jwt = require('jsonwebtoken');
const validator = require('validator')

const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY;

const verifyToken = (req, res, next) => {
    try {
        if (req.method === 'OPTIONS') return res.sendStatus(204);

        const authHeader = req.get('Authorization') || req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: 'การเข้าถึงถูกปฏิเสธ: ไม่มีโทเค็น' });
        }

        const parts = authHeader.trim().split(/\s+/);
        if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
            return res.status(401).json({ message: 'รูปแบบโทเค็นไม่ถูกต้อง (ต้องเป็น Bearer <token>)' });
        }

        const token = parts[1];

        // ✅ ตรวจสอบว่า token อยู่ในรูปแบบ JWT ที่ถูกต้อง
        if (!validator.isJWT(token)) {
            return res.status(401).json({ message: 'โทเค็นไม่ถูกต้อง (รูปแบบไม่ถูกต้อง)' });
        }

        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ message: 'โทเค็นหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง' });
                }
                return res.status(401).json({ message: 'โทเค็นไม่ถูกต้อง' });
            }

            // ✅ แก้ตรงนี้
            const userPayload = {
                ...decoded,
                role: typeof decoded.role === 'string' ? decoded.role.toUpperCase() : 'USER'
            };

            req.user = userPayload;
            next();
        });
    } catch (e) {
        console.error('[verifyToken] ❌ Exception:', e);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบโทเค็น' });
    }
};

const verifyAdmin = (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'การเข้าถึงถูกปฏิเสธ: ไม่มีข้อมูลผู้ใช้' });
    const role = String(req.user.role || '').toUpperCase();
    if (role !== 'ADMIN') {
        return res.status(403).json({ message: 'การเข้าถึงถูกปฏิเสธ: เฉพาะผู้ดูแลระบบเท่านั้น' });
    }
    next();
};

const verifyCashier = (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'การเข้าถึงถูกปฏิเสธ: ไม่มีข้อมูลผู้ใช้' });
    const role = String(req.user.role || '').toUpperCase();
    if (role !== 'CASHIER' && role !== 'ADMIN') {
        return res.status(403).json({ message: 'การเข้าถึงถูกปฏิเสธ: ต้องเป็นแคชเชียร์หรือแอดมินเท่านั้น' });
    }
    next();
};

function requireLogin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient role' });
        }
        next();
    }
}

module.exports = { verifyToken, verifyAdmin, verifyCashier, requireLogin, requireRole };
