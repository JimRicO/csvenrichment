import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import VisualDNASection from "./VisualDNASection";
 import VisualDNACard from "./VisualDNACard";
import { 
  Building2, Globe, Instagram, MapPin, Phone, Mail, Palette, Type, 
  MessageSquare, Sparkles, Eye, User, Calendar, Activity, Link2, ChevronDown, Users,
  Facebook, Twitter, Linkedin, Loader2, Dna
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentActivity {
  title: string;
  date?: string;
  source?: string;
}

interface KeyPerson {
  name: string;
  role: string;
  context?: string;
}

interface VisualDNAData {
  color_palette?: string[];
  photography_style?: string;
  composition_patterns?: string[];
  branding_elements?: {
    logo_visible?: boolean;
    watermarks?: boolean;
    text_overlays?: boolean;
  };
  content_mix?: Record<string, number>;
  quality_assessment?: {
    image_quality?: string;
    consistency?: number;
    brand_coherence?: number;
  };
  filter_style?: string;
}

interface VoiceDNAData {
  tone?: string;
  average_length?: string;
  emoji_frequency?: string;
  common_emojis?: string[];
  hashtag_strategy?: {
    average_count?: number;
    branded_vs_generic?: string;
    placement?: string;
  };
  cta_patterns?: string[];
  languages?: string[];
  recurring_themes?: string[];
  signature_phrases?: string[];
}

interface CTLTMatchesData {
  matched_styles?: Array<{
    style_name: string;
    match_score: number;
    reason: string;
  }>;
  styles_to_avoid?: Array<{
    style_name: string;
    reason: string;
  }>;
  enhancement_suggestion?: string;
}

interface EnrichedClub {
  id: string;
  club_name: string;
  website_url: string | null;
  instagram_handle: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_handle: string | null;
  linkedin_url: string | null;
  logo_storage_url: string | null;
  instagram_followers: number | null;
  instagram_bio: string | null;
  instagram_profile_pic_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  color_palette: Record<string, string>;
  fonts: Record<string, string>;
  description: string | null;
  attitude: string | null;
  aesthetics: string | null;
  perplexity_description: string | null;
  founder_info: string | null;
  founding_year: string | null;
  recent_activities: RecentActivity[];
  perplexity_citations: string[];
  key_people: KeyPerson[];
  created_at: string;
  visual_dna: VisualDNAData | null;
  voice_dna: VoiceDNAData | null;
  ctlt_matches: CTLTMatchesData | null;
  invisibility_score: number | null;
  invisibility_category: string | null;
  visual_dna_analyzed_at: string | null;
}

interface EnrichedClubsDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EnrichedClubsDialog = ({ jobId, open, onOpenChange }: EnrichedClubsDialogProps) => {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<EnrichedClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<EnrichedClub | null>(null);
  const [citationsOpen, setCitationsOpen] = useState(false);
  const [analyzingClubId, setAnalyzingClubId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchClubs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('enriched_clubs')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Type cast the data with explicit handling
        const typedClubs = (data || []).map(club => {
          return {
            ...club,
            color_palette: (club.color_palette as Record<string, string>) || {},
            fonts: (club.fonts as Record<string, string>) || {},
            recent_activities: (Array.isArray(club.recent_activities) 
              ? club.recent_activities as unknown as RecentActivity[] 
              : []),
            perplexity_citations: (Array.isArray(club.perplexity_citations) 
              ? club.perplexity_citations as unknown as string[] 
              : []),
            key_people: (Array.isArray(club.key_people) 
              ? club.key_people as unknown as KeyPerson[] 
              : []),
            visual_dna: club.visual_dna as VisualDNAData | null,
            voice_dna: club.voice_dna as VoiceDNAData | null,
            ctlt_matches: club.ctlt_matches as CTLTMatchesData | null,
            invisibility_score: club.invisibility_score,
            invisibility_category: club.invisibility_category,
            visual_dna_analyzed_at: club.visual_dna_analyzed_at,
          };
        }) as EnrichedClub[];
        
        setClubs(typedClubs);
        if (typedClubs.length > 0) {
          setSelectedClub(typedClubs[0]);
        }
      } catch (err) {
        console.error('Error fetching enriched clubs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubs();
  }, [jobId, open]);

  const handleAnalyzeVisualDNA = async (club: EnrichedClub) => {
    if (!club.instagram_handle) {
      toast({
        title: "No Instagram Handle",
        description: "This club doesn't have an Instagram handle to analyze.",
        variant: "destructive",
      });
      return;
    }

    setAnalyzingClubId(club.id);

    try {
      // Create visual_dna_jobs entry
      const jobId = `vdna_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const { error: jobError } = await supabase
        .from('visual_dna_jobs')
        .insert({
          id: jobId,
          status: 'processing',
          total_clubs: 1,
          processed_clubs: 0,
          failed_clubs: 0
        });

      if (jobError) {
        console.error('Failed to create visual_dna_jobs entry:', jobError);
      }

      // Create visual_dna_rows entry
      const { data: rowData, error: rowError } = await supabase
        .from('visual_dna_rows')
        .insert({
          job_id: jobId,
          enriched_club_id: club.id,
          club_name: club.club_name,
          status: 'processing'
        })
        .select('id')
        .single();

      if (rowError) {
        console.error('Failed to create visual_dna_rows entry:', rowError);
      }

      // Call the analyze-visual-dna edge function
      const { data, error } = await supabase.functions.invoke('analyze-visual-dna', {
        body: { 
          enriched_club_id: club.id,
          visual_dna_row_id: rowData?.id
        }
      });

      if (error) throw error;

      // Update job status
      await supabase
        .from('visual_dna_jobs')
        .update({ 
          status: 'completed', 
          processed_clubs: 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Refresh club data
      const { data: updatedClub } = await supabase
        .from('enriched_clubs')
        .select('*')
        .eq('id', club.id)
        .single();

      if (updatedClub) {
        const typedClub = {
          ...updatedClub,
          color_palette: (updatedClub.color_palette as Record<string, string>) || {},
          fonts: (updatedClub.fonts as Record<string, string>) || {},
          recent_activities: (Array.isArray(updatedClub.recent_activities) 
            ? updatedClub.recent_activities as unknown as RecentActivity[] 
            : []),
          perplexity_citations: (Array.isArray(updatedClub.perplexity_citations) 
            ? updatedClub.perplexity_citations as unknown as string[] 
            : []),
          key_people: (Array.isArray(updatedClub.key_people) 
            ? updatedClub.key_people as unknown as KeyPerson[] 
            : []),
          visual_dna: updatedClub.visual_dna as VisualDNAData | null,
          voice_dna: updatedClub.voice_dna as VoiceDNAData | null,
          ctlt_matches: updatedClub.ctlt_matches as CTLTMatchesData | null,
          invisibility_score: updatedClub.invisibility_score,
          invisibility_category: updatedClub.invisibility_category,
          visual_dna_analyzed_at: updatedClub.visual_dna_analyzed_at,
        } as EnrichedClub;

        setClubs(prev => prev.map(c => c.id === club.id ? typedClub : c));
        setSelectedClub(typedClub);
      }

      toast({
        title: "Visual DNA Analysis Complete",
        description: `Score: ${data.invisibility_score} (${data.invisibility_category}) • ${data.posts_analyzed} posts analyzed`,
      });

    } catch (err) {
      console.error('Visual DNA analysis failed:', err);
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : "Failed to analyze Visual DNA",
        variant: "destructive",
      });
    } finally {
      setAnalyzingClubId(null);
    }
  };

  const ColorSwatch = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2">
      <div 
        className="w-6 h-6 rounded border border-border/50"
        style={{ backgroundColor: color }}
      />
      <div className="text-xs">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-mono">{color}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enriched Clubs
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* Club list sidebar - only show when multiple clubs */}
          {!isLoading && clubs.length > 1 && (
            <div className="w-64 border-r border-border/50 p-4">
              <ScrollArea className="h-full">
                <div className="space-y-1">
                  {clubs.map((club) => (
                    <button
                      key={club.id}
                      onClick={() => setSelectedClub(club)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                        selectedClub?.id === club.id
                          ? 'neu-pressed'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {club.logo_storage_url ? (
                        <img
                          src={club.logo_storage_url}
                          alt={club.club_name}
                          className="w-8 h-8 rounded object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium truncate">{club.club_name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Club details */}
          <ScrollArea className="flex-1 p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="space-y-4 w-full max-w-md">
                  <Skeleton className="h-20 w-20 rounded-xl" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            ) : clubs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No enriched clubs yet
              </div>
            ) : selectedClub ? (
              <div className="space-y-6">
                {/* Header with logo */}
                <div className="flex items-start gap-4">
                  {selectedClub.logo_storage_url ? (
                    <img
                      src={selectedClub.logo_storage_url}
                      alt={selectedClub.club_name}
                      className="w-20 h-20 rounded-xl object-contain neu-pressed p-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl neu-pressed flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold">{selectedClub.club_name}</h2>
                      {selectedClub.founding_year && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Est. {selectedClub.founding_year}
                        </Badge>
                      )}
                      {selectedClub.invisibility_score !== null && (
                        <Badge 
                          className={cn(
                            "flex items-center gap-1",
                            selectedClub.invisibility_category?.toLowerCase() === 'excellent' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            selectedClub.invisibility_category?.toLowerCase() === 'strong' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            selectedClub.invisibility_category?.toLowerCase() === 'average' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            selectedClub.invisibility_category?.toLowerCase() === 'struggling' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-red-500/20 text-red-400 border-red-500/30'
                          )}
                        >
                          <Dna className="h-3 w-3" />
                          {selectedClub.invisibility_score}
                        </Badge>
                      )}
                    </div>
                    {selectedClub.website_url && (
                      <a 
                        href={selectedClub.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        {selectedClub.website_url}
                      </a>
                    )}
                  </div>
                </div>

                {/* Instagram section - show if handle OR url exists */}
                {(selectedClub.instagram_handle || selectedClub.instagram_url) && (
                  <div className="p-4 rounded-xl neu-pressed">
                    <div className="flex items-center gap-3">
                      {selectedClub.instagram_profile_pic_url ? (
                        <img
                          src={selectedClub.instagram_profile_pic_url}
                          alt="Instagram"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                          <Instagram className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {selectedClub.instagram_handle ? (
                          <p className="font-medium">{selectedClub.instagram_handle}</p>
                        ) : selectedClub.instagram_url ? (
                          <a 
                            href={selectedClub.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline truncate block"
                          >
                            {selectedClub.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}
                          </a>
                        ) : null}
                        {selectedClub.instagram_followers && (
                          <p className="text-sm text-muted-foreground">
                            {selectedClub.instagram_followers.toLocaleString()} followers
                          </p>
                        )}
                      </div>
                      {selectedClub.instagram_url && !selectedClub.instagram_handle && (
                        <Badge variant="outline" className="text-xs">Discovered</Badge>
                      )}
                    </div>
                    {selectedClub.instagram_bio && (
                      <p className="mt-3 text-sm text-muted-foreground">{selectedClub.instagram_bio}</p>
                    )}
                  </div>
                )}

                {/* Social Media Links */}
                {(selectedClub.facebook_url || selectedClub.twitter_handle || selectedClub.linkedin_url) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedClub.facebook_url && (
                      <a
                        href={selectedClub.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg neu-subtle hover:bg-primary/10 transition-colors"
                      >
                        <Facebook className="h-4 w-4 text-[#1877F2]" />
                        <span className="text-sm">Facebook</span>
                      </a>
                    )}
                    {selectedClub.twitter_handle && (
                      <a
                        href={selectedClub.twitter_handle.startsWith('http') 
                          ? selectedClub.twitter_handle 
                          : `https://x.com/${selectedClub.twitter_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg neu-subtle hover:bg-primary/10 transition-colors"
                      >
                        <Twitter className="h-4 w-4 text-foreground" />
                        <span className="text-sm">
                          {selectedClub.twitter_handle.startsWith('http') 
                            ? 'X / Twitter' 
                            : selectedClub.twitter_handle}
                        </span>
                      </a>
                    )}
                    {selectedClub.linkedin_url && (
                      <a
                        href={selectedClub.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg neu-subtle hover:bg-primary/10 transition-colors"
                      >
                        <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                        <span className="text-sm">LinkedIn</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Contact info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedClub.address && (
                    <div className="flex items-center gap-2 p-3 rounded-lg neu-subtle">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm">{selectedClub.address}</span>
                    </div>
                  )}
                  {selectedClub.phone && (
                    <a href={`tel:${selectedClub.phone}`} className="flex items-center gap-2 p-3 rounded-lg neu-subtle hover:bg-primary/10 transition-colors">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-sm">{selectedClub.phone}</span>
                    </a>
                  )}
                  {selectedClub.email && (
                    <a href={`mailto:${selectedClub.email}`} className="flex items-center gap-2 p-3 rounded-lg neu-subtle hover:bg-primary/10 transition-colors">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-sm">{selectedClub.email}</span>
                    </a>
                  )}
                </div>

                {/* Color palette */}
                {Object.keys(selectedClub.color_palette).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Color Palette
                    </h3>
                    <div className="flex flex-wrap gap-4 p-4 rounded-xl neu-pressed">
                      {Object.entries(selectedClub.color_palette).map(([key, value]) => (
                        <ColorSwatch key={key} label={key} color={value} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Fonts */}
                {selectedClub.fonts && Object.keys(selectedClub.fonts).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Type className="h-4 w-4 text-primary" />
                      Typography
                    </h3>
                    <div className="p-4 rounded-xl neu-pressed">
                      <div className="flex flex-wrap gap-4">
                        {selectedClub.fonts.primary && (
                          <Badge variant="secondary">Primary: {selectedClub.fonts.primary}</Badge>
                        )}
                        {selectedClub.fonts.heading && (
                          <Badge variant="secondary">Heading: {selectedClub.fonts.heading}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                <div className="space-y-4">
                  {selectedClub.description && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Description
                      </h3>
                      <p className="text-sm p-4 rounded-xl neu-pressed">{selectedClub.description}</p>
                    </div>
                  )}

                  {selectedClub.attitude && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Attitude
                      </h3>
                      <p className="text-sm p-4 rounded-xl neu-pressed">{selectedClub.attitude}</p>
                    </div>
                  )}

                  {selectedClub.aesthetics && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Aesthetics
                      </h3>
                      <p className="text-sm p-4 rounded-xl neu-pressed">{selectedClub.aesthetics}</p>
                    </div>
                  )}
                </div>

                {/* === PERPLEXITY RESEARCH === */}
                {/* Perplexity Description */}
                {selectedClub.perplexity_description && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-sm leading-relaxed">{selectedClub.perplexity_description}</p>
                  </div>
                )}

                {/* Founder Info */}
                {selectedClub.founder_info && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Founder & Background
                    </h3>
                    <p className="text-sm p-4 rounded-xl neu-pressed">{selectedClub.founder_info}</p>
                  </div>
                )}

                {/* Key People */}
                {selectedClub.key_people && selectedClub.key_people.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Key People
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedClub.key_people.map((person, idx) => (
                        <div key={idx} className="p-3 rounded-lg neu-subtle">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{person.name}</p>
                              <p className="text-xs text-primary">{person.role}</p>
                            </div>
                          </div>
                          {person.context && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{person.context}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activities */}
                {selectedClub.recent_activities && selectedClub.recent_activities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Recent Activities
                    </h3>
                    <div className="space-y-2">
                      {selectedClub.recent_activities.map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg neu-subtle">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{activity.title}</p>
                            {activity.date && (
                              <p className="text-xs text-muted-foreground mt-0.5">{activity.date}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Citations - Collapsible */}
                {selectedClub.perplexity_citations && selectedClub.perplexity_citations.length > 0 && (
                  <Collapsible open={citationsOpen} onOpenChange={setCitationsOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:bg-muted/50 p-2 rounded-lg transition-colors">
                      <Link2 className="h-4 w-4 text-primary" />
                      Sources ({selectedClub.perplexity_citations.length})
                      <ChevronDown className={cn(
                        "h-4 w-4 ml-auto transition-transform",
                        citationsOpen && "rotate-180"
                      )} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 overflow-hidden">
                      <div className="space-y-1 p-3 rounded-xl neu-pressed max-w-full overflow-hidden">
                        {selectedClub.perplexity_citations.map((citation, idx) => (
                          <a
                            key={idx}
                            href={citation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-primary hover:underline break-all"
                          >
                            {citation}
                          </a>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Visual DNA Section */}
                 {/* Show full VisualDNACard when data exists, otherwise show VisualDNASection with empty state/analyze button */}
                 {selectedClub.visual_dna || selectedClub.voice_dna || selectedClub.invisibility_score !== null ? (
                   <div className="space-y-2">
                     <h3 className="text-sm font-medium flex items-center gap-2">
                       <Dna className="h-4 w-4 text-primary" />
                       Visual DNA Analysis
                     </h3>
                     <VisualDNACard
                       visualDna={selectedClub.visual_dna}
                       voiceDna={selectedClub.voice_dna}
                       ctltMatches={selectedClub.ctlt_matches}
                       invisibilityScore={selectedClub.invisibility_score}
                       invisibilityCategory={selectedClub.invisibility_category}
                       analyzedAt={selectedClub.visual_dna_analyzed_at}
                     />
                   </div>
                 ) : (
                   <VisualDNASection
                     visualDna={null}
                     voiceDna={null}
                     ctltMatches={null}
                     invisibilityScore={null}
                     invisibilityCategory={null}
                     analyzedAt={null}
                     showEmptyState={true}
                     instagramHandle={selectedClub.instagram_handle}
                     onAnalyze={() => handleAnalyzeVisualDNA(selectedClub)}
                     isAnalyzing={analyzingClubId === selectedClub.id}
                   />
                 )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a club to view details
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnrichedClubsDialog;
