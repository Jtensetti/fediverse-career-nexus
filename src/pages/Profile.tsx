import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { User, Briefcase, School, Award, Star, Link as LinkIcon, Mail, Phone, MapPin, Check, Users, Loader2, RefreshCw, MessageSquare, Share2, Edit } from "lucide-react";
import ConnectionBadge, { ConnectionDegree } from "@/components/ConnectionBadge";
import ProfileViewsWidget from "@/components/ProfileViewsWidget";
import ProfileBanner from "@/components/profile/ProfileBanner";
import AvatarWithStatus from "@/components/common/AvatarWithStatus";
import { recordProfileView } from "@/services/profileViewService";
import { supabase } from "@/integrations/supabase/client";
import FederationInfo from "@/components/FederationInfo";
import FediverseBadge from "@/components/FediverseBadge";
import { getUserProfileByUsername, getCurrentUserProfile, UserProfile } from "@/services/profileService";
import { getUserConnections, NetworkConnection, sendConnectionRequest } from "@/services/connectionsService";
import UserPostsList from "@/components/UserPostsList";
import { SkillEndorsements } from "@/components/SkillEndorsements";
import AchievementBadges from "@/components/AchievementBadges";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  
  const isAuthenticated = !!user;
  const currentUserId = user?.id || null;
  
  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyHeader(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Determine if we should redirect to login
  useEffect(() => {
    if (!authLoading && !username && !isAuthenticated) {
      navigate("/auth/login", { replace: true });
    }
  }, [authLoading, username, isAuthenticated, navigate]);
  
  // Fetch profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["profile", username, currentUserId],
    queryFn: async () => {
      if (!username) {
        if (!isAuthenticated || !currentUserId) {
          return null;
        }
        const result = await getCurrentUserProfile();
        return result;
      } else {
        const result = await getUserProfileByUsername(username);
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

  // Handle header image update
  const handleHeaderChange = async (url: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ header_url: url })
        .eq('id', profile.id);

      if (error) throw error;

      // Optimistically update the current query cache so the banner updates immediately
      queryClient.setQueryData(["profile", username, currentUserId], (prev: any) => {
        if (!prev) return prev;
        return { ...prev, headerUrl: url };
      });

      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) {
      console.error("Error updating header:", error);
      toast.error("Failed to update header image");
    }
  };
  
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
  
  // Handle sync from Fediverse
  const handleSyncFromFediverse = async () => {
    setIsSyncing(true);
    try {
      const response = await supabase.functions.invoke('sync-federated-profile');
      
      if (response.error) {
        throw new Error(response.error.message || 'Sync failed');
      }
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      
      toast.success("Profile synced successfully from your Fediverse instance!");
      window.location.reload();
    } catch (error: any) {
      console.error("Error syncing profile:", error);
      toast.error(error.message || "Failed to sync profile");
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Show loading while checking auth
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (profileError) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2 text-destructive">Error Loading Profile</h2>
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
  
  const displayUsername = username || profile.username;
  const connectionDegreeValue = profile.connectionDegree !== undefined ? profile.connectionDegree as ConnectionDegree : null;
  const avatarStatus = profile.isVerified ? "verified" : (profile.authType === 'federated' ? "remote" : "none");
  
  return (
    <DashboardLayout showHeader={false}>
      {/* Sticky Mini Header */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: showStickyHeader ? 0 : -100, opacity: showStickyHeader ? 1 : 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
      >
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarWithStatus
              src={profile.avatarUrl}
              alt={profile.displayName}
              fallback={profile.displayName?.substring(0, 2)}
              status={avatarStatus}
              size="sm"
            />
            <div>
              <p className="font-semibold text-sm">{profile.displayName}</p>
              <p className="text-xs text-muted-foreground">@{displayUsername}</p>
            </div>
          </div>
          {!viewingOwnProfile && (
            <Button size="sm" onClick={handleConnect} disabled={isConnecting} loading={isConnecting}>
              Connect
            </Button>
          )}
        </div>
      </motion.div>

      {/* Profile Header with Banner */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden mb-6">
        {/* Banner */}
        <ProfileBanner
          headerUrl={profile.headerUrl}
          isOwnProfile={viewingOwnProfile}
          onHeaderChange={handleHeaderChange}
        />
        
        {/* Profile Info - overlapping the banner */}
        <div className="relative px-4 md:px-6 pb-6">
          {/* Avatar */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16 md:-mt-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <AvatarWithStatus
                src={profile.avatarUrl}
                alt={profile.displayName}
                fallback={profile.displayName?.substring(0, 2)}
                status={avatarStatus}
                size="2xl"
                ringClassName={profile.isVerified ? "ring-primary" : "ring-background"}
              />
            </motion.div>
            
            {/* Action buttons - positioned on the right on desktop */}
            <div className="flex-1 flex flex-wrap gap-2 md:justify-end md:pb-2">
              {viewingOwnProfile ? (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/profile/edit">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/connections">
                      <Users className="h-4 w-4 mr-2" />
                      Connections
                    </Link>
                  </Button>
                  {profile.authType === 'federated' && profile.homeInstance && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSyncFromFediverse}
                      disabled={isSyncing}
                      loading={isSyncing}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
                      Sync
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleConnect}
                    disabled={isConnecting}
                    loading={isConnecting}
                  >
                    Connect
                  </Button>
                  <Button variant="outline" size="icon">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Profile Details */}
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              {profile.isVerified && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                  <Check size={12} /> Verified
                </Badge>
              )}
              {profile.authType === 'federated' && profile.homeInstance && (
                <FediverseBadge homeInstance={profile.homeInstance} />
              )}
              {connectionDegreeValue && (
                <ConnectionBadge degree={connectionDegreeValue} />
              )}
            </div>
            
            <h2 className="text-lg text-muted-foreground mb-3">{profile.headline}</h2>
            
            <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-x-4 gap-y-2 mb-4">
              {profile.contact?.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  <span>{profile.contact.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users size={14} />
                <Link to="/connections" className="hover:underline hover:text-primary transition-colors">
                  {profile.connections} connections
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <LinkIcon size={14} />
                <span className="font-medium">@{profile.username}</span>
              </div>
            </div>
            
            {profile.bio && (
              <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="experience" className="mb-6">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="mb-4 flex w-max md:w-auto md:flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="experience" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">Experience</TabsTrigger>
                <TabsTrigger value="education" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">Education</TabsTrigger>
                <TabsTrigger value="skills" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">Skills</TabsTrigger>
                <TabsTrigger value="posts" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">Posts</TabsTrigger>
                <TabsTrigger value="connections" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap">Connections</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="experience">
              <Card variant="elevated">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-primary" />
                    Experience
                  </h3>
                  
                  {profile.experience && profile.experience.length > 0 ? (
                    <div className="space-y-6">
                      {profile.experience.map((exp) => (
                        <motion.div 
                          key={exp.id} 
                          className="pb-6"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium">{exp.title}</h4>
                            {exp.isVerified && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
                                <Check size={14} /> Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-primary font-medium">{exp.company}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(exp.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} - 
                            {exp.isCurrentRole ? ' Present' : 
                            ` ${new Date(exp.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}`}
                          </p>
                          {exp.location && <p className="text-sm text-muted-foreground">{exp.location}</p>}
                          {exp.description && <p className="mt-2 text-muted-foreground">{exp.description}</p>}
                          <Separator className="mt-6" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No experience information available</p>
                      {viewingOwnProfile && (
                        <Button variant="outline" className="mt-4" asChild>
                          <Link to="/profile/edit">Add Experience</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="education">
              <Card variant="elevated">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <School size={20} className="text-primary" />
                    Education
                  </h3>
                  
                  {profile.education && profile.education.length > 0 ? (
                    <div className="space-y-6">
                      {profile.education.map((edu) => (
                        <motion.div 
                          key={edu.id} 
                          className="pb-6"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium">{edu.institution}</h4>
                            {edu.isVerified && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
                                <Check size={14} /> Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-primary font-medium">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</p>
                          <p className="text-sm text-muted-foreground">{edu.startYear} - {edu.endYear || 'Present'}</p>
                          <Separator className="mt-6" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <School className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No education information available</p>
                      {viewingOwnProfile && (
                        <Button variant="outline" className="mt-4" asChild>
                          <Link to="/profile/edit">Add Education</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="skills">
              <Card variant="elevated">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Star size={20} className="text-primary" />
                    Skills & Endorsements
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {viewingOwnProfile 
                      ? "Add skills to showcase your expertise. Your connections can endorse your skills to validate your abilities."
                      : "Endorse skills to validate this person's expertise and help others understand their strengths."}
                  </p>
                  
                  <SkillEndorsements 
                    userId={profile.id} 
                    isOwnProfile={viewingOwnProfile} 
                  />
                  
                  {viewingOwnProfile && (!profile.skills || profile.skills.length === 0) && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" asChild>
                        <Link to="/profile/edit">Add Skills</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="posts">
              <Card variant="elevated">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-primary" />
                    Posts
                  </h3>
                  
                  <UserPostsList userId={profile.id} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="connections">
              <Card variant="elevated">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users size={20} className="text-primary" />
                    Connections
                  </h3>
                  
                  {profile.networkVisibilityEnabled === false ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Connections are hidden</p>
                    </div>
                  ) : connectionsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : userConnections && userConnections.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {userConnections.slice(0, 6).map((connection: NetworkConnection) => (
                        <Link
                          key={connection.id}
                          to={`/profile/${connection.username}`}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <AvatarWithStatus
                            src={connection.avatarUrl}
                            alt={connection.displayName}
                            fallback={connection.displayName?.substring(0, 2)}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{connection.displayName}</p>
                            <p className="text-sm text-muted-foreground truncate">{connection.headline}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No connections yet</p>
                    </div>
                  )}
                  
                  {userConnections && userConnections.length > 6 && (
                    <div className="text-center mt-4">
                      <Button variant="outline" asChild>
                        <Link to="/connections">View All Connections</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {viewingOwnProfile && (
            <ProfileViewsWidget userId={profile.id} />
          )}
          
          <AchievementBadges userId={profile.id} />
          
          {profile.authType === 'federated' && profile.username && (
            <FederationInfo
              username={profile.username}
              isOwnProfile={viewingOwnProfile}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
