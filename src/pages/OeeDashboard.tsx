import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { formatPercent, formatNumber, getOeeClass, cn } from '@/lib/utils'
import {
  Gauge,
  Clock,
  TrendingUp,
  CheckCircle,
  Timer,
  Zap,
  Loader2,
  Package,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import type {
  MisPart,
  MisProductionLine,
  OpStation,
  OeeAnalyticsData,
} from '@/types'

// ---------- OEE Gauge SVG ----------
function OeeGauge({ value, label, size = 'lg' }: { value: number; label: string; size?: 'sm' | 'lg' }) {
  const radius = size === 'lg' ? 80 : 50
  const strokeWidth = size === 'lg' ? 12 : 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  const getColor = (val: number) => {
    if (val >= 85) return '#22c55e'
    if (val >= 70) return '#84cc16'
    if (val >= 50) return '#eab308'
    return '#ef4444'
  }

  return (
    <div className="flex flex-col items-center">
      <svg
        width={radius * 2 + strokeWidth * 2}
        height={radius * 2 + strokeWidth * 2}
        className="transform -rotate-90"
      >
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ marginTop: size === 'lg' ? 60 : 35 }}>
        <span className={cn('font-bold', size === 'lg' ? 'text-4xl' : 'text-2xl', getOeeClass(value))}>
          {value.toFixed(1)}%
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

// ---------- Helpers ----------
type Period = 'shift' | 'day' | 'week' | 'month'

function getOeeColor(oee: number): string {
  if (oee >= 85) return 'text-green-600'
  if (oee >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function affectsBadge(a: boolean, p: boolean, q: boolean) {
  if (a) return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-1.5 py-0">A</Badge>
  if (p) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5 py-0">P</Badge>
  if (q) return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-[10px] px-1.5 py-0">Q</Badge>
  return null
}

// ---------- Page ----------
export function OeeDashboardPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  // Selection state
  const [period, setPeriod] = useState<Period>('day')
  const [date, setDate] = useState(today)
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null)

  // Master data
  const [misParts, setMisParts] = useState<MisPart[]>([])
  const [misLines, setMisLines] = useState<MisProductionLine[]>([])
  const [opStations, setOpStations] = useState<OpStation[]>([])
  const [shifts, setShifts] = useState<{ id: number; name: string }[]>([])

  // UI state
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load master data
  useEffect(() => {
    const load = async () => {
      try {
        const [parts, sh, stations] = await Promise.all([
          api.getMisParts(),
          api.getShifts(),
          api.getOpStations(),
        ])
        setMisParts(parts)
        setShifts(sh.map(s => ({ id: s.id, name: s.name })))
        setOpStations(stations)
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [])

  // Cascade: Part → Lines
  useEffect(() => {
    if (selectedPartId) {
      api.getMisPartLines(selectedPartId).then(setMisLines).catch(console.error)
    } else {
      setMisLines([])
      setSelectedLineId(null)
      setSelectedStationId(null)
    }
  }, [selectedPartId])

  // Reset station when line changes
  useEffect(() => {
    setSelectedStationId(null)
  }, [selectedLineId])

  // Stations filtered to selected line (OP types only)
  const lineStations = useMemo(() => {
    if (!selectedLineId) return []
    return opStations.filter(s =>
      [2, 4, 5, 7].includes(s.type)
    )
  }, [selectedLineId, opStations])

  // Clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Build query params
  const queryParams = useMemo(() => {
    if (period === 'shift' && !selectedShiftId) return null
    return {
      period,
      date,
      shiftId: period === 'shift' ? selectedShiftId! : undefined,
      misLineId: selectedLineId ?? undefined,
      stationId: selectedStationId ?? undefined,
    }
  }, [period, date, selectedShiftId, selectedLineId, selectedStationId])

  // Fetch OEE analytics
  const { data, isLoading } = useQuery<OeeAnalyticsData>({
    queryKey: ['oee-analytics', queryParams],
    queryFn: () => api.getOeeAnalytics(queryParams!),
    enabled: !!queryParams,
  })

  const handleSimulate = async () => {
    setSimulating(true)
    setError(null)
    try {
      await api.simulatePlantOverview(date)
      setSuccessMessage('Simulation complete - data generated for all lines')
      queryClient.invalidateQueries({ queryKey: ['oee-analytics'] })
    } catch (err) {
      setError('Failed to simulate data')
      console.error(err)
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OEE Analytics</h1>
          <p className="text-muted-foreground">
            {data?.lineName ?? data?.stationName ?? 'Plant-wide OEE breakdown'}
          </p>
        </div>
        <Button
          onClick={handleSimulate}
          disabled={simulating}
          variant="outline"
          size="sm"
        >
          {simulating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Simulating...</>
          ) : (
            <><Zap className="mr-2 h-4 w-4" />Simulate Data</>
          )}
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{successMessage}</div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {/* Period */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Period</label>
              <div className="flex gap-1">
                {(['shift', 'day', 'week', 'month'] as Period[]).map(p => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 capitalize text-xs px-2"
                    onClick={() => setPeriod(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Shift (only when period=shift) */}
            {period === 'shift' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Shift</label>
                <div className="flex gap-1">
                  {shifts.map(s => (
                    <Button
                      key={s.id}
                      variant={selectedShiftId === s.id ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setSelectedShiftId(s.id)}
                    >
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Part */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Part</label>
              <Select
                value={selectedPartId ? String(selectedPartId) : 'all'}
                onValueChange={v => setSelectedPartId(v === 'all' ? null : Number(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Parts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parts</SelectItem>
                  {misParts.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Line</label>
              <Select
                value={selectedLineId ? String(selectedLineId) : 'all'}
                onValueChange={v => {
                  setSelectedLineId(v === 'all' ? null : Number(v))
                }}
                disabled={!selectedPartId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={selectedPartId ? 'All Lines' : 'Select Part first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lines</SelectItem>
                  {misLines.map(l => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Station */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Station</label>
              <Select
                value={selectedStationId ? String(selectedStationId) : 'all'}
                onValueChange={v => setSelectedStationId(v === 'all' ? null : Number(v))}
                disabled={!selectedLineId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={selectedLineId ? 'All Stations' : 'Select Line first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {lineStations.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.code} - {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No data */}
      {!isLoading && data && data.totalProduced === 0 && data.totalDowntimeMinutes === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">No data available</p>
            <p className="text-sm text-muted-foreground">
              Use "Simulate Data" to generate demo data, or select a different date/period.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isLoading && data && (data.totalProduced > 0 || data.totalDowntimeMinutes > 0) && (
        <>
          {/* Date range badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{data.level}</Badge>
            <span>{data.dateFrom === data.dateTo ? data.dateFrom : `${data.dateFrom} to ${data.dateTo}`}</span>
          </div>

          {/* OEE Gauge + Components */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Overall Equipment Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <div className="relative">
                  <OeeGauge value={data.oee} label="OEE" size="lg" />
                </div>
                <div className="flex items-center gap-3 text-sm font-mono mt-2">
                  <span className="text-blue-500 font-semibold">{formatPercent(data.availability)}</span>
                  <span className="text-muted-foreground">x</span>
                  <span className="text-green-500 font-semibold">{formatPercent(data.performance)}</span>
                  <span className="text-muted-foreground">x</span>
                  <span className="text-purple-500 font-semibold">{formatPercent(data.quality)}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className={cn('text-lg font-bold', getOeeClass(data.oee))}>
                    {formatPercent(data.oee)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>OEE Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* Availability */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Availability</span>
                      </div>
                      <span className="font-bold text-lg">{formatPercent(data.availability)}</span>
                    </div>
                    <Progress value={data.availability} className="h-3" indicatorClassName="bg-blue-500" />
                    <p className="text-xs text-muted-foreground">
                      Run Time: {formatNumber(data.plannedMinutes - data.totalDowntimeMinutes)} min / Planned: {formatNumber(data.plannedMinutes)} min
                    </p>
                  </div>

                  {/* Performance */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Performance</span>
                      </div>
                      <span className="font-bold text-lg">{formatPercent(data.performance)}</span>
                    </div>
                    <Progress value={data.performance} className="h-3" indicatorClassName="bg-green-500" />
                    <p className="text-xs text-muted-foreground">
                      Produced: {formatNumber(data.totalProduced)} / Target: {formatNumber(data.totalTarget)}
                    </p>
                  </div>

                  {/* Quality */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Quality</span>
                      </div>
                      <span className="font-bold text-lg">{formatPercent(data.quality)}</span>
                    </div>
                    <Progress value={data.quality} className="h-3" indicatorClassName="bg-purple-500" />
                    <p className="text-xs text-muted-foreground">
                      Good: {formatNumber(data.totalProduced - data.totalRejects)} | Rejected: {formatNumber(data.totalRejects)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Production Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Package className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Produced / Target</p>
                    <p className="text-lg font-bold">{formatNumber(data.totalProduced)} / {formatNumber(data.totalTarget)}</p>
                    <Progress value={data.totalTarget > 0 ? (data.totalProduced / data.totalTarget) * 100 : 0} className="h-1.5 mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rejects</p>
                    <p className="text-lg font-bold">{formatNumber(data.totalRejects)}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.totalProduced > 0 ? ((data.totalRejects / data.totalProduced) * 100).toFixed(1) : '0.0'}% rejection rate
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Timer className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Downtime</p>
                    <p className="text-lg font-bold">{formatNumber(data.totalDowntimeMinutes)} min</p>
                    <p className="text-xs text-muted-foreground">
                      {data.plannedMinutes > 0 ? ((data.totalDowntimeMinutes / data.plannedMinutes) * 100).toFixed(1) : '0.0'}% of planned time
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Clock className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Planned Time</p>
                    <p className="text-lg font-bold">{formatNumber(data.plannedMinutes)} min</p>
                    <p className="text-xs text-muted-foreground">
                      {(data.plannedMinutes / 60).toFixed(1)} hours
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pareto Charts: Downtime + Rejects */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Downtime Reasons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Top Downtime Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topDowntimeReasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No downtime with assigned loss codes</p>
                ) : (
                  <div className="space-y-3">
                    {data.topDowntimeReasons.map((r, idx) => (
                      <div key={r.lossCodeId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                            <span className="font-mono text-muted-foreground">{r.lossCode}</span>
                            <span>{r.lossName}</span>
                            {affectsBadge(r.affectsAvailability, r.affectsPerformance, r.affectsQuality)}
                          </div>
                          <span className="font-medium whitespace-nowrap">{r.totalMinutes} min ({r.percentage}%)</span>
                        </div>
                        <Progress value={r.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Reject Reasons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Top Reject Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topRejectReasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No rejections recorded</p>
                ) : (
                  <div className="space-y-3">
                    {data.topRejectReasons.map((r, idx) => (
                      <div key={r.rejectionCategoryId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                            <span className="font-mono text-muted-foreground">{r.categoryCode}</span>
                            <span>{r.categoryName}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {r.type}
                            </Badge>
                          </div>
                          <span className="font-medium whitespace-nowrap">{r.totalCount} pcs ({r.percentage}%)</span>
                        </div>
                        <Progress value={r.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Station Breakdown (when viewing a line) */}
          {data.stationBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Station Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead className="text-right">OEE</TableHead>
                      <TableHead className="text-right">A%</TableHead>
                      <TableHead className="text-right">P%</TableHead>
                      <TableHead className="text-right">Q%</TableHead>
                      <TableHead className="text-right">Produced</TableHead>
                      <TableHead className="text-right">Rejects</TableHead>
                      <TableHead className="text-right">DT (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.stationBreakdown.map(s => (
                      <TableRow key={s.stationId}>
                        <TableCell className="font-medium">{s.stationCode}</TableCell>
                        <TableCell className={cn('text-right font-bold', getOeeColor(s.oee))}>
                          {s.oee.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">{s.availability.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{s.performance.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{s.quality.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{formatNumber(s.produced)}</TableCell>
                        <TableCell className="text-right">{formatNumber(s.rejects)}</TableCell>
                        <TableCell className="text-right">{formatNumber(s.downtimeMinutes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Shift Comparison + Trend */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Shift Comparison */}
            {data.shiftBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Shift Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${data.shiftBreakdown.length}, 1fr)` }}>
                    {data.shiftBreakdown.map(s => (
                      <div key={s.shiftId} className="p-4 border rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">{s.shiftName}</p>
                        <p className={cn('text-3xl font-bold', getOeeColor(s.oee))}>{s.oee.toFixed(1)}%</p>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>A: {s.availability.toFixed(1)}%</p>
                          <p>P: {s.performance.toFixed(1)}%</p>
                          <p>Q: {s.quality.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trend Data (week/month) */}
            {data.trendData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>OEE Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Bar chart visualization */}
                    <div className="flex items-end gap-1" style={{ height: 180 }}>
                      {data.trendData.map(point => {
                        const maxOee = Math.max(...data.trendData.map(p => p.oee), 1)
                        const barHeight = maxOee > 0 ? (point.oee / 100) * 160 : 0
                        const dayLabel = point.label.slice(5) // MM-DD
                        return (
                          <div key={point.label} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-medium">{point.oee.toFixed(0)}%</span>
                            <div
                              className={cn(
                                'w-full rounded-t transition-all',
                                point.oee >= 85 ? 'bg-green-500' : point.oee >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              )}
                              style={{ height: Math.max(barHeight, 4) }}
                            />
                            <span className="text-[9px] text-muted-foreground">{dayLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Good (&ge;85%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Average (&ge;60%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Low (&lt;60%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
