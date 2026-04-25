const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  store: String,
  image: String,        // รูปหลัก (เดิม)
  images: [String],     // รูปเพิ่มเติม (ใหม่) ← เพิ่มบรรทัดนี้
  description: String,
  stock: Number,
  active: Boolean,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Product", productSchema);