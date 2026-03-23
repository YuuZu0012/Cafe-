const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },

    paymentMethod: { type: String, default: "QR" },   // QR or Bank
    bankName: { type: String, default: "" },

    subtotal: { type: Number, default: 0 },
    discountType: { type: String, default: "none" },
    discountValue: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },

    paymentStatus: { type: String, default: "paid" }, // paid, pending
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Payment", PaymentSchema);