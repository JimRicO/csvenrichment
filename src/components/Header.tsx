import { Database, Zap } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary glow-primary">
              <Database className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CSV Scraper</h1>
              <p className="text-xs text-muted-foreground">Pipelined AI Extraction</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-primary/20">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Real-time Processing</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
