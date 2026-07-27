"use client";

import { useState } from "react";
import Header from "../components/layout/Header";
import ChatWindow from "../components/chat/ChatWindow";
import LeadershipUpdateCard from "../components/leadership/LeadershipUpdateCard";
import { useChat } from "../hooks/useChat";
import { useLeadershipSummary } from "../hooks/useLeadershipSummary";
import { useDashboard } from "../hooks/useDashboard";
import { DashboardFilters } from "../components/dashboard/DashboardFilters";
import { KpiGrid } from "../components/dashboard/KpiGrid";
import { ChartsGrid } from "../components/dashboard/ChartsGrid";
import { InsightsPanel } from "../components/dashboard/InsightsPanel";
import { DataQualityPanel } from "../components/dashboard/DataQualityPanel";
import { ExecutiveReport } from "../components/dashboard/ExecutiveReport";
import { FileText, MessageSquare, BarChart3, AlertCircle } from "lucide-react";

export default function Home() {
  const [viewMode, setViewMode] = useState<"dashboard" | "chat" | "leadership">("dashboard");
  const [showExecutiveReport, setShowExecutiveReport] = useState(false);

  // Hook for Chat
  const {
    messages,
    loading: chatLoading,
    error: chatError,
    sendChatMessage,
    resetChat
  } = useChat();

  // Hook for Weekly Narrative Update (Mock or Live)
  const {
    narrative,
    loading: leadershipLoading,
    error: leadershipError,
    dataComplete,
    structuredSummary,
    missingDataNotes,
    fetchSummary
  } = useLeadershipSummary();

  // Hook for visual analytics and filtering
  const {
    loading: dashboardLoading,
    error: dashboardError,
    deals,
    workOrders,
    kpis,
    charts,
    dataQuality,
    insights,
    filters,
    filterOptions,
    setFilters,
    resetFilters,
    refreshData
  } = useDashboard();

  // Switch to Leadership update tab
  const handleTriggerLeadership = () => {
    setViewMode("leadership");
    if (!narrative) {
      fetchSummary();
    }
  };

  // Triggers "Executive Mode" overlay report
  const handleGenerateExecutiveReport = () => {
    if (!narrative) {
      fetchSummary();
    }
    setShowExecutiveReport(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Shared Header Bar */}
      <Header
        onTriggerLeadership={handleTriggerLeadership}
        isGeneratingLeadership={leadershipLoading && viewMode === "leadership"}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* Date, Stage, and Status Filters Block (Always available at top for dashboard/chat context alignment) */}
        <DashboardFilters
          filters={filters}
          filterOptions={filterOptions}
          setFilters={setFilters}
          resetFilters={resetFilters}
          refreshData={refreshData}
          loading={dashboardLoading}
        />

        {/* Executive KPI cards (Always present at the top of the content area) */}
        <KpiGrid
          kpis={kpis}
          loading={dashboardLoading}
          error={dashboardError}
        />

        {/* Dynamic View Toggles */}
        <div className="flex justify-between items-center border-b border-border pb-px dark:border-zinc-800">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                viewMode === "dashboard"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Visual Dashboard</span>
            </button>
            <button
              onClick={() => setViewMode("chat")}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                viewMode === "chat"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>AI Chat Analyst</span>
            </button>
          </div>

          {/* Action Trigger for Executive Report Mode */}
          {viewMode === "dashboard" && (
            <button
              onClick={handleGenerateExecutiveReport}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Generate Leadership Dashboard</span>
            </button>
          )}
        </div>

        {/* View Swapper Content */}
        <div className="mt-6">
          {viewMode === "dashboard" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Visual Analytics Charts Grid (Recharts) */}
                <div className="lg:col-span-3">
                  <ChartsGrid charts={charts} loading={dashboardLoading} />
                </div>
                {/* AI Insights Sidebar */}
                <div className="lg:col-span-1">
                  <InsightsPanel insights={insights} loading={dashboardLoading} />
                </div>
              </div>

              {/* Data Quality & Governance Grid */}
              <DataQualityPanel dataQuality={dataQuality} loading={dashboardLoading} />
            </div>
          ) : viewMode === "chat" ? (
            <ChatWindow
              messages={messages}
              loading={chatLoading}
              error={chatError}
              onSendMessage={sendChatMessage}
              onReset={resetChat}
            />
          ) : (
            <LeadershipUpdateCard
              narrative={narrative || ""}
              dataComplete={dataComplete}
              structuredSummary={structuredSummary}
              missingDataNotes={missingDataNotes}
              onBack={() => setViewMode("dashboard")}
              onRefresh={fetchSummary}
              loading={leadershipLoading}
            />
          )}
        </div>
      </main>

      {/* Executive Mode Overlay Panel (Triggered by Generate button) */}
      {showExecutiveReport && (
        <ExecutiveReport
          kpis={kpis}
          charts={charts}
          dataQuality={dataQuality}
          insights={insights}
          narrative={narrative || ""}
          onClose={() => setShowExecutiveReport(false)}
          deals={deals}
          workOrders={workOrders}
        />
      )}
    </div>
  );
}
