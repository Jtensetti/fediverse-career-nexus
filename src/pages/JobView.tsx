import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getJobPostById, type JobPost } from "@/services/jobPostsService";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Globe, Link as LinkIcon, Bookmark, Building2, DollarSign, Clock, Users, TrendingUp, Plane } from "lucide-react";
import { format } from "date-fns";
import { SEOHead, ShareButton, ReportDialog } from "@/components/common";
import { toast } from "sonner";
import TransparencyScore from "@/components/TransparencyScore";
import { JobInquiryButton } from "@/components/JobInquiryButton";
import { useAuth } from "@/contexts/AuthContext";

const JobTypeLabels: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  "full_time": "Full-time",
  "part_time": "Part-time",
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
  const { user } = useAuth();
  const [job, setJob] = useState<JobPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  
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

  const handleSaveJob = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? "Job removed from saved" : "Job saved!");
  };
  
  // Helper to get company name (handles both field names)
  const getCompanyName = (job: JobPost) => job.company_name || job.company;
  
  // Helper to check if remote work is allowed
  const isRemoteAllowed = (job: JobPost) => {
    if (job.remote_allowed !== undefined) return job.remote_allowed;
    return job.remote_policy === 'remote' || job.remote_policy === 'hybrid';
  };
  
  // Helper to get employment type label
  const getEmploymentType = (job: JobPost) => {
    const type = job.job_type || job.employment_type || 'full-time';
    return JobTypeLabels[type] || type;
  };
  
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
  
  const companyName = getCompanyName(job);
  const isRemote = isRemoteAllowed(job);
  const employmentType = getEmploymentType(job);
  
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${job.title} at ${companyName}`}
        description={job.description?.substring(0, 160) || `${job.title} position at ${companyName}`}
        type="website"
      />
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{job.title}</h1>
                <h2 className="text-lg sm:text-xl font-medium text-muted-foreground">{companyName}</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={employmentType === "Full-time" ? "default" : "outline"} className="text-sm whitespace-nowrap">
                {employmentType}
              </Badge>
              {isRemote && (
                <Badge variant="secondary" className="text-sm whitespace-nowrap">
                  <Globe className="h-3 w-3 mr-1" />
                  {job.remote_policy === 'hybrid' ? 'Hybrid' : 'Remote'}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Job meta info */}
          <div className="flex flex-wrap gap-4 text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{job.location || 'Location not specified'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Posted {job.created_at ? format(new Date(job.created_at), "PPP") : "recently"}</span>
            </div>
          </div>
          
          {/* Salary and Transparency Score */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-muted/50 p-4 rounded-lg flex items-center gap-3 flex-1 min-w-[200px]">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Compensation</p>
                <p className="text-xl font-semibold">
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                </p>
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg flex items-center gap-3">
              <TransparencyScore 
                score={job.transparency_score || 0}
                details={{
                  hasSalary: !!(job.salary_min || job.salary_max),
                  hasRemotePolicy: !!job.remote_policy,
                  hasInterviewProcess: !!job.interview_process,
                  hasResponseTime: !!job.response_time,
                  hasTeamSize: !!job.team_size,
                  hasGrowthPath: !!job.growth_path,
                  hasVisaInfo: job.visa_sponsorship !== null
                }}
                showDetails
              />
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <JobInquiryButton 
              jobId={job.id}
              jobTitle={job.title}
              posterId={job.user_id}
              companyName={companyName}
            />
            <ShareButton title={`${job.title} at ${companyName}`} description={job.description?.substring(0, 100)} />
            <Button variant="outline" size="sm" onClick={handleSaveJob}>
              <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save Job'}
            </Button>
            <ReportDialog contentType="job" contentId={job.id} contentTitle={job.title} />
          </div>
        </div>
        
        {/* Job description */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Job Description</h3>
          <div className="prose prose-slate max-w-none">
            {job.description?.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            )) || <p className="text-muted-foreground">No description provided</p>}
          </div>
        </div>
        
        {/* Skills */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Required Skills</h3>
          <div className="flex flex-wrap gap-2">
            {job.skills && job.skills.length > 0 ? (
              job.skills.map((skill, index) => (
                <Badge key={index} variant="outline">{skill}</Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No specific skills listed</p>
            )}
          </div>
        </div>
        
        {/* Transparency Details */}
        {(job.interview_process || job.response_time || job.team_size || job.growth_path || job.visa_sponsorship !== null) && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Hiring Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {job.interview_process && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Interview Process</p>
                    <p className="text-sm text-muted-foreground">{job.interview_process}</p>
                  </div>
                </div>
              )}
              {job.response_time && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Response Time</p>
                    <p className="text-sm text-muted-foreground">{job.response_time}</p>
                  </div>
                </div>
              )}
              {job.team_size && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Team Size</p>
                    <p className="text-sm text-muted-foreground">{job.team_size}</p>
                  </div>
                </div>
              )}
              {job.growth_path && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Growth Path</p>
                    <p className="text-sm text-muted-foreground">{job.growth_path}</p>
                  </div>
                </div>
              )}
              {job.visa_sponsorship !== null && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Plane className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Visa Sponsorship</p>
                    <p className="text-sm text-muted-foreground">
                      {job.visa_sponsorship ? 'Available' : 'Not available'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Apply section */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-xl font-semibold mb-4">How to Apply</h3>
          <div className="flex flex-wrap gap-4">
            {/* Message hiring manager button */}
            <JobInquiryButton 
              jobId={job.id}
              jobTitle={job.title}
              posterId={job.user_id}
              companyName={companyName}
            />
            
            {job.application_url ? (
              <Button asChild size="lg">
                <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                  Apply Now <LinkIcon className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : job.contact_email ? (
              <Button asChild size="lg" variant="outline">
                <a href={`mailto:${job.contact_email}`} className="flex items-center">
                  Email Application <LinkIcon className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>
          
          {!job.application_url && !job.contact_email && user?.id !== job.user_id && (
            <p className="text-muted-foreground mt-4">
              Use the "Message Hiring Manager" button above to inquire about this position.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default JobView;
