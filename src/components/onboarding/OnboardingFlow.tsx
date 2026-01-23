import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
} from "@/services/onboardingRecommendationService";
import { InterestSelector } from "./InterestSelector";
import { RecommendedUserCard } from "./RecommendedUserCard";

interface OnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  { id: 1, title: "Welcome", icon: Sparkles },
  { id: 2, title: "Your Profile", icon: User },
  { id: 3, title: "Your Role", icon: Briefcase },
  { id: 4, title: "Interests", icon: Heart },
  { id: 5, title: "Discover", icon: Users },
  { id: 6, title: "Get Started", icon: MessageSquare },
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
      // Pre-fill with existing data
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

  // Fetch recommendations when moving to step 5 (Discover)
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
      // Save profile data
      setLoading(true);
      try {
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
        toast.error("Failed to save profile");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    
    if (currentStep === 3 && formData.currentRole && formData.company) {
      // Save experience data
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
        
        if (error && error.code !== "23505") throw error; // Ignore duplicates
      } catch (error) {
        console.error("Error saving experience:", error);
      }
      setLoading(false);
    }
    
    if (currentStep === 5 && selectedUsers.size > 0) {
      // Follow selected users
      setFollowingUsers(true);
      try {
        await followSelectedUsers(Array.from(selectedUsers));
        toast.success(`Following ${selectedUsers.size} people!`);
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
                  alt="Nolto" 
                  className="w-16 h-16" 
                />
              </div>
              <DialogTitle className="text-2xl">Welcome to Nolto! 🎉</DialogTitle>
              <DialogDescription className="text-base mt-2">
                You're now part of the federated professional network. 
                Let's set up your profile so you can connect with professionals across the Fediverse.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">What you'll do:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Complete your professional profile
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Add your current role
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Start connecting with peers
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Tell us about yourself</DialogTitle>
              <DialogDescription>
                This helps others find and connect with you
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
                <Label htmlFor="fullname">Full Name</Label>
                <Input
                  id="fullname"
                  placeholder="Jane Doe"
                  value={formData.fullname}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Professional Headline</Label>
                <Input
                  id="headline"
                  placeholder="Senior Developer | Open Source Enthusiast"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us a bit about yourself..."
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
              <DialogTitle>What do you do?</DialogTitle>
              <DialogDescription>
                Add your current role (you can add more later)
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentRole">Current Role</Label>
                <Input
                  id="currentRole"
                  placeholder="Software Engineer"
                  value={formData.currentRole}
                  onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company / Organization</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                You can skip this step and add it later from your profile
              </p>
            </div>
          </>
        )}

        {currentStep === 4 && (
          <>
            <DialogHeader>
              <DialogTitle>What are you interested in?</DialogTitle>
              <DialogDescription>
                Select up to 5 interests to help us find relevant people for you
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
                  ? `${formData.interests.length} selected` 
                  : "You can skip this step"}
              </p>
            </div>
          </>
        )}

        {currentStep === 5 && (
          <>
            <DialogHeader>
              <DialogTitle>Discover People to Follow</DialogTitle>
              <DialogDescription>
                Based on your profile and interests, here are professionals you might want to follow
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
                  <p>No recommendations available yet</p>
                  <p className="text-sm mt-1">Continue to start exploring the network</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                {selectedUsers.size > 0 
                  ? `Following ${selectedUsers.size} people` 
                  : "You can skip this step"}
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
              <DialogTitle className="text-2xl">You're all set! 🚀</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Your profile is ready. Here's what you can do next:
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
                  <p className="font-medium">Explore the Feed</p>
                  <p className="text-xs text-muted-foreground">See what's happening</p>
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
                  <p className="font-medium">Find Connections</p>
                  <p className="text-xs text-muted-foreground">Connect with professionals</p>
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
                  <p className="font-medium">Browse Jobs</p>
                  <p className="text-xs text-muted-foreground">Find opportunities</p>
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
              Back
            </Button>
          ) : (
            <div />
          )}
          
          {currentStep < 6 ? (
            <Button onClick={handleNext} disabled={loading || followingUsers}>
              {loading || followingUsers ? "Saving..." : 
                currentStep === 1 ? "Let's Go" : 
                currentStep === 5 ? (selectedUsers.size > 0 ? "Follow & Continue" : "Skip") : 
                "Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={onComplete}>
              Done
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;
