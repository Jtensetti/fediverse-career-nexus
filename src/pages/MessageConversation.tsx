
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Send, Lock, LockOpen } from 'lucide-react';

import { 
  getConversationWithMessages, 
  sendMessage, 
  Message as DirectMessage,
  MessageContent,
  subscribeToMessages,
  unsubscribeFromMessages,
  getOtherParticipant
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

export default function MessageConversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [otherUser, setOtherUser] = useState<any | null>(null);
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

    const handleNewMessage = (message: DirectMessage) => {
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
    subscribeToMessages(conversationId, handleNewMessage, handleError);

    // Cleanup subscription on unmount
    return () => {
      unsubscribeFromMessages(conversationId);
    };
  }, [conversationId, currentUserId, queryClient, toast]);

  // Get other participant details
  useEffect(() => {
    if (!data?.conversation || !currentUserId) return;

    const loadUser = async () => {
      try {
        const user = await getOtherParticipant(data.conversation, currentUserId);
        setOtherUser(user);
      } catch (error) {
        console.error('Error loading participant:', error);
      }
    };

    loadUser();
  }, [data?.conversation, currentUserId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: (messageContent: MessageContent) => {
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

    const messageContent: MessageContent = {
      content: newMessage,
      isEncrypted: isEncrypted,
      encryptedContent: isEncrypted ? newMessage : undefined // This would actually be encrypted in a real implementation
    };

    sendMessageMutation.mutate(messageContent);
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

  const { conversation, messages } = data;

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
                {otherUser?.username || otherUser?.fullname || 'Unknown User'}
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
                      {message.is_encrypted && (
                        <div className="flex items-center text-xs space-x-1 mb-1">
                          <Lock className="h-3 w-3" />
                          <span>Encrypted</span>
                        </div>
                      )}
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
            <form onSubmit={handleSendMessage} className="w-full space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="encryption"
                  checked={isEncrypted}
                  onCheckedChange={setIsEncrypted}
                />
                <Label htmlFor="encryption" className="flex items-center space-x-1 cursor-pointer">
                  {isEncrypted ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                  <span>{isEncrypted ? 'Encrypted' : 'Not encrypted'}</span>
                </Label>
              </div>
              
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-grow"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
