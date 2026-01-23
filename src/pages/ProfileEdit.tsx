import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Briefcase, School, Star, Trash, Plus, Settings, CalendarIcon } from "lucide-react";
import { LinkedInImportButton } from "@/components/LinkedInImport";
import DMPrivacySettings from "@/components/DMPrivacySettings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import { getCurrentUserProfile } from "@/services/profileService";
import { updateUserProfile, ProfileUpdateData, checkUsernameAvailability } from "@/services/profileEditService";
import NetworkVisibilityToggle from "@/components/NetworkVisibilityToggle";
import ProfileVisitsToggle from "@/components/ProfileVisitsToggle";
import VerificationBadge from "@/components/VerificationBadge";
import VerificationRequest from "@/components/VerificationRequest";
import { toast } from "sonner";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import DataExportSection from "@/components/DataExportSection";
import AccountMigrationSection from "@/components/AccountMigrationSection";
import { supabase } from "@/integrations/supabase/client";
import { 
  getUserExperiences, 
  createExperience, 
  updateExperience, 
  deleteExperience,
  getUserEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  getUserSkills,
  createSkill,
  deleteSkill,
  Experience,
  Education,
  Skill
} from "@/services/profileCVService";

// Schema for the basic profile information
const profileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be 20 characters or less")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores")
    .optional(),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  headline: z.string().min(5, "Headline must be at least 5 characters"),
  bio: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional(),
  phone: z.string().optional(),
  location: z.string().optional()
});

const ProfileEditPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for experiences, education, and skills
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  
  const [isLoading, setIsLoading] = useState({
    profile: true,
    experiences: false,
    education: false,
    skills: false,
    saving: false
  });

  // Form for basic profile information
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      displayName: "",
      headline: "",
      bio: "",
      email: "",
      phone: "",
      location: ""
    }
  });

  // Get current user and profile data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, profile: true }));
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Get user profile
          const userProfile = await getCurrentUserProfile();
          if (userProfile) {
            setProfile(userProfile);
            setAvatarUrl(userProfile.avatarUrl);
            
            // Initialize the form with data
            form.reset({
              username: userProfile.username || "",
              displayName: userProfile.displayName || "",
              headline: userProfile.headline || "",
              bio: userProfile.bio || "",
              email: userProfile.contact?.email || "",
              phone: userProfile.contact?.phone || "",
              location: userProfile.contact?.location || ""
            });
            
            // Fetch CV data
            await fetchCVData();
          }
        } else {
          toast.error("You must be logged in to edit your profile");
          navigate("/auth/login");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(prev => ({ ...prev, profile: false }));
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);

  const fetchCVData = async () => {
    // Fetch experiences
    setIsLoading(prev => ({ ...prev, experiences: true }));
    const userExperiences = await getUserExperiences();
    setExperiences(userExperiences);
    setIsLoading(prev => ({ ...prev, experiences: false }));
    
    // Fetch education
    setIsLoading(prev => ({ ...prev, education: true }));
    const userEducation = await getUserEducation();
    setEducation(userEducation);
    setIsLoading(prev => ({ ...prev, education: false }));
    
    // Fetch skills
    setIsLoading(prev => ({ ...prev, skills: true }));
    const userSkills = await getUserSkills();
    setSkills(userSkills);
    setIsLoading(prev => ({ ...prev, skills: false }));
  };

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    try {
      setIsLoading(prev => ({ ...prev, saving: true }));
      
      // Check if username changed and validate uniqueness
      if (data.username && data.username !== profile?.username) {
        const isAvailable = await checkUsernameAvailability(data.username);
        if (!isAvailable) {
          toast.error("Username is already taken");
          setIsLoading(prev => ({ ...prev, saving: false }));
          return;
        }
      }
      
      const profileData: ProfileUpdateData = {
        username: data.username,
        fullname: data.displayName, // Map displayName to fullname for database
        headline: data.headline,
        bio: data.bio,
        phone: data.phone,
        location: data.location
      };
      
      
      const success = await updateUserProfile(profileData);
      
      if (success) {
        // Invalidate profile cache
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        // Refresh the profile data
        const updatedProfile = await getCurrentUserProfile();
        if (updatedProfile) {
          setProfile(updatedProfile);
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(prev => ({ ...prev, saving: false }));
    }
  };

  // Handle avatar upload completion
  const handleAvatarUploaded = (url: string) => {
    setAvatarUrl(url);
  };

  // Experience handlers
  const addExperience = () => {
    if (!userId) {
      toast.error("You need to be signed in to add experience");
      return;
    }
    
    const newExperience: Experience = {
      title: "",
      company: "",
      is_current_role: false,
      start_date: new Date().toISOString().split('T')[0], // Default to today
      description: "",
      user_id: userId
    };
    setExperiences([...experiences, newExperience]);
  };

  const removeExperience = async (index: number) => {
    const exp = experiences[index];
    
    // If this experience has an ID (stored in DB), delete it
    if (exp.id) {
      const success = await deleteExperience(exp.id);
      if (success) {
        setExperiences(experiences.filter((_, i) => i !== index));
        // Invalidate profile cache so Profile page shows updated data
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    } else {
      // If not yet saved, just remove from state
      setExperiences(experiences.filter((_, i) => i !== index));
    }
  };

  const updateExperienceField = (index: number, field: string, value: any) => {
    const updatedExperiences = [...experiences];
    updatedExperiences[index] = { 
      ...updatedExperiences[index], 
      [field]: value 
    };
    setExperiences(updatedExperiences);
  };

  const saveExperience = async (index: number) => {
    const exp = experiences[index];
    
    if (!exp.title || !exp.company || !exp.start_date) {
      // Show validation error
      toast.error("Please fill in all required fields (title, company, and start date)");
      return;
    }
    
    // Ensure user_id is set
    if (!exp.user_id && userId) {
      exp.user_id = userId;
    }
    
    // If experience has an ID, update it, otherwise create new
    if (exp.id) {
      const updated = await updateExperience(exp.id, exp);
      if (updated) {
        const updatedExperiences = [...experiences];
        updatedExperiences[index] = updated;
        setExperiences(updatedExperiences);
        // Invalidate profile cache
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    } else {
      const created = await createExperience(exp);
      if (created) {
        const updatedExperiences = [...experiences];
        updatedExperiences[index] = created;
        setExperiences(updatedExperiences);
        // Invalidate profile cache
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    }
  };

  // Education handlers
  const addEducation = () => {
    if (!userId) {
      toast.error("You need to be signed in to add education");
      return;
    }
    
    const newEducation: Education = {
      institution: "",
      degree: "",
      field: "",
      start_year: new Date().getFullYear(),
      user_id: userId
    };
    setEducation([...education, newEducation]);
  };

  const removeEducation = async (index: number) => {
    const edu = education[index];
    
    // If this education has an ID (stored in DB), delete it
    if (edu.id) {
      const success = await deleteEducation(edu.id);
      if (success) {
        setEducation(education.filter((_, i) => i !== index));
        // Invalidate profile cache so Profile page shows updated data
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    } else {
      // If not yet saved, just remove from state
      setEducation(education.filter((_, i) => i !== index));
    }
  };

  const updateEducationField = (index: number, field: string, value: any) => {
    const updatedEducation = [...education];
    updatedEducation[index] = { 
      ...updatedEducation[index], 
      [field]: value 
    };
    setEducation(updatedEducation);
  };

  const saveEducation = async (index: number) => {
    const edu = education[index];
    
    if (!edu.institution || !edu.degree || !edu.field || !edu.start_year) {
      // Show validation error
      toast.error("Please fill in all required fields (institution, degree, field of study, and start year)");
      return;
    }
    
    // Ensure user_id is set
    if (!edu.user_id && userId) {
      edu.user_id = userId;
    }
    
    // If education has an ID, update it, otherwise create new
    if (edu.id) {
      const updated = await updateEducation(edu.id, edu);
      if (updated) {
        const updatedEducation = [...education];
        updatedEducation[index] = updated;
        setEducation(updatedEducation);
        // Invalidate profile cache
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    } else {
      const created = await createEducation(edu);
      if (created) {
        const updatedEducation = [...education];
        updatedEducation[index] = created;
        setEducation(updatedEducation);
        // Invalidate profile cache
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    }
  };

  // Skills handlers
  const addSkill = async () => {
    if (!userId) {
      toast.error("You need to be signed in to add a skill");
      return;
    }
    
    if (newSkill.trim() === "") return;
    
    const newSkillItem: Skill = {
      name: newSkill.trim(),
      user_id: userId
    };
    
    const createdSkill = await createSkill(newSkillItem);
    if (createdSkill) {
      setSkills([...skills, createdSkill]);
      setNewSkill("");
      // Invalidate profile cache
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  const removeSkill = async (id: string) => {
    const success = await deleteSkill(id);
    if (success) {
      setSkills(skills.filter(skill => skill.id !== id));
      // Invalidate profile cache
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-64 bg-muted rounded mb-6"></div>
            <div className="h-64 w-full max-w-2xl bg-muted/50 rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">{t("profileEdit.title")}</h1>
          <LinkedInImportButton 
            onImportComplete={() => {
              // Refresh profile data after import
              window.location.reload();
            }}
          />
        </div>
        
        <Tabs defaultValue="basic" className="mb-6">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4">
            <TabsList className="w-max md:w-auto">
              <TabsTrigger value="basic" className="text-xs sm:text-sm whitespace-nowrap">{t("profileEdit.tabs.basicInfo")}</TabsTrigger>
              <TabsTrigger value="experience" className="text-xs sm:text-sm whitespace-nowrap">{t("profileEdit.tabs.experience")}</TabsTrigger>
              <TabsTrigger value="education" className="text-xs sm:text-sm whitespace-nowrap">{t("profileEdit.tabs.education")}</TabsTrigger>
              <TabsTrigger value="skills" className="text-xs sm:text-sm whitespace-nowrap">{t("profileEdit.tabs.skills")}</TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs sm:text-sm whitespace-nowrap">{t("profileEdit.tabs.privacy")}</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>{t("profileEdit.personalInfo")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-8 mb-6">
                  <ProfileImageUpload 
                    currentImageUrl={avatarUrl} 
                    displayName={profile?.displayName}
                    onImageUploaded={handleAvatarUploaded}
                  />
                  
                  <div className="flex-1">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="displayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("profileEdit.displayName")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("profileEdit.displayNamePlaceholder")} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("profileEdit.username", "Username")}</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">@</span>
                                  <Input 
                                    placeholder={t("profileEdit.usernamePlaceholder", "your_username")} 
                                    {...field} 
                                    onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                {t("profileEdit.usernameDesc", "Your unique handle for your profile URL and Fediverse identity. Only lowercase letters, numbers, and underscores.")}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="headline"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("profileEdit.headline")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("profileEdit.headlinePlaceholder")} {...field} />
                              </FormControl>
                              <FormDescription>
                                {t("profileEdit.headlineDesc")}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("profileEdit.bio")}</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder={t("profileEdit.bioPlaceholder")} 
                                  className="min-h-32" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="pt-4">
                          <h3 className="text-lg font-medium mb-4">{t("profileEdit.contactInfo")}</h3>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("profileEdit.email")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="your.email@example.com" {...field} disabled />
                                  </FormControl>
                                  <FormDescription>{t("profileEdit.emailDesc")}</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("profileEdit.phone")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t("profileEdit.phonePlaceholder")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="location"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>{t("profileEdit.location")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t("profileEdit.locationPlaceholder")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          disabled={isLoading.saving}
                        >
                          {isLoading.saving ? t("profileEdit.saving") : t("profileEdit.saveChanges")}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="experience">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase size={20} className="text-primary" />
                  {t("profileEdit.experience.title")}
                </CardTitle>
                <Button 
                  onClick={addExperience} 
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Plus size={16} /> {t("profileEdit.experience.add")}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading.experiences ? (
                  <div className="flex justify-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="mt-2 text-sm text-muted-foreground">{t("profileEdit.experience.loading")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {experiences.map((exp, index) => (
                      <div key={exp.id || `new-exp-${index}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {exp.title || `Experience #${index + 1}`}
                            </h4>
                            {exp.verification_status && (
                              <VerificationBadge status={exp.verification_status} />
                            )}
                          </div>
                          <div className="flex gap-2">
                            {exp.id && (
                              <VerificationRequest 
                                type="experience" 
                                itemId={exp.id}
                                companyDomain={exp.company_domain}
                              />
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeExperience(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`title-${index}`}>{t("profileEdit.experience.jobTitle")}</Label>
                            <Input 
                              id={`title-${index}`}
                              value={exp.title || ''} 
                              onChange={(e) => updateExperienceField(index, 'title', e.target.value)}
                              placeholder={t("profileEdit.experience.jobTitlePlaceholder")}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`company-${index}`}>{t("profileEdit.experience.company")}</Label>
                            <Input 
                              id={`company-${index}`}
                              value={exp.company || ''} 
                              onChange={(e) => updateExperienceField(index, 'company', e.target.value)}
                              placeholder={t("profileEdit.experience.companyPlaceholder")}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`company_domain-${index}`}>{t("profileEdit.experience.companyDomain")}</Label>
                            <Input 
                              id={`company_domain-${index}`}
                              value={exp.company_domain || ''} 
                              onChange={(e) => updateExperienceField(index, 'company_domain', e.target.value)}
                              placeholder={t("profileEdit.experience.companyDomainPlaceholder")}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`location-${index}`}>{t("profileEdit.location")}</Label>
                            <Input 
                              id={`location-${index}`}
                              value={exp.location || ''} 
                              onChange={(e) => updateExperienceField(index, 'location', e.target.value)}
                              placeholder={t("profileEdit.experience.locationPlaceholder")}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`startDate-${index}`}>{t("profileEdit.experience.startDate")}</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full mt-1 justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {exp.start_date ? format(new Date(exp.start_date), "PPP") : t("profileEdit.experience.pickDate")}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  captionLayout="dropdown-buttons"
                                  fromYear={1960}
                                  toYear={new Date().getFullYear()}
                                  selected={exp.start_date ? new Date(exp.start_date) : undefined}
                                  onSelect={(date) => updateExperienceField(index, 'start_date', date ? format(date, 'yyyy-MM-dd') : undefined)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          <div className="flex flex-col">
                            <div className="flex items-center mb-2">
                              <Switch
                                id={`current-${index}`}
                                checked={exp.is_current_role || false}
                                onCheckedChange={(checked) => updateExperienceField(index, 'is_current_role', checked)}
                                className="mr-2"
                              />
                              <Label htmlFor={`current-${index}`}>{t("profileEdit.experience.currentRole")}</Label>
                            </div>
                            
                            {!exp.is_current_role && (
                              <>
                                <Label htmlFor={`endDate-${index}`}>{t("profileEdit.experience.endDate")}</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full mt-1 justify-start text-left font-normal"
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {exp.end_date ? format(new Date(exp.end_date), "PPP") : t("profileEdit.experience.pickDate")}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      captionLayout="dropdown-buttons"
                                      fromYear={1960}
                                      toYear={new Date().getFullYear()}
                                      selected={exp.end_date ? new Date(exp.end_date) : undefined}
                                      onSelect={(date) => updateExperienceField(index, 'end_date', date ? format(date, 'yyyy-MM-dd') : undefined)}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </>
                            )}
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label htmlFor={`description-${index}`}>{t("profileEdit.experience.description")}</Label>
                            <Textarea 
                              id={`description-${index}`}
                              value={exp.description || ''} 
                              onChange={(e) => updateExperienceField(index, 'description', e.target.value)}
                              placeholder={t("profileEdit.experience.descriptionPlaceholder")}
                              className="mt-1 h-24"
                            />
                          </div>
                          
                          <div className="md:col-span-2 flex justify-end">
                            <Button
                              onClick={() => saveExperience(index)}
                            >
                              {exp.id ? t("profileEdit.experience.update") : t("profileEdit.experience.save")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {experiences.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>{t("profileEdit.experience.noExperience")}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="education">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <School size={20} className="text-primary" />
                  {t("profileEdit.education.title")}
                </CardTitle>
                <Button 
                  onClick={addEducation} 
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Plus size={16} /> {t("profileEdit.education.add")}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading.education ? (
                  <div className="flex justify-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="mt-2 text-sm text-muted-foreground">{t("profileEdit.education.loading")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {education.map((edu, index) => (
                      <div key={edu.id || `new-edu-${index}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {edu.institution || `Education #${index + 1}`}
                            </h4>
                            {edu.verification_status && (
                              <VerificationBadge status={edu.verification_status} />
                            )}
                          </div>
                          <div className="flex gap-2">
                            {edu.id && (
                              <VerificationRequest 
                                type="education" 
                                itemId={edu.id}
                              />
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeEducation(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label htmlFor={`institution-${index}`}>{t("profileEdit.education.institution")}</Label>
                            <Input 
                              id={`institution-${index}`}
                              value={edu.institution || ''} 
                              onChange={(e) => updateEducationField(index, 'institution', e.target.value)}
                              placeholder={t("profileEdit.education.institutionPlaceholder")}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`degree-${index}`}>{t("profileEdit.education.degree")}</Label>
                            <Input 
                              id={`degree-${index}`}
                              value={edu.degree || ''} 
                              onChange={(e) => updateEducationField(index, 'degree', e.target.value)}
                              placeholder={t("profileEdit.education.degreePlaceholder")}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`field-${index}`}>{t("profileEdit.education.field")}</Label>
                            <Input 
                              id={`field-${index}`}
                              value={edu.field || ''} 
                              onChange={(e) => updateEducationField(index, 'field', e.target.value)}
                              placeholder={t("profileEdit.education.fieldPlaceholder")}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`startYear-${index}`}>{t("profileEdit.education.startYear")}</Label>
                            <Input 
                              id={`startYear-${index}`}
                              type="number"
                              value={edu.start_year ?? ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                updateEducationField(index, 'start_year', val === '' ? undefined : parseInt(val, 10));
                              }}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`endYear-${index}`}>{t("profileEdit.education.endYear")}</Label>
                            <Input 
                              id={`endYear-${index}`}
                              type="number"
                              value={edu.end_year ?? ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                updateEducationField(index, 'end_year', val === '' ? undefined : parseInt(val, 10));
                              }}
                              className="mt-1"
                            />
                          </div>
                          
                          <div className="md:col-span-2 flex justify-end">
                            <Button
                              onClick={() => saveEducation(index)}
                            >
                              {edu.id ? t("profileEdit.education.update") : t("profileEdit.education.save")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {education.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>{t("profileEdit.education.noEducation")}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="skills">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Star size={20} className="text-primary" />
                  {t("profileEdit.skills.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading.skills ? (
                  <div className="flex justify-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="mt-2 text-sm text-muted-foreground">{t("profileEdit.skills.loading")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex gap-2">
                      <Input 
                        placeholder={t("profileEdit.skills.placeholder")} 
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      />
                      <Button onClick={addSkill} type="button">{t("profileEdit.skills.add")}</Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {skills.map((skill) => (
                        <div key={skill.id} className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                          <span>{skill.name}</span>
                          {skill.endorsements && skill.endorsements > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                              {skill.endorsements}
                            </span>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded-full" 
                            onClick={() => removeSkill(skill.id)}
                          >
                            <Trash size={12} className="text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {skills.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>{t("profileEdit.skills.noSkills")}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} className="text-primary" />
                  {t("profileEdit.privacy.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <NetworkVisibilityToggle 
                  initialValue={profile.networkVisibilityEnabled} 
                  onChange={(value) => setProfile({...profile, networkVisibilityEnabled: value})}
                />
                
                <Separator />
                
                <ProfileVisitsToggle />
                
                <Separator />
                
                <DMPrivacySettings />
              </CardContent>
            </Card>
            
            <DataExportSection />
            
            <AccountMigrationSection />
            
            <DeleteAccountSection />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfileEditPage;
