const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    //ออเดอร์
    orderId: { type: String, required: true },
    
    product: {type: mongoose.Schema.Types.ObjectId, ref: "Product"},
    member: {type: mongoose.Schema.Types.ObjectId,ref: "Member"},
    quantity: Number,

        // ราคาก่อนลดของสินค้ารายการนี้
    totalPrice: Number,
    // โปรโมชั่น / ส่วนลด
    discountType: { type: String, default: "none" }, // none, percent, fixed
    discountValue: { type: Number, default: 0 },     // เช่น 10 หรือ 50
    // ราคาสุทธิหลังหักส่วนลด
    finalTotal: { type: Number, default: 0 },

    date: {type: Date, default: Date.now}
});

const Sale = mongoose.model("Sale", SaleSchema);

module.exports = Sale;

module.exports.saveSale = function(model, data){
    model.save(data);
}