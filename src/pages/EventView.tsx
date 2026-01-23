import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Download,
  Share,
  Youtube
} from 'lucide-react';
import { linkifyText } from '@/lib/linkify';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getEvent, createRSVP, deleteEvent, downloadICalFile } from '@/services/eventService';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';

export default function EventView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [videoOpen, setVideoOpen] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id!),
    enabled: !!id
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: 'attending' | 'maybe' | 'declined' }) => 
      createRSVP(eventId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    }
  });

  const handleRSVP = (status: 'attending' | 'maybe' | 'declined') => {
    if (!session) {
      toast.error('You must be logged in to RSVP');
      return;
    }
    
    rsvpMutation.mutate({ eventId: id!, status });
  };

  const handleDelete = () => {
    if (id) {
      deleteMutation.mutate(id);
    }
  };

  const handleShare = async () => {
    const eventUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.description,
          url: eventUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        
        // Fallback to clipboard
        copyToClipboard(eventUrl);
      }
    } else {
      copyToClipboard(eventUrl);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Event link copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err));
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
        <div className="text-center">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Event not found</h2>
          <p className="text-muted-foreground mb-6">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/events">Back to Events</Link>
          </Button>
        </div>
      </div>
    );
  }

  const startDate = parseISO(event.start_date);
  const endDate = event.end_date ? parseISO(event.end_date) : startDate;
  const isCreator = session?.user?.id === event.user_id;
  const isPastEvent = new Date(event.end_date || event.start_date) < new Date();

  const formattedDate = format(startDate, 'EEEE, MMMM d, yyyy');
  const formattedStartTime = format(startDate, 'h:mm a');
  const formattedEndTime = format(endDate, 'h:mm a');
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <SEOHead 
        title={event.title} 
        description={event.description?.slice(0, 160) || "View event details on Nolto."} 
      />
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/events" className="text-sm text-muted-foreground hover:underline">
                Events
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm">Event Details</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {event.is_online && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                <span>Virtual</span>
              </Badge>
            )}
          </div>
        </div>

        {event.cover_image_url && (
          <div className="w-full aspect-video rounded-lg overflow-hidden">
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">About this event</h2>
              <div 
                className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(linkifyText(event.description || ''), {
                    ALLOWED_TAGS: ['a', 'br'],
                    ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                  })
                }}
              />
            </div>

            {event.is_online && event.meeting_url && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Meeting Link</h2>
                {videoOpen ? (
                  <div className="aspect-video w-full mb-4">
                    {event.meeting_url.includes('youtube') || event.meeting_url.includes('youtu.be') ? (
                      <iframe
                        className="w-full h-full rounded-lg"
                        src={event.meeting_url.includes('embed') ? event.meeting_url : event.meeting_url.replace('watch?v=', 'embed/')}
                        title={event.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : event.meeting_url.includes('jitsi') || event.meeting_url.includes('meet.') ? (
                      <iframe
                        className="w-full h-full rounded-lg"
                        src={event.meeting_url}
                        title={event.title}
                        frameBorder="0"
                        allow="camera; microphone; fullscreen; display-capture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
                        <div className="text-center p-6">
                          <Video className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                          <h3 className="text-lg font-medium mb-1">Meeting Link</h3>
                          <a 
                            href={event.meeting_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all"
                          >
                            {event.meeting_url}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-40 flex flex-col items-center justify-center gap-3"
                    onClick={() => setVideoOpen(true)}
                  >
                    <Video className="h-10 w-10" />
                    <span>Click to view meeting</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Date and time</div>
                      <div className="text-sm text-muted-foreground">{formattedDate}</div>
                      <div className="text-sm text-muted-foreground">
                        {formattedStartTime} - {formattedEndTime} ({browserTimezone})
                      </div>
                    </div>
                  </div>

                  {event.location && !event.is_online && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">Location</div>
                        <div className="text-sm text-muted-foreground">{event.location}</div>
                      </div>
                    </div>
                  )}

                  {event.max_attendees && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">Capacity</div>
                        <div className="text-sm text-muted-foreground">
                          {event.rsvp_count || 0} / {event.max_attendees} attendees
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {!isPastEvent && (
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      disabled={
                        !session || 
                        rsvpMutation.isPending || 
                        event.user_rsvp_status === 'attending'
                      }
                      onClick={() => handleRSVP('attending')}
                    >
                      {event.user_rsvp_status === 'attending'
                        ? 'You are attending'
                        : 'Attend this event'}
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={
                          !session || 
                          rsvpMutation.isPending || 
                          event.user_rsvp_status === 'maybe'
                        }
                        onClick={() => handleRSVP('maybe')}
                      >
                        Maybe
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={
                          !session || 
                          rsvpMutation.isPending || 
                          event.user_rsvp_status === 'declined'
                        }
                        onClick={() => handleRSVP('declined')}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => downloadICalFile(event)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to calendar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleShare}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share event</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {isCreator && (
              <div className="flex flex-col gap-3">
                <Button asChild variant="outline">
                  <Link to={`/events/edit/${event.id}`}>Edit Event</Link>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Event</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete
                        the event and all associated RSVPs.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
