"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Phone,
  Video,
  Send,
  Mic,
  Paperclip,
  MessageSquare,
  LoaderCircle,
  Smile,
  Image,
  FileText,
  Settings,
  PlusCircle,
  ListFilter,
  SquarePen,
  Users as GroupIcon,
  Search,
  MoreVertical,
  UserPlus,
  Archive,
  Trash2,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
} from "lucide-react";
import type { User, Message, Conversation } from "@/lib/types";
import { useAuth } from "@/components/auth/auth-provider";
import {
  sendMessageAction,
  startCallAction,
  getOrCreateChatAction,
  getConversationsAction,
  getMessagesAction,
  searchUsersAction,
} from "@/app/dashboard/actions";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, formatDistanceToNowStrict } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { CreateGroupDialog } from "./create-group-dialog";
import { GroupSettingsDialog } from "./group-settings-dialog";

function getDirectChatDisplay(
  conversation: Conversation,
  users: User[],
  currentUser: User | null
) {
  if (conversation.isGroup) {
    return { name: conversation.name, image: conversation.image };
  }
  const otherUserId = conversation.participantIds.find((id: string) => id !== currentUser?.id);
  const otherUser = users.find(u => u.id === otherUserId);
  return {
    name: otherUser?.name || 'Unknown',
    image: otherUser?.image || ''
  };
}

const ConversationAvatar = ({
  conversation,
  users,
}: {
  conversation: Conversation;
  users: User[];
}) => {
  if (!conversation.isGroup) {
    return (
      <Avatar>
        <AvatarImage
          src={conversation.image}
          alt={conversation.name}
          data-ai-hint="person avatar"
        />
        <AvatarFallback>{conversation.name?.charAt(0) ?? "U"}</AvatarFallback>
      </Avatar>
    );
  }

  const members = conversation.participantIds
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as User[];

  const displayMembers = members.slice(0, 2);

  if (displayMembers.length === 1) {
    return (
      <Avatar>
        <AvatarImage
          src={displayMembers[0].image}
          alt={displayMembers[0].name}
        />
        <AvatarFallback>
          {displayMembers[0].name?.charAt(0) ?? "G"}
        </AvatarFallback>
      </Avatar>
    );
  }

  if (displayMembers.length > 1) {
    return (
      <div className="relative h-10 w-10">
        <Avatar className="absolute bottom-0 right-0 h-7 w-7 border-2 border-background dark:border-slate-900">
          <AvatarImage
            src={displayMembers[1].image}
            alt={displayMembers[1].name}
          />
          <AvatarFallback>{displayMembers[1].name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <Avatar className="absolute top-0 left-0 h-7 w-7 border-2 border-background dark:border-slate-900">
          <AvatarImage
            src={displayMembers[0].image}
            alt={displayMembers[0].name}
          />
          <AvatarFallback>{displayMembers[0].name?.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <Avatar>
      <AvatarFallback>
        <GroupIcon className="h-5 w-5" />
      </AvatarFallback>
    </Avatar>
  );
};

const SearchResults = ({
  searchResults,
  onSelectUser,
  isLoading,
  searchTerm,
}: {
  searchResults: User[];
  onSelectUser: (user: User) => void;
  isLoading: boolean;
  searchTerm: string;
}) => {
  if (!searchTerm.trim()) return null;

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">Searching users...</p>
      </div>
    );
  }

  if (searchResults.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <p className="px-2 mb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
        Start a new chat
      </p>
      {searchResults.map((user) => (
        <div
          key={user.id}
          onClick={() => onSelectUser(user)}
          className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-secondary transition-colors"
        >
          <Avatar>
            <AvatarImage
              src={user.image}
              alt={user.name}
              data-ai-hint="person avatar"
            />
            <AvatarFallback>{user.name?.charAt(0) ?? "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {user.role}
          </Badge>
        </div>
      ))}
    </div>
  );
};

export function ChatView({ users }: { users: User[] }) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Debug: Log users prop
  console.log("ChatView received users:", users);

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallPanelOpen, setIsCallPanelOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const otherUsers = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [users, currentUser]
  );

  const selectedConversationDisplay = selectedConversation
    ? getDirectChatDisplay(selectedConversation, users, currentUser)
    : { name: '', image: '' };

  // Load conversations on mount
  useEffect(() => {
    if (!currentUser) return;

    const loadConversations = async () => {
      setIsLoading(true);
      try {
        const conversationsData = await getConversationsAction(currentUser.id);
        setConversations(conversationsData);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [currentUser]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const messagesData = await getMessagesAction(selectedConversation.id);
        setMessages(messagesData);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    // Only load messages if users are available
    if (users.length > 0) {
      loadMessages();
    }
  }, [selectedConversation, users]);

  // Search users with debouncing
  useEffect(() => {
    if (!currentUser || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsersAction(searchTerm, currentUser.id);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, currentUser]);

  // Play/stop ringtone logic
  useEffect(() => {
    if (isRinging) {
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [isRinging]);

  const handleSelectUser = async (user: User) => {
    if (!currentUser || isLoading) return;
    setIsLoading(true);

    try {
      const result = await getOrCreateChatAction({
        currentUserId: currentUser.id,
        otherUserId: user.id,
      });

      if (result.success && result.chatId) {
        // Find the conversation in the list or add it
        const existingConversation = conversations.find(
          (c) => c.id === result.chatId
        );
        if (existingConversation) {
          setSelectedConversation(existingConversation);
        } else {
          // Add new conversation to the list
          const newConversation = {
            id: result.chatId,
            name: user.name,
            image: user.image,
            isGroup: false,
            participantIds: [currentUser.id, user.id],
            createdBy: currentUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Conversation;

          setConversations((prev) => [newConversation, ...prev]);
          setSelectedConversation(newConversation);
        }
        setSearchTerm(""); // Clear search
        setSearchResults([]);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to create chat",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create chat",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newMessage.trim() ||
      !currentUser ||
      !selectedConversation ||
      isSending
    )
      return;

    setIsSending(true);
    const textToSend = newMessage;
    setNewMessage("");

    try {
      const result = await sendMessageAction({
        text: textToSend,
        senderId: currentUser.id,
        receiverId: selectedConversation.id,
        chatId: selectedConversation.id,
      });

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to send message",
        });
        setNewMessage(textToSend);
      } else {
        // Add message to local state immediately for better UX
        const newMessageObj: Message = {
          id: result.messageId || Date.now().toString(),
          text: textToSend,
          senderId: currentUser.id,
          receiverId: selectedConversation.id,
          timestamp: new Date(),
          isCallNotification: false,
        };
        setMessages((prev) => [...prev, newMessageObj]);

        // Update conversation's last message
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  lastMessageText: textToSend,
                  lastMessageSenderId: currentUser.id,
                  lastMessageTimestamp: new Date(),
                }
              : conv
          )
        );
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
      setNewMessage(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  // Simulate call flow for demo (replace with real signaling logic)
  const handleStartCall = async (video: boolean) => {
    if (!selectedConversation || !currentUser) return;
    setIsRinging(true); // Start ringing for outgoing call

    if (window.location.pathname.startsWith("/dashboard/call/")) {
      toast({
        variant: "destructive",
        title: "Already in a call",
        description: "Please end your current call before starting a new one.",
      });
      return;
    }

    try {
      const result = await startCallAction({
        createdBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        },
        participantIds: selectedConversation.participantIds,
        type: video ? "video" : "audio",
        chatId: selectedConversation.id,
      });

      if (result.success && result.callId) {
        router.push(`/dashboard/call/${result.callId}`);
      } else {
        toast({
          variant: "destructive",
          title: "Call Failed",
          description: "Could not start the call. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: "Could not start the call. Please try again.",
      });
    }

    // After call is answered (simulate with timeout for now):
    setTimeout(() => {
      setIsRinging(false);
      setIsCallPanelOpen(true);
    }, 3000); // Simulate 3s ring, replace with real answer event
  };

  const handleAnswerCall = () => {
    setIsRinging(false);
    setIsCallPanelOpen(true);
  };

  const handleEndCall = () => {
    setIsCallPanelOpen(false);
    setIsRinging(false);
  };

  const formatTimestamp = (timestamp: Date | undefined) => {
    if (!timestamp) return "";
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isToday(date)) {
      return format(date, "p");
    }
    return format(date, "dd/MM");
  };

  const filteredConversations = useMemo(() => {
    if (!searchTerm) {
      return conversations;
    }
    return conversations.filter((convo) =>
      convo.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, conversations]);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-[350px_1fr] h-full bg-card transition-all duration-300 overflow-hidden",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* Sidebar */}
      <div className="flex flex-col border-r bg-background/50 h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Chat</h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>
              <CreateGroupDialog users={otherUsers}>
                <Button variant="ghost" size="icon">
                  <UserPlus className="h-5 w-5" />
                </Button>
              </CreateGroupDialog>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col p-2">
              {isLoading ? (
                <div className="p-4 text-center">
                  <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Loading conversations...
                  </p>
                </div>
              ) : (
                <>
                  {/* Search Results */}
                  <SearchResults
                    searchResults={searchResults}
                    onSelectUser={handleSelectUser}
                    isLoading={isSearching}
                    searchTerm={searchTerm}
                  />

                  {/* Conversations */}
                  {!searchTerm && (
                    <>
                      <p className="px-2 mb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                        Recent Conversations
                      </p>
                      {filteredConversations.map((convo) => {
                        const { name: displayName, image: displayImage } = getDirectChatDisplay(convo, users, currentUser);
                        const lastMessageText =
                          convo.lastMessageSenderId === currentUser?.id
                            ? `You: ${convo.lastMessageText}`
                            : convo.lastMessageText;

                        return (
                          <div
                            key={convo.id}
                            onClick={() => setSelectedConversation(convo)}
                            className={cn(
                              "flex items-center gap-3 cursor-pointer p-2 rounded-md transition-colors border-l-4",
                              selectedConversation?.id === convo.id
                                ? "border-primary bg-primary/10"
                                : "border-transparent hover:bg-secondary"
                            )}
                          >
                            <ConversationAvatar
                              conversation={{ ...convo, name: displayName, image: displayImage }}
                              users={users}
                            />
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold truncate">
                                  {displayName}
                                </p>
                                {convo.isGroup && (
                                  <Badge variant="outline" className="text-xs">
                                    Group
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {lastMessageText || "No messages yet"}
                              </p>
                            </div>
                            <time className="text-xs text-muted-foreground self-start mt-1">
                              {formatTimestamp(convo.lastMessageTimestamp)}
                            </time>
                          </div>
                        );
                      })}

                      {filteredConversations.length === 0 && !searchTerm && (
                        <div className="p-4 text-center text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">No conversations yet</p>
                          <p className="text-xs">
                            Search for users to start chatting
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Chat Area - Fixed Layout */}
      {selectedConversation ? (
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <ConversationAvatar conversation={{ ...selectedConversation, name: selectedConversationDisplay.name, image: selectedConversationDisplay.image }} users={users} />
              <div>
                <p className="font-semibold">{selectedConversationDisplay.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.isGroup
                    ? `${selectedConversation.participantIds.length} members`
                    : "Online"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall(false)}
                disabled={isLoading}
                className="transition-colors hover:bg-primary/10"
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall(true)}
                disabled={isLoading}
                className="transition-colors hover:bg-primary/10"
              >
                <Video className="h-5 w-5" />
              </Button>
              {selectedConversation.isGroup && currentUser && (
                <GroupSettingsDialog
                  conversation={selectedConversation}
                  allUsers={users}
                  currentUser={currentUser}
                >
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </GroupSettingsDialog>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Call Panel (show when call is active) */}
          {isCallPanelOpen && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-70">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 flex flex-col items-center">
                <p className="text-lg font-bold mb-4">Call in Progress</p>
                <div className="flex gap-4 mb-4">
                  <Button onClick={handleEndCall} className="bg-red-500 hover:bg-red-600 text-white">End Call</Button>
                  {/* Add mute, video toggle, etc. here */}
                </div>
              </div>
            </div>
          )}

          {/* Incoming call notification (simulate for demo) */}
          {isRinging && !isCallPanelOpen && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border rounded-lg shadow-lg px-6 py-4 flex items-center gap-4">
              <span className="font-semibold">Ringing...</span>
              <Button onClick={handleAnswerCall} className="bg-green-500 hover:bg-green-600 text-white">Answer</Button>
              <Button onClick={handleEndCall} className="bg-red-500 hover:bg-red-600 text-white">Decline</Button>
            </div>
          )}

          {/* Messages Area - Only This Scrolls */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((message) => {
                  const isSender = message.senderId === currentUser?.id;
                  const messageDate = message.timestamp
                    ? new Date(message.timestamp)
                    : new Date();

                  if (message.isCallNotification) {
                    return (
                      <div
                        key={message.id}
                        className="flex justify-center my-2"
                      >
                        <div className="text-xs text-muted-foreground bg-secondary border px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                          <span>{message.text}</span>
                          <span className="text-muted-foreground/70">
                            {format(messageDate, "p")}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const senderUser = users.find(
                    (u) => u.id === message.senderId
                  );

                  // Debug logging to understand the issue
                  console.log("Message senderId:", message.senderId);
                  console.log(
                    "Available users:",
                    users.map((u) => ({ id: u.id, name: u.name }))
                  );
                  console.log("Found sender user:", senderUser);

                  // Fallback for sender name
                  const senderName =
                    senderUser?.name || `User ${message.senderId.slice(0, 8)}`;
                  const senderInitial = senderUser?.name?.charAt(0) || "U";

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-end gap-2",
                        isSender && "justify-end"
                      )}
                    >
                      {!isSender && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={senderUser?.image}
                            alt={senderName}
                            data-ai-hint="person avatar"
                          />
                          <AvatarFallback>{senderInitial}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-xs md:max-w-md rounded-lg p-3",
                          isSender
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border"
                        )}
                      >
                        {!isSender && selectedConversation.isGroup && (
                          <p className="text-xs font-semibold mb-1 text-primary">
                            {senderName}
                          </p>
                        )}
                        <p className="text-sm">{message.text}</p>
                        <p
                          className={cn(
                            "text-xs mt-1 text-right",
                            isSender
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(messageDate, "p")}
                        </p>
                      </div>
                      {isSender && currentUser && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={currentUser?.image ?? ""}
                            alt="You"
                            data-ai-hint="person avatar"
                          />
                          <AvatarFallback>
                            {currentUser?.name?.charAt(0) ?? "Y"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input - Sticky to Bottom */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t flex items-center gap-2 flex-shrink-0"
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  type="button"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-auto p-2">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" title="Send Image">
                    <Image className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Send File">
                    <FileText className="h-5 w-5" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Input
              placeholder="Type a message..."
              className="flex-1 bg-card"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              type="button"
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              className="shrink-0"
              type="submit"
              disabled={isSending || !newMessage.trim()}
            >
              {isSending ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold">Select a conversation</h2>
          <p>Choose someone from your contacts to start chatting.</p>
        </div>
      )}

      {/* Ringtone audio element (hidden) */}
      <audio ref={audioRef} src="/sound/ringtone.wav" loop style={{ display: 'none' }} />
    </div>
  );
}
