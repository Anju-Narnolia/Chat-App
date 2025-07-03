import { getCallByIdAction, getAllUsersAction } from "@/app/dashboard/actions";
import { CallView } from "@/components/dashboard/call-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function CallPage({ params }: { params: { id: string }}) {
    const callId = params.id;
    const [call, allUsers] = await Promise.all([
        getCallByIdAction(callId),
        getAllUsersAction()
    ]);

    if (!call) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-background">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/> Call Not Found</CardTitle>
                        <CardDescription>This call link is invalid or has expired.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>The call you are trying to join could not be found. Please try starting a new call.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <CallView initialCall={call} allUsers={allUsers} />;
}
