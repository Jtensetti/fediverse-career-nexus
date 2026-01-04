import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getJobPostById, updateJobPost } from "@/services/jobPostsService";
import JobForm from "@/components/JobForm";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const JobEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !user) {
      toast.error("Please sign in to edit job posts");
      navigate("/auth");
      return;
    }
    
    if (!user) return;
    
    const fetchJob = async () => {
      if (!id) return;
      
      setIsLoading(true);
      const jobData = await getJobPostById(id);
      
      if (!jobData) {
        toast.error("Job post not found");
        navigate("/jobs/manage");
        return;
      }
      
      // Verify the current user owns this job post
      if (user.id !== jobData.user_id) {
        toast.error("You don't have permission to edit this job post");
        navigate("/jobs/manage");
        return;
      }
      
      setJob(jobData);
      setIsLoading(false);
    };
    
    fetchJob();
  }, [id, navigate, user, loading]);
  
  const handleSubmit = async (values: any) => {
    if (!id) return;
    
    setIsSubmitting(true);
    
    const jobData = {
      ...values,
      // Convert empty strings to null
      application_url: values.application_url || null,
      contact_email: values.contact_email || null,
    };
    
    const success = await updateJobPost(id, jobData);
    setIsSubmitting(false);
    
    if (success) {
      navigate(`/jobs/${id}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container py-8 flex justify-center items-center">
          <p className="text-lg text-muted-foreground">Loading job post...</p>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Edit Job Post</h1>
          <p className="text-muted-foreground">
            Update the details of your job posting
          </p>
        </div>
        
        <JobForm 
          defaultValues={job}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="Update Job Post"
        />
      </main>
      <Footer />
    </div>
  );
};

export default JobEdit;
