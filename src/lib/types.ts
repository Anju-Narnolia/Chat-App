export type User = {
  id: string; // MongoDB ObjectId
  name: string;
  image: string;
  email: string;
  role: 'user' | 'admin';
};

export type TaskStatus = 'Backlog' | 'Todo' | 'In Progress' | 'Done' | 'Canceled';
export type TaskLabel = 'Documentation' | 'Bugs' | 'Features' | 'UI';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  label: TaskLabel;
  priority: TaskPriority;
  dueDate: Date;
  assignee: User | null;
};

export type Contact = {
  id: string;
  name: string;
  image: string;
  online: boolean;
  role?: 'user' | 'admin';
};

export type Break = {
    start: Date;
    end: Date | null;
}

export type AttendanceStatus = 'punched-in' | 'on-break' | 'punched-out' | 'screen-pending';

export type ScreenMonitoringSession = {
    id: string;
    userId: string;
    userName: string;
    userImage: string;
    startedAt: Date;
    endedAt?: Date;
    status: 'active' | 'ended';
    peerConnectionId: string;
};

export type ScreenViewLog = {
    id: string;
    adminId: string;
    adminName: string;
    userId: string;
    userName: string;
    startedAt: Date;
    endedAt?: Date;
    duration?: number;
};

export type UserStatus = {
    userId: string;
    userName: string;
    userImage: string;
    status: AttendanceStatus;
    lastUpdated: Date;
    screenSessionId?: string;
    isScreenSharing: boolean;
};

export type Attendance = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'On Leave' | 'Half-day';
  punchInTime: Date | null;
  punchOutTime: Date | null;
  breaks: Break[];
  totalWorkDuration: number; // in seconds
  totalBreakDuration: number; // in seconds
  isLate?: boolean;
  isEarlyDeparture?: boolean;
  overtimeHours?: number;
  notes?: string;
};

export type LeaveType = 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'emergency';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type LeaveRequest = {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectionReason?: string;
  attachments?: string[];
};

export type LeaveBalance = {
  userId: string;
  vacation: number;
  sick: number;
  personal: number;
  maternity: number;
  paternity: number;
  emergency: number;
  year: number;
};

export type AttendanceReport = {
  userId: string;
  userName: string;
  userImage: string;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateArrivals: number;
  earlyDepartures: number;
  totalWorkHours: number;
  averageWorkHours: number;
  overtimeHours: number;
  attendancePercentage: number;
  period: {
    startDate: string;
    endDate: string;
  };
};

export type AttendanceStats = {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  lateToday: number;
  averageAttendance: number;
  topPerformers: Array<{
    userId: string;
    userName: string;
    attendancePercentage: number;
  }>;
};

export type Message = {
  id: string;
  text: string;
  senderId: string;
  receiverId: string; // For direct messages or group/chat ID
  timestamp: Date;
  isCallNotification?: boolean;
};

export type CallParticipant = {
    id: string;
    name: string;
    image: string;
};

export type Call = {
    id:string;
    participants: CallParticipant[];
    participantIds: string[];
    activeParticipantIds: string[];
    type: 'audio' | 'video';
    status: 'ringing' | 'answered' | 'ended' | 'rejected' | 'missed';
    createdAt: Date;
    answeredAt?: Date;
    isGroupCall: boolean;
    createdBy: CallParticipant;
    chatId?: string;
    duration?: number;
    screenSharerId?: string;
    isRecording?: boolean;
};

export type Recording = {
  id: string;
  callId: string;
  recordingUrl: string;
  participants: { id: string; name: string }[];
  participantIds: string[];
  createdAt: Date;
};

export type Conversation = {
    id: string; // Corresponds to the chat document ID in MongoDB
    name: string; // Group name or the other user's name
    image: string; // A placeholder group image or the other user's image
    isGroup: boolean;
    participantIds: string[];
    lastMessageTimestamp?: Date;
    lastMessageText?: string;
    lastMessageSenderId?: string;
    createdBy?: string;
    roles?: Record<string, 'admin' | 'member'>;
};

export type ClientBreak = {
    start: Date;
    end: Date | null;
}

export type ClientAttendance = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'On Leave' | 'Half-day';
  punchInTime: Date | null;
  punchOutTime: Date | null;
  breaks: ClientBreak[];
  totalWorkDuration: number; // in seconds
  totalBreakDuration: number; // in seconds
  isLate?: boolean;
  isEarlyDeparture?: boolean;
  overtimeHours?: number;
  notes?: string;
};
