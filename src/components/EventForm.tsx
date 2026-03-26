import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Event } from "@/services/eventService";

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Stockholm",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const timeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute of [0, 30]) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      const period = hour < 12 ? "AM" : "PM";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      const label = `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
      times.push({ value: `${h}:${m}`, label });
    }
  }
  return times;
};

function createEventFormSchema(t: (key: string) => string) {
  return z
    .object({
      title: z.string().min(3, t("eventFormLabels.titleValidation")),
      description: z.string().min(10, t("eventFormLabels.descriptionValidation")),
      location: z.string().optional(),
      start_date: z.date({ required_error: t("eventFormLabels.startDateRequired") }),
      start_time: z.string({ required_error: t("eventFormLabels.startTimeRequired") }),
      end_date: z.date({ required_error: t("eventFormLabels.endDateRequired") }),
      end_time: z.string({ required_error: t("eventFormLabels.endTimeRequired") }),
      timezone: z.string().default("UTC"),
      is_online: z.boolean().default(false),
      meeting_url: z.string().url(t("eventFormLabels.invalidUrl")).optional().nullable(),
      max_attendees: z.coerce.number().int().positive().optional().nullable(),
      cover_image_url: z.string().url(t("eventFormLabels.invalidUrl")).optional().nullable(),
      visibility: z.enum(["public", "connections", "private"]).default("public"),
    })
    .refine(
      (data) => {
        const startDateTime = new Date(data.start_date.getFullYear(), data.start_date.getMonth(), data.start_date.getDate(), ...data.start_time.split(":").map(Number));
        const endDateTime = new Date(data.end_date.getFullYear(), data.end_date.getMonth(), data.end_date.getDate(), ...data.end_time.split(":").map(Number));
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
}

const EventForm = ({
  defaultValues = {},
  onSubmit,
  isSubmitting,
  submitButtonText,
}: EventFormProps) => {
  const { t } = useTranslation();
  const eventFormSchema = createEventFormSchema(t);

  const startDate = defaultValues.start_date ? new Date(defaultValues.start_date) : undefined;
  const endDate = defaultValues.end_date ? new Date(defaultValues.end_date) : undefined;

  const formattedDefaultValues = {
    title: defaultValues.title || "",
    description: defaultValues.description || "",
    location: defaultValues.location || "",
    start_date: startDate,
    start_time: startDate ? format(startDate, "HH:mm") : "09:00",
    end_date: endDate,
    end_time: endDate ? format(endDate, "HH:mm") : "10:00",
    timezone: "UTC",
    is_online: defaultValues.is_online || false,
    meeting_url: defaultValues.meeting_url || null,
    max_attendees: defaultValues.max_attendees || null,
    cover_image_url: defaultValues.cover_image_url || null,
    visibility: (defaultValues as any).visibility || "public",
  };

  const [isOnline, setIsOnline] = useState(defaultValues.is_online || false);

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "", description: "", location: "",
      start_date: new Date(), start_time: "09:00",
      end_date: new Date(), end_time: "10:00",
      timezone: "UTC", is_online: false,
      meeting_url: null, max_attendees: null,
      cover_image_url: null, visibility: "public" as const,
      ...formattedDefaultValues,
    },
  });

  const handleSubmit = (values: z.infer<typeof eventFormSchema>) => {
    const startDateTime = new Date(values.start_date.getFullYear(), values.start_date.getMonth(), values.start_date.getDate(), ...values.start_time.split(":").map(Number));
    const endDateTime = new Date(values.end_date.getFullYear(), values.end_date.getMonth(), values.end_date.getDate(), ...values.end_time.split(":").map(Number));
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
          <div className="grid gap-6 md:grid-cols-2">
            <FormField control={form.control} name="start_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("eventFormLabels.startDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className="w-full pl-3 text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>{t("eventFormLabels.pickDate")}</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="start_time" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventFormLabels.startTime")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("eventFormLabels.selectTime")} /></SelectTrigger></FormControl>
                  <SelectContent>{timeOptions().map((time) => (<SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField control={form.control} name="end_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("eventFormLabels.endDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className="w-full pl-3 text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>{t("eventFormLabels.pickDate")}</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="end_time" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventFormLabels.endTime")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("eventFormLabels.selectTime")} /></SelectTrigger></FormControl>
                  <SelectContent>{timeOptions().map((time) => (<SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>))}</SelectContent>
                </Select>
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
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
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
