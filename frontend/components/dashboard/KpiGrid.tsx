"use client";

import React from "react";
import { DollarSign, Percent, AlertCircle, FileText, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import { DashboardKPIs } from "../../types";

interface KpiGridProps {
  kpis: DashboardKPIs;
  loading: boolean;
  error: string | null;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ kpis, loading, error }) => {
  // Number formatter helper
  const formatValue = (key: keyof DashboardKPIs, value: number) => {
    if (key === "open_opportunities" || key === "completed_work_orders" || key === "delayed_work_orders") {
      return value.toLocaleString();
    }
    
    // Currency format ($)
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const kpiConfig = [
    {
      key: "total_pipeline" as keyof DashboardKPIs,
      title: "Total Active Pipeline",
      icon: DollarSign,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    {
      key: "weighted_pipeline" as keyof DashboardKPIs,
      title: "Weighted Pipeline",
      icon: Percent,
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    {
      key: "open_opportunities" as keyof DashboardKPIs,
      title: "Open Opportunities",
      icon: FileText,
      color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    },
    {
      key: "current_quarter_pipeline" as keyof DashboardKPIs,
      title: "Current Quarter Pipeline",
      icon: TrendingUp,
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    {
      key: "completed_work_orders" as keyof DashboardKPIs,
      title: "Completed Work Orders",
      icon: CheckCircle2,
      color: "bg-green-500/10 text-green-500 border-green-500/20",
    },
    {
      key: "delayed_work_orders" as keyof DashboardKPIs,
      title: "Delayed Work Orders",
      icon: AlertTriangle,
      color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      {kpiConfig.map((config) => {
        const Icon = config.icon;
        const kpi = kpis[config.key];
        
        return (
          <div
            key={config.title}
            className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-sm relative overflow-hidden dark:bg-zinc-900/50 dark:border-zinc-800"
          >
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-2">
                <AlertCircle className="h-5 w-5 text-rose-500 mb-1" />
                <span className="text-[10px] text-muted-foreground font-medium">Error loading data</span>
              </div>
            ) : loading ? (
              <div className="space-y-2 animate-pulse py-2">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-16 bg-muted rounded"></div>
                  <div className="h-7 w-7 bg-muted rounded-full"></div>
                </div>
                <div className="h-6 w-24 bg-muted rounded"></div>
                <div className="h-3 w-32 bg-muted rounded"></div>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
                    {config.title}
                  </span>
                  <div className={`p-1.5 rounded-lg border ${config.color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold tracking-tight mb-1">
                    {formatValue(config.key, kpi?.value || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {kpi?.description || ""}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
