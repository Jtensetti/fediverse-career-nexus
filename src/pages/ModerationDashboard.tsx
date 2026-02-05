import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, 
  Flag, 
  Users, 
  Ban, 
  Activity, 
  Search, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  Gavel,
  Globe,
  Server,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SEOHead } from '@/components/common/SEOHead';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useModerationAccess } from '@/hooks/useModerationAccess';
import { getModerationStats } from '@/services/moderationService';
import { getPendingReportsCount } from '@/services/reportService';

// Lazy load heavy components
import { lazy, Suspense } from 'react';
const FlaggedContentList = lazy(() => import('@/components/moderation/FlaggedContentList').then(m => ({ default: m.FlaggedContentList })));
const BannedUsersList = lazy(() => import('@/components/moderation/BannedUsersList').then(m => ({ default: m.BannedUsersList })));
const UserLookup = lazy(() => import('@/components/moderation/UserLookup').then(m => ({ default: m.UserLookup })));
const ModerationLog = lazy(() => import('@/components/ModerationLog'));
const DomainModeration = lazy(() => import('@/components/DomainModeration'));
const ActorModeration = lazy(() => import('@/components/ActorModeration'));
const AlertManager = lazy(() => import('@/components/AlertManager').then(m => ({ default: m.AlertManager })));

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  color = 'primary',
  loading = false 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ElementType; 
  trend?: { value: number; label: string }; 
  color?: 'primary' | 'destructive' | 'warning' | 'success';
  loading?: boolean;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-accent/20 text-accent-foreground',
    success: 'bg-secondary/20 text-secondary-foreground',
  };

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

function QuickAction({ 
  label, 
  description, 
  icon: Icon, 
  onClick,
  variant = 'default'
}: { 
  label: string; 
  description: string; 
  icon: React.ElementType; 
  onClick: () => void;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const variants = {
    default: 'hover:border-primary/50 hover:bg-primary/5',
    warning: 'hover:border-yellow-500/50 hover:bg-yellow-500/5',
    danger: 'hover:border-destructive/50 hover:bg-destructive/5',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-xl border bg-card text-left transition-all ${variants[variant]}`}
    >
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  );
}

function LoadingFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function ModerationDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAccess, isAdmin, isModerator, loading: accessLoading } = useModerationAccess();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: getModerationStats,
    enabled: hasAccess,
    refetchInterval: 30000,
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-reports-count'],
    queryFn: getPendingReportsCount,
    enabled: hasAccess,
    refetchInterval: 30000,
  });

  // Loading state
  if (accessLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground">Verifying access...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 max-w-md"
            >
              <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto">
                <Shield className="h-12 w-12 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Access Restricted</h1>
              <p className="text-muted-foreground">
                This area is restricted to authorized moderators only. If you believe you should have access, please contact the administrator.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Return Home
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title="Moderation Dashboard" 
        description="Comprehensive moderation tools for managing community content and users." 
      />
      <Navbar />
      
      <main className="flex-grow">
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-primary/5">
          <div className="container mx-auto px-4 py-8">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Moderation Center</h1>
                  <p className="text-muted-foreground">Monitor, review, and manage community activity</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-primary" />
                  System Online
                </Badge>
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {pendingCount} Pending
                  </Badge>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="overview" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-2">
                  <Flag className="h-4 w-4" />
                  Reports
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="bans" className="gap-2">
                  <Ban className="h-4 w-4" />
                  Bans
                </TabsTrigger>
                <TabsTrigger value="federation" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Federation
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Logs
                </TabsTrigger>
                <TabsTrigger value="alerts" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Alerts
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users, reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  label="Pending Reports" 
                  value={stats?.pendingReports ?? 0}
                  icon={Flag}
                  color={pendingCount > 0 ? 'warning' : 'primary'}
                  loading={statsLoading}
                />
                <StatCard 
                  label="Active Bans" 
                  value={stats?.activeBans ?? 0}
                  icon={Ban}
                  color="destructive"
                  loading={statsLoading}
                />
                <StatCard 
                  label="Actions Today" 
                  value={stats?.totalActionsToday ?? 0}
                  icon={Gavel}
                  color="primary"
                  loading={statsLoading}
                />
                <StatCard 
                  label="Moderators" 
                  value={stats?.totalModerators ?? 0}
                  icon={Shield}
                  color="success"
                  loading={statsLoading}
                />
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                    <CardDescription>Common moderation tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <QuickAction
                      icon={Flag}
                      label="Review Reports"
                      description="Check pending content reports"
                      onClick={() => setActiveTab('reports')}
                      variant={pendingCount > 0 ? 'warning' : 'default'}
                    />
                    <QuickAction
                      icon={Search}
                      label="User Lookup"
                      description="Search and investigate users"
                      onClick={() => setActiveTab('users')}
                    />
                    <QuickAction
                      icon={Server}
                      label="Instance Management"
                      description="Manage federated instances"
                      onClick={() => navigate('/admin/instances')}
                    />
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>Latest moderation actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <Suspense fallback={<LoadingFallback />}>
                        <ModerationLog isAdmin={isAdmin} />
                      </Suspense>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-accent-foreground" />
                    Content Reports
                  </CardTitle>
                  <CardDescription>Review and take action on reported content</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingFallback />}>
                    <FlaggedContentList />
                  </Suspense>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    User Management
                  </CardTitle>
                  <CardDescription>Search and manage user accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingFallback />}>
                    <UserLookup />
                  </Suspense>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bans Tab */}
            <TabsContent value="bans">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-destructive" />
                    User Bans
                  </CardTitle>
                  <CardDescription>View and manage active and historical bans</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingFallback />}>
                    <BannedUsersList />
                  </Suspense>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Federation Tab */}
            <TabsContent value="federation" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      Domain Moderation
                    </CardTitle>
                    <CardDescription>Manage blocked and restricted domains</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<LoadingFallback />}>
                      <DomainModeration />
                    </Suspense>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-secondary-foreground" />
                      Actor Moderation
                    </CardTitle>
                    <CardDescription>Manage blocked federated actors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<LoadingFallback />}>
                      <ActorModeration />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Instance Management</p>
                        <p className="text-sm text-muted-foreground">View rate-limited instances and federation health</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/admin/instances')} variant="outline">
                      Open Instance Manager
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    Moderation Log
                  </CardTitle>
                  <CardDescription>Complete history of moderation actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingFallback />}>
                    <ModerationLog isAdmin={isAdmin} />
                  </Suspense>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts">
              <Suspense fallback={<LoadingFallback />}>
                <AlertManager />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
