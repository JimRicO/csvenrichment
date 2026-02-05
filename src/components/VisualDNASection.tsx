 import { Badge } from "@/components/ui/badge";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
 import { ChevronDown, Eye, Mic2, Lightbulb, Camera, Palette, BarChart3, Hash, MessageSquare, Gauge, Star, CheckCircle, XCircle, AlertTriangle, Code, Dna, Loader2 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 
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
 
interface ScoreBreakdown {
  postingFrequency?: { postsPerWeek: number; score: number };
  contentQuality?: { level: string; score: number };
  brandConsistency?: { rating: number; score: number };
  engagementRate?: { rate: number; score: number };
  captionEffort?: { length: string; score: number };
}

 interface VisualDNASectionProps {
   visualDna: VisualDNA | null;
   voiceDna: VoiceDNA | null;
   ctltMatches: CTLTMatches | null;
   invisibilityScore: number | null;
   invisibilityCategory: string | null;
   analyzedAt: string | null;
   postsAnalyzed?: number;
   compact?: boolean;
   showEmptyState?: boolean;
   onAnalyze?: () => void;
   isAnalyzing?: boolean;
   instagramHandle?: string | null;
 }
 
 const getCategoryColor = (category: string | null) => {
   switch (category?.toLowerCase()) {
     case 'excellent':
       return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
     case 'strong':
       return 'bg-green-500/20 text-green-400 border-green-500/30';
     case 'average':
       return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
     case 'struggling':
       return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
     case 'invisible':
       return 'bg-red-500/20 text-red-400 border-red-500/30';
     default:
       return 'bg-muted text-muted-foreground';
   }
 };
 
 const getScoreTextColor = (category: string | null) => {
   switch (category?.toLowerCase()) {
     case 'excellent': return 'text-blue-400';
     case 'strong': return 'text-green-400';
     case 'average': return 'text-yellow-400';
     case 'struggling': return 'text-orange-400';
     case 'invisible': return 'text-red-400';
     default: return 'text-muted-foreground';
   }
 };
 
 const ContentMixBar = ({ mix }: { mix: Record<string, number> }) => {
   const colors: Record<string, string> = {
     action: 'bg-red-500',
     lifestyle: 'bg-blue-500',
     events: 'bg-purple-500',
     coaching: 'bg-green-500',
     facility: 'bg-yellow-500',
     community: 'bg-pink-500',
     promotional: 'bg-orange-500',
   };
 
   const entries = Object.entries(mix)
     .filter(([_, value]) => value > 0)
     .sort((a, b) => b[1] - a[1]);
 
   return (
     <div className="space-y-2">
       {entries.map(([key, value]) => (
         <div key={key} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-24 capitalize">{key}</span>
           <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
             <div 
               className={cn("h-full rounded-full", colors[key] || 'bg-primary')}
               style={{ width: `${value}%` }}
             />
           </div>
           <span className="text-xs text-muted-foreground w-8 text-right">{value}%</span>
         </div>
       ))}
     </div>
   );
 };
 
const ScoreFactorRow = ({ label, value, score, maxScore = 100 }: { label: string; value: string; score: number; maxScore?: number }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs text-foreground">{value}</span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full"
          style={{ width: `${(score / maxScore) * 100}%` }}
        />
      </div>
    </div>
  </div>
);

 const BrandingIndicator = ({ label, value }: { label: string; value: boolean | undefined }) => (
   <div className="flex items-center gap-1.5">
     {value ? (
       <CheckCircle className="h-3 w-3 text-green-500" />
     ) : (
       <XCircle className="h-3 w-3 text-muted-foreground/50" />
     )}
     <span className={cn("text-xs", value ? "text-foreground" : "text-muted-foreground")}>{label}</span>
   </div>
 );
 
 const VisualDNASection = ({
   visualDna,
   voiceDna,
   ctltMatches,
   invisibilityScore,
   invisibilityCategory,
   analyzedAt,
   postsAnalyzed,
   compact = false,
   showEmptyState = false,
   onAnalyze,
   isAnalyzing = false,
   instagramHandle = null
 }: VisualDNASectionProps) => {
   const [isOpen, setIsOpen] = useState(true);
   const [showRawData, setShowRawData] = useState(false);
 
   const hasData = visualDna || voiceDna || invisibilityScore !== null;
 
   if (!hasData && !showEmptyState) {
     return null;
   }
 
   const formatDate = (dateStr: string | null) => {
     if (!dateStr) return null;
     return new Date(dateStr).toLocaleDateString('en-US', {
       month: 'short',
       day: 'numeric',
       year: 'numeric'
     });
   };
 
  // Calculate score breakdown from data
  const qualityScore = visualDna?.quality_assessment?.image_quality === 'professional' ? 100 :
                       visualDna?.quality_assessment?.image_quality === 'semi-professional' ? 70 :
                       visualDna?.quality_assessment?.image_quality === 'phone-camera' ? 40 : 55;
  
  const consistencyScore = (visualDna?.quality_assessment?.brand_coherence || 5) * 10;
  
  const captionScore = voiceDna?.average_length === 'long' ? 100 :
                       voiceDna?.average_length === 'medium' ? 70 : 30;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {invisibilityScore !== null && (
          <>
            <span className={cn("text-lg font-bold", getScoreTextColor(invisibilityCategory))}>
              {invisibilityScore}
            </span>
            <Badge className={cn("text-xs", getCategoryColor(invisibilityCategory))}>
              {invisibilityCategory}
            </Badge>
          </>
        )}
      </div>
    );
  }

   // Empty state - show when no data but showEmptyState is true
   if (!hasData && showEmptyState) {
     return (
       <Collapsible open={isOpen} onOpenChange={setIsOpen}>
         <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:bg-muted/50 p-2 rounded-lg transition-colors">
           <Eye className="h-4 w-4 text-primary" />
           Visual DNA
           <ChevronDown className={cn(
             "h-4 w-4 ml-auto transition-transform",
             isOpen && "rotate-180"
           )} />
         </CollapsibleTrigger>
         
         <CollapsibleContent className="mt-2">
           <div className="p-6 rounded-xl neu-pressed flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
               <Dna className="h-8 w-8 text-muted-foreground" />
             </div>
             <div>
               <h4 className="text-sm font-medium">No Visual DNA Analysis Yet</h4>
               <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                 {instagramHandle 
                   ? `Analyze ${instagramHandle}'s Instagram presence to generate an Invisibility Score and content insights.`
                   : "This club needs an Instagram handle to analyze Visual DNA."}
               </p>
             </div>
             {instagramHandle && onAnalyze && (
               <Button
                 size="sm"
                 onClick={onAnalyze}
                 disabled={isAnalyzing}
                 className="mt-2"
               >
                 {isAnalyzing ? (
                   <>
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                     Analyzing...
                   </>
                 ) : (
                   <>
                     <Dna className="h-4 w-4 mr-2" />
                     Analyze Visual DNA
                   </>
                 )}
               </Button>
             )}
           </div>
         </CollapsibleContent>
       </Collapsible>
     );
   }
 
   return (
     <Collapsible open={isOpen} onOpenChange={setIsOpen}>
       <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:bg-muted/50 p-2 rounded-lg transition-colors">
         <Eye className="h-4 w-4 text-primary" />
         Visual DNA
         <ChevronDown className={cn(
           "h-4 w-4 ml-auto transition-transform",
           isOpen && "rotate-180"
         )} />
       </CollapsibleTrigger>
       
       <CollapsibleContent className="mt-2 space-y-4">
         <div className="p-4 rounded-xl neu-pressed space-y-4">
          {/* Header: Invisibility Score + Category */}
           {invisibilityScore !== null && (
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-4">
                <div className={cn("text-5xl font-bold", getScoreTextColor(invisibilityCategory))}>
                  {invisibilityScore}
                </div>
                <div>
                  <Badge className={cn("text-sm font-semibold", getCategoryColor(invisibilityCategory))}>
                    {invisibilityCategory || 'Unknown'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Invisibility Score</p>
                </div>
              </div>
              <div className="text-right">
                {analyzedAt && (
                  <p className="text-xs text-muted-foreground">
                    Analyzed {formatDate(analyzedAt)}
                  </p>
                )}
                {postsAnalyzed !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {postsAnalyzed} images analyzed
                  </p>
                )}
               </div>
             </div>
           )}
 
          {/* Score Breakdown */}
          {(visualDna || voiceDna) && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Gauge className="h-3 w-3" />
                Score Breakdown
              </h4>
              <div className="bg-muted/30 rounded-lg p-3">
                <ScoreFactorRow 
                  label="Content Quality (25%)" 
                  value={visualDna?.quality_assessment?.image_quality || 'Mixed'} 
                  score={qualityScore} 
                />
                <ScoreFactorRow 
                  label="Brand Consistency (20%)" 
                  value={`${visualDna?.quality_assessment?.brand_coherence || 5}/10`} 
                  score={consistencyScore} 
                />
                <ScoreFactorRow 
                  label="Caption Effort (10%)" 
                  value={voiceDna?.average_length || 'Unknown'} 
                  score={captionScore} 
                />
              </div>
            </div>
          )}

          {/* Color Palette - Enhanced */}
           {visualDna?.color_palette && visualDna.color_palette.length > 0 && (
             <div className="space-y-2">
               <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                 <Palette className="h-3 w-3" />
                 Color Palette
               </h4>
               <TooltipProvider>
                <div className="flex flex-wrap gap-3">
                   {visualDna.color_palette.map((color, idx) => (
                     <Tooltip key={idx}>
                       <TooltipTrigger>
                         <div
                          className="w-8 h-8 rounded-full border-2 border-border/50 shadow-md cursor-pointer hover:scale-110 transition-transform"
                           style={{ backgroundColor: color }}
                         />
                       </TooltipTrigger>
                       <TooltipContent>
                         <p className="font-mono text-xs">{color}</p>
                       </TooltipContent>
                     </Tooltip>
                   ))}
                 </div>
               </TooltipProvider>
             </div>
           )}
 
          {/* Photography Style & Composition - Enhanced */}
           {(visualDna?.photography_style || visualDna?.composition_patterns) && (
             <div className="space-y-2">
               <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                 <Camera className="h-3 w-3" />
                 Style & Composition
               </h4>
               <div className="flex flex-wrap gap-1.5">
                 {visualDna.photography_style && (
                  <Badge variant="default" className="text-xs capitalize">
                     {visualDna.photography_style}
                   </Badge>
                 )}
                 {visualDna.filter_style && (
                   <Badge variant="outline" className="text-xs capitalize">
                    {visualDna.filter_style} filter
                   </Badge>
                 )}
                 {visualDna.composition_patterns?.map((pattern, idx) => (
                   <Badge key={idx} variant="outline" className="text-xs capitalize">
                     {pattern}
                   </Badge>
                 ))}
               </div>
             </div>
           )}
 
          {/* Branding Elements */}
          {visualDna?.branding_elements && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Star className="h-3 w-3" />
                Branding Elements
              </h4>
              <div className="flex flex-wrap gap-4">
                <BrandingIndicator label="Logo Visible" value={visualDna.branding_elements.logo_visible} />
                <BrandingIndicator label="Watermarks" value={visualDna.branding_elements.watermarks} />
                <BrandingIndicator label="Text Overlays" value={visualDna.branding_elements.text_overlays} />
              </div>
            </div>
          )}

          {/* Voice Profile - Enhanced */}
           {voiceDna && (
             <div className="space-y-2">
               <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                 <Mic2 className="h-3 w-3" />
                 Voice Profile
               </h4>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {voiceDna.tone && (
                    <div>
                      <span className="text-muted-foreground">Tone: </span>
                      <span className="text-foreground capitalize">{voiceDna.tone}</span>
                    </div>
                  )}
                  {voiceDna.average_length && (
                    <div>
                      <span className="text-muted-foreground">Length: </span>
                      <span className="text-foreground capitalize">{voiceDna.average_length}</span>
                    </div>
                  )}
                  {voiceDna.emoji_frequency && (
                    <div>
                      <span className="text-muted-foreground">Emoji use: </span>
                      <span className="text-foreground capitalize">{voiceDna.emoji_frequency}</span>
                    </div>
                  )}
                  {voiceDna.hashtag_strategy?.average_count !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Hashtags: </span>
                      <span className="text-foreground">{voiceDna.hashtag_strategy.average_count} avg</span>
                    </div>
                  )}
                </div>
                
                {/* Common Emojis */}
                {voiceDna.common_emojis && voiceDna.common_emojis.length > 0 && (
                  <div className="pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">Common emojis: </span>
                    <span className="text-sm">{voiceDna.common_emojis.slice(0, 8).join(' ')}</span>
                  </div>
                )}
                
                {/* CTA Patterns */}
                {voiceDna.cta_patterns && voiceDna.cta_patterns.length > 0 && (
                  <div className="pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground block mb-1">CTA patterns:</span>
                    <div className="flex flex-wrap gap-1">
                      {voiceDna.cta_patterns.slice(0, 5).map((cta, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {cta}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Hashtag Strategy */}
                {voiceDna.hashtag_strategy && (
                  <div className="pt-2 border-t border-border/30 flex items-center gap-2 text-xs">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Strategy:</span>
                    <span className="text-foreground capitalize">{voiceDna.hashtag_strategy.branded_vs_generic}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-foreground capitalize">{voiceDna.hashtag_strategy.placement}</span>
                  </div>
                )}
               </div>
             </div>
           )}
 
           {/* Content Mix */}
           {visualDna?.content_mix && Object.keys(visualDna.content_mix).length > 0 && (
             <div className="space-y-2">
               <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                 <BarChart3 className="h-3 w-3" />
                 Content Mix
               </h4>
               <ContentMixBar mix={visualDna.content_mix} />
             </div>
           )}
 
           {/* CTLT Style Matches */}
           {ctltMatches?.matched_styles && ctltMatches.matched_styles.length > 0 && (
             <div className="space-y-2 pt-2 border-t border-border/50">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Star className="h-3 w-3" />
                CTLT Style Matches
              </h4>
               <div className="flex flex-wrap gap-1.5">
                 {ctltMatches.matched_styles.slice(0, 5).map((style, idx) => (
                   <TooltipProvider key={idx}>
                     <Tooltip>
                       <TooltipTrigger>
                         <Badge 
                           variant="secondary" 
                           className={cn(
                             "text-xs cursor-pointer",
                             style.match_score >= 8 ? "bg-green-500/20 text-green-400" :
                             style.match_score >= 6 ? "bg-blue-500/20 text-blue-400" :
                             "bg-muted"
                           )}
                         >
                           {style.style_name} {style.match_score}/10
                         </Badge>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p className="text-xs max-w-[200px]">{style.reason}</p>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                 ))}
               </div>
 
               {/* Styles to Avoid */}
               {ctltMatches.styles_to_avoid && ctltMatches.styles_to_avoid.length > 0 && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-orange-400 mt-0.5" />
                   <div className="inline-flex flex-wrap gap-1 ml-1">
                     {ctltMatches.styles_to_avoid.map((style, idx) => (
                       <TooltipProvider key={idx}>
                         <Tooltip>
                           <TooltipTrigger>
                            <Badge variant="outline" className="text-xs text-orange-400 border-orange-400/30 cursor-pointer">
                               {style.style_name}
                             </Badge>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p className="text-xs max-w-[200px]">{style.reason}</p>
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                     ))}
                   </div>
                 </div>
               )}
 
               {/* Enhancement Suggestion */}
               {ctltMatches.enhancement_suggestion && (
                 <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                   <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground italic">{ctltMatches.enhancement_suggestion}</p>
                 </div>
               )}
             </div>
           )}
 
          {/* Raw Data Toggle */}
          {(visualDna || voiceDna || ctltMatches) && (
            <div className="pt-2 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRawData(!showRawData)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Code className="h-3 w-3 mr-1" />
                {showRawData ? 'Hide' : 'Show'} Raw Data
              </Button>
              
              {showRawData && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify({ visualDna, voiceDna, ctltMatches }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
           )}
         </div>
       </CollapsibleContent>
     </Collapsible>
   );
 };
 
 export default VisualDNASection;