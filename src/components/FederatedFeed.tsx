
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFederatedFeed, type FederatedPost } from "@/services/federationService";
import FederatedPostCard from "./FederatedPostCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FederatedFeedProps {
  limit?: number;
  className?: string;
  sourceFilter?: string;
}

export default function FederatedFeed({ limit = 10, className = "", sourceFilter = "all" }: FederatedFeedProps) {
  const [page, setPage] = useState<number>(1);
  const [allPosts, setAllPosts] = useState<FederatedPost[]>([]);
  
  const { data: posts, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['federatedFeed', page, limit],
    queryFn: () => getFederatedFeed(limit, page),
  });
  
  useEffect(() => {
    // Reset to page 1 when source filter changes
    setPage(1);
    setAllPosts([]);
  }, [sourceFilter]);
  
  useEffect(() => {
    if (posts && posts.length > 0) {
      // Filter posts based on sourceFilter
      const filteredPosts = sourceFilter === "all" 
        ? posts 
        : posts.filter(post => post.source === sourceFilter);
      
      // For the first page, replace all posts
      if (page === 1) {
        setAllPosts(filteredPosts);
      } else {
        // For subsequent pages, append new posts
        setAllPosts(prev => [...prev, ...filteredPosts]);
      }
    }
  }, [posts, page, sourceFilter]);
  
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };
  
  if (error) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <p className="text-red-500 mb-2">Error loading federated posts</p>
        <Button onClick={() => refetch()} variant="outline">
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
