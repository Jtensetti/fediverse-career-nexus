import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/forms/DatePicker";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Event } from "@/services/misc/eventService";
import { endAfterStartChange, isValidLocalDateTime, localDateTime, nextEventRange, TIME_PATTERN } from "@/lib/localDate";

function createEventFormSchema(t: any) {
  const optionalUrl = z.string().trim().nullish().transform(value => value || null);
  return z
    .object({
      title: z.string().min(3, t("eventFormLabels.titleValidation")),
      description: z.string().min(10, t("eventFormLabels.descriptionValidation")),
      location: z.string().optional(),
      start_date: z.date({ required_error: t("eventFormLabels.startDateRequired") }),
      start_time: z.string({ required_error: t("eventFormLabels.startTimeRequired") })
        .min(1, t("eventFormLabels.startTimeRequired")).regex(TIME_PATTERN, t("eventFormLabels.invalidTime")),
      end_date: z.date({ required_error: t("eventFormLabels.endDateRequired") }),
      end_time: z.string({ required_error: t("eventFormLabels.endTimeRequired") })
        .min(1, t("eventFormLabels.endTimeRequired")).regex(TIME_PATTERN, t("eventFormLabels.invalidTime")),
      is_online: z.boolean().default(false),
      meeting_url: optionalUrl,
      max_attendees: z.coerce.number().int().positive().optional().nullable(),
      cover_image_url: optionalUrl,
      visibility: z.enum(["public", "connections", "private"]).default("public"),
    })
    .refine(data => !data.is_online || !data.meeting_url || z.string().url().safeParse(data.meeting_url).success, {
      message: t("eventFormLabels.invalidUrl"), path: ["meeting_url"],
    })
    .refine(data => !data.cover_image_url || z.string().url().safeParse(data.cover_image_url).success, {
      message: t("eventFormLabels.invalidUrl"), path: ["cover_image_url"],
    })
    .superRefine((data, ctx) => {
      // Never silently shift a time that a DST transition skips.
      for (const [date, time] of [["start_date", "start_time"], ["end_date", "end_time"]] as const) {
        if (TIME_PATTERN.test(data[time]) && !isValidLocalDateTime(data[date], data[time])) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("eventFormLabels.nonexistentLocalTime"), path: [time] });
        }
      }
    })
    .refine(
      (data) => {
        if (!isValidLocalDateTime(data.start_date, data.start_time) || !isValidLocalDateTime(data.end_date, data.end_time)) return true;
        const startDateTime = localDateTime(data.start_date, data.start_time);
        const endDateTime = localDateTime(data.end_date, data.end_time);
        return endDateTime > startDateTime;
      },
      { message: t("eventFormLabels.endAfterStart"), path: ["end_time"] },
    );
}

interface EventFormProps {
  defaultValues?: Partial<Event>;
  onSubmit: (data: Omit<Event, "id" | "created_at" | "updated_at" | "user_id">) => void;
  isSubmitting: boolean;
  submitButtonText?: string;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const EventForm = ({
  defaultValues = {},
  onSubmit,
  isSubmitting,
  submitButtonText,
  onCancel,
  onDirtyChange,
}: EventFormProps) => {
  const { t } = useTranslation();
  const eventFormSchema = createEventFormSchema(t);
  const [initialRange] = useState(() => nextEventRange());
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const startDate = defaultValues.start_date ? new Date(defaultValues.start_date) : undefined;
  const endDate = defaultValues.end_date ? new Date(defaultValues.end_date) : undefined;

  const formattedDefaultValues = {
    title: defaultValues.title || "",
    description: defaultValues.description || "",
    location: defaultValues.location || "",
    start_date: startDate || initialRange.start,
    start_time: format(startDate || initialRange.start, "HH:mm"),
    end_date: endDate || initialRange.end,
    end_time: format(endDate || initialRange.end, "HH:mm"),
    is_online: defaultValues.is_online || false,
    meeting_url: defaultValues.meeting_url || null,
    max_attendees: defaultValues.max_attendees || null,
    cover_image_url: defaultValues.cover_image_url || null,
    visibility: (defaultValues as any).visibility || "public",
  };

  const [isOnline, setIsOnline] = useState(defaultValues.is_online || false);

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: formattedDefaultValues,
  });
  const { isDirty } = form.formState;
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const handleSubmit = (values: z.infer<typeof eventFormSchema>) => {
    const startDateTime = localDateTime(values.start_date, values.start_time);
    const endDateTime = localDateTime(values.end_date, values.end_time);
    const eventData: Omit<Event, "id" | "created_at" | "updated_at" | "user_id"> = {
      title: values.title, description: values.description,
      location: values.location || null,
      start_date: startDateTime.toISOString(), end_date: endDateTime.toISOString(),
      is_online: values.is_online,
      meeting_url: values.is_online ? values.meeting_url : null,
      max_attendees: values.max_attendees,
      cover_image_url: values.cover_image_url,
      visibility: values.visibility,
    } as any;
    onSubmit(eventData);
  };

  const changeStart = (field: 'start_date' | 'start_time', value: Date | string) => {
    const previous = form.getValues();
    const oldStart = localDateTime(previous.start_date, previous.start_time);
    const oldEnd = localDateTime(previous.end_date, previous.end_time);
    form.setValue(field, value, { shouldDirty: true });
    const current = form.getValues();
    const valid = isValidLocalDateTime(previous.start_date, previous.start_time)
      && isValidLocalDateTime(previous.end_date, previous.end_time)
      && isValidLocalDateTime(current.start_date, current.start_time);
    if (!valid) {
      if (form.formState.isSubmitted) void form.trigger(['start_date', 'start_time', 'end_date', 'end_time']);
      return;
    }
    const nextEnd = endAfterStartChange(oldStart, oldEnd, localDateTime(current.start_date, current.start_time));
    if (nextEnd !== oldEnd) {
      form.setValue('end_date', nextEnd, { shouldDirty: true });
      form.setValue('end_time', format(nextEnd, 'HH:mm'), { shouldDirty: true });
    }
    if (form.formState.isSubmitted) void form.trigger(['start_date', 'start_time', 'end_date', 'end_time']);
  };

  const finalSubmitText = submitButtonText || t("eventFormLabels.createEvent");

  const visibilityOptions = [
    { value: "public", label: t("eventFormLabels.public"), description: t("eventFormLabels.publicDesc") },
    { value: "connections", label: t("eventFormLabels.connectionsOnly"), description: t("eventFormLabels.connectionsOnlyDesc") },
    { value: "private", label: t("eventFormLabels.private"), description: t("eventFormLabels.privateDesc") },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="space-y-6">
          <h3 className="text-lg font-medium">{t("eventFormLabels.eventDetails")}</h3>
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("eventFormLabels.eventTitle")}</FormLabel>
              <FormControl><Input placeholder={t("eventFormLabels.eventTitlePlaceholder")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("eventFormLabels.description")}</FormLabel>
              <FormControl><Textarea placeholder={t("eventFormLabels.descriptionPlaceholder")} className="min-h-[120px]" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="cover_image_url" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("eventFormLabels.eventImageUrl")}</FormLabel>
              <FormControl><Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ""} /></FormControl>
              <FormDescription>{t("eventFormLabels.eventImageDesc")}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-medium">{t("eventFormLabels.dateTime")}</h3>
          <p className="text-sm text-muted-foreground">{t('eventFormLabels.localTimezone', { timezone })}</p>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField control={form.control} name="start_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("eventFormLabels.startDate")}</FormLabel>
                <FormControl><DatePicker {...field} onChange={date => changeStart('start_date', date)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="start_time" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventFormLabels.startTime")}</FormLabel>
                <FormControl>
                  <Input type="time" step={60} inputMode="numeric" required {...field}
                    onChange={event => changeStart('start_time', event.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField control={form.control} name="end_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("eventFormLabels.endDate")}</FormLabel>
                <FormControl><DatePicker {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="end_time" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventFormLabels.endTime")}</FormLabel>
                <FormControl>
                  <Input type="time" step={60} inputMode="numeric" required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-medium">{t("eventFormLabels.locationSection")}</h3>
          <FormField control={form.control} name="is_online" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
              <div>
                <FormLabel>{t("eventFormLabels.onlineEvent")}</FormLabel>
                <FormDescription>{t("eventFormLabels.onlineEventDesc")}</FormDescription>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); setIsOnline(checked); }} /></FormControl>
            </FormItem>
          )} />
          {!isOnline && (
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventFormLabels.physicalLocation")}</FormLabel>
                <FormControl><Input placeholder={t("eventFormLabels.physicalPlaceholder")} {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
          {isOnline && (
            <FormField control={form.control} name="meeting_url" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventFormLabels.meetingUrl")}</FormLabel>
                <FormControl><Input placeholder="https://meet.example.com/..." {...field} value={field.value || ""} /></FormControl>
                <FormDescription>{t("eventFormLabels.meetingUrlDesc")}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-medium">{t("eventFormLabels.capacity")}</h3>
          <FormField control={form.control} name="max_attendees" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("eventFormLabels.maxAttendees")}</FormLabel>
              <FormControl>
                <Input type="number" placeholder={t("eventFormLabels.maxAttendeesPlaceholder")} {...field} value={field.value ?? ""} onChange={(e) => { const val = e.target.value === "" ? null : Number(e.target.value); field.onChange(val); }} />
              </FormControl>
              <FormDescription>{t("eventFormLabels.maxAttendeesDesc")}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-medium">{t("eventFormLabels.privacyVisibility")}</h3>
          <FormField control={form.control} name="visibility" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("eventFormLabels.whoCanSee")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={t("eventFormLabels.selectVisibility")} /></SelectTrigger></FormControl>
                <SelectContent>
                  {visibilityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t("eventFormLabels.visibilityControlDesc")}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel || (() => window.history.back())} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("eventFormLabels.submitting") : finalSubmitText}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EventForm;
