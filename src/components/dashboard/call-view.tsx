
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Call, CallParticipant, User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, LoaderCircle, Disc, Users, Clock, X, UserPlus, ScreenShare, ScreenShareOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../auth/auth-provider';
import { updateCallStatusAction, updateActiveParticipantsAction, removeParticipantAction, addParticipantAction, getCloudinarySignatureAction, saveRecordingAction, updateScreenShareStatusAction, updateRecordingStatusAction } from '@/app/dashboard/actions';
// Firebase imports removed - will be replaced with MongoDB logic
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

function VideoTile({ stream, participant, isMuted, isLocal, isSpeaking }: { stream: MediaStream | null, participant: CallParticipant, isMuted: boolean, isLocal: boolean, isSpeaking: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={cn("relative bg-black rounded-lg flex items-center justify-center overflow-hidden aspect-video transition-all duration-300", isSpeaking && "ring-4 ring-green-500 shadow-2xl shadow-green-500/50")}>
            <video ref={videoRef} autoPlay playsInline muted={isMuted} className={cn("h-full w-full object-cover", isLocal && "transform -scale-x-100")} data-participant-id={participant.id} data-is-local={isLocal} />
             {(!stream || stream.getVideoTracks().length === 0 || !stream.getVideoTracks().some(t => t.enabled)) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={participant.image} alt={participant.name} data-ai-hint="person avatar" />
                        <AvatarFallback className="text-4xl bg-gray-700 text-white">
                            {participant.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 p-2 rounded-md text-sm">
                <p className="font-semibold">{participant.name}{isLocal ? " (You)" : ""}</p>
            </div>
        </div>
    );
}

function CallTimer({ call }: { call: Call }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (call.status === 'ended' && call.duration) {
      setDuration(call.duration);
      return;
    }
    
    if (call.status !== 'answered' || !call.answeredAt) {
      setDuration(0);
      return;
    }

    const answeredAt = (call.answeredAt as any).toDate ? (call.answeredAt as any).toDate() : new Date(call.answeredAt.toString());

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.round((now.getTime() - answeredAt.getTime()) / 1000);
      setDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.status, call.answeredAt, call.duration]);

  return (
    <div className="flex items-center gap-2 text-sm bg-black/30 px-3 py-1.5 rounded-lg">
      <Clock className="h-4 w-4" />
      <span>{formatDuration(duration)}</span>
    </div>
  );
}

function AddParticipantDialog({ call, allUsers, onAdd, isAddingId }: { call: Call, allUsers: User[], onAdd: (userId: string) => void, isAddingId: string | null }) {
    const availableUsers = allUsers.filter(u => !call.participantIds.includes(u.id));

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <UserPlus className="h-4 w-4" />
                    <span className="sr-only">Add Participant</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle>Add Participant</DialogTitle>
                    <DialogDescription>Select a user to invite to this call.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-64 my-4">
                    <div className="space-y-2 pr-4">
                        {availableUsers.length > 0 ? availableUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-800">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={user.image} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{user.name}</span>
                                </div>
                                <Button size="sm" onClick={() => onAdd(user.id)} disabled={isAddingId === user.id}>
                                    {isAddingId === user.id ? <LoaderCircle className="animate-spin h-4 w-4" /> : 'Invite'}
                                </Button>
                            </div>
                        )) : (
                            <div className="text-center text-muted-foreground py-8">No other users to add.</div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function ParticipantsPanel({ call, localUser, onRemove, removingId, allUsers, onAdd, isAddingId }: { call: Call, localUser: User | null, onRemove: (participantId: string) => void, removingId: string | null, allUsers: User[], onAdd: (userId: string) => void, isAddingId: string | null }) {
  const isCreator = localUser?.id === call.createdBy.id;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Users /> Participants ({call.activeParticipantIds.length}/{call.participants.length})</h3>
            {isCreator && <AddParticipantDialog call={call} allUsers={allUsers} onAdd={onAdd} isAddingId={isAddingId} />}
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
            {call.participants.map(p => {
                 const isHost = p.id === call.createdBy.id;
                 return (
                    <div key={p.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={p.image} alt={p.name} />
                                <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{p.name}{p.id === localUser?.id ? " (You)" : ""}</span>
                                {isHost && <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Host</Badge>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isCreator && p.id !== localUser?.id && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                                        disabled={!!removingId}
                                    >
                                        {removingId === p.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                        <span className="sr-only">Remove participant</span>
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                            This will remove {p.name} from the call. They will not be able to rejoin unless invited again.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onRemove(p.id)} className={buttonVariants({ variant: 'destructive' })}>
                                            Remove
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {call.activeParticipantIds.includes(p.id) ? (
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" title="Online"></div>
                            ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-gray-500" title="Offline"></div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );
}


export function CallView({ initialCall, allUsers }: { initialCall: Call, allUsers: User[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user: localUser } = useAuth();
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerConnectionListenersRef = useRef<Map<string, (()=>void)[]>>(new Map());
  
  const [call, setCall] = useState<Call>(initialCall);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localStreamRevision, setLocalStreamRevision] = useState(0);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(initialCall.type === 'video');
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isRemovingParticipant, setIsRemovingParticipant] = useState<string | null>(null);
  const [isAddingParticipant, setIsAddingParticipant] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const audioAnalysersRef = useRef<Map<string, { analyser: AnalyserNode, dataArray: Uint8Array, source: MediaStreamAudioSourceNode }>>(new Map());


  const endCall = useCallback(async (notify = true) => {
    if (isEndingCall) return;
    setIsEndingCall(true);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
    }

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    peerConnectionListenersRef.current.forEach(unsubs => unsubs.forEach(u => u()));
    peerConnectionListenersRef.current.clear();
    
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    
    const callDocRef = doc(db, 'calls', call.id);

    try {
        const signalingSnapshot = await getDocs(collection(callDocRef, 'signaling'));
        if (!signalingSnapshot.empty) {
            const batch = writeBatch(db);
            signalingSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
    } catch (error) {
        console.error("Error cleaning up signaling documents:", error);
    }
    
    if (notify && call.status !== 'ended') {
        await updateCallStatusAction({ callId: call.id, status: 'ended' });
    }
    
    router.push('/dashboard?view=chats');
  }, [call.id, call.status, router, isEndingCall, localStream]);

  const stopRecording = useCallback(async () => {
    if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setIsProcessingRecording(true);
    await updateRecordingStatusAction({ callId: call.id, isRecording: false });
  }, [call.id]);

  const startRecording = useCallback(() => {
    if (!localStream) {
        toast({ variant: 'destructive', title: 'Cannot record', description: 'Local stream is not available.' });
        return;
    }
    if (!canvasRef.current) {
        toast({ variant: 'destructive', title: 'Cannot record', description: 'Canvas element not found.' });
        return;
    }

    const canvas = canvasRef.current;
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const destination = audioContextRef.current.createMediaStreamDestination();

    if (localStream.getAudioTracks().length > 0) {
        const localSource = audioContextRef.current.createMediaStreamSource(localStream);
        localSource.connect(destination);
    }
    
    remoteStreams.forEach(stream => {
        if (stream.getAudioTracks().length > 0) {
            const remoteSource = audioContextRef.current!.createMediaStreamSource(stream);
            remoteSource.connect(destination);
        }
    });

    const drawVideosToCanvas = () => {
        if (!canvasRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            return;
        }

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const videoElements = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-participant-id]'));
        const visibleVideos = videoElements.filter(v => v.srcObject && (v.srcObject as MediaStream).active && v.videoHeight > 0);

        const totalVideos = visibleVideos.length;
        if (totalVideos > 0) {
            const cols = Math.ceil(Math.sqrt(totalVideos));
            const rows = Math.ceil(totalVideos / cols);
            const tileWidth = canvas.width / cols;
            const tileHeight = canvas.height / rows;

            visibleVideos.forEach((video, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const x = col * tileWidth;
                const y = row * tileHeight;
                try {
                    const isLocal = video.dataset.isLocal === 'true';
                    if (isLocal) {
                        ctx.save();
                        ctx.translate(x + tileWidth, y);
                        ctx.scale(-1, 1);
                        ctx.drawImage(video, 0, 0, tileWidth, tileHeight);
                        ctx.restore();
                    } else {
                        ctx.drawImage(video, x, y, tileWidth, tileHeight);
                    }
                } catch (e) {
                    console.warn("Could not draw video to canvas", e);
                }
            });
        }
        animationFrameIdRef.current = requestAnimationFrame(drawVideosToCanvas);
    };

    const canvasStream = canvas.captureStream(30);
    combinedStreamRef.current = new MediaStream([...canvasStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);

    mediaRecorderRef.current = new MediaRecorder(combinedStreamRef.current, { mimeType: 'video/webm' });
    
    recordedChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = event => {
        if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
        }
    };

    mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
        if (!cloudName || !apiKey) {
            toast({ variant: "destructive", title: "Recording Upload Failed", description: "Cloudinary is not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_API_KEY in your environment variables.", duration: 9000 });
            setIsProcessingRecording(false);
            return;
        }

        const { signature, timestamp, error: sigError } = await getCloudinarySignatureAction();
        if (sigError) {
            toast({ variant: 'destructive', title: 'Recording failed', description: sigError });
            setIsProcessingRecording(false);
            return;
        }
        
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('folder', 'tasktalk-recordings');
        formData.append('timestamp', String(timestamp));
        formData.append('api_key', apiKey);
        formData.append('signature', signature);
        
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            
            if (data.secure_url) {
                const saveResult = await saveRecordingAction({
                    callId: call.id,
                    recordingUrl: data.secure_url,
                    participants: call.participants.map(p => ({id: p.id, name: p.name})),
                });
                if (saveResult.error) {
                    toast({ variant: 'destructive', title: 'Failed to save recording', description: saveResult.error });
                } else {
                    toast({ title: 'Recording saved successfully.' });
                }
            } else {
                throw new Error(data.error?.message || 'Unknown upload error');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
        } finally {
            setIsProcessingRecording(false);
        }
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    animationFrameIdRef.current = requestAnimationFrame(drawVideosToCanvas);
  }, [localStream, remoteStreams, call.id, call.participants, toast]);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await updateRecordingStatusAction({ callId: call.id, isRecording: true });
      startRecording();
    }
  }, [isRecording, stopRecording, startRecording, call.id]);
  
  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack | null) => {
    if (!localStream) return;
    
    for (const pc of peerConnectionsRef.current.values()) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
            await sender.replaceTrack(newTrack);
        } else if (newTrack) {
            pc.addTrack(newTrack, localStream);
        }
    }

    const oldTrack = localStream.getVideoTracks()[0];
    if (oldTrack) {
        oldTrack.stop();
        localStream.removeTrack(oldTrack);
    }
    if (newTrack) {
        localStream.addTrack(newTrack);
    }
    
    setLocalStreamRevision(r => r + 1);
  }, [localStream]);

  const stopScreenSharing = useCallback(async () => {
    if (!localStream || !localUser) return;

    const screenTrack = localStream.getVideoTracks()[0];
    if (screenTrack) {
      screenTrack.stop();
    }
    
    if (originalVideoTrackRef.current) {
        await replaceVideoTrack(originalVideoTrackRef.current);
        originalVideoTrackRef.current = null;
        setIsCameraOn(true);
    } else {
        await replaceVideoTrack(null);
        setIsCameraOn(false);
    }

    await updateScreenShareStatusAction({ callId: call.id, userId: null });
    setIsScreenSharing(false);
  }, [localStream, replaceVideoTrack, call.id, localUser]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
        await stopScreenSharing();
    } else {
        if (!localUser) return;
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
            });
            const screenTrack = screenStream.getVideoTracks()[0];

            const currentVideoTrack = localStream?.getVideoTracks()[0];
            if (currentVideoTrack && isCameraOn) {
                originalVideoTrackRef.current = currentVideoTrack;
            } else {
                originalVideoTrackRef.current = null;
            }

            await replaceVideoTrack(screenTrack);
            await updateScreenShareStatusAction({ callId: call.id, userId: localUser.id });
            setIsScreenSharing(true);
            setIsCameraOn(true);

            screenTrack.onended = () => {
                stopScreenSharing();
            };
        } catch (err) {
            console.error("Screen Share Error:", err);
            toast({
                variant: 'destructive',
                title: 'Screen Share Failed',
                description: 'Could not get permission to share your screen.',
            });
        }
    }
  }, [isScreenSharing, stopScreenSharing, localStream, isCameraOn, replaceVideoTrack, toast, call.id, localUser]);

  const prevIsRecordingRef = useRef(call.isRecording);
  useEffect(() => {
      const wasRecording = prevIsRecordingRef.current;
      const isNowRecording = call.isRecording;
  
      if (!wasRecording && isNowRecording) {
          toast({
              title: "Recording Started",
              description: "This call is now being recorded.",
          });
      }
  
      prevIsRecordingRef.current = isNowRecording;
  }, [call.isRecording, toast]);

  useEffect(() => {
    const callDocRef = doc(db, 'calls', initialCall.id);
    const unsubscribe = onSnapshot(callDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
         const currentCall = { 
             id: snapshot.id,
             ...data,
             createdAt: (data.createdAt as any)?.toDate(),
             answeredAt: (data.answeredAt as any)?.toDate(),
         } as Call;

        if (localUser && !currentCall.participantIds.includes(localUser.id)) {
            toast({
                variant: 'destructive',
                title: 'Removed from call',
                description: 'You have been removed from the call by the host.',
            });
            endCall(false);
            return;
        }
        
        setCall(currentCall);

        if (currentCall.status === 'ended' || currentCall.status === 'rejected' || currentCall.status === 'missed') {
          endCall(false);
        }
      } else { 
        endCall(false);
      }
    });
    return () => unsubscribe();
  }, [initialCall.id, endCall, localUser, toast]);
  
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: call.type === 'video',
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });

        if (call.type === 'audio') {
          stream.getVideoTracks().forEach((track) => (track.enabled = false));
          setIsCameraOn(false);
        }
        setLocalStream(stream);
        if(call.status === 'ringing') {
            await updateCallStatusAction({ callId: call.id, status: 'answered'});
        }
      } catch (error) {
        console.error("Error accessing media devices.", error);
        toast({
          variant: 'destructive',
          title: 'Media Permissions Error',
          description: 'Could not access camera or microphone. Please check your browser permissions and try again.',
        });
        endCall();
      }
    };
    
    if (localUser && call.status !== 'ended') {
      getMedia();
    }
    
    return () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id, localUser?.id]);


    useEffect(() => {
        if (!localUser) return;
        const joinAction = async () => {
            await updateActiveParticipantsAction({ callId: call.id, userId: localUser.id, name: localUser.name, type: 'join' });
        }
        joinAction();
        return () => {
            if(localUser) {
                updateActiveParticipantsAction({ callId: call.id, userId: localUser.id, name: localUser.name, type: 'leave' });
            }
        };
    }, [call.id, localUser]);

  useEffect(() => {
    if (!localStream || !localUser) return;

    const servers = {
      iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }],
      iceCandidatePoolSize: 10,
    };
    const callDocRef = doc(db, 'calls', call.id);

    const otherUsersInCall = call.participants.filter(p => p.id !== localUser.id);
    const otherUserIdsInCall = new Set(otherUsersInCall.map(p => p.id));
    const existingPeerIds = new Set(peerConnectionsRef.current.keys());

    const peersToRemove = [...existingPeerIds].filter(id => !otherUserIdsInCall.has(id));
    peersToRemove.forEach(peerId => {
        peerConnectionListenersRef.current.get(peerId)?.forEach(unsub => unsub());
        peerConnectionListenersRef.current.delete(peerId);
        peerConnectionsRef.current.get(peerId)?.close();
        peerConnectionsRef.current.delete(peerId);
        setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(peerId);
            return newStreams;
        });
    });

    otherUsersInCall.forEach(peer => {
        if (peerConnectionsRef.current.has(peer.id)) return;
        
        const pc = new RTCPeerConnection(servers);
        peerConnectionsRef.current.set(peer.id, pc);
        const peerUnsubscribers: (() => void)[] = [];
        
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
        
        pc.ontrack = (event) => {
            setRemoteStreams(prev => new Map(prev).set(peer.id, event.streams[0]));
        };

        const signalingDocId = [localUser.id, peer.id].sort().join('-');
        const signalingDocRef = doc(callDocRef, 'signaling', signalingDocId);
        const candidateBuffer: RTCIceCandidateInit[] = [];

        pc.onicecandidate = async event => {
            if (event.candidate) {
                const candidatesCollectionRef = collection(signalingDocRef, localUser.id < peer.id ? 'peer1Candidates' : 'peer2Candidates');
                await addDoc(candidatesCollectionRef, event.candidate.toJSON());
            }
        };

        const remoteCandidatesCollectionRef = collection(signalingDocRef, localUser.id < peer.id ? 'peer2Candidates' : 'peer1Candidates');
        const unsubscribeCandidates = onSnapshot(remoteCandidatesCollectionRef, snapshot => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                     if (pc.remoteDescription) {
                        await pc.addIceCandidate(candidate);
                    } else {
                        candidateBuffer.push(candidate);
                    }
                }
            });
        });
        peerUnsubscribers.push(unsubscribeCandidates);

        const unsubscribeSignaling = onSnapshot(signalingDocRef, async (snapshot) => {
            const data = snapshot.data();
            if(!data) return;

            const processBufferedCandidates = async () => {
                 while (candidateBuffer.length > 0) {
                    const candidate = candidateBuffer.shift();
                    if(candidate) await pc.addIceCandidate(candidate);
                 }
            }

            if(data.offer && data.offer.from !== localUser.id && !pc.currentRemoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer.sdp));
                await processBufferedCandidates();
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await updateDoc(signalingDocRef, { answer: { from: localUser.id, sdp: { type: answer.type, sdp: answer.sdp } } });
            }

            if(data.answer && data.answer.from !== localUser.id && pc.signalingState !== 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer.sdp));
                await processBufferedCandidates();
            }
        });
        peerUnsubscribers.push(unsubscribeSignaling);

        if (localUser.id < peer.id) {
            getDoc(signalingDocRef).then(async docSnapshot => {
                if (!docSnapshot.exists() || !docSnapshot.data()?.offer) {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await setDoc(signalingDocRef, { offer: { from: localUser.id, sdp: { type: offer.type, sdp: offer.sdp } } }, { merge: true });
                }
            });
        }
        peerConnectionListenersRef.current.set(peer.id, peerUnsubscribers);
    });

  }, [localStream, localUser, call.id, call.participants, toast]);
  

    useEffect(() => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const remoteStreamEntries = Array.from(remoteStreams.entries());
    
        remoteStreamEntries.forEach(([peerId, stream]) => {
            if (!audioAnalysersRef.current.has(peerId) && stream.getAudioTracks().length > 0) {
                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                audioAnalysersRef.current.set(peerId, { analyser, dataArray, source });
            }
        });
    
        const currentStreamIds = new Set(remoteStreams.keys());
        audioAnalysersRef.current.forEach((value, key) => {
            if (!currentStreamIds.has(key)) {
                value.source.disconnect();
                audioAnalysersRef.current.delete(key);
            }
        });
    
        const detect = () => {
            let maxVolume = -1;
            let loudestPeer: string | null = null;
            audioAnalysersRef.current.forEach(({ analyser, dataArray }, peerId) => {
                analyser.getByteFrequencyData(dataArray);
                const sum = dataArray.reduce((a, b) => a + b, 0);
                const avg = sum / dataArray.length;
                if (avg > maxVolume && avg > 15) { // Threshold to ignore background noise
                    maxVolume = avg;
                    loudestPeer = peerId;
                }
            });
    
            setActiveSpeakerId(loudestPeer);
            animationFrameIdRef.current = requestAnimationFrame(detect);
        };
    
        if (remoteStreams.size > 0 && !animationFrameIdRef.current) {
            animationFrameIdRef.current = requestAnimationFrame(detect);
        } else if (remoteStreams.size === 0 && animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
            setActiveSpeakerId(null);
        }
    
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            audioAnalysersRef.current.forEach(({ source }) => source.disconnect());
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
        };
    }, [remoteStreams]);

  const toggleMic = useCallback(() => {
    if (!localStream) return;
    const newMicState = !isMicOn;
    localStream.getAudioTracks().forEach((track) => track.enabled = newMicState);
    setIsMicOn(newMicState);
  }, [isMicOn, localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream || call.type === 'audio' || isScreenSharing) return;
    const newCameraState = !isCameraOn;
    localStream.getVideoTracks().forEach((track) => track.enabled = newCameraState);
    setIsCameraOn(newCameraState);
  }, [isCameraOn, localStream, call.type, isScreenSharing]);

    const handleRemoveParticipant = async (participantId: string) => {
    if (!localUser) return;
    setIsRemovingParticipant(participantId);
    const result = await removeParticipantAction({
        callId: call.id,
        participantIdToRemove: participantId,
        requesterId: localUser.id
    });
    setIsRemovingParticipant(null);

    if (result.error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error
        });
    }
  };

  const handleAddParticipant = async (userId: string) => {
    if (!localUser) return;
    setIsAddingParticipant(userId);
    const result = await addParticipantAction({
        callId: call.id,
        participantIdToAdd: userId,
        requesterId: localUser.id
    });
    setIsAddingParticipant(null);
    if (result.error) {
        toast({ variant: 'destructive', title: 'Error adding user', description: result.error });
    } else {
        toast({ description: `${allUsers.find(u => u.id === userId)?.name || 'User'} has been invited.` });
    }
  };
  
  const localParticipant = localUser ? call.participants.find(p => p.id === localUser.id) : null;
  const otherParticipants = useMemo(() => {
    if (!localUser) return [];
    return call.participants.filter(p => p.id !== localUser.id);
  }, [localUser, call.participants]);
  
  const isSomeoneElseSharing = call.screenSharerId && call.screenSharerId !== localUser?.id;
  
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white">
        <canvas ref={canvasRef} className="hidden"></canvas>
        <div className="flex-1 flex flex-col">
            <header className="flex items-center justify-between p-4 bg-gray-800/50">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg">{call.isGroupCall ? 'Group Call' : 'Call'}</h2>
                    <Badge variant="secondary" className="capitalize">{call.type}</Badge>
                </div>
                <CallTimer call={call} />
            </header>
            
            <main className="flex-1 p-2 md:p-4 grid gap-2 md:gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`}}>
                 {localParticipant && (
                     <VideoTile key={`${localParticipant.id}-${localStreamRevision}`} stream={localStream} participant={localParticipant} isMuted={true} isLocal={true} isSpeaking={false} />
                 )}
                 {otherParticipants.map(p => (
                    <div key={p.id} className="relative">
                        <VideoTile stream={remoteStreams.get(p.id) || null} participant={p} isMuted={false} isLocal={false} isSpeaking={activeSpeakerId === p.id} />
                        {call.status === 'ringing' && !remoteStreams.has(p.id) && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                <div className="text-center text-white">
                                    <LoaderCircle className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    <p>Ringing...</p>
                                </div>
                            </div>
                        )}
                    </div>
                 ))}
            </main>

            <footer className="flex justify-center items-center p-4 bg-gray-800/50 border-t border-gray-700">
                <div className="flex items-center gap-4">
                <Button onClick={toggleMic} variant="secondary" size="lg" className={cn("rounded-full h-14 w-14 p-4", !isMicOn && "bg-red-600 hover:bg-red-500" )} disabled={!localStream || isEndingCall } >
                    {isMicOn ? <Mic /> : <MicOff />}
                </Button>
                <Button onClick={toggleCamera} variant="secondary" size="lg" className={cn( "rounded-full h-14 w-14 p-4", !isCameraOn && "bg-red-600 hover:bg-red-500" )} disabled={!localStream || call.type === 'audio' || isEndingCall || isScreenSharing} >
                    {isCameraOn ? <Video /> : <VideoOff />}
                </Button>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={isSomeoneElseSharing ? 0 : -1}>
                                <Button onClick={toggleScreenShare} variant="secondary" size="lg" className={cn("rounded-full h-14 w-14 p-4", isScreenSharing && "bg-blue-600 hover:bg-blue-500")} disabled={!localStream || isEndingCall || isSomeoneElseSharing}>
                                    {isScreenSharing ? <ScreenShareOff /> : <ScreenShare />}
                                </Button>
                            </span>
                        </TooltipTrigger>
                        {isSomeoneElseSharing && (
                            <TooltipContent>
                                <p>{allUsers.find(u => u.id === call.screenSharerId)?.name || 'Another user'} is sharing their screen.</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
                <Button onClick={handleToggleRecording} variant="secondary" size="lg" className={cn("rounded-full h-14 w-14 p-4", isRecording && "bg-red-600 hover:bg-red-500")} disabled={!localStream || isEndingCall || isProcessingRecording} >
                    {isProcessingRecording ? <LoaderCircle className="animate-spin" /> : <Disc className={cn(isRecording && "animate-pulse text-red-400")} />}
                </Button>
                <Button onClick={() => endCall()} variant="destructive" size="lg" className="rounded-full h-14 w-14 p-4" disabled={isEndingCall}>
                    {isEndingCall ? <LoaderCircle className="animate-spin" /> : <PhoneOff />}
                </Button>
                <Button onClick={() => setShowParticipants(p => !p)} variant="secondary" size="lg" className="rounded-full h-14 w-14 p-4 md:hidden" >
                        <Users />
                    </Button>
                </div>
            </footer>
        </div>
        
        <aside className={cn("hidden md:block w-80 bg-gray-800 border-l border-gray-700 p-4", showParticipants && "block")}>
             <ParticipantsPanel call={call} localUser={localUser} onRemove={handleRemoveParticipant} removingId={isRemovingParticipant} allUsers={allUsers} onAdd={handleAddParticipant} isAddingId={isAddingParticipant} />
        </aside>

        {/* Mobile Drawer for participants */}
        <div className="md:hidden">
             {/* This is a placeholder for a potential drawer implementation */}
        </div>
    </div>
  );
}
