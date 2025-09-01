const express = require('express')
const router = express.Router()
const upload = require("../middleware/upload")

const { createMenu, listMenu, updateMenu, deleteMenu } = require('../controllers/menu')
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware')

router.get('/menu', listMenu)
router.post("/menu", verifyToken, verifyAdmin, upload.single("image"), createMenu)
router.put("/admin/menu/:id", verifyToken, verifyAdmin, upload.single("image"), updateMenu)
router.delete('/admin/menu/:id', verifyToken, verifyAdmin, deleteMenu)

module.exports = router;
