// utils/enums.js
const OrderStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const PaymentStatus = {
  PAID: "ชำระเงินแล้ว",
  UNPAID: "ยังไม่ชำระเงิน",
};

const PaymentMethod = {
  PROMPTPAY: "PROMPTPAY",
  QR: "QR",
  CASH: "CASH",
};

const StatusLabels = {
  [OrderStatus.PENDING]: "ยังไม่ชำระเงิน",
  [OrderStatus.COMPLETED]: "ชำระเงินแล้ว",
  [OrderStatus.CANCELLED]: "ยกเลิก",
};

module.exports = {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  StatusLabels,
};
