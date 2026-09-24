import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/forms/DatePicker";
import { formatLocalDate, parseLocalDate } from "@/lib/localDate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { claimEmployment, type EmploymentType } from "@/services/company/companyEmployeeService";

import { tx } from "@/i18n/tx";
const employmentTypes: { value: EmploymentType; label: string }[] = [
  { value: "full_time", get label() { return tx("ui.companyEmployeeForm.fullTime"); } },
  { value: "part_time", get label() { return tx("ui.companyEmployeeForm.partTime"); } },
  { value: "contract", get label() { return tx("ui.companyEmployeeForm.contract"); } },
  { value: "intern", get label() { return tx("ui.companyEmployeeForm.intern"); } },
  { value: "freelance", get label() { return tx("ui.companyEmployeeForm.freelance"); } },
];

const createSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(2, t('companies.jobTitleValidation')).max(100, t('companies.jobTitleValidation')),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern", "freelance"]),
  start_date: z.string().refine(value => !!parseLocalDate(value), t('companies.startDateRequired')),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

interface CompanyEmployeeFormProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CompanyEmployeeForm({
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: CompanyEmployeeFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: {
      title: "",
      employment_type: "full_time",
      start_date: formatLocalDate(new Date()),
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await claimEmployment(
        companyId,
        data.title,
        data.employment_type as EmploymentType,
        data.start_date
      );
      toast.success(t("companies.employmentClaimed", "Employment claim submitted! Awaiting verification."));
      onOpenChange(false);
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error(t('companies.employmentClaimFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("companies.iWorkHere", "I work here")}</DialogTitle>
          <DialogDescription>
            {t(
              "companies.iWorkHereDescription",
              "Add your employment details. A company admin will verify your claim."
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companies.jobTitle", "Job Title")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companies.jobTitlePlaceholder')} {...field} />
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
                  <FormLabel>{t("companies.employmentType", "Employment Type")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employmentTypes.map((et) => (
                        <SelectItem key={et.value} value={et.value}>
                          {t(`companies.employmentTypes.${et.value}`)}
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
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companies.startDate", "Start Date")}</FormLabel>
                  <FormControl>
                    <DatePicker {...field} value={parseLocalDate(field.value)}
                      onChange={date => field.onChange(formatLocalDate(date))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("companies.submitClaim", "Submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
