import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { generateSlug, isSlugAvailable } from "@/services/company/companyService";
import { companySizeOptions } from "@/lib/companyOptions";
import OrganisationTypeOptions from "./OrganisationTypeOptions";

import { tx } from "@/i18n/tx";

const createCompanyFormSchema = (t: TFunction) => {
  const yearMessage = t("companyForm.validYear", { min: 1000, max: new Date().getFullYear() });
  return z.object({
    name: z.string().trim().min(2, t("companyForm.nameTooShort")).max(100, t("companyForm.nameTooLong")),
    slug: z.string().min(3, t("companyForm.urlTooShort")).max(50, t("companyForm.urlTooLong"))
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, t("companyForm.urlCharacters")),
    tagline: z.string().max(140, t("companyForm.taglineTooLong")).optional(),
    description: z.string().max(5000, t("companyForm.maxCharacters", { max: 5000 })).optional(),
    website: z.string().url(t("companyForm.invalidWebsite")).refine(value => value.startsWith("https://"), t("companyForm.httpsRequired")).optional().or(z.literal("")),
    industry: z.string().max(240, t("companyForm.maxCharacters", { max: 240 })).optional(),
    size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+'] as const).optional().nullable(),
    location: z.string().max(100, t("companyForm.maxCharacters", { max: 100 })).optional(),
    founded_year: z.coerce.number({ invalid_type_error: yearMessage })
      .int(yearMessage).min(1000, yearMessage).max(new Date().getFullYear(), yearMessage).optional().nullable(),
  });
};

export type CompanyFormData = z.infer<ReturnType<typeof createCompanyFormSchema>>;

interface CompanyFormProps {
  defaultValues?: Partial<CompanyFormData>;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  isEdit?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
}

export default function CompanyForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitButtonText,
  isEdit = false,
  onDirtyChange,
  onCancel,
}: CompanyFormProps) {
  const { t } = useTranslation();
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(createCompanyFormSchema(t)),
    defaultValues: {
      name: "",
      slug: "",
      tagline: "",
      description: "",
      website: "",
      industry: "",
      size: null,
      location: "",
      founded_year: null,
      ...defaultValues,
    },
  });

  const watchName = form.watch("name");
  const watchSlug = form.watch("slug");
  const { isDirty } = form.formState;

  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  // Auto-generate slug from name (only when creating)
  useEffect(() => {
    if (!isEdit && watchName && !form.getFieldState("slug").isDirty) {
      const newSlug = generateSlug(watchName);
      form.setValue("slug", newSlug);
    }
  }, [watchName, isEdit, form]);

  // Check slug availability with debounce
  useEffect(() => {
    let cancelled = false;
    setSlugAvailable(null);
    setCheckingSlug(false);
    if (!watchSlug || watchSlug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    // Skip check if editing and slug hasn't changed
    if (isEdit && watchSlug === defaultValues?.slug) {
      setSlugAvailable(true);
      return;
    }

    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const available = await isSlugAvailable(watchSlug);
        if (!cancelled) setSlugAvailable(available);
      } catch {
        if (!cancelled) setSlugAvailable(null);
      } finally {
        if (!cancelled) setCheckingSlug(false);
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [watchSlug, isEdit, defaultValues?.slug]);

  const handleSubmit = async (data: CompanyFormData) => {
    // Clean up empty strings
    const cleanedData = {
      ...data,
      website: data.website || undefined,
      tagline: data.tagline || undefined,
      description: data.description || undefined,
      industry: data.industry || undefined,
      location: data.location || undefined,
    };
    await onSubmit(cleanedData);
  };

  const resolvedButtonText = submitButtonText || t("companies.create", "Create Company");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("companyForm.basicInfo", "Basic Information")}
            </CardTitle>
            <CardDescription>
              {t("companyForm.basicInfoDesc", "Enter the core details about your company")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.companyName", "Company Name")} *</FormLabel>
                  <FormControl>
                    <Input placeholder={tx("ui.companyForm.organisationsnamn")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.companyUrl", "Company URL")} *</FormLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground text-sm">{tx("ui.companyForm.noltoSocialOrganisation")}</span>
                      <FormControl>
                      <Input 
                        placeholder={tx("ui.companyForm.organisationsnamn2")} 
                        {...field} 
                        disabled={isEdit}
                        className={`min-w-0 flex-1 ${isEdit ? "bg-muted" : ""}`}
                      />
                      </FormControl>
                      {checkingSlug && <Loader2 className="h-4 w-4 animate-spin" />}
                      {!checkingSlug && slugAvailable === true && (
                        <span className="text-sm text-success">{t("companyForm.available", "Available")}</span>
                      )}
                      {!checkingSlug && slugAvailable === false && (
                        <span className="text-sm text-destructive">{t("companyForm.taken", "Taken")}</span>
                      )}
                    </div>
                  {isEdit ? (
                    <FormDescription>{t("companyForm.urlImmutable", "Company URL cannot be changed after creation")}</FormDescription>
                  ) : (
                    <FormDescription>{t("companyForm.uniqueUrl", "This will be your company's unique URL")}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tagline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.tagline", "Tagline")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={tx("ui.companyForm.viByggerFramtidenFor")} 
                      maxLength={140}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {t("companyForm.taglineDesc", "A short description (max 140 characters)")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.about", "About")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={tx("ui.companyForm.berattaOmDinOrganisation")}
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("companyForm.companyDetails", "Company Details")}</CardTitle>
            <CardDescription>
              {t("companyForm.companyDetailsDesc", "Additional information helps people find and learn about your company")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.website", "Website")}</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.organisationType", "Typ av organisation")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("companyForm.selectOrgType", "Välj typ av organisation")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <OrganisationTypeOptions selected={field.value} />
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("companyTypes.help")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.companySize", "Antal anställda")}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("companyForm.selectSize", "Välj storlek")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companySizeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.headquarters", "Headquarters")}</FormLabel>
                  <FormControl>
                    <Input placeholder={tx("ui.companyForm.stockholmSverige")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="founded_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyForm.foundedYear", "Founded Year")}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder={new Date().getFullYear().toString()}
                      min={1000}
                      max={new Date().getFullYear()}
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting || checkingSlug || (!isEdit && slugAvailable === false)}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {resolvedButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
