import { useEffect, useState } from "react";
import { Users, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ScrapedRow {
  id: string;
  website_url: string;
  scrape_status: string;
  extraction_status: string;
  people_search_status: string;
  team_page_url: string | null;
  detailed_team_members: string | null;
  people_search_error: string | null;
  business_description: string | null;
  team_members: string | null;
}

interface ScrapedRowsDialogProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PeopleSearchStatusBadge = ({ status }: { status: string }) => {
  const configs = {
    not_started: { icon: Users, label: "Not Started", className: "bg-muted text-muted-foreground" },
    processing: { icon: Loader2, label: "Searching...", className: "bg-primary/20 text-primary animate-pulse" },
    completed: { icon: CheckCircle2, label: "Found", className: "bg-success/20 text-success" },
    failed: { icon: AlertCircle, label: "Failed", className: "bg-destructive/20 text-destructive" },
    no_team_page_found: { icon: AlertCircle, label: "No Team Page", className: "bg-warning/20 text-warning" },
  };

  const config = configs[status as keyof typeof configs] || configs.not_started;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} border-0`}>
      <Icon className={`h-3 w-3 mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
};

const ScrapedRowsDialog = ({ jobId, isOpen, onClose }: ScrapedRowsDialogProps) => {
  const [rows, setRows] = useState<ScrapedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const fetchRows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('scraped_rows')
      .select('id, website_url, scrape_status, extraction_status, people_search_status, team_page_url, detailed_team_members, people_search_error, business_description, team_members')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching rows:', error);
      toast.error('Failed to load rows');
    } else {
      setRows((data || []) as ScrapedRow[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchRows();

      // Set up realtime subscription for people search updates
      const channel = supabase
        .channel(`scraped-rows-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'scraped_rows',
            filter: `job_id=eq.${jobId}`
          },
          () => {
            fetchRows();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, jobId]);

  const handleFindPeople = async (rowId: string) => {
    setProcessingRowId(rowId);
    try {
      const { data, error } = await supabase.functions.invoke('find-people-worker', {
        body: { row_id: rowId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Team members found!');
        setExpandedRowId(rowId); // Auto-expand to show results
      } else {
        toast.info(data.message || 'No team page found');
      }
    } catch (error) {
      console.error('Find people error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to find people');
    } finally {
      setProcessingRowId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Scraped Websites</DialogTitle>
          <DialogDescription>
            View scraped data and find detailed team information
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              No scraped rows found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Scrape</TableHead>
                  <TableHead>Extract</TableHead>
                  <TableHead>People Search</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <Collapsible
                    key={row.id}
                    open={expandedRowId === row.id}
                    onOpenChange={(open) => setExpandedRowId(open ? row.id : null)}
                    asChild
                  >
                    <>
                      <TableRow className="border-border">
                        <TableCell className="font-medium max-w-[300px]">
                          <a 
                            href={row.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {row.website_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.scrape_status === 'completed' ? 'default' : 'secondary'}>
                            {row.scrape_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.extraction_status === 'completed' ? 'default' : 'secondary'}>
                            {row.extraction_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <PeopleSearchStatusBadge status={row.people_search_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {row.scrape_status === 'completed' && row.people_search_status !== 'processing' && (
                              <Button
                                size="sm"
                                variant={row.people_search_status === 'completed' ? 'outline' : 'default'}
                                onClick={() => handleFindPeople(row.id)}
                                disabled={processingRowId === row.id}
                              >
                                {processingRowId === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Users className="h-4 w-4 mr-2" />
                                )}
                                {row.people_search_status === 'completed' ? 'Refresh' : 'Find People'}
                              </Button>
                            )}
                            {row.people_search_status === 'completed' && (
                              <CollapsibleTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  {expandedRowId === row.id ? 'Hide' : 'View'} Details
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {row.people_search_status === 'completed' && (
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/50 p-6">
                              <div className="space-y-4">
                                {row.team_page_url && (
                                  <div>
                                    <div className="font-semibold text-sm text-muted-foreground mb-1">Team Page:</div>
                                    <a 
                                      href={row.team_page_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      {row.team_page_url}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                )}
                                
                                {row.detailed_team_members && (
                                  <div>
                                    <div className="font-semibold text-sm text-muted-foreground mb-2">Team Members:</div>
                                    <div className="bg-background p-4 rounded-md border border-border whitespace-pre-wrap text-sm">
                                      {row.detailed_team_members}
                                    </div>
                                  </div>
                                )}

                                {row.business_description && (
                                  <div>
                                    <div className="font-semibold text-sm text-muted-foreground mb-2">Business Description:</div>
                                    <div className="text-sm">{row.business_description}</div>
                                  </div>
                                )}

                                {row.team_members && (
                                  <div>
                                    <div className="font-semibold text-sm text-muted-foreground mb-2">Basic Team Info:</div>
                                    <div className="text-sm">{row.team_members}</div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      )}

                      {row.people_search_status === 'failed' && row.people_search_error && (
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={5} className="bg-destructive/5 p-4">
                              <div className="flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                Error: {row.people_search_error}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      )}
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ScrapedRowsDialog;
