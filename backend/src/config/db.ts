import dns from 'dns';
import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb+srv://dawoodsardar252_db_user:hfISVZ7Gz03JebvT@cluster0.gmhmyxh.mongodb.net/university_vault?retryWrites=true&w=majority';

  // Ensure SRV DNS resolution works reliably for mongodb+srv URIs across all network providers
  if (mongoUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
      console.warn('[Database] Could not set custom DNS servers:', (dnsErr as Error).message);
    }
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(
      `[Database] Successfully connected to MongoDB Atlas at ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`
    );
  } catch (error) {
    console.error('[Database] MongoDB connection failed:', (error as Error).message);
    console.warn(
      '[Database] Running in disconnected state. Ensure MongoDB Atlas cluster is accessible and IP whitelist is configured.'
    );
  }
};
