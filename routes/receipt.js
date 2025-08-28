const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { verifyOwnership } = require('../middleware/ownership');
const { generateReceipt } = require('../controllers/receipt');

router.get(
  '/receipt/:id',
  verifyToken,
  verifyOwnership({ model: 'receipt', idParam: 'id', field: 'userId' }),
  generateReceipt
);

module.exports = router;
