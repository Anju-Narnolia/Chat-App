import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveRequest extends Document {
  _id: string;
  userId: string;
  leaveType: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'emergency';
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectionReason?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>({
  userId: {
    type: String,
    required: true,
  },
  leaveType: {
    type: String,
    enum: ['vacation', 'sick', 'personal', 'maternity', 'paternity', 'emergency'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  totalDays: {
    type: Number,
    required: true,
    min: 1,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  appliedDate: {
    type: Date,
    default: Date.now,
  },
  approvedBy: {
    type: String,
  },
  approvedDate: {
    type: Date,
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  attachments: [{
    type: String,
  }],
}, {
  timestamps: true,
});

// Index for efficient queries
LeaveRequestSchema.index({ userId: 1, appliedDate: -1 });
LeaveRequestSchema.index({ status: 1, appliedDate: -1 });

export default mongoose.models.LeaveRequest || mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema); 