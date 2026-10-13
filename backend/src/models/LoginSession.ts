import mongoose, { Schema } from 'mongoose';

export const SESSION_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

interface ILoginSession {
  _id: string;
  userId: string;
  lastActivity: Date;
}

const loginSessionSchema = new Schema<ILoginSession>({
  _id: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  lastActivity: {
    type: Date,
    required: true,
    default: Date.now,
    expires: SESSION_IDLE_TIMEOUT_MS / 1000,
  },
});

export const LoginSession = mongoose.model<ILoginSession>(
  'LoginSession',
  loginSessionSchema
);
