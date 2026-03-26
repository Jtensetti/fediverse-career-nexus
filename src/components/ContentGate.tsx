import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, UserPlus, Users } from "lucide-react";
import { getUserProfileByUsername } from "@/services/profileService";
import { getAuthorFollowerCount } from "@/services/authorFollowService";
import { sendConnectionRequest } from "@/services/connectionsService";
import FollowAuthorButton from "./FollowAuthorButton";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ContentGateProps { authorId: string; onAccessGranted?: () => void; }

const ContentGate = ({ authorId, onAccessGranted }: ContentGateProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [author, setAuthor] = useState<any>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: profile }, count] = await Promise.all([
        supabase.from('public_profiles').select('id, username, fullname, avatar_url, headline').eq('id', authorId).single(),
        getAuthorFollowerCount(authorId)
      ]);
      setAuthor(profile);
      setFollowerCount(count);
    };
    fetchData();
  }, [authorId]);

  const handleConnect = async () => {
    if (!user) { navigate('/auth'); return; }
    setSendingRequest(true);
    try {
      const success = await sendConnectionRequest(authorId);
      if (success) toast.success(t('contentGate.connectionSent'));
      else toast.error(t('contentGate.connectionFailed'));
    } finally { setSendingRequest(false); }
  };

  const handleFollowChange = (isFollowing: boolean) => {
    if (isFollowing) { setFollowerCount(prev => prev + 1); onAccessGranted?.(); }
    else { setFollowerCount(prev => Math.max(0, prev - 1)); }
  };

  const initials = author?.fullname ? author.fullname.split(' ').map((n: string) => n[0]).join('').toUpperCase() : author?.username?.[0]?.toUpperCase() || '?';

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
      <Card className="relative z-10 border-2 border-dashed border-primary/30 bg-background/95 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center text-center py-8 px-6">
          <div className="bg-primary/10 p-3 rounded-full mb-4"><Lock className="h-6 w-6 text-primary" /></div>
          {author && (
            <Link to={`/profile/${author.username || author.id}`} className="group mb-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                <AvatarImage src={author.avatar_url} alt={author.fullname || author.username} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          )}
          <h3 className="text-lg font-semibold mb-2">{user ? t('contentGate.followToRead') : t('contentGate.signInToRead')}</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            {user ? t('contentGate.followDesc', { author: author?.fullname || author?.username || '' }) : t('contentGate.signInDesc')}
          </p>
          {followerCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
              <Users className="h-4 w-4" />
              <span>{followerCount} {followerCount === 1 ? t('contentGate.follower') : t('contentGate.followers')}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            {user ? (
              <>
                <FollowAuthorButton authorId={authorId} authorName={author?.fullname || author?.username} onFollowChange={handleFollowChange} className="flex-1" />
                <Button variant="outline" onClick={handleConnect} disabled={sendingRequest} className="flex-1">
                  <UserPlus className="h-4 w-4 mr-2" />{t('contentGate.connect')}
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/auth')} className="w-full">{t('contentGate.signInToContinue')}</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentGate;
