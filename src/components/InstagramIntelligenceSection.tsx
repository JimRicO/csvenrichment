import { useState } from "react";
import { Upload, FileText, AlertCircle, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

interface InstagramIntelligenceSectionProps {
  onJobCreated: (jobId: string, projectId: string) => void;
}

const InstagramIntelligenceSection = ({ onJobCreated }: InstagramIntelligenceSectionProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data selection (all pre-selected)
  const [extractProfile, setExtractProfile] = useState(true);
  const [extractRelated, setExtractRelated] = useState(true);
  const [extractPosts, setExtractPosts] = useState(true);

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
    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      complete: (results) => {
        // Check if CSV has Instagram URL column
        const firstRow = results.data[0] as any;
        const hasInstagramColumn = firstRow && (
          'instagram_url' in firstRow || 
          'instagram' in firstRow || 
          'Instagram' in firstRow ||
          'INSTAGRAM' in firstRow
        );

        if (!hasInstagramColumn) {
          toast.error("CSV must contain an 'instagram_url' or 'instagram' column");
          setFile(null);
          setCsvData(null);
          return;
        }

        setCsvData(results.data);
        toast.success(`File "${uploadedFile.name}" uploaded - ${results.data.length} profiles found`);
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const startWorkerOrchestration = async (jobId: string) => {
    let interval: NodeJS.Timeout;
    
    const checkAndRunWorkers = async () => {
      try {
        await supabase.functions.invoke('instagram-worker');
      } catch (error) {
        console.error('Worker invocation error:', error);
      }
    };

    // Run immediately
    checkAndRunWorkers();

    // Then run every 5 seconds for up to 10 minutes
    interval = setInterval(checkAndRunWorkers, 5000);
    setTimeout(() => clearInterval(interval), 600000);

    return interval;
  };

  const handleCreateJob = async () => {
    if (!csvData || csvData.length === 0) {
      toast.error("Please upload a CSV file first");
      return;
    }

    if (!extractProfile && !extractRelated && !extractPosts) {
      toast.error("Please select at least one data type to extract");
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-instagram-job', {
        body: { csv_rows: csvData }
      });

      if (error) {
        throw error;
      }

      const rowsAdded = data.rows_added || 0;
      const duplicates = data.duplicates_skipped || 0;
      const estimatedCost = (rowsAdded * 0.0027).toFixed(4);

      toast.success(
        `Instagram job created! ${rowsAdded} profiles queued. ${duplicates > 0 ? `(${duplicates} duplicates skipped) ` : ''}Estimated cost: $${estimatedCost}`
      );
      
      onJobCreated(data.job_id, data.project_id);

      // Start worker orchestration
      startWorkerOrchestration(data.job_id);

      // Reset form
      setFile(null);
      setCsvData(null);
    } catch (error) {
      console.error('Error creating Instagram job:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create job");
    } finally {
      setIsProcessing(false);
    }
  };

  const profileCount = csvData?.length || 0;
  const estimatedCost = (profileCount * 0.0027).toFixed(4);

  const header = (
    <div className="flex items-center gap-3 p-6">
      <div className="p-2 rounded-lg bg-primary/10">
        <Instagram className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Instagram Intelligence Scraping</h3>
        <p className="text-sm text-muted-foreground">
          Extract profile data, competitive intelligence, and post performance metrics
        </p>
      </div>
    </div>
  );

  return (
    <CollapsibleCard header={header} defaultOpen={false} className="border-border/50">
      <div className="p-6 pt-0 space-y-6">

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 transition-smooth text-center ${
            isDragging
              ? "border-primary bg-primary/5 glow-primary"
              : "border-border hover:border-primary/50 hover:bg-secondary/30"
          }`}
        >
          {file ? (
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 border border-success/50">
                <FileText className="h-8 w-8 text-success" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {profileCount} profiles • {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setCsvData(null);
                }}
                className="transition-smooth hover:border-primary/50"
              >
                Remove File
              </Button>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="instagram-file-upload"
              />
              <label htmlFor="instagram-file-upload" className="cursor-pointer block">
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/50 glow-primary">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      Drop your Instagram CSV here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CSV must contain 'instagram_url' or 'instagram' column
                    </p>
                  </div>
                  <Button type="button" className="gradient-primary hover:opacity-90 transition-smooth pointer-events-none">
                    Select CSV File
                  </Button>
                </div>
              </label>
            </>
          )}
        </div>

        {csvData && (
          <>
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Data to Extract (pre-selected):</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="profile"
                    checked={extractProfile}
                    onCheckedChange={(checked) => setExtractProfile(checked as boolean)}
                  />
                  <Label htmlFor="profile" className="text-sm cursor-pointer">
                    Profile Header (followers, posts, bio, verification, etc.)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="related"
                    checked={extractRelated}
                    onCheckedChange={(checked) => setExtractRelated(checked as boolean)}
                  />
                  <Label htmlFor="related" className="text-sm cursor-pointer">
                    Related Profiles (competitive intelligence)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="posts"
                    checked={extractPosts}
                    onCheckedChange={(checked) => setExtractPosts(checked as boolean)}
                  />
                  <Label htmlFor="posts" className="text-sm cursor-pointer">
                    Latest Posts (performance data, captions, hashtags)
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Cost Estimate:</p>
                <p>{profileCount} profiles × $0.0027 per profile = <span className="font-bold text-primary">${estimatedCost}</span></p>
                <p className="mt-2 text-xs">Data includes: profile info, related accounts, and latest posts with engagement metrics</p>
              </div>
            </div>
          </>
        )}

        <Button
          onClick={handleCreateJob}
          disabled={!csvData || isProcessing}
          className="w-full gradient-primary hover:opacity-90 transition-smooth disabled:opacity-50 glow-primary"
          size="lg"
        >
          {isProcessing ? "Creating Job..." : !csvData ? "Upload CSV to Start" : "Start Instagram Scraping 🚀"}
        </Button>
      </div>
    </CollapsibleCard>
  );
};

export default InstagramIntelligenceSection;
