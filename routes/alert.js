const express = require("express");
const router = express.Router();
const { getUnpaidOrders } = require("../controllers/alert");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/unpaid-orders", verifyToken, verifyAdmin, getUnpaidOrders);

module.exports = router;
