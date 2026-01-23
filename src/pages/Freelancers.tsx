import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AvatarWithStatus from "@/components/common/AvatarWithStatus";
import { SEOHead } from "@/components/common/SEOHead";
import { Search, MapPin, Briefcase, Globe, MessageSquare, Filter, X } from "lucide-react";
import { searchFreelancers, getFreelancerLocations, FreelancerProfile } from "@/services/freelancerService";
import { cn } from "@/lib/utils";

const FreelancersPage = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch freelancers
  const { data: freelancers, isLoading } = useQuery({
    queryKey: ["freelancers", debouncedQuery, locationFilter, availabilityFilter],
    queryFn: () => searchFreelancers({
      query: debouncedQuery,
      location: locationFilter,
      availability: availabilityFilter,
    }),
  });

  // Fetch available locations for filter
  const { data: locations } = useQuery({
    queryKey: ["freelancer-locations"],
    queryFn: getFreelancerLocations,
  });

  const clearFilters = () => {
    setSearchQuery("");
    setLocationFilter("");
    setAvailabilityFilter("");
  };

  const hasActiveFilters = searchQuery || locationFilter || availabilityFilter;

  return (
    <DashboardLayout>
      <SEOHead
        title={t("freelancers.pageTitle", "Find Freelancers")}
        description={t("freelancers.pageDescription", "Discover talented freelancers available for hire on Nolto.")}
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {t("freelancers.title", "Find Freelancers")}
          </h1>
          <p className="text-muted-foreground">
            {t("freelancers.subtitle", "Discover talented professionals available for your next project")}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("freelancers.searchPlaceholder", "Search by name, skills, or expertise...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t("common.filters", "Filters")}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                  {[searchQuery, locationFilter, availabilityFilter].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 rounded-lg border bg-card">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[180px]">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder={t("freelancers.location", "Location")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    {t("freelancers.anyLocation", "Any Location")}
                  </SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-[180px]">
                  <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder={t("freelancers.availability", "Availability")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("freelancers.anyAvailability", "Any Availability")}</SelectItem>
                  <SelectItem value="full-time">{t("freelancer.fullTime", "Full-time")}</SelectItem>
                  <SelectItem value="part-time">{t("freelancer.partTime", "Part-time")}</SelectItem>
                  <SelectItem value="project-based">{t("freelancer.projectBased", "Project-based")}</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  {t("common.clearFilters", "Clear Filters")}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : freelancers && freelancers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {freelancers.map((freelancer) => (
              <FreelancerCard key={freelancer.id} freelancer={freelancer} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {hasActiveFilters
                ? t("freelancers.noResults", "No freelancers found")
                : t("freelancers.noFreelancers", "No freelancers yet")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters
                ? t("freelancers.tryDifferentSearch", "Try adjusting your search or filters")
                : t("freelancers.beFirst", "Be the first to mark yourself as available for work!")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                {t("common.clearFilters", "Clear Filters")}
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Freelancer Card Component
interface FreelancerCardProps {
  freelancer: FreelancerProfile;
}

const FreelancerCard = ({ freelancer }: FreelancerCardProps) => {
  const { t } = useTranslation();
  
  const availabilityLabel = {
    "full-time": t("freelancer.fullTime", "Full-time"),
    "part-time": t("freelancer.partTime", "Part-time"),
    "project-based": t("freelancer.projectBased", "Project-based"),
  }[freelancer.freelancer_availability || ""] || freelancer.freelancer_availability;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Link to={`/profile/${freelancer.username}`}>
            <AvatarWithStatus
              src={freelancer.avatar_url}
              alt={freelancer.fullname || freelancer.username || "Freelancer"}
              fallback={(freelancer.fullname || freelancer.username || "F")[0]}
              size="lg"
              isFreelancer={true}
            />
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${freelancer.username}`} className="hover:underline">
              <h3 className="font-semibold truncate">
                {freelancer.fullname || freelancer.username}
              </h3>
            </Link>
            
            {freelancer.headline && (
              <p className="text-sm text-muted-foreground truncate">
                {freelancer.headline}
              </p>
            )}

            {freelancer.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span>{freelancer.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        {freelancer.freelancer_skills && freelancer.freelancer_skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {freelancer.freelancer_skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {freelancer.freelancer_skills.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{freelancer.freelancer_skills.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Rate and Availability */}
        <div className="flex items-center justify-between mt-3 text-sm">
          {freelancer.freelancer_rate && (
            <span className="font-medium text-primary">{freelancer.freelancer_rate}</span>
          )}
          {availabilityLabel && (
            <Badge variant="outline" className="text-xs">
              {availabilityLabel}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/profile/${freelancer.username}`}>
              {t("freelancers.viewProfile", "View Profile")}
            </Link>
          </Button>
          {freelancer.website && (
            <Button asChild variant="ghost" size="sm">
              <a href={freelancer.website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to={`/messages?to=${freelancer.username}`}>
              <MessageSquare className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FreelancersPage;
