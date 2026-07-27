"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "../services/api";
import {
  DashboardKPIs,
  DashboardCharts,
  DataQualitySummary,
  ChartPipelineStage,
  ChartRevenueForecast,
  ChartWorkOrder,
  ChartTopDeal,
  ChartProbability,
  ChartOpportunityDistribution
} from "../types";

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  owner: string;
  dealStage: string;
  woStatus: string;
  minProbability: number;
  maxProbability: number;
  search: string;
}

const DEFAULT_FILTERS: DashboardFilters = {
  startDate: "",
  endDate: "",
  owner: "all",
  dealStage: "all",
  woStatus: "all",
  minProbability: 0,
  maxProbability: 100,
  search: ""
};

const STAGE_PROBABILITIES: Record<string, number> = {
  "A. Lead Generated": 10.0,
  "Lead": 10.0,
  "B. Sales Qualified Leads": 20.0,
  "C. Demo Done": 30.0,
  "D. Feasibility": 40.0,
  "I. Poc": 40.0,
  "E. Proposal/Commercials Sent": 60.0,
  "Proposal": 60.0,
  "F. Negotiations": 80.0,
  "Negotiation": 80.0,
  "H. Work Order Received": 95.0,
  "J. Invoice Sent": 95.0,
  "G. Project Won": 100.0,
  "Won": 100.0,
  "Project Completed": 100.0,
  "K. Amount Accrued": 100.0,
  "L. Project Lost": 0.0,
  "Lost": 0.0,
  "M. Projects On Hold": 0.0,
  "N. Not Relevant At The Moment": 0.0,
  "O. Not Relevant At All": 0.0
};

export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Raw data from backend /boards endpoint (which contains raw deals and work orders)
  const [deals, setDeals] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  
  // Filters
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  // Fetch raw data
  const fetchData = useCallback(async (refresh: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBoardsData(refresh);
      setDeals(data.deals || []);
      setWorkOrders(data.work_orders || []);
      setMetadata(data.metadata || null);
    } catch (err: any) {
      console.error("Failed to fetch dashboard board data:", err);
      setError(err.detail || "Failed to load live data from Monday.com boards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique owners & stages for filter dropdowns
  const filterOptions = useMemo(() => {
    const owners = new Set<string>();
    const stages = new Set<string>();
    const statuses = new Set<string>();

    deals.forEach((deal) => {
      if (deal.owner) owners.add(deal.owner);
      if (deal.stage) stages.add(deal.stage);
    });

    workOrders.forEach((wo) => {
      if (wo.assigned_to) owners.add(wo.assigned_to);
      if (wo.status) statuses.add(wo.status);
    });

    return {
      owners: Array.from(owners).sort(),
      stages: Array.from(stages).sort(),
      statuses: Array.from(statuses).sort()
    };
  }, [deals, workOrders]);

  // Apply filters to Deals list
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // 1. Search filter (match name or client)
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const nameMatch = deal.name?.toLowerCase().includes(query);
        const clientMatch = deal.client?.toLowerCase().includes(query);
        if (!nameMatch && !clientMatch) return false;
      }

      // 2. Owner filter
      if (filters.owner !== "all" && deal.owner !== filters.owner) {
        return false;
      }

      // 3. Stage filter
      if (filters.dealStage !== "all" && deal.stage !== filters.dealStage) {
        return false;
      }

      // 4. Probability range filter
      const prob = deal.probability || STAGE_PROBABILITIES[deal.stage] || 0;
      if (prob < filters.minProbability || prob > filters.maxProbability) {
        return false;
      }

      // 5. Date filter
      if (deal.expected_close_date) {
        const date = deal.expected_close_date;
        if (filters.startDate && date < filters.startDate) return false;
        if (filters.endDate && date > filters.endDate) return false;
      } else if (filters.startDate || filters.endDate) {
        // If date filters exist but close date is missing, exclude it
        return false;
      }

      return true;
    });
  }, [deals, filters]);

  // Apply filters to Work Orders list
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      // 1. Search filter (match project name)
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const nameMatch = wo.name?.toLowerCase().includes(query);
        if (!nameMatch) return false;
      }

      // 2. Owner (Assignee) filter
      if (filters.owner !== "all" && wo.assigned_to !== filters.owner) {
        return false;
      }

      // 3. Status filter
      if (filters.woStatus !== "all" && wo.status !== filters.woStatus) {
        return false;
      }

      // 4. Date filter (Due Date)
      if (wo.due_date) {
        const date = wo.due_date;
        if (filters.startDate && date < filters.startDate) return false;
        if (filters.endDate && date > filters.endDate) return false;
      } else if (filters.startDate || filters.endDate) {
        return false;
      }

      return true;
    });
  }, [workOrders, filters]);

  // Helper to normalize status categories
  const getNormalizedStatus = useCallback((statusStr: string): string => {
    if (!statusStr) return "Pending";
    const s = statusStr.trim().lowerCase?.() || statusStr.trim().toLowerCase();
    if (["completed", "complete", "won", "done"].includes(s)) return "Completed";
    if (["in progress", "inprogress", "active", "executed until current month"].includes(s)) return "In Progress";
    if (["delayed", "overdue", "blocked"].includes(s)) return "Delayed";
    if (["cancelled", "canceled", "lost", "stopped"].includes(s)) return "Cancelled";
    return "Pending";
  }, []);

  // Compute metrics dynamically from filtered datasets
  const kpis = useMemo<DashboardKPIs>(() => {
    const openDeals = filteredDeals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
    
    // 1. Total active pipeline
    const totalPipeline = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    // 2. Weighted active pipeline
    const weightedPipeline = openDeals.reduce((sum, d) => {
      let prob = d.probability;
      if (prob === undefined || prob === null || prob === 0.0) {
        prob = STAGE_PROBABILITIES[d.stage] || 20.0;
      }
      const factor = prob <= 1.0 ? prob : prob / 100.0;
      return sum + (d.value || 0) * factor;
    }, 0);

    // 3. Open opportunities count
    const openCount = openDeals.length;

    // 4. Current Quarter Pipeline (Q3 2026: 2026-07-01 to 2026-09-30)
    const qStart = "2026-07-01";
    const qEnd = "2026-09-30";
    const qDeals = openDeals.filter(d => d.expected_close_date && d.expected_close_date >= qStart && d.expected_close_date <= qEnd);
    const qPipeline = qDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    // 5. Completed Work Orders
    const completedWO = filteredWorkOrders.filter(w => getNormalizedStatus(w.status) === "Completed").length;

    // 6. Delayed Work Orders (Status is Delayed or Incomplete and past current date 2026-07-27)
    const currentDate = "2026-07-27";
    const delayedWO = filteredWorkOrders.filter(w => {
      const status = getNormalizedStatus(w.status);
      const isOverdue = status !== "Completed" && w.due_date && w.due_date < currentDate;
      return status === "Delayed" || isOverdue;
    }).length;

    return {
      total_pipeline: { value: totalPipeline, description: "Total value of all open deals" },
      weighted_pipeline: { value: weightedPipeline, description: "Risk-adjusted active value" },
      open_opportunities: { value: openCount, description: "Active sales opportunities" },
      current_quarter_pipeline: { value: qPipeline, description: `Forecasted to close in Q3 (${qDeals.length} deals)` },
      completed_work_orders: { value: completedWO, description: "Successfully delivered contracts" },
      delayed_work_orders: { value: delayedWO, description: "Projects experiencing execution delays" }
    };
  }, [filteredDeals, filteredWorkOrders, getNormalizedStatus]);

  // Compute charts data dynamically
  const charts = useMemo<DashboardCharts>(() => {
    const openDeals = filteredDeals.filter(d => d.stage !== "Won" && d.stage !== "Lost");

    // 1. Pipeline by Stage
    const stageMap: Record<string, { value: number; count: number }> = {};
    openDeals.forEach((deal) => {
      const stage = deal.stage || "Unknown";
      if (!stageMap[stage]) stageMap[stage] = { value: 0, count: 0 };
      stageMap[stage].value += deal.value || 0;
      stageMap[stage].count += 1;
    });
    const pipelineStage: ChartPipelineStage[] = Object.keys(stageMap)
      .map(stage => ({ stage, value: stageMap[stage].value, count: stageMap[stage].count }))
      .sort((a, b) => b.value - a.value);

    // 2. Revenue Forecast (Next 6 calendar months starting 2026-07)
    const forecastMonths = ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];
    const forecastMap = forecastMonths.reduce((map, month) => {
      map[month] = { unweighted: 0, weighted: 0, count: 0 };
      return map;
    }, {} as Record<string, { unweighted: number; weighted: number; count: number }>);

    openDeals.forEach((deal) => {
      if (deal.expected_close_date) {
        const monthStr = deal.expected_close_date.substring(0, 7);
        if (forecastMap[monthStr] !== undefined) {
          let prob = deal.probability;
          if (prob === undefined || prob === null || prob === 0.0) {
            prob = STAGE_PROBABILITIES[deal.stage] || 20.0;
          }
          const factor = prob <= 1.0 ? prob : prob / 100.0;
          
          forecastMap[monthStr].unweighted += deal.value || 0;
          forecastMap[monthStr].weighted += (deal.value || 0) * factor;
          forecastMap[monthStr].count += 1;
        }
      }
    });
    const revenueForecast: ChartRevenueForecast[] = forecastMonths.map(month => ({
      month,
      unweighted_value: Math.round(forecastMap[month].unweighted * 100) / 100,
      weighted_value: Math.round(forecastMap[month].weighted * 100) / 100,
      deal_count: forecastMap[month].count
    }));

    // 3. Work Order Status Counts
    const statusCategories = ["Completed", "In Progress", "Pending", "Delayed", "Cancelled"];
    const statusMap = statusCategories.reduce((map, cat) => {
      map[cat] = 0;
      return map;
    }, {} as Record<string, number>);

    filteredWorkOrders.forEach((wo) => {
      const cat = getNormalizedStatus(wo.status);
      if (statusMap[cat] !== undefined) {
        statusMap[cat] += 1;
      }
    });
    const workOrdersChart: ChartWorkOrder[] = statusCategories.map(status => ({
      status,
      count: statusMap[status]
    }));

    // 4. Top 10 Highest Value Deals
    const topDeals: ChartTopDeal[] = [...openDeals]
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 10)
      .map(deal => ({
        name: deal.name || "Unnamed Deal",
        value: deal.value || 0,
        stage: deal.stage || "None",
        expected_close_date: deal.expected_close_date || "None"
      }));

    // 5. Probability Distribution buckets
    const probabilityBuckets = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];
    const probCounts = probabilityBuckets.reduce((map, bucket) => {
      map[bucket] = 0;
      return map;
    }, {} as Record<string, number>);

    openDeals.forEach((deal) => {
      const prob = deal.probability || STAGE_PROBABILITIES[deal.stage] || 0;
      const pct = prob <= 1.0 ? prob * 100.0 : prob;
      if (pct <= 20) probCounts["0-20%"] += 1;
      else if (pct <= 40) probCounts["20-40%"] += 1;
      else if (pct <= 60) probCounts["40-60%"] += 1;
      else if (pct <= 80) probCounts["60-80%"] += 1;
      else probCounts["80-100%"] += 1;
    });
    const probabilityDistribution: ChartProbability[] = probabilityBuckets.map(range => ({
      range,
      count: probCounts[range]
    }));

    // 6. Opportunity Distribution (Open vs Won vs Lost)
    const stagesCounts = filteredDeals.reduce((map, deal) => {
      const stage = deal.stage;
      if (stage === "Won") map.won += 1;
      else if (stage === "Lost") map.lost += 1;
      else map.open += 1;
      return map;
    }, { open: 0, won: 0, lost: 0 });

    const opportunityDistribution: ChartOpportunityDistribution[] = [
      { name: "Open", value: stagesCounts.open },
      { name: "Won", value: stagesCounts.won },
      { name: "Lost", value: stagesCounts.lost }
    ];

    return {
      pipeline_stage: pipelineStage,
      revenue_forecast: revenueForecast,
      work_orders: workOrdersChart,
      top_deals: topDeals,
      probability_distribution: probabilityDistribution,
      opportunity_distribution: opportunityDistribution
    };
  }, [filteredDeals, filteredWorkOrders, getNormalizedStatus]);

  // Compute Data Quality metrics dynamically
  const dataQuality = useMemo<DataQualitySummary>(() => {
    const totalDeals = filteredDeals.length;
    const totalWO = filteredWorkOrders.length;

    // 1. Missing Expected Close Dates
    const missingDates = filteredDeals.filter(d => d.stage !== "Won" && d.stage !== "Lost" && (!d.expected_close_date || d.expected_close_date.trim() === "")).length;
    const datesStatus = missingDates === 0 ? "green" : (missingDates / max(totalDeals, 1) <= 0.3 ? "yellow" : "red");

    // 2. Missing Owners
    const missingOwners = filteredDeals.filter(d => !d.owner || d.owner.trim() === "").length;
    const ownersStatus = missingOwners === 0 ? "green" : (missingOwners / max(totalDeals, 1) <= 0.3 ? "yellow" : "red");

    // 3. Missing Status
    const missingStatus = filteredWorkOrders.filter(w => !w.status || w.status.trim() === "").length;
    const statusStatus = missingStatus === 0 ? "green" : (missingStatus / max(totalWO, 1) <= 0.1 ? "yellow" : "red");

    // 4. Duplicate Deals (determined from backend drop metadata or estimated)
    const duplicateDeals = metadata?.deals?.dropped_rows || 0;
    const dupStatus = duplicateDeals === 0 ? "green" : "yellow";

    // 5. Invalid values (e.g. unparseable values)
    const invalidCount = 0; // standard clean logic handles it, fallback to zero for badge
    const invalidStatus = "green";

    // 6. Missing Columns
    const missingColumns = metadata?.deals?.missing_board_columns || [];
    const colsStatus = missingColumns.length === 0 ? "green" : (missingColumns.length <= 2 ? "yellow" : "red");

    return {
      missing_close_dates: { count: missingDates, status: datesStatus },
      missing_owners: { count: missingOwners, status: ownersStatus },
      missing_status: { count: missingStatus, status: statusStatus },
      duplicate_deals: { count: duplicateDeals, status: dupStatus },
      invalid_values: { count: invalidCount, status: invalidStatus },
      missing_columns: { count: missingColumns.length, details: missingColumns, status: colsStatus }
    };
  }, [filteredDeals, filteredWorkOrders, metadata]);

  // Generate dynamic AI Insights based on filtered metrics
  const insights = useMemo<string[]>(() => {
    const list: string[] = [];
    const totalPipe = kpis.total_pipeline.value;

    // Insight 1: Stage concentration
    const stages = charts.pipeline_stage;
    if (stages && stages.length > 0) {
      const topStage = stages[0];
      const topStageVal = topStage.value;
      const pct = (topStageVal / max(totalPipe, 1)) * 100;
      if (pct > 40.0) {
        list.append?.(`Most active pipeline value sits in '${topStage.stage}' stage (${pct.toFixed(0)}% of total).`) ||
        list.push(`Most active pipeline value sits in '${topStage.stage}' stage (${pct.toFixed(0)}% of total).`);
      }
    }

    // Insight 2: Q3 Close counts
    const qDealsCount = filteredDeals.filter(d => d.stage !== "Won" && d.stage !== "Lost" && d.expected_close_date && d.expected_close_date >= "2026-07-01" && d.expected_close_date <= "2026-09-30").length;
    list.push(`Only ${qDealsCount} opportunities are expected to close this quarter, limiting near-term volume.`);

    // Insight 3: Missing dates
    const missingDates = dataQuality.missing_close_dates.count;
    if (missingDates > 0) {
      list.push(`${missingDates} opportunities have no close date, lowering Q3/Q4 forecasting accuracy.`);
    }

    // Insight 4: Deal Value Concentration
    const topDealsList = charts.top_deals;
    if (topDealsList && topDealsList.length > 0) {
      const top5Val = topDealsList.slice(0, 5).reduce((sum, d) => sum + d.value, 0);
      const pct = (top5Val / max(totalPipe, 1)) * 100;
      if (pct > 50) {
        list.push(`Pipeline heavily concentrated in top 5 opportunities (${pct.toFixed(0)}% of total active value).`);
      }
    }

    // Insight 5: Forecast confidence
    const confidence = dataQuality.missing_close_dates.count === 0 ? "High" : (pct_missing(dataQuality.missing_close_dates.count, filteredDeals.length) <= 30 ? "Medium" : "Low");
    list.push(`Revenue forecast confidence: ${confidence}.`);

    return list;
  }, [kpis, charts, dataQuality, filteredDeals]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    loading,
    error,
    deals: filteredDeals,
    workOrders: filteredWorkOrders,
    kpis,
    charts,
    dataQuality,
    insights,
    filters,
    filterOptions,
    setFilters,
    resetFilters,
    refreshData: () => fetchData(true)
  };
}

// Helpers
function max(a: number, b: number): number {
  return a > b ? a : b;
}

function pct_missing(missing: number, total: number): number {
  if (total === 0) return 0;
  return (missing / total) * 100;
}
