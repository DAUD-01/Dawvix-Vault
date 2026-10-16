import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("[Database] MONGODB_URI is not defined in the .env file");
  }

  // Configure DNS for MongoDB Atlas SRV connections
  if (mongoUri.startsWith("mongodb+srv://")) {
    try {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch (dnsErr) {
      console.warn("[Database] Could not set custom DNS servers:", dnsErr);
    }
  }

  try {
    mongoose.set("strictQuery", false);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("[Database] Successfully connected to MongoDB Atlas");
  } catch (error) {
    console.error(
      "[Database] MongoDB connection failed:",
      error instanceof Error ? error.message : error,
    );

    throw error;
  }
};
