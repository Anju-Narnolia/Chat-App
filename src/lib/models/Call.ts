import mongoose, { Schema, Document } from 'mongoose';

export interface ICallParticipant {
  id: string;
  name: string;
  image: string;
}

export interface ICall extends Document {
  _id: string;
  participantIds: string[];
  participants: ICallParticipant[];
  createdBy: ICallParticipant;
  type: 'audio' | 'video';
  status: 'pending' | 'answered' | 'ended' | 'missed' | 'declined';
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  activeParticipantIds: string[];
  isRecording: boolean;
  recordingUrl?: string;
  isScreenSharing: boolean;
  screenSharingUserId?: string;
  chatId?: string; // Optional link to a conversation
  createdAt: Date;
  updatedAt: Date;
}

const CallParticipantSchema = new Schema<ICallParticipant>({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
});

const CallSchema = new Schema<ICall>({
  participantIds: [{
    type: String,
    required: true,
  }],
  participants: [CallParticipantSchema],
  createdBy: {
    type: CallParticipantSchema,
    required: true,
  },
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'answered', 'ended', 'missed', 'declined'],
    default: 'pending',
  },
  startedAt: {
    type: Date,
  },
  answeredAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
  duration: {
    type: Number,
    default: 0,
  },
  activeParticipantIds: [{
    type: String,
  }],
  isRecording: {
    type: Boolean,
    default: false,
  },
  recordingUrl: {
    type: String,
  },
  isScreenSharing: {
    type: Boolean,
    default: false,
  },
  screenSharingUserId: {
    type: String,
  },
  chatId: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
CallSchema.index({ participantIds: 1 });
CallSchema.index({ status: 1 });
CallSchema.index({ createdAt: -1 });
CallSchema.index({ chatId: 1 });

export default mongoose.models.Call || mongoose.model<ICall>('Call', CallSchema); 