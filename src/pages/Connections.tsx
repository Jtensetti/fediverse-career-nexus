
import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRoundPlus, Search, Filter, UsersRound, Loader2, UserCheck, Bell, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ConnectionBadge, { ConnectionDegree } from "@/components/ConnectionBadge";
import { 
  getUserConnections, 
  getConnectionSuggestions, 
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getPendingConnectionRequests,
  getSentConnectionRequests,
  NetworkConnection,
  NetworkSuggestion,
  PendingConnectionRequest
} from "@/services/connectionsService";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ConnectionsPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnecting, setIsConnecting] = useState<{ [key: string]: boolean }>({});
  const [isResponding, setIsResponding] = useState<{ [key: string]: boolean }>({});
  
  // Fetch connections data
  const { 
    data: connections = [],
    isLoading: connectionsLoading, 
    error: connectionsError,
    refetch: refetchConnections
  } = useQuery({
    queryKey: ["userConnections"],
    queryFn: getUserConnections
  });
  
  // Fetch suggestions data
  const { 
    data: suggestions = [],
    isLoading: suggestionsLoading, 
    error: suggestionsError,
    refetch: refetchSuggestions
  } = useQuery({
    queryKey: ["connectionSuggestions"],
    queryFn: getConnectionSuggestions
  });

  // Fetch pending connection requests
  const { 
    data: pendingRequests = [],
    isLoading: pendingLoading, 
    error: pendingError,
    refetch: refetchPending
  } = useQuery({
    queryKey: ["pendingConnectionRequests"],
    queryFn: getPendingConnectionRequests
  });

  // Fetch sent (outgoing) connection requests
  const { 
    data: sentRequests = [],
    refetch: refetchSent
  } = useQuery({
    queryKey: ["sentConnectionRequests"],
    queryFn: getSentConnectionRequests
  });
  
  // Filter connections based on search query - with null-safe access
  const filteredConnections = connections.filter(connection => {
    const displayName = connection.displayName || '';
    const headline = connection.headline || '';
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           headline.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  // Filter suggestions based on search query - with null-safe access
  const filteredSuggestions = suggestions.filter(suggestion => {
    const displayName = suggestion.displayName || '';
    const headline = suggestion.headline || '';
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           headline.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  const handleConnect = async (userId: string) => {
    
    setIsConnecting(prev => ({ ...prev, [userId]: true }));
    try {
      const success = await sendConnectionRequest(userId);
      if (success) {
        refetchSuggestions();
        refetchConnections();
        refetchPending();
        refetchSent();
      }
    } catch (error) {
      console.error("Error connecting:", error);
    } finally {
      setIsConnecting(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAcceptRequest = async (connectionId: string) => {
    setIsResponding(prev => ({ ...prev, [connectionId]: true }));
    try {
      const success = await acceptConnectionRequest(connectionId);
      if (success) {
        refetchPending();
        refetchConnections();
      }
    } catch (error) {
      console.error("Error accepting request:", error);
    } finally {
      setIsResponding(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRejectRequest = async (connectionId: string) => {
    setIsResponding(prev => ({ ...prev, [connectionId]: true }));
    try {
      const success = await rejectConnectionRequest(connectionId);
      if (success) {
        refetchPending();
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setIsResponding(prev => ({ ...prev, [connectionId]: false }));
    }
  };
  
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
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Bell size={16} />
            <span>Invitations</span>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <UserRoundPlus size={16} />
            <span>Suggestions</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections">
          {connectionsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : connectionsError ? (
            <div className="bg-card rounded-lg shadow-sm p-8 text-center">
              <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading Connections</h3>
              <p className="text-muted-foreground">There was an error loading your connections. Please try again later.</p>
              <Button variant="outline" onClick={() => refetchConnections()} className="mt-4">Retry</Button>
            </div>
          ) : filteredConnections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConnections.map((connection: NetworkConnection) => (
                <div key={connection.id} className="bg-card rounded-lg shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border-2 border-white">
                      <AvatarImage src={connection.avatarUrl} alt={connection.displayName} />
                      <AvatarFallback>{(connection.displayName || 'UN').substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/profile/${connection.username}`} className="font-semibold hover:underline">
                          {connection.displayName}
                        </Link>
                        <ConnectionBadge degree={connection.connectionDegree} />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{connection.headline}</p>
                      <p className="text-xs text-muted-foreground mt-1">
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
            <div className="bg-card rounded-lg shadow-sm p-8 text-center">
              <UsersRound size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium mb-1">No connections found</h3>
              {searchQuery ? (
                <p className="text-muted-foreground">No connections match your search criteria. Try a different search.</p>
              ) : (
                <p className="text-muted-foreground">You haven't connected with anyone yet. Check out our suggestions.</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations">
          {pendingLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingError ? (
            <div className="bg-card rounded-lg shadow-sm p-8 text-center">
              <h3 className="text-lg font-medium mb-2 text-destructive">Error Loading Invitations</h3>
              <p className="text-muted-foreground">There was an error loading your invitations. Please try again later.</p>
              <Button variant="outline" onClick={() => refetchPending()} className="mt-4">Retry</Button>
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map((request: PendingConnectionRequest) => (
                <div key={request.id} className="bg-card rounded-lg shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border-2 border-white">
                      <AvatarImage src={request.avatarUrl} alt={request.displayName} />
                      <AvatarFallback>{(request.displayName || 'UN').substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <Link to={`/profile/${request.username}`} className="font-semibold hover:underline">
                        {request.displayName}
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-2">{request.headline}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sent {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className="flex-1"
                      size="sm"
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={isResponding[request.id]}
                    >
                      <UserCheck size={16} className="mr-1" />
                      {isResponding[request.id] ? 'Accepting...' : 'Accept'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={isResponding[request.id]}
                    >
                      {isResponding[request.id] ? 'Declining...' : 'Decline'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow-sm p-8 text-center">
              <Bell size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium mb-1">No pending invitations</h3>
              <p className="text-muted-foreground">You don't have any pending connection requests at this time.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="suggestions">
          {suggestionsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : suggestionsError ? (
            <div className="bg-card rounded-lg shadow-sm p-8 text-center">
              <h3 className="text-lg font-medium mb-2 text-destructive">Error Loading Suggestions</h3>
              <p className="text-muted-foreground">There was an error loading connection suggestions. Please try again later.</p>
              <Button variant="outline" onClick={() => refetchSuggestions()} className="mt-4">Retry</Button>
            </div>
          ) : filteredSuggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuggestions.map((suggestion: NetworkSuggestion) => (
                <div key={suggestion.id} className="bg-card rounded-lg shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border-2 border-white">
                      <AvatarImage src={suggestion.avatarUrl} alt={suggestion.displayName} />
                      <AvatarFallback>{(suggestion.displayName || 'UN').substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/profile/${suggestion.username}`} className="font-semibold hover:underline">
                          {suggestion.displayName}
                        </Link>
                        <ConnectionBadge degree={suggestion.connectionDegree} />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{suggestion.headline}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.mutualConnections} mutual connections
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    {sentRequests.includes(suggestion.id) ? (
                      <Button 
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        disabled
                      >
                        <Clock size={16} className="mr-1" />
                        Pending
                      </Button>
                    ) : (
                      <Button 
                        className="flex-1 bg-primary hover:bg-primary/90"
                        size="sm"
                        onClick={() => handleConnect(suggestion.id)}
                        disabled={isConnecting[suggestion.id]}
                      >
                        {isConnecting[suggestion.id] ? 'Connecting...' : 'Connect'}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to={`/profile/${suggestion.username}`}>View Profile</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow-sm p-8 text-center">
              <UserRoundPlus size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium mb-1">No suggestions available</h3>
              <p className="text-muted-foreground">We couldn't find any connection suggestions at this time.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Understanding Connection Degrees</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ConnectionBadge degree={1} />
              <span className="font-medium">1st Degree Connections</span>
            </div>
            <p className="text-sm text-muted-foreground">People you are directly connected with. You both have accepted the connection.</p>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ConnectionBadge degree={2} />
              <span className="font-medium">2nd Degree Connections</span>
            </div>
            <p className="text-sm text-muted-foreground">People who are connected to your 1st-degree connections but not directly to you.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ConnectionsPage;
