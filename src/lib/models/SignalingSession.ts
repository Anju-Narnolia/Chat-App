import mongoose, { Schema, Document } from 'mongoose';

export interface ISignalingSession extends Document {
  sessionId: string;
  offer?: {
    from: string;
    sdp: {
      type: string;
      sdp: string;
    };
  };
  answer?: {
    from: string;
    sdp: {
      type: string;
      sdp: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const SignalingSessionSchema = new Schema<ISignalingSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  offer: {
    from: String,
    sdp: {
      type: String,
      sdp: String
    }
  },
  answer: {
    from: String,
    sdp: {
      type: String,
      sdp: String
    }
  }
}, {
  timestamps: true
});

// Create index for faster queries
SignalingSessionSchema.index({ sessionId: 1 });
SignalingSessionSchema.index({ updatedAt: 1 });

export default mongoose.models.SignalingSession || mongoose.model<ISignalingSession>('SignalingSession', SignalingSessionSchema); 