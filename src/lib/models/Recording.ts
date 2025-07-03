import mongoose, { Schema, Document } from 'mongoose';

export interface IRecording extends Document {
  _id: string;
  callId: string;
  recordingUrl: string;
  participants: { id: string; name: string }[];
  participantIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RecordingSchema = new Schema<IRecording>({
  callId: {
    type: String,
    required: true,
  },
  recordingUrl: {
    type: String,
    required: true,
  },
  participants: [{
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  }],
  participantIds: [{
    type: String,
    required: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
RecordingSchema.index({ callId: 1 });
RecordingSchema.index({ participantIds: 1 });
RecordingSchema.index({ createdAt: -1 });

export default mongoose.models.Recording || mongoose.model<IRecording>('Recording', RecordingSchema); 