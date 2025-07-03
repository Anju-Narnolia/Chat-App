import mongoose, { Schema, Document } from 'mongoose';

export interface IBreak {
  start: Date;
  end?: Date;
}

export interface IAttendance extends Document {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'On Leave' | 'Half-day';
  punchInTime?: Date;
  punchOutTime?: Date;
  breaks: IBreak[];
  totalWorkDuration: number; // in seconds
  totalBreakDuration: number; // in seconds
  isLate?: boolean;
  isEarlyDeparture?: boolean;
  overtimeHours?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BreakSchema = new Schema<IBreak>({
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
  },
});

const AttendanceSchema = new Schema<IAttendance>({
  userId: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD format
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'On Leave', 'Half-day'],
    default: 'Present',
  },
  punchInTime: {
    type: Date,
  },
  punchOutTime: {
    type: Date,
  },
  breaks: [BreakSchema],
  totalWorkDuration: {
    type: Number,
    default: 0,
  },
  totalBreakDuration: {
    type: Number,
    default: 0,
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  isEarlyDeparture: {
    type: Boolean,
    default: false,
  },
  overtimeHours: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound index for userId and date to ensure one attendance record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema); 