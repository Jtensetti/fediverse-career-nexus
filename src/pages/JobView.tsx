
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getJobPostById, type JobPost } from "@/services/jobPostsService";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Globe, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

const JobTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary"
};

const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
  if (!min && !max) return "Salary not specified";
  
  const currencySymbol = currency === "USD" ? "$" :
                          currency === "EUR" ? "€" :
                          currency === "GBP" ? "£" : currency || "";
  
  if (min && max) {
    return `${currencySymbol}${min.toLocaleString()} - ${currencySymbol}${max.toLocaleString()}`;
  }
  
  if (min) {
    return `${currencySymbol}${min.toLocaleString()}+`;
  }
  
  return `Up to ${currencySymbol}${max?.toLocaleString()}`;
};

const JobView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      
      setIsLoading(true);
      const jobData = await getJobPostById(id);
      setJob(jobData);
      setIsLoading(false);
      
      if (!jobData) {
        // Redirect to jobs page if job not found
        navigate("/jobs", { replace: true });
      }
    };
    
    fetchJob();
  }, [id, navigate]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container py-12 flex justify-center items-center">
          <p className="text-lg text-muted-foreground">Loading job details...</p>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!job) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container py-12 flex justify-center items-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Job not found</h2>
            <p className="text-muted-foreground mb-6">
              The job post you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/jobs">Browse Jobs</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container py-8">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link to="/jobs">← Back to Jobs</Link>
          </Button>
        </div>
        
        {/* Job header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
            <Badge variant={job.job_type === "full_time" ? "default" : "outline"}>
              {JobTypeLabels[job.job_type] || job.job_type}
            </Badge>
          </div>
          <h2 className="text-xl font-medium mb-4">{job.company_name}</h2>
          
          {/* Job meta info */}
          <div className="flex flex-wrap gap-4 text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            
            {job.remote_allowed && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Remote available</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Posted {job.published_at ? format(new Date(job.published_at), "PPP") : "recently"}</span>
            </div>
          </div>
          
          {/* Salary */}
          <div className="bg-muted p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-1">Compensation</h3>
            <p className="text-xl font-semibold">
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
            </p>
          </div>
        </div>
        
        {/* Job description */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Job Description</h3>
          <div className="prose prose-slate max-w-none">
            {job.description.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        {/* Skills */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Required Skills</h3>
          <div className="flex flex-wrap gap-2">
            {job.skills.length > 0 ? (
              job.skills.map((skill, index) => (
                <Badge key={index} variant="outline">{skill}</Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No specific skills listed</p>
            )}
          </div>
        </div>
        
        {/* Apply section */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-xl font-semibold mb-4">How to Apply</h3>
          {job.application_url ? (
            <div className="mb-4">
              <Button asChild size="lg">
                <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                  Apply Now <LinkIcon className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : job.contact_email ? (
            <div>
              <p className="mb-2">Send your application to:</p>
              <a href={`mailto:${job.contact_email}`} className="text-primary hover:underline">
                {job.contact_email}
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Contact the company directly for application details.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default JobView;
