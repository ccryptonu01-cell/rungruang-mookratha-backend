const express = require('express')
const router = express.Router()

const { verifyToken, verifyCashier } = require('../middleware/authMiddleware')

// Import controllers
const { CashierListReservations, CashierUpdateReservation, CashierCancelReservation,
     addItemOrderCashier, getOrdersCashier, updateOrderStatusCashier, cancelOrderCashier,
     getOrderStatusCashier, updatePaymentStatusCashier, CashierlistMenu, CashierupdateMenu, CashierdeleteMenu,
     updatePaymentMethodByCashier, updateOrderByCashier, getUnpaidOrders } = require('../controllers/cashier')

// CASHIER Reservation 
router.get('/cashier/reservations', verifyToken, verifyCashier, CashierListReservations)
router.put('/cashier/reservations/status', verifyToken, verifyCashier, CashierUpdateReservation)
router.delete('/cashier/reservations/cancle', verifyToken, verifyCashier, CashierCancelReservation)

// CASHIER Menu
router.get('/cashier/menu', verifyToken, verifyCashier, CashierlistMenu)
router.put('/cashier/menu/:id', verifyToken, verifyCashier, CashierupdateMenu)
router.delete('/cashier/menu/:id', verifyToken, verifyCashier, CashierdeleteMenu)

// CASHIER Orders
router.post('/cashier/orders', verifyToken, verifyCashier, addItemOrderCashier)
router.get('/cashier/orders', verifyToken, verifyCashier, getOrdersCashier)
router.put('/cashier/orders/:id', verifyToken, verifyCashier, updateOrderStatusCashier)
router.delete('/cashier/orders/:id', verifyToken, verifyCashier, cancelOrderCashier)

// CASHIER Payment 
router.get('/cashier/orders/:orderId', verifyToken, verifyCashier, getOrderStatusCashier) // ดูการชำระเงินว่าเสร็จหรือยัง
router.post('/cashier/orders/payment', verifyToken, verifyCashier, updatePaymentStatusCashier) //อัปเดตสถานะการชำระเงิน

router.put("/orders/:id", verifyToken, verifyCashier, updatePaymentMethodByCashier);
router.put('/orders/:id/payment-status', verifyToken, verifyCashier, updatePaymentStatusCashier);
router.put('/cashier/orders/detail/:id', verifyToken, verifyCashier, updateOrderByCashier);

router.get("/alert/unpaid-orders", verifyToken, verifyCashier, getUnpaidOrders)

module.exports = router