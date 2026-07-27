"use client";

import React from "react";
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

interface InsightsPanelProps {
  insights: string[];
  loading: boolean;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, loading }) => {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm h-full dark:bg-zinc-900/50 dark:border-zinc-800">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg border border-yellow-500/20">
          <Lightbulb className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Business Insights</h3>
      </div>

      {loading ? (
        <div className="space-y-3 py-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-4/5"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">
          No insights generated for the current filtered criteria.
        </div>
      ) : (
        <ul className="space-y-4">
          {insights.map((insight, index) => {
            // Pick icon dynamically
            let Icon = TrendingUp;
            let iconColor = "text-blue-500";
            if (insight.toLowerCase().includes("missing") || insight.toLowerCase().includes("limit") || insight.toLowerCase().includes("concentrat")) {
              Icon = AlertCircle;
              iconColor = "text-amber-500";
            } else if (insight.toLowerCase().includes("high") || insight.toLowerCase().includes("won")) {
              Icon = CheckCircle2;
              iconColor = "text-emerald-500";
            }

            return (
              <li
                key={index}
                className="flex items-start space-x-3 text-sm leading-relaxed border-b border-border/50 pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800/50"
              >
                <Icon className={`h-4 w-4 mt-1 shrink-0 ${iconColor}`} />
                <span className="font-normal text-card-foreground/90">{insight}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
