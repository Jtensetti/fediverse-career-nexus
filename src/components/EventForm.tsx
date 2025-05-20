
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
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Event } from '@/services/eventService';

const streamTypes = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'peertube', label: 'PeerTube' },
  { value: 'jitsi', label: 'Jitsi Meet' },
  { value: 'rtmp', label: 'RTMP Stream' },
  { value: 'other', label: 'Other' },
];

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

const eventFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().optional(),
  start_date: z.date({ required_error: "Start date is required" }),
  start_time: z.string({ required_error: "Start time is required" }),
  end_date: z.date({ required_error: "End date is required" }),
  end_time: z.string({ required_error: "End time is required" }),
  timezone: z.string().default("UTC"),
  is_virtual: z.boolean().default(false),
  stream_type: z.string().optional().nullable(),
  stream_url: z.string().url("Invalid URL format").optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  image_url: z.string().url("Invalid URL format").optional().nullable(),
  is_public: z.boolean().default(true),
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
  // If it's virtual, stream_type and stream_url are required
  if (data.is_virtual) {
    return data.stream_type !== undefined && data.stream_url !== undefined;
  }
  return true;
}, {
  message: "Stream type and URL are required for virtual events",
  path: ["stream_type"],
});

interface EventFormProps {
  defaultValues?: Partial<Event>;
  onSubmit: (data: Event) => void;
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
  const startDate = defaultValues.start_time ? new Date(defaultValues.start_time) : undefined;
  const endDate = defaultValues.end_time ? new Date(defaultValues.end_time) : undefined;
  
  const formattedDefaultValues = {
    ...defaultValues,
    start_date: startDate,
    start_time: startDate ? format(startDate, 'HH:mm') : undefined,
    end_date: endDate,
    end_time: endDate ? format(endDate, 'HH:mm') : undefined,
  };

  const [isVirtual, setIsVirtual] = useState(defaultValues.is_virtual || false);
  
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
      is_virtual: false,
      stream_type: null,
      stream_url: null,
      capacity: null,
      image_url: null,
      is_public: true,
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

    // Convert to event data format
    const eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'user_id'> = {
      title: values.title,
      description: values.description,
      location: values.location || null,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      timezone: values.timezone,
      is_virtual: values.is_virtual,
      stream_type: values.is_virtual ? values.stream_type as Event['stream_type'] : null,
      stream_url: values.is_virtual ? values.stream_url : null,
      capacity: values.capacity,
      image_url: values.image_url,
      is_public: values.is_public,
    };

    onSubmit(eventData as Event);
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
            name="image_url"
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
                          className={
                            "w-full pl-3 text-left font-normal"
                          }
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
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
                          className={
                            "w-full pl-3 text-left font-normal"
                          }
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
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
          
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timezones.map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Location */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Location</h3>
          
          <FormField
            control={form.control}
            name="is_virtual"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
                <div>
                  <FormLabel>Virtual Event</FormLabel>
                  <FormDescription>
                    Will this event be held online?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setIsVirtual(checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          {!isVirtual && (
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
          
          {isVirtual && (
            <>
              <FormField
                control={form.control}
                name="stream_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stream Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stream type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {streamTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the platform you'll be using for your virtual event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="stream_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stream URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide the URL for your livestream
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
        
        {/* Additional Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Additional Settings</h3>
          
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 100"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Maximum number of attendees (leave empty for unlimited)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="is_public"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
                <div>
                  <FormLabel>Public Event</FormLabel>
                  <FormDescription>
                    Make this event visible to everyone
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
