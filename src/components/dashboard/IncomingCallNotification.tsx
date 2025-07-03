"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react';
import { updateCallStatusAction, updateActiveParticipantsAction } from '@/app/dashboard/actions';
import type { Call, CallParticipant } from '@/lib/types';

interface IncomingCallNotificationProps {
  call: Call;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function IncomingCallNotification({ call, onAccept, onDecline }: IncomingCallNotificationProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const caller = call.participants.find(p => p.id === call.createdBy.id);
  const isVideoCall = call.type === 'video';

  const handleAccept = async () => {
    if (!currentUser) return;
    
    setIsProcessing(true);
    try {
      // Update call status to answered
      await updateCallStatusAction({ callId: call.id, status: 'answered' });
      
      // Add user to active participants
      await updateActiveParticipantsAction({
        callId: call.id,
        userId: currentUser.id,
        name: currentUser.name,
        type: 'join'
      });
      
      onAccept?.();
      
      // Navigate to call page
      router.push(`/dashboard/call/${call.id}`);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept call. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!currentUser) return;
    
    setIsProcessing(true);
    try {
      // Update call status to declined
      await updateCallStatusAction({ callId: call.id, status: 'declined' });
      
      onDecline?.();
      
      toast({
        title: 'Call Declined',
        description: 'You declined the incoming call.'
      });
      
    } catch (error) {
      console.error('Error declining call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to decline call. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-background border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={caller?.image} alt={caller?.name} />
          <AvatarFallback>{caller?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{caller?.name}</h3>
          <p className="text-sm text-muted-foreground">
            Incoming {isVideoCall ? 'video' : 'audio'} call
          </p>
            </div>
        <div className="flex items-center gap-1">
          {isVideoCall ? (
            <Video className="h-4 w-4 text-primary" />
          ) : (
            <Mic className="h-4 w-4 text-primary" />
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <Phone className="h-4 w-4 mr-2" />
          Accept
          </Button>
        <Button
          onClick={handleDecline}
          disabled={isProcessing}
          variant="destructive"
          className="flex-1"
        >
          <PhoneOff className="h-4 w-4 mr-2" />
          Decline
          </Button>
      </div>
    </div>
  );
}
