import { useEffect, useState } from "react";
import { Clock, CheckCircle2, AlertCircle, Loader2, Download, Instagram, PlusCircle } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InstagramResultsDialog } from "./InstagramResultsDialog";

interface InstagramJob {
  id: string;
  project_id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  estimated_cost_usd: number;
  created_at: string;
  profiles_scraped?: number;
  total_posts?: number;
  total_related?: number;
}

const StatusBadge = ({ status }: { status: string }) => {
  const configs = {
    pending: { icon: Clock, label: "Pending", className: "bg-warning/20 text-warning border-warning/50" },
    processing: { icon: Loader2, label: "Processing", className: "bg-primary/20 text-primary border-primary/50 animate-pulse" },
    completed: { icon: CheckCircle2, label: "Completed", className: "bg-success/20 text-success border-success/50" },
    failed: { icon: AlertCircle, label: "Failed", className: "bg-destructive/20 text-destructive border-destructive/50" },
  };

  const config = configs[status as keyof typeof configs] || configs.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} border transition-smooth`}>
      <Icon className={`h-3 w-3 mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
};

const InstagramJobsTable = () => {
  const [jobs, setJobs] = useState<InstagramJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<InstagramJob | null>(null);

  const handleDownload = async (jobId: string, projectId: string) => {
    setDownloadingJobId(jobId);
    try {
      // Use direct fetch to edge function to handle large CSV responses
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/download-instagram-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ job_id: jobId })
      });

      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      const csvText = await response.text();
      
      // Create blob and download
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectId}_instagram_data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Instagram CSV downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download CSV');
    } finally {
      setDownloadingJobId(null);
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      // Fetch Instagram jobs from dedicated table
      const { data: jobsData, error: jobsError } = await supabase
        .from('instagram_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (jobsError) {
        console.error('Error fetching Instagram jobs:', jobsError);
        setIsLoading(false);
        return;
      }

      // For each job, get counts from instagram_company_data
      const jobsWithCounts = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { data: statsData } = await supabase
            .from('instagram_company_data')
            .select('latest_posts, related_profiles')
            .eq('job_id', job.id);

          let totalPosts = 0;
          let totalRelated = 0;
          const profilesScraped = statsData?.length || 0;

          statsData?.forEach((profile: any) => {
            totalPosts += (profile.latest_posts?.length || 0);
            totalRelated += (profile.related_profiles?.length || 0);
          });

          return {
            ...job,
            profiles_scraped: profilesScraped,
            total_posts: totalPosts,
            total_related: totalRelated,
          };
        })
      );

      setJobs(jobsWithCounts as InstagramJob[]);
      setIsLoading(false);
    };

    fetchJobs();

    // Set up realtime subscription
    const channel = supabase
      .channel('instagram-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_jobs'
        },
        () => {
          fetchJobs();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_company_data'
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const header = (
    <div className="flex items-center gap-3 p-6">
      <div className="p-2 rounded-lg bg-primary/10">
        <Instagram className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Instagram Intelligence Jobs</h3>
        <p className="text-sm text-muted-foreground">
          Track your Instagram scraping progress
        </p>
      </div>
    </div>
  );

  return (
    <>
      <CollapsibleCard header={header} defaultOpen={false} className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No Instagram jobs yet. Upload a CSV with Instagram URLs to get started!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Job ID</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Progress</TableHead>
                  <TableHead className="text-muted-foreground">Profiles</TableHead>
                  <TableHead className="text-muted-foreground">Posts</TableHead>
                  <TableHead className="text-muted-foreground">Related</TableHead>
                  <TableHead className="text-muted-foreground">Cost</TableHead>
                  <TableHead className="text-muted-foreground">Created</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="border-border hover:bg-secondary/50 transition-smooth"
                  >
                    <TableCell className="font-medium text-foreground max-w-[150px]">
                      <div className="truncate text-xs">{job.project_id}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full gradient-primary transition-smooth"
                            style={{
                              width: `${(job.processed_rows / job.total_rows) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {job.processed_rows}/{job.total_rows}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{job.profiles_scraped || 0}</TableCell>
                    <TableCell className="text-foreground">{job.total_posts || 0}</TableCell>
                    <TableCell className="text-foreground">{job.total_related || 0}</TableCell>
                    <TableCell className="text-foreground font-medium">
                      ${parseFloat(job.estimated_cost_usd.toString()).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(job.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {job.status === 'completed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedJob(job);
                                setResultsDialogOpen(true);
                              }}
                              className="hover:bg-primary/10 transition-smooth"
                            >
                              <Instagram className="h-4 w-4 mr-2" />
                              View Results
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDownload(job.id, job.project_id)}
                              disabled={downloadingJobId === job.id}
                              className="gradient-primary hover:opacity-90 transition-smooth"
                            >
                              {downloadingJobId === job.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  CSV
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CollapsibleCard>

      {selectedJob && (
        <InstagramResultsDialog
          jobId={selectedJob.id}
          projectId={selectedJob.project_id}
          isOpen={resultsDialogOpen}
          onClose={() => {
            setResultsDialogOpen(false);
            setSelectedJob(null);
          }}
        />
      )}
    </>
  );
};

export default InstagramJobsTable;
