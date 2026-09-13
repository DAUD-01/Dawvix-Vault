import mongoose, { Document, Schema } from 'mongoose';

export interface IFileMetadata extends Document {
  driveId: string;
  name: string;
  mimeType: string;
  size: number;
  parents: string[];
  isFolder: boolean;
  lastSyncedAt: Date;
}

const fileMetadataSchema = new Schema<IFileMetadata>(
  {
    driveId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    parents: {
      type: [String],
      default: [],
      index: true,
    },
    isFolder: {
      type: Boolean,
      default: false,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast folder listing
fileMetadataSchema.index({ parents: 1, isFolder: -1, name: 1 });

export const FileMetadata = mongoose.model<IFileMetadata>(
  'FileMetadata',
  fileMetadataSchema
);
