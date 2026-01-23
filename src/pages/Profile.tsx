import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  School,
  Star,
  Link as LinkIcon,
  MapPin,
  Check,
  Users,
  Loader2,
  RefreshCw,
  MessageSquare,
  Edit,
  Activity,
  Clock,
  Bookmark,
  BookText,
  UserPlus,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConnectionBadge, { ConnectionDegree } from "@/components/ConnectionBadge";
import ProfileViewsWidget from "@/components/ProfileViewsWidget";
import ProfileBanner from "@/components/profile/ProfileBanner";
import AvatarWithStatus from "@/components/common/AvatarWithStatus";
import { recordProfileView } from "@/services/profileViewService";
import { supabase } from "@/integrations/supabase/client";
import FederationInfo from "@/components/FederationInfo";
import FediverseBadge from "@/components/FediverseBadge";
import { getUserProfileByUsername, getCurrentUserProfile, UserProfile } from "@/services/profileService";
import {
  getUserConnections,
  NetworkConnection,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getConnectionRelationship,
  ConnectionRelationship,
} from "@/services/connectionsService";
import UserPostsList from "@/components/UserPostsList";
import UserActivityList from "@/components/UserActivityList";
import UserArticlesList from "@/components/UserArticlesList";
import { SkillEndorsements } from "@/components/SkillEndorsements";
import { ProfileStats } from "@/components/profile/ProfileStats";
import FollowAuthorButton from "@/components/FollowAuthorButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { SEOHead } from "@/components/common/SEOHead";
import { ShareButton } from "@/components/common/ShareButton";
import { ShareProfileCard } from "@/components/profile/ShareProfileCard";

const ProfilePage = () => {
  const { usernameOrId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isRespondingToConnection, setIsRespondingToConnection] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const isAuthenticated = !!user;
  const currentUserId = user?.id || null;

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyHeader(window.scrollY > 280);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine if we should redirect to login
  useEffect(() => {
    if (!authLoading && !usernameOrId && !isAuthenticated) {
      navigate("/auth/login", { replace: true });
    }
  }, [authLoading, usernameOrId, isAuthenticated, navigate]);

  // Fetch profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["profile", usernameOrId, currentUserId],
    queryFn: async () => {
      if (!usernameOrId) {
        if (!isAuthenticated || !currentUserId) {
          return null;
        }
        const result = await getCurrentUserProfile();
        return result;
      } else {
        const result = await getUserProfileByUsername(usernameOrId);
        return result;
      }
    },
    enabled: !authLoading && (!!usernameOrId || (isAuthenticated && !!currentUserId)),
    retry: 1,
  });

  // Fetch user connections for the connections tab
  const { data: userConnections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["connections", profile?.id],
    queryFn: () => getUserConnections(),
    enabled: !!profile?.id && profile.networkVisibilityEnabled === true,
  });

  // Determine if viewing own profile
  const viewingOwnProfile = !usernameOrId || (profile && currentUserId === profile.id);

  // Fetch connection relationship status (for action button)
  const { data: connectionRelationship, isLoading: connectionRelationshipLoading } = useQuery({
    queryKey: ["connectionRelationship", currentUserId, profile?.id],
    queryFn: async () => {
      if (!profile?.id || !currentUserId) return null;
      return getConnectionRelationship(profile.id);
    },
    enabled: !!profile?.id && !!currentUserId && !viewingOwnProfile,
  });

  // Canonical URL redirect: if accessed via UUID but username exists, redirect to username URL
  useEffect(() => {
    if (profile?.username && usernameOrId) {
      // Check if usernameOrId looks like a UUID (simple pattern check)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId);
      if (isUUID && profile.username !== usernameOrId) {
        navigate(`/profile/${profile.username}`, { replace: true });
      }
    }
  }, [profile?.username, usernameOrId, navigate]);

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
      const { error } = await supabase.from("profiles").update({ header_url: url }).eq("id", profile.id);

      if (error) throw error;

      // Optimistically update the current query cache so the banner updates immediately
      queryClient.setQueryData(["profile", usernameOrId, currentUserId], (prev: any) => {
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
      toast.error(t("profile.mustBeLoggedIn", "You must be logged in to connect with others"));
      return;
    }

    setIsConnecting(true);
    try {
      await sendConnectionRequest(profile.id);
      queryClient.invalidateQueries({ queryKey: ["connectionRelationship", currentUserId, profile.id] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["userConnections"] });
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error(t("connections.errorLoading", "Failed to send connection request"));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAcceptConnection = async () => {
    if (!connectionRelationship?.connectionId) return;

    setIsRespondingToConnection(true);
    try {
      const ok = await acceptConnectionRequest(connectionRelationship.connectionId);
      if (ok && profile?.id) {
        queryClient.invalidateQueries({ queryKey: ["connectionRelationship", currentUserId, profile.id] });
        queryClient.invalidateQueries({ queryKey: ["connections"] });
        queryClient.invalidateQueries({ queryKey: ["userConnections"] });
      }
    } finally {
      setIsRespondingToConnection(false);
    }
  };

  const handleDeclineConnection = async () => {
    if (!connectionRelationship?.connectionId) return;

    setIsRespondingToConnection(true);
    try {
      const ok = await rejectConnectionRequest(connectionRelationship.connectionId);
      if (ok && profile?.id) {
        queryClient.invalidateQueries({ queryKey: ["connectionRelationship", currentUserId, profile.id] });
        queryClient.invalidateQueries({ queryKey: ["connections"] });
        queryClient.invalidateQueries({ queryKey: ["userConnections"] });
      }
    } finally {
      setIsRespondingToConnection(false);
    }
  };

  // Handle sync from Fediverse
  const handleSyncFromFediverse = async () => {
    setIsSyncing(true);
    try {
      const response = await supabase.functions.invoke("sync-federated-profile");

      if (response.error) {
        throw new Error(response.error.message || "Sync failed");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success(t("profile.syncSuccess", "Profile synced successfully from your Fediverse instance!"));
      window.location.reload();
    } catch (error: any) {
      console.error("Error syncing profile:", error);
      toast.error(error.message || t("profile.syncFailed", "Failed to sync profile"));
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
          <h2 className="text-2xl font-bold mb-2 text-destructive">
            {t("profile.errorLoading", "Error Loading Profile")}
          </h2>
          <p>{t("profile.errorLoadingDesc", "There was an error loading the profile. Please try again later.")}</p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            {t("profile.returnHome", "Return Home")}
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
          <h2 className="text-2xl font-bold mb-2">{t("profile.notFound", "Profile Not Found")}</h2>
          <p>
            {t(
              "profile.notFoundDesc",
              "The profile you're looking for doesn't exist or you don't have permission to view it.",
            )}
          </p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            {t("profile.returnHome", "Return Home")}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const displayUsername = usernameOrId || profile.username;
  const connectionDegreeValue =
    profile.connectionDegree !== undefined ? (profile.connectionDegree as ConnectionDegree) : null;
  const avatarStatus = profile.isVerified ? "verified" : profile.authType === "federated" ? "remote" : "none";

  return (
    <DashboardLayout showHeader={false}>
      {/* SEO Meta Tags for social sharing */}
      <SEOHead
        title={`${profile.displayName} (@${profile.username})`}
        description={profile.headline || profile.bio || `View ${profile.displayName}'s professional profile on Nolto`}
        image={profile.avatarUrl || "/og-image.png"}
        url={`${window.location.origin}/profile/${profile.username}`}
        type="profile"
      />
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
              isFreelancer={profile.isFreelancer}
            />
            <div>
              <p className="font-semibold text-sm">{profile.displayName}</p>
              <p className="text-xs text-muted-foreground">@{displayUsername}</p>
            </div>
          </div>
          {!viewingOwnProfile && isAuthenticated && (
            <>
              {connectionRelationship?.status === "accepted" ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Check size={12} /> {t("profile.connected", "Connected")}
                </Badge>
              ) : connectionRelationship?.status === "pending_outgoing" ? (
                <Button size="sm" variant="secondary" disabled>
                  <Clock className="h-4 w-4 mr-1" /> {t("profile.pending", "Pending")}
                </Button>
              ) : connectionRelationship?.status === "pending_incoming" ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={handleAcceptConnection}
                    disabled={isRespondingToConnection}
                    loading={isRespondingToConnection}
                  >
                    {t("profile.accept", "Accept")}
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={handleConnect} disabled={isConnecting} loading={isConnecting}>
                  {t("profile.connect", "Connect")}
                </Button>
              )}
            </>
          )}
          {!viewingOwnProfile && !isAuthenticated && (
            <Button size="sm" asChild>
              <Link to="/auth/signup">
                <UserPlus className="h-4 w-4 mr-1" /> Sign up to connect
              </Link>
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
            <div className="flex items-end gap-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="shrink-0"
              >
                <AvatarWithStatus
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  fallback={profile.displayName?.substring(0, 2)}
                  status={avatarStatus}
                  size="2xl"
                  ringClassName={profile.isVerified ? "ring-primary" : "ring-background"}
                  isFreelancer={profile.isFreelancer}
                />
              </motion.div>

              {/* Stats next to avatar - HIDDEN */}
              <div className="hidden md:block pb-2">
                {/* <ProfileStats userId={profile.id} username={profile.username} compact /> */}
              </div>
            </div>

            {/* Action buttons - positioned on the right on desktop */}
            <div className="flex-1 flex flex-wrap gap-2 md:justify-end md:pb-2">
              {viewingOwnProfile ? (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/profile/edit">
                      <Edit className="h-4 w-4 mr-2" />
                      {t("profile.editProfile", "Edit Profile")}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/saved">
                      <Bookmark className="h-4 w-4 mr-2" />
                      {t("profile.saved", "Saved")}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/connections">
                      <Users className="h-4 w-4 mr-2" />
                      {t("profile.connections", "Connections")}
                    </Link>
                  </Button>
                  {profile.authType === "federated" && profile.homeInstance && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncFromFediverse}
                      disabled={isSyncing}
                      loading={isSyncing}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
                      {t("profile.sync", "Sync")}
                    </Button>
                  )}
                </>
              ) : isAuthenticated ? (
                <>
                  {connectionRelationship?.status === "accepted" ? (
                    <>
                      <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                        <Check size={14} /> {t("profile.connected", "Connected")}
                      </Badge>
                      <Button onClick={() => navigate(`/messages/${profile.id}`)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t("profile.message", "Message")}
                      </Button>
                    </>
                  ) : connectionRelationship?.status === "pending_outgoing" ? (
                    <>
                      <Button variant="secondary" disabled>
                        <Clock className="h-4 w-4 mr-2" /> {t("profile.pending", "Pending")}
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" disabled>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {t("profile.message", "Message")}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("profile.connectFirstToMessage", "Connect first to send messages")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  ) : connectionRelationship?.status === "pending_incoming" ? (
                    <>
                      <Button
                        onClick={handleAcceptConnection}
                        disabled={isRespondingToConnection}
                        loading={isRespondingToConnection}
                      >
                        {t("profile.accept", "Accept")}
                      </Button>
                      <Button variant="outline" onClick={handleDeclineConnection} disabled={isRespondingToConnection}>
                        {t("profile.decline", "Decline")}
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" disabled>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {t("profile.message", "Message")}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("profile.connectFirstToMessage", "Connect first to send messages")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleConnect} disabled={isConnecting} loading={isConnecting}>
                        {t("profile.connect", "Connect")}
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" disabled>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {t("profile.message", "Message")}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("profile.connectFirstToMessage", "Connect first to send messages")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                  <ShareButton
                    url={`${window.location.origin}/profile/${profile.username}`}
                    title={`${profile.displayName} on Nolto`}
                    description={profile.headline || profile.bio || undefined}
                    variant="outline"
                    size="icon"
                  />
                </>
              ) : (
                <>
                  <Button asChild>
                    <Link to="/auth/signup">
                      <UserPlus className="h-4 w-4 mr-2" /> Sign up to connect
                    </Link>
                  </Button>
                  <ShareButton
                    url={`${window.location.origin}/profile/${profile.username}`}
                    title={`${profile.displayName} on Nolto`}
                    description={profile.headline || profile.bio || undefined}
                    variant="outline"
                    size="icon"
                  />
                </>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              {profile.isVerified && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1"
                >
                  <Check size={12} /> {t("profile.verified", "Verified")}
                </Badge>
              )}
              {profile.authType === "federated" && profile.homeInstance && (
                <FediverseBadge homeInstance={profile.homeInstance} />
              )}
              {connectionDegreeValue && <ConnectionBadge degree={connectionDegreeValue} />}
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
                <LinkIcon size={14} />
                <span className="font-medium">@{profile.username}</span>
              </div>
            </div>

            {/* Mobile stats - HIDDEN */}
            <div className="md:hidden mb-4">
              {/* <ProfileStats userId={profile.id} username={profile.username} /> */}
            </div>

            {profile.bio && <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{profile.bio}</p>}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="experience" className="mb-6">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="mb-4 flex w-max md:w-auto md:flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger
                  value="experience"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                >
                  {t("profile.experience", "Experience")}
                </TabsTrigger>
                <TabsTrigger
                  value="education"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                >
                  {t("profile.education", "Education")}
                </TabsTrigger>
                <TabsTrigger
                  value="skills"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                >
                  {t("profile.skills", "Skills")}
                </TabsTrigger>
                <TabsTrigger
                  value="articles"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                >
                  {t("profile.articles", "Articles")}
                </TabsTrigger>
                {/* Posts tab commented out for now
                <TabsTrigger
                  value="posts"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                >
                  {t("profile.posts", "Posts")}
                </TabsTrigger>
                */}
                <TabsTrigger
                  value="activity"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                >
                  {t("profile.activity", "Activity")}
                </TabsTrigger>
                <TabsTrigger
                  value="connections"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                >
                  {t("profile.connections", "Connections")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="experience">
              <Card variant="elevated">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-primary" />
                    {t("profile.experience", "Experience")}
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
                              <Badge
                                variant="outline"
                                className="bg-accent text-accent-foreground flex items-center gap-1"
                              >
                                <Check size={14} /> {t("verification.verified", "Verified")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-primary font-medium">{exp.company}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(exp.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short" })} -
                            {exp.isCurrentRole
                              ? ` ${t("profileEdit.present", "Present")}`
                              : ` ${new Date(exp.endDate).toLocaleDateString("en-US", { year: "numeric", month: "short" })}`}
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
                      <p>{t("profile.experience", "Experience")}</p>
                      {viewingOwnProfile && (
                        <Button variant="outline" className="mt-4" asChild>
                          <Link to="/profile/edit">{t("profileEdit.addExperience", "Add Experience")}</Link>
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
                    {t("profile.education", "Education")}
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
                              <Badge
                                variant="outline"
                                className="bg-accent text-accent-foreground flex items-center gap-1"
                              >
                                <Check size={14} /> {t("verification.verified", "Verified")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-primary font-medium">
                            {edu.degree}
                            {edu.field ? `, ${edu.field}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {edu.startYear} - {edu.endYear || t("profileEdit.present", "Present")}
                          </p>
                          <Separator className="mt-6" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <School className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>{t("profile.education", "Education")}</p>
                      {viewingOwnProfile && (
                        <Button variant="outline" className="mt-4" asChild>
                          <Link to="/profile/edit">{t("profileEdit.addEducation", "Add Education")}</Link>
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
                    {t("profile.skills", "Skills")} & {t("skills.endorsements", "Endorsements")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {viewingOwnProfile
                      ? t("skills.addSkillsDesc", "Add skills to let your connections endorse your expertise")
                      : t("skills.skillsAppearDesc", "Skills will appear here once they're added")}
                  </p>

                  <SkillEndorsements userId={profile.id} isOwnProfile={viewingOwnProfile} />

                  {viewingOwnProfile && (!profile.skills || profile.skills.length === 0) && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" asChild>
                        <Link to="/profile/edit">{t("profileEdit.addSkill", "Add Skill")}</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="articles">
              <Card variant="elevated">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookText size={20} className="text-primary" />
                    {t("profile.articles", "Articles")}
                  </h3>

                  <UserArticlesList userId={profile.id} isOwnProfile={viewingOwnProfile} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Posts tab content commented out for now
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
            */}

            <TabsContent value="activity">
              <Card variant="elevated">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-primary" />
                    Activity
                  </h3>

                  <UserActivityList userId={profile.id} />
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
            <ShareProfileCard
              username={profile.username}
              displayName={profile.displayName}
            />
          )}
          
          {viewingOwnProfile && <ProfileViewsWidget userId={profile.id} />}

          {!viewingOwnProfile && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold mb-3">Follow for Articles</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get notified when {profile.displayName?.split(" ")[0] || "this user"} publishes new articles
                </p>
                <FollowAuthorButton
                  authorId={profile.id}
                  authorName={profile.displayName || undefined}
                  className="w-full"
                />
              </CardContent>
            </Card>
          )}

          {profile.authType === "federated" && profile.username && (
            <FederationInfo username={profile.username} isOwnProfile={viewingOwnProfile} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
