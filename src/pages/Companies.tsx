import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SEOHead } from "@/components/common";
import DashboardLayout from "@/components/DashboardLayout";
import { CompanyCard, CompanySearchFilter } from "@/components/company";
import { searchCompanies, getCompanies, type CompanyFilters } from "@/services/companyService";
import { useAuth } from "@/contexts/AuthContext";

export default function Companies() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [filters, setFilters] = useState<CompanyFilters>({});

  const hasFilters = Object.keys(filters).some(k => !!filters[k as keyof CompanyFilters]);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', filters],
    queryFn: () => hasFilters ? searchCompanies(filters) : getCompanies(),
  });

  const handleFilterChange = useCallback((newFilters: CompanyFilters) => {
    setFilters(newFilters);
  }, []);

  return (
    <DashboardLayout title={t("companies.title", "Companies")}>
      <SEOHead
        title={t("companies.title", "Companies")}
        description={t("companies.subtitle", "Discover and follow companies on Nolto")}
      />

      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-muted-foreground">
            {t("companies.subtitle", "Discover and follow companies on Nolto")}
          </p>
        </div>
        {user && (
          <Button asChild>
            <Link to="/companies/create">
              <Plus className="h-4 w-4 mr-2" />
              {t("companies.create", "Create Company")}
            </Link>
          </Button>
        )}
      </div>

      <CompanySearchFilter onFilterChange={handleFilterChange} />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-16 w-full rounded-t-lg" />
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="h-14 w-14 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : companies.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title={hasFilters 
            ? t("companies.noMatching", "No companies found")
            : t("companies.beFirst", "Be the first to create a company page")
          }
          description={hasFilters
            ? t("companies.adjustFilters", "Try adjusting your search filters")
            : t("companies.createDescription", "Showcase your company and connect with professionals")
          }
          action={
            user
              ? { label: t("companies.create", "Create Company"), link: "/companies/create" }
              : { label: t("auth.signUp", "Sign Up"), link: "/auth/signup" }
          }
          secondaryAction={
            hasFilters
              ? { label: t("common.clearFilters", "Clear Filters"), onClick: () => handleFilterChange({}) }
              : undefined
          }
        />
      )}
    </DashboardLayout>
  );
}
