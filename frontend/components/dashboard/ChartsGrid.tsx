"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from "recharts";
import { DashboardCharts } from "../../types";

interface ChartsGridProps {
  charts: DashboardCharts;
  loading: boolean;
}

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#f43f5e", "#06b6d4"];

export const ChartsGrid: React.FC<ChartsGridProps> = ({ charts, loading }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground animate-pulse text-sm">
        Initializing Dashboard Visualizations...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-80 animate-pulse space-y-4">
            <div className="h-4 w-32 bg-muted rounded"></div>
            <div className="h-56 bg-muted/40 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  // Currency formatter
  const formatCurrency = (val: any) => {
    if (typeof val !== "number") return val;
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Chart 1: Pipeline by Deal Stage */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pipeline by Deal Stage ($ Value)</h3>
        <div className="h-64">
          {charts.pipeline_stage.length === 0 ? (
            <NoDataPlaceholder />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.pipeline_stage}
                layout="vertical"
                margin={{ left: 50, right: 20, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                <XAxis type="number" tickFormatter={formatCurrency} stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis dataKey="stage" type="category" stroke="#888888" fontSize={10} tickLine={false} width={120} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), "Pipeline Value"]}
                  contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {charts.pipeline_stage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Open vs Won vs Lost */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Opportunity Stage Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          {charts.opportunity_distribution.length === 0 ? (
            <NoDataPlaceholder />
          ) : (
            <div className="w-full h-full flex flex-col md:flex-row items-center justify-around">
              <div className="w-full md:w-3/5 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.opportunity_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [value, "Opportunities"]}
                      contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col space-y-2 mt-4 md:mt-0 text-xs md:text-sm">
                {charts.opportunity_distribution.map((item, idx) => {
                  const colors = ["#3b82f6", "#10b981", "#f43f5e"];
                  return (
                    <div key={item.name} className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx] }}></div>
                      <span className="font-medium">{item.name}:</span>
                      <span className="text-muted-foreground">{item.value} deals</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart 3: Revenue Forecast */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">6-Month Commercial Revenue Forecast</h3>
        <div className="h-64">
          {charts.revenue_forecast.length === 0 ? (
            <NoDataPlaceholder />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.revenue_forecast} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), ""]}
                  contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="unweighted_value"
                  name="Unweighted Pipeline"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="weighted_value"
                  name="Weighted Forecast"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 4: Work Order Status */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Work Order Status Distribution</h3>
        <div className="h-64">
          {charts.work_orders.length === 0 ? (
            <NoDataPlaceholder />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.work_orders}
                layout="vertical"
                margin={{ left: 30, right: 20, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="status" type="category" stroke="#888888" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  formatter={(value: any) => [value, "Work Orders"]}
                  contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {charts.work_orders.map((entry, index) => {
                    const statusColors: Record<string, string> = {
                      Completed: "#10b981",
                      "In Progress": "#3b82f6",
                      Pending: "#94a3b8",
                      Delayed: "#f43f5e",
                      Cancelled: "#475569"
                    };
                    return (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.status] || "#8b5cf6"} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 5: Top 10 Highest Value Deals */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800 xl:col-span-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top 10 Highest Value Active Deals</h3>
        <div className="h-72">
          {charts.top_deals.length === 0 ? (
            <NoDataPlaceholder />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.top_deals}
                layout="vertical"
                margin={{ left: 50, right: 20, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                <XAxis type="number" tickFormatter={formatCurrency} stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={10} tickLine={false} width={130} />
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    `${formatCurrency(value)} (${props.payload.stage})`,
                    "Deal Value"
                  ]}
                  contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 6: Closure Probability Distribution */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800 xl:col-span-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Closure Probability Distribution (Deal Count)</h3>
        <div className="h-64">
          {charts.probability_distribution.length === 0 ? (
            <NoDataPlaceholder />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.probability_distribution} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                <XAxis dataKey="range" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value: any) => [value, "Deals"]}
                  contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

const NoDataPlaceholder: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
    No filtered data matches the current criteria.
  </div>
);
