
import { useState, useEffect } from "react";
import { getPublishedJobPosts, type JobPost, type JobPostFilter } from "@/services/jobPostsService";
import JobCard from "@/components/JobCard";
import JobSearchFilter from "@/components/JobSearchFilter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { JobCardSkeleton } from "@/components/common/skeletons";
import EmptyState from "@/components/common/EmptyState";
import { Briefcase } from "lucide-react";

const Jobs = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<JobPostFilter>({});
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
  
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      const jobsData = await getPublishedJobPosts(filters);
      setJobs(jobsData);
      setIsLoading(false);
    };
    
    fetchJobs();
  }, [filters]);
  
  const handleFilterChange = (newFilters: JobPostFilter) => {
    setFilters(newFilters);
  };

  const hasFilters = Object.keys(filters).length > 0;
  
  return (
    <DashboardLayout title="Job Listings">
      <div className="flex justify-end mb-6">
        {isAuthenticated && (
          <Button asChild>
            <Link to="/jobs/manage">Manage My Job Posts</Link>
          </Button>
        )}
      </div>
      
      <JobSearchFilter onFilterChange={handleFilterChange} />
      
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title={hasFilters ? "No matching jobs found" : "Be the first to post a job!"}
          description={
            hasFilters 
              ? "Try adjusting your filters to discover more opportunities."
              : "Reach professionals across the Fediverse. Post transparent job listings that respect candidates."
          }
          action={
            isAuthenticated 
              ? { label: "Post a Job", link: "/jobs/create" }
              : { label: "Sign up to post", link: "/auth/signup" }
          }
          secondaryAction={
            hasFilters 
              ? { label: "Clear filters", onClick: () => handleFilterChange({}) }
              : undefined
          }
        />
      )}
    </DashboardLayout>
  );
};

export default Jobs;
