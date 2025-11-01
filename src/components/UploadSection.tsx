import { useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
interface UploadSectionProps {
  onJobCreated: (jobId: string, projectId: string) => void;
}
const UploadSection = ({
  onJobCreated
}: UploadSectionProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extraction config
  const [extractBusiness, setExtractBusiness] = useState(true);
  const [extractTeam, setExtractTeam] = useState(true);
  const [extractSocial, setExtractSocial] = useState(true);
  const [extractWhatsApp, setExtractWhatsApp] = useState(true);
  const [customQuestion1, setCustomQuestion1] = useState("");
  const [customQuestion2, setCustomQuestion2] = useState("");
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    processFile(droppedFile);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };
  const processFile = (uploadedFile: File) => {
    // Check file extension (more reliable on mobile than MIME type)
    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }
    setFile(uploadedFile);

    // Parse CSV
    Papa.parse(uploadedFile, {
      header: true,
      complete: results => {
        setCsvData(results.data);
        toast.success(`File "${uploadedFile.name}" uploaded successfully - ${results.data.length} rows found`);
      },
      error: error => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      }
    });
  };
  const startWorkerOrchestration = async (jobId: string) => {
    // Call workers in parallel repeatedly until job is complete
    const checkAndRunWorkers = async () => {
      try {
        // Run both workers in parallel - they'll handle "no work" gracefully
        await Promise.all([supabase.functions.invoke('scraper-worker'), supabase.functions.invoke('extractor-worker')]);
      } catch (error) {
        console.error('Worker invocation error:', error);
      }
    };

    // Run workers immediately
    checkAndRunWorkers();

    // Then run every 5 seconds for up to 10 minutes
    const interval = setInterval(checkAndRunWorkers, 5000);

    // Stop after 10 minutes max (failsafe)
    setTimeout(() => clearInterval(interval), 600000);

    // Store interval ID in case we need to clear it
    return interval;
  };
  const handleCreateJob = async () => {
    if (!csvData || csvData.length === 0) {
      toast.error("Please upload a CSV file first");
      return;
    }

    // Validate at least one field is selected
    if (!extractBusiness && !extractTeam && !extractSocial && !extractWhatsApp) {
      toast.error("Please select at least one field to extract");
      return;
    }
    setIsProcessing(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-scraping-job', {
        body: {
          csv_rows: csvData,
          extraction_config: {
            business_description: extractBusiness,
            team_members: extractTeam,
            social_media: extractSocial,
            whatsapp_contact: extractWhatsApp,
            custom_question_1: customQuestion1 || null,
            custom_question_2: customQuestion2 || null
          }
        }
      });
      if (error) {
        throw error;
      }
      toast.success("Job created! Workers are processing your requests...");
      onJobCreated(data.job_id, data.project_id);

      // Start worker orchestration
      startWorkerOrchestration(data.job_id);

      // Reset form
      setFile(null);
      setCsvData(null);
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create job");
    } finally {
      setIsProcessing(false);
    }
  };
  return <Card className="p-8 gradient-card border-border/50">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Upload CSV File</h2>
          <p className="text-muted-foreground">
            CSV Enrichment with website URLs. System will search the website and extract the information of your choice.
          </p>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Make sure your table contains a WEBSITE field
          </p>
        </div>

        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`border-2 border-dashed rounded-xl p-8 transition-smooth text-center ${isDragging ? "border-primary bg-primary/5 glow-primary" : "border-border hover:border-primary/50 hover:bg-secondary/30"}`}>
          {file ? <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 border border-success/50">
                <FileText className="h-8 w-8 text-success" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {csvData?.length || 0} rows • {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button variant="outline" onClick={() => {
            setFile(null);
            setCsvData(null);
          }} className="transition-smooth hover:border-primary/50">
                Remove File
              </Button>
            </div> : <>
              <input type="file" accept=".csv,text/csv,application/csv,text/plain" onChange={handleFileInput} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/50 glow-primary">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      Drop your CSV file here
                    </p>
                    
                  </div>
                  <Button type="button" className="gradient-primary hover:opacity-90 transition-smooth pointer-events-none">
                    Select CSV File
                  </Button>
                </div>
              </label>
            </>}
        </div>

        {csvData && <>
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Select Data to Extract:</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="business" checked={extractBusiness} onCheckedChange={checked => setExtractBusiness(checked as boolean)} />
                  <Label htmlFor="business" className="text-sm cursor-pointer">
                    Business Description
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="team" checked={extractTeam} onCheckedChange={checked => setExtractTeam(checked as boolean)} />
                  <Label htmlFor="team" className="text-sm cursor-pointer">
                    Team Members
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="social" checked={extractSocial} onCheckedChange={checked => setExtractSocial(checked as boolean)} />
                  <Label htmlFor="social" className="text-sm cursor-pointer">
                    Social Media (Instagram, Facebook, LinkedIn, Twitter)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="whatsapp" checked={extractWhatsApp} onCheckedChange={checked => setExtractWhatsApp(checked as boolean)} />
                  <Label htmlFor="whatsapp" className="text-sm cursor-pointer">
                    WhatsApp Contact
                  </Label>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label htmlFor="custom1" className="text-sm">
                  Custom Question 1 (optional)
                </Label>
                <Input id="custom1" placeholder="e.g., What are their office hours?" value={customQuestion1} onChange={e => setCustomQuestion1(e.target.value)} className="bg-secondary/50 border-border" />
              </div>

              <div className="space-y-3">
                <Label htmlFor="custom2" className="text-sm">
                  Custom Question 2 (optional)
                </Label>
                <Input id="custom2" placeholder="e.g., Do they offer remote services?" value={customQuestion2} onChange={e => setCustomQuestion2(e.target.value)} className="bg-secondary/50 border-border" />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pipelined workers process scraping and extraction in parallel</li>
                  <li>Each website is scraped once, then analyzed by AI</li>
                  <li>Real-time progress tracking with per-row status</li>
                </ul>
              </div>
            </div>
          </>}

        <Button onClick={handleCreateJob} disabled={!csvData || isProcessing} className="w-full gradient-primary hover:opacity-90 transition-smooth disabled:opacity-50 glow-primary" size="lg">
          {isProcessing ? "Creating Job..." : "Let's Go! 🚀"}
        </Button>
      </div>
    </Card>;
};
export default UploadSection;