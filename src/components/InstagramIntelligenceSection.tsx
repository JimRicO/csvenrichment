import { useState } from "react";
import { Upload, FileText, AlertCircle, Instagram, Loader2, ExternalLink, CheckCircle2, Info, Database, Cpu, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

interface InstagramIntelligenceSectionProps {
  onJobCreated: (jobId: string, projectId: string) => void;
}

interface InstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  profilePicUrl: string;
  verified: boolean;
  url: string;
  externalUrl?: string;
  latestPosts?: Array<{
    url: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
    displayUrl: string;
  }>;
}

const InstagramIntelligenceSection = ({ onJobCreated }: InstagramIntelligenceSectionProps) => {
  // Single URL scraping state
  const [singleUrl, setSingleUrl] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);

  // CSV bulk processing state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data selection (all pre-selected)
  const [extractProfile, setExtractProfile] = useState(true);
  const [extractRelated, setExtractRelated] = useState(true);
  const [extractPosts, setExtractPosts] = useState(true);

  // Single URL scraping
  const handleSingleScrape = async () => {
    if (!singleUrl.trim()) {
      toast.error("Please enter an Instagram URL");
      return;
    }

    setSingleLoading(true);
    setProfile(null);

    try {
      const { data, error } = await supabase.functions.invoke('instagram-scraper', {
        body: { url: singleUrl.trim() }
      });

      if (error) throw error;

      if (data?.data) {
        setProfile(data.data);
        toast.success("Profile scraped successfully!");
      } else {
        toast.error("No profile data returned");
      }
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast.error(error.message || "Failed to scrape profile");
    } finally {
      setSingleLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
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
      complete: (results) => {
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
      startWorkerOrchestration(data.job_id);

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
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-foreground">Instagram Scraper</h3>
        <p className="text-sm text-muted-foreground">
          Scrape a single profile or bulk process from CSV
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
              <ul className="text-xs text-muted-foreground space-y-0.5 ml-6">
                <li>• Username, Full Name, Biography</li>
                <li>• Followers, Following, Posts Count</li>
                <li>• Verified Status & External URL</li>
                <li>• Related Profiles (competitors)</li>
                <li>• Latest Posts with Engagement</li>
              </ul>
            </div>

            <div className="border-t border-border" />

            {/* Profile Pictures Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Image className="h-4 w-4 text-primary" />
                Profile Picture Persistence
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Profile pictures are downloaded and stored permanently to prevent broken images from Instagram's expiring CDN links.
                </p>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Scraping Provider Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Cpu className="h-4 w-4 text-primary" />
                Scraping Provider
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-sm font-medium text-foreground">Apify</p>
                <p className="text-xs text-muted-foreground">
                  Instagram Profile Scraper actor with reliable data extraction and rate limit handling.
                </p>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Cost Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertCircle className="h-4 w-4 text-primary" />
                Pricing
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-sm font-medium text-foreground">$0.0027 / profile</p>
                <p className="text-xs text-muted-foreground">
                  Includes full profile data, related accounts, and latest posts with engagement metrics.
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
              placeholder="https://www.instagram.com/username"
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

          {/* Single Profile Result */}
          {profile && (
            <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-secondary/20">
              <div className="flex items-start gap-4">
                <img
                  src={(profile as any).profilePicStorageUrl || (profile as any).profilePicUrlHD || profile.profilePicUrl}
                  alt={`@${profile.username} profile picture`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">@{profile.username}</h3>
                    {profile.verified && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.fullName}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span><strong>{formatNumber(profile.postsCount)}</strong> posts</span>
                    <span><strong>{formatNumber(profile.followersCount)}</strong> followers</span>
                    <span><strong>{formatNumber(profile.followsCount)}</strong> following</span>
                  </div>
                </div>
              </div>

              {profile.biography && (
                <p className="text-sm whitespace-pre-wrap">{profile.biography}</p>
              )}

              {profile.externalUrl && (
                <a
                  href={profile.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {profile.externalUrl}
                </a>
              )}

              {profile.latestPosts && profile.latestPosts.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Recent Posts</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {profile.latestPosts.map((post, idx) => (
                      <a
                        key={idx}
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square overflow-hidden rounded-lg group"
                      >
                        <img
                          src={post.displayUrl}
                          alt={post.caption?.substring(0, 50) || 'Post'}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm">
                          <span>❤️ {formatNumber(post.likesCount)}</span>
                          <span>💬 {formatNumber(post.commentsCount)}</span>
                        </div>
                      </a>
                    ))}
                  </div>
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
          {isProcessing ? "Creating Job..." : !csvData ? "Upload CSV to Start Bulk Processing" : "Start Instagram Scraping 🚀"}
        </Button>
      </div>
    </CollapsibleCard>
  );
};

export default InstagramIntelligenceSection;