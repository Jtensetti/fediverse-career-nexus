import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';

import { useAuth } from '@/contexts/AuthContext';
import { 
  getConversationWithMessages, 
  sendMessage, 
  Message,
  subscribeToMessages,
  getOtherParticipant,
  canMessageUser,
  ParticipantInfo
} from '@/services/messageService';
import { linkifyText } from '@/lib/linkify';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import FediverseBadge from '@/components/FediverseBadge';
import MessageReactions from '@/components/MessageReactions';

export default function MessageConversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id || null;
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<ParticipantInfo | null>(null);
  const [canMessage, setCanMessage] = useState<boolean | null>(null);
  const [isFederated, setIsFederated] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const hasInitialScrolled = useRef(false);
  const queryClient = useQueryClient();

  // Fetch conversation and messages
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationId ? getConversationWithMessages(conversationId) : null,
    enabled: !!conversationId && !!currentUserId
  });

  // Scroll to bottom of messages container (not page)
  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Check if user is near bottom of messages
  const checkIfNearBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  }, []);

  // Initial scroll to bottom when messages load
  useEffect(() => {
    if (data?.messages && data.messages.length > 0 && !hasInitialScrolled.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom(false);
        hasInitialScrolled.current = true;
      });
    }
  }, [data?.messages, scrollToBottom]);

  // Set up real-time subscription to new messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const handleNewMessage = (message: Message) => {
      // Update query cache with the new message
      queryClient.setQueryData(['conversation', conversationId], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          messages: [...oldData.messages, message]
        };
      });

      // Auto-scroll only if user was near bottom
      if (isNearBottomRef.current) {
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      }
    };

    const handleError = (error: any) => {
      console.error('Error in realtime subscription:', error);
      toast({
        title: "Connection issue",
        description: "Problem receiving new messages. Try refreshing.",
        variant: "destructive"
      });
    };

    // Subscribe to new messages
    const subscription = subscribeToMessages(conversationId, handleNewMessage);

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, currentUserId, queryClient, toast, scrollToBottom]);

  // Get other participant details and check connection status
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const loadUserAndCheckConnection = async () => {
      try {
        // Check messaging capability using new RPC
        const messageResult = await canMessageUser(conversationId);
        setCanMessage(messageResult.can_message);
        setIsFederated(messageResult.is_federated);
        
        // Load user profile
        if (data?.conversation) {
          const user = await getOtherParticipant(data.conversation, currentUserId);
          setOtherUser(user);
        }
      } catch (error) {
        console.error('Error loading participant:', error);
        setCanMessage(false);
      }
    };

    loadUserAndCheckConnection();
  }, [data?.conversation, currentUserId, conversationId]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [newMessage]);

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: (messageContent: string) => {
      if (!conversationId) throw new Error('No conversation ID');
      return sendMessage(conversationId, messageContent);
    },
    onSuccess: () => {
      setNewMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Scroll to bottom after sending
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate(newMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() && canMessage === true && !sendMessageMutation.isPending) {
        sendMessageMutation.mutate(newMessage);
      }
    }
  };

  // Sanitize and linkify message content
  const renderMessageContent = (content: string) => {
    const linkedContent = linkifyText(content);
    const sanitized = DOMPurify.sanitize(linkedContent, {
      ALLOWED_TAGS: ['a', 'br'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
    return sanitized;
  };

  // Handle loading and error states
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container max-w-4xl mx-auto px-4 py-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container max-w-4xl mx-auto px-4 py-10">
          <div className="text-center">
            <p>Please sign in to view your messages</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container max-w-4xl mx-auto px-4 py-10">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-6 w-[150px]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] ${i % 2 === 0 ? 'bg-muted' : 'bg-primary text-primary-foreground'} p-3 rounded-lg`}>
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full flex space-x-2">
                <Skeleton className="h-10 flex-grow" />
                <Skeleton className="h-10 w-10" />
              </div>
            </CardFooter>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container max-w-4xl mx-auto px-4 py-10">
          <div className="text-center py-8">
            <p className="text-red-500">Error loading conversation</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/messages')}
            >
              Back to Messages
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { messages } = data;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow container max-w-4xl mx-auto px-4 py-10">
        <Card className="flex flex-col h-[calc(100vh-200px)]">
          <CardHeader className="border-b">
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={otherUser?.avatar_url} />
                <AvatarFallback>
                  {otherUser?.username?.substring(0, 2).toUpperCase() || 'UN'}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <CardTitle>
                  {otherUser?.fullname || otherUser?.username || (
                    <span className="text-muted-foreground">Loading...</span>
                  )}
                </CardTitle>
                {isFederated && otherUser?.homeInstance && (
                  <FediverseBadge homeInstance={otherUser.homeInstance} />
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent 
            ref={messagesContainerRef}
            onScroll={checkIfNearBottom}
            className="flex-grow overflow-y-auto p-4"
          >
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender_id === currentUserId;
                  return (
                    <div 
                      key={message.id} 
                      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                    >
                      <div 
                        className={`group max-w-[70%] p-3 rounded-lg space-y-1
                          ${isOwnMessage 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                          }
                        `}
                      >
                        <p 
                          className="break-words whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ 
                            __html: renderMessageContent(message.content) 
                          }}
                          onClick={(e) => {
                            // Prevent navigation when clicking links
                            const target = e.target as HTMLElement;
                            if (target.tagName === 'A') {
                              e.stopPropagation();
                            }
                          }}
                        />
                        <p className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                        <MessageReactions 
                          messageId={message.id} 
                          isOwnMessage={isOwnMessage}
                        />
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          
          <CardFooter className="border-t p-4">
            {canMessage === false ? (
              <div className="w-full flex items-center justify-center gap-2 text-muted-foreground py-2">
                <AlertCircle className="h-4 w-4" />
                <span>You must be connected to send messages</span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="w-full">
                <div className="flex space-x-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={canMessage === null ? "Checking connection..." : "Type your message..."}
                    className="flex-grow min-h-[40px] max-h-[150px] resize-none py-2"
                    disabled={canMessage === null}
                    rows={1}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="h-10 w-10 flex-shrink-0"
                    disabled={!newMessage.trim() || sendMessageMutation.isPending || canMessage !== true}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
