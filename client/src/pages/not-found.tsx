import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="h-12 w-12 text-accent" />
      </div>
      <h1 className="text-4xl font-display font-bold mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page not found</p>
      <Link href="/">
        <Button size="lg" className="rounded-full px-8">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
