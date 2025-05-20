
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@supabase/auth-helpers-react";
import { createJobPost } from "@/services/jobPostsService";
import JobForm from "@/components/JobForm";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const JobCreate = () => {
  const navigate = useNavigate();
  const session = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect if not authenticated
  if (session === null) {
    toast.error("Please sign in to create job posts");
    navigate("/");
    return null;
  }
  
  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    
    const jobData = {
      ...values,
      // Convert empty strings to null
      application_url: values.application_url || null,
      contact_email: values.contact_email || null,
    };
    
    const jobId = await createJobPost(jobData);
    setIsSubmitting(false);
    
    if (jobId) {
      navigate(`/jobs/${jobId}`);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create Job Post</h1>
          <p className="text-muted-foreground">
            Fill in the details below to create a new job posting
          </p>
        </div>
        
        <JobForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </main>
      <Footer />
    </div>
  );
};

export default JobCreate;
