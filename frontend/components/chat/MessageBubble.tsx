"use client";

import { useState, useEffect } from "react";
import { User, Terminal, Database, ChevronDown, ChevronUp, AlertCircle, AlertTriangle } from "lucide-react";
import { ChatMessage } from "../../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  Cell
} from "recharts";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [showData, setShowData] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderInlineMarkdown = (text: string) => {
    // Match bold text formatting **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground dark:text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const parseMarkdownToJsx = (text: string) => {
    if (!text) return null;
    
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();

      // Empty line / paragraph gap
      if (trimmed === "") {
        return <div key={i} className="h-2" />;
      }

      // Main analytical headings in bold (e.g. **Executive Summary**, **Insights**, etc.)
      const headingMatch = trimmed.match(/^\*\*(Executive Summary|Insights|Risks|Recommendations)\*\*$/);
      if (headingMatch) {
        return (
          <h4 key={i} className="text-xs font-semibold text-accent uppercase tracking-wider mt-4 mb-1.5 first:mt-1">
            {headingMatch[1]}
          </h4>
        );
      }

      // Check for bullet points
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemContent = trimmed.replace(/^(-\s*|\*\s*)/, "");
        return (
          <li key={i} className="ml-4 list-disc text-sm text-foreground/90 my-1">
            {renderInlineMarkdown(itemContent)}
          </li>
        );
      }

      // Standard text line
      return (
        <p key={i} className="text-sm text-foreground/95 leading-relaxed my-1">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"} my-2`}>
      {/* Sender Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-surface border border-border text-accent">
          <Terminal className="h-4 w-4" />
        </div>
      )}

      {/* Bubble Container */}
      <div className="flex flex-col max-w-[85%] md:max-w-[70%]">
        {/* Name Header */}
        <div className={`flex items-center gap-1.5 text-xs text-muted-foreground mb-1 px-1 ${isUser ? "justify-end" : "justify-start"}`}>
          <span>{isUser ? "You" : "BI Analyst Agent"}</span>
          <span>•</span>
          <span className="text-[10px]">{message.timestamp}</span>
        </div>

        {/* Message bubble itself */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm border ${
            isUser
              ? "bg-accent border-accent/20 text-accent-foreground rounded-tr-none"
              : "bg-surface border-border text-foreground rounded-tl-none"
          }`}
        >
          {isUser ? (
            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="space-y-1">
              {parseMarkdownToJsx(message.content)}
            </div>
          )}

          {/* Inline Chat Integration Charts */}
          {!isUser && mounted && message.structured_summary?.charts && (
            (() => {
              const charts = message.structured_summary.charts;
              const textLower = message.content.toLowerCase();
              const isPipelineQuery = textLower.includes("pipeline") || textLower.includes("expected close") || textLower.includes("executive summary");
              const isWorkOrderQuery = textLower.includes("work order") || textLower.includes("delayed") || textLower.includes("status");
              const isTopOpportunities = textLower.includes("opportunity") || textLower.includes("top") || textLower.includes("highest value");

              return (
                <div className="mt-4 pt-4 border-t border-border/60 dark:border-zinc-800 space-y-4">
                  {isPipelineQuery && (
                    <div className="space-y-4">
                      {/* Pipeline by Stage Chart */}
                      {charts.pipeline_stage && charts.pipeline_stage.length > 0 && (
                        <div className="bg-background/40 border border-border/60 rounded-xl p-3 dark:bg-zinc-950/40 dark:border-zinc-850">
                          <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pipeline by Deal Stage</h5>
                          <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={charts.pipeline_stage} layout="vertical" margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                                <XAxis type="number" stroke="#888888" fontSize={9} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                                <YAxis dataKey="stage" type="category" stroke="#888888" fontSize={8} tickLine={false} width={80} />
                                <Tooltip
                                  formatter={(val: any) => [`$${val.toLocaleString()}`, "Value"]}
                                  contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "6px", fontSize: "10px" }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Revenue Forecast Chart */}
                      {charts.revenue_forecast && charts.revenue_forecast.length > 0 && (
                        <div className="bg-background/40 border border-border/60 rounded-xl p-3 dark:bg-zinc-950/40 dark:border-zinc-850">
                          <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">6-Month Revenue Forecast</h5>
                          <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={charts.revenue_forecast} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                                <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} />
                                <YAxis stroke="#888888" fontSize={9} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                                <Tooltip
                                  formatter={(val: any) => [`$${val.toLocaleString()}`, "Value"]}
                                  contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "6px", fontSize: "10px" }}
                                />
                                <Line type="monotone" dataKey="unweighted_value" name="Unweighted" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="weighted_value" name="Weighted" stroke="#10b981" strokeWidth={1.5} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isWorkOrderQuery && (
                    <div className="space-y-4">
                      {/* Work Order Status Distribution */}
                      {charts.work_orders && charts.work_orders.length > 0 && (
                        <div className="bg-background/40 border border-border/60 rounded-xl p-3 dark:bg-zinc-950/40 dark:border-zinc-850">
                          <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Order Status Distribution</h5>
                          <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={charts.work_orders} layout="vertical" margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                                <XAxis type="number" stroke="#888888" fontSize={9} tickLine={false} allowDecimals={false} />
                                <YAxis dataKey="status" type="category" stroke="#888888" fontSize={9} tickLine={false} width={70} />
                                <Tooltip
                                  formatter={(val: any) => [val, "Count"]}
                                  contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "6px", fontSize: "10px" }}
                                />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 3, 3, 0]}>
                                  {charts.work_orders.map((entry: any, index: number) => {
                                    const colors: Record<string, string> = { Completed: "#10b981", "In Progress": "#3b82f6", Pending: "#94a3b8", Delayed: "#f43f5e", Cancelled: "#475569" };
                                    return <Cell key={`cell-${index}`} fill={colors[entry.status] || "#8b5cf6"} />;
                                  })}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Delayed Work Orders Table */}
                      {message.structured_summary.delayed_work_orders?.delayed_items?.length > 0 && (
                        <div className="bg-background/40 border border-border/60 rounded-xl p-3 dark:bg-zinc-950/40 dark:border-zinc-850">
                          <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1 text-rose-500">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Active Delayed Work Orders</span>
                          </h5>
                          <div className="overflow-x-auto text-[11px] max-h-40 overflow-y-auto">
                            <table className="min-w-full divide-y divide-border/60">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="pb-1 font-semibold">Project Name</th>
                                  <th className="pb-1 font-semibold">Assignee</th>
                                  <th className="pb-1 font-semibold text-right">Due Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/30">
                                {message.structured_summary.delayed_work_orders.delayed_items.map((item: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-muted/30">
                                    <td className="py-1 font-medium max-w-[120px] truncate">{item.name}</td>
                                    <td className="py-1 text-muted-foreground">{item.assigned_to || "Unassigned"}</td>
                                    <td className="py-1 text-right text-rose-500 font-semibold">{item.due_date}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isTopOpportunities && charts.top_deals && charts.top_deals.length > 0 && (
                    <div className="bg-background/40 border border-border/60 rounded-xl p-3 dark:bg-zinc-950/40 dark:border-zinc-850">
                      <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top 10 Highest Value Deals</h5>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={charts.top_deals} layout="vertical" margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                            <XAxis type="number" stroke="#888888" fontSize={9} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                            <YAxis dataKey="name" type="category" stroke="#888888" fontSize={8} tickLine={false} width={90} />
                            <Tooltip
                              formatter={(val: any) => [`$${val.toLocaleString()}`, "Value"]}
                              contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "6px", fontSize: "10px" }}
                            />
                            <Bar dataKey="value" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* Missing Data Disclosure Badge */}
          {!isUser && message.data_complete === false && message.missing_data_notes && (
            <div className="mt-3 p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-warning text-[11px] leading-relaxed">
              <div className="flex items-center gap-1 font-semibold mb-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Data Completeness Disclosure</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {message.missing_data_notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Expandable Raw Data View */}
        {!isUser && message.structured_summary && (
          <div className="mt-1.5 self-start">
            <button
              onClick={() => setShowData(!showData)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent font-medium bg-transparent border-0 cursor-pointer focus:outline-none"
            >
              <Database className="h-3 w-3" />
              <span>{showData ? "Hide Structured Data" : "View Structured Data"}</span>
              {showData ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showData && (
              <div className="mt-2 w-full max-w-lg overflow-x-auto rounded-lg border border-border bg-surface-elevated p-3 text-[10px] font-mono text-muted-foreground shadow-inner max-h-60">
                <pre>{JSON.stringify(message.structured_summary, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-accent text-accent-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
