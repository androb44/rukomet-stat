import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { useLocation } from "wouter";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Teams from "@/pages/Teams";
import TeamDetails from "@/pages/TeamDetails";
import Matches from "@/pages/Matches";
import MatchDetails from "@/pages/MatchDetails";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/teams" component={Teams} />
      <Route path="/teams/:id" component={TeamDetails} />
      <Route path="/matches" component={Matches} />
      <Route path="/matches/:id" component={MatchDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout() {
  const [location] = useLocation();
  // Hide bottom nav on specific pages if needed, e.g., live scorer
  // For now, we keep it but it might overlap scorer drawers
  const showNav = !location.includes('/matches/') || location === '/matches';

  return (
    <>
      <Router />
      <Navigation />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
