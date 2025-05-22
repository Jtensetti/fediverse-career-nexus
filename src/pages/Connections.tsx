
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRoundPlus, Search, Filter, UsersRound, Loader2 } from "lucide-react";
import ConnectionBadge, { ConnectionDegree } from "@/components/ConnectionBadge";
import { 
  getUserConnections, 
  getConnectionSuggestions, 
  sendConnectionRequest,
  NetworkConnection,
  NetworkSuggestion
} from "@/services/connectionsService";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ConnectionsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnecting, setIsConnecting] = useState<{ [key: string]: boolean }>({});
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Fetch connections data
  const { 
    data: connections = [],
    isLoading: connectionsLoading, 
    error: connectionsError,
    refetch: refetchConnections
  } = useQuery({
    queryKey: ["userConnections"],
    queryFn: getUserConnections,
    enabled: isAuthenticated
  });
  
  // Fetch suggestions data
  const { 
    data: suggestions = [],
    isLoading: suggestionsLoading, 
    error: suggestionsError,
    refetch: refetchSuggestions
  } = useQuery({
    queryKey: ["connectionSuggestions"],
    queryFn: getConnectionSuggestions,
    enabled: isAuthenticated
  });
  
  // Filter connections based on search query
  const filteredConnections = connections.filter(connection => 
    connection.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.headline.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter suggestions based on search query
  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.headline.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleConnect = async (userId: string) => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to connect with others");
      return;
    }
    
    setIsConnecting(prev => ({ ...prev, [userId]: true }));
    try {
      const success = await sendConnectionRequest(userId);
      if (success) {
        // Refresh the suggestions list
        refetchSuggestions();
        refetchConnections();
      }
    } catch (error) {
      console.error("Error connecting:", error);
    } finally {
      setIsConnecting(prev => ({ ...prev, [userId]: false }));
    }
  };
  
  if (!isAuthenticated) {
    return (
      <DashboardLayout title="My Network">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-medium mb-4">Sign in to view your network</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view and manage your connections.</p>
          <Button asChild>
            <Link to="/auth/login">Sign In</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title="My Network" description="Manage your professional connections">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div className="mt-4 md:mt-0 flex gap-2">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <Input 
              placeholder="Search connections..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter size={18} />
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="connections" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <UsersRound size={16} />
            <span>My Connections</span>
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <UserRoundPlus size={16} />
            <span>Suggestions</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections">
          {connectionsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-bondy-primary" />
            </div>
          ) : connectionsError ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading Connections</h3>
              <p className="text-gray-600">There was an error loading your connections. Please try again later.</p>
              <Button variant="outline" onClick={() => refetchConnections()} className="mt-4">Retry</Button>
            </div>
          ) : filteredConnections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConnections.map((connection: NetworkConnection) => (
                <div key={connection.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border-2 border-white">
                      <AvatarImage src={connection.avatarUrl} alt={connection.displayName} />
                      <AvatarFallback>{connection.displayName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/profile/${connection.username}`} className="font-semibold hover:underline">
                          {connection.displayName}
                        </Link>
                        <ConnectionBadge degree={connection.connectionDegree} />
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{connection.headline}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {connection.mutualConnections} mutual connections
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to={`/messages/${connection.id}`}>Message</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to={`/profile/${connection.username}`}>View Profile</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <UsersRound size={48} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium mb-1">No connections found</h3>
              {searchQuery ? (
                <p className="text-gray-600">No connections match your search criteria. Try a different search.</p>
              ) : (
                <p className="text-gray-600">You haven't connected with anyone yet. Check out our suggestions.</p>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="suggestions">
          {suggestionsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-bondy-primary" />
            </div>
          ) : suggestionsError ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading Suggestions</h3>
              <p className="text-gray-600">There was an error loading connection suggestions. Please try again later.</p>
              <Button variant="outline" onClick={() => refetchSuggestions()} className="mt-4">Retry</Button>
            </div>
          ) : filteredSuggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuggestions.map((suggestion: NetworkSuggestion) => (
                <div key={suggestion.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border-2 border-white">
                      <AvatarImage src={suggestion.avatarUrl} alt={suggestion.displayName} />
                      <AvatarFallback>{suggestion.displayName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/profile/${suggestion.username}`} className="font-semibold hover:underline">
                          {suggestion.displayName}
                        </Link>
                        <ConnectionBadge degree={suggestion.connectionDegree} />
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{suggestion.headline}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {suggestion.mutualConnections} mutual connections
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className="flex-1 bg-bondy-primary hover:bg-bondy-primary/90"
                      size="sm"
                      onClick={() => handleConnect(suggestion.id)}
                      disabled={isConnecting[suggestion.id]}
                    >
                      {isConnecting[suggestion.id] ? 'Connecting...' : 'Connect'}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to={`/profile/${suggestion.username}`}>View Profile</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <UserRoundPlus size={48} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium mb-1">No suggestions available</h3>
              <p className="text-gray-600">We couldn't find any connection suggestions at this time.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Understanding Connection Degrees</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ConnectionBadge degree={1} />
              <span className="font-medium">1st Degree Connections</span>
            </div>
            <p className="text-sm text-gray-600">People you are directly connected with. You both have accepted the connection.</p>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ConnectionBadge degree={2} />
              <span className="font-medium">2nd Degree Connections</span>
            </div>
            <p className="text-sm text-gray-600">People who are connected to your 1st-degree connections but not directly to you.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ConnectionsPage;
