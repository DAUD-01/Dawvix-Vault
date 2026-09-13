import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { FileMetadata } from '../models/FileMetadata.js';

const runSeed = async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    'mongodb+srv://dawoodsardar252_db_user:hfISVZ7Gz03JebvT@cluster0.gmhmyxh.mongodb.net/university_vault?retryWrites=true&w=majority';

  if (mongoUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // ignore
    }
  }

  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log('[Seed] Connected successfully.');

    // 1. Remove any legacy mock/dummy files
    const deleteResult = await FileMetadata.deleteMany({
      driveId: {
        $in: [
          'folder_assignments_01',
          'folder_lectures_02',
          'file_syllabus_03',
          'file_research_paper_04',
          'file_lab1_spec',
          'file_lab1_starter',
          'file_lecture_w1',
        ],
      },
    });
    if (deleteResult.deletedCount > 0) {
      console.log(`[Seed] Removed ${deleteResult.deletedCount} dummy items.`);
    }

    // 2. Ensure Admin User exists
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ username: adminUsername });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);
      await User.create({ username: adminUsername, passwordHash });
      console.log(`[Seed] Created admin account: "${adminUsername}"`);
    } else {
      console.log(`[Seed] Admin user "${adminUsername}" is active.`);
    }

    console.log('[Seed] Seeding completed.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error during seeding:', (error as Error).message);
    process.exit(1);
  }
};

runSeed();
