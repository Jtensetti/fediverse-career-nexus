import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { generateSlug, isSlugAvailable } from "@/services/companyService";
import type { Database } from "@/integrations/supabase/types";

type CompanySize = Database['public']['Enums']['company_size'];

const companySizes: CompanySize[] = [
  '1-10', '11-50', '51-200', '201-500', '501-1000',
  '1001-5000', '5001-10000', '10000+'
];

const companyFormSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(100),
  slug: z.string().min(2, "URL must be at least 2 characters").max(50)
    .regex(/^[a-z0-9-]+$/, "URL can only contain lowercase letters, numbers, and hyphens"),
  tagline: z.string().max(140, "Tagline must be 140 characters or less").optional(),
  description: z.string().max(5000).optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  industry: z.string().max(50).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+'] as const).optional().nullable(),
  location: z.string().max(100).optional(),
  founded_year: z.coerce.number().min(1800).max(new Date().getFullYear()).optional().nullable(),
});

export type CompanyFormData = z.infer<typeof companyFormSchema>;

interface CompanyFormProps {
  defaultValues?: Partial<CompanyFormData>;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  isEdit?: boolean;
}

export default function CompanyForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "Create Company",
  isEdit = false,
}: CompanyFormProps) {
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
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

  // Auto-generate slug from name (only when creating)
  useEffect(() => {
    if (!isEdit && watchName && !form.getFieldState("slug").isDirty) {
      const newSlug = generateSlug(watchName);
      form.setValue("slug", newSlug);
    }
  }, [watchName, isEdit, form]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!watchSlug || watchSlug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    // Skip check if editing and slug hasn't changed
    if (isEdit && watchSlug === defaultValues?.slug) {
      setSlugAvailable(true);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      const available = await isSlugAvailable(watchSlug);
      setSlugAvailable(available);
      setCheckingSlug(false);
    }, 500);

    return () => clearTimeout(timer);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Enter the core details about your company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
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
                  <FormLabel>Company URL *</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">/company/</span>
                      <Input 
                        placeholder="acme-corp" 
                        {...field} 
                        disabled={isEdit}
                        className={isEdit ? "bg-muted" : ""}
                      />
                      {checkingSlug && <Loader2 className="h-4 w-4 animate-spin" />}
                      {!checkingSlug && slugAvailable === true && (
                        <span className="text-sm text-success">Available</span>
                      )}
                      {!checkingSlug && slugAvailable === false && (
                        <span className="text-sm text-destructive">Taken</span>
                      )}
                    </div>
                  </FormControl>
                  {isEdit ? (
                    <FormDescription>Company URL cannot be changed after creation</FormDescription>
                  ) : (
                    <FormDescription>This will be your company's unique URL</FormDescription>
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
                  <FormLabel>Tagline</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Building the future of..." 
                      maxLength={140}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A short description (max 140 characters)
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
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell people about your company..."
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
            <CardTitle>Company Details</CardTitle>
            <CardDescription>
              Additional information helps people find and learn about your company
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
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
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="Technology, Healthcare, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Size</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companySizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size} employees
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
                  <FormLabel>Headquarters</FormLabel>
                  <FormControl>
                    <Input placeholder="San Francisco, CA" {...field} />
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
                  <FormLabel>Founded Year</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder={new Date().getFullYear().toString()}
                      min={1800}
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
          <Button 
            type="submit" 
            disabled={isSubmitting || (!isEdit && slugAvailable === false)}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
