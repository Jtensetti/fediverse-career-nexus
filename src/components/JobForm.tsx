import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { JobPost } from "@/services/jobPostsService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const jobFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  company: z.string().min(2, "Company name is required"),
  location: z.string().min(2, "Location is required"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  employment_type: z.string().default("full-time"),
  salary_min: z.coerce.number().nullable().optional(),
  salary_max: z.coerce.number().nullable().optional(),
  salary_currency: z.string().optional(),
  remote_policy: z.string().default("on-site"),
  experience_level: z.string().optional(),
  skills: z.string().transform(val => val ? val.split(",").map(s => s.trim()).filter(Boolean) : []),
  is_active: z.boolean().default(false),
  interview_process: z.string().optional(),
  response_time: z.string().optional(),
  team_size: z.string().optional(),
  growth_path: z.string().optional(),
  visa_sponsorship: z.boolean().default(false),
}).refine(data => {
  if (data.salary_min && data.salary_max) {
    return Number(data.salary_min) <= Number(data.salary_max);
  }
  return true;
}, {
  message: "Minimum salary must be less than maximum salary",
  path: ["salary_min"],
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

interface JobFormProps {
  defaultValues?: Partial<JobPost>;
  onSubmit: (data: JobFormValues) => void;
  isSubmitting: boolean;
  submitButtonText?: string;
}

const JobForm = ({ 
  defaultValues = {}, 
  onSubmit, 
  isSubmitting,
  submitButtonText = "Create Job Post"
}: JobFormProps) => {
  const [isOnline] = useState(false);
  
  const formattedDefaultValues = {
    title: defaultValues.title || "",
    company: defaultValues.company || "",
    location: defaultValues.location || "",
    description: defaultValues.description || "",
    employment_type: defaultValues.employment_type || "full-time",
    salary_min: defaultValues.salary_min ?? null,
    salary_max: defaultValues.salary_max ?? null,
    salary_currency: defaultValues.salary_currency || "USD",
    remote_policy: defaultValues.remote_policy || "on-site",
    experience_level: defaultValues.experience_level || "",
    skills: defaultValues.skills?.join(", ") || "",
    is_active: defaultValues.is_active ?? false,
    interview_process: defaultValues.interview_process || "",
    response_time: defaultValues.response_time || "",
    team_size: defaultValues.team_size || "",
    growth_path: defaultValues.growth_path || "",
    visa_sponsorship: defaultValues.visa_sponsorship ?? false,
  };
  
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: formattedDefaultValues as any,
  });

  // Simple handleSubmit - mirrors EventForm pattern exactly
  const handleSubmit = (values: JobFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Senior Frontend Developer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Acme Inc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. New York, NY" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="employment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="remote_policy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remote Policy</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select remote policy" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="on-site">On-site</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="experience_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                  <SelectItem value="lead">Lead/Principal</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold">Compensation</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="salary_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Salary</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. 50000" 
                      type="number" 
                      value={field.value ?? ""} 
                      onChange={(e) => {
                        const n = e.target.value === "" ? null : Number(e.target.value);
                        field.onChange(n);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="salary_max"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Salary</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. 80000" 
                      type="number" 
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const n = e.target.value === "" ? null : Number(e.target.value);
                        field.onChange(n);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="salary_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the responsibilities, requirements, and benefits of the position..." 
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Required Skills</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. React, JavaScript, TypeScript (comma-separated)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter skills separated by commas
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-lg p-4 space-y-4 bg-primary/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Transparency Details</h3>
            <span className="text-xs text-muted-foreground">Helps candidates trust your listing</span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="interview_process"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Process</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. 3 rounds: phone screen, technical, final"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="response_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Response Time</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. We respond within 5 business days"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="team_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Size</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. You'll join a team of 8"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="growth_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Growth Path</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Senior → Lead → Manager track available"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="visa_sponsorship"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
                <div>
                  <FormLabel>Visa Sponsorship</FormLabel>
                  <FormDescription>
                    Can you sponsor work visas for this position?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
              <div>
                <FormLabel>Publish Immediately</FormLabel>
                <FormDescription>
                  Make this job post visible to candidates right away
                </FormDescription>
              </div>
              <FormControl>
                <Switch 
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default JobForm;
