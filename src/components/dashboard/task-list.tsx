
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TaskCard } from "./task-card";
import { getTasks } from "@/lib/firestore";
import type { User } from "@/lib/types";

export async function TaskList({ users }: { users: User[] }) {
  const tasks = await getTasks();
  const statuses = ["All", "In Progress", "Todo", "Done", "Backlog", "Canceled"];

  const filteredTasks = (status: string) => {
    if (status === "All") return tasks;
    return tasks.filter((task) => task.status === status);
  };

  return (
    <Tabs defaultValue="All" className="w-full h-full flex flex-col">
      <TabsList>
        {statuses.map((status) => (
          <TabsTrigger key={status} value={status}>
            {status}
          </TabsTrigger>
        ))}
      </TabsList>
      {statuses.map((status) => (
        <TabsContent key={status} value={status} className="flex-1 overflow-y-auto pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTasks(status).map((task) => (
              <TaskCard key={task.id} task={task} users={users} />
            ))}
            {filteredTasks(status).length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                    No tasks in this category.
                </div>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
