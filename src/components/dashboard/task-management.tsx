
import { Suspense } from "react";
import { CreateTaskDialog } from "./create-task-dialog";
import { getUsers } from "@/lib/firestore";
import { Skeleton } from "../ui/skeleton";
import { TaskList } from "./task-list";

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

export async function TaskManagement() {
  const users = await getUsers();

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-3xl font-bold font-headline text-foreground">Task Management</h1>
              <p className="text-muted-foreground">Create, assign, and track all team tasks.</p>
          </div>
          <CreateTaskDialog users={users} />
      </div>
      <div className="flex-1 min-h-0">
        <Suspense fallback={<TaskListSkeleton />}>
            <TaskList users={users} />
        </Suspense>
      </div>
    </div>
  )
}
