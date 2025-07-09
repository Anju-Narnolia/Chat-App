"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { getCallByIdAction, updateCallStatusAction, updateActiveParticipantsAction } from '@/app/dashboard/actions';
import type { Call } from '@/lib/types';

export function useCalls() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Poll for incoming calls
  useEffect(() => {
    if (!currentUser) return;

    const pollForCalls = async () => {
      try {
        // This would typically be replaced with WebSocket or Server-Sent Events
        // For now, we'll use polling as a placeholder
        const response = await fetch(`/api/calls/incoming?userId=${currentUser.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.call && !incomingCall) {
            setIncomingCall(data.call);
            toast({
              title: 'Incoming Call',
              description: `${data.call.createdBy.name} is calling you...`,
            });
          }
        }
      } catch (error) {
        console.error('Error polling for calls:', error);
      }
    };

    const interval = setInterval(pollForCalls, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [currentUser, incomingCall]);

  // Accept incoming call
  const acceptCall = useCallback(async (callId: string) => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      // Update call status
      await updateCallStatusAction({ callId, status: 'answered' });
      
      // Add user to active participants
      await updateActiveParticipantsAction({
        callId,
        userId: currentUser.id,
        name: currentUser.name,
        type: 'join'
      });

      // Get updated call data
      const call = await getCallByIdAction(callId);
      if (call) {
        setActiveCall(call);
        setIncomingCall(null);
      }

      toast({
        title: 'Call Accepted',
        description: 'You joined the call successfully.',
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept call. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Decline incoming call
  const declineCall = useCallback(async (callId: string) => {
    setIsLoading(true);
    try {
      await updateCallStatusAction({ callId, status: 'rejected' });
      setIncomingCall(null);
      
      toast({
        title: 'Call Declined',
        description: 'You declined the incoming call.',
      });
    } catch (error) {
      console.error('Error declining call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to decline call. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // End active call
  const endCall = useCallback(async (callId: string) => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      // Update call status
      await updateCallStatusAction({ callId, status: 'ended' });
      
      // Remove user from active participants
      await updateActiveParticipantsAction({
        callId,
        userId: currentUser.id,
        name: currentUser.name,
        type: 'leave'
      });

      setActiveCall(null);
      
      toast({
        title: 'Call Ended',
        description: 'The call has been ended.',
      });
    } catch (error) {
      console.error('Error ending call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to end call. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Join call (for participants)
  const joinCall = useCallback(async (callId: string) => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const call = await getCallByIdAction(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      // Add user to active participants
      await updateActiveParticipantsAction({
        callId,
        userId: currentUser.id,
        name: currentUser.name,
        type: 'join'
      });

      setActiveCall(call);
      
      toast({
        title: 'Joined Call',
        description: 'You joined the call successfully.',
      });
    } catch (error) {
      console.error('Error joining call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to join call. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Leave call
  const leaveCall = useCallback(async (callId: string) => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      // Remove user from active participants
      await updateActiveParticipantsAction({
        callId,
        userId: currentUser.id,
        name: currentUser.name,
        type: 'leave'
      });

      setActiveCall(null);
      
      toast({
        title: 'Left Call',
        description: 'You left the call.',
      });
    } catch (error) {
      console.error('Error leaving call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to leave call. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  return {
    incomingCall,
    activeCall,
    isLoading,
    acceptCall,
    declineCall,
    endCall,
    joinCall,
    leaveCall,
    setIncomingCall,
    setActiveCall,
  };
} 