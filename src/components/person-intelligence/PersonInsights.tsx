import { Badge } from "@/components/ui/badge";
import { Lightbulb, MessageSquareQuote, Target, Sparkles } from "lucide-react";

interface PersonInsightsProps {
  communicationStyle: string | null;
  keyInterests: string[];
  conversationStarters: string[];
  quotes: string[];
}

const PersonInsights = ({ 
  communicationStyle, 
  keyInterests, 
  conversationStarters, 
  quotes 
}: PersonInsightsProps) => {
  const hasContent = communicationStyle || 
    keyInterests?.length > 0 || 
    conversationStarters?.length > 0 || 
    quotes?.length > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        Sales Insights
      </h3>

      {/* Communication Style */}
      {communicationStyle && (
        <div className="p-3 rounded-lg neu-subtle">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Communication Style
            </span>
          </div>
          <p className="text-sm">{communicationStyle}</p>
        </div>
      )}

      {/* Key Interests */}
      {keyInterests && keyInterests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Key Interests
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keyInterests.map((interest, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Starters */}
      {conversationStarters && conversationStarters.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Conversation Starters
            </span>
          </div>
          <ul className="space-y-1.5">
            {conversationStarters.slice(0, 5).map((starter, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{starter}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quotes */}
      {quotes && quotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notable Quotes
            </span>
          </div>
          <div className="space-y-2">
            {quotes.slice(0, 3).map((quote, idx) => (
              <blockquote 
                key={idx} 
                className="text-sm italic border-l-2 border-primary/50 pl-3 py-1 text-muted-foreground"
              >
                "{quote}"
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonInsights;
