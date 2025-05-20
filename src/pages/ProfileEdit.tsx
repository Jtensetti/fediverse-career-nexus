
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Briefcase, School, Star, Trash, Plus, Settings, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import NetworkVisibilityToggle from "@/components/NetworkVisibilityToggle";
import ProfileVisitsToggle from "@/components/ProfileVisitsToggle";
import VerificationBadge from "@/components/VerificationBadge";
import VerificationRequest from "@/components/VerificationRequest";
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
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  headline: z.string().min(5, "Headline must be at least 5 characters"),
  bio: z.string().optional(),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  location: z.string().optional()
});

// Import mock data temporarily
import { mockUserProfile } from "@/data/mockData";

const ProfileEditPage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(mockUserProfile);
  
  // State for experiences, education, and skills
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  
  const [isLoading, setIsLoading] = useState({
    experiences: false,
    education: false,
    skills: false
  });

  // Form for basic profile information
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      email: profile.contact.email,
      phone: profile.contact.phone,
      location: profile.contact.location
    }
  });

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(prev => ({ ...prev, experiences: true }));
      const userExperiences = await getUserExperiences();
      setExperiences(userExperiences);
      setIsLoading(prev => ({ ...prev, experiences: false }));
      
      setIsLoading(prev => ({ ...prev, education: true }));
      const userEducation = await getUserEducation();
      setEducation(userEducation);
      setIsLoading(prev => ({ ...prev, education: false }));
      
      setIsLoading(prev => ({ ...prev, skills: true }));
      const userSkills = await getUserSkills();
      setSkills(userSkills);
      setIsLoading(prev => ({ ...prev, skills: false }));
    };
    
    fetchUserData();
  }, []);

  const onSubmit = (data) => {
    console.log("Form submitted:", data);
    // Here you would typically send the data to your API
    // and update the profile state
  };

  // Experience handlers
  const addExperience = () => {
    const newExperience: Experience = {
      title: "",
      company: "",
      is_current_role: false,
      start_date: "",
      description: ""
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
      return;
    }
    
    // If experience has an ID, update it, otherwise create new
    if (exp.id) {
      const updated = await updateExperience(exp.id, exp);
      if (updated) {
        const updatedExperiences = [...experiences];
        updatedExperiences[index] = updated;
        setExperiences(updatedExperiences);
      }
    } else {
      const created = await createExperience(exp);
      if (created) {
        const updatedExperiences = [...experiences];
        updatedExperiences[index] = created;
        setExperiences(updatedExperiences);
      }
    }
  };

  // Education handlers
  const addEducation = () => {
    const newEducation: Education = {
      institution: "",
      degree: "",
      field: "",
      start_year: new Date().getFullYear()
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
      return;
    }
    
    // If education has an ID, update it, otherwise create new
    if (edu.id) {
      const updated = await updateEducation(edu.id, edu);
      if (updated) {
        const updatedEducation = [...education];
        updatedEducation[index] = updated;
        setEducation(updatedEducation);
      }
    } else {
      const created = await createEducation(edu);
      if (created) {
        const updatedEducation = [...education];
        updatedEducation[index] = created;
        setEducation(updatedEducation);
      }
    }
  };

  // Skills handlers
  const addSkill = async () => {
    if (newSkill.trim() === "") return;
    
    const newSkillItem: Skill = {
      name: newSkill.trim()
    };
    
    const createdSkill = await createSkill(newSkillItem);
    if (createdSkill) {
      setSkills([...skills, createdSkill]);
      setNewSkill("");
    }
  };

  const removeSkill = async (id: string) => {
    const success = await deleteSkill(id);
    if (success) {
      setSkills(skills.filter(skill => skill.id !== id));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
        
        <Tabs defaultValue="basic" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="headline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Headline</FormLabel>
                          <FormControl>
                            <Input placeholder="Your professional headline" {...field} />
                          </FormControl>
                          <FormDescription>
                            A short description of your current role or expertise
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
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about yourself" 
                              className="min-h-32" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-4">
                      <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="your.email@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="+1 (555) 123-4567" {...field} />
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
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="City, Country" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Button type="submit" className="bg-bondy-primary hover:bg-bondy-primary/90">
                      Save Changes
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="experience">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase size={20} className="text-bondy-primary" />
                  Experience
                </CardTitle>
                <Button 
                  onClick={addExperience} 
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Plus size={16} /> Add Experience
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading.experiences ? (
                  <div className="flex justify-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bondy-primary"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading experiences...</p>
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
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`title-${index}`}>Job Title</Label>
                            <Input 
                              id={`title-${index}`}
                              value={exp.title || ''} 
                              onChange={(e) => updateExperienceField(index, 'title', e.target.value)}
                              placeholder="Job Title"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`company-${index}`}>Company</Label>
                            <Input 
                              id={`company-${index}`}
                              value={exp.company || ''} 
                              onChange={(e) => updateExperienceField(index, 'company', e.target.value)}
                              placeholder="Company"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`company_domain-${index}`}>Company Website/Domain</Label>
                            <Input 
                              id={`company_domain-${index}`}
                              value={exp.company_domain || ''} 
                              onChange={(e) => updateExperienceField(index, 'company_domain', e.target.value)}
                              placeholder="company.com"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`location-${index}`}>Location</Label>
                            <Input 
                              id={`location-${index}`}
                              value={exp.location || ''} 
                              onChange={(e) => updateExperienceField(index, 'location', e.target.value)}
                              placeholder="City, Country (Remote)"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`startDate-${index}`}>Start Date</Label>
                            <Input 
                              id={`startDate-${index}`}
                              type="date"
                              value={exp.start_date ? exp.start_date.substring(0, 10) : ''} 
                              onChange={(e) => updateExperienceField(index, 'start_date', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          
                          <div className="flex flex-col">
                            <div className="flex items-center mb-2">
                              <Switch
                                id={`current-${index}`}
                                checked={exp.is_current_role || false}
                                onCheckedChange={(checked) => updateExperienceField(index, 'is_current_role', checked)}
                                className="mr-2"
                              />
                              <Label htmlFor={`current-${index}`}>I currently work here</Label>
                            </div>
                            
                            {!exp.is_current_role && (
                              <>
                                <Label htmlFor={`endDate-${index}`}>End Date</Label>
                                <Input 
                                  id={`endDate-${index}`}
                                  type="date"
                                  value={exp.end_date ? exp.end_date.substring(0, 10) : ''} 
                                  onChange={(e) => updateExperienceField(index, 'end_date', e.target.value)}
                                  className="mt-1"
                                />
                              </>
                            )}
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label htmlFor={`description-${index}`}>Description</Label>
                            <Textarea 
                              id={`description-${index}`}
                              value={exp.description || ''} 
                              onChange={(e) => updateExperienceField(index, 'description', e.target.value)}
                              placeholder="Describe your responsibilities and achievements"
                              className="mt-1 h-24"
                            />
                          </div>
                          
                          <div className="md:col-span-2 flex justify-end">
                            <Button
                              onClick={() => saveExperience(index)}
                              className="bg-bondy-primary hover:bg-bondy-primary/90"
                            >
                              {exp.id ? 'Update' : 'Save'} Experience
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {experiences.length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <p>No experience added yet. Click "Add Experience" to get started.</p>
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
                  <School size={20} className="text-bondy-primary" />
                  Education
                </CardTitle>
                <Button 
                  onClick={addEducation} 
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Plus size={16} /> Add Education
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading.education ? (
                  <div className="flex justify-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bondy-primary"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading education...</p>
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
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label htmlFor={`institution-${index}`}>School/University</Label>
                            <Input 
                              id={`institution-${index}`}
                              value={edu.institution || ''} 
                              onChange={(e) => updateEducationField(index, 'institution', e.target.value)}
                              placeholder="Institution name"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`degree-${index}`}>Degree</Label>
                            <Input 
                              id={`degree-${index}`}
                              value={edu.degree || ''} 
                              onChange={(e) => updateEducationField(index, 'degree', e.target.value)}
                              placeholder="e.g. Bachelor's, Master's"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`field-${index}`}>Field of Study</Label>
                            <Input 
                              id={`field-${index}`}
                              value={edu.field || ''} 
                              onChange={(e) => updateEducationField(index, 'field', e.target.value)}
                              placeholder="e.g. Computer Science"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`startYear-${index}`}>Start Year</Label>
                            <Input 
                              id={`startYear-${index}`}
                              type="number"
                              value={edu.start_year || ''} 
                              onChange={(e) => updateEducationField(index, 'start_year', parseInt(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`endYear-${index}`}>End Year (or expected)</Label>
                            <Input 
                              id={`endYear-${index}`}
                              type="number"
                              value={edu.end_year || ''} 
                              onChange={(e) => updateEducationField(index, 'end_year', parseInt(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          
                          <div className="md:col-span-2 flex justify-end">
                            <Button
                              onClick={() => saveEducation(index)}
                              className="bg-bondy-primary hover:bg-bondy-primary/90"
                            >
                              {edu.id ? 'Update' : 'Save'} Education
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {education.length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <p>No education added yet. Click "Add Education" to get started.</p>
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
                  <Star size={20} className="text-bondy-primary" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading.skills ? (
                  <div className="flex justify-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bondy-primary"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading skills...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Add a skill" 
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      />
                      <Button onClick={addSkill} type="button">Add</Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {skills.map((skill) => (
                        <div key={skill.id} className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2">
                          <span>{skill.name}</span>
                          {skill.endorsements && skill.endorsements > 0 && (
                            <span className="bg-bondy-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                              {skill.endorsements}
                            </span>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded-full" 
                            onClick={() => removeSkill(skill.id)}
                          >
                            <Trash size={12} className="text-gray-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {skills.length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <p>No skills added yet. Use the field above to add your skills.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} className="text-bondy-primary" />
                  Privacy Settings
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
                
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="message-privacy" className="font-medium">Message privacy</Label>
                      <p className="text-sm text-gray-600 mt-1">Only allow messages from your connections</p>
                    </div>
                    <Switch id="message-privacy" defaultChecked />
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button className="bg-bondy-primary hover:bg-bondy-primary/90">
                    Save Privacy Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfileEditPage;
