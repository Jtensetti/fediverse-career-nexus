
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

import { Conversation, getConversations, getOtherParticipant } from '@/services/messageService';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';

export default function Messages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  // Fetch conversations
  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    enabled: !!currentUserId
  });

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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow container max-w-4xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Messages</h1>
          <Button asChild>
            <Link to="/connections">New Message</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading conversations</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <ConversationItem 
                key={conversation.id} 
                conversation={conversation} 
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border rounded-lg">
            <h3 className="text-xl font-medium mb-2">No conversations yet</h3>
            <p className="text-gray-500 mb-6">Start messaging with your connections</p>
            <Button asChild>
              <Link to="/connections">Find People to Message</Link>
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

type ConversationItemProps = {
  conversation: Conversation;
  currentUserId: string;
};

function ConversationItem({ conversation, currentUserId }: ConversationItemProps) {
  const [otherUser, setOtherUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getOtherParticipant(conversation, currentUserId);
        setOtherUser(user);
      } catch (error) {
        console.error('Error loading participant:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [conversation, currentUserId]);

  // Get the last message time
  const lastMessageTime = conversation.last_message_at 
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
    : 'No messages yet';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link to={`/messages/${conversation.id}`}>
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser?.avatar_url} />
              <AvatarFallback>
                {otherUser?.username?.substring(0, 2).toUpperCase() || 'UN'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="font-medium truncate">
                  {otherUser?.username || otherUser?.fullname || 'Unknown User'}
                </p>
                <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
              </div>
              {conversation.lastMessage && (
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.lastMessage.is_encrypted ? 
                    '🔒 Encrypted message' : 
                    conversation.lastMessage.content}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
