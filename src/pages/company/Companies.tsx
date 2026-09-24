import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SEOHead } from "@/components/common";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { CompanyCard, CompanySearchFilter } from "@/components/company";
import { searchCompanies, getCompanies, type CompanyFilters } from "@/services/company/companyService";
import { useAuth } from "@/contexts/AuthContext";

export default function Companies() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo<CompanyFilters>(() => ({
    search: searchParams.get('q') || undefined,
    industry: searchParams.get('type') || undefined,
    size: (searchParams.get('size') as CompanyFilters['size']) || undefined,
    location: searchParams.get('location') || undefined,
  }), [searchParams]);

  const hasFilters = Object.keys(filters).some(k => !!filters[k as keyof CompanyFilters]);

  const { data: companies = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['companies', filters],
    queryFn: () => hasFilters ? searchCompanies(filters) : getCompanies(),
  });

  const handleFilterChange = useCallback((newFilters: CompanyFilters) => {
    const next = new URLSearchParams();
    if (newFilters.search) next.set('q', newFilters.search);
    if (newFilters.industry) next.set('type', newFilters.industry);
    if (newFilters.size) next.set('size', newFilters.size);
    if (newFilters.location) next.set('location', newFilters.location);
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);

  return (
    <DashboardLayout title={t("companies.title")}>
      <SEOHead
        title={t("companies.title")}
        description={t("companies.subtitle")}
      />

      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-muted-foreground">
            {t("companies.subtitle")}
          </p>
        </div>
        {user && (
          <Button asChild>
            <Link to="/organisationer/skapa">
              <Plus className="h-4 w-4 mr-2" />
              {t("companies.create")}
            </Link>
          </Button>
        )}
      </div>

      <CompanySearchFilter filters={filters} onFilterChange={handleFilterChange} />

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
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
          <p className="font-medium">{t("common.error")}</p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>{t("common.retry")}</Button>
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
            ? t("companies.noMatching")
            : t("companies.beFirst")
          }
          description={hasFilters
            ? t("companies.adjustFilters")
            : t("companies.createDescription")
          }
          action={
            user
              ? { label: t("companies.create"), link: "/organisationer/skapa" }
              : { label: t("auth.signUp"), link: "/auth/signup" }
          }
          secondaryAction={
            hasFilters
              ? { label: t("common.clearFilters"), onClick: () => handleFilterChange({}) }
              : undefined
          }
        />
      )}
    </DashboardLayout>
  );
}
