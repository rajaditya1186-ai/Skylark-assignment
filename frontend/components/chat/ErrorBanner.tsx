"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="w-full max-w-2xl mx-auto my-3 p-4 rounded-xl bg-destructive/10 border-l-4 border-destructive text-foreground">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-destructive">Operational Error</h4>
          <p className="text-sm text-foreground/80 mt-1">{message}</p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold hover:bg-destructive/90 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry Action</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
