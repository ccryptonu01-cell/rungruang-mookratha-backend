const express = require('express')
const router = express.Router()
const prisma = require("../config/prisma")
const { OrderStatus } = require("@prisma/client");

// Import controllers
const {
    listUsers, getUserById, deleteUser, updateUserRole,
    listReservations, updateReservation, cancelReservation, updatePaymentStatus, AdmingetOrderStatus,
    deleteOrderHistory, getOrderHistory, getOrderSummary7Days, getOrderSummaryByMonth, changeUserPassword
} = require('../controllers/admin')
const { createReservation } = require('../controllers/user')
const { createCategory, getAllCategories, AdmincreateCategory } = require('../controllers/category')
const { verifyToken, verifyAdmin, verifyCashier } = require('../middleware/authMiddleware')

router.get('/admin/orders/summary-7-days', verifyToken, verifyAdmin, getOrderSummary7Days)
router.get("/admin/orders/summary-by-month", verifyToken, verifyAdmin, getOrderSummaryByMonth)

router.get('/admin/orders/:orderId', verifyToken, verifyAdmin, AdmingetOrderStatus)

// User (Admin)
router.get('/admin/users', verifyToken, verifyAdmin, listUsers)
router.get('/admin/user/:id', verifyToken, verifyAdmin, getUserById)
router.delete('/admin/user/:id', verifyToken, verifyAdmin, deleteUser)
router.put('/admin/user/:id/role', verifyToken, verifyAdmin, updateUserRole)

// Reservation (Admin)
router.post('/admin/reservations', verifyToken, verifyAdmin, createReservation)
router.get('/admin/reservations', verifyToken, verifyAdmin, listReservations)
router.put('/admin/reservations/status', verifyToken, verifyAdmin, updateReservation)
router.delete('/admin/reservations/cancle', verifyToken, verifyAdmin, cancelReservation)

// Payment 
router.get('/admin/orders/:orderId', verifyToken, verifyAdmin, AdmingetOrderStatus) // ดูการชำระเงินว่าเสร็จหรือยัง
router.post('/admin/orders/payment', verifyToken, verifyAdmin, updatePaymentStatus) //อัปเดตสถานะการชำระเงิน

// History
router.get("/admin/order-history", verifyToken, verifyAdmin, getOrderHistory)
router.delete("/admin/order-history/:orderHistoryId", verifyToken, verifyAdmin, deleteOrderHistory)

// for frontend api/auth
router.post("/current-admin", verifyToken, verifyAdmin, (req, res) => {
    res.status(200).json({ ok: true, role: req.user.role })
})

router.post("/current-user", verifyToken, (req, res) => {
    res.status(200).json({ ok: true, role: req.user.role })
})

router.post("/current-cashier", verifyToken, verifyCashier, (req, res) => {
    res.status(200).json({ ok: true, role: req.user.role })
})

// category
router.post("/admin/category", verifyToken, verifyAdmin, createCategory)
router.post("/admin/category", verifyToken, verifyAdmin, AdmincreateCategory)
router.get('/admin/category', verifyToken, verifyAdmin, getAllCategories)

router.get('/category', verifyToken, getAllCategories)

// routes/adminRoutes.jsF
router.put("/admin/user/:id/password", verifyToken, verifyAdmin, changeUserPassword);

router.put("/user/:id/password", verifyToken, changeUserPassword);

module.exports = router
