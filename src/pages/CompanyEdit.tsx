import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead, EmptyState } from "@/components/common";
import CompanyForm, { type CompanyFormData } from "@/components/company/CompanyForm";
import { getCompanyBySlug, updateCompany } from "@/services/companyService";
import { canManageCompany } from "@/services/companyRolesService";
import { useAuth } from "@/contexts/AuthContext";
import { Building2 } from "lucide-react";

export default function CompanyEdit() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: () => getCompanyBySlug(slug!),
    enabled: !!slug,
  });

  const { data: hasAccess, isLoading: checkingAccess } = useQuery({
    queryKey: ['companyAccess', company?.id],
    queryFn: () => canManageCompany(company!.id),
    enabled: !!company?.id && !!user,
  });

  const updateMutation = useMutation({
    mutationFn: (data: CompanyFormData) => updateCompany(company!.id, {
      name: data.name,
      tagline: data.tagline || null,
      description: data.description || null,
      website: data.website || null,
      industry: data.industry || null,
      size: data.size || null,
      location: data.location || null,
      founded_year: data.founded_year || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', slug] });
      toast.success(t("companies.updateSuccess", "Company updated successfully"));
      navigate(`/company/${slug}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("companies.updateError", "Failed to update company"));
    },
  });

  if (isLoading || authLoading || checkingAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container max-w-3xl mx-auto py-10 px-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container max-w-3xl mx-auto py-10 px-4">
          <EmptyState
            icon={Building2}
            title={t("companies.notFound", "Company not found")}
            description={t("companies.notFoundDescription", "This company doesn't exist")}
            action={{ label: t("companies.browseAll", "Browse Companies"), link: "/companies" }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container max-w-3xl mx-auto py-10 px-4">
          <EmptyState
            icon={Building2}
            title={t("companies.noAccess", "Access denied")}
            description={t("companies.noAccessDescription", "You don't have permission to edit this company")}
            action={{ label: t("companies.viewCompany", "View Company"), link: `/company/${slug}` }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${t("common.edit", "Edit")} ${company.name}`}
        description={t("companies.editDescription", "Edit company settings")}
      />
      <Navbar />
      <main className="flex-grow">
        <div className="container max-w-3xl mx-auto py-10 px-4 sm:px-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to={`/company/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back", "Back")}
            </Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              {t("companies.editTitle", "Edit Company")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("companies.editDescription", "Update your company information")}
            </p>
          </div>

          <CompanyForm
            defaultValues={{
              name: company.name,
              slug: company.slug,
              tagline: company.tagline || "",
              description: company.description || "",
              website: company.website || "",
              industry: company.industry || "",
              size: company.size,
              location: company.location || "",
              founded_year: company.founded_year,
            }}
            onSubmit={async (data) => { await updateMutation.mutateAsync(data); }}
            isSubmitting={updateMutation.isPending}
            submitButtonText={t("common.saveChanges", "Save Changes")}
            isEdit
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
