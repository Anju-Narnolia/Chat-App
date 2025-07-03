import mongoose, { Schema, Document } from 'mongoose';

export interface IScreenMonitoringSession extends Document {
  _id: string;
  userId: string;
  userName: string;
  userImage: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'ended';
  peerConnectionId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScreenMonitoringSessionSchema = new Schema<IScreenMonitoringSession>({
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userImage: {
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
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active',
  },
  peerConnectionId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
ScreenMonitoringSessionSchema.index({ userId: 1, status: 1 });
ScreenMonitoringSessionSchema.index({ status: 1 });
ScreenMonitoringSessionSchema.index({ startedAt: -1 });

export default mongoose.models.ScreenMonitoringSession || mongoose.model<IScreenMonitoringSession>('ScreenMonitoringSession', ScreenMonitoringSessionSchema); 