import mongoose, { Schema, Document } from 'mongoose';

export interface IScreenViewLog extends Document {
  _id: string;
  adminId: string;
  adminName: string;
  userId: string;
  userName: string;
  screenSessionId: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const ScreenViewLogSchema = new Schema<IScreenViewLog>({
  adminId: {
    type: String,
    required: true,
  },
  adminName: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  screenSessionId: {
    type: String,
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
  duration: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
ScreenViewLogSchema.index({ adminId: 1, startedAt: -1 });
ScreenViewLogSchema.index({ userId: 1, startedAt: -1 });
ScreenViewLogSchema.index({ screenSessionId: 1 });

export default mongoose.models.ScreenViewLog || mongoose.model<IScreenViewLog>('ScreenViewLog', ScreenViewLogSchema); 