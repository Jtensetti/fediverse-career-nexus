import { SaveButton } from "@/components/common/SaveButton";

import { JobPost } from "@/services/misc/jobPostsService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Globe, Building2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import TransparencyScore from "@/components/social/TransparencyScore";

interface JobCardProps {
  job: JobPost;
}

const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
  if (!min && !max) return null;
  
  const currencySymbol = currency === "USD" ? "$" :
                          currency === "EUR" ? "€" :
                          currency === "GBP" ? "£" : currency || "";
  
  if (min && max) {
    return `${currencySymbol}${min.toLocaleString()} - ${currencySymbol}${max.toLocaleString()}`;
  }
  
  if (min) {
    return `${currencySymbol}${min.toLocaleString()}+`;
  }
  
  return `Upp till ${currencySymbol}${max?.toLocaleString()}`;
};

const JobTypeLabels: Record<string, string> = {
  full_time: "Heltid",
  part_time: "Deltid",
  contract: "Kontrakt",
  internship: "Praktik",
  temporary: "Tillfällig"
};

const JobCard = ({ job }: JobCardProps) => {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const skills = job.skills || [];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="w-full h-full hover:border-primary/50 hover:shadow-lg transition-all group">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  {job.title}
                </CardTitle>
                <CardDescription className="font-medium">
                  {job.company_name}
                </CardDescription>
              </div>
            </div>
            <SaveButton itemId={job.id} itemType="job" size="icon" className="shrink-0 h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant={job.job_type === "full_time" ? "default" : "outline"} className="text-xs">
              {job.job_type ? JobTypeLabels[job.job_type] || job.job_type : "Anställning"}
            </Badge>
            {job.remote_allowed && (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Distans
              </Badge>
            )}
          </div>
          
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Publicerad {job.published_at ? formatDistanceToNow(new Date(job.published_at), { addSuffix: true, locale: sv }) : "nyligen"}</span>
            </div>
          </div>
          
          {/* Description preview */}
          <p className="line-clamp-2 text-sm text-muted-foreground mb-3">{job.description}</p>
          
          {/* Skills */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-muted/50">
                  {skill}
                </Badge>
              ))}
              {skills.length > 3 && (
                <Badge variant="outline" className="text-xs bg-muted/50">
                  +{skills.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Salary and Transparency Score */}
          <div className="flex items-center justify-between">
            {salary && (
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <DollarSign className="h-4 w-4" />
                <span>{salary}</span>
              </div>
            )}
            {job.transparency_score != null && job.transparency_score > 0 && (
              <TransparencyScore 
                score={job.transparency_score}
                details={{
                  hasSalary: !!(job.salary_min || job.salary_max),
                  hasRemotePolicy: !!job.remote_policy,
                  hasInterviewProcess: !!job.interview_process,
                  hasResponseTime: !!job.response_time,
                  hasTeamSize: !!job.team_size,
                  hasGrowthPath: !!job.growth_path,
                  hasVisaInfo: job.visa_sponsorship !== null
                }}
              />
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
            <Link to={`/jobs/${job.id}`}>Visa detaljer</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default JobCard;
