import DashboardLayout from "@/components/layout/DashboardLayout";
import InlineErrorBanner from "@/components/forms/InlineErrorBanner";
import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getEvent, updateEvent, Event, EventWithRSVPCount } from '@/services/misc/eventService';
import EventForm from '@/components/events/EventForm';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/common/SEOHead';
import { toast } from 'sonner';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  const [isDirty, setIsDirty] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const confirmDiscard = useUnsavedChanges({ dirty: isDirty, message: t('ux.leaveDescription') });

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
      if (!event) { setSubmitError(true); return; }
      if (event) {
        queryClient.setQueryData<EventWithRSVPCount>(['event', event.id], previous => ({
          ...previous, ...event, rsvp_count: previous?.rsvp_count ?? 0,
        }));
        void queryClient.invalidateQueries({ queryKey: ['events'] });
        confirmDiscard.afterSave(() => navigate(`/events/${event.id}`));
      }
    },
    onError: () => { setSubmitError(true); toast.error(t('common.error')); },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = (data: Omit<Event, "id" | "created_at" | "updated_at" | "user_id">) => {
    if (id && !isSubmitting) {
      setSubmitError(false);
      setIsSubmitting(true);
      updateMutation.mutate({ eventId: id, eventData: data });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout showHeader={false}>
        <div className="text-center" aria-live="polite">
          {t('events.loading')}
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout showHeader={false}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('events.notFound')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('events.notFoundDescription')}
          </p>
          <Button asChild>
            <Link to="/events">{t('events.backToEvents')}</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showHeader={false}>
      <SEOHead
        title={event?.title ? `${t('eventEdit.editTitle')}: ${event.title}` : t('eventEdit.editTitle')}
        description={t('eventEdit.editDescription')}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('eventEdit.editTitle')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('eventEdit.editDescription')}
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        {submitError && <InlineErrorBanner message={t("ux.saveUnconfirmed")} className="mb-4" />}
        <EventForm
          defaultValues={event}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText={t('eventEdit.editButton')}
          onDirtyChange={setIsDirty}
          onCancel={() => confirmDiscard(() => navigate(`/events/${id}`))}
        />
      </div>
    </DashboardLayout>
  );
}
