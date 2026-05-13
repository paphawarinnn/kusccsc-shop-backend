const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  store: String,
  image: String,
  images: [String],
  description: String,
  stock: Number,
  active: Boolean,
  colors: [{ name: String, price: Number }],  // ← เพิ่ม price
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", productSchema);