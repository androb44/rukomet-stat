import { Link, useLocation } from "wouter";
import { Home, Users, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/matches", icon: Calendar, label: "Matches" },
    { href: "/teams", icon: Users, label: "Teams" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-t border-border shadow-lg safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href || (href !== '/' && location.startsWith(href));
          return (
            <Link key={href} href={href} className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <div className={cn(
                "p-1.5 rounded-xl transition-all",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              </div>
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
