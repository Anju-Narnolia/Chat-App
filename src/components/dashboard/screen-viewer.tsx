'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maximize2, Minimize2, RefreshCw, AlertCircle, Monitor } from 'lucide-react';
import type { UserStatus } from '@/lib/types';
// Firebase imports removed - will be replaced with MongoDB logic

interface ScreenViewerProps {
  user: UserStatus;
  isOpen: boolean;
  onClose: () => void;
}

export function ScreenViewer({ user, isOpen, onClose }: ScreenViewerProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<string>('disconnected');
  const [retryCount, setRetryCount] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const peerConnection = React.useRef<RTCPeerConnection | null>(null);
  const connectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = React.useRef(false);

  const cleanupConnection = React.useCallback(() => {
    // Clear timeouts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Close peer connection
    if (peerConnection.current) {
      try {
        peerConnection.current.ontrack = null;
        peerConnection.current.onconnectionstatechange = null;
        peerConnection.current.oniceconnectionstatechange = null;
        peerConnection.current.onicecandidate = null;
        peerConnection.current.onnegotiationneeded = null;
        peerConnection.current.onsignalingstatechange = null;
        peerConnection.current.close();
      } catch (e) {
        console.warn('Error closing peer connection:', e);
      }
      peerConnection.current = null;
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reset state
    setError(null);
    setIsConnecting(false);
    setConnectionStatus('disconnected');
    isInitializingRef.current = false;
  }, []);

  const retryConnection = React.useCallback(() => {
    setRetryCount(prev => prev + 1);
    cleanupConnection();
  }, [cleanupConnection]);

  const initializeConnection = React.useCallback(async () => {
    if (isInitializingRef.current || !isOpen || !user.screenSessionId) {
      return;
    }

    isInitializingRef.current = true;
    setIsConnecting(true);
    setError(null);
    setConnectionStatus('connecting');

    // Ensure any existing connection is properly closed
    if (peerConnection.current) {
      try {
        peerConnection.current.close();
      } catch (e) {
        console.warn('Error closing existing connection:', e);
      }
      peerConnection.current = null;
    }

    let unsubCallerCandidates: (() => void) | null = null;
    let unsubSessionStatus: (() => void) | null = null;
    let unsubUserStatus: (() => void) | null = null;

    try {
      // Create peer connection with robust ICE configuration
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // TURN servers for better connectivity
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 0,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all'
      });

      peerConnection.current = pc;

      // Set up event handlers
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          // Ensure video plays
          videoRef.current.play().catch(() => {
            // Ignore autoplay errors
          });
        }
      };

      pc.onconnectionstatechange = () => {
        setConnectionStatus(pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          setError(null);
          setIsConnecting(false);
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          if (retryCount < 3) {
            // Auto-retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            retryTimeoutRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              cleanupConnection();
            }, delay);
          } else {
            setError('Connection failed after multiple attempts. Please try using different browsers or devices.');
            setIsConnecting(false);
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          try {
            pc.restartIce();
          } catch (e) {
            console.warn('Failed to restart ICE:', e);
          }
        }
      };

      pc.onsignalingstatechange = () => {
        console.log('Signaling state:', pc.signalingState);
      };

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (pc.connectionState !== 'connected') {
          setError('Connection timeout. Please try again.');
          setIsConnecting(false);
          cleanupConnection();
        }
      }, 45000); // 45 seconds timeout

      // Get session data
      const sessionRef = doc(db, 'screenSessions', user.screenSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();

      if (!sessionData?.offer) {
        throw new Error('No screen share offer found. User may not be sharing their screen.');
      }

      if (sessionData.status !== 'active') {
        throw new Error('Screen sharing session has ended.');
      }

      // Set up Firestore listeners
      const callerCandidatesCol = collection(db, 'screenSessions', user.screenSessionId, 'callerCandidates');
      unsubCallerCandidates = onSnapshot(callerCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && pc.signalingState !== 'closed') {
            try {
              const candidate = new RTCIceCandidate(change.doc.data());
              pc.addIceCandidate(candidate).catch((e) => {
                console.warn('Failed to add ICE candidate:', e);
              });
            } catch (e) {
              console.warn('Invalid ICE candidate:', e);
            }
          }
        });
      });

      unsubSessionStatus = onSnapshot(sessionRef, (docSnap) => {
        const data = docSnap.data();
        if (data?.status !== 'active') {
          setError('User has stopped sharing their screen.');
          cleanupConnection();
        }
      });

      const userStatusRef = doc(db, 'userStatus', user.userId);
      unsubUserStatus = onSnapshot(userStatusRef, (docSnap) => {
        const userData = docSnap.data();
        if (userData && !userData.isScreenSharing) {
          setError('User has stopped sharing their screen.');
          cleanupConnection();
        }
      });

      // Set up ICE candidate collection
      const calleeCandidatesCol = collection(db, 'screenSessions', user.screenSessionId, 'calleeCandidates');
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await addDoc(calleeCandidatesCol, event.candidate.toJSON());
          } catch (e) {
            console.warn('Failed to save ICE candidate:', e);
          }
        }
      };

      // Set remote description (offer) - with state check
      if (pc.signalingState === 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(sessionData.offer));

        // Create and set local description (answer)
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Save answer to Firestore
        await updateDoc(sessionRef, { 
          answer: { type: answer.type, sdp: answer.sdp },
          lastUpdated: new Date()
        });
      } else {
        throw new Error(`Cannot set remote description. Signaling state is: ${pc.signalingState}`);
      }

    } catch (err) {
      console.error('Connection initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize screen viewer.');
      setIsConnecting(false);
      cleanupConnection();
    }

    // Return cleanup function
    return () => {
      unsubCallerCandidates?.();
      unsubSessionStatus?.();
      unsubUserStatus?.();
    };
  }, [user.screenSessionId, user.userId, retryCount, retryConnection, cleanupConnection, isOpen]);

  React.useEffect(() => {
    if (!isOpen || !user.screenSessionId) {
      cleanupConnection();
      return;
    }

    let cleanupFn: (() => void) | undefined;
    
    initializeConnection().then((cleanup) => {
      cleanupFn = cleanup;
    });
    
    return () => {
      cleanupFn?.();
      cleanupConnection();
    };
  }, [isOpen, user.screenSessionId, initializeConnection, cleanupConnection]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, [cleanupConnection]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.userImage} alt={user.userName} />
                <AvatarFallback>{user.userName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg">{user.userName}&apos;s Screen</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus)}`}></div>
                  <span className="capitalize">{connectionStatus}</span>
                  {retryCount > 0 && <span>(Attempt {retryCount + 1}/4)</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={retryConnection}
                disabled={isConnecting}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isConnecting ? 'animate-spin' : ''}`} />
                Retry
              </Button>
              <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted={false}
            controls={false}
          />
          
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg font-medium">Connecting to {user.userName}&apos;s screen...</p>
                <p className="text-sm text-gray-300 mt-2">This may take a few moments</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center text-white max-w-md mx-auto p-6">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-400 mb-2">Connection Error</h3>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                <div className="space-y-2">
                  <Button
                    onClick={retryConnection}
                    disabled={isConnecting}
                    className="w-full"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                    Try Again
                  </Button>
                  <div className="text-xs text-gray-400 p-3 bg-gray-800/50 rounded">
                    <p className="font-medium mb-1">💡 Troubleshooting Tips:</p>
                    <ul className="text-left space-y-1">
                      <li>• Use different browsers (Chrome + Firefox)</li>
                      <li>• Try incognito/private mode</li>
                      <li>• Use different devices if possible</li>
                      <li>• Check your internet connection</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!isConnecting && !error && !videoRef.current?.srcObject && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 border-2 border-gray-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <Monitor className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium">No Screen Share Available</p>
                <p className="text-sm text-gray-500 mt-1">User may not be sharing their screen</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}