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
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  LayoutGrid,
  List
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

interface ClubLocation {
  name: string | null;
  address: string | null;
  phone: string | null;
  hours: string | null;
}

interface ScrapedRow {
  id: string;
  website_url: string;
  business_description: string | null;
  team_members: string | null;
  social_media: Record<string, string> | null;
  whatsapp_contact: string | null;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  opening_hours: string | null;
  number_of_clubs: number | null;
  number_of_courts: number | null;
  facilities_details: string | null;
  club_locations: ClubLocation[] | null;
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
        .select('id, website_url, business_description, team_members, social_media, whatsapp_contact, phone_number, email, address, opening_hours, number_of_clubs, number_of_courts, facilities_details, club_locations, scrape_status, extraction_status')
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

    const rowsData = (rowsResult.data || []).map(row => ({
      ...row,
      club_locations: (Array.isArray(row.club_locations) ? row.club_locations : []) as unknown as ClubLocation[]
    })) as ScrapedRow[];
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
                      <TableHead>Contact</TableHead>
                      <TableHead>Facilities</TableHead>
                      <TableHead>Social Media</TableHead>
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
                        <TableCell>
                          <div className="flex gap-1">
                            {row.phone_number && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`tel:${row.phone_number}`}
                                      className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                                    >
                                      <Phone className="h-4 w-4 text-primary" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{row.phone_number}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {row.email && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`mailto:${row.email}`}
                                      className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                                    >
                                      <Mail className="h-4 w-4 text-primary" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{row.email}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {row.whatsapp_contact && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`https://wa.me/${row.whatsapp_contact.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded bg-success/10 hover:bg-success/20 transition-colors"
                                    >
                                      <FaWhatsapp className="h-4 w-4 text-success" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{row.whatsapp_contact}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {row.address && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="p-1.5 rounded bg-muted/50 cursor-help">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{row.address}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {row.opening_hours && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="p-1.5 rounded bg-muted/50 cursor-help">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{row.opening_hours}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {!row.phone_number && !row.email && !row.whatsapp_contact && !row.address && !row.opening_hours && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 items-center">
                            {row.number_of_clubs && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-pointer">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      {row.number_of_clubs}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md p-3">
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold">{row.number_of_clubs} Location{row.number_of_clubs > 1 ? 's' : ''}</p>
                                      {row.club_locations && row.club_locations.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                          {row.club_locations.map((loc, idx) => (
                                            <div key={idx} className="text-xs border-l-2 border-primary/50 pl-2">
                                              {loc.name && <p className="font-medium">{loc.name}</p>}
                                              {loc.address && <p className="text-muted-foreground">{loc.address}</p>}
                                              {loc.phone && <p className="text-muted-foreground">📞 {loc.phone}</p>}
                                              {loc.hours && <p className="text-muted-foreground">🕐 {loc.hours}</p>}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">No detailed location info available</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {row.number_of_courts && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-help">
                                      <LayoutGrid className="h-3 w-3 mr-1" />
                                      {row.number_of_courts}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{row.number_of_courts} court{row.number_of_courts > 1 ? 's' : ''}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {row.facilities_details && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-help">
                                      <List className="h-3 w-3 mr-1" />
                                      View
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{row.facilities_details}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {!row.number_of_clubs && !row.number_of_courts && !row.facilities_details && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderSocialMedia(row.social_media)}
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
