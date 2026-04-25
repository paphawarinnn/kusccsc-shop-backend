const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  price: Number,
  quantity: Number,
  image: String,
});

const orderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    unique: true,
    required: true,
  },
  studentId: { type: String, default: "" },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, required: true },
  deliveryMethod: {
    type: String,
    enum: ["pickup", "dorm_in", "dorm_out"],
    required: true,
  },
  dormName: { type: String, default: "" },
  roomNumber: { type: String, default: "" },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true },
  total: { type: Number, required: true },
  slipUrl: { type: String, default: "" },
  slipUploadedAt: { type: Date },
  status: {
    type: String,
    enum: [
      "pending_payment",
      "pending_verify",
      "verified",
      "preparing",
      "ready",
      "delivered",
      "slip_rejected" // ✅ เพิ่มตรงนี้
    ],
    default: "pending_payment",
  },
  adminNote: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
