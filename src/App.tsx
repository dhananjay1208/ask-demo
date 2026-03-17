import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/Layout'
import { OperatorAssignmentPage } from '@/pages/OperatorAssignment'
import { OeeDashboardPage } from '@/pages/OeeDashboard'
import { ToolManagementPage } from '@/pages/ToolManagement'
import { TraceabilityPage } from '@/pages/Traceability'
import { ReportsPage } from '@/pages/Reports'
import { QualitySkipDetectionPage } from '@/pages/QualitySkipDetection'
import { MisReportPage } from '@/pages/MisReport'
import { HourlyPlanningPage } from '@/pages/HourlyPlanning'
import { RecordRejectsPage } from '@/pages/RecordRejects'
import { DowntimeRecordingPage } from '@/pages/DowntimeRecording'
import { HourlyReportPage } from '@/pages/HourlyReport'
import { LineDashboardPage } from '@/pages/LineDashboard'
import { PlantOverviewPage } from '@/pages/PlantOverview'
import { ToolLifeDashboardPage } from '@/pages/ToolLifeDashboard'
import { PartLoadingScanPage } from '@/pages/PartLoadingScan'
import { FinalInspectionPage } from '@/pages/FinalInspection'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Main app with sidebar layout */}
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/plant-overview" replace />} />
            <Route path="plant-overview" element={<PlantOverviewPage />} />
            <Route path="line-dashboard" element={<LineDashboardPage />} />
            <Route path="part-loading" element={<PartLoadingScanPage />} />
            <Route path="final-inspection" element={<FinalInspectionPage />} />
            <Route path="operator-assignment" element={<OperatorAssignmentPage />} />
            <Route path="mis" element={<MisReportPage />} />
            <Route path="hourly-planning" element={<HourlyPlanningPage />} />
            <Route path="hourly-report" element={<HourlyReportPage />} />
            <Route path="oee" element={<OeeDashboardPage />} />
            <Route path="quality-skips" element={<QualitySkipDetectionPage />} />
            <Route path="record-rejects" element={<RecordRejectsPage />} />
            <Route path="downtime-recording" element={<DowntimeRecordingPage />} />
            <Route path="tools" element={<ToolManagementPage />} />
            <Route path="tool-life-dashboard" element={<ToolLifeDashboardPage />} />
            <Route path="traceability" element={<TraceabilityPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/plant-overview" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
