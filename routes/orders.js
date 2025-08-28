const express = require('express')
const router = express.Router()
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware')

// Import controllers
const {
    addItemOrder,
    getOrders,
    updateOrderStatus,
    cancelOrder,
    updateOrderDetail,
    getUnpaidTableNumbers
} = require('../controllers/orders')

// Order Routes (Admin)
router.post('/admin/orders', verifyToken, verifyAdmin, addItemOrder)
router.get('/admin/orders', verifyToken, verifyAdmin, getOrders)
router.put('/admin/orders/:id', verifyToken, verifyAdmin, updateOrderStatus)
router.put('/admin/orders/detail/:id', verifyToken, verifyAdmin, updateOrderDetail);
router.delete('/admin/orders/:id', verifyToken, verifyAdmin, cancelOrder)

router.get("/admin/orders/tables-unpaid", verifyToken, verifyAdmin, getUnpaidTableNumbers);

router.post('/orders', verifyToken, addItemOrder);

module.exports = router
