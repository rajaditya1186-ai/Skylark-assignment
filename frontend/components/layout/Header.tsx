"use client";

import { useEffect, useState } from "react";
import { Terminal, FileText, CheckCircle, XCircle } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  onTriggerLeadership: () => void;
  isGeneratingLeadership: boolean;
}

export default function Header({ onTriggerLeadership, isGeneratingLeadership }: HeaderProps) {
  const [isBackendAlive, setIsBackendAlive] = useState<boolean | null>(null);

  // Poll backend health status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/health");
        if (res.ok) {
          setIsBackendAlive(true);
        } else {
          setIsBackendAlive(false);
        }
      } catch {
        setIsBackendAlive(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check health every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
        {/* Brand Logo and Title */}
        <div className="flex items-center gap-2">
          <Terminal className="h-6 w-6 text-accent" />
          <span className="font-semibold text-lg tracking-tight">Skylark BI Agent</span>
          
          {/* Connection Badge */}
          <div className="ml-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-surface">
            {isBackendAlive === true ? (
              <>
                <CheckCircle className="h-3 w-3 text-success animate-pulse" />
                <span className="text-muted-foreground text-[10px]">Connected</span>
              </>
            ) : isBackendAlive === false ? (
              <>
                <XCircle className="h-3 w-3 text-destructive" />
                <span className="text-muted-foreground text-[10px]">Disconnected</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-border animate-pulse" />
                <span className="text-muted-foreground text-[10px]">Checking...</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTriggerLeadership}
            disabled={isGeneratingLeadership}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-medium text-xs hover:bg-accent/90 disabled:bg-accent/50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            {isGeneratingLeadership ? "Generating Update..." : "Weekly Leadership Update"}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
