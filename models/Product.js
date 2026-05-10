const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  store: String,
  image: String,
  images: [String],
  description: String,
  stock: Number,
  active: Boolean,
  colors: [{ name: String }],  // ← เพิ่มบรรทัดนี้
  createdAt: { type: Date, default: Date.now }
});