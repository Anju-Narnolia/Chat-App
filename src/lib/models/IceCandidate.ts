import mongoose, { Schema, Document } from 'mongoose';

export interface IIceCandidate extends Document {
  sessionId: string;
  candidate: {
    candidate: string;
    sdpMLineIndex: number;
    sdpMid: string;
  };
  peerType: 'peer1' | 'peer2';
  createdAt: Date;
}

const IceCandidateSchema = new Schema<IIceCandidate>({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  candidate: {
    candidate: String,
    sdpMLineIndex: Number,
    sdpMid: String
  },
  peerType: {
    type: String,
    enum: ['peer1', 'peer2'],
    required: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Create indexes for faster queries
IceCandidateSchema.index({ sessionId: 1, peerType: 1 });
IceCandidateSchema.index({ createdAt: 1 });

export default mongoose.models.IceCandidate || mongoose.model<IIceCandidate>('IceCandidate', IceCandidateSchema); 