import { TrendingUp, DollarSign, Globe, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

const stats = [
  {
    title: "Total Jobs",
    value: "2",
    icon: Globe,
    trend: "+100%",
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    title: "Pages Scraped",
    value: "137",
    icon: Zap,
    trend: "+37",
    color: "text-accent",
    bgColor: "bg-accent/20",
  },
  {
    title: "Success Rate",
    value: "98.5%",
    icon: TrendingUp,
    trend: "+2.1%",
    color: "text-success",
    bgColor: "bg-success/20",
  },
  {
    title: "Total Cost",
    value: "$3.65",
    icon: DollarSign,
    trend: "+$1.20",
    color: "text-warning",
    bgColor: "bg-warning/20",
  },
];

const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
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
