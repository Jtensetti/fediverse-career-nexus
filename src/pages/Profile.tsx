import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { User, Briefcase, School, Award, Star, Link as LinkIcon, Mail, Phone, MapPin, Check, Users, Loader2 } from "lucide-react";
import ConnectionBadge, { ConnectionDegree } from "@/components/ConnectionBadge";
import ProfileViewsWidget from "@/components/ProfileViewsWidget";
import { recordProfileView } from "@/services/profileViewService";
import { supabase } from "@/integrations/supabase/client";
import FederationInfo from "@/components/FederationInfo";
import { getUserProfileByUsername, getCurrentUserProfile, UserProfile } from "@/services/profileService";
import { getUserConnections, NetworkConnection, sendConnectionRequest } from "@/services/connectionsService";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  // Check authentication status
  useEffect(() => {
    console.log('Profile: Setting up auth check');
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Profile: Current session:', session?.user?.email);
        setIsAuthenticated(!!session);
        setCurrentUserId(session?.user?.id || null);
      } catch (error) {
        console.error('Profile: Error checking auth:', error);
        setIsAuthenticated(false);
        setCurrentUserId(null);
      } finally {
        setAuthLoading(false);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Profile: Auth state changed:', event, session?.user?.email);
      setIsAuthenticated(!!session);
      setCurrentUserId(session?.user?.id || null);
      setAuthLoading(false);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Determine if we should redirect to login
  useEffect(() => {
    // If no username is provided and user is not authenticated, redirect to login
    if (!authLoading && !username && !isAuthenticated) {
      console.log('Profile: Redirecting to login (no username and not authenticated)');
      navigate("/auth/login", { replace: true });
    }
  }, [authLoading, username, isAuthenticated, navigate]);
  
  // Fetch current user profile if no username provided, otherwise fetch the specified profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["profile", username, currentUserId],
    queryFn: async () => {
      console.log('Profile: Fetching profile data for:', username || 'current user');
      
      if (!username) {
        // Viewing own profile - require authentication
        if (!isAuthenticated || !currentUserId) {
          console.log('Profile: Not authenticated for own profile');
          return null;
        }
        const result = await getCurrentUserProfile();
        console.log('Profile: Current user profile:', result);
        return result;
      } else {
        // Viewing someone else's profile
        const result = await getUserProfileByUsername(username);
        console.log('Profile: User profile by username:', result);
        return result;
      }
    },
    enabled: !authLoading && (!!username || (isAuthenticated && !!currentUserId)),
    retry: 1
  });
  
  // Fetch user connections for the connections tab
  const { data: userConnections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["connections", profile?.id],
    queryFn: () => getUserConnections(),
    enabled: !!profile?.id && profile.networkVisibilityEnabled === true
  });
  
  // Determine if viewing own profile
  const viewingOwnProfile = !username || (profile && currentUserId === profile.id);
  
  // Record profile view when visiting another user's profile
  useEffect(() => {
    if (!viewingOwnProfile && profile?.id && isAuthenticated) {
      recordProfileView(profile.id);
    }
  }, [profile?.id, viewingOwnProfile, isAuthenticated]);
  
  // Handle connect button
  const handleConnect = async () => {
    if (!profile?.id || !isAuthenticated) {
      toast.error("You must be logged in to connect with others");
      return;
    }
    
    setIsConnecting(true);
    try {
      await sendConnectionRequest(profile.id);
      toast.success(`Connection request sent to ${profile.displayName}`);
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error("Failed to send connection request");
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Show loading while checking auth
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-bondy-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (profileError) {
    console.error('Profile: Profile error:', profileError);
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Error Loading Profile</h2>
          <p>There was an error loading the profile. Please try again later.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-bondy-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p>The profile you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  // The username to display
  const displayUsername = username || profile.username;
  
  // Safely handle connectionDegree for display
  const connectionDegreeValue = profile.connectionDegree !== undefined ? profile.connectionDegree as ConnectionDegree : null;
  
  return (
    <DashboardLayout showHeader={false}>
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-white shadow-md">
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
              <AvatarFallback>{profile.displayName.substring(0, 2)}</AvatarFallback>
            </Avatar>
            {connectionDegreeValue && (
              <div className="absolute -bottom-2 -right-2">
                <ConnectionBadge degree={connectionDegreeValue} />
              </div>
            )}
          </div>
          
          <div className="flex-grow">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              {profile.isVerified && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 flex items-center gap-1">
                  <Check size={14} /> Verified
                </Badge>
              )}
              {connectionDegreeValue && (
                <ConnectionBadge degree={connectionDegreeValue} />
              )}
            </div>
            
            <h2 className="text-xl text-gray-700 mb-3">{profile.headline}</h2>
            
            <div className="flex flex-wrap items-center text-sm text-gray-600 gap-x-4 gap-y-2 mb-4">
              {profile.contact?.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={16} />
                  <span>{profile.contact.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users size={16} />
                <Link to="/connections" className="hover:underline">{profile.connections} connections</Link>
              </div>
              <div className="flex items-center gap-1">
                <LinkIcon size={16} />
                <span>@{profile.username}</span>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4">{profile.bio}</p>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {viewingOwnProfile ? (
                <>
                  <Button variant="outline">
                    <Link to="/profile/edit">Edit Profile</Link>
                  </Button>
                  <Button variant="outline">
                    <Link to="/connections">Manage Connections</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    className="bg-bondy-primary hover:bg-bondy-primary/90" 
                    onClick={handleConnect}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Sending...' : 'Connect'}
                  </Button>
                  <Button variant="outline">Message</Button>
                  <Button variant="outline">Share Profile</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="experience" className="mb-6">
            <TabsList className="mb-4">
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>
            
            <TabsContent value="experience">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-bondy-primary" />
                    Experience
                  </h3>
                  
                  {profile.experience && profile.experience.length > 0 ? (
                    <div className="space-y-6">
                      {profile.experience.map((exp) => (
                        <div key={exp.id} className="pb-6">
                          <div className="flex justify-between">
                            <h4 className="font-medium">{exp.title}</h4>
                            {exp.isVerified && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
                                <Check size={14} /> Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-bondy-primary">{exp.company}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(exp.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} - 
                            {exp.isCurrentRole ? ' Present' : 
                            ` ${new Date(exp.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}`}
                          </p>
                          {exp.location && <p className="text-sm text-gray-600">{exp.location}</p>}
                          {exp.description && <p className="mt-2">{exp.description}</p>}
                          <Separator className="mt-6" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No experience information available</p>
                      {viewingOwnProfile && (
                        <Button variant="outline" className="mt-4">
                          <Link to="/profile/edit">Add Experience</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="education">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <School size={20} className="text-bondy-primary" />
                    Education
                  </h3>
                  
                  {profile.education && profile.education.length > 0 ? (
                    <div className="space-y-6">
                      {profile.education.map((edu) => (
                        <div key={edu.id} className="pb-6">
                          <div className="flex justify-between">
                            <h4 className="font-medium">{edu.institution}</h4>
                            {edu.isVerified && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
                                <Check size={14} /> Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-bondy-primary">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</p>
                          <p className="text-sm text-gray-600">{edu.startYear} - {edu.endYear || 'Present'}</p>
                          <Separator className="mt-6" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No education information available</p>
                      {viewingOwnProfile && (
                        <Button variant="outline" className="mt-4">
                          <Link to="/profile/edit">Add Education</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="skills">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Star size={20} className="text-bondy-primary" />
                    Skills
                  </h3>
                  
                  {profile.skills && profile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {profile.skills.map((skill) => (
                        <div key={skill.id} className="bg-gray-100 rounded-lg p-3 flex flex-col">
                          <span className="font-medium">{skill.name}</span>
                          <span className="text-sm text-gray-600">{skill.endorsements} endorsements</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No skills listed</p>
                      {viewingOwnProfile && (
                        <Button variant="outline" className="mt-4">
                          <Link to="/profile/edit">Add Skills</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="articles">
              <Card>
                <CardContent className="pt-6 flex items-center justify-center p-12">
                  <div className="text-center text-gray-500">
                    <p>No articles published yet</p>
                    {viewingOwnProfile && (
                      <Button variant="outline" className="mt-4">
                        <Link to="/articles/create">Write an Article</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="connections">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users size={20} className="text-bondy-primary" />
                    Connections ({profile.connections})
                  </h3>
                  
                  {connectionsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-bondy-primary" />
                    </div>
                  ) : profile.networkVisibilityEnabled && userConnections && userConnections.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {userConnections.slice(0, 8).map((connection: NetworkConnection) => (
                        <Link 
                          to={`/profile/${connection.username}`} 
                          key={connection.id} 
                          className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Avatar className="h-16 w-16 mb-2">
                            <AvatarImage src={connection.avatarUrl} alt={connection.displayName} />
                            <AvatarFallback>{connection.displayName.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <p className="font-medium">{connection.displayName}</p>
                              <ConnectionBadge degree={connection.connectionDegree} showIcon={false} size="sm" />
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">{connection.headline}</p>
                          </div>
                        </Link>
                      ))}
                      
                      {userConnections.length > 8 && (
                        <Link 
                          to="/connections" 
                          className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                            <Users size={24} className="text-gray-500" />
                          </div>
                          <p className="font-medium text-bondy-primary">View All</p>
                        </Link>
                      )}
                    </div>
                  ) : !profile.networkVisibilityEnabled ? (
                    <div className="text-center p-8 text-gray-500">
                      <Users size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="mb-2">This user has chosen not to display their network connections</p>
                    </div>
                  ) : (
                    <div className="text-center p-8 text-gray-500">
                      <Users size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="mb-2">No connections yet</p>
                      <Button variant="outline" asChild>
                        <Link to="/connections">Find connections</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Contact Information */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              
              <div className="space-y-3">
                {profile.contact?.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-bondy-primary" />
                    <span>{profile.contact.email}</span>
                  </div>
                )}
                
                {profile.contact?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-bondy-primary" />
                    <span>{profile.contact.phone}</span>
                  </div>
                )}
                
                {profile.contact?.location && (
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-bondy-primary" />
                    <span>{profile.contact.location}</span>
                  </div>
                )}
                
                {!profile.contact?.email && !profile.contact?.phone && !profile.contact?.location && (
                  <p className="text-gray-500">No contact information available</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Federation Information */}
          <FederationInfo 
            username={displayUsername}
            isOwnProfile={viewingOwnProfile}
          />
        </div>
        
        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Only show profile views widget if viewing own profile and authenticated */}
          {viewingOwnProfile && isAuthenticated && currentUserId && (
            <ProfileViewsWidget userId={currentUserId} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
