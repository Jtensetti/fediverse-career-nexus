import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { JobPost } from "@/services/misc/jobPostsService";
import { getUserCompanies } from "@/services/company/companyRolesService";
import { getCompanyById } from "@/services/company/companyService";
import { useAuth } from "@/contexts/AuthContext";
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

export type JobFormValues = z.infer<ReturnType<typeof createJobFormSchema>>;

function createJobFormSchema(t: any) {
  return z.object({
    title: z.string().min(5, t("jobFormLabels.titleValidation")),
    company: z.string().min(2, t("jobFormLabels.companyValidation")),
    company_id: z.string().nullable().optional(),
    location: z.string().min(2, t("jobFormLabels.locationValidation")),
    description: z.string().min(20, t("jobFormLabels.descriptionValidation")),
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
    message: t("jobFormLabels.salaryValidation"),
    path: ["salary_min"],
  });
}

interface JobFormProps {
  defaultValues?: Partial<JobPost> & { company_id?: string | null };
  onSubmit: (data: JobFormValues) => void;
  isSubmitting: boolean;
  submitButtonText?: string;
}

const JobForm = ({ 
  defaultValues = {}, 
  onSubmit, 
  isSubmitting,
  submitButtonText
}: JobFormProps) => {
  const [isOnline] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  const jobFormSchema = createJobFormSchema(t);

  // Fetch user's companies for linking
  const { data: userCompanyRoles = [] } = useQuery({
    queryKey: ["userCompanies"],
    queryFn: getUserCompanies,
    enabled: !!user,
  });

  // Fetch company details for each role
  const { data: userCompanies = [] } = useQuery({
    queryKey: ["userCompanyDetails", userCompanyRoles.map(r => r.company_id)],
    queryFn: async () => {
      const results = await Promise.all(
        userCompanyRoles.map(r => getCompanyById(r.company_id))
      );
      return results.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getCompanyById>>>[];
    },
    enabled: userCompanyRoles.length > 0,
  });
  
  const formattedDefaultValues = {
    title: defaultValues.title || "",
    company: defaultValues.company || "",
    company_id: (defaultValues as any).company_id || null,
    location: defaultValues.location || "",
    description: defaultValues.description || "",
    employment_type: defaultValues.employment_type || "full-time",
    salary_min: defaultValues.salary_min ?? null,
    salary_max: defaultValues.salary_max ?? null,
    salary_currency: defaultValues.salary_currency || "SEK",
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

  const handleSubmit = (values: JobFormValues) => {
    onSubmit(values);
  };

  const finalSubmitText = submitButtonText || t("jobFormLabels.createJobPost");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("jobFormLabels.jobTitle")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("jobFormLabels.jobTitlePlaceholder")} {...field} />
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
                <FormLabel>{t("jobFormLabels.companyName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("jobFormLabels.companyNamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Company page linking */}
        {userCompanies.length > 0 && (
          <FormField
            control={form.control}
            name="company_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("jobFormLabels.linkToCompany")}</FormLabel>
                <Select 
                  onValueChange={(val) => {
                    field.onChange(val === "none" ? null : val);
                    if (val !== "none") {
                      const selected = userCompanies.find(c => c.id === val);
                      if (selected) {
                        form.setValue("company", selected.name);
                      }
                    }
                  }} 
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("jobFormLabels.selectCompany")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">{t("jobFormLabels.noCompanyPage")}</SelectItem>
                    {userCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t("jobFormLabels.linkDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("jobFormLabels.location")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("jobFormLabels.locationPlaceholder")} {...field} />
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
                <FormLabel>{t("jobFormLabels.employmentType")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("jobFormLabels.selectEmploymentType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="permanent">{t("jobFormLabels.permanent", "Tillsvidareanställning")}</SelectItem>
                    <SelectItem value="substitute">{t("jobFormLabels.substitute", "Vikariat")}</SelectItem>
                    <SelectItem value="fixed-term">{t("jobFormLabels.fixedTerm", "Allmän visstidsanställning")}</SelectItem>
                    <SelectItem value="project">{t("jobFormLabels.project", "Projektanställning")}</SelectItem>
                    <SelectItem value="consultant">{t("jobFormLabels.consultant", "Konsultuppdrag")}</SelectItem>
                    <SelectItem value="part-time">{t("jobFormLabels.partTime", "Deltid")}</SelectItem>
                    <SelectItem value="seasonal">{t("jobFormLabels.seasonal", "Säsongsanställning")}</SelectItem>
                    <SelectItem value="internship">{t("jobFormLabels.internship", "Praktik / PRAO")}</SelectItem>
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
              <FormLabel>{t("jobFormLabels.remotePolicy")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("jobFormLabels.selectRemotePolicy")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="on-site">{t("jobFormLabels.onSite")}</SelectItem>
                  <SelectItem value="remote">{t("jobFormLabels.remote")}</SelectItem>
                  <SelectItem value="hybrid">{t("jobFormLabels.hybrid")}</SelectItem>
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
              <FormLabel>{t("jobFormLabels.experienceLevel")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("jobFormLabels.selectExperienceLevel")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="handlaggare">{t("jobFormLabels.handlaggare", "Handläggare")}</SelectItem>
                  <SelectItem value="specialist">{t("jobFormLabels.specialistLevel", "Specialist / Strateg")}</SelectItem>
                  <SelectItem value="teamleader">{t("jobFormLabels.teamLeader", "Gruppledare / Teamledare")}</SelectItem>
                  <SelectItem value="enhetschef">{t("jobFormLabels.enhetschef", "Enhetschef")}</SelectItem>
                  <SelectItem value="avdelningschef">{t("jobFormLabels.avdelningschef", "Avdelningschef")}</SelectItem>
                  <SelectItem value="forvaltningschef">{t("jobFormLabels.forvaltningschef", "Förvaltnings- / Myndighetschef")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold">{t("jobFormLabels.compensation")}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="salary_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobFormLabels.minSalary")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="t.ex. 50000" 
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
                  <FormLabel>{t("jobFormLabels.maxSalary")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="t.ex. 80000" 
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
                  <FormLabel>{t("jobFormLabels.currency")}</FormLabel>
                  <FormControl>
                    <Input value="SEK - Svensk krona" readOnly disabled className="bg-muted" />
                  </FormControl>
                  <FormDescription>
                    {t("jobFormLabels.currencyLockedSEK", "Löner anges i svenska kronor.")}
                  </FormDescription>
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
              <FormLabel>{t("jobFormLabels.jobDescription")}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={t("jobFormLabels.jobDescPlaceholder")} 
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
              <FormLabel>{t("jobFormLabels.requiredSkills")}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t("jobFormLabels.skillsPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t("jobFormLabels.skillsDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-lg p-4 space-y-4 bg-primary/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t("jobFormLabels.transparencyDetails")}</h3>
            <span className="text-xs text-muted-foreground">{t("jobFormLabels.helpsCandidate")}</span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="interview_process"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobFormLabels.interviewProcess")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("jobFormLabels.interviewPlaceholder")}
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
                  <FormLabel>{t("jobFormLabels.responseTime")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("jobFormLabels.responseTimePlaceholder")}
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
                  <FormLabel>{t("jobFormLabels.teamSize")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("jobFormLabels.teamSizePlaceholder")}
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
                  <FormLabel>{t("jobFormLabels.growthPath")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("jobFormLabels.growthPathPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Visumsponsring borttagen — sällan relevant inom svensk offentlig sektor. */}
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
              <div>
                <FormLabel>{t("jobFormLabels.publishImmediately")}</FormLabel>
                <FormDescription>
                  {t("jobFormLabels.publishDescription")}
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
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("jobFormLabels.submitting") : finalSubmitText}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default JobForm;
