import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useJobStatus } from "@/hooks/useJobStatus";

interface ActiveJobMonitorProps {
  jobId: string;
  projectId: string;
}

const ActiveJobMonitor = ({ jobId, projectId }: ActiveJobMonitorProps) => {
  const { jobStatus, isLoading, error } = useJobStatus(jobId);

  if (error) {
    return (
      <Card className="p-6 gradient-card border-destructive/50">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="font-semibold text-foreground">Error Loading Job Status</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!jobStatus) {
    return (
      <Card className="p-6 gradient-card border-border/50">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-foreground">Loading job status...</p>
        </div>
      </Card>
    );
  }

  const progress = (jobStatus.processed_rows / jobStatus.total_rows) * 100;
  const isComplete = jobStatus.status === 'completed';

  return (
    <Card className="p-8 gradient-card border-border/50 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Active Job: {projectId}</h2>
          <p className="text-sm text-muted-foreground">Job ID: {jobId}</p>
        </div>
        {isComplete ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 border border-success/50">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-sm font-medium text-success">Completed</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/50 animate-pulse">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">Processing</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">
            {jobStatus.processed_rows} / {jobStatus.total_rows} rows
          </span>
        </div>
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress.toFixed(1)}% complete</span>
          <span>{jobStatus.total_rows - jobStatus.processed_rows} remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Scraped</p>
          <p className="text-2xl font-bold text-primary">{jobStatus.stats.completed_scrape}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Extracted</p>
          <p className="text-2xl font-bold text-accent">{jobStatus.stats.completed_extraction}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Tokens Used</p>
          <p className="text-2xl font-bold text-foreground">
            {(jobStatus.total_input_tokens + jobStatus.total_output_tokens).toLocaleString()}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Est. Cost</p>
          <p className="text-2xl font-bold text-warning">
            ${jobStatus.estimated_cost_usd.toFixed(4)}
          </p>
        </div>
      </div>

      {(jobStatus.stats.failed_scrape > 0 || jobStatus.stats.failed_extraction > 0) && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive mb-1">Some rows failed:</p>
            <ul className="text-muted-foreground space-y-1">
              {jobStatus.stats.failed_scrape > 0 && (
                <li>{jobStatus.stats.failed_scrape} scraping failures</li>
              )}
              {jobStatus.stats.failed_extraction > 0 && (
                <li>{jobStatus.stats.failed_extraction} extraction failures</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ActiveJobMonitor;
