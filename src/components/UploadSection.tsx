import { useState } from "react";
import { Upload, FileText, AlertCircle, Globe, Loader2, ExternalLink, Building2, Users, Share2, MessageCircle, Info, Database, Cpu, Sparkles, Phone, Mail, MapPin, Clock, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

interface UploadSectionProps {
  onJobCreated: (jobId: string, projectId: string) => void;
}

interface ClubLocation {
  name: string | null;
  address: string | null;
  phone: string | null;
  hours: string | null;
}

interface ScrapedResult {
  website_url: string;
  business_description?: string;
  team_members?: string;
  social_media?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    twitter?: string;
  };
  whatsapp_contact?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  opening_hours?: string;
  number_of_clubs?: number;
  number_of_courts?: number;
  facilities_details?: string;
  club_locations?: ClubLocation[];
  custom_answer_1?: string;
  custom_answer_2?: string;
}

const UploadSection = ({ onJobCreated }: UploadSectionProps) => {
  // Single URL scraping state
  const [singleUrl, setSingleUrl] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [scrapedResult, setScrapedResult] = useState<ScrapedResult | null>(null);

  // CSV bulk processing state
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

  // Single URL scraping
  const handleSingleScrape = async () => {
    if (!singleUrl.trim()) {
      toast.error("Please enter a website URL");
      return;
    }

    setSingleLoading(true);
    setScrapedResult(null);

    try {
      // Create a single-row job and wait for completion
      const { data, error } = await supabase.functions.invoke('create-scraping-job', {
        body: {
          csv_rows: [{ website: singleUrl.trim() }],
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

      if (error) throw error;

      const jobId = data.job_id;
      toast.info("Scraping website...");

      // Trigger workers
      await Promise.all([
        supabase.functions.invoke('scraper-worker'),
        supabase.functions.invoke('extractor-worker')
      ]);

      // Poll for completion (max 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      
      const pollForResult = async (): Promise<ScrapedResult | null> => {
        while (attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Trigger workers again
          await Promise.all([
            supabase.functions.invoke('scraper-worker'),
            supabase.functions.invoke('extractor-worker')
          ]);

          // Check if row is completed
          const { data: rows } = await supabase
            .from('scraped_rows')
            .select('*')
            .eq('job_id', jobId)
            .limit(1);

          if (rows && rows.length > 0) {
            const row = rows[0];
            if (row.extraction_status === 'completed') {
              return {
                website_url: row.website_url,
                business_description: row.business_description,
                team_members: row.team_members,
                social_media: row.social_media as ScrapedResult['social_media'],
                whatsapp_contact: row.whatsapp_contact,
                phone_number: row.phone_number,
                email: row.email,
                address: row.address,
                opening_hours: row.opening_hours,
                number_of_clubs: row.number_of_clubs,
                number_of_courts: row.number_of_courts,
                facilities_details: row.facilities_details,
                club_locations: (Array.isArray(row.club_locations) ? row.club_locations : []) as unknown as ClubLocation[],
                custom_answer_1: row.custom_answer_1,
                custom_answer_2: row.custom_answer_2
              };
            } else if (row.extraction_status === 'failed' || row.scrape_status === 'failed') {
              throw new Error(row.extraction_error_message || row.scrape_error_message || 'Scraping failed');
            }
          }
        }
        throw new Error('Timeout waiting for results');
      };

      const result = await pollForResult();
      if (result) {
        setScrapedResult(result);
        toast.success("Website scraped successfully!");
      }
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast.error(error.message || "Failed to scrape website");
    } finally {
      setSingleLoading(false);
    }
  };

  // CSV handling
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
    let interval: NodeJS.Timeout;

    const checkAndRunWorkers = async () => {
      try {
        const { data: jobStatus } = await supabase.functions.invoke('get-job-status', {
          body: { job_id: jobId }
        });
        if (jobStatus && jobStatus.status === 'completed') {
          console.log('Job completed, stopping worker orchestration');
          if (interval) clearInterval(interval);
          return;
        }

        await Promise.all([
          supabase.functions.invoke('scraper-worker'),
          supabase.functions.invoke('extractor-worker')
        ]);
      } catch (error) {
        console.error('Worker invocation error:', error);
      }
    };

    checkAndRunWorkers();
    interval = setInterval(checkAndRunWorkers, 5000);
    setTimeout(() => clearInterval(interval), 600000);

    return interval;
  };

  const handleCreateJob = async () => {
    if (!csvData || csvData.length === 0) {
      toast.error("Please upload a CSV file first");
      return;
    }

    if (!extractBusiness && !extractTeam && !extractSocial && !extractWhatsApp) {
      toast.error("Please select at least one field to extract");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-scraping-job', {
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

      if (error) throw error;
      
      toast.success("Job created! Workers are processing your requests...");
      onJobCreated(data.job_id, data.project_id);
      startWorkerOrchestration(data.job_id);

      setFile(null);
      setCsvData(null);
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create job");
    } finally {
      setIsProcessing(false);
    }
  };

  const header = (
    <div className="flex items-center gap-3 p-6">
      <div className="p-2 rounded-lg bg-primary/10">
        <Globe className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-foreground">Website Scraper</h3>
        <p className="text-sm text-muted-foreground">
          Scrape a single website or bulk process from CSV
        </p>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            aria-label="Module information"
          >
            <Info className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80" 
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            {/* Data Extracted Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Database className="h-4 w-4 text-primary" />
                Data Extracted
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Business Description</li>
                <li>• Team Members</li>
                <li>• Phone Number, Email, Address</li>
                <li>• Opening Hours</li>
                <li>• Social Media (Instagram, Facebook, LinkedIn, Twitter)</li>
                <li>• WhatsApp Contact</li>
                <li>• Number of Clubs/Locations, Courts</li>
                <li>• Facilities Details</li>
                <li>• Custom Questions (up to 2)</li>
              </ul>
            </div>

            <div className="border-t border-border" />

            {/* Scraping Provider Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Cpu className="h-4 w-4 text-primary" />
                Scraping Provider
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-sm font-medium text-foreground">Firecrawl</p>
                <p className="text-xs text-muted-foreground">
                  AI-powered web scraper that handles JavaScript-rendered pages. Captures both Markdown and HTML formats.
                </p>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* AI Model Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Extraction Model
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-sm font-medium text-foreground">Claude 3.5 Haiku</p>
                <p className="text-xs text-muted-foreground">
                  Anthropic's fast model optimized for structured data extraction with excellent cost efficiency.
                </p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <CollapsibleCard header={header} defaultOpen={false} className="border-border/50">
      <div className="p-6 pt-0 space-y-6">

        {/* Single URL Scraping */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={singleUrl}
              onChange={(e) => setSingleUrl(e.target.value)}
              disabled={singleLoading}
            />
            <Button onClick={handleSingleScrape} disabled={singleLoading}>
              {singleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Scraping...
                </>
              ) : (
                "Scrape"
              )}
            </Button>
          </div>

          {/* Single Scrape Result */}
          {scrapedResult && (
            <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-secondary/20">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <a
                  href={scrapedResult.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  {scrapedResult.website_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {scrapedResult.business_description && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Business Description
                  </div>
                  <p className="text-sm">{scrapedResult.business_description}</p>
                </div>
              )}

              {scrapedResult.team_members && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Team Members
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{scrapedResult.team_members}</p>
                </div>
              )}

              {scrapedResult.social_media && Object.keys(scrapedResult.social_media).length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Share2 className="h-4 w-4" />
                    Social Media
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(scrapedResult.social_media).map(([platform, url]) => (
                      url && (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          {platform}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {scrapedResult.whatsapp_contact && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </div>
                  <p className="text-sm">{scrapedResult.whatsapp_contact}</p>
                </div>
              )}

              {/* Contact Information */}
              {(scrapedResult.phone_number || scrapedResult.email || scrapedResult.address || scrapedResult.opening_hours) && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="text-sm font-medium text-muted-foreground">Contact Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {scrapedResult.phone_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <a href={`tel:${scrapedResult.phone_number}`} className="text-sm text-primary hover:underline">
                          {scrapedResult.phone_number}
                        </a>
                      </div>
                    )}
                    {scrapedResult.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <a href={`mailto:${scrapedResult.email}`} className="text-sm text-primary hover:underline">
                          {scrapedResult.email}
                        </a>
                      </div>
                    )}
                    {scrapedResult.address && (
                      <div className="flex items-start gap-2 col-span-full">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm">{scrapedResult.address}</p>
                      </div>
                    )}
                    {scrapedResult.opening_hours && (
                      <div className="flex items-start gap-2 col-span-full">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm">{scrapedResult.opening_hours}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Facility Information */}
              {(scrapedResult.number_of_clubs || scrapedResult.number_of_courts || scrapedResult.facilities_details) && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="text-sm font-medium text-muted-foreground">Facility Information</div>
                  <div className="flex flex-wrap gap-3">
                    {scrapedResult.number_of_clubs && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{scrapedResult.number_of_clubs} Location{scrapedResult.number_of_clubs > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {scrapedResult.number_of_courts && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{scrapedResult.number_of_courts} Court{scrapedResult.number_of_courts > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  {scrapedResult.facilities_details && (
                    <div className="flex items-start gap-2">
                      <List className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{scrapedResult.facilities_details}</p>
                    </div>
                  )}
                  {/* Club/Location Details */}
                  {scrapedResult.club_locations && scrapedResult.club_locations.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-sm font-medium text-muted-foreground">Location Details</div>
                      <div className="grid gap-2">
                        {scrapedResult.club_locations.map((loc, idx) => (
                          <div key={idx} className="p-2 rounded-md bg-secondary/30 border border-border/50 text-sm">
                            {loc.name && <p className="font-medium">{loc.name}</p>}
                            {loc.address && (
                              <div className="flex items-start gap-1.5 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>{loc.address}</span>
                              </div>
                            )}
                            {loc.phone && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span>{loc.phone}</span>
                              </div>
                            )}
                            {loc.hours && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span>{loc.hours}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {scrapedResult.custom_answer_1 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Custom Answer 1</div>
                  <p className="text-sm">{scrapedResult.custom_answer_1}</p>
                </div>
              )}

              {scrapedResult.custom_answer_2 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Custom Answer 2</div>
                  <p className="text-sm">{scrapedResult.custom_answer_2}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or bulk process</span>
          </div>
        </div>

        {/* CSV Upload Zone */}
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
                  {csvData?.length || 0} rows • {(file.size / 1024).toFixed(2)} KB
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
                accept=".csv,text/csv,application/csv,text/plain"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/50 glow-primary">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      Drop your CSV file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CSV must contain a 'website' column
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
                <Input
                  id="custom1"
                  placeholder="e.g., What are their office hours?"
                  value={customQuestion1}
                  onChange={e => setCustomQuestion1(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="custom2" className="text-sm">
                  Custom Question 2 (optional)
                </Label>
                <Input
                  id="custom2"
                  placeholder="e.g., Do they offer remote services?"
                  value={customQuestion2}
                  onChange={e => setCustomQuestion2(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
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
          </>
        )}

        <Button
          onClick={handleCreateJob}
          disabled={!csvData || isProcessing}
          className="w-full gradient-primary hover:opacity-90 transition-smooth disabled:opacity-50 glow-primary"
          size="lg"
        >
          {isProcessing ? "Creating Job..." : !csvData ? "Upload CSV to Start Bulk Processing" : "Let's Go! 🚀"}
        </Button>
      </div>
    </CollapsibleCard>
  );
};

export default UploadSection;