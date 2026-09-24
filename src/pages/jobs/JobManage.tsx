
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getUserJobPosts, type JobPost, deleteJobPost, toggleJobPostPublished } from "@/services/misc/jobPostsService";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Edit, Trash, Plus } from "lucide-react";
import { toast } from "sonner";

const JobManage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingJobIds, setPendingJobIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      toast.error(t("jobManage.signInRequired"));
      navigate("/auth");
      return;
    }
    
    if (!user) return;
    
    const fetchJobs = async () => {
      setIsLoading(true);
      const jobsData = await getUserJobPosts();
      setJobs(jobsData);
      setIsLoading(false);
    };
    
    fetchJobs();
  }, [user, loading, navigate, t]);
  
  const handleDeleteClick = (jobId: string) => {
    setJobToDelete(jobId);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!jobToDelete || isDeleting) return;
    setIsDeleting(true);
    
    const success = await deleteJobPost(jobToDelete);
    if (success) {
      setJobs((prevJobs) => prevJobs.filter(job => job.id !== jobToDelete));
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
    setIsDeleting(false);
  };
  
  const handleTogglePublished = async (jobId: string, isActive: boolean) => {
    if (pendingJobIds.has(jobId)) return;
    setPendingJobIds(ids => new Set(ids).add(jobId));
    const success = await toggleJobPostPublished(jobId, isActive);
    if (success) {
      setJobs((prevJobs) => prevJobs.map(job => 
        job.id === jobId ? { ...job, is_active: isActive } : job
      ));
    }
    setPendingJobIds(ids => { const next = new Set(ids); next.delete(jobId); return next; });
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container py-8">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("jobManage.title")}</h1>
          <Button asChild>
            <Link to="/jobs/create">
              <Plus className="mr-2 h-4 w-4" />
              {t("jobFormLabels.createJobPost")}
            </Link>
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-lg text-muted-foreground">{t("jobManage.loading")}</p>
          </div>
        ) : jobs.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("jobManage.jobTitle")}</TableHead>
                  <TableHead>{t("jobManage.company")}</TableHead>
                  <TableHead>{t("jobManage.status")}</TableHead>
                  <TableHead>{t("jobView.created")}</TableHead>
                  <TableHead>{t("jobManage.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      <Link to={`/jobs/${job.id}`} className="hover:underline">
                        {job.title}
                      </Link>
                    </TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>
                      <Badge variant={job.is_active ? "default" : "outline"}>
                        {t(job.is_active ? "jobView.published" : "jobView.draft")}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(job.created_at))}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/jobs/edit/${job.id}`} aria-label={t("jobManage.editLabel", { title: job.title })}>
                            <Edit className="h-4 w-4" />
                            <span className="ml-2">{t("jobManage.edit")}</span>
                          </Link>
                        </Button>
                        <Button 
                          variant={job.is_active ? "outline" : "default"} 
                          size="sm"
                          disabled={pendingJobIds.has(job.id)}
                          onClick={() => handleTogglePublished(job.id, !job.is_active)}
                        >
                          {t(job.is_active ? "jobManage.unpublish" : "jobManage.publish")}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          aria-label={t("jobManage.deleteLabel", { title: job.title })}
                          onClick={() => handleDeleteClick(job.id)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                          <span className="ml-2">{t("jobManage.delete")}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <h2 className="text-2xl font-semibold mb-2">{t("jobManage.emptyTitle")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("jobManage.emptyDescription")}
            </p>
            <Button asChild>
              <Link to="/jobs/create">
                <Plus className="mr-2 h-4 w-4" />
                {t("jobFormLabels.createJobPost")}
              </Link>
            </Button>
          </div>
        )}
        
        <AlertDialog open={deleteDialogOpen} onOpenChange={open => { if (!isDeleting) setDeleteDialogOpen(open); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("jobManage.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("jobManage.deleteDescription", { title: jobs.find(job => job.id === jobToDelete)?.title })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction disabled={isDeleting} onClick={event => { event.preventDefault(); void confirmDelete(); }} className="bg-destructive text-destructive-foreground">
                {t(isDeleting ? "jobManage.deleting" : "jobManage.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      <Footer />
    </div>
  );
};

export default JobManage;
