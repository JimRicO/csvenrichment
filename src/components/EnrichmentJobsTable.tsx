import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Eye, Download, Sparkles, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EnrichedClubsDialog from "./EnrichedClubsDialog";

interface EnrichmentJob {
  id: string;
  project_id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  estimated_cost_usd: number;
  created_at: string;
  updated_at: string;
}

const EnrichmentJobsTable = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('enrichment_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching enrichment jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Set up realtime subscription
    const channel = supabase
      .channel('enrichment_jobs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrichment_jobs' },
        () => fetchJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDownloadCsv = async (jobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('download-enrichment-csv', {
        body: { job_id: jobId },
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enriched_clubs_${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "CSV file is being downloaded",
      });
    } catch (err) {
      console.error('Error downloading CSV:', err);
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Failed to download CSV",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <CollapsibleCard
        header={
          <div className="p-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Enrichment Jobs
            </div>
          </div>
        }
        defaultOpen={false}
        contentClassName="p-6 pt-0"
      >
        <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
      </CollapsibleCard>
    );
  }

  return (
    <>
      <CollapsibleCard
        header={
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-primary" />
                Enrichment Jobs
              </div>
              <p className="text-sm text-muted-foreground mt-1">View and manage club enrichment jobs</p>
            </div>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); fetchJobs(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
        defaultOpen={false}
        contentClassName="p-6 pt-0"
      >
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No enrichment jobs yet. Start by enriching a club above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const progress = job.total_rows > 0 
                  ? (job.processed_rows / job.total_rows) * 100 
                  : 0;
                
                const isApiJob = job.id.startsWith('API_ENRICH_');
                
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {isApiJob && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">API</Badge>
                        )}
                        <span>{job.id.substring(0, 18)}...</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {job.processed_rows}/{job.total_rows}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>${job.estimated_cost_usd.toFixed(4)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(job.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedJobId(job.id)}
                          title="View Results"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadCsv(job.id)}
                          disabled={job.processed_rows === 0}
                          title="Download CSV"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CollapsibleCard>

      {selectedJobId && (
        <EnrichedClubsDialog
          jobId={selectedJobId}
          open={!!selectedJobId}
          onOpenChange={(open) => !open && setSelectedJobId(null)}
        />
      )}
    </>
  );
};

export default EnrichmentJobsTable;
