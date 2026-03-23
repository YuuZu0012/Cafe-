const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const MemberSchema = new mongoose.Schema({
    name: {type: String,required: true},
    email: {type: String,required: true, unique: true},
    phone: {type: String, required:true},
    password:{type: String, required:true},
    type: { type: String, required: true, default: "Customer" }

    
});

MemberSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Member", MemberSchema);

module.exports.saveMember = function(model,data) {
    model.save(data);
}