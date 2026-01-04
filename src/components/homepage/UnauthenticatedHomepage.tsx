import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import FederatedFeed from "../FederatedFeed";
import { useEffect, useState } from "react";
import { getPublishedJobPosts, type JobPost } from "@/services/jobPostsService";
import TrustBadges from "./TrustBadges";
import LiveStats from "./LiveStats";
import WhyFederated from "./WhyFederated";
import FederationExplainer from "./FederationExplainer";
import FeatureShowcase from "./FeatureShowcase";
import HomepageFAQ from "./HomepageFAQ";
import FinalCTA from "./FinalCTA";
import NewsletterSubscribe from "../NewsletterSubscribe";
import Testimonials from "./Testimonials";
import BuiltInOpen from "./BuiltInOpen";
import ScrollReveal from "../common/ScrollReveal";

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <img 
              src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
              alt="Nolto" 
              className="w-20 h-20 mx-auto mb-8 drop-shadow-lg" 
            />
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display mb-6 leading-tight animate-fade-in">
              The Professional Network <br />
              <span className="text-accent">That Respects Your Freedom</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto leading-relaxed animate-slide-in">
              Connect with professionals across the Fediverse. Your data, your instance, your network.
              No algorithms. No ads. No lock-in.
            </p>

            {/* Trust Badges */}
            <div className="mb-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <TrustBadges />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <Button 
                asChild 
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 py-6 text-lg shadow-lg hover:scale-105 transition-transform"
              >
                <Link to="/auth/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-primary-foreground/80 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 font-semibold px-8 py-6 text-lg hover:scale-105 transition-transform backdrop-blur-sm"
              >
                <Link to="/feed">Explore the Feed</Link>
              </Button>
            </div>

            {/* Live Stats */}
            <div className="animate-fade-in" style={{ animationDelay: "0.7s" }}>
              <LiveStats />
            </div>
          </div>
        </div>
      </section>

      {/* Why Federated Comparison */}
      <ScrollReveal>
        <WhyFederated />
      </ScrollReveal>

      {/* Testimonials */}
      <ScrollReveal delay={0.1}>
        <Testimonials />
      </ScrollReveal>

      {/* How Federation Works */}
      <ScrollReveal delay={0.1}>
        <FederationExplainer />
      </ScrollReveal>

      {/* Feature Showcase */}
      <ScrollReveal delay={0.1}>
        <FeatureShowcase />
      </ScrollReveal>

      {/* Built in Open */}
      <ScrollReveal delay={0.1}>
        <BuiltInOpen />
      </ScrollReveal>

      {/* Live Feed Preview */}
      <ScrollReveal>
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
                  See What's Happening
                </h2>
                <p className="text-muted-foreground">
                  Real conversations from professionals across the network
                </p>
              </div>
              
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="max-h-96 overflow-y-auto">
                    <FederatedFeed limit={4} className="space-y-4" />
                  </div>
                  <div className="mt-6 text-center">
                    <Button asChild variant="outline">
                      <Link to="/feed">View Full Feed</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Job Opportunities */}
      {jobs.length > 0 && (
        <ScrollReveal>
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
                    Opportunities That Matter
                  </h2>
                  <p className="text-muted-foreground">
                    Transparent roles from companies that respect your values
                  </p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                  {jobs.map((job, index) => (
                    <ScrollReveal key={job.id} delay={index * 0.1} direction="up">
                      <Card className="shadow-md border-0 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">{job.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{job.company_name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description}</p>
                          {job.salary_min && job.salary_max && (
                            <p className="font-semibold text-secondary text-sm">
                              ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  ))}
                </div>
                
                <div className="text-center">
                  <Button asChild variant="outline">
                    <Link to="/jobs">View All Jobs</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* FAQ */}
      <ScrollReveal>
        <HomepageFAQ />
      </ScrollReveal>

      {/* Newsletter */}
      <ScrollReveal>
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold font-display text-foreground mb-4">
                Stay Updated
              </h2>
              <p className="text-muted-foreground mb-6">
                Get the latest news about Nolto and the federated professional network movement
              </p>
              <NewsletterSubscribe />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Final CTA */}
      <ScrollReveal>
        <FinalCTA />
      </ScrollReveal>
    </div>
  );
};

export default UnauthenticatedHomepage;
