import { useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const UploadSection = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

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
    if (droppedFile?.type === "text/csv") {
      setFile(droppedFile);
      toast.success(`File "${droppedFile.name}" uploaded successfully`);
    } else {
      toast.error("Please upload a CSV file");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      toast.success(`File "${selectedFile.name}" uploaded successfully`);
    }
  };

  const handleCreateJob = () => {
    if (!file) {
      toast.error("Please upload a CSV file first");
      return;
    }
    toast.info("Job creation will be implemented with backend");
  };

  return (
    <Card className="p-8 gradient-card border-border/50">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Upload CSV File</h2>
          <p className="text-muted-foreground">
            Upload a CSV file with website URLs to start scraping and AI extraction
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 transition-smooth text-center ${
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
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setFile(null)}
                className="transition-smooth hover:border-primary/50"
              >
                Remove File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/50 glow-primary">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground mb-2">
                  Drop your CSV file here
                </p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button
                  asChild
                  className="gradient-primary hover:opacity-90 transition-smooth cursor-pointer"
                >
                  <span>Select CSV File</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">CSV Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Must contain a column with website URLs</li>
              <li>One URL per row</li>
              <li>Supported formats: http:// or https://</li>
            </ul>
          </div>
        </div>

        <Button
          onClick={handleCreateJob}
          disabled={!file}
          className="w-full gradient-primary hover:opacity-90 transition-smooth disabled:opacity-50 glow-primary"
          size="lg"
        >
          Create Scraping Job
        </Button>
      </div>
    </Card>
  );
};

export default UploadSection;
