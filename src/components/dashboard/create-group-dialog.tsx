
"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { createGroupChatAction } from '@/app/dashboard/actions';
import { useAuth } from '../auth/auth-provider';
import { LoaderCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters.'),
  participantIds: z.array(z.string()).min(1, 'You must select at least one member.'),
});

interface CreateGroupDialogProps {
  users: User[];
  children: React.ReactNode;
}

export function CreateGroupDialog({ users, children }: CreateGroupDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof createGroupSchema>>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
        name: '',
        participantIds: []
    }
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const onSubmit = async (data: z.infer<typeof createGroupSchema>) => {
    if (!currentUser) return;
    setIsLoading(true);

    const result = await createGroupChatAction({
      name: data.name,
      participantIds: selectedUsers,
      creatorId: currentUser.id,
    });

    setIsLoading(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error creating group',
        description: result.error,
      });
    } else {
      toast({
        title: 'Group Created',
        description: `The group "${data.name}" has been created.`,
      });
      reset();
      setSelectedUsers([]);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>
            Give your group a name and add members to start collaborating.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input id="name" {...register('name')} disabled={isLoading} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Members</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : 'Select members'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <ScrollArea className="h-60">
                    <div className="p-2 space-y-1">
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary cursor-pointer" onClick={() => handleToggleUser(user.id)}>
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
              </PopoverContent>
            </Popover>
            {/* Hidden input for react-hook-form validation */}
            <input type="hidden" {...register('participantIds', { value: selectedUsers })} />
            {errors.participantIds && <p className="text-sm text-destructive mt-1">{errors.participantIds.message}</p>}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
