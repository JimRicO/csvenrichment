import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Upload, Loader2, User, FileText } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import Papa from "papaparse";

interface PeopleIntelligenceSectionProps {
  onJobCreated: (jobId: string, projectId: string) => void;
}

interface CsvRow {
  person_name: string;
  context?: string;
}

const PeopleIntelligenceSection = ({ onJobCreated }: PeopleIntelligenceSectionProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Single person state
  const [personName, setPersonName] = useState("");
  const [context, setContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Bulk upload state
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSingleSubmit = async () => {
    if (!personName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide the person's name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-people-job', {
        body: {
          person_name: personName.trim(),
          context: context.trim() || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Research Started",
        description: `Job created for ${personName}`,
      });

      onJobCreated(data.job_id, data.project_id);

      // Trigger worker
      await triggerWorker(data.job_id);

      // Clear form
      setPersonName("");
      setContext("");
    } catch (err) {
      console.error('Error creating people job:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start research",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as CsvRow[];
        const validRows = rows.filter(row => row.person_name && row.person_name.trim() !== '');
        setCsvData(validRows);
        
        if (validRows.length === 0) {
          toast({
            title: "Invalid CSV",
            description: "No valid rows found. Ensure column: person_name (required), context (optional)",
            variant: "destructive",
          });
        } else {
          toast({
            title: "CSV Loaded",
            description: `Found ${validRows.length} people ready for research`,
          });
        }
      },
      error: (error) => {
        toast({
          title: "CSV Parse Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkSubmit = async () => {
    if (csvData.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-people-job', {
        body: { rows: csvData },
      });

      if (error) throw error;

      toast({
        title: "Bulk Research Started",
        description: `Job created for ${csvData.length} people`,
      });

      onJobCreated(data.job_id, data.project_id);

      // Trigger worker for each row (sequentially to avoid rate limits)
      await triggerWorkerLoop(data.job_id, csvData.length);

      // Clear form
      setCsvData([]);
      setCsvFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error('Error creating bulk people job:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start bulk research",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerWorker = async (jobId: string) => {
    try {
      await supabase.functions.invoke('people-worker', {
        body: { job_id: jobId },
      });
    } catch (err) {
      console.error('Worker trigger error:', err);
    }
  };

  const triggerWorkerLoop = async (jobId: string, count: number) => {
    for (let i = 0; i < count; i++) {
      try {
        await supabase.functions.invoke('people-worker', {
          body: { job_id: jobId },
        });
        // Small delay between worker calls
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(`Worker trigger error for row ${i}:`, err);
      }
    }
  };

  return (
    <CollapsibleCard
      header={
        <div className="p-6">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-primary" />
            People Intelligence
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Research individuals using AI-powered web search with source verification
          </p>
        </div>
      }
      defaultOpen={false}
      contentClassName="p-6 pt-0"
    >
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="single">Single Person</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="personName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Person Name *
              </Label>
              <Input
                id="personName"
                placeholder="e.g., John Smith"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="context" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Context (optional)
              </Label>
              <Input
                id="context"
                placeholder="e.g., CEO of Acme Corp, based in NYC"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Context helps narrow the search. Include company, title, location, or other identifying details.
          </p>
          <Button 
            onClick={handleSingleSubmit} 
            disabled={isSubmitting || !personName.trim()}
            className="w-full md:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Research Person
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                id="csvUploadPeople"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              {csvFileName && (
                <span className="text-sm text-muted-foreground">
                  {csvFileName} ({csvData.length} people)
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              CSV columns: <code>person_name</code> (required), <code>context</code> (optional)
            </p>

            {csvData.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Preview (first 5 rows)</p>
                <div className="rounded-lg neu-pressed p-3 max-h-40 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-1 px-2">Person Name</th>
                        <th className="text-left py-1 px-2">Context</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b border-border/30">
                          <td className="py-1 px-2">{row.person_name}</td>
                          <td className="py-1 px-2 text-muted-foreground">{row.context || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button 
              onClick={handleBulkSubmit} 
              disabled={isUploading || csvData.length === 0}
              className="w-full md:w-auto"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Research {csvData.length} People
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </CollapsibleCard>
  );
};

export default PeopleIntelligenceSection;
