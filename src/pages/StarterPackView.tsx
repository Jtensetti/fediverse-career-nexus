import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead, ShareButton } from "@/components/common";
import { Package, Users, UserPlus, Check, ArrowLeft } from "lucide-react";
import { getStarterPackBySlug, followStarterPack, unfollowStarterPack, type StarterPackWithMembers } from "@/services/starterPackService";
import { followAuthor, isFollowingAuthor } from "@/services/authorFollowService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const StarterPackView = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [followingAll, setFollowingAll] = useState(false);
  const [followedMembers, setFollowedMembers] = useState<Set<string>>(new Set());

  const { data: pack, isLoading, error } = useQuery({
    queryKey: ['starterPack', slug],
    queryFn: () => getStarterPackBySlug(slug || ''),
    enabled: !!slug,
  });

  const handleFollowAll = async () => {
    if (!pack || !user) { toast.error(t('starterPacks.signInToFollow')); return; }
    setFollowingAll(true);
    const success = await followStarterPack(pack.id);
    setFollowingAll(false);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['starterPack', slug] });
      setFollowedMembers(new Set(pack.members.map(m => m.user_id)));
    }
  };

  const handleUnfollowPack = async () => {
    if (!pack) return;
    const success = await unfollowStarterPack(pack.id);
    if (success) queryClient.invalidateQueries({ queryKey: ['starterPack', slug] });
  };

  const handleFollowMember = async (memberId: string) => {
    if (!user) { toast.error(t('starterPacks.signInToFollow')); return; }
    const success = await followAuthor(memberId);
    if (success) {
      setFollowedMembers(prev => new Set([...prev, memberId]));
      toast.success(t('starterPacks.followed'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-32 w-full mb-6" />
          <div className="grid gap-4">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">{t("starterPacks.packNotFound")}</h2>
            <p className="text-muted-foreground mb-4">{t("starterPacks.packNotFoundDesc")}</p>
            <Button asChild><Link to="/packs">{t("starterPacks.browsePacks")}</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={`${pack.name} - ${t("starterPacks.title")}`} description={pack.description || `${t("starterPacks.title")} - ${pack.name}`} type="website" />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6"><Link to="/packs"><ArrowLeft className="h-4 w-4 mr-2" />{t("starterPacks.backToPacks")}</Link></Button>
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center"><Package className="h-8 w-8 text-primary" /></div>
                <div><CardTitle className="text-2xl">{pack.name}</CardTitle>{pack.category && (<Badge variant="secondary" className="mt-1">{pack.category}</Badge>)}</div>
              </div>
              <div className="flex items-center gap-2">
                <ShareButton url={`${window.location.origin}/packs/${pack.slug}`} title={`${pack.name} - Nolto`} />
                {user && (pack.isFollowed ? (
                  <Button variant="outline" onClick={handleUnfollowPack}><Check className="h-4 w-4 mr-2" />{t("followAuthor.following")}</Button>
                ) : (
                  <Button onClick={handleFollowAll} disabled={followingAll}><UserPlus className="h-4 w-4 mr-2" />{followingAll ? t("starterPacks.followingAll") : t("starterPacks.followAll")}</Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pack.description && (<p className="text-muted-foreground mb-4">{pack.description}</p>)}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{pack.member_count} {t("starterPacks.members")}</span></div>
              <div className="flex items-center gap-2"><UserPlus className="h-4 w-4" /><span>{pack.follower_count} {t("starterPacks.followers")}</span></div>
            </div>
          </CardContent>
        </Card>
        <h2 className="text-xl font-semibold mb-4">{t("starterPacks.membersTitle")}</h2>
        <div className="space-y-3">
          {pack.members.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">{t("starterPacks.noMembers")}</CardContent></Card>
          ) : (
            pack.members.map((member) => {
              const isFollowed = followedMembers.has(member.user_id) || pack.isFollowed;
              return (
                <Card key={member.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <Link to={`/profile/${member.user?.username || member.user_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar className="h-12 w-12">{member.user?.avatar_url && (<AvatarImage src={member.user.avatar_url} />)}<AvatarFallback className="bg-primary/10 text-primary">{(member.user?.fullname || member.user?.username || '?').charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">{member.user?.fullname || member.user?.username || 'Unknown'}{member.user?.is_verified && (<Badge variant="secondary" className="text-xs">{t("profile.verified")}</Badge>)}</div>
                          {member.user?.username && (<div className="text-sm text-muted-foreground">@{member.user.username}</div>)}
                          {member.user?.headline && (<div className="text-sm text-muted-foreground line-clamp-1">{member.user.headline}</div>)}
                        </div>
                      </Link>
                      {user && user.id !== member.user_id && (
                        <Button variant={isFollowed ? "outline" : "default"} size="sm" onClick={() => !isFollowed && handleFollowMember(member.user_id)} disabled={isFollowed}>
                          {isFollowed ? (<><Check className="h-4 w-4 mr-1" />{t("followAuthor.following")}</>) : (<><UserPlus className="h-4 w-4 mr-1" />{t("followAuthor.follow")}</>)}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StarterPackView;
