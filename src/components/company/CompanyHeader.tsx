import { Link } from "react-router-dom";
import { Building2, Globe, MapPin, Calendar, Settings, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CompanyFollowButton from "./CompanyFollowButton";
import type { Company } from "@/services/companyService";
import type { CompanyRoleEnum } from "@/services/companyRolesService";

interface CompanyHeaderProps {
  company: Company;
  userRole: CompanyRoleEnum | null;
}

export default function CompanyHeader({ company, userRole }: CompanyHeaderProps) {
  const canManage = userRole === 'owner' || userRole === 'admin';
  const isVerified = company.claim_status === 'verified';

  return (
    <div className="relative">
      {/* Banner */}
      <div className="h-32 sm:h-48 bg-gradient-to-r from-primary/20 via-secondary/10 to-primary/20 rounded-lg overflow-hidden">
        {company.banner_url && (
          <img 
            src={company.banner_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Company Info */}
      <div className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-16">
          {/* Logo */}
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-xl border-4 border-background shadow-lg bg-card">
            <AvatarImage src={company.logo_url || ''} alt={company.name} />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-3xl font-bold">
              {company.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name & Actions */}
          <div className="flex-1 sm:pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">{company.name}</h1>
                  {isVerified && (
                    <CheckCircle2 className="h-6 w-6 text-primary" aria-label="Verified company" />
                  )}
                </div>
                {company.tagline && (
                  <p className="text-muted-foreground mt-1">{company.tagline}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <CompanyFollowButton companyId={company.id} />
                {canManage && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/company/${company.slug}/edit`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-muted-foreground">
          {company.industry && (
            <Badge variant="secondary" className="font-normal">
              <Building2 className="h-3.5 w-3.5 mr-1" />
              {company.industry}
            </Badge>
          )}
          {company.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {company.location}
            </span>
          )}
          {company.website && (
            <a 
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="h-4 w-4" />
              {company.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {company.founded_year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Founded {company.founded_year}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t">
          <div>
            <span className="font-semibold text-foreground">{company.follower_count}</span>
            <span className="text-muted-foreground ml-1">followers</span>
          </div>
          <div>
            <span className="font-semibold text-foreground">{company.employee_count}</span>
            <span className="text-muted-foreground ml-1">employees</span>
          </div>
          {company.size && (
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">{company.size}</span> company size
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
