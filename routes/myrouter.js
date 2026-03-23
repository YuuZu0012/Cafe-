const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose"); // 🟢 1. เพิ่ม mongoose เข้ามาเพื่อใช้ตรวจสอบรูปแบบ ID

const connectDB = require("../config/db");
const Member = require("../models/members");
const Product = require("../models/products"); // 🟢 คลีนโค้ด: เรียกใช้ Product ตัวเดียวพอ
const Sale = require("../models/sales");
const Payment = require("../models/payments");

//เรียกใช้งาน Multer และกำหนด options
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/products"); //file part
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + ".jpg"); //auto filename
  },
});

const upload = multer({
  storage: storage,
});

const title = "ITMI Shop";

///////////////////////////////////////////////////////////////

function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    req.session.message = "กรุณาเข้าสู่ระบบก่อน";
    return res.redirect("/login");
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.session.user) {
    req.session.message = "กรุณาเข้าสู่ระบบก่อน";
    return res.redirect("/login");
  }

  if (req.session.user.type !== "Admin") {
    req.session.message = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";
    return res.redirect("/dashboard");
  }

  next();
}

function isEmployeeOrAdmin(req, res, next) {
  if (!req.session.user) {
    req.session.message = "กรุณาเข้าสู่ระบบก่อน";
    return res.redirect("/login");
  }

  if (!["Employee", "Admin"].includes(req.session.user.type)) {
    req.session.message = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";
    return res.redirect("/dashboard");
  }

  next();
}

///////////////////////////////////////////////////////////////

router.get("/", async (req, res) => {
  try {
    const products = await Product.find(); // ดึงข้อมูลทั้งหมดจาก DB
    res.render("index", {
      products: products,
      title: title,
      user: req.session.user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/addForm", (req, res) => {
  const title = "Add New Product";
  res.render("form", { title: title });
});

router.get("/manage", async (req, res) => {
  const title = "Manage Product";
  try {
    const products = await Product.find();
    res.render("manage", { products: products, title: title });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/insert", upload.single("image"), async (req, res) => {
  try {
    let imageValue = "";

    if (req.file) {
      imageValue = req.file.filename;
    } else if (req.body.imageUrl && req.body.imageUrl.trim() !== "") {
      imageValue = req.body.imageUrl.trim();
    } else {
      req.session.message = "กรุณาเลือกรูปภาพหรือใส่ URL รูป";
      return res.redirect("/addForm");
    }


const newProduct = new Product({
  name: req.body.name,
  price: req.body.price,
  image: imageValue,
  description: req.body.description,
});

    await newProduct.save();
    res.redirect("/");
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/delete/:id", async (req, res) => {
  try {
    Product.findByIdAndDelete(req.params.id, {
      useFindAndModify: false,
    }).exec();
    res.redirect("/manage");
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// 🔹 Route สำหรับค้นหาสินค้าตามตัวกรองที่ผู้ใช้ป้อน
router.get("/findindex", async (req, res) => {
  res.render("find");
});

router.get("/find", async (req, res) => {
  try {
    let query = {};

    if (req.query.name) {
      query.name = { $eq: req.query.name };
    }
    if (req.query.minPrice) {
      query.price = { ...query.price, $gte: parseInt(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      query.price = { ...query.price, $lte: parseInt(req.query.maxPrice) };
    }
    if (req.query.exclude) {
      query.name = { $ne: req.query.exclude };
    }
    if (req.query.highPriceOnly) {
      query.price = { $gt: 5000 };
    }
    if (req.query.lowPriceOnly) {
      query.price = { $lt: 2000 };
    }

    const products = await Product.find(query);
    res.render("findResults", { products, title: "ผลการค้นหา" });
  } catch (error) {
    res.status(500).send("เกิดข้อผิดพลาด: " + error.message);
  }
});

router.get("/search", async (req, res) => {
  try {
    let minPrice = req.query.min ? parseFloat(req.query.min) : 0;
    let maxPrice = req.query.max ? parseFloat(req.query.max) : Number.MAX_VALUE;

    let products = await Product.find({
      price: { $gte: minPrice, $lte: maxPrice },
    });
    res.render("index", { products: products, title: title });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/register", (req, res) => {
  res.render("register/regisindex");
});

router.post("/register", async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;

  try {
    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.render("register/regisindex", {
        error: "กรุณากรอกข้อมูลให้ครบ กรอกให้หมดด้วย!!",
        oldData: { name, email, phone },
      });
    }

    if (password !== confirmPassword) {
      return res.render("register/regisindex", {
        error: "Password ไม่ตรงกันทำใหม่!",
        oldData: { name, email, phone },
      });
    }

    const existingMember = await Member.findOne({ email: email });
    if (existingMember) {
      return res.render("register/regisindex", {
        error: "Email already exists / อีเมลซ้ำนั้นเอง!!!!",
        oldData: { name, email, phone },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMember = new Member({
      name,
      email,
      phone,
      password: hashedPassword,
       type: "Customer"
    });

    await newMember.save();
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("register/regisindex", { error: "Error registering user" });
  }
});

router.get("/login", (req, res) => {
  res.render("login", { message: req.session.message });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await Member.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    req.session.message = "Invalid email or password";
    return res.redirect("/login");
  }

  req.session.user = user;
  res.redirect("/");
});

router.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    req.session.message = "กรุณาเข้าสู่ระบบก่อน";
    return res.redirect("/login");
  }

  const message = req.session.message || null;
  req.session.message = null;

  res.render("dashboard", {
    user: req.session.user,
    message: message
  });
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

router.post("/edit", async (req, res) => {
  const title = "Edit Product";
  try {
    const edit_id = req.body.id;
    let product = await Product.findOne({ _id: edit_id }).exec(); // เติม let ป้องกันปัญหาตัวแปร global
    res.render("formedit", { product: product, title: title });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/update", upload.single("image"), async (req, res) => {
  try {
    const id = req.body.id;
    const data = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
    };

    if (req.file) {
      data.image = req.file.filename;
    } else if (req.body.imageUrl && req.body.imageUrl.trim() !== "") {
      data.image = req.body.imageUrl.trim();
    }

    await Product.findByIdAndUpdate(id, data, {
      useFindAndModify: false,
    }).exec();

    res.redirect("/manage");
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/sales/all", async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("product")
      .populate("member")
      .sort({ date: -1 });

    const groupedOrders = {};

    sales.forEach(sale => {
      const key = sale.orderId || `NO-ORDER-${sale._id}`;

      if (!groupedOrders[key]) {
        groupedOrders[key] = {
          orderId: key,
          member: sale.member,
          items: [],
          discountType: sale.discountType || "none",
          discountValue: sale.discountValue || 0,
          finalTotal: sale.finalTotal || 0,
          date: sale.date
        };
      }

      groupedOrders[key].items.push({
        product: sale.product,
        quantity: sale.quantity,
        totalPrice: sale.totalPrice
      });
    });

    const orders = Object.values(groupedOrders);

    res.render("sales/showsale", { orders });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/sales/new", async (req, res) => {
  const products = await Product.find();
  const members = await Member.find();
  res.render("sales/newsale", { products, members });
});

router.post("/sales/insert", async (req, res) => {
  try {
    const { member, cartData, discountType, discountValue } = req.body;

    if (!member || !cartData) {
      req.session.message = "กรุณาเลือกสมาชิกและสินค้า";
      return res.redirect("/sales/new");
    }

    const cart = JSON.parse(cartData);

    if (!Array.isArray(cart) || cart.length === 0) {
      req.session.message = "ยังไม่มีสินค้าในรายการขาย";
      return res.redirect("/sales/new");
    }

    let subtotal = 0;

    for (const item of cart) {
      const productData = await Product.findById(item.productId);
      if (!productData) continue;
      subtotal += productData.price * item.quantity;
    }

    const discountNum = Number(discountValue || 0);
    let discount = 0;

    if (discountType === "percent") {
      discount = subtotal * (discountNum / 100);
    } else if (discountType === "fixed") {
      discount = discountNum;
    }

    if (discount > subtotal) {
      discount = subtotal;
    }

    const finalTotal = subtotal - discount;

    // สร้างรหัสออเดอร์เดียวสำหรับทั้งบิล
    const orderId = "ORD-" + Date.now();

    for (const item of cart) {
      const productData = await Product.findById(item.productId);
      if (!productData) continue;

      const totalPrice = productData.price * item.quantity;

      const newSale = new Sale({
        orderId,
        product: item.productId,
        member: member,
        quantity: item.quantity,
        totalPrice,
        discountType: discountType || "none",
        discountValue: discountNum,
        finalTotal
      });

      await newSale.save();
    }

    req.session.message = "บันทึกรายการขายเรียบร้อยแล้ว";
    res.redirect("/sales/all");
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

///////จัดการส่วนนี้ ลูกค้า **1
router.get("/members/manage", isAdmin, async (req, res) => {
  try {
    const members = await Member.find({ type: "Customer" });
    res.render("members/manage", {
      title: "จัดการสมาชิก",
      members
    });
  } catch (err) {
    req.session.message = "เกิดข้อผิดพลาด";
    res.redirect("/dashboard");
  }
});

/////**ส่วน2 พวกพนักงาน */
router.get("/members/employee", isAdmin, async (req, res) => {
  try {
    const members = await Member.find({
      type: { $in: ["Employee", "Admin"] }
    });

    res.render("members/employee", {
      title: "จัดการพนักงาน",
      members
    });
  } catch (err) {
    req.session.message = "เกิดข้อผิดพลาด";
    res.redirect("/dashboard");
  }
});

router.get("/members/delete/:id", isAdmin, async (req, res) => {
  await Member.findByIdAndDelete(req.params.id);
  res.redirect("/members/manage");
});

router.get("/members/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      req.session.message = "ไม่พบข้อมูลสมาชิก";
      return res.redirect("/dashboard");
    }

    // Customer แก้ได้เฉพาะของตัวเอง
    if (
      req.session.user.type === "Customer" &&
      req.session.user._id.toString() !== req.params.id
    ) {
      req.session.message = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";
      return res.redirect("/dashboard");
    }

    // Employee ห้ามแก้ Admin
    if (
      req.session.user.type === "Employee" &&
      member.type === "Admin"
    ) {
      req.session.message = "คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้";
      return res.redirect("/dashboard");
    }

    res.render("members/edit", {
  member,
  title: "Edit Member",
  user: req.session.user
});
  } catch (error) {
    req.session.message = "เกิดข้อผิดพลาด";
    res.redirect("/dashboard");
  }
});

router.post("/members/update", isLoggedIn, async (req, res) => {
  try {
    const { id, name, email, phone, password, type } = req.body;

    const member = await Member.findById(id);

    if (!member) {
      req.session.message = "ไม่พบข้อมูลสมาชิก";
      return res.redirect("/dashboard");
    }

    // Customer แก้ได้เฉพาะของตัวเอง
    if (
      req.session.user.type === "Customer" &&
      req.session.user._id.toString() !== id
    ) {
      req.session.message = "คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้";
      return res.redirect("/dashboard");
    }

    // Employee ห้ามแก้ Admin
    if (
      req.session.user.type === "Employee" &&
      member.type === "Admin"
    ) {
      req.session.message = "คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้";
      return res.redirect("/dashboard");
    }

    let updateData = { name, email, phone };

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // ให้เฉพาะ Admin เปลี่ยน type ได้
    if (req.session.user.type === "Admin" && type) {
      updateData.type = type;
    }

    const updatedMember = await Member.findByIdAndUpdate(id, updateData, {
      new: true
    });

    // ถ้าแก้ข้อมูลตัวเอง ให้ session อัปเดตด้วย
    if (req.session.user._id.toString() === id) {
      req.session.user = updatedMember;
    }

    req.session.message = "บันทึกข้อมูลเรียบร้อยแล้ว";

    if (req.session.user.type === "Admin") {
      return res.redirect("/members/manage");
    }

    res.redirect("/dashboard");
  } catch (error) {
    req.session.message = "เกิดข้อผิดพลาด";
    res.redirect("/dashboard");
  }
});

///*แอดมิน//
router.get("/members/admin-edit/:id", isAdmin, async (req, res) => {
  const member = await Member.findById(req.params.id);
  res.render("members/admin-edit", {
    member,
    title: "Admin Edit Member",
    user: req.session.user
  });
});

router.post("/members/admin-update", isAdmin, async (req, res) => {
  const { id, name, email, phone, password, type } = req.body;

  let updateData = { name, email, phone, type };

  if (password && password.trim() !== "") {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateData.password = hashedPassword;
  }

  await Member.findByIdAndUpdate(id, updateData);
  res.redirect("/members/employee");
});

//////////////////////////////////////////////////////////////////////////

router.get("/profile/edit", isLoggedIn, async (req, res) => {
  try {
    const member = await Member.findById(req.session.user._id);
    res.render("members/profile-edit", {
      member,
      title: "แก้ไขข้อมูลส่วนตัว"
    });
  } catch (error) {
    req.session.message = "เกิดข้อผิดพลาด";
    res.redirect("/dashboard");
  }
});


router.post("/profile/update", isLoggedIn, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    let updateData = { name, email, phone };

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await Member.findByIdAndUpdate(
      req.session.user._id,
      updateData,
      { new: true }
    );

    req.session.user = updatedUser;
    req.session.message = "อัปเดตข้อมูลเรียบร้อยแล้ว";
    res.redirect("/dashboard");
  } catch (error) {
    req.session.message = "อัปเดตข้อมูลไม่สำเร็จ";
    res.redirect("/profile/edit");
  }
});

//////////////////////////////////////////////////////////////////////////


router.post("/payment", async (req, res) => {
  try {
    const { member, cartData, discountType, discountValue } = req.body;

    if (!member || !cartData) {
      req.session.message = "กรุณาเลือกสมาชิกและสินค้า";
      return res.redirect("/sales/new");
    }

    const cart = JSON.parse(cartData);

    if (!Array.isArray(cart) || cart.length === 0) {
      req.session.message = "ยังไม่มีสินค้าในรายการ";
      return res.redirect("/sales/new");
    }

    let subtotal = 0;

    for (const item of cart) {
      const productData = await Product.findById(item.productId);
      if (!productData) continue;
      subtotal += productData.price * item.quantity;
    }

    const discountNum = Number(discountValue || 0);
    let discount = 0;

    if (discountType === "percent") {
      discount = subtotal * (discountNum / 100);
    } else if (discountType === "fixed") {
      discount = discountNum;
    }

    if (discount > subtotal) {
      discount = subtotal;
    }

    const finalTotal = subtotal - discount;

    req.session.pendingOrder = {
      member,
      cart,
      subtotal,
      discountType: discountType || "none",
      discountValue: discountNum,
      finalTotal
    };

    const memberData = await Member.findById(member);

    res.render("sales/payment", {
      title: "Payment",
      order: req.session.pendingOrder,
      memberData
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


router.post("/payment/confirm", async (req, res) => {
  try {
    const pendingOrder = req.session.pendingOrder;

    if (!pendingOrder) {
      req.session.message = "ไม่พบข้อมูลออเดอร์";
      return res.redirect("/sales/new");
    }

    const { paymentMethod, bankName } = req.body;

    const orderId = "ORD-" + Date.now();

    const newPayment = new Payment({
      orderId,
      member: pendingOrder.member,
      paymentMethod,
      bankName: bankName || "",
      subtotal: pendingOrder.subtotal,
      discountType: pendingOrder.discountType,
      discountValue: pendingOrder.discountValue,
      finalTotal: pendingOrder.finalTotal,
      paymentStatus: "paid"
    });

    await newPayment.save();

    for (const item of pendingOrder.cart) {
      const productData = await Product.findById(item.productId);
      if (!productData) continue;

      const totalPrice = productData.price * item.quantity;

      const newSale = new Sale({
        orderId,
        product: item.productId,
        member: pendingOrder.member,
        quantity: item.quantity,
        totalPrice,
        discountType: pendingOrder.discountType,
        discountValue: pendingOrder.discountValue,
        finalTotal: pendingOrder.finalTotal
      });

      await newSale.save();
    }

    req.session.lastOrderId = orderId;
    req.session.pendingOrder = null;

    res.redirect("/payment/success");
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


router.get("/payment/success", (req, res) => {
  const orderId = req.session.lastOrderId;

  if (!orderId) {
    req.session.message = "ไม่พบคำสั่งซื้อ";
    return res.redirect("/");
  }

  res.render("sales/success", {
    title: "Success",
    orderId
  });
});









//////////////////////////////////////////////////////////////////////////


router.get("/reports/sales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59")
      };
    }

    const sales = await Sale.find(filter)
      .populate("product")
      .populate("member")
      .sort({ date: 1 });

    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.finalTotal || sale.totalPrice || 0), 0);
    const totalOrders = sales.length;

    const dailyMap = {};
    sales.forEach(sale => {
      const day = new Date(sale.date).toISOString().split("T")[0];
      dailyMap[day] = (dailyMap[day] || 0) + (sale.finalTotal || sale.totalPrice || 0);
    });

   res.render("reports/sales-report", {
  title: "Sales Report",
  sales,
  totalRevenue,
  totalOrders,
  labels: Object.keys(dailyMap),
  values: Object.values(dailyMap),
  startDate: startDate || "",
  endDate: endDate || ""
});
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


router.get("/reports/products", async (req, res) => {
  try {
    const sales = await Sale.find().populate("product");

    const productMap = {};

    sales.forEach(sale => {
      const name = sale.product ? sale.product.name : "ไม่พบสินค้า";
      if (!productMap[name]) {
        productMap[name] = {
          name,
          qty: 0,
          revenue: 0
        };
      }

      productMap[name].qty += sale.quantity || 0;
      productMap[name].revenue += sale.totalPrice || 0;
    });

    const productsReport = Object.values(productMap).sort((a, b) => b.qty - a.qty);

    res.render("reports/products-report", {
      title: "Products Report",
      productsReport,
      labels: productsReport.map(p => p.name),
      qtyValues: productsReport.map(p => p.qty),
      revenueValues: productsReport.map(p => p.revenue)
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});



router.get("/reports/members", async (req, res) => {
  try {
    const customers = await Member.countDocuments({ type: "Customer" });
    const employees = await Member.countDocuments({ type: "Employee" });
    const admins = await Member.countDocuments({ type: "Admin" });

    res.render("reports/members-report", {
      title: "Members Report",
      customers,
      employees,
      admins
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});














//////////////////////////////////////////////////////////////////////////

// 🟢 2. ย้าย Route ตัวปัญหา (/:id) ลงมาไว้ท้ายสุด! เพื่อให้มันทำงานเป็นด่านสุดท้าย
router.get("/:id", async (req, res) => {
  const title = "Product Detail";
  try {
    const product_id = req.params.id;

    // เช็คก่อนว่า format ของ ID ถูกต้องหรือไม่ ป้องกันบั๊ก Cast to ObjectId
    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(404).send("ไม่พบสินค้านี้ (รูปแบบ ID ไม่ถูกต้อง)");
    }

    const product = await Product.findOne({ _id: product_id }).exec();

    // ดักกรณีค้นหาแล้วไม่เจอข้อมูล
    if (!product) {
      return res.status(404).send("ไม่พบสินค้านี้ในระบบ");
    }

    res.render("product", { product: product, title: title });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;