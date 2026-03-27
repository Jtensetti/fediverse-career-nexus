import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { createJobPost } from "@/services/misc/jobPostsService";
import JobForm from "@/components/jobs/JobForm";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InlineErrorBanner from "@/components/forms/InlineErrorBanner";
import { toast } from "sonner";

const JobCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; details?: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      toast.error(t("jobCreate.signInRequired"));
      navigate("/auth");
    }
  }, [user, loading, navigate, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container py-8 flex items-center justify-center">
          <p className="text-muted-foreground">{t("jobCreate.loading")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const jobData = { ...values, application_url: values.application_url || null, contact_email: values.contact_email || null };
      const result = await createJobPost(jobData);
      if (result.ok) {
        navigate(`/jobs/${result.id}`);
      } else {
        const errorResult = result as { ok: false; message: string; details?: string };
        setSubmitError({ message: errorResult.message, details: errorResult.details });
        toast.error(errorResult.message, { description: errorResult.details, duration: 5000 });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("common.error");
      setSubmitError({ message: t("jobCreate.failed"), details: errorMessage });
      toast.error(t("jobCreate.failed"), { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t("jobCreate.title")}</h1>
          <p className="text-muted-foreground">{t("jobCreate.description")}</p>
        </div>
        {submitError && (
          <InlineErrorBanner message={submitError.message} details={submitError.details} onRetry={() => setSubmitError(null)} onDismiss={() => setSubmitError(null)} className="mb-6" />
        )}
        <JobForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </main>
      <Footer />
    </div>
  );
};

export default JobCreate;
