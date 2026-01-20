import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FederatedFeed from "../FederatedFeed";
import { useEffect, useState } from "react";
import { getPublishedJobPosts, type JobPost } from "@/services/jobPostsService";
import { useTranslation } from "react-i18next";
import HeroWithScreenshot from "./HeroWithScreenshot";
import FeaturedIn from "./FeaturedIn";
import AlternatingFeatures from "./AlternatingFeature";
import FederationVisual from "./FederationVisual";
import HomepageFAQ from "./HomepageFAQ";
import FinalCTA from "./FinalCTA";
import StickyCTA from "./StickyCTA";
import ScrollReveal from "../common/ScrollReveal";

const UnauthenticatedHomepage = () => {
  const { t } = useTranslation();
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
      {/* New Hero with Screenshot */}
      <HeroWithScreenshot />

      {/* Featured In / Trust Indicators */}
      <FeaturedIn />

      {/* Alternating Feature Sections with Screenshots */}
      <AlternatingFeatures />

      {/* Visual Federation Explainer */}
      <ScrollReveal>
        <FederationVisual />
      </ScrollReveal>

      {/* Live Feed Preview */}
      <ScrollReveal>
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-secondary font-semibold text-sm uppercase tracking-wide mb-2 block">
                  {t("homepage.liveFeed.subtitle")}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                  {t("homepage.liveFeed.title")}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {t("homepage.liveFeed.description")}
                </p>
              </div>
              
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-muted/50 px-6 py-3 border-b flex items-center justify-between">
                    <span className="font-semibold text-foreground">{t("homepage.liveFeed.liveFeed")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      <span className="text-xs text-muted-foreground">{t("homepage.liveFeed.realTime")}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="max-h-96 overflow-y-auto">
                      <FederatedFeed limit={4} className="space-y-4" />
                    </div>
                    <div className="mt-6 text-center">
                      <Button asChild variant="outline" size="lg">
                        <Link to="/feed">{t("homepage.liveFeed.viewFullFeed")}</Link>
                      </Button>
                    </div>
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
          <section className="py-20 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <span className="text-secondary font-semibold text-sm uppercase tracking-wide mb-2 block">
                    {t("homepage.jobs.subtitle")}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                    {t("homepage.jobs.title")}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    {t("homepage.jobs.description")}
                  </p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                  {jobs.map((job, index) => (
                    <ScrollReveal key={job.id} delay={index * 0.1} direction="up">
                      <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                        <CardContent className="p-6">
                          <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-2">{job.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{job.company_name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{job.description}</p>
                          {job.salary_min && job.salary_max && (
                            <p className="font-bold text-secondary">
                              ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  ))}
                </div>
                
                <div className="text-center">
                  <Button asChild variant="outline" size="lg">
                    <Link to="/jobs">{t("homepage.jobs.browseAll")}</Link>
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

      {/* Final CTA */}
      <ScrollReveal>
        <FinalCTA />
      </ScrollReveal>

      {/* Sticky CTA */}
      <StickyCTA />
    </div>
  );
};

export default UnauthenticatedHomepage;
