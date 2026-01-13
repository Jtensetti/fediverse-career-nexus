import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Image, 
  Briefcase, 
  GraduationCap, 
  FileText,
  Check,
  ArrowRight
} from "lucide-react";

interface ProfileSection {
  id: string;
  label: string;
  icon: React.ElementType;
  completed: boolean;
  link: string;
}

const ProfileCompleteness = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfileCompleteness = async () => {
      if (!user) return;

      try {
        // Fetch profile data
        const { data: profile } = await supabase
          .from("public_profiles")
          .select("fullname, headline, bio, avatar_url")
          .eq("id", user.id)
          .single();

        // Fetch experiences
        const { data: experiences } = await supabase
          .from("experiences")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        // Fetch education
        const { data: education } = await supabase
          .from("education")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        // Fetch skills
        const { data: skills } = await supabase
          .from("skills")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        const completedSections: ProfileSection[] = [
          {
            id: "basic",
            label: "Basic info (name, headline, bio)",
            icon: User,
            completed: !!(profile?.fullname && profile?.headline && profile?.bio),
            link: "/profile/edit",
          },
          {
            id: "avatar",
            label: "Profile photo",
            icon: Image,
            completed: !!profile?.avatar_url,
            link: "/profile/edit",
          },
          {
            id: "experience",
            label: "Work experience",
            icon: Briefcase,
            completed: (experiences?.length || 0) > 0,
            link: "/profile/edit",
          },
          {
            id: "education",
            label: "Education",
            icon: GraduationCap,
            completed: (education?.length || 0) > 0,
            link: "/profile/edit",
          },
          {
            id: "skills",
            label: "Skills",
            icon: FileText,
            completed: (skills?.length || 0) > 0,
            link: "/profile/edit",
          },
        ];

        setSections(completedSections);
      } catch (error) {
        console.error("Error checking profile completeness:", error);
      } finally {
        setLoading(false);
      }
    };

    checkProfileCompleteness();
  }, [user]);

  if (loading) {
    return null;
  }

  const completedCount = sections.filter(s => s.completed).length;
  const totalCount = sections.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  // Don't show if profile is complete
  if (percentage === 100) {
    return null;
  }

  const nextIncomplete = sections.find(s => !s.completed);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Complete Your Profile</CardTitle>
          <span className="text-2xl font-bold text-primary">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                section.completed 
                  ? "bg-primary/5 text-muted-foreground" 
                  : "bg-muted/50"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                section.completed 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {section.completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <section.icon className="h-4 w-4" />
                )}
              </div>
              <span className={`text-sm flex-grow ${
                section.completed ? "line-through" : "font-medium text-foreground"
              }`}>
                {section.label}
              </span>
            </div>
          ))}
        </div>

        {nextIncomplete && (
          <Button asChild className="w-full gap-2">
            <Link to={nextIncomplete.link}>
              Add {nextIncomplete.label.split(" ")[0]}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileCompleteness;
