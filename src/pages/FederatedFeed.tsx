
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FederatedFeed from "@/components/FederatedFeed";
import PostComposer from "@/components/PostComposer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const FederatedFeedPage = () => {
  const [feedSource, setFeedSource] = useState<string>("all");
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    // Invalidate the feed query to force a refresh
    queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="h-7 w-7" />
              Federated Feed
            </h1>
            
            <div className="flex items-center gap-2">
              <Select value={feedSource} onValueChange={setFeedSource}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="local">Local Only</SelectItem>
                  <SelectItem value="remote">Remote Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={handleRefresh}>Refresh</Button>
            </div>
          </div>
          
          <PostComposer className="mb-6" />
          
          <FederatedFeed className="mb-8" sourceFilter={feedSource} />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FederatedFeedPage;
