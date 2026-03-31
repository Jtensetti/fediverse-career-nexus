import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: 'primary' | 'destructive' | 'warning' | 'success';
  loading?: boolean;
}

const colorClasses = {
  primary: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-accent/20 text-accent-foreground',
  success: 'bg-secondary/20 text-secondary-foreground',
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'primary',
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {trend && (
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="text-primary">+{trend.value}%</span>
                  <span className="text-muted-foreground">{trend.label}</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
