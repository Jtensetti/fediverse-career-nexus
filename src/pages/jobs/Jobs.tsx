import { useTranslation } from "react-i18next";
import { getPublishedJobPosts, type JobPostFilter } from "@/services/misc/jobPostsService";
import JobCard from "@/components/jobs/JobCard";
import JobSearchFilter from "@/components/jobs/JobSearchFilter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { JobCardSkeleton } from "@/components/common/skeletons";
import { EmptyState, SEOHead } from "@/components/common";
import { Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Jobs = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters: JobPostFilter = {
    search: searchParams.get('q') || undefined,
    job_type: (searchParams.get('type') as JobPostFilter['job_type']) || undefined,
    location: searchParams.get('location') || undefined,
    remote_allowed: searchParams.get('remote') === 'true' || undefined,
  };
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  const { data: jobs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['publishedJobs', filters],
    queryFn: () => getPublishedJobPosts(filters),
  });
  
  const handleFilterChange = (newFilters: JobPostFilter) => {
    const next = new URLSearchParams();
    if (newFilters.search) next.set('q', newFilters.search);
    if (newFilters.job_type) next.set('type', newFilters.job_type);
    if (newFilters.location) next.set('location', newFilters.location);
    if (newFilters.remote_allowed) next.set('remote', 'true');
    setSearchParams(next, { replace: true });
  };

  const hasFilters = Object.values(filters).some(value => value !== undefined && value !== "");
  
  return (
    <DashboardLayout title={t("jobs.title")}>
      <SEOHead
        title={t("jobs.title")}
        description={t("jobs.subtitle")}
      />
      <div className="flex justify-end mb-6">
        {isAuthenticated && (
          <Button asChild>
            <Link to="/jobs/manage">{t("jobs.manage")}</Link>
          </Button>
        )}
      </div>
      
      <JobSearchFilter filters={filters} onFilterChange={handleFilterChange} />
      
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
          <p className="font-medium">{t("common.error")}</p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>{t("common.retry")}</Button>
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title={hasFilters ? t("jobs.noMatching") : t("jobs.beFirst")}
          description={
            hasFilters 
              ? t("jobs.adjustFilters")
              : t("jobs.reachProfessionals")
          }
          action={
            isAuthenticated 
              ? { label: t("jobs.postJob"), link: "/jobs/create" }
              : { label: t("jobs.signUpToPost"), link: "/auth/signup" }
          }
          secondaryAction={
            hasFilters 
              ? { label: t("jobs.clearFilters"), onClick: () => handleFilterChange({}) }
              : undefined
          }
        />
      )}
    </DashboardLayout>
  );
};

export default Jobs;
