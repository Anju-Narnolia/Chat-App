const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/chat-app';

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('Connection string:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    
    // Test creating a simple document
    const TestSchema = new mongoose.Schema({ name: String, timestamp: Date });
    const TestModel = mongoose.model('Test', TestSchema);
    
    const testDoc = new TestModel({ name: 'test', timestamp: new Date() });
    await testDoc.save();
    console.log('✅ Database write test successful!');
    
    // Clean up
    await TestModel.deleteOne({ name: 'test' });
    console.log('✅ Database cleanup successful!');
    
    await mongoose.disconnect();
    console.log('✅ Connection closed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection(); 