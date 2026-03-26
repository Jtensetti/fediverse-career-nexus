import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, X, Loader2 } from "lucide-react";
import { getFeedPreferences, updateFeedPreferences, type FeedPreferences } from "@/services/feedPreferencesService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SEOHead } from "@/components/common/SEOHead";

const FeedSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const [newMutedWord, setNewMutedWord] = useState('');
  const [localPrefs, setLocalPrefs] = useState<Partial<FeedPreferences>>({});

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['feedPreferences'],
    queryFn: getFeedPreferences,
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: updateFeedPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedPreferences'] });
      toast.success(t('feedSettingsPage.saved'));
    },
    onError: () => {
      toast.error(t('feedSettingsPage.saveFailed'));
    }
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        default_feed: preferences.default_feed,
        show_reposts: preferences.show_reposts,
        show_replies: preferences.show_replies,
        muted_words: preferences.muted_words || [],
        language_filter: preferences.language_filter || []
      });
    }
  }, [preferences]);

  const handleSave = () => {
    updateMutation.mutate(localPrefs);
  };

  const handleAddMutedWord = () => {
    if (!newMutedWord.trim()) return;
    const currentWords = localPrefs.muted_words || [];
    if (currentWords.includes(newMutedWord.trim().toLowerCase())) {
      toast.error(t('feedSettingsPage.wordAlreadyInList'));
      return;
    }
    setLocalPrefs(prev => ({
      ...prev,
      muted_words: [...currentWords, newMutedWord.trim().toLowerCase()]
    }));
    setNewMutedWord('');
  };

  const handleRemoveMutedWord = (word: string) => {
    setLocalPrefs(prev => ({
      ...prev,
      muted_words: (prev.muted_words || []).filter(w => w !== word)
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">{t('feedSettingsPage.signInRequired')}</h2>
            <p className="text-muted-foreground mb-4">{t('feedSettingsPage.signInDescription')}</p>
            <Button asChild>
              <Link to="/auth">{t('auth.signIn')}</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={t('feedSettingsPage.title')} description={t('feedSettingsPage.subtitle')} />
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/feed">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('feedSettingsPage.backToFeed')}
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('feedSettingsPage.title')}</h1>
            <p className="text-muted-foreground">{t('feedSettingsPage.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('feedSettingsPage.defaultFeed')}</CardTitle>
              <CardDescription>{t('feedSettingsPage.defaultFeedDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                value={localPrefs.default_feed || 'following'} 
                onValueChange={(value: string) => setLocalPrefs(prev => ({ ...prev, default_feed: value as 'following' | 'local' | 'federated' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="following">{t('feedSettingsPage.following')}</SelectItem>
                  <SelectItem value="local">{t('feedSettingsPage.local')}</SelectItem>
                  <SelectItem value="federated">{t('feedSettingsPage.federated')}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('feedSettingsPage.contentFilters')}</CardTitle>
              <CardDescription>{t('feedSettingsPage.contentFiltersDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-reposts">{t('feedSettingsPage.showReposts')}</Label>
                  <p className="text-sm text-muted-foreground">{t('feedSettingsPage.showRepostsDesc')}</p>
                </div>
                <Switch
                  id="show-reposts"
                  checked={localPrefs.show_reposts ?? true}
                  onCheckedChange={(checked) => setLocalPrefs(prev => ({ ...prev, show_reposts: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-replies">{t('feedSettingsPage.showReplies')}</Label>
                  <p className="text-sm text-muted-foreground">{t('feedSettingsPage.showRepliesDesc')}</p>
                </div>
                <Switch
                  id="show-replies"
                  checked={localPrefs.show_replies ?? false}
                  onCheckedChange={(checked) => setLocalPrefs(prev => ({ ...prev, show_replies: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('feedSettingsPage.mutedWords')}</CardTitle>
              <CardDescription>{t('feedSettingsPage.mutedWordsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={t('feedSettingsPage.addWordPlaceholder')}
                  value={newMutedWord}
                  onChange={(e) => setNewMutedWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMutedWord())}
                />
                <Button type="button" onClick={handleAddMutedWord}>{t('feedSettingsPage.add')}</Button>
              </div>
              {(localPrefs.muted_words || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(localPrefs.muted_words || []).map((word) => (
                    <Badge key={word} variant="secondary" className="flex items-center gap-1 pr-1">
                      {word}
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => handleRemoveMutedWord(word)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              {(localPrefs.muted_words || []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t('feedSettingsPage.noMutedWords')}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/feed')} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('feedSettingsPage.saving')}
                </>
              ) : (
                t('feedSettingsPage.saveSettings')
              )}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FeedSettings;