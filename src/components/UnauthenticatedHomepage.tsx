
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Users, Shield, Network, ArrowRight } from "lucide-react";
import FederatedFeed from "./FederatedFeed";
import { useEffect, useState } from "react";
import { getPublishedJobPosts, type JobPost } from "@/services/jobPostsService";

const UnauthenticatedHomepage = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const jobsData = await getPublishedJobPosts({}, 3); // Get only 3 jobs for preview
      setJobs(jobsData);
    };
    
    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bondy-primary to-bondy-accent/90 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <img 
            src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
            alt="Bondy" 
            className="w-20 h-20 mx-auto mb-6" 
          />
          <h1 className="text-5xl md:text-6xl font-bold font-display mb-6">
            Welcome to Bondy
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            The professional network built on the fediverse. Connect, share, and grow your career while keeping control of your data.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              asChild 
              size="lg"
              className="bg-bondy-highlight text-bondy-primary hover:bg-bondy-highlight/90 font-medium text-lg px-8 py-4"
            >
              <Link to="/auth/signup">
                Create Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 font-medium text-lg px-8 py-4"
            >
              <Link to="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* What is the Fediverse Section */}
      <div className="bg-white text-gray-900 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-bondy-primary font-display mb-6">
              What is the Fediverse?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              The fediverse is a network of interconnected social platforms that can communicate with each other while remaining independent. Think of it as email for social media - you can use any platform and still connect with users on other platforms.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <Network className="h-12 w-12 text-bondy-primary mx-auto mb-4" />
                <CardTitle className="text-bondy-primary">Decentralized</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">No single company controls your data or connections. Each server is independently operated.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <Shield className="h-12 w-12 text-bondy-primary mx-auto mb-4" />
                <CardTitle className="text-bondy-primary">Privacy First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Your data stays with the server you choose. No algorithmic manipulation or data mining.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <Users className="h-12 w-12 text-bondy-primary mx-auto mb-4" />
                <CardTitle className="text-bondy-primary">Interoperable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Connect with users across different platforms using open standards like ActivityPub.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Live Feed Preview */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-bondy-primary font-display mb-4">
                Live Federated Feed
              </h2>
              <p className="text-lg text-gray-600">
                See what's happening across the professional fediverse right now
              </p>
            </div>
            
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="max-h-96 overflow-y-auto">
                  <FederatedFeed limit={5} className="space-y-4" />
                </div>
                <div className="mt-4 text-center">
                  <Button asChild variant="outline">
                    <Link to="/feed">View Full Feed</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Job Listings Preview */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-bondy-primary font-display mb-4">
                Latest Job Opportunities
              </h2>
              <p className="text-lg text-gray-600">
                Discover career opportunities with transparent pay and benefits
              </p>
            </div>
            
            {jobs.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {jobs.map(job => (
                  <Card key={job.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-bondy-primary line-clamp-2">{job.title}</CardTitle>
                      <p className="text-sm text-gray-600">{job.company}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 line-clamp-3 mb-4">{job.description}</p>
                      {job.salary_min && job.salary_max && (
                        <p className="font-semibold text-bondy-accent">
                          ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No job listings available at the moment.</p>
              </div>
            )}
            
            <div className="text-center">
              <Button asChild>
                <Link to="/jobs" className="bg-bondy-primary hover:bg-bondy-primary/90">
                  View All Jobs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-bondy-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
              Ready to Join the Professional Fediverse?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Take control of your professional network and connect with like-minded professionals across the fediverse.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg"
                className="bg-bondy-highlight text-bondy-primary hover:bg-bondy-highlight/90 font-medium text-lg px-8 py-4"
              >
                <Link to="/auth/signup">
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthenticatedHomepage;
