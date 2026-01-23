import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, X, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateFreelancerStatus } from "@/services/freelancerService";
import { Link } from "react-router-dom";

interface FreelancerSettingsProps {
  initialData?: {
    isFreelancer?: boolean;
    freelancerSkills?: string[];
    freelancerRate?: string;
    freelancerAvailability?: string;
  };
  onUpdate?: () => void;
}

const FreelancerSettings = ({ initialData, onUpdate }: FreelancerSettingsProps) => {
  const { t } = useTranslation();
  const [isFreelancer, setIsFreelancer] = useState(initialData?.isFreelancer || false);
  const [skills, setSkills] = useState<string[]>(initialData?.freelancerSkills || []);
  const [newSkill, setNewSkill] = useState("");
  const [rate, setRate] = useState(initialData?.freelancerRate || "");
  const [availability, setAvailability] = useState(initialData?.freelancerAvailability || "");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!initialData);

  // Fetch current settings if not provided
  useEffect(() => {
    if (!initialData) {
      const fetchSettings = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase
            .from("profiles")
            .select("is_freelancer, freelancer_skills, freelancer_rate, freelancer_availability")
            .eq("id", user.id)
            .single();

          if (error) throw error;

          if (data) {
            setIsFreelancer(data.is_freelancer || false);
            setSkills(data.freelancer_skills || []);
            setRate(data.freelancer_rate || "");
            setAvailability(data.freelancer_availability || "");
          }
        } catch (error) {
          console.error("Error fetching freelancer settings:", error);
        } finally {
          setInitialLoading(false);
        }
      };

      fetchSettings();
    }
  }, [initialData]);

  const handleAddSkill = () => {
    const trimmedSkill = newSkill.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      setSkills([...skills, trimmedSkill]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const success = await updateFreelancerStatus({
        is_freelancer: isFreelancer,
        freelancer_skills: skills,
        freelancer_rate: rate || undefined,
        freelancer_availability: availability || undefined,
      });

      if (success) {
        toast.success(t("freelancer.settingsSaved", "Freelancer settings saved!"));
        
        // Show DM suggestion when enabling freelancer mode
        if (isFreelancer) {
          toast.info(
            t("freelancer.dmSuggestion", "Consider opening your DMs so potential clients can reach you directly!"),
            {
              action: {
                label: t("freelancer.openSettings", "Settings"),
                onClick: () => window.location.href = "/profile/edit?tab=privacy",
              },
              duration: 8000,
            }
          );
        }
        
        onUpdate?.();
      } else {
        toast.error(t("freelancer.settingsError", "Failed to save settings"));
      }
    } catch (error) {
      console.error("Error saving freelancer settings:", error);
      toast.error(t("freelancer.settingsError", "Failed to save settings"));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Open for Work Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-green-500" />
          <Label htmlFor="freelancer-toggle" className="font-medium">
            {t("freelancer.openForWork", "Open for Work")}
          </Label>
        </div>
        <Switch
          id="freelancer-toggle"
          checked={isFreelancer}
          onCheckedChange={setIsFreelancer}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {isFreelancer
          ? t("freelancer.visibleToClients", "Your profile is visible to potential clients looking for freelancers.")
          : t("freelancer.notVisible", "Enable this to appear in the freelancer directory.")}
      </p>

      {isFreelancer && (
        <>
          {/* Skills */}
          <div className="space-y-2">
            <Label>{t("freelancer.skills", "Skills")}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t("freelancer.addSkill", "Add a skill...")}
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
              />
              <Button type="button" variant="secondary" onClick={handleAddSkill}>
                {t("common.add", "Add")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${skill}`}
                  >
                    <X size={14} />
                  </button>
                </Badge>
              ))}
              {skills.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  {t("freelancer.noSkillsYet", "No skills added yet")}
                </span>
              )}
            </div>
          </div>

          {/* Rate */}
          <div className="space-y-2">
            <Label htmlFor="freelancer-rate">{t("freelancer.rate", "Rate (optional)")}</Label>
            <Input
              id="freelancer-rate"
              placeholder={t("freelancer.ratePlaceholder", "e.g. $50-100/hr, €500/day")}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <Label htmlFor="freelancer-availability">{t("freelancer.availability", "Availability")}</Label>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger>
                <SelectValue placeholder={t("freelancer.selectAvailability", "Select availability")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">{t("freelancer.fullTime", "Full-time")}</SelectItem>
                <SelectItem value="part-time">{t("freelancer.partTime", "Part-time")}</SelectItem>
                <SelectItem value="project-based">{t("freelancer.projectBased", "Project-based")}</SelectItem>
                <SelectItem value="not-available">{t("freelancer.notAvailable", "Not currently available")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DM Reminder */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
            <MessageSquare size={18} className="text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("freelancer.dmReminder", "Allow clients to message you")}</p>
              <p className="text-sm text-muted-foreground">
                {t("freelancer.dmReminderDesc", "Make sure your DM settings allow messages from non-connections.")}
              </p>
              <Link to="/profile/edit?tab=privacy" className="text-sm text-primary hover:underline">
                {t("freelancer.checkDmSettings", "Check DM settings →")}
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("common.saving", "Saving...")}
          </>
        ) : (
          t("common.saveChanges", "Save Changes")
        )}
      </Button>
    </div>
  );
};

export default FreelancerSettings;
