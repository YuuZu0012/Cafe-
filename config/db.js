
// ใช้งาน Mongoose
const mongoose = require('mongoose')

// เชื่อมไปยัง MongoDB
const dbUrl = 'mongodb://127.0.0.1:27017/Cafe'

mongoose.connect(dbUrl, {
    //useNewUrlParser:true,
    //useUnifiedTopology:true     
}).catch(err => console.error('❌ Connection Error:', err))

mongoose.connection.on('connected', () => console.log('✅ MongoDB Connected'));

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🔴 MongoDB connection closed');
    process.exit(0);
});







