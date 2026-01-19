import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, trendUp, className }: StatCardProps) {
  return (
    <div className={cn("bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover-card-effect", className)}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "p-3 rounded-xl",
          "bg-primary/10 text-primary"
        )}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full",
            trendUp ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
        <h3 className="text-2xl font-bold font-display tracking-tight text-foreground">{value}</h3>
      </div>
    </div>
  );
}
