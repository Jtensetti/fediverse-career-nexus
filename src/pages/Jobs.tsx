
import { useState, useEffect } from "react";
import { getPublishedJobPosts, type JobPost, type JobPostFilter } from "@/services/jobPostsService";
import JobCard from "@/components/JobCard";
import JobSearchFilter from "@/components/JobSearchFilter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { JobCardSkeleton } from "@/components/common/skeletons";
import { EmptyState, SEOHead } from "@/components/common";
import { Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Jobs = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<JobPostFilter>({});
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
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
      <SEOHead
        title="Job Listings"
        description="Find your next opportunity on Nolto. Browse transparent job listings from companies across the Fediverse."
      />
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
