import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserProfile } from "@/services/profile/profileService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Briefcase, 
  Users, 
  MessageSquare, 
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Heart,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { 
  getOnboardingRecommendations, 
  followSelectedUsers,
  RecommendedUser 
} from "@/services/misc/onboardingRecommendationService";
import { InterestSelector } from "./InterestSelector";
import { RecommendedUserCard } from "./RecommendedUserCard";

interface OnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  { id: 1, title: "Välkommen", icon: Sparkles },
  { id: 2, title: "Din profil", icon: User },
  { id: 3, title: "Din roll", icon: Briefcase },
  { id: 4, title: "Intressen", icon: Heart },
  { id: 5, title: "Utforska", icon: Users },
  { id: 6, title: "Kom igång", icon: MessageSquare },
];

const OnboardingFlow = ({ open, onComplete }: OnboardingFlowProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullname: "",
    headline: "",
    bio: "",
    currentRole: "",
    company: "",
    interests: [] as string[],
  });
  
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [followingUsers, setFollowingUsers] = useState(false);

  useEffect(() => {
    if (user && open) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("public_profiles")
          .select("fullname, headline, bio")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setFormData(prev => ({
            ...prev,
            fullname: data.fullname || "",
            headline: data.headline || "",
            bio: data.bio || "",
          }));
        }
      };
      fetchProfile();
    }
  }, [user, open]);

  useEffect(() => {
    if (currentStep === 5 && open) {
      const fetchRecommendations = async () => {
        setLoadingRecommendations(true);
        try {
          const recs = await getOnboardingRecommendations({
            headline: formData.headline,
            role: formData.currentRole,
            interests: formData.interests,
          });
          setRecommendations(recs);
        } catch (error) {
          console.error("Error fetching recommendations:", error);
        } finally {
          setLoadingRecommendations(false);
        }
      };
      fetchRecommendations();
    }
  }, [currentStep, open, formData.headline, formData.currentRole, formData.interests]);

  const toggleInterest = (interestId: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleNext = async () => {
    if (currentStep === 2) {
      setLoading(true);
      try {
        await ensureUserProfile(user!.id);
        
        const { error } = await supabase
          .from("profiles")
          .update({
            fullname: formData.fullname,
            headline: formData.headline,
            bio: formData.bio,
          })
          .eq("id", user?.id);
        
        if (error) throw error;
      } catch (error) {
        console.error("Failed to save profile:", error);
        toast.error("Kunde inte spara profilen. Försök igen.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    
    if (currentStep === 3 && formData.currentRole && formData.company) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("experiences")
          .insert({
            user_id: user?.id,
            title: formData.currentRole,
            company: formData.company,
            is_current_role: true,
          });
        
        if (error && error.code !== "23505") throw error;
      } catch (error) {
        console.error("Error saving experience:", error);
      }
      setLoading(false);
    }
    
    if (currentStep === 5 && selectedUsers.size > 0) {
      setFollowingUsers(true);
      try {
        await followSelectedUsers(Array.from(selectedUsers));
        toast.success(`Följer ${selectedUsers.size} personer!`);
      } catch (error) {
        console.error("Error following users:", error);
      }
      setFollowingUsers(false);
    }
    
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const progress = (currentStep / 6) * 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" hideCloseButton>
        <Progress value={progress} className="h-1 mb-4" />
        
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                step.id < currentStep
                  ? "bg-primary text-primary-foreground"
                  : step.id === currentStep
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step.id < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4">
                <img 
                  src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                  alt="Samverkan" 
                  className="w-16 h-16" 
                />
              </div>
              <DialogTitle className="text-2xl">Välkommen till Samverkan! 🎉</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Du är nu en del av det professionella nätverket för offentlig sektor.
                Låt oss sätta upp din profil så att du kan börja samarbeta med kollegor.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">Det här kommer du att göra:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Fyll i din professionella profil
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Lägg till din nuvarande roll
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Börja knyta kontakter
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Berätta om dig själv</DialogTitle>
              <DialogDescription>
                Detta hjälper andra att hitta och kontakta dig
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="flex justify-center mb-4">
                <Avatar className="h-20 w-20 border-4 border-primary/20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {formData.fullname?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullname">Fullständigt namn</Label>
                <Input
                  id="fullname"
                  placeholder="Anna Lindström"
                  value={formData.fullname}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Professionell rubrik</Label>
                <Input
                  id="headline"
                  placeholder="Verksamhetsutvecklare | Göteborgs kommun"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Om dig</Label>
                <Textarea
                  id="bio"
                  placeholder="Berätta lite om dig själv..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Vad jobbar du med?</DialogTitle>
              <DialogDescription>
                Lägg till din nuvarande roll (du kan lägga till fler senare)
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentRole">Nuvarande roll</Label>
                <Input
                  id="currentRole"
                  placeholder="Enhetschef"
                  value={formData.currentRole}
                  onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Organisation</Label>
                <Input
                  id="company"
                  placeholder="Malmö kommun"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Du kan hoppa över detta steg och lägga till det senare från din profil
              </p>
            </div>
          </>
        )}

        {currentStep === 4 && (
          <>
            <DialogHeader>
              <DialogTitle>Vad är du intresserad av?</DialogTitle>
              <DialogDescription>
                Välj upp till 5 intressen för att hjälpa oss hitta relevanta personer åt dig
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <InterestSelector
                selectedInterests={formData.interests}
                onToggle={toggleInterest}
                maxSelections={5}
              />
              <p className="text-sm text-muted-foreground">
                {formData.interests.length > 0 
                  ? `${formData.interests.length} valda` 
                  : "Du kan hoppa över detta steg"}
              </p>
            </div>
          </>
        )}

        {currentStep === 5 && (
          <>
            <DialogHeader>
              <DialogTitle>Upptäck personer att följa</DialogTitle>
              <DialogDescription>
                Baserat på din profil och dina intressen, här är professionella som du kanske vill följa
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {loadingRecommendations ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : recommendations.length > 0 ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recommendations.map((user) => (
                      <RecommendedUserCard
                        key={user.user_id}
                        user={user}
                        selected={selectedUsers.has(user.user_id)}
                        onToggle={() => toggleUserSelection(user.user_id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Inga rekommendationer tillgängliga ännu</p>
                  <p className="text-sm mt-1">Fortsätt för att börja utforska nätverket</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                {selectedUsers.size > 0 
                  ? `Följer ${selectedUsers.size} personer` 
                  : "Du kan hoppa över detta steg"}
              </p>
            </div>
          </>
        )}

        {currentStep === 6 && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Du är redo! 🚀</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Din profil är klar. Här är vad du kan göra härnäst:
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14"
                onClick={() => {
                  onComplete();
                  navigate("/feed");
                }}
              >
                <MessageSquare className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Utforska flödet</p>
                  <p className="text-xs text-muted-foreground">Se vad som händer</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14"
                onClick={() => {
                  onComplete();
                  navigate("/connections");
                }}
              >
                <Users className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Hitta kontakter</p>
                  <p className="text-xs text-muted-foreground">Knyt kontakter med kollegor</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14"
                onClick={() => {
                  onComplete();
                  navigate("/jobs");
                }}
              >
                <Briefcase className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Bläddra bland jobb</p>
                  <p className="text-xs text-muted-foreground">Hitta möjligheter</p>
                </div>
              </Button>
            </div>
          </>
        )}

        <div className="flex justify-between mt-6">
          {currentStep > 1 && currentStep < 6 ? (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={loading || followingUsers}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
          ) : (
            <div />
          )}
          
          {currentStep < 6 ? (
            <Button onClick={handleNext} disabled={loading || followingUsers}>
              {loading || followingUsers ? "Sparar..." : 
                currentStep === 1 ? "Sätt igång" : 
                currentStep === 5 ? (selectedUsers.size > 0 ? "Följ & fortsätt" : "Hoppa över") : 
                "Fortsätt"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={onComplete}>
              Klar
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;
