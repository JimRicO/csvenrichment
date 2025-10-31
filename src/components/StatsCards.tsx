import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Globe, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalJobs: number;
  pagesScraped: number;
  successRate: number;
  totalCost: number;
}

const StatsCards = () => {
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    pagesScraped: 0,
    successRate: 0,
    totalCost: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: jobs } = await supabase
        .from('scraping_jobs')
        .select('total_pages_scraped, estimated_cost_usd, status, processed_rows, total_rows');

      if (jobs) {
        const totalJobs = jobs.length;
        const pagesScraped = jobs.reduce((sum, job) => sum + (job.total_pages_scraped || 0), 0);
        const totalCost = jobs.reduce((sum, job) => sum + parseFloat(job.estimated_cost_usd.toString()), 0);
        
        const completedJobs = jobs.filter(j => j.status === 'completed');
        const successRate = totalJobs > 0 ? (completedJobs.length / totalJobs) * 100 : 0;

        setStats({
          totalJobs,
          pagesScraped,
          successRate,
          totalCost,
        });
      }
    };

    fetchStats();

    // Set up realtime subscription
    const channel = supabase
      .channel('stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraping_jobs'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statsData = [
    {
      title: "Total Jobs",
      value: stats.totalJobs.toString(),
      icon: Globe,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Pages Scraped",
      value: stats.pagesScraped.toString(),
      icon: Zap,
      color: "text-accent",
      bgColor: "bg-accent/20",
    },
    {
      title: "Success Rate",
      value: `${stats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/20",
    },
    {
      title: "Total Cost",
      value: `$${stats.totalCost.toFixed(3)}`,
      icon: DollarSign,
      color: "text-warning",
      bgColor: "bg-warning/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="p-4 gradient-card border-border/50 hover:border-primary/30 transition-smooth group"
          >
            <div className="mb-3">
              <div className={`p-2.5 rounded-lg ${stat.bgColor} border border-current/20 group-hover:glow-primary transition-smooth inline-flex`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-foreground mb-1 break-all">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
