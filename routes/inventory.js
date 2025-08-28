const express = require('express')
const router = express.Router()

// import controllers
const { createStock, listStock, updateStock, deleteStock } = require('../controllers/inventory')

const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware')

// ENDPOINT http://localhost:5000/inventory
router.post('/admin/inventory', verifyToken, verifyAdmin, createStock)
router.get('/admin/inventory', verifyToken, verifyAdmin, listStock)
router.put('/admin/inventory/:id', verifyToken, verifyAdmin, updateStock)
router.delete('/admin/inventory/:id', verifyToken, verifyAdmin, deleteStock)

module.exports = router