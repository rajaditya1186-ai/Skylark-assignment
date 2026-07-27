"use client";

export default function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2 px-1 text-muted-foreground">
      <span className="text-xs font-medium mr-1.5">Agent is analyzing</span>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
      </div>
    </div>
  );
}
