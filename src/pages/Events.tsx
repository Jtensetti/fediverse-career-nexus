
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Calendar, Video, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventWithRSVPCount, getEvents } from '@/services/eventService';

export default function Events() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  
  const upcomingEvents = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => getEvents({ upcoming: true }),
  });
  
  const pastEvents = useQuery({
    queryKey: ['events', 'past'],
    queryFn: () => getEvents({ upcoming: false }),
    enabled: tab === 'past',
  });

  return (
    <div className="container max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground mt-2">Attend events, webinars, and livestreams.</p>
        </div>
        
        <Button asChild className="mt-4 md:mt-0">
          <Link to="/events/create">
            <Calendar className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="upcoming" className="w-full" onValueChange={(value) => setTab(value as 'upcoming' | 'past')}>
        <TabsList className="mb-8">
          <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-6">
          {upcomingEvents.isLoading ? (
            <div className="flex justify-center py-10">
              <p>Loading events...</p>
            </div>
          ) : upcomingEvents.data?.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/20">
              <h3 className="text-xl font-medium mb-2">No upcoming events</h3>
              <p className="text-muted-foreground mb-6">There are no upcoming events scheduled yet.</p>
              <Button asChild>
                <Link to="/events/create">Create an Event</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.data?.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="space-y-6">
          {pastEvents.isLoading ? (
            <div className="flex justify-center py-10">
              <p>Loading events...</p>
            </div>
          ) : pastEvents.data?.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/20">
              <h3 className="text-xl font-medium">No past events</h3>
              <p className="text-muted-foreground">There are no past events to display.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pastEvents.data?.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface EventCardProps {
  event: EventWithRSVPCount;
}

function EventCard({ event }: EventCardProps) {
  const eventDate = parseISO(event.start_time);
  const formattedDate = format(eventDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(eventDate, 'h:mm a');
  
  return (
    <Card className="overflow-hidden flex flex-col">
      {event.image_url ? (
        <div className="aspect-video w-full overflow-hidden">
          <img 
            src={event.image_url} 
            alt={event.title} 
            className="object-cover w-full h-full"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-muted flex items-center justify-center">
          <Calendar className="h-10 w-10 text-muted-foreground/60" />
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="line-clamp-2">
          <Link to={`/events/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </CardTitle>
        <CardDescription>
          <div className="flex flex-col gap-1">
            <span>{formattedDate}</span>
            <span>{formattedTime} ({event.timezone})</span>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {event.description}
        </p>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          {event.is_virtual && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Video className="h-3 w-3 mr-1" />
              Virtual
            </div>
          )}
          {!event.is_virtual && event.location && (
            <div className="flex items-center text-xs text-muted-foreground line-clamp-1 max-w-[150px]">
              {event.location}
            </div>
          )}
        </div>
        
        <div className="flex items-center text-xs text-muted-foreground">
          <User className="h-3 w-3 mr-1" />
          {event.rsvp_count || 0} attending
        </div>
      </CardFooter>
    </Card>
  );
}
