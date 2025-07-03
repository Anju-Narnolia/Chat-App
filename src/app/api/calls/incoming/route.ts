import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Call from '@/lib/models/Call';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Find pending calls where the user is a participant but not the creator
    const pendingCall = await Call.findOne({
      participantIds: userId,
      'createdBy.id': { $ne: userId },
      status: 'pending'
    }).sort({ createdAt: -1 });
    
    if (!pendingCall) {
      return NextResponse.json({ call: null });
    }
    
    return NextResponse.json({
      call: {
        id: pendingCall._id.toString(),
        participantIds: pendingCall.participantIds,
        participants: pendingCall.participants,
        createdBy: pendingCall.createdBy,
        type: pendingCall.type,
        status: pendingCall.status,
        startedAt: pendingCall.startedAt,
        answeredAt: pendingCall.answeredAt,
        endedAt: pendingCall.endedAt,
        duration: pendingCall.duration,
        activeParticipantIds: pendingCall.activeParticipantIds,
        isRecording: pendingCall.isRecording,
        recordingUrl: pendingCall.recordingUrl,
        isScreenSharing: pendingCall.isScreenSharing,
        screenSharingUserId: pendingCall.screenSharingUserId,
        chatId: pendingCall.chatId,
        createdAt: pendingCall.createdAt,
        updatedAt: pendingCall.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Error fetching incoming calls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 