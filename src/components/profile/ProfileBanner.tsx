import { cn } from '@/lib/utils';
import { MediaImage } from '@/components/content/MediaImage';

export default function ProfileBanner({ headerUrl, className }: { headerUrl?: string | null; className?: string }) {
  return <div className={cn('relative h-48 w-full overflow-hidden md:h-72 lg:h-80', className)}>
    {headerUrl ? <MediaImage src={headerUrl} alt="" className="h-full w-full object-cover" />
      : <div className="h-full w-full bg-gradient-to-br from-primary/30 via-primary/20 to-secondary/30" />}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
  </div>;
}
