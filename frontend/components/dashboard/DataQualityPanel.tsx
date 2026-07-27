"use client";

import React from "react";
import { Database, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { DataQualitySummary } from "../../types";

interface DataQualityPanelProps {
  dataQuality: DataQualitySummary;
  loading: boolean;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({ dataQuality, loading }) => {
  const getBadgeStyle = (status: "green" | "yellow" | "red") => {
    switch (status) {
      case "green":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "yellow":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "red":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getStatusLabel = (status: "green" | "yellow" | "red") => {
    switch (status) {
      case "green":
        return "Healthy";
      case "yellow":
        return "Warning";
      case "red":
        return "Critical";
      default:
        return "Unknown";
    }
  };

  const dqMetrics = [
    {
      label: "Missing expected close dates",
      item: dataQuality.missing_close_dates,
      impact: "Reduces forecast accuracy"
    },
    {
      label: "Missing account owners",
      item: dataQuality.missing_owners,
      impact: "Limits sales accountability"
    },
    {
      label: "Missing work order status",
      item: dataQuality.missing_status,
      impact: "Causes delivery tracking gaps"
    },
    {
      label: "Duplicate deal records",
      item: dataQuality.duplicate_deals,
      impact: "Inflates total pipeline values"
    },
    {
      label: "Invalid/unparseable values",
      item: dataQuality.invalid_values,
      impact: "Causes chart filtering skew"
    },
    {
      label: "Missing board columns (Schema)",
      item: dataQuality.missing_columns,
      impact: "Limits analytics functionality"
    }
  ];

  const overallHealthy = Object.values(dataQuality).every((item) => item.status === "green");

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Data Governance & Quality</h3>
        </div>
        {!loading && (
          <div className="flex items-center space-x-1 text-xs">
            {overallHealthy ? (
              <span className="flex items-center text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                All Healthy
              </span>
            ) : (
              <span className="flex items-center text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Attention Required
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dqMetrics.map((m, idx) => (
            <div
              key={idx}
              className="border border-border/60 rounded-lg p-3 flex flex-col justify-between dark:border-zinc-800"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-xs font-semibold text-card-foreground">{m.label}</span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${getBadgeStyle(
                    m.item.status
                  )}`}
                >
                  {m.item.count} ({getStatusLabel(m.item.status)})
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-muted-foreground italic">{m.impact}</span>
                {m.item.status === "green" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
