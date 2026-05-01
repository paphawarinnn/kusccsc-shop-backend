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
app.use(express.urlencoded({ extended: true }));
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

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});