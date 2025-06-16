
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, ArrowRight, Puzzle } from "lucide-react";
import FederatedFeed from "./FederatedFeed";
import { useEffect, useState } from "react";
import { getPublishedJobPosts, type JobPost } from "@/services/jobPostsService";

const UnauthenticatedHomepage = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const jobsData = await getPublishedJobPosts();
      setJobs(jobsData.slice(0, 3));
    };
    
    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bondy-primary to-bondy-accent/90 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <img 
            src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
            alt="Bondy" 
            className="w-16 h-16 mx-auto mb-6" 
          />
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-6 leading-tight">
            Your network. Your feed. <br />
            <span className="text-bondy-highlight">Your terms.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            Welcome to a professional network where relationships come before reach – and where you decide what you see, what you share, and how you show up.
          </p>
        </div>
      </div>

      {/* Intro Section */}
      <div className="bg-white text-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              You're here to connect, to share insights, to find opportunities – and to be part of something that actually feels relevant. That shouldn't be complicated. That's why we built Bondy: <strong className="text-bondy-primary">a space where your feed makes sense, your voice is heard, and your data isn't for sale.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Core Principles */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-bondy-primary font-display mb-12 text-center">
              Three core principles
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4 w-16 h-16 bg-bondy-primary/10 rounded-full flex items-center justify-center">
                    <Puzzle className="h-8 w-8 text-bondy-primary" />
                  </div>
                  <CardTitle className="text-bondy-primary text-lg">Everything you need – nothing you didn't ask for</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-sm">Your feed shows posts in the order they were shared. From the people you follow. No surprises. No "sponsored" noise.</p>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4 w-16 h-16 bg-bondy-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="h-8 w-8 text-bondy-primary" />
                  </div>
                  <CardTitle className="text-bondy-primary text-lg">Your data stays yours</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-sm">Your profile is yours – full stop. We don't track you, sell you, or shape what you see. You're in control.</p>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4 w-16 h-16 bg-bondy-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-8 w-8 text-bondy-primary" />
                  </div>
                  <CardTitle className="text-bondy-primary text-lg">Built for trust, not clout</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-sm">Bondy isn't about building followers. It's about building relationships. Everyone plays by the same rules, from day one.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed Preview */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-bondy-primary font-display mb-3">
                See what's happening
              </h2>
              <p className="text-base text-gray-600">
                Insights, updates, and discussions – from the people you follow
              </p>
            </div>
            
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="max-h-96 overflow-y-auto">
                  <FederatedFeed limit={4} className="space-y-4" />
                </div>
                <div className="mt-4 text-center">
                  <Button asChild variant="outline">
                    <Link to="/feed">Take a look first</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Job Opportunities */}
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-bondy-primary font-display mb-3">
                Opportunities that matter
              </h2>
              <p className="text-base text-gray-600">
                Transparent roles from companies that share your values
              </p>
            </div>
            
            {jobs.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {jobs.map(job => (
                  <Card key={job.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-bondy-primary line-clamp-2 text-base">{job.title}</CardTitle>
                      <p className="text-sm text-gray-600">{job.company_name}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 line-clamp-3 mb-4 text-sm">{job.description}</p>
                      {job.salary_min && job.salary_max && (
                        <p className="font-semibold text-bondy-accent text-sm">
                          ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4 text-sm">Soon you'll find open roles from companies that value transparency, respect, and autonomy – just like you do.</p>
              </div>
            )}
            
            <div className="text-center">
              <Button asChild variant="outline">
                <Link to="/jobs">View all opportunities</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-bondy-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold font-display mb-4">
              Start where you are
            </h2>
            <p className="text-base md:text-lg text-white/90 mb-8 leading-relaxed">
              Create a profile in under a minute. Invite someone you trust. Share a thought. Notice the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg"
                className="bg-bondy-highlight text-bondy-primary hover:bg-bondy-highlight/90 font-medium px-6 py-3"
              >
                <Link to="/auth/signup">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 font-medium px-6 py-3"
              >
                <Link to="/feed">Take a look first</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthenticatedHomepage;
