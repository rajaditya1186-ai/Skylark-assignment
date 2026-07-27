"use client";

import React, { useRef } from "react";
import { Download, FileDown, Clipboard, X, Printer, ShieldCheck, AlertCircle } from "lucide-react";
import { DashboardKPIs, DashboardCharts, DataQualitySummary } from "../../types";

interface ExecutiveReportProps {
  kpis: DashboardKPIs;
  charts: DashboardCharts;
  dataQuality: DataQualitySummary;
  insights: string[];
  narrative: string;
  onClose: () => void;
  deals: any[];
  workOrders: any[];
}

export const ExecutiveReport: React.FC<ExecutiveReportProps> = ({
  kpis,
  charts,
  dataQuality,
  insights,
  narrative,
  onClose,
  deals,
  workOrders
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  };

  // Helper to copy summary to clipboard
  const handleCopySummary = () => {
    if (!narrative) {
      // Fallback if no narrative is loaded yet
      const fallbackSummary = `Skylark Drones Executive Summary: Total Active Pipeline of ${formatCurrency(kpis.total_pipeline.value)}. Open Opportunities: ${kpis.open_opportunities.value}. Q3 Forecasted Revenue: ${formatCurrency(kpis.current_quarter_pipeline.value)}.`;
      navigator.clipboard.writeText(fallbackSummary);
    } else {
      navigator.clipboard.writeText(narrative);
    }
    alert("Executive Summary copied to clipboard!");
  };

  // Helper to trigger browser print
  const handleExportPDF = () => {
    window.print();
  };

  // Helper to export CSV
  const handleExportCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("No data available to export.");
      return;
    }
    
    // Clean keys for output
    const rawKeys = Object.keys(data[0]);
    const headers = rawKeys.join(",");
    
    const rows = data.map((item) =>
      rawKeys
        .map((key) => {
          const val = item[key];
          if (val === undefined || val === null) return '""';
          const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
          return `"${valStr.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 overflow-y-auto backdrop-blur-sm p-4 md:p-8 flex justify-center print:static print:bg-white print:p-0 print:overflow-visible">
      <div className="w-full max-w-5xl bg-card border border-border shadow-2xl rounded-2xl p-6 md:p-8 relative print:border-none print:shadow-none print:rounded-none print:p-0">
        
        {/* Header Controls (Hidden on print) */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border/80 dark:border-zinc-800 print:hidden">
          <div>
            <h2 className="text-lg font-bold">Executive Mode</h2>
            <p className="text-xs text-muted-foreground">Preview, export, and download leadership intelligence</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent cursor-pointer transition font-semibold"
            >
              <Clipboard className="h-3.5 w-3.5" />
              <span>Copy Summary</span>
            </button>
            <button
              onClick={() => handleExportCSV(deals, "skylark_deals_export")}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent cursor-pointer transition font-semibold"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Export Deals CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-md cursor-pointer transition font-semibold"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export to PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 border border-border rounded-md hover:bg-accent transition text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div ref={reportRef} className="space-y-8 print:space-y-6 print:text-black">
          {/* Document Header */}
          <div className="text-center md:text-left border-b-2 border-primary/20 pb-4">
            <div className="flex justify-between items-end flex-col md:flex-row">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground print:text-black">
                  Skylark Drones — Weekly Leadership Report
                </h1>
                <p className="text-sm text-muted-foreground print:text-zinc-600 mt-1">
                  Commercial Pipeline & Delivery Operations Assessment
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground print:text-zinc-500 mt-2 md:mt-0 font-medium">
                Current As Of: <span className="font-semibold text-foreground print:text-black">2026-07-27</span>
              </div>
            </div>
          </div>

          {/* KPIs Block */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 print:text-zinc-700">
              Key Metrics Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { title: "Total Pipeline", val: formatCurrency(kpis.total_pipeline.value) },
                { title: "Weighted Value", val: formatCurrency(kpis.weighted_pipeline.value) },
                { title: "Active Opportunities", val: kpis.open_opportunities.value },
                { title: "Q3 Close Target", val: formatCurrency(kpis.current_quarter_pipeline.value) },
                { title: "Completed Projects", val: kpis.completed_work_orders.value },
                { title: "Delayed Projects", val: kpis.delayed_work_orders.value }
              ].map((item, idx) => (
                <div key={idx} className="border border-border/80 rounded-lg p-3 text-center bg-card dark:border-zinc-800 print:border-zinc-300">
                  <div className="text-[10px] text-muted-foreground print:text-zinc-500 font-semibold uppercase tracking-wider mb-1">
                    {item.title}
                  </div>
                  <div className="text-sm md:text-base font-bold text-foreground print:text-black">{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Summary Narrative */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/60 pb-1.5 print:text-zinc-700 print:border-zinc-300">
                Executive Narrative Summary
              </h3>
              <div className="text-sm leading-relaxed text-foreground/95 print:text-black whitespace-pre-wrap">
                {narrative || (
                  <p className="italic text-muted-foreground">
                    Generating dynamic leadership narration summary... Please click 'Copy Summary' or compile from chat console.
                  </p>
                )}
              </div>
            </div>

            {/* AI Insights & Data Quality Panel side-by-side */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/60 pb-1.5 mb-3 print:text-zinc-700 print:border-zinc-300">
                  Business Indicators
                </h3>
                <ul className="space-y-2 text-xs">
                  {insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5 leading-relaxed">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-muted-foreground print:text-zinc-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/60 pb-1.5 mb-3 print:text-zinc-700 print:border-zinc-300">
                  Data Quality Status
                </h3>
                <div className="space-y-2 text-[11px]">
                  {[
                    { label: "Missing Close Dates", count: dataQuality.missing_close_dates.count },
                    { label: "Missing Deal Owners", count: dataQuality.missing_owners.count },
                    { label: "Missing Status", count: dataQuality.missing_status.count },
                    { label: "Duplicate Records", count: dataQuality.duplicate_deals.count }
                  ].map((dq, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-border/40 last:border-0 dark:border-zinc-800/40">
                      <span className="text-muted-foreground print:text-zinc-600">{dq.label}</span>
                      <span className="font-semibold text-foreground print:text-black">{dq.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Summary for Print Layout (renders text table of charts for maximum readability on PDF prints!) */}
          <div className="pt-4 border-t border-border/60 dark:border-zinc-800 print:border-zinc-400">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 print:text-zinc-700">
              Commercial Deal Stage Ledger
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-border/60 dark:divide-zinc-800">
                <thead>
                  <tr className="text-muted-foreground font-semibold">
                    <th className="pb-2">Sales Stage</th>
                    <th className="pb-2 text-right">Deal Count</th>
                    <th className="pb-2 text-right">Aggregate Pipeline Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 dark:divide-zinc-800/30">
                  {charts.pipeline_stage.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="py-2 font-medium">{row.stage}</td>
                      <td className="py-2 text-right">{row.count}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
