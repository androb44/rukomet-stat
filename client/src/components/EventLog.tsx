import { type MatchEvent, type Player, type Team } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Trash2, AlertCircle, Goal, XCircle, Hand, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventLogProps {
  events: (MatchEvent & { team?: Team; player?: Player })[];
  onDeleteEvent?: (id: number) => void;
  canEdit?: boolean;
}

export function EventLog({ events, onDeleteEvent, canEdit = false }: EventLogProps) {
  // Sort events by time (descending - newest first)
  const sortedEvents = [...events].sort((a, b) => b.time - a.time);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal': return <Goal className="w-4 h-4 text-green-500" />;
      case 'miss': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'save': return <Hand className="w-4 h-4 text-blue-500" />;
      case 'turnover': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'timeout': return <Timer className="w-4 h-4 text-purple-500" />;
      case 'yellow_card': return <div className="w-3 h-4 bg-yellow-400 rounded-sm" />;
      case 'red_card': return <div className="w-3 h-4 bg-red-600 rounded-sm" />;
      case '2min': return <span className="font-mono text-xs font-bold border border-foreground p-0.5 rounded">2'</span>;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getEventText = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <Timer className="w-12 h-12 mb-3 opacity-20" />
        <p>No events recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-3">
        {sortedEvents.map((event) => (
          <div 
            key={event.id}
            className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 shadow-sm animate-in slide-in-from-left-2 duration-300"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                {formatTime(event.time)}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {getEventIcon(event.type)}
                  <span className="font-semibold text-sm">{getEventText(event.type)}</span>
                </div>
                {event.player && (
                  <span className="text-xs text-muted-foreground">
                    #{event.player.number} {event.player.name}
                  </span>
                )}
                {!event.player && event.team && (
                  <span className="text-xs text-muted-foreground">
                    {event.team.name}
                  </span>
                )}
              </div>
            </div>
            
            {canEdit && onDeleteEvent && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDeleteEvent(event.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
