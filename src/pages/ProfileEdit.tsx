import { useState } from "react";
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
import { Briefcase, School, Star, Trash, Plus, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import NetworkVisibilityToggle from "@/components/NetworkVisibilityToggle";

// We'll use the same mock data structure from the Profile page
import { mockUserProfile } from "@/data/mockData";

// Schema for the basic profile information
const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  headline: z.string().min(5, "Headline must be at least 5 characters"),
  bio: z.string().optional(),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  location: z.string().optional()
});

// Experience item schema
const experienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Title is required"),
  company: z.string().min(2, "Company is required"),
  isCurrentRole: z.boolean().default(false),
  startDate: z.string().min(2, "Start date is required"),
  endDate: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional()
});

// Education item schema
const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(2, "Institution is required"),
  degree: z.string().min(2, "Degree is required"),
  field: z.string().min(2, "Field of study is required"),
  startYear: z.number().min(1900, "Invalid year").max(2100, "Invalid year"),
  endYear: z.number().min(1900, "Invalid year").max(2100, "Invalid year").optional(),
  isVerified: z.boolean().default(false)
});

// Skill item schema
const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Skill name is required"),
  endorsements: z.number().default(0)
});

const ProfileEditPage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(mockUserProfile);

  // Initialize experiences array
  const [experiences, setExperiences] = useState(profile.experience || []);
  const [education, setEducation] = useState(profile.education || []);
  const [skills, setSkills] = useState(profile.skills || []);

  const [newSkill, setNewSkill] = useState("");

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

  const onSubmit = (data) => {
    console.log("Form submitted:", data);
    // Here you would typically send the data to your API
    // and update the profile state
  };

  // Add a new experience item
  const addExperience = () => {
    const newExperience = {
      id: `exp${Date.now()}`,
      title: "",
      company: "",
      isCurrentRole: false,
      startDate: "",
      endDate: "",
      location: "",
      description: "",
      isVerified: false
    };
    setExperiences([...experiences, newExperience]);
  };

  // Remove an experience item
  const removeExperience = (id) => {
    setExperiences(experiences.filter(exp => exp.id !== id));
  };

  // Update an experience item
  const updateExperience = (id, field, value) => {
    setExperiences(experiences.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  // Add a new education item
  const addEducation = () => {
    const newEducation = {
      id: `edu${Date.now()}`,
      institution: "",
      degree: "",
      field: "",
      startYear: new Date().getFullYear(),
      endYear: null,
      isVerified: false
    };
    setEducation([...education, newEducation]);
  };

  // Remove an education item
  const removeEducation = (id) => {
    setEducation(education.filter(edu => edu.id !== id));
  };

  // Update an education item
  const updateEducation = (id, field, value) => {
    setEducation(education.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    ));
  };

  // Add a new skill
  const addSkill = () => {
    if (newSkill.trim() === "") return;
    
    const newSkillItem = {
      id: `skill${Date.now()}`,
      name: newSkill,
      endorsements: 0
    };
    
    setSkills([...skills, newSkillItem]);
    setNewSkill("");
  };

  // Remove a skill
  const removeSkill = (id) => {
    setSkills(skills.filter(skill => skill.id !== id));
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
                <div className="space-y-6">
                  {experiences.map((exp, index) => (
                    <div key={exp.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Experience #{index + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeExperience(exp.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`title-${exp.id}`}>Job Title</Label>
                          <Input 
                            id={`title-${exp.id}`}
                            value={exp.title} 
                            onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                            placeholder="Job Title"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`company-${exp.id}`}>Company</Label>
                          <Input 
                            id={`company-${exp.id}`}
                            value={exp.company} 
                            onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                            placeholder="Company"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`startDate-${exp.id}`}>Start Date</Label>
                          <Input 
                            id={`startDate-${exp.id}`}
                            type="month"
                            value={exp.startDate} 
                            onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex flex-col">
                          <div className="flex items-center mb-2">
                            <Switch
                              id={`current-${exp.id}`}
                              checked={exp.isCurrentRole}
                              onCheckedChange={(checked) => updateExperience(exp.id, 'isCurrentRole', checked)}
                              className="mr-2"
                            />
                            <Label htmlFor={`current-${exp.id}`}>I currently work here</Label>
                          </div>
                          
                          {!exp.isCurrentRole && (
                            <>
                              <Label htmlFor={`endDate-${exp.id}`}>End Date</Label>
                              <Input 
                                id={`endDate-${exp.id}`}
                                type="month"
                                value={exp.endDate || ''} 
                                onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                className="mt-1"
                              />
                            </>
                          )}
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label htmlFor={`location-${exp.id}`}>Location</Label>
                          <Input 
                            id={`location-${exp.id}`}
                            value={exp.location || ''} 
                            onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                            placeholder="City, Country (Remote)"
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label htmlFor={`description-${exp.id}`}>Description</Label>
                          <Textarea 
                            id={`description-${exp.id}`}
                            value={exp.description || ''} 
                            onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                            placeholder="Describe your responsibilities and achievements"
                            className="mt-1 h-24"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {experiences.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <p>No experience added yet. Click "Add Experience" to get started.</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      className="bg-bondy-primary hover:bg-bondy-primary/90"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
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
                <div className="space-y-6">
                  {education.map((edu, index) => (
                    <div key={edu.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Education #{index + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeEducation(edu.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor={`institution-${edu.id}`}>School/University</Label>
                          <Input 
                            id={`institution-${edu.id}`}
                            value={edu.institution} 
                            onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                            placeholder="Institution name"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`degree-${edu.id}`}>Degree</Label>
                          <Input 
                            id={`degree-${edu.id}`}
                            value={edu.degree} 
                            onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                            placeholder="e.g. Bachelor's, Master's"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`field-${edu.id}`}>Field of Study</Label>
                          <Input 
                            id={`field-${edu.id}`}
                            value={edu.field} 
                            onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                            placeholder="e.g. Computer Science"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`startYear-${edu.id}`}>Start Year</Label>
                          <Input 
                            id={`startYear-${edu.id}`}
                            type="number"
                            value={edu.startYear} 
                            onChange={(e) => updateEducation(edu.id, 'startYear', parseInt(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`endYear-${edu.id}`}>End Year (or expected)</Label>
                          <Input 
                            id={`endYear-${edu.id}`}
                            type="number"
                            value={edu.endYear || ''} 
                            onChange={(e) => updateEducation(edu.id, 'endYear', parseInt(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {education.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <p>No education added yet. Click "Add Education" to get started.</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      className="bg-bondy-primary hover:bg-bondy-primary/90"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
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
                  
                  <div className="flex justify-end">
                    <Button 
                      className="bg-bondy-primary hover:bg-bondy-primary/90"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
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
                
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="profile-visibility" className="font-medium">Show profile views</Label>
                      <p className="text-sm text-gray-600 mt-1">Allow others to see when you've viewed their profile</p>
                    </div>
                    <Switch id="profile-visibility" defaultChecked />
                  </div>
                </div>
                
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
