import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ExternalLink, 
  Globe, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Building2,
  MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FaInstagram, FaFacebook, FaLinkedin, FaTwitter, FaYoutube, FaTiktok, FaWhatsapp } from "react-icons/fa";

interface WebsiteResultsDialogProps {
  jobId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ScrapedRow {
  id: string;
  website_url: string;
  business_description: string | null;
  team_members: string | null;
  social_media: Record<string, string> | null;
  whatsapp_contact: string | null;
  scrape_status: string;
  extraction_status: string;
}

const SocialMediaIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: FaInstagram,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  twitter: FaTwitter,
  youtube: FaYoutube,
  tiktok: FaTiktok,
};

export const WebsiteResultsDialog = ({ jobId, projectId, isOpen, onClose }: WebsiteResultsDialogProps) => {
  const [rows, setRows] = useState<ScrapedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalWebsites: 0,
    extractedCount: 0,
    peopleCount: 0,
    cost: 0
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, jobId]);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [rowsResult, peopleResult, jobResult] = await Promise.all([
      supabase
        .from('scraped_rows')
        .select('id, website_url, business_description, team_members, social_media, whatsapp_contact, scrape_status, extraction_status')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true }),
      supabase
        .from('people')
        .select('id')
        .eq('job_id', jobId),
      supabase
        .from('scraping_jobs')
        .select('estimated_cost_usd')
        .eq('id', jobId)
        .single()
    ]);

    if (rowsResult.error) {
      console.error('Error fetching scraped rows:', rowsResult.error);
      setIsLoading(false);
      return;
    }

    const rowsData = rowsResult.data as ScrapedRow[];
    setRows(rowsData);

    const extractedCount = rowsData.filter(r => r.extraction_status === 'completed').length;

    setSummary({
      totalWebsites: rowsData.length,
      extractedCount,
      peopleCount: peopleResult.data?.length || 0,
      cost: jobResult.data?.estimated_cost_usd || 0
    });

    setIsLoading(false);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-success" />;
    } else if (status === 'failed') {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  };

  const renderSocialMedia = (socialMedia: Record<string, string> | null) => {
    if (!socialMedia || Object.keys(socialMedia).length === 0) {
      return <span className="text-muted-foreground text-sm">-</span>;
    }

    return (
      <div className="flex gap-1 flex-wrap">
        {Object.entries(socialMedia).map(([platform, url]) => {
          if (!url) return null;
          const Icon = SocialMediaIcons[platform.toLowerCase()];
          if (!Icon) return null;
          
          return (
            <TooltipProvider key={platform}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{url}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Website Scraping Results - {projectId}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[75vh]">
            <div className="space-y-6 p-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Websites</p>
                  </div>
                  <p className="text-2xl font-bold">{summary.totalWebsites}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-accent" />
                    <p className="text-sm text-muted-foreground">Extracted</p>
                  </div>
                  <p className="text-2xl font-bold">{summary.extractedCount}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-secondary" />
                    <p className="text-sm text-muted-foreground">People Found</p>
                  </div>
                  <p className="text-2xl font-bold">{summary.peopleCount}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-warning" />
                    <p className="text-sm text-muted-foreground">Cost</p>
                  </div>
                  <p className="text-2xl font-bold">${summary.cost.toFixed(4)}</p>
                </Card>
              </div>

              {/* Data Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Website</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead>Team Members</TableHead>
                      <TableHead>Social Media</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium max-w-[180px]">
                          <a
                            href={row.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate block"
                          >
                            {row.website_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                          </a>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          {row.business_description ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm truncate cursor-help">
                                    {row.business_description.substring(0, 80)}...
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                  <p className="text-sm whitespace-pre-wrap">{row.business_description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          {row.team_members ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="cursor-help">
                                    <Users className="h-3 w-3 mr-1" />
                                    View
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                  <p className="text-sm whitespace-pre-wrap">{row.team_members}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderSocialMedia(row.social_media)}
                        </TableCell>
                        <TableCell>
                          {row.whatsapp_contact ? (
                            <a
                              href={`https://wa.me/${row.whatsapp_contact.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded bg-success/10 hover:bg-success/20 transition-colors inline-flex"
                            >
                              <FaWhatsapp className="h-4 w-4 text-success" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.extraction_status} />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(row.website_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
