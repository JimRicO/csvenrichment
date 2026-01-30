import { usePeopleJobStatus } from "@/hooks/usePeopleJobStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";

interface ActivePeopleJobMonitorProps {
  jobId: string;
}

const ActivePeopleJobMonitor = ({ jobId }: ActivePeopleJobMonitorProps) => {
  const { jobStatus, isLoading, error } = usePeopleJobStatus(jobId);

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!jobStatus && isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading job status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!jobStatus) {
    return null;
  }

  const progress = jobStatus.total_rows > 0 
    ? (jobStatus.processed_rows / jobStatus.total_rows) * 100 
    : 0;

  const getStatusBadge = () => {
    switch (jobStatus.status) {
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

  const getConfidenceBadge = (score: string | null) => {
    switch (score) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Medium</Badge>;
      case 'low':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="neu-flat">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Active People Research Job
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{jobStatus.processed_rows} / {jobStatus.total_rows}</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-xl neu-pressed">
            <Clock className="h-4 w-4 text-yellow-400" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-semibold">{jobStatus.stats.pending}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl neu-pressed">
            <Users className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Processing</p>
              <p className="font-semibold">{jobStatus.stats.processing}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl neu-pressed">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="font-semibold">{jobStatus.stats.completed}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl neu-pressed">
            <XCircle className="h-4 w-4 text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="font-semibold">{jobStatus.stats.failed}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl neu-pressed">
          <DollarSign className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Estimated Cost</p>
            <p className="font-semibold">${jobStatus.estimated_cost_usd.toFixed(4)}</p>
          </div>
        </div>

        {jobStatus.recent_people.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recently Researched</p>
            <div className="flex flex-wrap gap-2">
              {jobStatus.recent_people.map((person) => (
                <div key={person.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg neu-subtle">
                  <span className="text-sm">{person.person_name}</span>
                  {person.job_title && (
                    <span className="text-xs text-muted-foreground">• {person.job_title}</span>
                  )}
                  {getConfidenceBadge(person.confidence_score)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivePeopleJobMonitor;
