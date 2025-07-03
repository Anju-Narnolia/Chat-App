import { Suspense } from "react";
import { TaskList } from "@/components/dashboard/task-list";
import { Skeleton } from "../ui/skeleton";
import { ChatView } from "./chat-view";
import { RecordingsView } from './reports-view';
import { MeetingsView } from './meetings-view';
import { AttendanceReports } from './attendance-reports';
import { LeaveManagement } from './leave-management';
import type { User } from "@/lib/types";

function TaskListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function UserTaskList({ tasks }: { tasks: any[] }) {
  const statuses = ["All", "In Progress", "Todo", "Done", "Backlog", "Canceled"];
  // Filtering logic can be added here if needed
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex space-x-2 mb-4">
        {statuses.map((status) => (
          <button
            key={status}
            className="px-3 py-1 text-sm rounded-md bg-secondary hover:bg-secondary/80"
          >
            {status}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasks.map((task) => (
            <div key={task.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-sm text-muted-foreground">{task.description}</p>
              <div className="flex justify-between items-center mt-2">
                <span className={`px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              No tasks assigned to you.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Done': return 'bg-green-100 text-green-800';
    case 'In Progress': return 'bg-blue-100 text-blue-800';
    case 'Todo': return 'bg-yellow-100 text-yellow-800';
    case 'Backlog': return 'bg-gray-100 text-gray-800';
    case 'Canceled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'High': return 'bg-red-100 text-red-800';
    case 'Medium': return 'bg-yellow-100 text-yellow-800';
    case 'Low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function TasksView({ tasks }: { tasks: any[] }) {
  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
       <header>
        <h1 className="text-3xl font-bold font-headline text-foreground">My Tasks</h1>
        <p className="text-muted-foreground">Here are the tasks assigned to you.</p>
      </header>
      <div className="flex-1 min-h-0">
        <Suspense fallback={<TaskListSkeleton />}>
          <UserTaskList tasks={tasks} />
        </Suspense>
      </div>
    </div>
  )
}

export function UserDashboard({ view, userId, users, tasks }: { view?: string, userId: string, users: User[], tasks: any[] }) {
  const renderContent = () => {
    switch (view) {
      case 'chats':
        return <ChatView users={users} />;
      case 'meetings':
        const otherUsers = users.filter(u => u.role !== 'admin');
        return <MeetingsView users={otherUsers} />;
      case 'recordings':
        return <RecordingsView />;
      case 'attendance':
        return <AttendanceReports />;
      case 'leave':
        return <LeaveManagement />;
      case 'tasks':
      default:
        return <TasksView tasks={tasks} />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
}
