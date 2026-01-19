import { Link, useLocation } from "wouter";
import { Activity, Users, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/matches", label: "Matches", icon: Calendar },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border md:relative md:border-none md:bg-transparent md:backdrop-blur-none">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between md:justify-start md:space-x-8 items-center h-16">
          <div className="hidden md:flex items-center space-x-2 mr-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold font-display tracking-tight">HandballStats</span>
          </div>

          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex flex-col md:flex-row items-center justify-center p-2 md:px-4 md:py-2 rounded-xl transition-all duration-200 cursor-pointer",
                  location === item.href
                    ? "text-primary md:bg-primary/10 md:font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("w-5 h-5 md:mr-2", location === item.href && "stroke-[2.5px]")} />
                <span className="text-[10px] md:text-sm mt-1 md:mt-0 font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
