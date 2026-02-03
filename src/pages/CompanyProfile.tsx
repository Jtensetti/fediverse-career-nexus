import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead, EmptyState } from "@/components/common";
import { CompanyHeader } from "@/components/company";
import { getCompanyBySlug } from "@/services/companyService";
import { getUserCompanyRole } from "@/services/companyRolesService";
import { useAuth } from "@/contexts/AuthContext";

export default function CompanyProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', slug],
    queryFn: () => getCompanyBySlug(slug!),
    enabled: !!slug,
  });

  const { data: userRole } = useQuery({
    queryKey: ['companyRole', company?.id],
    queryFn: () => getUserCompanyRole(company!.id),
    enabled: !!company?.id && !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container max-w-5xl mx-auto py-6 px-4">
          <Skeleton className="h-48 rounded-lg mb-6" />
          <div className="flex gap-4 items-start -mt-16 px-6">
            <Skeleton className="h-32 w-32 rounded-xl" />
            <div className="pt-20 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!company || error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container max-w-5xl mx-auto py-10 px-4">
          <EmptyState
            icon={Building2}
            title={t("companies.notFound", "Company not found")}
            description={t("companies.notFoundDescription", "This company page doesn't exist or has been removed")}
            action={{ label: t("companies.browseAll", "Browse Companies"), link: "/companies" }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={company.name}
        description={company.tagline || company.description || `${company.name} on Nolto`}
      />
      <Navbar />
      <main className="flex-grow">
        <div className="container max-w-5xl mx-auto py-6 px-4 sm:px-6">
          <CompanyHeader company={company} userRole={userRole || null} />

          <Tabs defaultValue="about" className="mt-8">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="about"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                {t("companies.about", "About")}
              </TabsTrigger>
              <TabsTrigger 
                value="posts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                {t("companies.posts", "Posts")}
              </TabsTrigger>
              <TabsTrigger 
                value="jobs"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                {t("companies.jobs", "Jobs")}
              </TabsTrigger>
              <TabsTrigger 
                value="people"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                {t("companies.people", "People")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("companies.aboutUs", "About Us")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {company.description ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{company.description}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {t("companies.noDescription", "No description provided yet.")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="posts" className="mt-6">
              <EmptyState
                icon={Building2}
                title={t("companies.noPosts", "No posts yet")}
                description={t("companies.noPostsDescription", "This company hasn't shared any posts yet")}
              />
            </TabsContent>

            <TabsContent value="jobs" className="mt-6">
              <EmptyState
                icon={Building2}
                title={t("companies.noJobs", "No job openings")}
                description={t("companies.noJobsDescription", "This company doesn't have any open positions right now")}
              />
            </TabsContent>

            <TabsContent value="people" className="mt-6">
              <EmptyState
                icon={Building2}
                title={t("companies.noPeople", "No employees listed")}
                description={t("companies.noPeopleDescription", "Be the first to add yourself as an employee")}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
