import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  text: string;
  senderId: string;
  receiverId: string; // For direct messages or group/chat ID
  timestamp: Date;
  isCallNotification?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  receiverId: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isCallNotification: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
MessageSchema.index({ senderId: 1, timestamp: -1 });
MessageSchema.index({ receiverId: 1, timestamp: -1 });
MessageSchema.index({ timestamp: -1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema); 