import { Link, useLocation } from "wouter";
import { Home, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage, useT, LANG_LABELS, type LangCode } from "@/lib/i18n";

const LANG_CODES: LangCode[] = ["bs", "en", "de", "fr"];

export function Navigation() {
  const [location] = useLocation();
  const { lang, setLang } = useLanguage();
  const t = useT();

  const tabs = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/matches", label: t("nav.matches"), icon: Calendar },
    { href: "/teams", label: t("nav.teams"), icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      {/* Language switcher */}
      <div className="flex justify-center gap-1 pt-1.5 px-4">
        {LANG_CODES.map((code) => (
          <button
            key={code}
            onClick={() => setLang(code)}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-all",
              lang === code
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            data-testid={`button-lang-${code}`}
          >
            {LANG_LABELS[code]}
          </button>
        ))}
      </div>

      {/* Main tabs */}
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`nav-${href === "/" ? "home" : href.slice(1)}`}
            >
              <div className={cn("p-1.5 rounded-xl transition-all", isActive ? "bg-primary/10" : "")}>
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              </div>
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
