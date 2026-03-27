import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { getJobPostById, updateJobPost } from "@/services/misc/jobPostsService";
import JobForm from "@/components/jobs/JobForm";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";

const JobEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      toast.error(t('jobEdit.signInRequired'));
      navigate("/auth");
      return;
    }
    if (!user) return;
    
    const fetchJob = async () => {
      if (!id) return;
      setIsLoading(true);
      const jobData = await getJobPostById(id);
      if (!jobData) {
        toast.error(t('jobEdit.notFound'));
        navigate("/jobs/manage");
        return;
      }
      if (user.id !== jobData.user_id) {
        toast.error(t('jobEdit.noPermission'));
        navigate("/jobs/manage");
        return;
      }
      setJob(jobData);
      setIsLoading(false);
    };
    fetchJob();
  }, [id, navigate, user, loading, t]);
  
  const handleSubmit = async (values: any) => {
    if (!id) return;
    setIsSubmitting(true);
    const jobData = {
      ...values,
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
          <p className="text-lg text-muted-foreground">{t('jobEdit.loading')}</p>
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
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t('jobEdit.title')}</h1>
          <p className="text-muted-foreground">{t('jobEdit.subtitle')}</p>
        </div>
        <JobForm 
          defaultValues={job}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText={t('jobEdit.updateButton')}
        />
      </main>
      <Footer />
    </div>
  );
};

export default JobEdit;