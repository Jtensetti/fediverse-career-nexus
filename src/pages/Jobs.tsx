
import { useState, useEffect } from "react";
import { getPublishedJobPosts, type JobPost, type JobPostFilter } from "@/services/jobPostsService";
import JobCard from "@/components/JobCard";
import JobSearchFilter from "@/components/JobSearchFilter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSession } from "@supabase/auth-helpers-react";

const Jobs = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<JobPostFilter>({});
  const session = useSession();
  
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Job Listings</h1>
          {session && (
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
            {session && (
              <Button asChild>
                <Link to="/jobs/create">Post a Job</Link>
              </Button>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Jobs;
