import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";

interface ResearchSummaryProps {
  summary: string | null;
  confidenceScore: string | null;
  sourcesCount: number;
}

const ResearchSummary = ({ summary, confidenceScore, sourcesCount }: ResearchSummaryProps) => {
  if (!summary && !confidenceScore) return null;

  const getConfidenceIcon = () => {
    switch (confidenceScore) {
      case 'high':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'medium':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getConfidenceBadge = () => {
    switch (confidenceScore) {
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
    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getConfidenceIcon()}
          <span className="text-sm font-medium">Research Quality</span>
        </div>
        <div className="flex items-center gap-2">
          {getConfidenceBadge()}
          <Badge variant="outline" className="text-xs">
            {sourcesCount} sources
          </Badge>
        </div>
      </div>
      {summary && (
        <p className="text-sm text-muted-foreground">{summary}</p>
      )}
    </div>
  );
};

export default ResearchSummary;
