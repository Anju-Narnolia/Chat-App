'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Monitor, Clock } from 'lucide-react';
import { format } from 'date-fns';
// Firebase imports removed - will be replaced with MongoDB logic
import { useToast } from '@/hooks/use-toast';
import { logScreenViewAction } from '@/app/dashboard/actions';
import type { UserStatus } from '@/lib/types';
import { ScreenViewer } from './screen-viewer';

const statusColors = {
  'punched-in': 'bg-green-500/20 text-green-700 border-green-500/30',
  'on-break': 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  'punched-out': 'bg-gray-500/20 text-gray-700 border-gray-500/30',
  'screen-pending': 'bg-red-500/20 text-red-700 border-red-500/30',
};

export function RealTimeMonitoring() {
  const { toast } = useToast();
  const [users, setUsers] = React.useState<UserStatus[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<UserStatus | null>(null);
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const [activeViewers, setActiveViewers] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {

  }, [toast]);

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.userName.toLowerCase().includes(query) ||
      user.status.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleViewScreen = async (user: UserStatus) => {
    console.log('=== HANDLE VIEW SCREEN ===');
    console.log('User:', user);
    console.log('isScreenSharing:', user.isScreenSharing);
    console.log('screenSessionId:', user.screenSessionId);
    
    if (!user.isScreenSharing) {
      console.log('User is not screen sharing, returning');
      return;
    }

    // Prevent multiple views of the same screen
    if (activeViewers.has(user.userId)) {
      toast({
        variant: 'destructive',
        title: 'Already Viewing',
        description: 'You are already viewing this user\'s screen.'
      });
      return;
    }

    setSelectedUser(user);
    setIsViewerOpen(true);
    setActiveViewers(prev => new Set(prev).add(user.userId));

    // Log the view action
    try {
      
    } catch (error) {
      console.error('Failed to log screen view:', error);
    }
  };

  const handleCloseViewer = () => {
    if (selectedUser) {
      setActiveViewers(prev => {
        const updated = new Set(prev);
        updated.delete(selectedUser.userId);
        return updated;
      });
    }
    setIsViewerOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Real-Time Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor team activity and screen shares in real-time
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live User Status</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users or status..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Screen Share</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.userImage} alt={user.userName} />
                        <AvatarFallback>{user.userName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[user.status]}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isScreenSharing ? (
                      <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewScreen(user)}
                      disabled={!user.isScreenSharing}
                    >
                      <Monitor className="h-4 w-4 mr-1" />
                      View Screen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser && (() => {
        console.log('Rendering ScreenViewer with:', selectedUser);
        return (
          <ScreenViewer
            user={selectedUser}
            isOpen={isViewerOpen}
            onClose={handleCloseViewer}
          />
        );
      })()}
    </div>
  );
}
