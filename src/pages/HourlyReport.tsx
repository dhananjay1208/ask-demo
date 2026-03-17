import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileBarChart,
  Download,
  Printer,
  Zap,
  Loader2,
} from 'lucide-react'
import type {
  MisPart,
  MisProductionLine,
  OpStation,
  HourlyReportData,
  HourlyReportShift,
  HourlyReportSlot,
} from '@/types'

export function HourlyReportPage() {
  const queryClient = useQueryClient()

  // Selection state
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null)

  // Fetch reference data
  const { data: parts = [] } = useQuery<MisPart[]>({
    queryKey: ['misParts'],
    queryFn: () => api.getMisParts(),
  })

  const { data: lines = [] } = useQuery<MisProductionLine[]>({
    queryKey: ['misPartLines', selectedPartId],
    queryFn: () => api.getMisPartLines(selectedPartId!),
    enabled: !!selectedPartId,
  })

  const { data: opStations = [] } = useQuery<OpStation[]>({
    queryKey: ['opStations'],
    queryFn: () => api.getOpStations(),
  })

  // Fetch hourly report data
  const { data: reportData, isLoading: reportLoading, isFetching } = useQuery<HourlyReportData>({
    queryKey: ['hourlyReport', selectedDate, selectedStationId, selectedLineId],
    queryFn: () => api.getHourlyReport(selectedDate, selectedStationId!, selectedLineId!),
    enabled: !!selectedDate && !!selectedStationId && !!selectedLineId,
  })

  // Simulate mutation
  const simulateMutation = useMutation({
    mutationFn: () => api.simulateHourlyReport(selectedDate, selectedStationId!, selectedLineId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourlyReport'] })
    },
  })

  // Reset cascading selections
  useEffect(() => {
    setSelectedLineId(null)
    setSelectedStationId(null)
  }, [selectedPartId])

  useEffect(() => {
    setSelectedStationId(null)
  }, [selectedLineId])

  const hasData = reportData && reportData.shifts?.some(
    (s: HourlyReportShift) => s.slots.some((sl: HourlyReportSlot) => sl.actualProduction > 0)
  )

  const handleExport = () => {
    if (selectedStationId && selectedLineId) {
      api.exportHourlyReport(selectedDate, selectedStationId, selectedLineId)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getCellColor = (actual: number, target: number) => {
    if (target === 0 || actual === 0) return ''
    if (actual >= target) return 'bg-green-100 text-green-800'
    if (actual >= target * 0.8) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-4">
      {/* Selection Bar - hidden on print */}
      <div className="print:hidden">
        <div className="flex items-center gap-2 mb-4">
          <FileBarChart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Hourly Report</h1>
        </div>

        <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-card">
          {/* Date */}
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>

          {/* Part */}
          <div className="space-y-1">
            <Label>Part</Label>
            <Select
              value={selectedPartId?.toString() ?? ''}
              onValueChange={(v) => setSelectedPartId(Number(v))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select Part" />
              </SelectTrigger>
              <SelectContent>
                {parts.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line */}
          <div className="space-y-1">
            <Label>Line</Label>
            <Select
              value={selectedLineId?.toString() ?? ''}
              onValueChange={(v) => setSelectedLineId(Number(v))}
              disabled={!selectedPartId}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Line" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Station */}
          <div className="space-y-1">
            <Label>Station</Label>
            <Select
              value={selectedStationId?.toString() ?? ''}
              onValueChange={(v) => setSelectedStationId(Number(v))}
              disabled={!selectedLineId}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select Station" />
              </SelectTrigger>
              <SelectContent>
                {opStations.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.code} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => simulateMutation.mutate()}
              disabled={!selectedStationId || !selectedLineId || simulateMutation.isPending}
            >
              {simulateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Simulate Data
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!hasData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!hasData}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {(reportLoading || isFetching) && selectedStationId && selectedLineId && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No selection message */}
      {(!selectedStationId || !selectedLineId) && !reportLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Select Date, Part, Line, and Station to view the hourly report.
        </div>
      )}

      {/* Empty data message */}
      {selectedStationId && selectedLineId && !reportLoading && !isFetching && !hasData && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No data available.</p>
          <p>Use <strong>Simulate Data</strong> to generate demo data for this station.</p>
        </div>
      )}

      {/* Report Body */}
      {hasData && reportData && (
        <div className="report-body space-y-4">
          {/* Report Header */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">ASK AUTOMOBILES (P) LTD.</h2>
                <h3 className="text-base font-semibold mt-1">
                  {reportData.partName} - HOURLY PRODUCTION SHEET
                </h3>
              </div>
              <div className="text-right text-sm">
                <p>Format no: ASK8/PRD/F-12</p>
                <p>Date: {reportData.date}</p>
              </div>
            </div>
            <div className="flex gap-8 mt-2 text-sm">
              <span>Machine: <strong>{reportData.stationCode}</strong>{reportData.machineId && ` (${reportData.machineId})`}</span>
              <span>Line: <strong>{reportData.lineName}</strong></span>
              <span>Cycle Time: <strong>{reportData.cycleTimeSeconds}s</strong></span>
            </div>
          </div>

          {/* Shift Sections */}
          {reportData.shifts.map((shift: HourlyReportShift) => (
            <ShiftSection
              key={shift.shiftId}
              shift={shift}
              getCellColor={getCellColor}
            />
          ))}

          {/* Summary */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-bold text-base mb-2">SUMMARY</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cycle Time</span>
                <p className="font-semibold">{reportData.summary.cycleTimeSeconds}s</p>
              </div>
              <div>
                <span className="text-muted-foreground">Production Target</span>
                <p className="font-semibold">{reportData.summary.totalProductionTarget}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Production</span>
                <p className="font-semibold">{reportData.summary.totalProduction}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Rejection</span>
                <p className="font-semibold text-red-600">{reportData.summary.totalRejection}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total OK</span>
                <p className="font-semibold text-green-600">{reportData.summary.totalOk}</p>
              </div>
            </div>
          </div>

          {/* Supervisor Sign-off */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex justify-between items-end gap-8 text-sm pt-2">
              <div className="flex-1">
                <span>Supervisor Name: </span>
                <span className="inline-block border-b border-gray-400 min-w-[200px]">&nbsp;</span>
              </div>
              <div className="flex-1">
                <span>Sign: </span>
                <span className="inline-block border-b border-gray-400 min-w-[200px]">&nbsp;</span>
              </div>
              <div className="flex-1">
                <span>Date: </span>
                <span className="inline-block border-b border-gray-400 min-w-[150px]">&nbsp;</span>
              </div>
            </div>
          </div>

          {/* Loss Codes Reference */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-bold text-base mb-2">LOSS CODES</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-1 text-xs">
              {reportData.lossCodes.map((lc) => (
                <span key={lc.code}>{lc.code}. {lc.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Print styles - hide everything except the report */}
      <style>{`
        @media print {
          /* Hide selection bar */
          .print\\:hidden { display: none !important; }
          /* Hide the app header and sidebar */
          header { display: none !important; }
          aside { display: none !important; }
          nav { display: none !important; }
          /* Make main content full width with no padding/margin */
          main { padding: 0 !important; margin: 0 !important; }
          .min-h-screen { min-height: auto !important; }
          .flex > main { flex: 1 !important; }
          /* Report styles */
          body { font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-body { break-inside: auto; }
          .shift-section { break-inside: avoid; }
          /* Remove borders/shadows for cleaner print */
          .border { border-color: #ccc !important; }
          .rounded-lg { border-radius: 0 !important; }
          .bg-card { background: white !important; }
          /* Ensure colors print */
          .bg-green-100 { background-color: #dcfce7 !important; }
          .bg-yellow-100 { background-color: #fef9c3 !important; }
          .bg-red-100 { background-color: #fee2e2 !important; }
          .bg-slate-700 { background-color: #334155 !important; color: white !important; }
          .text-red-400 { color: #f87171 !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-muted { background-color: #f5f5f5 !important; }
        }
      `}</style>
    </div>
  )
}

// Shift Section Component
function ShiftSection({
  shift,
  getCellColor,
}: {
  shift: HourlyReportShift
  getCellColor: (actual: number, target: number) => string
}) {
  return (
    <div className="shift-section border rounded-lg overflow-hidden bg-card">
      {/* Shift Header */}
      <div className="bg-slate-700 text-white px-4 py-2 flex justify-between items-center">
        <span className="font-bold">SHIFT Shift {shift.shiftName}</span>
        <span className="text-red-400 font-semibold text-sm">
          Cumulative Count: <strong>{shift.cumulativeCount}</strong>
        </span>
      </div>

      {/* Operator row */}
      <div className="px-4 py-1 text-sm border-b bg-gray-50 flex gap-8">
        <span>Operator: <strong>{shift.operatorName || '—'}</strong></span>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Production Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border px-2 py-1 text-left w-20"></th>
                {shift.slots.map((slot) => (
                  <th key={slot.slotIndex} className="border px-2 py-1 text-center whitespace-nowrap">
                    {slot.timeRange}
                  </th>
                ))}
                <th className="border px-2 py-1 text-center font-bold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {/* Target */}
              <tr>
                <td className="border px-2 py-1 font-medium bg-muted">Target</td>
                {shift.slots.map((slot) => (
                  <td key={slot.slotIndex} className="border px-2 py-1 text-center">
                    {slot.productionTarget || ''}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center font-bold">{shift.totals.productionTarget}</td>
              </tr>
              {/* Actual */}
              <tr>
                <td className="border px-2 py-1 font-medium bg-muted">Actual</td>
                {shift.slots.map((slot) => (
                  <td
                    key={slot.slotIndex}
                    className={`border px-2 py-1 text-center ${getCellColor(slot.actualProduction, slot.productionTarget)}`}
                  >
                    {slot.actualProduction || ''}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center font-bold">{shift.totals.actualProduction}</td>
              </tr>
              {/* Casting Rejection */}
              <tr>
                <td className="border px-2 py-1 font-medium bg-muted">Cast Rej</td>
                {shift.slots.map((slot) => (
                  <td key={slot.slotIndex} className={`border px-2 py-1 text-center ${slot.castingRejection > 0 ? 'text-red-600' : ''}`}>
                    {slot.castingRejection || ''}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center font-bold text-red-600">
                  {shift.totals.castingRejection || ''}
                </td>
              </tr>
              {/* Machining Rejection */}
              <tr>
                <td className="border px-2 py-1 font-medium bg-muted">Mach Rej</td>
                {shift.slots.map((slot) => (
                  <td key={slot.slotIndex} className={`border px-2 py-1 text-center ${slot.machiningRejection > 0 ? 'text-red-600' : ''}`}>
                    {slot.machiningRejection || ''}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center font-bold text-red-600">
                  {shift.totals.machiningRejection || ''}
                </td>
              </tr>
              {/* Net OK */}
              <tr>
                <td className="border px-2 py-1 font-medium bg-muted">OK</td>
                {shift.slots.map((slot) => (
                  <td key={slot.slotIndex} className="border px-2 py-1 text-center text-green-700">
                    {slot.netOkQty || ''}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center font-bold text-green-700">{shift.totals.netOkQty}</td>
              </tr>
              {/* Loss Code */}
              <tr>
                <td className="border px-2 py-1 font-medium bg-muted">Loss Code</td>
                {shift.slots.map((slot) => (
                  <td key={slot.slotIndex} className="border px-2 py-1 text-center text-orange-600">
                    {slot.lossCodes || ''}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center"></td>
              </tr>
              {/* Loss Time */}
              <tr>
                <td className="border px-2 py-1 font-medium bg-muted">Loss Time</td>
                {shift.slots.map((slot) => (
                  <td key={slot.slotIndex} className="border px-2 py-1 text-center text-orange-600">
                    {slot.lossTimeMinutes || ''}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center font-bold text-orange-600">
                  {shift.totals.lossTimeMinutes || ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Loss Details Panel */}
        {shift.lossDetails.length > 0 && (
          <div className="border-l lg:w-64 p-3">
            <h4 className="font-semibold text-xs mb-2">Loss Details</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-1">Min</th>
                  <th className="text-left pb-1">Parts</th>
                  <th className="text-left pb-1">Reason</th>
                </tr>
              </thead>
              <tbody>
                {shift.lossDetails.map((ld, idx) => (
                  <tr key={idx} className="border-b border-dashed">
                    <td className="py-1">{ld.lossMinutes}</td>
                    <td className="py-1">{ld.partCount}</td>
                    <td className="py-1 truncate max-w-[120px]" title={`${ld.reason} (${ld.lossCode})`}>
                      {ld.reason} ({ld.lossCode})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
