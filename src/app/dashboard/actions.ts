"use server";
import { suggestTaskStatus } from "@/ai/flows/task-status-suggestion";
import type { SuggestTaskStatusOutput } from "@/ai/flows/task-status-suggestion";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Call, Recording, CallParticipant, Break, AttendanceStatus, LeaveRequest, LeaveBalance, AttendanceReport, AttendanceStats, LeaveType, LeaveStatus, ClientAttendance, ClientBreak } from "@/lib/types";
import cloudinary from "@/lib/cloudinary";
import { format } from 'date-fns';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Attendance, { IAttendance, IBreak } from '@/lib/models/Attendance';
import UserStatus, { IUserStatus } from '@/lib/models/UserStatus';
import ScreenMonitoringSession, { IScreenMonitoringSession } from '@/lib/models/ScreenMonitoringSession';
import ScreenViewLog from '@/lib/models/ScreenViewLog';
import Conversation from '@/lib/models/Conversation';
import Task from '@/lib/models/Task';
import Message from '@/lib/models/Message';
import SignalingSession from '@/lib/models/SignalingSession';
import IceCandidate from '@/lib/models/IceCandidate';

export async function startScreenSharingAction(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        await connectDB();
        
        // Get user info
        const user = await User.findById(userId);
        if (!user) {
            return { error: "User not found." };
        }
        
        // Check if user already has an active screen sharing session
        const existingSession = await ScreenMonitoringSession.findOne({ 
            userId, 
            status: 'active' 
        });
        
        if (existingSession) {
            return { error: "Screen sharing session already active." };
        }
        
        // Create new screen monitoring session
        const session = new ScreenMonitoringSession({
            userId,
            userName: user.name,
            userImage: user.image,
            startedAt: new Date(),
            status: 'active',
            peerConnectionId: `pc_${userId}_${Date.now()}`
        });
        
        await session.save();
        
        // Update user status to indicate screen sharing
        await UserStatus.findOneAndUpdate(
            { userId },
            {
                status: 'punched-in',
                lastUpdated: new Date(),
                isScreenSharing: true,
                screenSessionId: session._id.toString()
            },
            { upsert: true, new: true }
        );
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error starting screen sharing:', error);
        return { error: "Failed to start screen sharing." };
    }
}

export async function stopScreenSharingAction(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        await connectDB();
        
        // Find and end active screen sharing session
        const session = await ScreenMonitoringSession.findOne({ 
            userId, 
            status: 'active' 
        });
        
        if (session) {
            session.status = 'ended';
            session.endedAt = new Date();
            await session.save();
        }
        
        // Update user status
        await UserStatus.findOneAndUpdate(
            { userId },
            {
                lastUpdated: new Date(),
                isScreenSharing: false,
                screenSessionId: undefined
            },
            { upsert: true, new: true }
        );
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error stopping screen sharing:', error);
        return { error: "Failed to stop screen sharing." };
    }
}

export async function getActiveScreenSessionsAction(): Promise<any[]> {
    try {
        await connectDB();
        
        const sessions = await ScreenMonitoringSession.find({ status: 'active' })
            .sort({ startedAt: -1 })
            .limit(50);
        
        return sessions.map(session => ({
            id: session._id.toString(),
            userId: session.userId,
            userName: session.userName,
            userImage: session.userImage,
            startedAt: session.startedAt,
            status: session.status,
            peerConnectionId: session.peerConnectionId
        }));
        
    } catch (error) {
        console.error('Error getting active screen sessions:', error);
        return [];
    }
}

export async function logScreenViewAction(data: { adminId: string; userId: string }): Promise<{ success?: boolean; error?: string }> {
    try {
        await connectDB();
        
        const { adminId, userId } = data;
        
        // Get admin and user info
        const admin = await User.findById(adminId);
        const user = await User.findById(userId);
        
        if (!admin || !user) {
            return { error: "User not found." };
        }
        
        // Get active screen session
        const screenSession = await ScreenMonitoringSession.findOne({ 
            userId, 
            status: 'active' 
        });
        
        if (!screenSession) {
            return { error: "No active screen session found." };
        }
        
        // Create screen view log
        const viewLog = new ScreenViewLog({
            adminId,
            adminName: admin.name,
            userId,
            userName: user.name,
            screenSessionId: screenSession._id.toString(),
            startedAt: new Date()
        });
        
        await viewLog.save();
        
        revalidatePath("/dashboard");
        return { success: true, logId: viewLog._id.toString() } as any;
        
    } catch (error) {
        console.error('Error logging screen view:', error);
        return { error: "Failed to log screen view." };
    }
}

export async function endScreenViewAction(logId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        await connectDB();
        
        const viewLog = await ScreenViewLog.findById(logId);
        if (!viewLog) {
            return { error: "Screen view log not found." };
        }
        
        const now = new Date();
        const duration = Math.floor((now.getTime() - viewLog.startedAt.getTime()) / 1000);
        
        viewLog.endedAt = now;
        viewLog.duration = duration;
        await viewLog.save();
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error ending screen view:', error);
        return { error: "Failed to end screen view." };
    }
}

export async function getUserStatusWithScreenAction(userId: string): Promise<any | null> {
    try {
        await connectDB();
        
        const userStatus = await UserStatus.findOne({ userId });
        if (!userStatus) {
            return null;
        }
        
        // Get active screen session if user is screen sharing
        let screenSession = null;
        if (userStatus.isScreenSharing && userStatus.screenSessionId) {
            screenSession = await ScreenMonitoringSession.findById(userStatus.screenSessionId);
        }
        
        return {
            id: userStatus._id.toString(),
            userId: userStatus.userId,
            userName: userStatus.userName,
            userImage: userStatus.userImage,
            status: userStatus.status,
            lastUpdated: userStatus.lastUpdated,
            isScreenSharing: userStatus.isScreenSharing,
            screenSessionId: userStatus.screenSessionId,
            screenSession: screenSession ? {
                id: screenSession._id.toString(),
                startedAt: screenSession.startedAt,
                peerConnectionId: screenSession.peerConnectionId
            } : null
        };
        
    } catch (error) {
        console.error('Error getting user status with screen:', error);
        return null;
    }
}

export async function suggestTaskStatusAction(
  taskId: string
): Promise<SuggestTaskStatusOutput | null> {
  // In a real app, you would fetch real chat activity and attachments.
  const mockChatActivity = `
    User Alice: Hey, I've started working on the authentication feature.
    User Bob: Great! Let me know if you need any help with the UI components.
    User Alice: I've pushed the initial commit. Can you review it? I've attached a screenshot of the login page.
    `;

  // This is a placeholder for a data URI of an uploaded image.
  const mockAttachment = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  
  try {
    const suggestion = await suggestTaskStatus({
      taskId,
      recentChatActivity: mockChatActivity,
      uploadedAttachments: [mockAttachment],
    });
    return suggestion;
  } catch (error) {
    console.error("Error in suggestTaskStatusAction:", error);
    return null;
  }
}

const TaskSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().optional(),
    assigneeId: z.string().optional(),
    status: z.enum(['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled']),
    label: z.enum(['Documentation', 'Bugs', 'Features', 'UI']),
    priority: z.enum(['Low', 'Medium', 'High']),
    dueDate: z.date(),
});

export async function createTaskAction(data: z.infer<typeof TaskSchema>) {
    try {
        await connectDB();
        
        const task = new Task({
            title: data.title,
            description: data.description,
            status: data.status,
            label: data.label,
            priority: data.priority,
            dueDate: data.dueDate,
            assigneeId: data.assigneeId === 'unassigned' ? undefined : data.assigneeId
        });
        
        await task.save();
        
        revalidatePath("/dashboard");
        return { success: "Task created successfully.", taskId: task._id.toString() };
        
    } catch (error) {
        console.error('Error creating task:', error);
        return { error: "Failed to create task. Please try again." };
    }
}

export async function updateTaskAction(taskId: string, data: z.infer<typeof TaskSchema>) {
    try {
        await connectDB();
        
        const task = await Task.findByIdAndUpdate(
            taskId,
            {
                title: data.title,
                description: data.description,
                status: data.status,
                label: data.label,
                priority: data.priority,
                dueDate: data.dueDate,
                assigneeId: data.assigneeId
            },
            { new: true }
        );
        
        if (!task) {
            return { error: "Task not found." };
        }
        
        revalidatePath("/dashboard");
        return { success: "Task updated successfully." };
        
    } catch (error) {
        console.error('Error updating task:', error);
        return { error: "Failed to update task. Please try again." };
    }
}

export async function getAllTasksAction(): Promise<any[]> {
    try {
        await connectDB();
        
        const tasks = await Task.find({}).sort({ createdAt: -1 });
        
        // Get all unique assignee IDs
        const assigneeIds = [...new Set(tasks.map(task => task.assigneeId).filter(Boolean))];
        const users = await User.find({ _id: { $in: assigneeIds } });
        const userMap = new Map(users.map(user => [user._id.toString(), user]));
        
        return tasks.map(task => ({
            id: task._id.toString(),
            title: task.title,
            description: task.description,
            status: task.status,
            label: task.label,
            priority: task.priority,
            dueDate: task.dueDate,
            assigneeId: task.assigneeId,
            assignee: task.assigneeId ? userMap.get(task.assigneeId) ? {
                id: userMap.get(task.assigneeId)!._id.toString(),
                name: userMap.get(task.assigneeId)!.name,
                email: userMap.get(task.assigneeId)!.email,
                image: userMap.get(task.assigneeId)!.image,
                role: userMap.get(task.assigneeId)!.role
            } : null : null,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
        
    } catch (error) {
        console.error('Error fetching all tasks:', error);
        return [];
    }
}

export async function getTasksByAssigneeAction(assigneeId: string): Promise<any[]> {
    try {
        await connectDB();
        
        // Find tasks assigned to this user
        const tasks = await Task.find({ assigneeId }).sort({ createdAt: -1 });
        
        // Get user information
        const user = await User.findById(assigneeId);
        
        return tasks.map(task => ({
            id: task._id.toString(),
            title: task.title,
            description: task.description,
            status: task.status,
            label: task.label,
            priority: task.priority,
            dueDate: task.dueDate,
            assigneeId: task.assigneeId,
            assignee: user ? {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role
            } : null,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
        
    } catch (error) {
        console.error('Error fetching tasks by assignee:', error);
        return [];
    }
}

export async function getUnassignedTasksAction(): Promise<any[]> {
    try {
        await connectDB();
        
        // Find tasks with no assignee
        const tasks = await Task.find({ assigneeId: { $exists: false } }).sort({ createdAt: -1 });
        
        return tasks.map(task => ({
            id: task._id.toString(),
            title: task.title,
            description: task.description,
            status: task.status,
            label: task.label,
            priority: task.priority,
            dueDate: task.dueDate,
            assigneeId: task.assigneeId,
            assignee: null, // Unassigned tasks have no assignee
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
        
    } catch (error) {
        console.error('Error fetching unassigned tasks:', error);
        return [];
    }
}

const CreateUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function createUserAction(credentials: z.infer<typeof CreateUserSchema>) {
    const validatedFields = CreateUserSchema.safeParse(credentials);
    if(!validatedFields.success) {
        return { error: validatedFields.error.errors.map(e => e.message).join(" ") };
    }

    const { name, email, password } = validatedFields.data;

    try {
        // Connect to MongoDB
        await connectDB();
        
        // Check if user with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { error: "User with this email already exists." };
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            image: `https://placehold.co/100x100.png`,
            role: 'user', // Default role for created users
        });
        await user.save();

        revalidatePath("/dashboard");
        return { success: "User created successfully." };

    } catch (error: any) {
        console.error("Create User Action Error:", error);
        let errorMessage = "An unexpected error occurred.";
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-exists':
                    errorMessage = "This email address is already in use.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "The email address is not valid.";
                    break;
                case 'auth/weak-password':
                    errorMessage = "The password is too weak.";
                    break;
                default:
                    errorMessage = error.message || errorMessage;
                    break;
            }
        }
        return { error: errorMessage };
    }
}

export async function sendMessageAction(data: { text: string; senderId: string; receiverId: string, chatId: string }) {
    try {
        await connectDB();
        
        const { text, senderId, receiverId, chatId } = data;
        
        // Create new message
        const message = new Message({
            text,
            senderId,
            receiverId: chatId, // Use chatId as receiverId
            timestamp: new Date(),
            isCallNotification: false
        });
        
        await message.save();
        
        // Update conversation's last message info
        await Conversation.findByIdAndUpdate(chatId, {
            lastMessageText: text,
            lastMessageSenderId: senderId,
            lastMessageTimestamp: new Date()
        });
        
        revalidatePath("/dashboard");
        return { success: true, messageId: message._id.toString() };
        
    } catch (error) {
        console.error('Error sending message:', error);
        return { error: "Failed to send message. Please try again." };
    }
}

export async function startCallAction(data: { participantIds: string[], type: 'audio' | 'video', createdBy: CallParticipant, chatId?: string }) {
    try {
        await connectDB();
        
        const { participantIds, type, createdBy, chatId } = data;
        
        // Get user info for all participants
        const users = await User.find({ _id: { $in: participantIds } });
        const userMap = new Map(users.map(user => [user._id.toString(), user]));
        
        // Create participants array
        const participants = participantIds.map(id => {
            const user = userMap.get(id);
            if (!user) {
                throw new Error(`User with ID ${id} not found`);
            }
            return {
                id: user._id.toString(),
                name: user.name,
                image: user.image
            };
        });
        
        // Create new call
        const Call = (await import('@/lib/models/Call')).default;
        const call = new Call({
            participantIds,
            participants,
            createdBy,
            type,
            status: 'pending',
            startedAt: new Date(),
            activeParticipantIds: [createdBy.id], // Creator is initially active
            isRecording: false,
            isScreenSharing: false,
            chatId
        });
        
        await call.save();
        
        revalidatePath("/dashboard");
        return { success: true, callId: call._id.toString() };
        
    } catch (error) {
        console.error('Error starting call:', error);
        return { error: "Failed to start call. Please try again." };
    }
}

export async function updateCallStatusAction(data: { callId: string, status: Call['status']}) {
    try {
        await connectDB();
        
        const { callId, status } = data;
        
        const Call = (await import('@/lib/models/Call')).default;
        const call = await Call.findById(callId);
        
        if (!call) {
            return { error: "Call not found." };
        }
        
        const updateData: any = { status };
        
        // Set appropriate timestamps based on status
        switch (status) {
            case 'answered':
                updateData.answeredAt = new Date();
                break;
            case 'ended':
                updateData.endedAt = new Date();
                if (call.answeredAt) {
                    const duration = Math.floor((new Date().getTime() - call.answeredAt.getTime()) / 1000);
                    updateData.duration = duration;
                }
                break;
        }
        
        await Call.findByIdAndUpdate(callId, updateData);
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error updating call status:', error);
        return { error: "Failed to update call status." };
    }
}

export async function updateActiveParticipantsAction(data: { callId: string, userId: string, name: string, type: 'join' | 'leave' }) {
    try {
        await connectDB();
        
        const { callId, userId, type } = data;
        
        const Call = (await import('@/lib/models/Call')).default;
        const call = await Call.findById(callId);
        
        if (!call) {
            return { error: "Call not found." };
        }
        
        let activeParticipantIds = [...call.activeParticipantIds];
        
        if (type === 'join') {
            if (!activeParticipantIds.includes(userId)) {
                activeParticipantIds.push(userId);
            }
        } else if (type === 'leave') {
            activeParticipantIds = activeParticipantIds.filter(id => id !== userId);
        }
        
        await Call.findByIdAndUpdate(callId, { activeParticipantIds });
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error updating active participants:', error);
        return { error: "Failed to update active participants." };
    }
}

export async function getCallByIdAction(callId: string): Promise<Call | null> {
    try {
        await connectDB();
        
        const Call = (await import('@/lib/models/Call')).default;
        const call = await Call.findById(callId);
        
        if (!call) {
            return null;
        }
        
        return {
            id: call._id.toString(),
            participantIds: call.participantIds,
            participants: call.participants,
            createdBy: call.createdBy,
            type: call.type,
            status: call.status,
            startedAt: call.startedAt,
            answeredAt: call.answeredAt,
            endedAt: call.endedAt,
            duration: call.duration,
            activeParticipantIds: call.activeParticipantIds,
            isRecording: call.isRecording,
            recordingUrl: call.recordingUrl,
            isScreenSharing: call.isScreenSharing,
            screenSharingUserId: call.screenSharingUserId,
            chatId: call.chatId,
            createdAt: call.createdAt,
            updatedAt: call.updatedAt
        };
        
    } catch (error) {
        console.error('Error getting call by ID:', error);
        return null;
    }
}

export async function getCloudinarySignatureAction() {
    try {
        const timestamp = Math.round((new Date()).getTime() / 1000);
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: 'tasktalk-recordings'
        }, process.env.CLOUDINARY_API_SECRET!);

        return { signature, timestamp };
    } catch (error) {
        console.error("Error generating Cloudinary signature:", error);
        return { error: "Could not generate an upload signature." };
    }
}

const RecordingSchema = z.object({
    callId: z.string(),
    recordingUrl: z.string().url(),
    participants: z.array(z.object({ id: z.string(), name: z.string() })),
});

export async function saveRecordingAction(data: z.infer<typeof RecordingSchema>) {
    try {
        await connectDB();
        
        const { callId, recordingUrl, participants } = data;
        
        const Call = (await import('@/lib/models/Call')).default;
        const call = await Call.findById(callId);
        
        if (!call) {
            return { error: "Call not found." };
        }
        
        await Call.findByIdAndUpdate(callId, {
            recordingUrl,
            isRecording: false
        });
        
        revalidatePath("/dashboard");
        return { success: "Recording saved successfully." };
        
    } catch (error) {
        console.error('Error saving recording:', error);
        return { error: "Failed to save recording." };
    }
}

export async function getRecordingsAction(userId: string): Promise<Recording[]> {
    // TODO: Replace with MongoDB implementation
    return [];
}

export async function createGroupChatAction(data: { name: string; participantIds: string[]; creatorId: string; }) {
    try {
        await connectDB();
        
        const { name, participantIds, creatorId } = data;
        
        // Add creator to participants if not already included
        const allParticipants = participantIds.includes(creatorId) 
            ? participantIds 
            : [...participantIds, creatorId];
        
        // Create roles map - creator is admin, others are members
        const roles: Record<string, 'admin' | 'member'> = {};
        allParticipants.forEach(participantId => {
            roles[participantId] = participantId === creatorId ? 'admin' : 'member';
        });
        
        // Create new conversation
        const conversation = new Conversation({
            name,
            isGroup: true,
            participantIds: allParticipants,
            createdBy: creatorId,
            roles,
            image: `https://placehold.co/100x100.png` // Default group image
        });
        
        await conversation.save();
        
        revalidatePath("/dashboard");
        return { success: "Group chat created successfully.", chatId: conversation._id.toString() };
        
    } catch (error) {
        console.error('Error creating group chat:', error);
        return { error: "Failed to create group chat. Please try again." };
    }
}

export async function addMembersToGroupAction(data: { chatId: string; userIdsToAdd: string[]; adminId: string }) {
    // TODO: Replace with MongoDB implementation
    return { success: true };
}

export async function removeMemberFromGroupAction(data: { chatId: string; userIdToRemove: string; adminId: string }) {
    // TODO: Replace with MongoDB implementation
    return { success: true };
}

export async function leaveGroupAction(data: { chatId: string; userId: string }) {
    // TODO: Replace with MongoDB implementation
    return { success: true };
}

export async function getOrCreateChatAction(data: { currentUserId: string, otherUserId: string }) {
    try {
        await connectDB();
        
        const { currentUserId, otherUserId } = data;
        
        // Check if a direct conversation already exists between these users
        const existingConversation = await Conversation.findOne({
            isGroup: false,
            participantIds: { 
                $all: [currentUserId, otherUserId],
                $size: 2 
            }
        });
        
        if (existingConversation) {
            return { 
                success: true, 
                chatId: existingConversation._id.toString(), 
                isNew: false 
            };
        }
        
        // Get user info for the other user
        const otherUser = await User.findById(otherUserId);
        if (!otherUser) {
            return { error: "User not found." };
        }
        
        // Create new direct conversation
        const conversation = new Conversation({
            name: otherUser.name,
            image: otherUser.image,
            isGroup: false,
            participantIds: [currentUserId, otherUserId],
            createdBy: currentUserId
        });
        
        await conversation.save();
        
        revalidatePath("/dashboard");
        return { 
            success: true, 
            chatId: conversation._id.toString(), 
            isNew: true 
        };
        
    } catch (error) {
        console.error('Error creating chat:', error);
        return { error: "Failed to create chat. Please try again." };
    }
}

export async function removeParticipantAction(data: { callId: string, participantIdToRemove: string, requesterId: string }) {
    // TODO: Replace with MongoDB implementation
    return { success: true };
}

export async function addParticipantAction(data: { callId: string, participantIdToAdd: string, requesterId: string }) {
    // TODO: Replace with MongoDB implementation
    return { success: true };
}

export async function updateScreenShareStatusAction(data: { callId: string, userId: string | null }) {
    try {
        await connectDB();
        
        const { callId, userId } = data;
        
        const Call = (await import('@/lib/models/Call')).default;
        const call = await Call.findById(callId);
        
        if (!call) {
            return { error: "Call not found." };
        }
        
        await Call.findByIdAndUpdate(callId, {
            isScreenSharing: !!userId,
            screenSharingUserId: userId || undefined
        });
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error updating screen share status:', error);
        return { error: "Failed to update screen share status." };
    }
}

export async function updateRecordingStatusAction(data: { callId: string, isRecording: boolean }) {
    try {
        await connectDB();
        
        const { callId, isRecording } = data;
        
        const Call = (await import('@/lib/models/Call')).default;
        const call = await Call.findById(callId);
        
        if (!call) {
            return { error: "Call not found." };
        }
        
        await Call.findByIdAndUpdate(callId, { isRecording });
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error updating recording status:', error);
        return { error: "Failed to update recording status." };
    }
}

// ATTENDANCE ACTIONS - MongoDB Implementation

export async function getTodaysAttendanceState(userId: string): Promise<any> {
    try {
        await connectDB();
        
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Get today's attendance record
        const attendance = await Attendance.findOne({ userId, date: today });
        
        // Get user status
        const userStatus = await UserStatus.findOne({ userId });
        
        // Get user info for status
        const user = await User.findById(userId);
        
        if (!user) {
            return { status: 'punched-out', dailyRecord: null };
        }
        
        // If no user status exists, create one
        if (!userStatus) {
            const newUserStatus = new UserStatus({
                userId,
                userName: user.name,
                userImage: user.image,
                status: 'punched-out',
                lastUpdated: new Date(),
                isScreenSharing: false
            });
            await newUserStatus.save();
            return { status: 'punched-out', dailyRecord: null };
        }
        
        // Convert attendance to client format if it exists
        const dailyRecord = attendance ? {
            id: attendance._id.toString(),
            userId: attendance.userId,
            date: attendance.date,
            status: attendance.status,
            punchInTime: attendance.punchInTime,
            punchOutTime: attendance.punchOutTime,
            breaks: attendance.breaks.map((breakItem: any) => ({
                start: breakItem.start,
                end: breakItem.end
            })),
            totalWorkDuration: attendance.totalWorkDuration,
            totalBreakDuration: attendance.totalBreakDuration,
            isLate: attendance.isLate,
            isEarlyDeparture: attendance.isEarlyDeparture,
            overtimeHours: attendance.overtimeHours,
            notes: attendance.notes
        } : null;
        
        return { 
            status: userStatus.status, 
            dailyRecord 
        };
        
    } catch (error) {
        console.error('Error getting today\'s attendance state:', error);
        return { status: 'punched-out', dailyRecord: null };
    }
}

export async function punchInAction(userId: string) {
    try {
        await connectDB();
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const now = new Date();
        
        // Get user info
        const user = await User.findById(userId);
        if (!user) {
            return { error: "User not found." };
        }
        
        // Check if already punched in today
        const existingAttendance = await Attendance.findOne({ userId, date: today });
        if (existingAttendance && existingAttendance.punchInTime && !existingAttendance.punchOutTime) {
            return { error: "Already punched in today." };
        }
        
        // Create or update attendance record
        let attendance;
        if (existingAttendance) {
            // Update existing record (in case of re-punch in)
            attendance = existingAttendance;
            attendance.punchInTime = now;
            attendance.punchOutTime = undefined;
            attendance.breaks = [];
            attendance.totalWorkDuration = 0;
            attendance.totalBreakDuration = 0;
        } else {
            // Create new attendance record
            attendance = new Attendance({
                userId,
                date: today,
                status: 'Present',
                punchInTime: now,
                breaks: [],
                totalWorkDuration: 0,
                totalBreakDuration: 0
            });
        }
        
        await attendance.save();
        
        // Update user status
        await UserStatus.findOneAndUpdate(
            { userId },
            {
                status: 'punched-in',
                lastUpdated: now,
                isScreenSharing: false
            },
            { upsert: true, new: true }
        );
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error in punch in action:', error);
        return { error: "Failed to punch in. Please try again." };
    }
}

export async function punchOutAction(userId: string) {
    try {
        await connectDB();
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const now = new Date();
        
        // Get today's attendance record
        const attendance = await Attendance.findOne({ userId, date: today });
        
        if (!attendance || !attendance.punchInTime) {
            return { error: "No punch in record found for today." };
        }
        
        if (attendance.punchOutTime) {
            return { error: "Already punched out today." };
        }
        
        // Calculate work duration
        const punchInTime = new Date(attendance.punchInTime);
        const totalWorkMs = now.getTime() - punchInTime.getTime();
        // Calculate total break duration
        const totalBreakMs = attendance.breaks.reduce((acc: number, breakItem: { start: string; end?: string }) => {
            const start = new Date(breakItem.start);
            const end = breakItem.end ? new Date(breakItem.end) : now;
            return acc + (end.getTime() - start.getTime());
        }, 0);
        
        // Update attendance record
        attendance.punchOutTime = now;
        attendance.totalWorkDuration = Math.floor((totalWorkMs - totalBreakMs) / 1000);
        attendance.totalBreakDuration = Math.floor(totalBreakMs / 1000);
        // Close any open breaks
        attendance.breaks = attendance.breaks.map((breakItem: { start: string; end?: string }) => {
            if (!breakItem.end) {
                return { ...breakItem, end: now };
            }
            return breakItem;
        });
        
        await attendance.save();
        
        // Update user status
        await UserStatus.findOneAndUpdate(
            { userId },
            {
                status: 'punched-out',
                lastUpdated: now,
                isScreenSharing: false
            },
            { upsert: true, new: true }
        );
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error in punch out action:', error);
        return { error: "Failed to punch out. Please try again." };
    }
}

export async function startBreakAction(userId: string) {
    try {
        await connectDB();
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const now = new Date();
        
        // Get today's attendance record
        const attendance = await Attendance.findOne({ userId, date: today });
        
        if (!attendance || !attendance.punchInTime) {
            return { error: "No punch in record found for today." };
        }
        
        if (attendance.punchOutTime) {
            return { error: "Cannot start break after punching out." };
        }
        // Check if already on break
        const hasOpenBreak = attendance.breaks.some((breakItem: { start: string; end?: string }) => !breakItem.end);
        if (hasOpenBreak) {
            return { error: "Already on break." };
        }
        // Add new break
        attendance.breaks.push({ start: now });
        await attendance.save();
        
        // Update user status
        await UserStatus.findOneAndUpdate(
            { userId },
            {
                status: 'on-break',
                lastUpdated: now,
                isScreenSharing: false
            },
            { upsert: true, new: true }
        );
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error in start break action:', error);
        return { error: "Failed to start break. Please try again." };
    }
}

export async function resumeWorkAction(userId: string) {
    try {
        await connectDB();
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const now = new Date();
        
        // Get today's attendance record
        const attendance = await Attendance.findOne({ userId, date: today });
        
        if (!attendance || !attendance.punchInTime) {
            return { error: "No punch in record found for today." };
        }
        
        if (attendance.punchOutTime) {
            return { error: "Cannot resume work after punching out." };
        }
        // Find and close the open break
        const openBreakIndex = attendance.breaks.findIndex((breakItem: { start: string; end?: string }) => !breakItem.end);
        if (openBreakIndex === -1) {
            return { error: "No active break found." };
        }
        attendance.breaks[openBreakIndex].end = now;
        await attendance.save();
        
        // Update user status
        await UserStatus.findOneAndUpdate(
            { userId },
            {
                status: 'punched-in',
                lastUpdated: now,
                isScreenSharing: false
            },
            { upsert: true, new: true }
        );
        
        revalidatePath("/dashboard");
        return { success: true };
        
    } catch (error) {
        console.error('Error in resume work action:', error);
        return { error: "Failed to resume work. Please try again." };
    }
}

export async function getAttendanceReportAction(userId: string, startDate: string, endDate: string): Promise<AttendanceReport | null> {
    // TODO: Replace with MongoDB implementation
    return null;
}

export async function getTeamAttendanceReportsAction(startDate: string, endDate: string): Promise<AttendanceReport[]> {
    // TODO: Replace with MongoDB implementation
    return [];
}

export async function getAttendanceStatsAction(): Promise<AttendanceStats | null> {
    // TODO: Replace with MongoDB implementation
    return null;
}

// LEAVE MANAGEMENT ACTIONS - All commented out during MongoDB migration

const LeaveRequestSchema = z.object({
    leaveType: z.enum(['vacation', 'sick', 'personal', 'maternity', 'paternity', 'emergency']),
    startDate: z.date(),
    endDate: z.date(),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export async function createLeaveRequestAction(userId: string, data: z.infer<typeof LeaveRequestSchema>) {
    // TODO: Replace with MongoDB implementation
    return { success: "Leave request submitted successfully." };
}

export async function getLeaveRequestsAction(userId?: string): Promise<LeaveRequest[]> {
    // TODO: Replace with MongoDB implementation
    return [];
}

export async function updateLeaveRequestStatusAction(leaveRequestId: string, status: LeaveStatus, approverId?: string, rejectionReason?: string) {
    // TODO: Replace with MongoDB implementation
    return { success: `Leave request ${status} successfully.` };
}

export async function getLeaveBalanceAction(userId: string): Promise<LeaveBalance | null> {
    // TODO: Replace with MongoDB implementation
    return null;
}

export async function updateLeaveBalanceAction(userId: string, leaveType: LeaveType, days: number) {
    // TODO: Replace with MongoDB implementation
    return { success: "Leave balance updated successfully." };
}

export async function getAllUsersAction(): Promise<any[]> {
    try {
        await connectDB();
        const users = await User.find({});
        
        console.log('getAllUsersAction - Raw users from DB:', users);
        
        const mappedUsers = users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role
        }));
        
        console.log('getAllUsersAction - Mapped users:', mappedUsers);
        
        return mappedUsers;
    } catch (error) {
        console.error('Error fetching all users:', error);
        return [];
    }
}

export async function getAllUserStatusesAction(): Promise<any[]> {
  try {
    await connectDB();
    const statuses = await UserStatus.find({});
    return statuses.map(status => ({
      userId: status.userId,
      userName: status.userName,
      userImage: status.userImage,
      status: status.status,
      lastUpdated: status.lastUpdated,
      isScreenSharing: status.isScreenSharing,
      screenSessionId: status.screenSessionId,
    }));
  } catch (error) {
    console.error('Error fetching user statuses:', error);
    return [];
  }
}

// CHAT ACTIONS - MongoDB Implementation

export async function getConversationsAction(userId: string): Promise<any[]> {
    try {
        await connectDB();
        
        // Find conversations where the user is a participant
        const conversations = await Conversation.find({ 
            participantIds: userId 
        }).sort({ lastMessageTimestamp: -1, updatedAt: -1 });
        
        return conversations.map(conversation => ({
            id: conversation._id.toString(),
            name: conversation.name,
            image: conversation.image,
            isGroup: conversation.isGroup,
            participantIds: conversation.participantIds,
            lastMessageTimestamp: conversation.lastMessageTimestamp,
            lastMessageText: conversation.lastMessageText,
            lastMessageSenderId: conversation.lastMessageSenderId,
            createdBy: conversation.createdBy,
            roles: conversation.roles,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt
        }));
        
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }
}

export async function getMessagesAction(conversationId: string): Promise<any[]> {
    try {
        await connectDB();
        
        // Find messages for this conversation
        const messages = await Message.find({ 
            receiverId: conversationId 
        }).sort({ timestamp: 1 });
        
        return messages.map(message => ({
            id: message._id.toString(),
            text: message.text,
            senderId: message.senderId,
            receiverId: message.receiverId,
            timestamp: message.timestamp,
            isCallNotification: message.isCallNotification,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt
        }));
        
    } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
}

export async function searchUsersAction(query: string, currentUserId: string): Promise<any[]> {
    try {
        await connectDB();
        
        const users = await User.find({
            $and: [
                { _id: { $ne: currentUserId } },
                {
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }).select('name email image role').limit(10);
        
        return users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role
        }));
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
}

// WebRTC Signaling Actions for MongoDB
export async function createSignalingSessionAction(data: { 
    sessionId: string; 
    offer?: { from: string; sdp: any }; 
    answer?: { from: string; sdp: any }; 
}) {
    try {
        await connectDB();
        
        const { sessionId, offer, answer } = data;
        
        // Create or update signaling session
        const session = await SignalingSession.findOneAndUpdate(
            { sessionId },
            { 
                sessionId,
                offer: offer || null,
                answer: answer || null,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        
        return { success: true, sessionId: session.sessionId };
    } catch (error) {
        console.error('Error creating signaling session:', error);
        return { error: 'Failed to create signaling session' };
    }
}

export async function addIceCandidateAction(data: { 
    sessionId: string; 
    candidate: any; 
    peerType: 'peer1' | 'peer2'; 
}) {
    try {
        await connectDB();
        
        const { sessionId, candidate, peerType } = data;
        
        const iceCandidate = new IceCandidate({
            sessionId,
            candidate,
            peerType,
            createdAt: new Date()
        });
        
        await iceCandidate.save();
        
        return { success: true, candidateId: iceCandidate._id.toString() };
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
        return { error: 'Failed to add ICE candidate' };
    }
}

export async function getSignalingSessionAction(sessionId: string) {
    try {
        await connectDB();
        
        const session = await SignalingSession.findOne({ sessionId });
        if (!session) {
            return { error: 'Signaling session not found' };
        }
        
        return { 
            success: true, 
            session: {
                sessionId: session.sessionId,
                offer: session.offer,
                answer: session.answer,
                updatedAt: session.updatedAt
            }
        };
    } catch (error) {
        console.error('Error getting signaling session:', error);
        return { error: 'Failed to get signaling session' };
    }
}

export async function getIceCandidatesAction(sessionId: string, peerType: 'peer1' | 'peer2') {
    try {
        await connectDB();
        
        const candidates = await IceCandidate.find({ 
            sessionId, 
            peerType 
        }).sort({ createdAt: 1 });
        
        return { 
            success: true, 
            candidates: candidates.map(c => ({
                id: c._id.toString(),
                candidate: c.candidate,
                peerType: c.peerType,
                createdAt: c.createdAt
            }))
        };
    } catch (error) {
        console.error('Error getting ICE candidates:', error);
        return { error: 'Failed to get ICE candidates' };
    }
}

export async function cleanupSignalingSessionAction(sessionId: string) {
    try {
        await connectDB();
        
        // Delete signaling session
        await SignalingSession.deleteOne({ sessionId });
        
        // Delete all ICE candidates for this session
        await IceCandidate.deleteMany({ sessionId });
        
        return { success: true };
    } catch (error) {
        console.error('Error cleaning up signaling session:', error);
        return { error: 'Failed to cleanup signaling session' };
    }
}
