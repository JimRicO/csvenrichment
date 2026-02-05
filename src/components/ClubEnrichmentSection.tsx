import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Upload, Loader2, Building2, Globe, Instagram, Wand2, Facebook, Twitter, Linkedin, Eye, RefreshCw } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import Papa from "papaparse";
import { Badge } from "@/components/ui/badge";

interface ClubEnrichmentSectionProps {
  onJobCreated: (jobId: string, projectId: string) => void;
}

interface CsvRow {
  club_name: string;
  website_url?: string;
  instagram_handle?: string;
}

const ClubEnrichmentSection = ({ onJobCreated }: ClubEnrichmentSectionProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Single club state
  const [clubName, setClubName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Bulk upload state
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Visual DNA state
  const [existingClubs, setExistingClubs] = useState<any[]>([]);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [analyzingClubId, setAnalyzingClubId] = useState<string | null>(null);

  const fetchExistingClubs = async () => {
    setIsLoadingClubs(true);
    try {
      const { data, error } = await supabase
        .from('enriched_clubs')
        .select('id, club_name, instagram_handle, invisibility_score, invisibility_category, visual_dna_analyzed_at')
        .not('instagram_handle', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExistingClubs(data || []);
    } catch (err) {
      console.error('Error fetching clubs:', err);
      toast({
        title: "Error",
        description: "Failed to load existing clubs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClubs(false);
    }
  };

  const handleAnalyzeVisualDna = async (clubId: string, clubName: string) => {
    setAnalyzingClubId(clubId);
    
    // Show initial toast
    toast({
      title: "Step 1/5: Scraping Instagram",
      description: `Fetching fresh posts for ${clubName}...`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('analyze-visual-dna', {
        body: { enriched_club_id: clubId },
      });

      if (error) throw error;

      // Success toast with full details
      toast({
        title: "✓ Visual DNA Complete",
        description: `${clubName}: ${data.invisibility_score}/100 (${data.invisibility_category}) • ${data.images_analyzed || 0} images analyzed in ${Math.round((data.processing_time_ms || 0) / 1000)}s`,
      });

      // Refresh the list
      await fetchExistingClubs();
    } catch (err) {
      console.error('Visual DNA error:', err);
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : "Failed to analyze visual DNA. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingClubId(null);
    }
  };

  const getScoreBadgeColor = (category: string | null) => {
    switch (category) {
      case 'Excellent': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Good': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Average': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Below Average': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Invisible': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSingleSubmit = async () => {
    if (!clubName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide the club name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-enrichment-job', {
        body: {
          club_name: clubName.trim(),
          website_url: websiteUrl.trim() || null,
          instagram_handle: instagramHandle.trim() || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Enrichment Started",
        description: `Job created for ${clubName}`,
      });

      onJobCreated(data.job_id, data.project_id);

      // Trigger worker
      await triggerWorker(data.job_id);

      // Clear form
      setClubName("");
      setWebsiteUrl("");
      setInstagramHandle("");
    } catch (err) {
      console.error('Error creating enrichment job:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start enrichment",
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
        const validRows = rows.filter(row => row.club_name);
        setCsvData(validRows);
        
        if (validRows.length === 0) {
          toast({
            title: "Invalid CSV",
            description: "No valid rows found. Ensure column: club_name (website_url and instagram_handle are optional)",
            variant: "destructive",
          });
        } else {
          const withWebsite = validRows.filter(r => r.website_url).length;
          toast({
            title: "CSV Loaded",
            description: `Found ${validRows.length} clubs (${withWebsite} with website URLs, others will be discovered)`,
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
      const { data, error } = await supabase.functions.invoke('create-enrichment-job', {
        body: { rows: csvData },
      });

      if (error) throw error;

      toast({
        title: "Bulk Enrichment Started",
        description: `Job created for ${csvData.length} clubs`,
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
      console.error('Error creating bulk enrichment job:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start bulk enrichment",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerWorker = async (jobId: string) => {
    try {
      await supabase.functions.invoke('enrichment-worker', {
        body: { job_id: jobId },
      });
    } catch (err) {
      console.error('Worker trigger error:', err);
    }
  };

  const triggerWorkerLoop = async (jobId: string, count: number) => {
    for (let i = 0; i < count; i++) {
      try {
        await supabase.functions.invoke('enrichment-worker', {
          body: { job_id: jobId },
        });
        // Small delay between worker calls
        await new Promise(resolve => setTimeout(resolve, 1000));
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
            <Sparkles className="h-5 w-5 text-primary" />
            Club Intelligence Enrichment
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Extract comprehensive brand identity, contact data, and AI-generated insights
          </p>
          {/* Discovery Feature Highlight */}
          <div className="flex items-center gap-2 mt-2 text-xs text-primary/80">
            <Wand2 className="h-3.5 w-3.5" />
            <span>Auto-discovers website, Instagram, Facebook, Twitter/X & LinkedIn from club name</span>
          </div>
        </div>
      }
      defaultOpen={false}
      contentClassName="p-6 pt-0"
    >
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="single">Single Club</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="visual-dna" onClick={fetchExistingClubs}>
            <Eye className="h-4 w-4 mr-1.5" />
            Visual DNA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          {/* Discovery info banner */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5 text-primary">
              <Globe className="h-4 w-4" />
              <Instagram className="h-4 w-4" />
              <Facebook className="h-4 w-4" />
              <Twitter className="h-4 w-4" />
              <Linkedin className="h-4 w-4" />
            </div>
            <span className="text-xs text-muted-foreground">
              Only club name is required — social profiles and website are discovered automatically via AI research
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="clubName" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Club Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clubName"
                placeholder="e.g., Fitness First"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                Website URL <span className="text-xs">(auto-discovered)</span>
              </Label>
              <Input
                id="websiteUrl"
                placeholder="Leave blank to auto-discover"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="border-dashed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagramHandle" className="flex items-center gap-2 text-muted-foreground">
                <Instagram className="h-4 w-4" />
                Instagram <span className="text-xs">(auto-discovered)</span>
              </Label>
              <Input
                id="instagramHandle"
                placeholder="Leave blank to auto-discover"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                className="border-dashed"
              />
            </div>
          </div>
          <Button 
            onClick={handleSingleSubmit} 
            disabled={isSubmitting || !clubName.trim()}
            className="w-full md:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Discovering & Enriching...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Enrich Club
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
                id="csvUpload"
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
                  {csvFileName} ({csvData.length} clubs)
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              CSV requires only <strong>club_name</strong> column. Optional columns: website_url, instagram_handle
            </p>

            {csvData.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Preview (first 5 rows)</p>
                <div className="rounded-lg neu-pressed p-3 max-h-40 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-1 px-2">Club Name</th>
                        <th className="text-left py-1 px-2">Website</th>
                        <th className="text-left py-1 px-2">Instagram</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b border-border/30">
                          <td className="py-1 px-2">{row.club_name}</td>
                          <td className="py-1 px-2 text-muted-foreground">{row.website_url}</td>
                          <td className="py-1 px-2 text-muted-foreground">{row.instagram_handle || '-'}</td>
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
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enrich {csvData.length} Clubs
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="visual-dna" className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              Run Visual DNA analysis on existing enriched clubs to generate Invisibility Scores and style matching
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchExistingClubs}
              disabled={isLoadingClubs}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingClubs ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoadingClubs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : existingClubs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No enriched clubs with Instagram handles found. Run enrichment first.
            </div>
          ) : (
            <div className="rounded-lg neu-pressed p-3 max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3">Club Name</th>
                    <th className="text-left py-2 px-3">Instagram</th>
                    <th className="text-left py-2 px-3">Score</th>
                    <th className="text-right py-2 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {existingClubs.map((club) => (
                    <tr key={club.id} className="border-b border-border/30">
                      <td className="py-2 px-3 font-medium">{club.club_name}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        @{club.instagram_handle?.replace('@', '')}
                      </td>
                      <td className="py-2 px-3">
                        {club.invisibility_score !== null ? (
                          <Badge className={`text-xs ${getScoreBadgeColor(club.invisibility_category)}`}>
                            {club.invisibility_score}/100 • {club.invisibility_category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not analyzed</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          size="sm"
                          variant={club.invisibility_score !== null ? "outline" : "default"}
                          onClick={() => handleAnalyzeVisualDna(club.id, club.club_name)}
                          disabled={analyzingClubId === club.id}
                        >
                          {analyzingClubId === club.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Scraping & Analyzing...
                            </>
                          ) : club.invisibility_score !== null ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Re-analyze
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Analyze
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </CollapsibleCard>
  );
};

export default ClubEnrichmentSection;
