
import { JobPost } from "@/services/jobPostsService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: JobPost;
}

const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
  if (!min && !max) return "Salary not specified";
  
  const currencySymbol = currency === "USD" ? "$" :
                          currency === "EUR" ? "€" :
                          currency === "GBP" ? "£" : currency || "";
  
  if (min && max) {
    return `${currencySymbol}${min.toLocaleString()} - ${currencySymbol}${max.toLocaleString()}`;
  }
  
  if (min) {
    return `${currencySymbol}${min.toLocaleString()}+`;
  }
  
  return `Up to ${currencySymbol}${max?.toLocaleString()}`;
};

const JobTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary"
};

const JobCard = ({ job }: JobCardProps) => {
  return (
    <Card className="w-full hover:border-primary/50 transition-all">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <CardDescription className="text-lg mt-1 font-medium">
              {job.company_name}
            </CardDescription>
          </div>
          <Badge variant={job.job_type === "full_time" ? "default" : "outline"}>
            {JobTypeLabels[job.job_type] || job.job_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
            {job.remote_allowed && (
              <>
                <span className="mx-1">•</span>
                <Globe className="h-4 w-4" />
                <span>Remote available</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Posted {job.published_at ? formatDistanceToNow(new Date(job.published_at), { addSuffix: true }) : "recently"}</span>
          </div>
        </div>
        
        {/* Display up to 100 characters of description with ellipsis */}
        <p className="line-clamp-2 mb-4">{job.description}</p>
        
        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-2">
          {job.skills.slice(0, 5).map((skill, index) => (
            <Badge key={index} variant="outline">{skill}</Badge>
          ))}
          {job.skills.length > 5 && (
            <Badge variant="outline">+{job.skills.length - 5} more</Badge>
          )}
        </div>
        
        {/* Salary */}
        <p className="font-medium">
          {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link to={`/jobs/${job.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default JobCard;
