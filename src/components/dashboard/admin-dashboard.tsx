import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Users,
  ClipboardList,
  Activity,
} from 'lucide-react';
import { getAllUsersAction } from '@/app/dashboard/actions';
import { UserManagement } from './user-management';
import { TaskManagement } from './task-management';
import { ChatView } from './chat-view';
import { RecordingsView } from './reports-view';
import { MeetingsView } from './meetings-view';
import { AttendanceReports } from './attendance-reports';
import { LeaveManagement } from './leave-management';
import { RealTimeMonitoring } from './real-time-monitoring';
import type { User } from '@/lib/types';

function SummaryCards({ totalUsers, userCount, adminCount }: { totalUsers: number, userCount: number, adminCount: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userCount} users, {adminCount} admin(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">573</div>
            <p className="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Optimal</div>
            <p className="text-xs text-muted-foreground">
              All systems are running smoothly.
            </p>
          </CardContent>
        </Card>
      </div>
  )
}


export async function AdminDashboard({ view }: { view?: string }) {
  let allUsers: User[] = await getAllUsersAction();

  const renderContent = () => {
    switch (view) {
      case 'users':
        return <UserManagement users={allUsers} />;
      case 'tasks':
        return <TaskManagement />;
      case 'chats':
        return <ChatView users={allUsers} />;
      case 'meetings':
        return <MeetingsView users={allUsers.filter(u => u.role !== 'admin')} />;
      case 'recordings':
        return <RecordingsView />;
      case 'attendance':
        return <AttendanceReports />;
      case 'leave':
        return <LeaveManagement />;
      case 'monitoring':
        return <RealTimeMonitoring />;
      default:
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        const userCount = allUsers.length - adminCount;
        return (
          <div className="p-4 md:p-6 space-y-6">
            <header className="mb-6">
              <h1 className="text-3xl font-bold font-headline text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome, Admin! Here's an overview of your team.
              </p>
            </header>
            <SummaryCards totalUsers={allUsers.length} adminCount={adminCount} userCount={userCount} />
          </div>
        )
    }
  }

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
}
