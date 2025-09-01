const express = require('express')
const router = express.Router()

const { createGuestReservation, getGuestReservation, cancelGuestReservation, getTablesWithReservations, getAllMenus, getAllCategories } = require('../controllers/guest')

router.post('/guest/reservations', createGuestReservation)
router.post('/guest/reservations/guest-check', getGuestReservation)
router.put('/guest/reservations/:id/cancel', cancelGuestReservation)
router.get('/guest/reservations/tables', getTablesWithReservations);

router.get("/g-menu", getAllMenus);
router.get("/g-category", getAllCategories);

module.exports = router
