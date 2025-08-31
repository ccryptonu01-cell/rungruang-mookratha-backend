const express = require('express')
const { getTables, getTableByNumber } = require('../controllers/tables')
const { verifyToken, verifyAdmin, verifyCashier } = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/guest/tables', getTables)
router.get('/user/tables', verifyToken, getTables)
router.get("/tables/:number", verifyToken, getTableByNumber);

module.exports = router;
