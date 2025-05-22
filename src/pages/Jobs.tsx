
import { useState, useEffect } from "react";
import { getPublishedJobPosts, type JobPost, type JobPostFilter } from "@/services/jobPostsService";
import JobCard from "@/components/JobCard";
import JobSearchFilter from "@/components/JobSearchFilter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
        <div className="flex justify-center items-center py-12">
          <p className="text-lg text-muted-foreground">Loading jobs...</p>
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <h2 className="text-2xl font-semibold mb-2">No job posts found</h2>
          <p className="text-muted-foreground mb-6">
            {Object.keys(filters).length > 0 
              ? "Try adjusting your filters to see more results."
              : "There are no job posts available at the moment."}
          </p>
          {isAuthenticated && (
            <Button asChild>
              <Link to="/jobs/create">Post a Job</Link>
            </Button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Jobs;
