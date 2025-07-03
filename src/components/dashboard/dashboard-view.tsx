"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useCalls } from "@/hooks/use-calls";
import { IncomingCallNotification } from "./IncomingCallNotification";

interface DashboardViewProps {
  adminDashboard: React.ReactNode;
  userDashboard: React.ReactNode;
}

export function DashboardView({ adminDashboard, userDashboard }: DashboardViewProps) {
  const { user } = useAuth();
  const { incomingCall, acceptCall, declineCall } = useCalls();
  
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex-1 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {isAdmin ? adminDashboard : userDashboard}
      </main>

      {/* Call Notifications */}
      {incomingCall && (
        <IncomingCallNotification
          call={incomingCall}
          onAccept={() => acceptCall(incomingCall.id)}
          onDecline={() => declineCall(incomingCall.id)}
        />
      )}
    </div>
  );
}
