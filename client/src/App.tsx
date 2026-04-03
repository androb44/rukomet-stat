import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useLocation } from "wouter";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Teams from "@/pages/Teams";
import TeamDetails from "@/pages/TeamDetails";
import Matches from "@/pages/Matches";
import MatchDetails from "@/pages/MatchDetails";
import { Navigation } from "@/components/Navigation";

function Router() {
  const [location] = useLocation();
  const isMatchDetail = /^\/matches\/\d+$/.test(location);

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/teams" component={Teams} />
        <Route path="/teams/:id" component={TeamDetails} />
        <Route path="/matches" component={Matches} />
        <Route path="/matches/:id" component={MatchDetails} />
        <Route component={NotFound} />
      </Switch>
      {!isMatchDetail && <Navigation />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
