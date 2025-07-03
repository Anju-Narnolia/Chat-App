import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  _id: string;
  title: string;
  description?: string;
  status: 'Backlog' | 'Todo' | 'In Progress' | 'Done' | 'Canceled';
  label: 'Documentation' | 'Bugs' | 'Features' | 'UI';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: Date;
  assigneeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled'],
    default: 'Todo',
  },
  label: {
    type: String,
    enum: ['Documentation', 'Bugs', 'Features', 'UI'],
    default: 'Features',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  assigneeId: {
    type: String,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema); 