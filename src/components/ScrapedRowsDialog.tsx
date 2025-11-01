import { useEffect, useState } from "react";
import { Users, Loader2, AlertCircle, CheckCircle2, ExternalLink, UserPlus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  job_id: string;
}

interface Person {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  website_url: string | null;
  source: string;
  scraped_row_id: string;
}

interface ScrapedRowsDialogProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PeopleSearchStatusBadge = ({ status, peopleCount }: { status: string; peopleCount: number }) => {
  const configs = {
    not_started: { icon: Users, label: "Not Started", className: "bg-muted text-muted-foreground" },
    processing: { icon: Loader2, label: "Searching...", className: "bg-primary/20 text-primary animate-pulse" },
    completed: { icon: CheckCircle2, label: "Found", className: "bg-success/20 text-success" },
    completed_no_people: { icon: AlertCircle, label: "No person found", className: "bg-destructive/20 text-destructive" },
    failed: { icon: AlertCircle, label: "Failed", className: "bg-destructive/20 text-destructive" },
    no_team_page_found: { icon: AlertCircle, label: "No Team Page", className: "bg-warning/20 text-warning" },
  };

  // If status is completed but no people found, use special state
  let effectiveStatus = status;
  if (status === 'completed' && peopleCount === 0) {
    effectiveStatus = 'completed_no_people';
  }

  const config = configs[effectiveStatus as keyof typeof configs] || configs.not_started;
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
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [addingPersonRowId, setAddingPersonRowId] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonTitle, setNewPersonTitle] = useState("");
  const [newPersonDescription, setNewPersonDescription] = useState("");

  const fetchRows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('scraped_rows')
      .select('id, website_url, scrape_status, extraction_status, people_search_status, team_page_url, detailed_team_members, people_search_error, business_description, team_members, job_id')
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

  const fetchPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching people:', error);
    } else {
      setPeople((data || []) as Person[]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRows();
      fetchPeople();

      // Set up realtime subscription for scraped rows
      const rowsChannel = supabase
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

      // Set up realtime subscription for people
      const peopleChannel = supabase
        .channel(`people-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'people',
            filter: `job_id=eq.${jobId}`
          },
          () => {
            fetchPeople();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(rowsChannel);
        supabase.removeChannel(peopleChannel);
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
        const peopleCount = data.people_count || 0;
        if (peopleCount > 0) {
          toast.success(`Found ${peopleCount} team ${peopleCount === 1 ? 'member' : 'members'}!`);
        } else {
          toast.info('Team page found, but no people were extracted');
        }
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

  const handleAddPerson = async (row: ScrapedRow) => {
    if (!newPersonName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    const { error } = await supabase.from('people').insert({
      job_id: row.job_id,
      scraped_row_id: row.id,
      name: newPersonName.trim(),
      title: newPersonTitle.trim() || null,
      website_url: row.website_url,
      source: 'manual'
    });

    if (error) {
      console.error('Error adding person:', error);
      toast.error('Failed to add person');
      return;
    }

    toast.success('Person added successfully');
    setAddingPersonRowId(null);
    setNewPersonName('');
    setNewPersonTitle('');
  };

  const handleDeletePerson = async (personId: string) => {
    const { error } = await supabase.from('people').delete().eq('id', personId);

    if (error) {
      console.error('Error deleting person:', error);
      toast.error('Failed to delete person');
      return;
    }

    toast.success('Person deleted successfully');
  };

  const getRowPeople = (rowId: string) => people.filter(p => p.scraped_row_id === rowId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Scraped Websites & People</DialogTitle>
          <DialogDescription>
            View scraped data, find team members, and manage your contact database
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
                  <TableHead>Saved People</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const rowPeople = getRowPeople(row.id);
                  return (
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
                            <PeopleSearchStatusBadge status={row.people_search_status} peopleCount={rowPeople.length} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rowPeople.length} {rowPeople.length === 1 ? 'person' : 'people'}
                            </Badge>
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
                              <CollapsibleTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  {expandedRowId === row.id ? 'Hide' : 'View'} Details
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/50 p-6">
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
                                
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-sm text-muted-foreground">
                                      Saved People ({rowPeople.length}):
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setAddingPersonRowId(addingPersonRowId === row.id ? null : row.id)}
                                    >
                                      <UserPlus className="h-4 w-4 mr-2" />
                                      Add Person
                                    </Button>
                                  </div>

                                  {addingPersonRowId === row.id && (
                                    <div className="bg-background p-4 rounded-md border border-border mb-3 space-y-3">
                                      <div>
                                        <Label htmlFor="name">Name *</Label>
                                        <Input
                                          id="name"
                                          value={newPersonName}
                                          onChange={(e) => setNewPersonName(e.target.value)}
                                          placeholder="John Doe"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                          id="title"
                                          value={newPersonTitle}
                                          onChange={(e) => setNewPersonTitle(e.target.value)}
                                          placeholder="CEO"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                          id="description"
                                          value={newPersonDescription}
                                          onChange={(e) => setNewPersonDescription(e.target.value)}
                                          placeholder="Brief bio or description"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleAddPerson(row)}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setAddingPersonRowId(null);
                                            setNewPersonName('');
                                            setNewPersonTitle('');
                                            setNewPersonDescription('');
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {rowPeople.length > 0 ? (
                                    <div className="grid gap-2">
                                      {rowPeople.map((person) => (
                                        <div
                                          key={person.id}
                                          className="flex items-start justify-between bg-background p-3 rounded-md border border-border"
                                        >
                                          <div className="flex-1">
                                            <div className="font-medium">{person.name}</div>
                                            {person.title && (
                                              <div className="text-sm text-muted-foreground">{person.title}</div>
                                            )}
                                            {person.description && (
                                              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {person.description}
                                              </div>
                                            )}
                                            <Badge variant="secondary" className="text-xs mt-1">
                                              {person.source === 'automated' ? 'Auto-discovered' : 'Manually added'}
                                            </Badge>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeletePerson(person.id)}
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground text-center p-4 border border-dashed border-border rounded-md">
                                      No people saved yet. Click "Find People" to discover team members automatically, or "Add Person" to add manually.
                                    </div>
                                  )}
                                </div>

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

                        {row.people_search_status === 'failed' && row.people_search_error && (
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={6} className="bg-destructive/5 p-4">
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ScrapedRowsDialog;