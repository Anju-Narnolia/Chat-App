
"use client";

import { useState } from 'react';
import type { Conversation, User } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, UserPlus, LogOut, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { addMembersToGroupAction, removeMemberFromGroupAction, leaveGroupAction } from '@/app/dashboard/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { buttonVariants } from '../ui/button';
import { cn } from '@/lib/utils';

interface GroupSettingsDialogProps {
  conversation: Conversation;
  allUsers: User[];
  currentUser: User;
  children: React.ReactNode;
}

export function GroupSettingsDialog({ conversation, allUsers, currentUser, children }: GroupSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  const isCurrentUserAdmin = conversation.roles?.[currentUser.id] === 'admin';
  
  const members = conversation.participantIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
  const usersToAdd = allUsers.filter(u => !conversation.participantIds.includes(u.id));

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    setIsLoading(true);
    const result = await addMembersToGroupAction({
        chatId: conversation.id,
        userIdsToAdd: selectedUsers,
        adminId: currentUser.id
    });
    setIsLoading(false);
    if(result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'Members added' });
        setSelectedUsers([]);
    }
  };

  const handleRemoveMember = async (userIdToRemove: string) => {
    setIsLoading(true);
    const result = await removeMemberFromGroupAction({
        chatId: conversation.id,
        userIdToRemove,
        adminId: currentUser.id
    });
     setIsLoading(false);
    if(result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'Member removed' });
    }
  };

  const handleLeaveGroup = async () => {
    setIsLoading(true);
    const result = await leaveGroupAction({ chatId: conversation.id, userId: currentUser.id });
    setIsLoading(false);
    if(result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'You have left the group.'});
        setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{conversation.name}</DialogTitle>
          <DialogDescription>Manage group members and settings.</DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Members ({members.length})</h3>
            <ScrollArea className="h-60">
                <div className="space-y-2 pr-4">
                    {members.map(member => (
                        <div key={member.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={member.image} />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{member.name}</p>
                                    {conversation.roles?.[member.id] === 'admin' && (
                                        <Badge variant="secondary" size="sm">Admin</Badge>
                                    )}
                                </div>
                            </div>
                            {isCurrentUserAdmin && member.id !== currentUser.id && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8" disabled={isLoading}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to remove this member from the group?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)} className={buttonVariants({variant: "destructive"})}>Remove</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive" className="w-full sm:w-auto" disabled={isLoading}>
                        {isLoading ? <LoaderCircle className="animate-spin" /> : <LogOut className="mr-2 h-4 w-4"/>}
                        Leave Group
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave this group? You will need to be re-invited to join again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeaveGroup} className={cn(buttonVariants({variant: "destructive"}))}>Leave</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {isCurrentUserAdmin && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button className="w-full sm:w-auto" disabled={isLoading}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Members
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        <div className="p-4 border-b">
                            <h4 className="font-medium">Add new members</h4>
                        </div>
                         <ScrollArea className="h-60">
                            <div className="p-2 space-y-1">
                                {usersToAdd.length > 0 ? usersToAdd.map((user) => (
                                    <div key={user.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary cursor-pointer" onClick={() => handleToggleUser(user.id)}>
                                        <Checkbox
                                            id={`add-user-${user.id}`}
                                            checked={selectedUsers.includes(user.id)}
                                            onCheckedChange={() => handleToggleUser(user.id)}
                                        />
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.image} alt={user.name} />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <Label htmlFor={`add-user-${user.id}`} className="font-normal cursor-pointer flex-1">{user.name}</Label>
                                    </div>
                                )) : <p className="p-4 text-sm text-muted-foreground text-center">All users are already in this group.</p>}
                            </div>
                        </ScrollArea>
                         {usersToAdd.length > 0 && (
                            <div className="p-2 border-t">
                                <Button className="w-full" onClick={handleAddMembers} disabled={isLoading || selectedUsers.length === 0}>
                                    {isLoading && <LoaderCircle className="animate-spin mr-2 h-4 w-4" />}
                                    Add ({selectedUsers.length})
                                </Button>
                            </div>
                         )}
                    </PopoverContent>
                </Popover>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
