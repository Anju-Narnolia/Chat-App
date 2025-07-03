
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import type { User } from "@/lib/types";
import { StartMeetingDialog } from "./start-meeting-dialog";

export function MeetingsView({ users }: { users: User[] }) {
  return (
    <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold font-headline text-foreground">
          Meetings
        </h1>
        <p className="text-muted-foreground">
          Start a new meeting or view your upcoming schedule.
        </p>
      </header>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Start an Instant Meeting</CardTitle>
            <CardDescription>Launch a new meeting and invite participants.</CardDescription>
          </CardHeader>
          <CardContent>
            <StartMeetingDialog users={users}>
              <Button size="lg" className="w-full">Start New Meeting</Button>
            </StartMeetingDialog>
          </CardContent>
        </Card>

        <Card className="flex flex-col items-center justify-center p-6 text-center bg-secondary/50 border-dashed">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle>Scheduled Meetings</CardTitle>
          <CardDescription>This feature is coming soon!</CardDescription>
        </Card>
      </div>

       {/* Placeholder for a list of past meetings/recordings */}
    </div>
  );
}
