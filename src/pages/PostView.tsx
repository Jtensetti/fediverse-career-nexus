import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/DashboardLayout";
import FederatedPostCard from "@/components/FederatedPostCard";
import PostReplyThread from "@/components/PostReplyThread";
import InlineReplyComposer from "@/components/InlineReplyComposer";
import { supabase } from "@/integrations/supabase/client";
import { getPostReplies, type PostReply } from "@/services/postReplyService";
import type { FederatedPost } from "@/services/federationService";

export default function PostView() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<FederatedPost | null>(null);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) {
      loadPostWithReplies();
    }
  }, [postId]);

  const loadPostWithReplies = async () => {
    if (!postId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch the main post
      const { data: postData, error: postError } = await supabase
        .from('ap_objects')
        .select(`
          id,
          type,
          content,
          created_at,
          published_at,
          attributed_to,
          actors!ap_objects_attributed_to_fkey (
            id,
            user_id,
            preferred_username,
            is_remote,
            remote_actor_url
          )
        `)
        .eq('id', postId)
        .single();

      if (postError || !postData) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      // Fetch profile data if it's a local post
      const actor = postData.actors as any;
      let profile = null;
      
      if (actor?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, fullname, avatar_url')
          .eq('id', actor.user_id)
          .single();
        profile = profileData;
      }

      // Transform to FederatedPost format
      const federatedPost: FederatedPost = {
        id: postData.id,
        type: postData.type,
        content: postData.content as any,
        created_at: postData.created_at,
        published_at: postData.published_at || undefined,
        source: actor?.is_remote ? 'remote' : 'local',
        user_id: actor?.user_id || undefined,
        actor_name: actor?.preferred_username || undefined,
        actor: {
          preferredUsername: actor?.preferred_username,
        },
        profile: profile ? {
          username: profile.username || undefined,
          fullname: profile.fullname || undefined,
          avatar_url: profile.avatar_url || undefined,
        } : undefined,
      };

      setPost(federatedPost);

      // Fetch replies
      const repliesData = await getPostReplies(postId);
      setReplies(repliesData);
    } catch (err) {
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleReplyCreated = () => {
    // Reload replies after a new reply is created
    if (postId) {
      getPostReplies(postId).then(setReplies);
    }
  };

  const handleReplyToReply = async (replyId: string) => {
    // This will be handled by InlineReplyComposer within PostReplyThread
    // Reload replies after nested reply
    if (postId) {
      const repliesData = await getPostReplies(postId);
      setReplies(repliesData);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !post) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link to="/feed">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
          <div className="text-center py-12">
            <p className="text-muted-foreground">{error || 'Post not found'}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/feed">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feed
          </Button>
        </Link>

        {/* Main Post */}
        <FederatedPostCard post={post} />

        {/* Reply Composer */}
        <div className="mt-4 mb-6">
          <InlineReplyComposer 
            postId={post.id} 
            onReplyCreated={handleReplyCreated}
            placeholder="Write a reply..."
          />
        </div>

        {/* Replies Section */}
        {replies.length > 0 && (
          <>
            <Separator className="my-4" />
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </h3>
            <div className="space-y-4">
              {replies.map((reply) => (
                <PostReplyThread 
                  key={reply.id} 
                  reply={reply} 
                  postId={post.id}
                  onReplyCreated={handleReplyToReply}
                />
              ))}
            </div>
          </>
        )}

        {replies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No replies yet. Be the first to reply!</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
