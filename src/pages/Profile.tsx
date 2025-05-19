
import { useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { User, Briefcase, School, Award, Star, Link, Mail, Phone, MapPin, Check } from "lucide-react";

// Mock data for development
const mockUserProfile = {
  id: "user123",
  username: "johndoe",
  displayName: "John Doe",
  headline: "Senior Software Engineer | Web3 | ActivityPub Developer",
  bio: "Building decentralized social networks with a focus on privacy and user autonomy. Passionate about open web standards and federation protocols.",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe",
  isVerified: true,
  domain: "example.com",
  connections: 342,
  profileViews: 1289,
  contact: {
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA"
  },
  experience: [
    {
      id: "exp1",
      title: "Senior Software Engineer",
      company: "Decentralized Labs",
      isCurrentRole: true,
      startDate: "2020-06",
      location: "San Francisco, CA (Remote)",
      description: "Leading development of ActivityPub-based social networking platform.",
      isVerified: true
    },
    {
      id: "exp2",
      title: "Web Developer",
      company: "Tech Solutions Inc",
      isCurrentRole: false,
      startDate: "2016-03",
      endDate: "2020-05",
      location: "Portland, OR",
      description: "Developed and maintained client websites and web applications.",
      isVerified: true
    }
  ],
  education: [
    {
      id: "edu1",
      institution: "University of Technology",
      degree: "Master of Computer Science",
      field: "Distributed Systems",
      startYear: 2014,
      endYear: 2016,
      isVerified: true
    },
    {
      id: "edu2",
      institution: "State College",
      degree: "Bachelor of Science",
      field: "Computer Science",
      startYear: 2010,
      endYear: 2014,
      isVerified: false
    }
  ],
  skills: [
    { id: "skill1", name: "JavaScript", endorsements: 78 },
    { id: "skill2", name: "React", endorsements: 65 },
    { id: "skill3", name: "Node.js", endorsements: 52 },
    { id: "skill4", name: "ActivityPub", endorsements: 43 },
    { id: "skill5", name: "TypeScript", endorsements: 38 },
    { id: "skill6", name: "Web Development", endorsements: 29 }
  ]
};

const ProfilePage = () => {
  const { username } = useParams();
  const [profile] = useState(mockUserProfile);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-32 w-32 border-4 border-white shadow-md">
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
              <AvatarFallback>{profile.displayName.substring(0, 2)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                {profile.isVerified && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 flex items-center gap-1">
                    <Check size={14} /> Verified
                  </Badge>
                )}
              </div>
              
              <h2 className="text-xl text-gray-700 mb-3">{profile.headline}</h2>
              
              <div className="flex flex-wrap items-center text-sm text-gray-600 gap-x-4 gap-y-2 mb-4">
                {profile.contact.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{profile.contact.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <User size={16} />
                  <span>{profile.connections} connections</span>
                </div>
                <div className="flex items-center gap-1">
                  <Link size={16} />
                  <span>@{profile.username}</span>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{profile.bio}</p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Button className="bg-bondy-primary hover:bg-bondy-primary/90">Connect</Button>
                <Button variant="outline">Message</Button>
                <Button variant="outline">Share Profile</Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Profile Content */}
        <Tabs defaultValue="experience" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="experience">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Briefcase size={20} className="text-bondy-primary" />
                  Experience
                </h3>
                
                <div className="space-y-6">
                  {profile.experience.map((exp) => (
                    <div key={exp.id} className="pb-6">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{exp.title}</h4>
                        {exp.isVerified && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
                            <Check size={14} /> Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-bondy-primary">{exp.company}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(exp.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} - 
                        {exp.isCurrentRole ? ' Present' : 
                        ` ${new Date(exp.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}`}
                      </p>
                      <p className="text-sm text-gray-600">{exp.location}</p>
                      <p className="mt-2">{exp.description}</p>
                      <Separator className="mt-6" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="education">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <School size={20} className="text-bondy-primary" />
                  Education
                </h3>
                
                <div className="space-y-6">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="pb-6">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{edu.institution}</h4>
                        {edu.isVerified && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
                            <Check size={14} /> Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-bondy-primary">{edu.degree}, {edu.field}</p>
                      <p className="text-sm text-gray-600">{edu.startYear} - {edu.endYear}</p>
                      <Separator className="mt-6" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="skills">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star size={20} className="text-bondy-primary" />
                  Skills
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  {profile.skills.map((skill) => (
                    <div key={skill.id} className="bg-gray-100 rounded-lg p-3 flex flex-col">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-sm text-gray-600">{skill.endorsements} endorsements</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="articles">
            <Card>
              <CardContent className="pt-6 flex items-center justify-center p-12">
                <div className="text-center text-gray-500">
                  <p>No articles published yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Contact Information */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            
            <div className="space-y-3">
              {profile.contact.email && (
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-bondy-primary" />
                  <span>{profile.contact.email}</span>
                </div>
              )}
              
              {profile.contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-bondy-primary" />
                  <span>{profile.contact.phone}</span>
                </div>
              )}
              
              {profile.contact.location && (
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-bondy-primary" />
                  <span>{profile.contact.location}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfilePage;
