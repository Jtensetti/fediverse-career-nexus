
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  image_url: string | null;
  capacity: number | null;
  is_virtual: boolean;
  is_public: boolean;
  stream_type: 'youtube' | 'peertube' | 'jitsi' | 'rtmp' | 'other' | null;
  stream_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  status: 'attending' | 'maybe' | 'declined';
  created_at: string;
  updated_at: string;
}

export type EventWithRSVPCount = Event & {
  rsvp_count: number;
  user_rsvp_status?: 'attending' | 'maybe' | 'declined';
};

export async function getEvents(options: {
  limit?: number;
  page?: number;
  upcoming?: boolean;
  userId?: string | null;
} = {}): Promise<EventWithRSVPCount[]> {
  try {
    const { limit = 10, page = 0, upcoming = true, userId } = options;
    
    let query = supabase
      .from('events')
      .select('*, rsvp_count:event_rsvps(count(*))');
    
    // Filter by upcoming events
    if (upcoming) {
      query = query.gte('end_time', new Date().toISOString());
    }
    
    // Filter by user_id if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query
      .order('start_time', { ascending: true })
      .range(page * limit, (page + 1) * limit - 1);
    
    if (error) throw error;
    
    // Transform the data to match our expected type
    const eventsWithCount: EventWithRSVPCount[] = data?.map(item => {
      // Extract the rsvp_count from the nested object and add it to the main event object
      const { rsvp_count, ...event } = item as any;
      return {
        ...event,
        rsvp_count: rsvp_count[0]?.count || 0
      };
    }) || [];
    
    // Get current user's RSVP status for each event
    const currentUser = (await supabase.auth.getSession()).data.session?.user;
    
    if (currentUser && eventsWithCount.length > 0) {
      const eventIds = eventsWithCount.map(event => event.id);
      
      const { data: rsvpData } = await supabase
        .from('event_rsvps')
        .select('event_id, status')
        .eq('user_id', currentUser.id)
        .in('event_id', eventIds);
      
      if (rsvpData) {
        const rsvpMap = new Map(rsvpData.map(rsvp => [rsvp.event_id, rsvp.status]));
        
        return eventsWithCount.map(event => ({
          ...event,
          user_rsvp_status: rsvpMap.get(event.id) as 'attending' | 'maybe' | 'declined' | undefined
        }));
      }
    }
    
    return eventsWithCount;
  } catch (error) {
    console.error('Error fetching events:', error);
    toast.error('Failed to load events');
    return [];
  }
}

export async function getEvent(id: string): Promise<EventWithRSVPCount | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*, rsvp_count:event_rsvps(count(*))')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Transform the data to match our expected type
    const { rsvp_count, ...event } = data as any;
    const eventWithCount: EventWithRSVPCount = {
      ...event,
      rsvp_count: rsvp_count[0]?.count || 0
    };
    
    // Get current user's RSVP status
    const currentUser = (await supabase.auth.getSession()).data.session?.user;
    
    if (currentUser) {
      const { data: rsvpData } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('user_id', currentUser.id)
        .eq('event_id', id)
        .maybeSingle();
      
      if (rsvpData) {
        return {
          ...eventWithCount,
          user_rsvp_status: rsvpData.status as 'attending' | 'maybe' | 'declined'
        };
      }
    }
    
    return eventWithCount;
  } catch (error) {
    console.error('Error fetching event:', error);
    toast.error('Failed to load event details');
    return null;
  }
}

export async function createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Event | null> {
  try {
    const session = await supabase.auth.getSession();
    const user_id = session.data.session?.user.id;
    
    if (!user_id) {
      toast.error('You must be logged in to create an event');
      return null;
    }
    
    const { data, error } = await supabase
      .from('events')
      .insert({
        ...eventData,
        user_id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('Event created successfully');
    return data as Event;
  } catch (error) {
    console.error('Error creating event:', error);
    toast.error('Failed to create event');
    return null;
  }
}

export async function updateEvent(id: string, eventData: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .update({ 
        ...eventData, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('Event updated successfully');
    return data as Event;
  } catch (error) {
    console.error('Error updating event:', error);
    toast.error('Failed to update event');
    return null;
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success('Event deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    toast.error('Failed to delete event');
    return false;
  }
}

export async function createRSVP(eventId: string, status: 'attending' | 'maybe' | 'declined'): Promise<EventRSVP | null> {
  try {
    const session = await supabase.auth.getSession();
    const user_id = session.data.session?.user.id;
    
    if (!user_id) {
      toast.error('You must be logged in to RSVP to an event');
      return null;
    }
    
    const { data, error } = await supabase
      .from('event_rsvps')
      .upsert({
        event_id: eventId,
        user_id,
        status
      })
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success(`RSVP ${status} submitted successfully`);
    return data as EventRSVP;
  } catch (error) {
    console.error('Error creating RSVP:', error);
    toast.error('Failed to submit RSVP');
    return null;
  }
}

export async function getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', eventId);
    
    if (error) throw error;
    
    return data as EventRSVP[];
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    toast.error('Failed to load RSVPs');
    return [];
  }
}

export function generateICalEvent(event: Event): string {
  const formatDate = (date: string): string => {
    const d = new Date(date);
    return d.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const startDate = formatDate(event.start_time);
  const endDate = formatDate(event.end_time);
  const now = formatDate(new Date().toISOString());
  
  let location = event.location || '';
  if (event.is_virtual && event.stream_url) {
    location = location ? `${location} and ${event.stream_url}` : event.stream_url;
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//hacksw/handcal//NONSGML v1.0//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@${window.location.hostname}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadICalFile(event: Event): void {
  const iCalContent = generateICalEvent(event);
  const blob = new Blob([iCalContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${event.title.replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
