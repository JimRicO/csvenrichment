import { Badge } from "@/components/ui/badge";
import { Newspaper, ExternalLink } from "lucide-react";

interface NewsItem {
  headline: string;
  source: string;
  date: string;
  url: string;
}

interface PersonNewsProps {
  news: NewsItem[];
}

const PersonNews = ({ news }: PersonNewsProps) => {
  if (!news || news.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-primary" />
        Recent News
      </h3>
      <div className="space-y-2">
        {news.slice(0, 5).map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg neu-subtle hover:bg-primary/10 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {item.headline}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.source}
                  </Badge>
                  {item.date && (
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  )}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default PersonNews;
