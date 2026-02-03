import { Link } from "react-router-dom";
import { Building2, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Company } from "@/services/companyService";

interface CompanyCardProps {
  company: Company;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link to={`/company/${company.slug}`}>
      <Card className="card-interactive h-full">
        <CardContent className="p-4">
          {/* Banner placeholder */}
          <div className="h-16 -mx-4 -mt-4 mb-4 rounded-t-lg bg-gradient-to-r from-primary/20 to-secondary/20 overflow-hidden">
            {company.banner_url && (
              <img 
                src={company.banner_url} 
                alt="" 
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 rounded-lg border-2 border-background shadow-sm -mt-10 bg-card">
              <AvatarImage src={company.logo_url || ''} alt={company.name} />
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-lg font-semibold">
                {company.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 pt-1">
              <h3 className="font-semibold text-foreground truncate">
                {company.name}
              </h3>
              {company.tagline && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {company.tagline}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted-foreground">
            {company.industry && (
              <Badge variant="secondary" className="font-normal">
                {company.industry}
              </Badge>
            )}
            {company.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-24">{company.location}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{company.follower_count}</span>
              <span>followers</span>
            </span>
            {company.size && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>{company.size}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
