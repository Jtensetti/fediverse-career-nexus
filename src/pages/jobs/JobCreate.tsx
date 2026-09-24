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
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

const JobCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; details?: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const confirmDiscard = useUnsavedChanges({ dirty: isDirty, message: t("ux.leaveDescription") });

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
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const jobData = { ...values, application_url: values.application_url || null, contact_email: values.contact_email || null };
      const result = await createJobPost(jobData);
      if (result.ok) {
        toast.success(t(values.is_active ? "jobCreate.published" : "jobCreate.draftSaved"));
        confirmDiscard.afterSave(() => navigate(`/jobs/${result.id}`));
      } else {
        const errorResult = result as { ok: false; message: string; details?: string };
        setSubmitError({ message: errorResult.message, details: errorResult.details });
        toast.error(errorResult.message, { description: errorResult.details, duration: 5000 });
      }
    } catch {
      setSubmitError({ message: t("ux.saveUnconfirmed") });
      toast.error(t("ux.saveUnconfirmed"));
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
          <InlineErrorBanner message={submitError.message} details={submitError.details} onDismiss={() => setSubmitError(null)} className="mb-6" />
        )}
        <JobForm onSubmit={handleSubmit} isSubmitting={isSubmitting} onDirtyChange={setIsDirty} onCancel={() => confirmDiscard(() => navigate("/jobs/manage"))} />
      </main>
      <Footer />
    </div>
  );
};

export default JobCreate;
