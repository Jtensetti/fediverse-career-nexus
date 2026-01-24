import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createJobPost } from "@/services/jobPostsService";
import JobForm from "@/components/JobForm";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InlineErrorBanner from "@/components/InlineErrorBanner";
import { toast } from "sonner";

const JobCreate = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    message: string;
    details?: string;
  } | null>(null);
  
  // Log mount for debugging
  useEffect(() => {
    console.log('[JobCreate] Component mounted');
    return () => console.log('[JobCreate] Component unmounted');
  }, []);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log('[JobCreate] No user, redirecting to auth');
      toast.error("Please sign in to create job posts");
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  const handleSubmit = async (values: any) => {
    console.log('[JobCreate] handleSubmit called with:', values);
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const jobData = {
        ...values,
        // Convert empty strings to null (service also does this, but belt and suspenders)
        application_url: values.application_url || null,
        contact_email: values.contact_email || null,
      };
      
      console.log('[JobCreate] Creating job post with data:', jobData);
      const result = await createJobPost(jobData);
      console.log('[JobCreate] Job creation result:', result);
      
      if (result.ok) {
        console.log('[JobCreate] Success, navigating to:', `/jobs/${result.id}`);
        navigate(`/jobs/${result.id}`);
      } else {
        console.error('[JobCreate] Creation failed:', result);
        const errorResult = result as { ok: false; message: string; details?: string };
        setSubmitError({
          message: errorResult.message,
          details: errorResult.details
        });
        // Also show toast as backup
        toast.error(errorResult.message, {
          description: errorResult.details,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('[JobCreate] Error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setSubmitError({
        message: 'Failed to create job post',
        details: errorMessage
      });
      toast.error('Failed to create job post', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRetry = () => {
    setSubmitError(null);
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
        
        {/* Inline Error Banner - visible even if toasts fail */}
        {submitError && (
          <InlineErrorBanner
            message={submitError.message}
            details={submitError.details}
            onRetry={handleRetry}
            onDismiss={() => setSubmitError(null)}
            className="mb-6"
          />
        )}
        
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
