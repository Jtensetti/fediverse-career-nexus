
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createEvent, Event } from '@/services/eventService';

import EventForm from '@/components/EventForm';

export default function EventCreate() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const createMutation = useMutation({
    mutationFn: (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      return createEvent(eventData);
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
    setIsSubmitting(true);
    createMutation.mutate(data);
  };

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('events.createTitle')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('events.createDescription')}
        </p>
      </div>
      
      <div className="bg-card rounded-lg border p-6">
        <EventForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText={t('events.create')}
        />
      </div>
    </div>
  );
}
