
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Event } from '@/services/eventService';

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

// Define times for the select dropdown (every 30 minutes)
const timeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute of [0, 30]) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const period = hour < 12 ? 'AM' : 'PM';
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      const label = `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
      times.push({ value: `${h}:${m}`, label });
    }
  }
  return times;
};

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can see and RSVP to this event' },
  { value: 'connections', label: 'Connections Only', description: 'Only your connections can see this event' },
  { value: 'private', label: 'Private', description: 'Only invited people can see this event' },
];

const eventFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().optional(),
  start_date: z.date({ required_error: "Start date is required" }),
  start_time: z.string({ required_error: "Start time is required" }),
  end_date: z.date({ required_error: "End date is required" }),
  end_time: z.string({ required_error: "End time is required" }),
  timezone: z.string().default("UTC"),
  is_online: z.boolean().default(false),
  meeting_url: z.string().url("Invalid URL format").optional().nullable(),
  max_attendees: z.coerce.number().int().positive().optional().nullable(),
  cover_image_url: z.string().url("Invalid URL format").optional().nullable(),
  visibility: z.enum(['public', 'connections', 'private']).default('public'),
}).refine(data => {
  // Combine date and time for validation
  const startDateTime = new Date(
    data.start_date.getFullYear(),
    data.start_date.getMonth(),
    data.start_date.getDate(),
    ...data.start_time.split(':').map(Number)
  );
  
  const endDateTime = new Date(
    data.end_date.getFullYear(),
    data.end_date.getMonth(),
    data.end_date.getDate(),
    ...data.end_time.split(':').map(Number)
  );
  
  // End time must be after start time
  return endDateTime > startDateTime;
}, {
  message: "End time must be after start time",
  path: ["end_time"],
}).refine(data => {
  // If it's online, meeting_url is recommended
  if (data.is_online && !data.meeting_url) {
    return true; // Allow but show warning
  }
  return true;
}, {
  message: "Meeting URL is recommended for online events",
  path: ["meeting_url"],
});

interface EventFormProps {
  defaultValues?: Partial<Event>;
  onSubmit: (data: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => void;
  isSubmitting: boolean;
  submitButtonText?: string;
}

const EventForm = ({
  defaultValues = {},
  onSubmit,
  isSubmitting,
  submitButtonText = "Create Event"
}: EventFormProps) => {
  // Format defaultValues for the form
  const startDate = defaultValues.start_date ? new Date(defaultValues.start_date) : undefined;
  const endDate = defaultValues.end_date ? new Date(defaultValues.end_date) : undefined;
  
  const formattedDefaultValues = {
    title: defaultValues.title || "",
    description: defaultValues.description || "",
    location: defaultValues.location || "",
    start_date: startDate,
    start_time: startDate ? format(startDate, 'HH:mm') : "09:00",
    end_date: endDate,
    end_time: endDate ? format(endDate, 'HH:mm') : "10:00",
    timezone: "UTC",
    is_online: defaultValues.is_online || false,
    meeting_url: defaultValues.meeting_url || null,
    max_attendees: defaultValues.max_attendees || null,
    cover_image_url: defaultValues.cover_image_url || null,
    visibility: (defaultValues as any).visibility || 'public',
  };

  const [isOnline, setIsOnline] = useState(defaultValues.is_online || false);
  
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      start_date: new Date(),
      start_time: "09:00",
      end_date: new Date(),
      end_time: "10:00",
      timezone: "UTC",
      is_online: false,
      meeting_url: null,
      max_attendees: null,
      cover_image_url: null,
      visibility: 'public' as const,
      ...formattedDefaultValues
    },
  });
  
  const handleSubmit = (values: z.infer<typeof eventFormSchema>) => {
    // Combine date and time into ISO strings
    const startDateTime = new Date(
      values.start_date.getFullYear(),
      values.start_date.getMonth(),
      values.start_date.getDate(),
      ...values.start_time.split(':').map(Number)
    );

    const endDateTime = new Date(
      values.end_date.getFullYear(),
      values.end_date.getMonth(),
      values.end_date.getDate(),
      ...values.end_time.split(':').map(Number)
    );

    // Convert to event data format matching database schema
    const eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'user_id'> = {
      title: values.title,
      description: values.description,
      location: values.location || null,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      is_online: values.is_online,
      meeting_url: values.is_online ? values.meeting_url : null,
      max_attendees: values.max_attendees,
      cover_image_url: values.cover_image_url,
      visibility: values.visibility,
    } as any;

    onSubmit(eventData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Basic Event Details */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Event Details</h3>
          
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter event title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe your event..." 
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="cover_image_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Image URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://example.com/image.jpg" 
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  URL to an image for the event banner
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Date & Time */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Date & Time</h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions().map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions().map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Location */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Location</h3>
          
          <FormField
            control={form.control}
            name="is_online"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
                <div>
                  <FormLabel>Online Event</FormLabel>
                  <FormDescription>
                    Will this event be held online?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setIsOnline(checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          {!isOnline && (
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Physical Location</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. 123 Main St, City, Country" 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {isOnline && (
            <FormField
              control={form.control}
              name="meeting_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://meet.example.com/..." 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to your online meeting (Zoom, Google Meet, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        {/* Capacity */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Capacity</h3>
          
          <FormField
            control={form.control}
            name="max_attendees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Attendees</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="Leave empty for unlimited" 
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      field.onChange(val);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Set a maximum number of attendees (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Visibility */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Privacy & Visibility</h3>
          
          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Who can see this event?</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                  </FormControl>
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
                <FormDescription>
                  Control who can discover and attend your event
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
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

export default EventForm;
