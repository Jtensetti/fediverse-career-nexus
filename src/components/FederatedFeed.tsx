
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFederatedFeed, type FederatedPost } from "@/services/federationService";
import FederatedPostCard from "./FederatedPostCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FederatedFeedProps {
  limit?: number;
  className?: string;
}

export default function FederatedFeed({ limit = 10, className = "" }: FederatedFeedProps) {
  const [page, setPage] = useState<number>(1);
  const [allPosts, setAllPosts] = useState<FederatedPost[]>([]);
  
  const { data: posts, isLoading, isFetching, error } = useQuery({
    queryKey: ['federatedFeed', page, limit],
    queryFn: () => getFederatedFeed(limit, page),
  });
  
  useEffect(() => {
    if (posts && posts.length > 0) {
      // For the first page, replace all posts
      if (page === 1) {
        setAllPosts(posts);
      } else {
        // For subsequent pages, append new posts
        setAllPosts(prev => [...prev, ...posts]);
      }
    }
  }, [posts, page]);
  
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };
  
  if (error) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <p className="text-red-500 mb-2">Error loading federated posts</p>
        <Button onClick={() => setPage(1)} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div className={`${className}`}>
      {isLoading && page === 1 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : allPosts.length > 0 ? (
        <>
          {allPosts.map((post, index) => (
            <FederatedPostCard key={`${post.id}-${index}`} post={post} />
          ))}
          
          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleLoadMore}
              disabled={isFetching}
              variant="outline"
              className="w-full max-w-md"
            >
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-2">No posts found in the federated feed</p>
        </div>
      )}
    </div>
  );
}
