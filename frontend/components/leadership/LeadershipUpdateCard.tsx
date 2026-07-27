"use client";

import { useRef, useState } from "react";
import { FileText, Copy, Check, Download, AlertTriangle, ArrowLeft, RefreshCw, Layers } from "lucide-react";

interface LeadershipUpdateCardProps {
  narrative: string;
  dataComplete: boolean;
  structuredSummary: any;
  missingDataNotes: string[] | null;
  onBack: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function LeadershipUpdateCard({
  narrative,
  dataComplete,
  structuredSummary,
  missingDataNotes,
  onBack,
  onRefresh,
  loading
}: LeadershipUpdateCardProps) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (!narrative) return;
    navigator.clipboard.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!narrative) return;
    const element = document.createElement("a");
    const file = new Blob([narrative], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Skylark_Leadership_Update_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Helper to format raw markdown into beautiful JSX report structures
  const parseReportMarkdown = (text: string) => {
    if (!text) return null;

    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();

      if (trimmed === "") {
        return <div key={i} className="h-3" />;
      }

      // Title/Main Header
      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={i} className="text-xl md:text-2xl font-bold text-foreground mt-4 mb-4 tracking-tight border-b border-border pb-2">
            {trimmed.slice(2)}
          </h1>
        );
      }

      // Section Headings (e.g. 1. **Commercial Pipeline** or **Delivery & Operations**)
      const sectionMatch = trimmed.match(/^(\d+\.\s+)?\*\*(.*?)\*\*$/) || trimmed.match(/^(###|##)\s+(.*?)$/);
      if (sectionMatch) {
        const titleText = sectionMatch[2] || sectionMatch[0].replace(/^(###|##)\s+/, "");
        return (
          <h2 key={i} className="text-base font-semibold text-accent mt-6 mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {titleText}
          </h2>
        );
      }

      // Bullet items
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const bulletText = trimmed.replace(/^(-\s*|\*\s*)/, "");
        return (
          <li key={i} className="ml-5 list-disc text-sm text-foreground/80 my-1.5 pl-1 leading-relaxed">
            {renderInlineFormat(bulletText)}
          </li>
        );
      }

      // Paragraph lines
      return (
        <p key={i} className="text-sm text-foreground/90 leading-relaxed my-2">
          {renderInlineFormat(trimmed)}
        </p>
      );
    });
  };

  const renderInlineFormat = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Extract metrics from structured summary
  const revenueMetrics = structuredSummary?.business_overview?.revenue || { total_revenue: 0, won_deals_count: 0 };
  const pipelineMetrics = structuredSummary?.business_overview?.pipeline || { total_pipeline_value: 0, weighted_pipeline_value: 0, active_deals_count: 0 };
  const deliveryMetrics = structuredSummary?.business_overview?.delivery || { total_work_orders: 0, completed_work_orders: 0, delayed_work_orders: 0, delay_rate: 0 };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 md:px-6 space-y-6">
      {/* Back Control and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Analyst Chat</span>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs font-medium hover:bg-surface-elevated disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Regenerate Update</span>
          </button>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-xs font-medium hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy Report"}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/90 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF/TXT</span>
          </button>
        </div>
      </div>

      {loading ? (
        /* Skeletons loader while generating */
        <div className="p-8 rounded-2xl border border-border bg-surface animate-pulse space-y-4">
          <div className="h-6 bg-border rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-border rounded-xl" />
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-border rounded w-full" />
            <div className="h-4 bg-border rounded w-5/6" />
            <div className="h-4 bg-border rounded w-4/5" />
          </div>
        </div>
      ) : (
        <>
          {/* 1. Metric Tiles Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Realized Revenue */}
            <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Realized Revenue
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg md:text-xl font-bold tabular-nums">
                  ${revenueMetrics.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                From {revenueMetrics.won_deals_count} won opportunities
              </span>
            </div>

            {/* Open Pipeline */}
            <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Open Pipeline
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg md:text-xl font-bold tabular-nums">
                  ${pipelineMetrics.total_pipeline_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Weighted: ${pipelineMetrics.weighted_pipeline_value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pipelineMetrics.active_deals_count} open)
              </span>
            </div>

            {/* Delayed Projects */}
            <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Delayed Delivery
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-lg md:text-xl font-bold tabular-nums ${deliveryMetrics.delayed_work_orders > 0 ? "text-destructive" : "text-success"}`}>
                  {deliveryMetrics.delayed_work_orders}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Overdue items requiring help
              </span>
            </div>

            {/* Delivery Delay Rate */}
            <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
              <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Delivery Delay Rate
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-lg md:text-xl font-bold tabular-nums ${deliveryMetrics.delay_rate > 0.15 ? "text-destructive" : deliveryMetrics.delay_rate > 0 ? "text-warning" : "text-success"}`}>
                  {(deliveryMetrics.delay_rate * 100).toFixed(1)}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Target acceptable threshold: &lt;15%
              </span>
            </div>
          </div>

          {/* 2. Incomplete Board Data Warning Banner */}
          {!dataComplete && missingDataNotes && (
            <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Assumed or Missing Data Warning</span>
                <ul className="list-disc pl-4 space-y-0.5 text-warning/90">
                  {missingDataNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 3. Narrative Report Document */}
          <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-1.5 px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              <span>Narrative Business Update</span>
            </div>
            <div ref={printRef} className="prose prose-invert max-w-none">
              {parseReportMarkdown(narrative || "")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
