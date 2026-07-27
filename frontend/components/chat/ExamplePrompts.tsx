"use client";

import { MessageSquare } from "lucide-react";

interface ExamplePromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const EXAMPLES = [
  "How is our pipeline looking this quarter?",
  "Which work orders are delayed?",
  "Show mining sector performance.",
  "Compare pipeline vs completed work.",
  "What revenue is expected this month?",
  "Which deals have high closure probability?"
];

export default function ExamplePrompts({ onSelectPrompt }: ExamplePromptsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto py-4">
      <div className="flex items-center gap-1.5 px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Analyze Deals and Work Orders</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {EXAMPLES.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className="flex text-left p-3 rounded-xl border border-border bg-surface hover:bg-accent/10 hover:border-accent/40 text-sm text-foreground/80 hover:text-foreground transition-all duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
