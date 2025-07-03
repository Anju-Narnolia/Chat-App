import mongoose, { Schema, Document } from 'mongoose';

export interface IUserStatus extends Document {
  _id: string;
  userId: string;
  userName: string;
  userImage: string;
  status: 'punched-in' | 'on-break' | 'punched-out' | 'screen-pending';
  lastUpdated: Date;
  screenSessionId?: string;
  isScreenSharing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserStatusSchema = new Schema<IUserStatus>({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userImage: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['punched-in', 'on-break', 'punched-out', 'screen-pending'],
    default: 'punched-out',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  screenSessionId: {
    type: String,
  },
  isScreenSharing: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
UserStatusSchema.index({ userId: 1 }, { unique: true });
UserStatusSchema.index({ status: 1 });
UserStatusSchema.index({ lastUpdated: -1 });

export default mongoose.models.UserStatus || mongoose.model<IUserStatus>('UserStatus', UserStatusSchema); 