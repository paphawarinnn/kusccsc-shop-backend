const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/slips", express.static(path.join(__dirname, "public/slips")));
app.use("/images", express.static(path.join(__dirname, "public/images")));

// MongoDB connect
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ROUTES
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");

app.get("/", (req, res) => res.send("KUSCCSC SHOP API is running 🌿"));

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// ✅ ADMIN LOGIN (ต้องอยู่ก่อน listen)
app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false });
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});