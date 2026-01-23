import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/DashboardLayout";
import FederatedPostCard from "@/components/FederatedPostCard";
import PostReplyThread from "@/components/PostReplyThread";
import InlineReplyComposer from "@/components/InlineReplyComposer";
import PostEditDialog from "@/components/PostEditDialog";
import { supabase } from "@/integrations/supabase/client";
import { getPostReplies, type PostReply } from "@/services/postReplyService";
import type { FederatedPost } from "@/services/federationService";

export default function PostView() {
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const highlightReplyId = searchParams.get('highlight');
  
  const [post, setPost] = useState<FederatedPost | null>(null);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<FederatedPost | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEditPost = (postToEdit: FederatedPost) => {
    setEditingPost(postToEdit);
    setEditOpen(true);
  };

  const handleDeletePost = () => {
    navigate('/feed');
  };

  const handlePostUpdated = () => {
    loadPostWithReplies();
    queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  };

  useEffect(() => {
    if (postId) {
      loadPostWithReplies();
    }
  }, [postId]);

  const loadPostWithReplies = async () => {
    // Validate postId before fetching
    if (!postId || postId === 'undefined' || postId === 'null' || postId.trim() === '') {
      setError('Invalid post ID');
      setLoading(false);
      return;
    }
    
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
        .maybeSingle();

      if (postError) {
        console.error('Error fetching post:', postError);
        setError('Failed to load post');
        setLoading(false);
        return;
      }
      
      if (!postData) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      // Check if this is a reply (has inReplyTo or rootPost in content)
      const content = postData.content as any;
      const rootPost = content?.rootPost || content?.content?.rootPost;
      const inReplyTo = content?.inReplyTo || content?.content?.inReplyTo;
      
      // If this is a reply, redirect to the parent post with highlight
      if (rootPost && rootPost !== postId) {
        navigate(`/post/${rootPost}?highlight=${postId}`, { replace: true });
        return;
      } else if (inReplyTo && inReplyTo !== postId && !rootPost) {
        navigate(`/post/${inReplyTo}?highlight=${postId}`, { replace: true });
        return;
      }

      // Fetch profile data if it's a local post
      const actor = postData.actors as any;
      let profile = null;
      
      if (actor?.user_id) {
        const { data: profileData } = await supabase
          .from('public_profiles')
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
      
      // Scroll to highlighted reply after loading
      if (highlightReplyId) {
        setTimeout(() => {
          const element = document.getElementById(`reply-${highlightReplyId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
  };

  const handleReplyCreated = () => {
    // Reload replies after a new reply is created
    if (postId) {
      getPostReplies(postId).then(setReplies);
    }
  };

  const handleReplyToReply = async (replyId: string) => {
    // Reload replies after nested reply
    if (postId) {
      const repliesData = await getPostReplies(postId);
      setReplies(repliesData);
    }
  };

  // Build reply tree structure
  const { topLevelReplies, getChildReplies } = useMemo(() => {
    // Create a map for quick lookup
    const replyMap = new Map(replies.map(r => [r.id, r]));
    
    // Find top-level replies (direct replies to the main post)
    const topLevel = replies.filter(r => !r.parent_reply_id);
    
    // Function to get child replies for a given parent
    const getChildren = (parentId: string): PostReply[] => {
      return replies.filter(r => r.parent_reply_id === parentId);
    };
    
    return {
      topLevelReplies: topLevel,
      getChildReplies: getChildren
    };
  }, [replies]);

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

        {/* Main Post - show full content and hide inline comments (shown below instead) */}
        <FederatedPostCard 
          post={post} 
          hideComments 
          showFullContent 
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
        />

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
              {topLevelReplies.map((reply) => (
                <PostReplyThread 
                  key={reply.id} 
                  reply={reply} 
                  postId={post.id}
                  childReplies={getChildReplies(reply.id)}
                  onReplyCreated={handleReplyToReply}
                  isHighlighted={reply.id === highlightReplyId}
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

      <PostEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        post={editingPost}
        onUpdated={handlePostUpdated}
      />
    </DashboardLayout>
  );
}
