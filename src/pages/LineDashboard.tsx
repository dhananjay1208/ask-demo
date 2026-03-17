import { useState, useEffect } from 'react'
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
  Gauge,
  Package,
  Timer,
  XCircle,
  User,
  Cpu,
  Zap,
  Loader2,
} from 'lucide-react'
import type {
  MisPart,
  MisProductionLine,
  LineDashboardData,
  LineDashboardStation,
} from '@/types'

function getOeeColor(oee: number): string {
  if (oee >= 85) return 'text-green-600'
  if (oee >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getOeeBgColor(oee: number): string {
  if (oee >= 85) return 'bg-green-100 text-green-700'
  if (oee >= 60) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'Running': return 'border-green-500'
    case 'Down': return 'border-red-500'
    default: return 'border-gray-300'
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'Running':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Running</Badge>
    case 'Down':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Down</Badge>
    default:
      return <Badge variant="secondary">Idle</Badge>
  }
}

export function LineDashboardPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  // Selection state
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)

  // Master data
  const [misParts, setMisParts] = useState<MisPart[]>([])
  const [misLines, setMisLines] = useState<MisProductionLine[]>([])

  // UI state
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load master data on mount
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const parts = await api.getMisParts()
        setMisParts(parts)
      } catch (err) {
        setError('Failed to load parts')
        console.error(err)
      }
    }
    loadMasterData()
  }, [])

  // Load MIS lines when part changes
  useEffect(() => {
    if (selectedPartId) {
      api.getMisPartLines(selectedPartId).then(setMisLines).catch(console.error)
    } else {
      setMisLines([])
      setSelectedLineId(null)
    }
  }, [selectedPartId])

  // Dashboard data query with auto-refresh
  const { data: dashboardData, isLoading } = useQuery<LineDashboardData>({
    queryKey: ['line-dashboard', today, selectedLineId],
    queryFn: () => api.getLineDashboard(today, selectedLineId!),
    enabled: !!selectedLineId,
    refetchInterval: 30000,
  })

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleSimulate = async () => {
    if (!selectedLineId) return
    setSimulating(true)
    setError(null)
    try {
      const result = await api.simulateLineDashboard(today, selectedLineId)
      setSuccessMessage(`Simulated data for ${result.stationsSimulated} stations`)
      queryClient.invalidateQueries({ queryKey: ['line-dashboard'] })
    } catch (err) {
      setError('Failed to simulate data')
      console.error(err)
    } finally {
      setSimulating(false)
    }
  }

  const kpis = dashboardData?.lineKpis
  const stations = dashboardData?.stations ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Line Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time shift-level production overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dashboardData && (
            <Badge variant="outline" className="text-sm">
              Shift {dashboardData.currentShiftName}
            </Badge>
          )}
          <Badge variant="secondary" className="text-sm">{today}</Badge>
          <Button
            onClick={handleSimulate}
            disabled={!selectedLineId || simulating}
            variant="outline"
            size="sm"
          >
            {simulating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Simulate Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-md text-sm">
          {successMessage}
        </div>
      )}

      {/* Selection Bar */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-64">
          <label className="text-sm font-medium mb-1 block">Part</label>
          <Select
            value={selectedPartId?.toString() ?? ''}
            onValueChange={(v) => {
              setSelectedPartId(Number(v))
              setSelectedLineId(null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Part" />
            </SelectTrigger>
            <SelectContent>
              {misParts.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <label className="text-sm font-medium mb-1 block">Line</label>
          <Select
            value={selectedLineId?.toString() ?? ''}
            onValueChange={(v) => setSelectedLineId(Number(v))}
            disabled={!selectedPartId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Line" />
            </SelectTrigger>
            <SelectContent>
              {misLines.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && selectedLineId && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No data state */}
      {!isLoading && selectedLineId && !kpis && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data available. Use "Simulate Data" to generate demo data.
          </CardContent>
        </Card>
      )}

      {/* No selection state */}
      {!selectedLineId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a Part and Line to view the dashboard.
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* OEE */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">OEE</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getOeeColor(kpis.oee)}`}>
                {kpis.oee}%
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-muted-foreground">A:{kpis.availability}%</span>
                <span className="text-xs text-muted-foreground">P:{kpis.performance}%</span>
                <span className="text-xs text-muted-foreground">Q:{kpis.quality}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Production */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Production</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.totalProduced}
                <span className="text-sm font-normal text-muted-foreground"> / {kpis.totalTarget}</span>
              </div>
              <Progress
                value={kpis.totalTarget > 0 ? Math.min(100, (kpis.totalProduced / kpis.totalTarget) * 100) : 0}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          {/* Rejects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejects</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.totalRejects}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalProduced > 0
                  ? `${((kpis.totalRejects / kpis.totalProduced) * 100).toFixed(1)}% reject rate`
                  : 'No production'}
              </p>
            </CardContent>
          </Card>

          {/* Downtime */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Downtime</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.totalDowntimeMinutes}
                <span className="text-sm font-normal text-muted-foreground"> min</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all stations
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Station Cards Grid */}
      {stations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Station Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stations.map((station) => (
              <StationCard key={station.stationId} station={station} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StationCard({ station }: { station: LineDashboardStation }) {
  return (
    <Card className={`border-2 ${getStatusBorderColor(station.status)}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">{station.stationCode}</CardTitle>
          {getStatusBadge(station.status)}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* OEE */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Gauge className="h-3 w-3" /> OEE
          </span>
          <Badge className={`text-xs ${getOeeBgColor(station.oee)}`}>
            {station.oee}%
          </Badge>
        </div>

        {/* Production */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" /> Parts
          </span>
          <span className="text-xs font-medium">
            {station.totalProduced}/{station.productionTarget}
          </span>
        </div>

        {/* Downtime */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Timer className="h-3 w-3" /> Down
          </span>
          <span className="text-xs font-medium">{station.downtimeMinutes}m</span>
        </div>

        {/* Rejects */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rej
          </span>
          <span className="text-xs font-medium">{station.totalRejects}</span>
        </div>

        {/* Operator */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> Op
          </span>
          <span className="text-xs font-medium truncate max-w-[80px]" title={station.operatorName ?? ''}>
            {station.operatorName ?? '—'}
          </span>
        </div>

        {/* CNC Machine ID */}
        {station.cncMachineId && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Cpu className="h-3 w-3" /> CNC
            </span>
            <span className="text-xs font-medium truncate max-w-[80px]">
              {station.cncMachineId}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
