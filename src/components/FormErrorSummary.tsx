import { AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";

interface FormErrorSummaryProps {
  errors: Record<string, { message?: string }>;
  className?: string;
}

const fieldLabels: Record<string, string> = {
  title: "Job Title",
  company: "Company Name",
  description: "Description",
  location: "Location",
  employment_type: "Employment Type",
  remote_policy: "Remote Policy",
  experience_level: "Experience Level",
  salary_min: "Minimum Salary",
  salary_max: "Maximum Salary",
  salary_currency: "Salary Currency",
  skills: "Skills",
  is_active: "Published Status",
  interview_process: "Interview Process",
  response_time: "Response Time",
  team_size: "Team Size",
  growth_path: "Growth Path",
  visa_sponsorship: "Visa Sponsorship",
  application_url: "Application URL",
  contact_email: "Contact Email",
};

export function FormErrorSummary({ errors, className = "" }: FormErrorSummaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const errorEntries = Object.entries(errors).filter(([_, error]) => error?.message);

  useEffect(() => {
    if (errorEntries.length > 0 && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      
      // Focus the first invalid field
      const firstField = errorEntries[0]?.[0];
      if (firstField) {
        const input = document.querySelector(`[name="${firstField}"]`) as HTMLElement;
        input?.focus?.();
      }
    }
  }, [errorEntries.length]);

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-lg border border-destructive/50 bg-destructive/10 p-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-destructive mb-2">
            Please fix the following {errorEntries.length === 1 ? "error" : "errors"}:
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-destructive/90">
            {errorEntries.map(([field, error]) => (
              <li key={field}>
                <strong>{fieldLabels[field] || field}:</strong> {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default FormErrorSummary;
