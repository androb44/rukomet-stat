import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            {backTo && (
              <Link href={backTo}>
                <Button variant="ghost" size="icon" className="shrink-0 -ml-2 rounded-full h-10 w-10">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate font-medium">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </header>
  );
}
