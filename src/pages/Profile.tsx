import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { User, Briefcase, School, Award, Star, Link as LinkIcon, Mail, Phone, MapPin, Check, Users } from "lucide-react";
import ConnectionBadge, { ConnectionDegree } from "@/components/ConnectionBadge";
import { mockUserProfile, mockNetworkData } from "@/data/mockData";
import { ProfileViewsWidget } from "@/components/ProfileViewsWidget";
import { recordProfileView } from "@/services/profileViewService";
import { supabase } from "@/integrations/supabase/client";

const ProfilePage = () => {
  const { username } = useParams();
  const [profile] = useState(mockUserProfile);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Simulate viewing another user's profile if username parameter exists
  const viewingOwnProfile = !username || username === profile.username;
  
  // If viewing another user's profile, find their connection degree
  const connectionDegree = !viewingOwnProfile 
    ? mockNetworkData.connections.find(c => c.username === username)?.connectionDegree || null
    : null;
    
  // Record profile view when visiting another user's profile
  useEffect(() => {
    if (!viewingOwnProfile && username) {
      // In a real app, we would fetch the user's ID from username
      // For now, we'll use the mock data
      const userData = mockNetworkData.connections.find(c => c.username === username);
      if (userData && isAuthenticated) {
        recordProfileView(userData.id);
      }
    }
  }, [username, viewingOwnProfile, isAuthenticated]);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                <AvatarFallback>{profile.displayName.substring(0, 2)}</AvatarFallback>
              </Avatar>
              {connectionDegree && (
                <div className="absolute -bottom-2 -right-2">
                  <ConnectionBadge degree={connectionDegree} />
                </div>
              )}
            </div>
            
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                {profile.isVerified && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 flex items-center gap-1">
                    <Check size={14} /> Verified
                  </Badge>
                )}
                {connectionDegree && (
                  <ConnectionBadge degree={connectionDegree} />
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
                  <Users size={16} />
                  <Link to="/connections" className="hover:underline">{profile.connections} connections</Link>
                </div>
                <div className="flex items-center gap-1">
                  <LinkIcon size={16} />
                  <span>@{profile.username}</span>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{profile.bio}</p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {viewingOwnProfile ? (
                  <>
                    <Button variant="outline">
                      <Link to="/profile/edit">Edit Profile</Link>
                    </Button>
                    <Button variant="outline">
                      <Link to="/connections">Manage Connections</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="bg-bondy-primary hover:bg-bondy-primary/90">Connect</Button>
                    <Button variant="outline">Message</Button>
                    <Button variant="outline">Share Profile</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Profile Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Tabs defaultValue="experience" className="mb-6">
              <TabsList className="mb-4">
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="articles">Articles</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
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
              
              <TabsContent value="connections">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users size={20} className="text-bondy-primary" />
                      Connections ({profile.connections})
                    </h3>
                    
                    {profile.networkVisibilityEnabled ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {mockNetworkData.connections.slice(0, 8).map((connection) => (
                          <Link 
                            to={`/profile/${connection.username}`} 
                            key={connection.id} 
                            className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Avatar className="h-16 w-16 mb-2">
                              <AvatarImage src={connection.avatarUrl} alt={connection.displayName} />
                              <AvatarFallback>{connection.displayName.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <p className="font-medium">{connection.displayName}</p>
                                <ConnectionBadge degree={connection.connectionDegree} showIcon={false} size="sm" />
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2">{connection.headline}</p>
                            </div>
                          </Link>
                        ))}
                        
                        <Link 
                          to="/connections" 
                          className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                            <Users size={24} className="text-gray-500" />
                          </div>
                          <p className="font-medium text-bondy-primary">View All</p>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center p-8 text-gray-500">
                        <Users size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="mb-2">This user has chosen not to display their network connections</p>
                      </div>
                    )}
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
          </div>
          
          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Only show profile views widget if viewing own profile and authenticated */}
            {viewingOwnProfile && isAuthenticated && (
              <ProfileViewsWidget />
            )}
            
            {/* Other sidebar widgets can go here */}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfilePage;
