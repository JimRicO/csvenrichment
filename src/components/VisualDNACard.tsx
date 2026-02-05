 import { Badge } from "@/components/ui/badge";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
 import { 
   ChevronDown, Eye, Mic2, Lightbulb, Camera, Palette, BarChart3, Hash, 
   MessageSquare, Gauge, Star, CheckCircle, XCircle, AlertTriangle, Code, 
   Languages, Sparkles, Volume2, Type, Image
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { useState } from "react";
 import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
 
 interface VisualDNA {
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
 
 interface VoiceDNA {
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
 
 interface CTLTMatches {
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
 
 interface VisualDNACardProps {
   visualDna: VisualDNA | null;
   voiceDna: VoiceDNA | null;
   ctltMatches: CTLTMatches | null;
   invisibilityScore: number | null;
   invisibilityCategory: string | null;
   analyzedAt: string | null;
   postsAnalyzed?: number;
  /** URLs of the images that were analyzed (for the media gallery) */
  mediaUrls?: string[];
  /** Score breakdown factors from the analysis */
  scoreFactors?: {
    posting_frequency?: { value: string; score: number; weight: number };
    content_quality?: { value: string; score: number; weight: number };
    brand_consistency?: { value: string; score: number; weight: number };
    engagement_rate?: { value: string; score: number; weight: number };
    caption_effort?: { value: string; score: number; weight: number };
  } | null;
 }
 
 const getCategoryColor = (category: string | null) => {
   switch (category?.toLowerCase()) {
     case 'excellent': return { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
     case 'strong': return { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400 border-green-500/30' };
     case 'average': return { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
     case 'struggling': return { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
     case 'invisible': return { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400 border-red-500/30' };
     default: return { bg: 'bg-muted', border: 'border-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' };
   }
 };
 
 const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
   <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground border-b border-border/50 pb-2 mb-3">
     <Icon className="h-4 w-4 text-primary" />
     {title}
   </h4>
 );
 
 const ScoreFactorRow = ({ 
   label, 
   value, 
   score, 
   weight,
   maxScore = 100 
 }: { 
   label: string; 
   value: string; 
   score: number; 
   weight: string;
   maxScore?: number;
 }) => (
   <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
     <div className="flex items-center gap-2">
       <span className="text-sm text-foreground">{label}</span>
       <span className="text-xs text-muted-foreground">({weight})</span>
     </div>
     <div className="flex items-center gap-3">
       <span className="text-sm text-muted-foreground">{value}</span>
       <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
         <div 
           className="h-full bg-primary rounded-full transition-all"
           style={{ width: `${(score / maxScore) * 100}%` }}
         />
       </div>
       <span className="text-xs font-mono text-muted-foreground w-8">{score}</span>
     </div>
   </div>
 );
 
 const ContentMixChart = ({ mix }: { mix: Record<string, number> }) => {
   const colors: Record<string, string> = {
     action: '#ef4444',
     lifestyle: '#3b82f6',
     events: '#a855f7',
     coaching: '#22c55e',
     facility: '#eab308',
     community: '#ec4899',
     promotional: '#f97316',
   };
 
   const entries = Object.entries(mix)
     .filter(([_, value]) => value > 0)
     .sort((a, b) => b[1] - a[1]);
 
   const total = entries.reduce((sum, [_, val]) => sum + val, 0);
 
   return (
     <div className="space-y-3">
       {/* Stacked bar */}
       <div className="h-6 w-full rounded-lg overflow-hidden flex bg-muted">
         {entries.map(([key, value]) => (
           <TooltipProvider key={key}>
             <Tooltip>
               <TooltipTrigger asChild>
                 <div 
                   className="h-full transition-all hover:opacity-80 cursor-pointer"
                   style={{ 
                     width: `${(value / total) * 100}%`,
                     backgroundColor: colors[key] || '#6b7280'
                   }}
                 />
               </TooltipTrigger>
               <TooltipContent>
                 <p className="capitalize">{key}: {value}%</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         ))}
       </div>
       
       {/* Legend */}
       <div className="flex flex-wrap gap-3">
         {entries.map(([key, value]) => (
           <div key={key} className="flex items-center gap-1.5">
             <div 
               className="w-3 h-3 rounded-sm"
               style={{ backgroundColor: colors[key] || '#6b7280' }}
             />
             <span className="text-xs capitalize text-muted-foreground">{key}</span>
             <span className="text-xs font-medium">{value}%</span>
           </div>
         ))}
       </div>
     </div>
   );
 };
 
 const VisualDNACard = ({
   visualDna,
   voiceDna,
   ctltMatches,
   invisibilityScore,
   invisibilityCategory,
   analyzedAt,
  postsAnalyzed,
  mediaUrls,
  scoreFactors
 }: VisualDNACardProps) => {
   const [showRawData, setShowRawData] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
   
   const categoryColors = getCategoryColor(invisibilityCategory);
 
   const formatDate = (dateStr: string | null) => {
     if (!dateStr) return null;
     return new Date(dateStr).toLocaleDateString('en-US', {
       month: 'long',
       day: 'numeric',
       year: 'numeric'
     });
   };
 
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    if (mediaUrls && mediaUrls.length > 0) {
      setLightboxIndex((prev) => (prev + 1) % mediaUrls.length);
    }
  };

  const prevImage = () => {
    if (mediaUrls && mediaUrls.length > 0) {
      setLightboxIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
    }
  };

   if (!visualDna && !voiceDna && invisibilityScore === null) {
     return null;
   }
 
   return (
     <div className="space-y-6 p-6 rounded-xl neu-pressed">
       {/* Section 1: Score Header */}
       <div className="flex items-start justify-between">
         <div className="flex items-center gap-6">
           <div className={cn("text-6xl font-black", categoryColors.text)}>
             {invisibilityScore ?? '--'}
           </div>
           <div>
             <Badge className={cn("text-base font-bold px-3 py-1", categoryColors.badge)}>
               {invisibilityCategory || 'Unknown'}
             </Badge>
             <p className="text-sm text-muted-foreground mt-1">Invisibility Score</p>
           </div>
         </div>
         <div className="text-right text-sm text-muted-foreground">
           {analyzedAt && <p>Analyzed {formatDate(analyzedAt)}</p>}
           {postsAnalyzed !== undefined && <p className="font-medium">{postsAnalyzed} images analyzed</p>}
         </div>
       </div>
 
        {/* Media Gallery - horizontal scrolling */}
        {mediaUrls && mediaUrls.length > 0 && (
          <div>
            <SectionHeader icon={Image} title={`Analyzed Media (${mediaUrls.length})`} />
            <ScrollArea className="w-full whitespace-nowrap rounded-lg">
              <div className="flex gap-3 pb-3">
                {mediaUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => openLightbox(idx)}
                    className="shrink-0 w-32 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors group focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <AspectRatio ratio={1}>
                      <img
                        src={url}
                        alt={`Analyzed image ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </AspectRatio>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Lightbox Dialog */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
            <div className="relative flex items-center justify-center min-h-[60vh]">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              
              {/* Previous button */}
              {mediaUrls && mediaUrls.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 z-10 text-white hover:bg-white/20"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}
              
              {/* Image */}
              {mediaUrls && mediaUrls[lightboxIndex] && (
                <img
                  src={mediaUrls[lightboxIndex]}
                  alt={`Image ${lightboxIndex + 1} of ${mediaUrls.length}`}
                  className="max-h-[80vh] max-w-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              )}
              
              {/* Next button */}
              {mediaUrls && mediaUrls.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 z-10 text-white hover:bg-white/20"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}
              
              {/* Counter */}
              {mediaUrls && mediaUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                  {lightboxIndex + 1} / {mediaUrls.length}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

       {/* Score Breakdown Table */}
       {(scoreFactors || visualDna || voiceDna) && (
         <div className="bg-muted/30 rounded-lg p-4">
           <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Score Breakdown</h5>
           <ScoreFactorRow 
             label="Posting Frequency" 
             value={scoreFactors?.posting_frequency?.value ?? "—"} 
             score={scoreFactors?.posting_frequency?.score ?? 0} 
             weight={`${scoreFactors?.posting_frequency?.weight ?? 30}%`} 
           />
           <ScoreFactorRow 
             label="Content Quality" 
             value={scoreFactors?.content_quality?.value ?? "—"} 
             score={scoreFactors?.content_quality?.score ?? 0} 
             weight={`${scoreFactors?.content_quality?.weight ?? 25}%`} 
           />
           <ScoreFactorRow 
             label="Brand Consistency" 
             value={scoreFactors?.brand_consistency?.value ?? "—"} 
             score={scoreFactors?.brand_consistency?.score ?? 0} 
             weight={`${scoreFactors?.brand_consistency?.weight ?? 20}%`} 
           />
           <ScoreFactorRow 
             label="Engagement Rate" 
             value={scoreFactors?.engagement_rate?.value ?? "—"} 
             score={scoreFactors?.engagement_rate?.score ?? 0} 
             weight={`${scoreFactors?.engagement_rate?.weight ?? 15}%`} 
           />
           <ScoreFactorRow 
             label="Caption Effort" 
             value={scoreFactors?.caption_effort?.value ?? "—"} 
             score={scoreFactors?.caption_effort?.score ?? 0} 
             weight={`${scoreFactors?.caption_effort?.weight ?? 10}%`} 
           />
         </div>
       )}
 
       {/* Section 2: Color Palette */}
       {visualDna?.color_palette && visualDna.color_palette.length > 0 && (
         <div>
           <SectionHeader icon={Palette} title="Color Palette" />
           <TooltipProvider>
             <div className="flex flex-wrap gap-4">
               {visualDna.color_palette.map((color, idx) => (
                 <Tooltip key={idx}>
                   <TooltipTrigger>
                     <div className="flex flex-col items-center gap-1">
                       <div
                         className="w-10 h-10 rounded-full border-2 border-border shadow-lg cursor-pointer hover:scale-110 transition-transform"
                         style={{ backgroundColor: color }}
                       />
                       <span className="text-xs font-mono text-muted-foreground">{color}</span>
                     </div>
                   </TooltipTrigger>
                   <TooltipContent>
                     <p className="font-mono">{color}</p>
                   </TooltipContent>
                 </Tooltip>
               ))}
             </div>
           </TooltipProvider>
         </div>
       )}
 
       {/* Section 3: Photography Style */}
       {(visualDna?.photography_style || visualDna?.filter_style) && (
         <div>
           <SectionHeader icon={Camera} title="Photography Style" />
           <div className="flex flex-wrap gap-2">
             {visualDna.photography_style && (
               <Badge variant="default" className="text-sm capitalize">
                 {visualDna.photography_style}
               </Badge>
             )}
             {visualDna.filter_style && (
               <Badge variant="secondary" className="text-sm capitalize">
                 {visualDna.filter_style} filter
               </Badge>
             )}
             {visualDna.quality_assessment?.image_quality && (
               <Badge variant="outline" className="text-sm capitalize">
                 {visualDna.quality_assessment.image_quality} quality
               </Badge>
             )}
           </div>
         </div>
       )}
 
       {/* Section 4: Composition */}
       {visualDna?.composition_patterns && visualDna.composition_patterns.length > 0 && (
         <div>
           <SectionHeader icon={Image} title="Composition Patterns" />
           <div className="flex flex-wrap gap-2">
             {visualDna.composition_patterns.map((pattern, idx) => (
               <Badge key={idx} variant="outline" className="text-sm capitalize">
                 {pattern}
               </Badge>
             ))}
           </div>
         </div>
       )}
 
       {/* Section 5: Branding Elements */}
       {visualDna?.branding_elements && (
         <div>
           <SectionHeader icon={Star} title="Branding Elements" />
           <div className="grid grid-cols-3 gap-4">
             <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
               {visualDna.branding_elements?.logo_visible ? (
                 <CheckCircle className="h-5 w-5 text-primary" />
               ) : (
                 <XCircle className="h-5 w-5 text-muted-foreground/50" />
               )}
               <div>
                 <p className="text-sm font-medium">Logo Visible</p>
                 <p className="text-xs text-muted-foreground">
                   {visualDna.branding_elements?.logo_visible ? 'Yes' : 'No'}
                 </p>
               </div>
             </div>
             <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
               {visualDna.branding_elements?.watermarks ? (
                 <CheckCircle className="h-5 w-5 text-primary" />
               ) : (
                 <XCircle className="h-5 w-5 text-muted-foreground/50" />
               )}
               <div>
                 <p className="text-sm font-medium">Watermarks</p>
                 <p className="text-xs text-muted-foreground">
                   {visualDna.branding_elements?.watermarks ? 'Yes' : 'No'}
                 </p>
               </div>
             </div>
             <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
               {visualDna.branding_elements?.text_overlays ? (
                 <CheckCircle className="h-5 w-5 text-primary" />
               ) : (
                 <XCircle className="h-5 w-5 text-muted-foreground/50" />
               )}
               <div>
                 <p className="text-sm font-medium">Text Overlays</p>
                 <p className="text-xs text-muted-foreground">
                   {visualDna.branding_elements?.text_overlays ? 'Yes' : 'No'}
                 </p>
               </div>
             </div>
           </div>
         </div>
       )}
 
       {/* Section 6: Content Mix */}
       {visualDna?.content_mix && Object.keys(visualDna.content_mix).length > 0 && (
         <div>
           <SectionHeader icon={BarChart3} title="Content Mix" />
           <ContentMixChart mix={visualDna.content_mix} />
         </div>
       )}
 
       {/* Section 7: Voice Profile */}
       {voiceDna && (
         <div>
           <SectionHeader icon={Volume2} title="Voice Profile" />
           <div className="space-y-4">
             {/* Main voice metrics grid */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
               {voiceDna.tone && (
                 <div className="p-3 bg-muted/30 rounded-lg">
                   <p className="text-xs text-muted-foreground">Tone</p>
                   <p className="text-sm font-medium capitalize">{voiceDna.tone}</p>
                 </div>
               )}
               {voiceDna.average_length && (
                 <div className="p-3 bg-muted/30 rounded-lg">
                   <p className="text-xs text-muted-foreground">Caption Length</p>
                   <p className="text-sm font-medium capitalize">{voiceDna.average_length}</p>
                 </div>
               )}
               {voiceDna.emoji_frequency && (
                 <div className="p-3 bg-muted/30 rounded-lg">
                   <p className="text-xs text-muted-foreground">Emoji Use</p>
                   <p className="text-sm font-medium capitalize">{voiceDna.emoji_frequency}</p>
                 </div>
               )}
               {voiceDna.hashtag_strategy?.average_count !== undefined && (
                 <div className="p-3 bg-muted/30 rounded-lg">
                   <p className="text-xs text-muted-foreground">Avg Hashtags</p>
                   <p className="text-sm font-medium">{voiceDna.hashtag_strategy.average_count}</p>
                 </div>
               )}
             </div>
 
             {/* Common Emojis */}
             {voiceDna.common_emojis && voiceDna.common_emojis.length > 0 && (
               <div>
                 <p className="text-xs text-muted-foreground mb-1">Common Emojis</p>
                 <p className="text-2xl">{voiceDna.common_emojis.slice(0, 10).join(' ')}</p>
               </div>
             )}
 
             {/* CTA Patterns */}
             {voiceDna.cta_patterns && voiceDna.cta_patterns.length > 0 && (
               <div>
                 <p className="text-xs text-muted-foreground mb-2">CTA Patterns</p>
                 <div className="flex flex-wrap gap-2">
                   {voiceDna.cta_patterns.map((cta, idx) => (
                     <Badge key={idx} variant="outline" className="text-xs">
                       {cta}
                     </Badge>
                   ))}
                 </div>
               </div>
             )}
 
             {/* Hashtag Strategy */}
             {voiceDna.hashtag_strategy && (
               <div className="flex items-center gap-4 text-sm">
                 <Hash className="h-4 w-4 text-muted-foreground" />
                 <span className="text-muted-foreground">Strategy:</span>
                 <Badge variant="secondary" className="capitalize">
                   {voiceDna.hashtag_strategy.branded_vs_generic}
                 </Badge>
                 <span className="text-muted-foreground">Placement:</span>
                 <Badge variant="secondary" className="capitalize">
                   {voiceDna.hashtag_strategy.placement}
                 </Badge>
               </div>
             )}
 
             {/* Languages */}
             {voiceDna.languages && voiceDna.languages.length > 0 && (
               <div className="flex items-center gap-2">
                 <Languages className="h-4 w-4 text-muted-foreground" />
                 <span className="text-sm text-muted-foreground">Languages:</span>
                 {voiceDna.languages.map((lang, idx) => (
                   <Badge key={idx} variant="outline" className="text-xs">
                     {lang}
                   </Badge>
                 ))}
               </div>
             )}
 
             {/* Recurring Themes */}
             {voiceDna.recurring_themes && voiceDna.recurring_themes.length > 0 && (
               <div>
                 <p className="text-xs text-muted-foreground mb-2">Recurring Themes</p>
                 <div className="flex flex-wrap gap-2">
                   {voiceDna.recurring_themes.map((theme, idx) => (
                     <Badge key={idx} className="text-xs">
                       {theme}
                     </Badge>
                   ))}
                 </div>
               </div>
             )}
 
             {/* Signature Phrases */}
             {voiceDna.signature_phrases && voiceDna.signature_phrases.length > 0 && (
               <div>
                 <p className="text-xs text-muted-foreground mb-2">Signature Phrases</p>
                 <div className="space-y-1">
                   {voiceDna.signature_phrases.slice(0, 5).map((phrase, idx) => (
                     <p key={idx} className="text-sm italic text-muted-foreground">
                       "{phrase}"
                     </p>
                   ))}
                 </div>
               </div>
             )}
           </div>
         </div>
       )}
 
       {/* Section 8: CTLT Style Matches */}
       {ctltMatches && (
         <div>
           <SectionHeader icon={Sparkles} title="CTLT Style Matches" />
           <div className="space-y-4">
             {/* Matched Styles */}
             {ctltMatches.matched_styles && ctltMatches.matched_styles.length > 0 && (
               <div className="flex flex-wrap gap-2">
                 {ctltMatches.matched_styles.slice(0, 5).map((style, idx) => (
                   <TooltipProvider key={idx}>
                     <Tooltip>
                       <TooltipTrigger>
                         <Badge 
                           className={cn(
                             "text-sm cursor-pointer",
                             style.match_score >= 8 ? "bg-green-500/20 text-green-400 border-green-500/30" :
                             style.match_score >= 6 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                             "bg-muted"
                           )}
                         >
                           {style.style_name} <span className="font-bold ml-1">{style.match_score}/10</span>
                         </Badge>
                       </TooltipTrigger>
                       <TooltipContent className="max-w-[250px]">
                         <p className="text-sm">{style.reason}</p>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                 ))}
               </div>
             )}
 
             {/* Styles to Avoid */}
             {ctltMatches.styles_to_avoid && ctltMatches.styles_to_avoid.length > 0 && (
               <div className="flex items-center gap-3">
               <AlertTriangle className="h-4 w-4 text-destructive" />
                 <span className="text-sm text-muted-foreground">Avoid:</span>
                 {ctltMatches.styles_to_avoid.map((style, idx) => (
                   <TooltipProvider key={idx}>
                     <Tooltip>
                       <TooltipTrigger>
                         <Badge variant="outline" className="text-sm text-destructive border-destructive/30 cursor-pointer">
                           {style.style_name}
                         </Badge>
                       </TooltipTrigger>
                       <TooltipContent className="max-w-[250px]">
                         <p className="text-sm">{style.reason}</p>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                 ))}
               </div>
             )}
 
             {/* Enhancement Suggestion */}
             {ctltMatches.enhancement_suggestion && (
               <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                 <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                 <p className="text-sm italic text-muted-foreground">
                   {ctltMatches.enhancement_suggestion}
                 </p>
               </div>
             )}
           </div>
         </div>
       )}
 
       {/* Section 9: Debug - Raw JSON */}
       <div className="pt-4 border-t border-border/50">
         <Collapsible open={showRawData} onOpenChange={setShowRawData}>
           <CollapsibleTrigger asChild>
             <Button variant="ghost" size="sm" className="text-muted-foreground">
               <Code className="h-4 w-4 mr-2" />
               {showRawData ? 'Hide' : 'Show'} Raw JSON Data
               <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", showRawData && "rotate-180")} />
             </Button>
           </CollapsibleTrigger>
           <CollapsibleContent>
             <div className="mt-4 p-4 bg-muted/50 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
               <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                 {JSON.stringify({ visualDna, voiceDna, ctltMatches }, null, 2)}
               </pre>
             </div>
           </CollapsibleContent>
         </Collapsible>
       </div>
     </div>
   );
 };
 
 export default VisualDNACard;