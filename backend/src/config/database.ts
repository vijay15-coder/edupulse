import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/edupulse-saas';
    
    await mongoose.connect(mongoUri);
    
    console.log('MongoDB Connected Successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

export default connectDB;
