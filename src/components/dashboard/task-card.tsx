"use client";

import type { Task, User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AiStatusSuggester } from "./ai-status-suggester";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { EditTaskDialog } from "./edit-task-dialog";

const priorityColors = {
  High: "bg-red-500/20 text-red-700 border-red-500/30",
  Medium: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  Low: "bg-green-500/20 text-green-700 border-green-500/30",
};

const statusColors = {
  'Backlog': 'bg-gray-500/20 text-gray-700 border-gray-500/30',
  'Todo': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  'In Progress': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  'Done': 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
  'Canceled': 'bg-stone-500/20 text-stone-700 border-stone-500/30',
};

export function TaskCard({ task, users }: { task: Task; users: User[] }) {
  const dueDateInWords = formatDistanceToNow(new Date(task.dueDate.toString()), { addSuffix: true });

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
                <CardTitle className="text-lg font-headline mb-1">{task.title}</CardTitle>
                <CardDescription>
                    Due {dueDateInWords}
                </CardDescription>
            </div>
            <div className="flex items-center gap-1">
                <Badge className={cn("whitespace-nowrap shrink-0", priorityColors[task.priority])}>
                    {task.priority}
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Task Actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <EditTaskDialog task={task} users={users}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit Task</span>
                            </DropdownMenuItem>
                        </EditTaskDialog>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
         {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex gap-2">
            <Badge variant="outline">{task.label}</Badge>
            <Badge className={cn(statusColors[task.status])}>{task.status}</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={task.assignee.image} alt={task.assignee.name ?? 'Assignee'} data-ai-hint="person avatar" />
              <AvatarFallback>
                {task.assignee.name?.charAt(0) ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{task.assignee.name ?? 'Unassigned'}</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Unassigned</div>
        )}
        <AiStatusSuggester taskId={task.id} />
      </CardFooter>
    </Card>
  );
}
