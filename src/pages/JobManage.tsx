
import { useState, useEffect } from "react";
import { getUserJobPosts, type JobPost, deleteJobPost, toggleJobPostPublished } from "@/services/jobPostsService";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
import { format } from "date-fns";
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
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      toast.error("Please sign in to manage job posts");
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
  }, [user, loading, navigate]);
  
  const handleDeleteClick = (jobId: string) => {
    setJobToDelete(jobId);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!jobToDelete) return;
    
    const success = await deleteJobPost(jobToDelete);
    if (success) {
      setJobs((prevJobs) => prevJobs.filter(job => job.id !== jobToDelete));
    }
    
    setDeleteDialogOpen(false);
    setJobToDelete(null);
  };
  
  const handleTogglePublished = async (jobId: string, published: boolean) => {
    const success = await toggleJobPostPublished(jobId, published);
    if (success) {
      setJobs((prevJobs) => prevJobs.map(job => 
        job.id === jobId ? { ...job, published, published_at: published && !job.published_at ? new Date().toISOString() : job.published_at } : job
      ));
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Manage Job Posts</h1>
          <Button asChild>
            <Link to="/jobs/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Job Post
            </Link>
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-lg text-muted-foreground">Loading your job posts...</p>
          </div>
        ) : jobs.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
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
                    <TableCell>{job.company_name}</TableCell>
                    <TableCell>
                      <Badge variant={job.published ? "default" : "outline"}>
                        {job.published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(job.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/jobs/edit/${job.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant={job.published ? "outline" : "default"} 
                          size="sm"
                          onClick={() => handleTogglePublished(job.id, !job.published)}
                        >
                          {job.published ? "Unpublish" : "Publish"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteClick(job.id)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
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
            <h2 className="text-2xl font-semibold mb-2">No job posts yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven't created any job posts yet. Get started by creating your first job post.
            </p>
            <Button asChild>
              <Link to="/jobs/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Job Post
              </Link>
            </Button>
          </div>
        )}
        
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the job post.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Delete
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
