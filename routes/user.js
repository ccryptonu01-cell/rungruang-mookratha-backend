const express = require('express')
const router = express.Router()

// import controllers
const { verifyToken } = require('../middleware/authMiddleware')

const { getProfile, updateProfile, deleteProfile,
    getCart, addToCart, updateCart, removeFromCart,
    createOrder, getMyOrders, cancelOrder,
    createReservation, getReservation, cancelReservation
} = require('../controllers/user')

const SECRET_KEY = process.env.SECRET_KEY;

// User Profile
router.get('/auth/profile', verifyToken, getProfile)
router.put('/auth/profile', verifyToken, updateProfile)
router.delete('/auth/profile', verifyToken, deleteProfile)

// Cart
router.post('/cart', verifyToken, addToCart)
router.get('/cart/:userId', verifyToken, getCart)
router.put('/cart/:cartId', verifyToken, updateCart)
router.delete('/cart/menu/:menuId', verifyToken, removeFromCart)

// Orders
router.post('/user/orders', verifyToken, createOrder)
router.get('/user/my-orders', verifyToken, getMyOrders)
router.put('/user/orders/:orderId/cancel', verifyToken, cancelOrder)

// Reservations
router.post('/user/reservations', verifyToken, createReservation)
router.get('/user/reservations', verifyToken, getReservation)
router.put('/user/reservations/:id', verifyToken, cancelReservation)

module.exports = router
