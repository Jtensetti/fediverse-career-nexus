import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/common";
import { Button } from "@/components/ui/button";
import CompanyForm, { type CompanyFormData } from "@/components/company/CompanyForm";
import { createCompany } from "@/services/companyService";

export default function CompanyCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CompanyFormData) => {
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
      
      if (company) {
        toast.success(t("companies.createSuccess", "Company created successfully!"));
        navigate(`/company/${company.slug}`);
      }
    } catch (error: any) {
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
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link to="/companies">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("companies.backToCompanies", "Back to Companies")}
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("companies.createTitle", "Create Company")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("companies.createDescription", "Create a company page to showcase your organization")}
            </p>
          </div>

          <CompanyForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
