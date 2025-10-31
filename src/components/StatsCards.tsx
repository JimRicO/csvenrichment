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
      trend: `${stats.totalJobs} total`,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Pages Scraped",
      value: stats.pagesScraped.toString(),
      icon: Zap,
      trend: `+${stats.pagesScraped}`,
      color: "text-accent",
      bgColor: "bg-accent/20",
    },
    {
      title: "Success Rate",
      value: `${stats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: `${stats.successRate.toFixed(1)}%`,
      color: "text-success",
      bgColor: "bg-success/20",
    },
    {
      title: "Total Cost",
      value: `$${stats.totalCost.toFixed(4)}`,
      icon: DollarSign,
      trend: `$${stats.totalCost.toFixed(4)}`,
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
            className="p-6 gradient-card border-border/50 hover:border-primary/30 transition-smooth group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor} border border-current/20 group-hover:glow-primary transition-smooth`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <span className={`text-sm font-medium ${stat.color}`}>
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
