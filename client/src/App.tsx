import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useLocation } from "wouter";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Teams from "@/pages/Teams";
import TeamDetails from "@/pages/TeamDetails";
import Matches from "@/pages/Matches";
import MatchDetails from "@/pages/MatchDetails";

function SafeMode() {
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Handball Stats</h1>
      <p style={{ marginBottom: 12 }}>Safe mode - minimal rendering test</p>
      <div style={{ padding: 16, background: '#f0f0f0', borderRadius: 8 }}>
        <p>If you can see this, the app is working!</p>
      </div>
      <button 
        onClick={() => window.location.href = '/?mode=full'}
        style={{ marginTop: 16, padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8 }}
      >
        Try Full App
      </button>
    </div>
  );
}

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
  const isMatchDetail = location.includes('/matches/') && location !== '/matches';

  return (
    <>
      <Router />
      {!isMatchDetail && <Navigation />}
    </>
  );
}

function App() {
  const [safeMode, setSafeMode] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSafeMode(params.get('safe') === '1');
  }, []);

  if (safeMode) {
    return <SafeMode />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Layout />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
