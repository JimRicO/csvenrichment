import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  User, Briefcase, GraduationCap, Mail, Phone, 
  Linkedin, Twitter, Link2, ChevronDown, Award, ExternalLink,
  Globe, MapPin, Calendar, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import PersonPhoto from "./person-intelligence/PersonPhoto";
import PersonNews from "./person-intelligence/PersonNews";
import PersonInsights from "./person-intelligence/PersonInsights";
import ResearchSummary from "./person-intelligence/ResearchSummary";

interface PreviousRole {
  title: string;
  company: string;
  years?: string;
}

interface Education {
  degree: string;
  institution: string;
  year?: string;
  field?: string;
}

interface NewsItem {
  headline: string;
  source: string;
  date: string;
  url: string;
}

interface EnrichedPerson {
  id: string;
  person_name: string;
  context: string | null;
  biography: string | null;
  biography_source: string | null;
  job_title: string | null;
  company: string | null;
  role_source: string | null;
  previous_roles: PreviousRole[];
  education: Education[];
  notable_achievements: string | null;
  achievements_source: string | null;
  email: string | null;
  email_source: string | null;
  phone: string | null;
  phone_source: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  other_socials: Record<string, string>;
  all_citations: string[];
  confidence_score: string | null;
  created_at: string;
  // New comprehensive fields
  aliases: string[];
  photo_url: string | null;
  department: string | null;
  start_date: string | null;
  reports_to: string | null;
  recent_news: NewsItem[];
  website: string | null;
  notable_content: string[];
  email_confidence: string | null;
  email_pattern: string | null;
  location: string | null;
  communication_style: string | null;
  key_interests: string[];
  conversation_starters: string[];
  quotes: string[];
  research_summary: string | null;
}

interface EnrichedPeopleDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SourceLink = ({ url }: { url: string | null }) => {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-primary hover:underline ml-2"
      title="View source"
    >
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};

const EnrichedPeopleDialog = ({ jobId, open, onOpenChange }: EnrichedPeopleDialogProps) => {
  const [people, setPeople] = useState<EnrichedPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<EnrichedPerson | null>(null);
  const [citationsOpen, setCitationsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchPeople = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('enriched_people')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Type cast with handling for new fields
        const typedPeople = (data || []).map(person => ({
          ...person,
          previous_roles: (Array.isArray(person.previous_roles) 
            ? person.previous_roles as unknown as PreviousRole[] 
            : []),
          education: (Array.isArray(person.education) 
            ? person.education as unknown as Education[] 
            : []),
          other_socials: (person.other_socials as Record<string, string>) || {},
          all_citations: (Array.isArray(person.all_citations) 
            ? person.all_citations as unknown as string[] 
            : []),
          // New fields
          aliases: (Array.isArray(person.aliases) 
            ? person.aliases as unknown as string[] 
            : []),
          recent_news: (Array.isArray(person.recent_news) 
            ? person.recent_news as unknown as NewsItem[] 
            : []),
          notable_content: (Array.isArray(person.notable_content) 
            ? person.notable_content as unknown as string[] 
            : []),
          key_interests: (Array.isArray(person.key_interests) 
            ? person.key_interests as unknown as string[] 
            : []),
          conversation_starters: (Array.isArray(person.conversation_starters) 
            ? person.conversation_starters as unknown as string[] 
            : []),
          quotes: (Array.isArray(person.quotes) 
            ? person.quotes as unknown as string[] 
            : [])
        })) as EnrichedPerson[];
        
        setPeople(typedPeople);
        if (typedPeople.length > 0) {
          setSelectedPerson(typedPeople[0]);
        }
      } catch (err) {
        console.error('Error fetching enriched people:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPeople();
  }, [jobId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Intelligence Dossiers
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[75vh]">
          {/* People list sidebar */}
          <div className="w-72 border-r border-border/50 p-4">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : people.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No enriched people yet
                </p>
              ) : (
                <div className="space-y-1">
                  {people.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      className={`w-full flex flex-col items-start p-3 rounded-lg text-left transition-all ${
                        selectedPerson?.id === person.id
                          ? 'neu-pressed'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-sm font-medium truncate w-full">{person.person_name}</span>
                      {person.job_title && (
                        <span className="text-xs text-muted-foreground truncate w-full">{person.job_title}</span>
                      )}
                      {person.company && (
                        <span className="text-xs text-muted-foreground/70 truncate w-full">{person.company}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Person details */}
          <ScrollArea className="flex-1 p-6">
            {selectedPerson ? (
              <div className="space-y-6">
                {/* Header with Photo */}
                <PersonPhoto 
                  name={selectedPerson.person_name}
                  photoUrl={selectedPerson.photo_url}
                  aliases={selectedPerson.aliases}
                />

                {/* Research Summary */}
                <ResearchSummary 
                  summary={selectedPerson.research_summary}
                  confidenceScore={selectedPerson.confidence_score}
                  sourcesCount={selectedPerson.all_citations?.length || 0}
                />

                {/* Current Role with enhanced info */}
                {(selectedPerson.job_title || selectedPerson.company) && (
                  <div className="p-4 rounded-xl neu-subtle space-y-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {selectedPerson.job_title}
                        {selectedPerson.job_title && selectedPerson.company && ' at '}
                        {selectedPerson.company}
                      </span>
                      <SourceLink url={selectedPerson.role_source} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {selectedPerson.department && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {selectedPerson.department}
                        </span>
                      )}
                      {selectedPerson.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Since {selectedPerson.start_date}
                        </span>
                      )}
                      {selectedPerson.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {selectedPerson.location}
                        </span>
                      )}
                    </div>
                    {selectedPerson.reports_to && (
                      <p className="text-xs text-muted-foreground">
                        Reports to: {selectedPerson.reports_to}
                      </p>
                    )}
                  </div>
                )}

                {selectedPerson.context && (
                  <p className="text-sm text-muted-foreground italic">Context: {selectedPerson.context}</p>
                )}

                {/* Biography */}
                {selectedPerson.biography && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Biography
                      <SourceLink url={selectedPerson.biography_source} />
                    </h3>
                    <div className="text-sm p-4 rounded-xl neu-pressed leading-relaxed whitespace-pre-wrap">
                      {selectedPerson.biography}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedPerson.email && (
                    <div className="flex items-center gap-2 p-3 rounded-lg neu-subtle">
                      <Mail className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{selectedPerson.email}</span>
                        {selectedPerson.email_confidence && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {selectedPerson.email_confidence.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <SourceLink url={selectedPerson.email_source} />
                    </div>
                  )}
                  {selectedPerson.phone && (
                    <div className="flex items-center gap-2 p-3 rounded-lg neu-subtle">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-sm">{selectedPerson.phone}</span>
                      <SourceLink url={selectedPerson.phone_source} />
                    </div>
                  )}
                  {selectedPerson.linkedin_url && (
                    <a
                      href={selectedPerson.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg neu-subtle hover:bg-primary/10 transition-colors"
                    >
                      <Linkedin className="h-4 w-4 text-primary" />
                      <span className="text-sm text-primary hover:underline">LinkedIn Profile</span>
                    </a>
                  )}
                  {selectedPerson.twitter_handle && (
                    <a
                      href={`https://twitter.com/${selectedPerson.twitter_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg neu-subtle hover:bg-primary/10 transition-colors"
                    >
                      <Twitter className="h-4 w-4 text-primary" />
                      <span className="text-sm text-primary hover:underline">{selectedPerson.twitter_handle}</span>
                    </a>
                  )}
                  {selectedPerson.website && (
                    <a
                      href={selectedPerson.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg neu-subtle hover:bg-primary/10 transition-colors"
                    >
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="text-sm text-primary hover:underline truncate">Personal Website</span>
                    </a>
                  )}
                </div>

                {/* Recent News */}
                <PersonNews news={selectedPerson.recent_news} />

                {/* Sales Insights */}
                <PersonInsights 
                  communicationStyle={selectedPerson.communication_style}
                  keyInterests={selectedPerson.key_interests}
                  conversationStarters={selectedPerson.conversation_starters}
                  quotes={selectedPerson.quotes}
                />

                {/* Previous Roles */}
                {selectedPerson.previous_roles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Career History
                    </h3>
                    <div className="space-y-2">
                      {selectedPerson.previous_roles.map((role, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg neu-subtle">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{role.title}</p>
                            <p className="text-xs text-muted-foreground">{role.company}</p>
                            {role.years && (
                              <p className="text-xs text-muted-foreground">{role.years}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {selectedPerson.education.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Education
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPerson.education.map((edu, idx) => (
                        <Badge key={idx} variant="secondary" className="py-1.5">
                          {edu.degree}{edu.field ? ` in ${edu.field}` : ''} - {edu.institution}
                          {edu.year && ` (${edu.year})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notable Achievements */}
                {selectedPerson.notable_achievements && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Notable Achievements
                      <SourceLink url={selectedPerson.achievements_source} />
                    </h3>
                    <p className="text-sm p-4 rounded-xl neu-pressed">{selectedPerson.notable_achievements}</p>
                  </div>
                )}

                {/* Notable Content (podcasts, talks, articles) */}
                {selectedPerson.notable_content && selectedPerson.notable_content.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Public Appearances & Content</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPerson.notable_content.slice(0, 5).map((content, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {content}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Socials */}
                {Object.keys(selectedPerson.other_socials).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Other Social Links</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedPerson.other_socials).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg neu-subtle text-sm hover:bg-primary/10 transition-colors"
                        >
                          {platform}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Citations - Collapsible */}
                {selectedPerson.all_citations.length > 0 && (
                  <Collapsible open={citationsOpen} onOpenChange={setCitationsOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:bg-muted/50 p-2 rounded-lg transition-colors">
                      <Link2 className="h-4 w-4 text-primary" />
                      Sources ({selectedPerson.all_citations.length})
                      <ChevronDown className={cn(
                        "h-4 w-4 ml-auto transition-transform",
                        citationsOpen && "rotate-180"
                      )} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 overflow-hidden">
                      <div className="space-y-1 p-3 rounded-xl neu-pressed max-w-full overflow-hidden">
                        {selectedPerson.all_citations.map((citation, idx) => (
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
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a person to view their intelligence dossier
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnrichedPeopleDialog;
