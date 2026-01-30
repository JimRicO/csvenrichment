import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  User, Briefcase, GraduationCap, Mail, Phone, 
  Linkedin, Twitter, Link2, ChevronDown, Award, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviousRole {
  title: string;
  company: string;
  years?: string;
}

interface Education {
  degree: string;
  institution: string;
  year?: string;
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
        
        // Type cast the data with explicit handling
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

  const getConfidenceBadge = (score: string | null) => {
    switch (score) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">High Confidence</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium Confidence</Badge>;
      case 'low':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Low Confidence</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Enriched People
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* People list sidebar */}
          <div className="w-64 border-r border-border/50 p-4">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
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
                      className={`w-full flex flex-col items-start p-2 rounded-lg text-left transition-all ${
                        selectedPerson?.id === person.id
                          ? 'neu-pressed'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-sm font-medium truncate w-full">{person.person_name}</span>
                      {person.job_title && (
                        <span className="text-xs text-muted-foreground truncate w-full">{person.job_title}</span>
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
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold">{selectedPerson.person_name}</h2>
                    {getConfidenceBadge(selectedPerson.confidence_score)}
                  </div>
                  {(selectedPerson.job_title || selectedPerson.company) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span>
                        {selectedPerson.job_title}
                        {selectedPerson.job_title && selectedPerson.company && ' at '}
                        {selectedPerson.company}
                      </span>
                      <SourceLink url={selectedPerson.role_source} />
                    </div>
                  )}
                  {selectedPerson.context && (
                    <p className="text-sm text-muted-foreground italic">Context: {selectedPerson.context}</p>
                  )}
                </div>

                {/* Biography */}
                {selectedPerson.biography && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Biography
                      <SourceLink url={selectedPerson.biography_source} />
                    </h3>
                    <p className="text-sm p-4 rounded-xl neu-pressed leading-relaxed">
                      {selectedPerson.biography}
                    </p>
                  </div>
                )}

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedPerson.email && (
                    <div className="flex items-center gap-2 p-3 rounded-lg neu-subtle">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-sm">{selectedPerson.email}</span>
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
                </div>

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
                          {edu.degree} - {edu.institution}
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
                Select a person to view details
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnrichedPeopleDialog;
