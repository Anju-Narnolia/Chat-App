
"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getRecordingsAction } from "@/app/dashboard/actions";
import type { Recording } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, Video } from "lucide-react";
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";


function RecordingCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </CardContent>
        </Card>
    )
}


export function RecordingsView() {
    const { user } = useAuth();
    const [recordings, setRecordings] = React.useState<Recording[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (user) {
            setIsLoading(true);
            getRecordingsAction(user.id)
                .then(data => {
                    setRecordings(data);
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    if (isLoading) {
        return (
             <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
                 <header className="mb-6">
                    <h1 className="text-3xl font-bold font-headline text-foreground">
                        Call Recordings
                    </h1>
                    <p className="text-muted-foreground">
                        Review recordings of your past calls.
                    </p>
                </header>
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <RecordingCardSkeleton />
                    <RecordingCardSkeleton />
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
            <header className="mb-6">
                <h1 className="text-3xl font-bold font-headline text-foreground">
                    Call Recordings
                </h1>
                <p className="text-muted-foreground">
                    Review recordings of your past calls.
                </p>
            </header>
            
            {recordings.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                     <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                     <CardTitle>No Recordings Found</CardTitle>
                     <CardDescription>You haven't generated any call recordings yet.</CardDescription>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                    {recordings.map(rec => (
                        <Card key={rec.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(new Date(rec.createdAt.toString()), 'PPP p')}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                     {rec.participants.map(p => (
                                        <Badge key={p.id} variant="secondary" className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5 -ml-1">
                                                <AvatarImage src="" alt={p.name} />
                                                <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            {p.name}
                                        </Badge>
                                     ))}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="space-y-2">
                                     <h3 className="font-semibold flex items-center gap-2">
                                        <Video className="h-5 w-5 text-primary" />
                                        Call Recording
                                    </h3>
                                    <video controls className="w-full rounded-lg">
                                        <source src={rec.recordingUrl} type="video/webm" />
                                        Your browser does not support the video element.
                                    </video>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
