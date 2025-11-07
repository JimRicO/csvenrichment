import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { Upload } from "lucide-react";

interface MergeCsvDialogProps {
  jobId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MergeCsvDialog({ jobId, projectId, open, onOpenChange }: MergeCsvDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleMerge = async () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }

    try {
      setIsProcessing(true);

      // Read and parse CSV file
      const text = await file.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.error('CSV parse errors:', parsed.errors);
        toast.error('Failed to parse CSV file');
        return;
      }

      // Call merge function
      const { data, error } = await supabase.functions.invoke('merge-csv', {
        body: {
          job_id: jobId,
          original_csv_rows: parsed.data,
        },
      });

      if (error) throw error;

      // Download the merged CSV
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectId}_merged.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('CSV merged and downloaded successfully!');
      onOpenChange(false);
      setFile(null);
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Failed to merge CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge Original CSV with Enriched Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload your original CSV file to merge it with the enriched data from job <strong>{projectId}</strong>.
            The merged file will contain all original columns plus the new enriched fields.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="csv-file">Original CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                setFile(null);
              }} 
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleMerge} 
              disabled={isProcessing || !file}
              className="gradient-primary"
            >
              {isProcessing ? 'Merging...' : 'Download Merged CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
