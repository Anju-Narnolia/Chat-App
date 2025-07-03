"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-provider";
import { Clock, BarChart2, Coffee, LoaderCircle } from "lucide-react";
import { format } from "date-fns";
import type {
  ClientAttendance,
  AttendanceStatus,
  ClientBreak,
} from "@/lib/types";
import {
  getTodaysAttendanceState,
  punchInAction,
  punchOutAction,
  startBreakAction,
  resumeWorkAction,
  startScreenSharingAction,
  stopScreenSharingAction,
} from "@/app/dashboard/actions";

interface WorkTrackerState {
  status: AttendanceStatus;
  lastSavedTimestamp: number;
  dailyRecord: ClientAttendance | null;
}

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

const formatSeconds = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

export function WorkTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = React.useState<AttendanceStatus | "loading">(
    "loading"
  );
  const [dailyRecord, setDailyRecord] = React.useState<ClientAttendance | null>(
    null
  );
  const [totalWorkSeconds, setTotalWorkSeconds] = React.useState(0);
  const [totalBreakSeconds, setTotalBreakSeconds] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [screenStream, setScreenStream] = React.useState<MediaStream | null>(
    null
  );
  const [peerConnection, setPeerConnection] =
    React.useState<RTCPeerConnection | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  const getLocalStorageKey = React.useCallback(
    () => `workTrackerState_${user?.id}`,
    [user?.id]
  );
  
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Screen sharing functions
  const startScreenShare = async (): Promise<boolean> => {
    try {
      if (screenStream) return true;
      console.log("Starting screen share...");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) throw new Error("No video track available");
      console.log("Screen stream obtained:", stream);
      setScreenStream(stream);
      setIsScreenSharing(true);
      videoTrack.onended = async () => {
        await stopScreenShare();
      };
      videoTrack.onmute = () => {
        toast({
          variant: "destructive",
          title: "Screen Share Paused",
          description:
            "Your screen share has been paused. Please resume to continue working.",
        });
      };
      if (user) {
        console.log("Calling startScreenSharingAction for user:", user.id);
        const result = await startScreenSharingAction(user.id);
        if ("error" in result && result.error) throw new Error(result.error);
        console.log("Screen sharing action successful");

        console.log("Creating RTCPeerConnection...");
        const pc = new RTCPeerConnection({ 
          iceServers: [ 
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        setPeerConnection(pc);
        
        // Add stream
        console.log("Adding stream tracks to peer connection...");
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        
        // Create offer
        console.log("Creating offer...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("Offer created and set as local description");

        pc.onconnectionstatechange = () => {
          console.log("Connection state changed:", pc.connectionState);
          if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed" ||
            pc.connectionState === "closed"
          ) {
            console.log("Connection ended, cleaning up listeners...");
          }
        };
        console.log("Screen sharing setup complete!");
      }
      return true;
    } catch (error) {
      console.error("Screen sharing failed:", error);
      toast({
        variant: "destructive",
        title: "Screen Sharing Failed",
        description: "You must share your screen to start work.",
      });
      return false;
    }
  };

  const stopScreenShare = async () => {
    try {
      // Clean up WebRTC connection
      if (peerConnection) {
        const pc = peerConnection;
        if ((pc as any)._cleanupFunctions) {
        }
        pc.close();
        setPeerConnection(null);
      }
      
      if (screenStream) {
        screenStream.getTracks().forEach((track) => {
          track.stop();
          track.onended = null;
          track.onmute = null;
        });
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      setSessionId(null);
      
      if (user) {
        const result = await stopScreenSharingAction(user.id);
        if (
          "error" in result &&
          result.error &&
          result.error !== "No active screen sharing session found."
        ) {
          console.error("Failed to stop screen sharing session:", result.error);
        }
      }
    } catch (error) {
      console.error("Error stopping screen share:", error);
      // Still update local state even if backend fails
      setIsScreenSharing(false);
      setScreenStream(null);
      setPeerConnection(null);
      setSessionId(null);
    }
  };

  const calculateDurations = React.useCallback(() => {
    if (!dailyRecord || !dailyRecord.punchInTime) {
      setTotalWorkSeconds(0);
      setTotalBreakSeconds(0);
      return;
    }

    const now = Date.now();
    const punchInMs = new Date(dailyRecord.punchInTime).getTime();

    const currentBreaksDuration = dailyRecord.breaks.reduce(
      (acc: number, br: ClientBreak) => {
      const startMs = new Date(br.start).getTime();
        const endMs = br.end
          ? new Date(br.end).getTime()
          : status === "on-break"
          ? now
          : startMs;
      return acc + (endMs - startMs);
      },
      0
    );

    setTotalBreakSeconds(Math.floor(currentBreaksDuration / 1000));
    
    if (status === "punched-in") {
      const currentWorkDuration = now - punchInMs - currentBreaksDuration;
      setTotalWorkSeconds(Math.floor(currentWorkDuration / 1000));
    }
  }, [dailyRecord?.punchInTime, dailyRecord?.breaks?.length, status]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "punched-in" || status === "on-break") {
      timer = setInterval(calculateDurations, 1000);
    }
    return () => clearInterval(timer);
  }, [status, calculateDurations]);

  React.useEffect(() => {
    if (!user) return;

    const fetchInitialState = async () => {
      const savedStateJSON = localStorage.getItem(getLocalStorageKey());
      const res = await getTodaysAttendanceState(user.id);

      let serverStatus = res.status;
      let serverRecord = res.dailyRecord;

      if (savedStateJSON) {
        const savedState: WorkTrackerState = JSON.parse(savedStateJSON);
        const offlineDuration = Date.now() - savedState.lastSavedTimestamp;

        if (
          offlineDuration > FIVE_MINUTES_IN_MS &&
          savedState.status === "punched-in"
        ) {
            await startBreakAction(user.id);
            const updatedRes = await getTodaysAttendanceState(user.id);
            serverStatus = updatedRes.status;
            serverRecord = updatedRes.dailyRecord;
            toast({
                title: "Automatically on Break",
            description:
              "You were offline for over 5 minutes and have been placed on break.",
            });
        }
      }

      setStatus(serverStatus);
      setDailyRecord(serverRecord);

      if (serverRecord?.punchInTime && !serverRecord?.punchOutTime) {
        const punchInTime = new Date(serverRecord.punchInTime);
        const breaksDuration = serverRecord.breaks.reduce(
          (acc: number, br: ClientBreak) => {
            const startMs = new Date(br.start).getTime();
            const endMs = br.end ? new Date(br.end).getTime() : null;
            return endMs ? acc + (endMs - startMs) : acc;
          },
          0
        );
        
        setTotalBreakSeconds(Math.round(breaksDuration / 1000));
        const punchOutMs = serverRecord.punchOutTime
          ? new Date(serverRecord.punchOutTime).getTime()
          : Date.now();
        setTotalWorkSeconds(
          Math.round(
            (punchOutMs - punchInTime.getTime() - breaksDuration) / 1000
          )
        );
      }
    };
    
    fetchInitialState();
  }, [user, toast, getLocalStorageKey]);

  React.useEffect(() => {
    if (!user || status === "loading") return;
    const stateToSave: WorkTrackerState = {
      status,
      lastSavedTimestamp: Date.now(),
      dailyRecord,
    };
    localStorage.setItem(getLocalStorageKey(), JSON.stringify(stateToSave));
  }, [status, dailyRecord, user, getLocalStorageKey]);

  // Cleanup WebRTC connections on unmount
  React.useEffect(() => {
    return () => {
      if (peerConnection) {
        const pc = peerConnection;
        if ((pc as any)._cleanupFunctions) {
        }
        pc.close();
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [peerConnection, screenStream]);

  const handleAction = async (
    action: () => Promise<{ error?: string } | { success?: boolean }>,
    successMessage: string, 
    finalStatus: AttendanceStatus,
    requiresScreenShare: boolean = false
  ) => {
    if (!user) return;
    setIsSubmitting(true);

    if (requiresScreenShare && !isScreenSharing) {
      const screenStarted = await startScreenShare();
      if (!screenStarted) {
        setIsSubmitting(false);
        return;
      }
    }

    const result = await action();
    setIsSubmitting(false);

    if ("error" in result && result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
      if (requiresScreenShare) {
        await stopScreenShare();
      }
    } else {
      toast({ title: successMessage });
      const res = await getTodaysAttendanceState(user.id);
      setStatus(res.status);
      setDailyRecord(res.dailyRecord);
    }
  };
  
  const handlePunchIn = () =>
    handleAction(
    () => punchInAction(user!.id), 
      "Punched In",
      "punched-in",
      false // Temporarily disable screen share requirement
  );

  const handlePunchOut = async () => {
    await handleAction(
      () => punchOutAction(user!.id), 
      "Punched Out",
      "punched-out"
    );
    await stopScreenShare();
  };

  const handleTakeBreak = async () => {
    await handleAction(
      () => startBreakAction(user!.id), 
      "On Break",
      "on-break"
    );
    await stopScreenShare();
  };

  const handleResume = () =>
    handleAction(
    () => resumeWorkAction(user!.id), 
      "Resumed Work",
      "punched-in",
    true // Requires screen share
  );

  if (!user || status === "loading") {
    return (
        <div className="bg-background border-b px-4 py-2 flex items-center justify-center">
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
    );
  }

  const punchInTime = dailyRecord?.punchInTime
    ? new Date(dailyRecord.punchInTime)
    : null;
  const punchOutTime = dailyRecord?.punchOutTime
    ? new Date(dailyRecord.punchOutTime)
    : null;

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
           date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const hasPunchedInAndOutToday =
    punchInTime &&
    punchOutTime &&
    isToday(punchInTime) &&
    isToday(punchOutTime);

  return (
    <div className="bg-background border-b px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-bold text-base">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.34315 17.6569C2.81233 14.126 2.81233 8.49603 6.34315 4.96521C9.87397 1.43439 15.504 1.43439 19.0348 4.96521"
                stroke="#4169E1"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M17.6569 6.34314C21.1877 9.87396 21.1877 15.504 17.6569 19.0348C14.126 22.5656 8.49604 22.5656 4.96522 19.0348"
                stroke="#8F00FF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>WorkTrack</span>
          </div>
          <span className="hidden md:flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {format(currentTime, "p")}
          </span>
          {status !== "punched-out" && punchInTime && (
            <>
              <span className="hidden md:flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Started at{" "}
                {format(punchInTime, "p")}
              </span>
              <span className="hidden lg:flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4" />{" "}
                {formatSeconds(totalWorkSeconds)} Today
              </span>
              <span className="hidden lg:flex items-center gap-1.5">
                <Coffee className="h-4 w-4" />{" "}
                {formatSeconds(totalBreakSeconds)} Break
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
            {isSubmitting && <LoaderCircle className="h-5 w-5 animate-spin" />}
          {!isSubmitting &&
            status === "punched-out" &&
            !hasPunchedInAndOutToday && (
              <Button
                onClick={handlePunchIn}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold"
              >
                Punch In
              </Button>
            )}
          {!isSubmitting &&
            status === "punched-out" &&
            hasPunchedInAndOutToday && (
              <Button disabled className="bg-gray-400 text-white font-semibold">
                Punch In
              </Button>
            )}
          {!isSubmitting && status === "punched-in" && (
            <>
              <Button
                onClick={handleTakeBreak}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                Take Break
              </Button>
              <Button
                onClick={handlePunchOut}
                variant="destructive"
                className="font-semibold"
              >
                Punch Out
              </Button>
                </>
            )}
          {!isSubmitting && status === "on-break" && (
            <Button
              onClick={handleResume}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
            >
              Resume
            </Button>
            )}
        </div>
      </div>
    </div>
  );
}
