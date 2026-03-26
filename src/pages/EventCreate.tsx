import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createEvent, Event } from '@/services/eventService';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EventForm from '@/components/EventForm';
import { SEOHead } from '@/components/common/SEOHead';

export default function EventCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => createEvent(eventData),
    onSuccess: (event) => {
      if (event) {
        toast.success(t('eventCreate.success'));
        navigate(`/events/${event.id}`);
      }
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
      toast.error(t('eventCreate.failed'));
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (data: Event) => {
    setIsSubmitting(true);
    createMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={t("eventCreate.title")} description={t("eventCreate.description")} />
      <Navbar />
      <main className="flex-grow">
        <div className="container max-w-4xl mx-auto py-10 px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">{t("eventCreate.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("eventCreate.description")}</p>
          </div>
          <div className="bg-card rounded-lg border p-6">
            <EventForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitButtonText={t("eventCreate.title")} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
