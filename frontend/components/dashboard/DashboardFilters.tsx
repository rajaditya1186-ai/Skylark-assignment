"use client";

import React from "react";
import { Search, Calendar, User, BarChart2, CheckCircle2, Sliders, RotateCcw, RefreshCw } from "lucide-react";
import { DashboardFilters as FilterType } from "../../hooks/useDashboard";

interface DashboardFiltersProps {
  filters: FilterType;
  filterOptions: {
    owners: string[];
    stages: string[];
    statuses: string[];
  };
  setFilters: React.Dispatch<React.SetStateAction<FilterType>>;
  resetFilters: () => void;
  refreshData: () => void;
  loading: boolean;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  filterOptions,
  setFilters,
  resetFilters,
  refreshData,
  loading
}) => {
  const handleChange = (key: keyof FilterType, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-sm space-y-4 dark:bg-zinc-900/50 dark:border-zinc-800">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Search Opportunity / Client</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => handleChange("search", e.target.value)}
              className="pl-9 pr-3 py-2 w-full text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring bg-background dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
        </div>

        {/* Owner */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Owner / Assignee</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              value={filters.owner}
              onChange={(e) => handleChange("owner", e.target.value)}
              className="pl-9 pr-3 py-2 w-full text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring bg-background appearance-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="all">All Owners</option>
              {filterOptions.owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Deal Stage */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Deal Stage</label>
          <div className="relative">
            <BarChart2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              value={filters.dealStage}
              onChange={(e) => handleChange("dealStage", e.target.value)}
              className="pl-9 pr-3 py-2 w-full text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring bg-background appearance-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="all">All Stages</option>
              {filterOptions.stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Work Order Status */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Work Order Status</label>
          <div className="relative">
            <CheckCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              value={filters.woStatus}
              onChange={(e) => handleChange("woStatus", e.target.value)}
              className="pl-9 pr-3 py-2 w-full text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring bg-background appearance-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="all">All Statuses</option>
              {filterOptions.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end pt-2 border-t border-border/60 dark:border-zinc-800/60">
        {/* Date Range Start */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Expected Close Start</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
              className="pl-9 pr-3 py-2 w-full text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring bg-background dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
        </div>

        {/* Date Range End */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Expected Close End</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              className="pl-9 pr-3 py-2 w-full text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring bg-background dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
        </div>

        {/* Probability Slider Range */}
        <div className="col-span-1 lg:col-span-1">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-medium text-muted-foreground">Probability Range</label>
            <span className="text-xs font-semibold">{filters.minProbability}% - {filters.maxProbability}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minProbability}
              onChange={(e) => handleChange("minProbability", parseInt(e.target.value))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={filters.maxProbability}
              onChange={(e) => handleChange("maxProbability", parseInt(e.target.value))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 justify-end lg:col-span-1">
          <button
            onClick={resetFilters}
            className="flex items-center space-x-1.5 px-3 py-2 text-sm border border-input rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition bg-background dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
          
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 cursor-pointer transition font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Sync Live Data"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
