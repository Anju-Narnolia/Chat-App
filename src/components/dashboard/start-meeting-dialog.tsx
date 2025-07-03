"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../auth/auth-provider';
import type { User } from '@/lib/types';
import { startCallAction } from '@/app/dashboard/actions';
import { LoaderCircle, Video, Mic } from 'lucide-react';

const startMeetingSchema = z.object({
  participantIds: z.array(z.string()).min(0), // Can start a meeting with just yourself
  type: z.enum(['audio', 'video']),
});

interface StartMeetingDialogProps {
  users: User[];
  children: React.ReactNode;
}

export function StartMeetingDialog({ users, children }: StartMeetingDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [meetingType, setMeetingType] = useState<'video' | 'audio'>('video');

  const { handleSubmit } = useForm<z.infer<typeof startMeetingSchema>>({
    resolver: zodResolver(startMeetingSchema),
    defaultValues: {
      participantIds: [],
      type: 'video',
    },
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const onSubmit = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    const allParticipantIds = [...new Set([currentUser.id, ...selectedUsers])];

    const result = await startCallAction({
      participantIds: allParticipantIds,
      type: meetingType,
      createdBy: {
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image,
      },
      // When starting a meeting this way, it doesn't belong to a specific chat
      // so we don't pass a chatId
    });

    setIsLoading(false);

    if (result.success && result.callId) {
      router.push(`/dashboard/call/${result.callId}`);
      setOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to start meeting',
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a New Meeting</DialogTitle>
          <DialogDescription>
            Select participants and choose the meeting type.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Invite Participants</Label>
            <ScrollArea className="h-48 rounded-md border p-2">
              <div className="space-y-1">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary cursor-pointer" onClick={() => handleToggleUser(user.id)}>
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Label htmlFor={`user-${user.id}`} className="font-normal cursor-pointer flex-1">{user.name}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label>Meeting Type</Label>
            <RadioGroup value={meetingType} onValueChange={(value: 'video' | 'audio') => setMeetingType(value)} className="grid grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="video" id="video" className="peer sr-only" />
                <Label htmlFor="video" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  <Video className="mb-3 h-6 w-6" />
                  Video
                </Label>
              </div>
              <div>
                <RadioGroupItem value="audio" id="audio" className="peer sr-only" />
                <Label htmlFor="audio" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  <Mic className="mb-3 h-6 w-6" />
                  Audio
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Start Meeting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
