 import { Badge } from "@/components/ui/badge";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
 import { ChevronDown, Eye, Mic2, Lightbulb, Camera, Palette, BarChart3 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { useState } from "react";
 
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
 
 interface VisualDNASectionProps {
   visualDna: VisualDNA | null;
   voiceDna: VoiceDNA | null;
   ctltMatches: CTLTMatches | null;
   invisibilityScore: number | null;
   invisibilityCategory: string | null;
   analyzedAt: string | null;
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
           <span className="text-xs text-muted-foreground w-20 capitalize">{key}</span>
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
 
 const VisualDNASection = ({
   visualDna,
   voiceDna,
   ctltMatches,
   invisibilityScore,
   invisibilityCategory,
   analyzedAt
 }: VisualDNASectionProps) => {
   const [isOpen, setIsOpen] = useState(true);
 
   if (!visualDna && !voiceDna && invisibilityScore === null) {
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
           {/* Invisibility Score */}
           {invisibilityScore !== null && (
             <div className="flex items-center gap-4">
               <div className={cn("text-4xl font-bold", getScoreTextColor(invisibilityCategory))}>
                 {invisibilityScore}
               </div>
               <div>
                 <Badge className={cn("text-xs font-semibold", getCategoryColor(invisibilityCategory))}>
                   {invisibilityCategory || 'Unknown'}
                 </Badge>
                 <p className="text-xs text-muted-foreground mt-1">Invisibility Score</p>
               </div>
             </div>
           )}
 
           {/* Color Palette */}
           {visualDna?.color_palette && visualDna.color_palette.length > 0 && (
             <div className="space-y-2">
               <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                 <Palette className="h-3 w-3" />
                 Color Palette
               </h4>
               <TooltipProvider>
                 <div className="flex flex-wrap gap-2">
                   {visualDna.color_palette.map((color, idx) => (
                     <Tooltip key={idx}>
                       <TooltipTrigger>
                         <div
                           className="w-6 h-6 rounded-full border border-border/50 shadow-sm cursor-pointer hover:scale-110 transition-transform"
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
 
           {/* Photography Style & Composition */}
           {(visualDna?.photography_style || visualDna?.composition_patterns) && (
             <div className="space-y-2">
               <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                 <Camera className="h-3 w-3" />
                 Style & Composition
               </h4>
               <div className="flex flex-wrap gap-1.5">
                 {visualDna.photography_style && (
                   <Badge variant="secondary" className="text-xs capitalize">
                     {visualDna.photography_style}
                   </Badge>
                 )}
                 {visualDna.filter_style && (
                   <Badge variant="outline" className="text-xs capitalize">
                     {visualDna.filter_style}
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
 
           {/* Voice Profile */}
           {voiceDna && (
             <div className="space-y-2">
               <h4 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                 <Mic2 className="h-3 w-3" />
                 Voice Profile
               </h4>
               <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                 {voiceDna.tone && (
                   <span>Tone: <span className="text-foreground capitalize">{voiceDna.tone}</span></span>
                 )}
                 {voiceDna.emoji_frequency && (
                   <>
                     <span className="text-border">•</span>
                     <span>Emoji: <span className="text-foreground capitalize">{voiceDna.emoji_frequency}</span></span>
                   </>
                 )}
                 {voiceDna.hashtag_strategy?.average_count !== undefined && (
                   <>
                     <span className="text-border">•</span>
                     <span>Hashtags: <span className="text-foreground">{voiceDna.hashtag_strategy.average_count} avg</span></span>
                   </>
                 )}
                 {voiceDna.cta_patterns && voiceDna.cta_patterns.length > 0 && (
                   <>
                     <span className="text-border">•</span>
                     <span>CTAs: <span className="text-foreground">{voiceDna.cta_patterns.length} types</span></span>
                   </>
                 )}
               </div>
               {voiceDna.common_emojis && voiceDna.common_emojis.length > 0 && (
                 <div className="text-sm">{voiceDna.common_emojis.slice(0, 5).join(' ')}</div>
               )}
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
               <h4 className="text-xs font-medium text-muted-foreground">CTLT Style Matches</h4>
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
                 <div className="mt-2">
                   <span className="text-xs text-muted-foreground">Avoid: </span>
                   <div className="inline-flex flex-wrap gap-1 ml-1">
                     {ctltMatches.styles_to_avoid.map((style, idx) => (
                       <TooltipProvider key={idx}>
                         <Tooltip>
                           <TooltipTrigger>
                             <Badge variant="outline" className="text-xs text-muted-foreground cursor-pointer">
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
                   <p className="text-xs text-muted-foreground">{ctltMatches.enhancement_suggestion}</p>
                 </div>
               )}
             </div>
           )}
 
           {/* Analyzed Timestamp */}
           {analyzedAt && (
             <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
               Analyzed on {formatDate(analyzedAt)}
             </p>
           )}
         </div>
       </CollapsibleContent>
     </Collapsible>
   );
 };
 
 export default VisualDNASection;