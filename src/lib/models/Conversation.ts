import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  _id: string;
  name: string; // Group name or the other user's name
  image: string; // A placeholder group image or the other user's image
  isGroup: boolean;
  participantIds: string[];
  lastMessageTimestamp?: Date;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  createdBy?: string;
  roles?: Record<string, 'admin' | 'member'>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    default: 'https://placehold.co/100x100.png',
  },
  isGroup: {
    type: Boolean,
    default: false,
  },
  participantIds: [{
    type: String,
    required: true,
  }],
  lastMessageTimestamp: {
    type: Date,
  },
  lastMessageText: {
    type: String,
    trim: true,
  },
  lastMessageSenderId: {
    type: String,
  },
  createdBy: {
    type: String,
  },
  roles: {
    type: Map,
    of: {
      type: String,
      enum: ['admin', 'member'],
    },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
ConversationSchema.index({ participantIds: 1 });
ConversationSchema.index({ lastMessageTimestamp: -1 });

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema); 