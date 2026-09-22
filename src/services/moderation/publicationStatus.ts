import { toast } from 'sonner';
import i18n from '@/i18n';

export function notifyPublication(status: string, publishedMessage: string) {
  if (status === 'pending') {
    toast.info(i18n.t('contentCare.held'), {
      duration: 10000,
      action: { label: i18n.t('contentCare.myReviews'), onClick: () => window.location.assign('/my-reviews') },
    });
  } else {
    toast.success(publishedMessage);
  }
}
