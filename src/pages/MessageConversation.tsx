
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Send, AlertCircle } from 'lucide-react';

import { 
  getConversationWithMessages, 
  sendMessage, 
  Message,
  subscribeToMessages,
  getOtherParticipant,
  areUsersConnected
} from '@/services/messageService';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function MessageConversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any | null>(null);
  const [canMessage, setCanMessage] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your messages",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      setCurrentUserId(data.session.user.id);
    };

    checkAuth();
  }, [navigate, toast]);

  // Fetch conversation and messages
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationId ? getConversationWithMessages(conversationId) : null,
    enabled: !!conversationId && !!currentUserId
  });

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
  }, [conversationId, currentUserId, queryClient, toast]);

  // Get other participant details and check connection status
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const loadUserAndCheckConnection = async () => {
      try {
        // Check if users are connected
        const connected = await areUsersConnected(currentUserId, conversationId);
        setCanMessage(connected);
        
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

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: (messageContent: string) => {
      if (!conversationId) throw new Error('No conversation ID');
      return sendMessage(conversationId, messageContent);
    },
    onSuccess: () => {
      setNewMessage('');
      // The realtime subscription will update the messages
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

  // Handle loading and error states
  if (!currentUserId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container max-w-4xl mx-auto px-4 py-10">
          <div className="text-center">
            <p>Please sign in to view your messages</p>
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
              <CardTitle>
                {otherUser?.username || otherUser?.fullname || (
                  <span className="text-muted-foreground">User not found</span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="flex-grow overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-3 rounded-lg space-y-1
                      ${message.sender_id === currentUserId 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                      }
                    `}>
                      <p>{message.content}</p>
                      <p className="text-xs opacity-70">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
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
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={canMessage === null ? "Checking connection..." : "Type your message..."}
                    className="flex-grow"
                    disabled={canMessage === null}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
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
