import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getEvent, updateEvent, Event } from '@/services/eventService';
import EventForm from '@/components/EventForm';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/common/SEOHead';

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id!),
    enabled: !!id
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, eventData }: { eventId: string, eventData: Partial<Event> }) => {
      return updateEvent(eventId, eventData);
    },
    onSuccess: (event) => {
      if (event) {
        navigate(`/events/${event.id}`);
      }
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = (data: Event) => {
    if (id) {
      setIsSubmitting(true);
      updateMutation.mutate({ eventId: id, eventData: data });
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
        <div className="text-center" aria-live="polite">
          {t('events.loading')}
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('events.notFound')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('events.notFoundDescription')}
          </p>
          <Button asChild>
            <Link to="/events">{t('events.backToEvents')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <SEOHead 
        title={event?.title ? `Edit: ${event.title}` : t('events.editTitle')} 
        description={t('events.editDescription')} 
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('events.editTitle')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('events.editDescription')}
        </p>
      </div>
      
      <div className="bg-card rounded-lg border p-6">
        <EventForm 
          defaultValues={event}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText={t('events.edit')}
        />
      </div>
    </div>
  );
}
