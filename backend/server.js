const dns = require("node:dns");
dns.setServers(["1.1.1.1"]);
require("dotenv").config({ quiet: true });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Kết nối MongoDB với username là MSSV, password là MSSV, dbname là it4409
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Error:", err));

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Tên không được để trống"],
    minlength: [2, "Tên phải có ít nhất 2 ký tự"],
  },
  age: {
    type: Number,
    required: [true, "Tuổi không được để trống"],
    min: [0, "Tuổi phải >= 0"],
    validate: {
      validator: Number.isInteger,
      message: "Tuổi phải là số nguyên",
    },
  },

  email: {
    type: String,
    required: [true, "Email không được để trống"],
    unique: true,
    match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
  },
  address: {
    type: String,
  },
});

const User = mongoose.model("User", UserSchema);

app.get("/api/users", async (req, res) => {
  try {
    // Lấy query params
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 20);

    const search = req.query.search?.trim() || "";
    // Tạo query filter cho search
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    //Tính skip
    const skip = (page - 1) * limit;
    // Query database
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    // Trả về response
    res.json({
      page,
      limit,
      total,
      totalPages,
      data: users,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const age = Number(req.body.age);
    const email = req.body.email?.trim().toLowerCase();
    const address = req.body.address?.trim();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "Email đã tồn tại" });
    }

    const newUser = await User.create({ name, age, email, address });

    res.status(201).json({
      message: "Tạo người dùng thành công",
      data: newUser,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const updateData = {};

    if (req.body.name !== undefined) {
      updateData.name = req.body.name.trim();
    }

    if (req.body.age !== undefined) {
      updateData.age = Number(req.body.age);
    }

    if (req.body.email !== undefined) {
      updateData.email = req.body.email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(400).json({ error: "Email đã tồn tại" });
      }
    }

    if (req.body.address !== undefined) {
      updateData.address = req.body.address.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json({
      message: "Cập nhật người dùng thành công",
      data: updatedUser,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    res.json({ message: "Xóa người dùng thành công" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
