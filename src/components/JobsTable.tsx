import { useEffect, useState } from "react";
import { Clock, CheckCircle2, AlertCircle, Loader2, Download, MessageCircle, Users, Combine } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import ProjectQADialog from "./ProjectQADialog";
import ScrapedRowsDialog from "./ScrapedRowsDialog";
import { MergeCsvDialog } from "./MergeCsvDialog";

interface Job {
  id: string;
  project_id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  total_pages_scraped: number;
  estimated_cost_usd: number;
  created_at: string;
  conversation?: any[];
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

const JobsTable = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [qaDialogOpen, setQaDialogOpen] = useState(false);
  const [rowsDialogOpen, setRowsDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleDownload = async (jobId: string, projectId: string) => {
    setDownloadingJobId(jobId);
    try {
      const { data, error } = await supabase.functions.invoke('download-csv', {
        body: { job_id: jobId },
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectId}_enriched.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('CSV downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download CSV');
    } finally {
      setDownloadingJobId(null);
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching jobs:', error);
      } else {
        setJobs((data || []) as Job[]);
      }
      setIsLoading(false);
    };

    fetchJobs();

    // Set up realtime subscription
    const channel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraping_jobs'
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

  return (
    <Card className="gradient-card border-border/50 overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-bold text-foreground">Recent Jobs</h2>
        <p className="text-muted-foreground mt-1">Track your scraping and extraction progress</p>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            No jobs yet. Upload a CSV to get started!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Project ID</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Progress</TableHead>
                <TableHead className="text-muted-foreground">Pages</TableHead>
                <TableHead className="text-muted-foreground">Cost</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow
                  key={job.id}
                  className="border-border hover:bg-secondary/50 transition-smooth cursor-pointer"
                >
                  <TableCell className="font-medium text-foreground max-w-[200px]">
                    <div className="truncate">{job.project_id}</div>
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
                  <TableCell className="text-foreground">{job.total_pages_scraped}</TableCell>
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
                              setRowsDialogOpen(true);
                            }}
                            className="hover:bg-primary/10 transition-smooth"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Find People
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedJob(job);
                              setQaDialogOpen(true);
                            }}
                            className="hover:bg-primary/10 transition-smooth"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Q&A
                          </Button>
                          {job.project_id === 'project_1762544485343_ggshca' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedJob(job);
                                setMergeDialogOpen(true);
                              }}
                              className="hover:bg-primary/10 transition-smooth"
                            >
                              <Combine className="h-4 w-4 mr-2" />
                              Merge CSV
                            </Button>
                          )}
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
                                Download
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

      {selectedJob && (
        <>
          <ProjectQADialog
            jobId={selectedJob.id}
            projectId={selectedJob.project_id}
            isOpen={qaDialogOpen}
            onClose={() => {
              setQaDialogOpen(false);
              setSelectedJob(null);
            }}
            initialConversation={selectedJob.conversation || []}
          />
          
          <ScrapedRowsDialog
            jobId={selectedJob.id}
            isOpen={rowsDialogOpen}
            onClose={() => {
              setRowsDialogOpen(false);
              setSelectedJob(null);
            }}
          />
          
          <MergeCsvDialog
            jobId={selectedJob.id}
            projectId={selectedJob.project_id}
            open={mergeDialogOpen}
            onOpenChange={(open) => {
              setMergeDialogOpen(open);
              if (!open) setSelectedJob(null);
            }}
          />
        </>
      )}
    </Card>
  );
};

export default JobsTable;
