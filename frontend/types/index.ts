/**
 * Shared Type Definitions for the Frontend.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  data_complete?: boolean;
  structured_summary?: any;
  missing_data_notes?: string[];
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  answer: string;
  conversation_id: string;
  data_complete: boolean;
  structured_summary: any | null;
  missing_data_notes: string[] | null;
}

export interface LeadershipSummaryResponse {
  narrative: string;
  data_complete: boolean;
  structured_summary: any | null;
  missing_data_notes: string[] | null;
}

export interface ApiError {
  detail: string;
  error_type: string;
}

export interface BoardMetadata {
  deals: {
    missing_fields: Record<string, number>;
    dropped_rows: number;
    total_rows: number;
  };
  work_orders: {
    missing_fields: Record<string, number>;
    dropped_rows: number;
    total_rows: number;
  };
}

export interface BoardDataResponse {
  deals: any[];
  work_orders: any[];
  metadata: BoardMetadata;
}

export interface KpiItem {
  value: number;
  description: string;
}

export interface DashboardKPIs {
  total_pipeline: KpiItem;
  weighted_pipeline: KpiItem;
  open_opportunities: KpiItem;
  current_quarter_pipeline: KpiItem;
  completed_work_orders: KpiItem;
  delayed_work_orders: KpiItem;
}

export interface ChartPipelineStage {
  stage: string;
  value: number;
  count: number;
}

export interface ChartRevenueForecast {
  month: string;
  unweighted_value: number;
  weighted_value: number;
  deal_count: number;
}

export interface ChartWorkOrder {
  status: string;
  count: number;
}

export interface ChartTopDeal {
  name: string;
  value: number;
  stage: string;
  expected_close_date: string;
}

export interface ChartProbability {
  range: string;
  count: number;
}

export interface ChartOpportunityDistribution {
  name: string;
  value: number;
}

export interface DashboardCharts {
  pipeline_stage: ChartPipelineStage[];
  revenue_forecast: ChartRevenueForecast[];
  work_orders: ChartWorkOrder[];
  top_deals: ChartTopDeal[];
  probability_distribution: ChartProbability[];
  opportunity_distribution: ChartOpportunityDistribution[];
}

export interface DqItem {
  count: number;
  status: 'green' | 'yellow' | 'red';
  details?: string[];
}

export interface DataQualitySummary {
  missing_close_dates: DqItem;
  missing_owners: DqItem;
  missing_status: DqItem;
  duplicate_deals: DqItem;
  invalid_values: DqItem;
  missing_columns: DqItem;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  charts: DashboardCharts;
  insights: string[];
  data_quality: DataQualitySummary;
}

