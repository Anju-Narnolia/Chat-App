import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Call from '@/lib/models/Call';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { callerId, receiverId, type = 'video' } = body;
    
    if (!callerId || !receiverId) {
      return NextResponse.json({ error: 'Caller ID and receiver ID are required' }, { status: 400 });
    }
    
    // Get user info
    const [caller, receiver] = await Promise.all([
      User.findById(callerId),
      User.findById(receiverId)
    ]);
    
    if (!caller || !receiver) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Create test call
    const call = new Call({
      participantIds: [callerId, receiverId],
      participants: [
        {
          id: caller._id.toString(),
          name: caller.name,
          image: caller.image
        },
        {
          id: receiver._id.toString(),
          name: receiver.name,
          image: receiver.image
        }
      ],
      createdBy: {
        id: caller._id.toString(),
        name: caller.name,
        image: caller.image
      },
      type,
      status: 'pending',
      startedAt: new Date(),
      activeParticipantIds: [callerId]
    });
    
    await call.save();
    
    return NextResponse.json({
      success: true,
      call: {
        id: call._id.toString(),
        participantIds: call.participantIds,
        participants: call.participants,
        createdBy: call.createdBy,
        type: call.type,
        status: call.status,
        startedAt: call.startedAt,
        activeParticipantIds: call.activeParticipantIds
      }
    });
    
  } catch (error) {
    console.error('Error creating test call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 