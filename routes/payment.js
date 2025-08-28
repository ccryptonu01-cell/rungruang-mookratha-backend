const express = require("express")
const router = express.Router()
const { generateQRPayment } = require("../controllers/payment")

router.post("/qr", generateQRPayment)

module.exports = router;
