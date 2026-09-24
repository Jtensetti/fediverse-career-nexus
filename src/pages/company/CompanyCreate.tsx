import InlineErrorBanner from "@/components/forms/InlineErrorBanner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SEOHead } from "@/components/common";
import { Button } from "@/components/ui/button";
import CompanyForm, { type CompanyFormData } from "@/components/company/CompanyForm";
import { createCompany } from "@/services/company/companyService";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function CompanyCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const confirmDiscard = useUnsavedChanges({ dirty: isDirty, message: t("ux.leaveDescription") });

  const handleSubmit = async (data: CompanyFormData) => {
    if (isSubmitting) return;
    setSubmitError(false);
    setIsSubmitting(true);
    try {
      const company = await createCompany({
        name: data.name,
        slug: data.slug,
        tagline: data.tagline || null,
        description: data.description || null,
        website: data.website || null,
        industry: data.industry || null,
        size: data.size || null,
        location: data.location || null,
        founded_year: data.founded_year || null,
      });

      if (!company) { setSubmitError(true); return; }
      if (company) {
        toast.success(t("companies.createSuccess", "Company created successfully!"));
        confirmDiscard.afterSave(() => navigate(`/organisation/${company.slug}`));
      }
    } catch (error: any) {
      setSubmitError(true);
      console.error("Failed to create company:", error);
      toast.error(error.message || t("companies.createError", "Failed to create company"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={t("companies.createTitle", "Create Company")}
        description={t("companies.createDescription", "Create a company page on Nolto")}
      />
      <Navbar />
      <main className="flex-grow">
        <div className="container max-w-3xl mx-auto py-10 px-4 sm:px-6">
          <div className="mb-8">
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => confirmDiscard(() => navigate('/organisationer'))}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("companies.backToCompanies", "Back to Companies")}
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("companies.createTitle", "Create Company")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("companies.createDescription", "Create a company page to showcase your organization")}
            </p>
          </div>

          {submitError && <InlineErrorBanner message={t("ux.saveUnconfirmed")} className="mb-4" />}
          <CompanyForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            onDirtyChange={setIsDirty}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
