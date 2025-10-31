import { Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockJobs = [
  {
    id: "job-001",
    project_id: "demo-project",
    status: "processing",
    total_rows: 150,
    processed_rows: 87,
    total_pages_scraped: 87,
    estimated_cost_usd: 2.45,
    created_at: "2025-01-15T10:30:00Z",
  },
  {
    id: "job-002",
    project_id: "test-websites",
    status: "completed",
    total_rows: 50,
    processed_rows: 50,
    total_pages_scraped: 50,
    estimated_cost_usd: 1.20,
    created_at: "2025-01-15T09:15:00Z",
  },
];

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
  return (
    <Card className="gradient-card border-border/50 overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-bold text-foreground">Recent Jobs</h2>
        <p className="text-muted-foreground mt-1">Track your scraping and extraction progress</p>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Project ID</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Progress</TableHead>
              <TableHead className="text-muted-foreground">Pages</TableHead>
              <TableHead className="text-muted-foreground">Cost</TableHead>
              <TableHead className="text-muted-foreground">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockJobs.map((job) => (
              <TableRow
                key={job.id}
                className="border-border hover:bg-secondary/50 transition-smooth cursor-pointer"
              >
                <TableCell className="font-medium text-foreground">
                  {job.project_id}
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
                  ${job.estimated_cost_usd.toFixed(2)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default JobsTable;
