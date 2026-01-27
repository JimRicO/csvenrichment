import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Globe, Instagram, MapPin, Phone, Mail, Palette, Type, MessageSquare, Sparkles, Eye } from "lucide-react";

interface EnrichedClub {
  id: string;
  club_name: string;
  website_url: string | null;
  instagram_handle: string | null;
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
  created_at: string;
}

interface EnrichedClubsDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EnrichedClubsDialog = ({ jobId, open, onOpenChange }: EnrichedClubsDialogProps) => {
  const [clubs, setClubs] = useState<EnrichedClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<EnrichedClub | null>(null);

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
        const typedClubs = (data || []).map(club => ({
          ...club,
          color_palette: (club.color_palette as Record<string, string>) || {},
          fonts: (club.fonts as Record<string, string>) || {}
        })) as EnrichedClub[];
        
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
          {/* Club list sidebar */}
          <div className="w-64 border-r border-border/50 p-4">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : clubs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No enriched clubs yet
                </p>
              ) : (
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
              )}
            </ScrollArea>
          </div>

          {/* Club details */}
          <ScrollArea className="flex-1 p-6">
            {selectedClub ? (
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
                    <h2 className="text-2xl font-bold">{selectedClub.club_name}</h2>
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

                {/* Instagram section */}
                {selectedClub.instagram_handle && (
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
                      <div>
                        <p className="font-medium">{selectedClub.instagram_handle}</p>
                        {selectedClub.instagram_followers && (
                          <p className="text-sm text-muted-foreground">
                            {selectedClub.instagram_followers.toLocaleString()} followers
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedClub.instagram_bio && (
                      <p className="mt-3 text-sm text-muted-foreground">{selectedClub.instagram_bio}</p>
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
                    <div className="flex items-center gap-2 p-3 rounded-lg neu-subtle">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-sm">{selectedClub.phone}</span>
                    </div>
                  )}
                  {selectedClub.email && (
                    <div className="flex items-center gap-2 p-3 rounded-lg neu-subtle">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-sm">{selectedClub.email}</span>
                    </div>
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
