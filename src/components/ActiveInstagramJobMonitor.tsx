import { CheckCircle2, Loader2, AlertCircle, Instagram, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useJobStatus } from "@/hooks/useJobStatus";

interface ActiveInstagramJobMonitorProps {
  jobId: string;
}

const ActiveInstagramJobMonitor = ({ jobId }: ActiveInstagramJobMonitorProps) => {
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
          <p className="text-foreground">Loading Instagram job status...</p>
        </div>
      </Card>
    );
  }

  const progress = (jobStatus.processed_rows / jobStatus.total_rows) * 100;
  const isComplete = jobStatus.status === 'completed';

  return (
    <Card className="p-8 gradient-card border-border/50 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/50">
            <Instagram className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">
              Instagram Scraping Progress
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate">Job ID: {jobId}</p>
          </div>
        </div>
        {isComplete ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 border border-success/50">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-sm font-medium text-success">Completed</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/50 animate-pulse">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">Scraping</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Profiles Processed</span>
          <span className="font-medium text-foreground">
            {jobStatus.processed_rows} / {jobStatus.total_rows}
          </span>
        </div>
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress.toFixed(1)}% complete</span>
          <span>{jobStatus.total_rows - jobStatus.processed_rows} remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Profiles Scraped</p>
          </div>
          <p className="text-2xl font-bold text-primary">{jobStatus.stats.completed_scrape}</p>
        </div>
        
        <div className="space-y-1 p-4 rounded-lg bg-accent/10 border border-accent/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <p className="text-xs text-muted-foreground">API Calls</p>
          </div>
          <p className="text-2xl font-bold text-accent">{jobStatus.total_pages_scraped}</p>
        </div>
        
        <div className="space-y-1 p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-foreground" />
            <p className="text-xs text-muted-foreground">Total Rows</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{jobStatus.total_rows}</p>
        </div>
        
        <div className="space-y-1 p-4 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-xs text-muted-foreground">Est. Cost</p>
          <p className="text-2xl font-bold text-warning">
            ${jobStatus.estimated_cost_usd.toFixed(4)}
          </p>
        </div>
      </div>

      {jobStatus.stats.failed_scrape > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive mb-1">Some profiles failed:</p>
            <p className="text-muted-foreground">
              {jobStatus.stats.failed_scrape} scraping failures (private accounts or errors)
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ActiveInstagramJobMonitor;
