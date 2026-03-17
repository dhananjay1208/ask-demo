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
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Flame,
  Zap,
  Loader2,
  Cpu,
  Wrench,
} from 'lucide-react'
import type {
  MisPart,
  MisProductionLine,
  ToolLifeDashboardData,
  ToolLifeDashboardStation,
  ToolLifeDashboardTool,
  ToolLifeStatus,
} from '@/types'

function getStatusColor(status: ToolLifeStatus): string {
  switch (status) {
    case 'OK': return 'bg-green-100 text-green-700 hover:bg-green-100'
    case 'Warning': return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
    case 'Critical': return 'bg-red-100 text-red-700 hover:bg-red-100'
    case 'Exceeded': return 'bg-red-200 text-red-900 hover:bg-red-200'
  }
}

function getProgressColor(lifePercentage: number, warningThreshold: number, criticalThreshold: number): string {
  if (lifePercentage >= criticalThreshold) return 'bg-red-500'
  if (lifePercentage >= warningThreshold) return 'bg-amber-500'
  return 'bg-green-500'
}

function getStationBorderColor(station: ToolLifeDashboardStation): string {
  if (station.exceededCount > 0 || station.criticalCount > 0) return 'border-red-500'
  if (station.warningCount > 0) return 'border-amber-500'
  return 'border-green-500'
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

export function ToolLifeDashboardPage() {
  const queryClient = useQueryClient()

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
  const { data: dashboardData, isLoading } = useQuery<ToolLifeDashboardData>({
    queryKey: ['tool-life-dashboard', selectedLineId],
    queryFn: () => api.getToolLifeDashboard(selectedLineId!),
    enabled: !!selectedLineId,
    refetchInterval: 15000,
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
      const result = await api.simulateToolLifeDashboard(selectedLineId)
      setSuccessMessage(`Generated ${result.generated} tool life records`)
      queryClient.invalidateQueries({ queryKey: ['tool-life-dashboard'] })
    } catch (err) {
      setError('Failed to simulate data')
      console.error(err)
    } finally {
      setSimulating(false)
    }
  }

  const summary = dashboardData?.summary
  const stations = dashboardData?.stations ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tool Life Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time tool life status across CNC stations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dashboardData?.lastUpdatedAt && (
            <Badge variant="secondary" className="text-xs">
              Updated: {new Date(dashboardData.lastUpdatedAt).toLocaleTimeString()}
            </Badge>
          )}
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

      {/* No selection state */}
      {!selectedLineId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a Part and Line to view tool life status.
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!isLoading && selectedLineId && summary && summary.totalTools === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tool masters configured for this line's CNC stations.
          </CardContent>
        </Card>
      )}

      {/* Summary KPI Cards */}
      {summary && summary.totalTools > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total Tools */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTools}</div>
            </CardContent>
          </Card>

          {/* OK */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">OK</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.okCount}</div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Warning</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{summary.warningCount}</div>
            </CardContent>
          </Card>

          {/* Critical */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertOctagon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.criticalCount}</div>
            </CardContent>
          </Card>

          {/* Exceeded */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Exceeded</CardTitle>
              <Flame className="h-4 w-4 text-red-800" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800">{summary.exceededCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Station Cards Grid */}
      {stations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Station Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StationCard({ station }: { station: ToolLifeDashboardStation }) {
  return (
    <Card className={`border-2 ${getStationBorderColor(station)}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold">{station.stationCode}</CardTitle>
            <span className="text-xs text-muted-foreground">{station.stationName}</span>
          </div>
          <div className="flex items-center gap-1">
            {station.cncMachineId && (
              <Badge variant="outline" className="text-xs">
                <Cpu className="h-3 w-3 mr-1" />
                {station.cncMachineId}
              </Badge>
            )}
          </div>
        </div>
        {/* Status badges */}
        {(station.warningCount > 0 || station.criticalCount > 0 || station.exceededCount > 0) && (
          <div className="flex gap-1 mt-1">
            {station.warningCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">
                {station.warningCount} warning
              </Badge>
            )}
            {station.criticalCount > 0 && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                {station.criticalCount} critical
              </Badge>
            )}
            {station.exceededCount > 0 && (
              <Badge className="bg-red-200 text-red-900 hover:bg-red-200 text-xs animate-pulse">
                {station.exceededCount} exceeded
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {station.tools.map((tool) => (
          <ToolRow key={tool.toolMasterId} tool={tool} />
        ))}
      </CardContent>
    </Card>
  )
}

function ToolRow({ tool }: { tool: ToolLifeDashboardTool }) {
  const isExceeded = tool.status === 'Exceeded'

  return (
    <div className={`rounded-md border p-2 space-y-1 ${isExceeded ? 'animate-pulse bg-red-50' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium truncate max-w-[120px]" title={tool.toolCode}>
          {tool.toolCode}
        </span>
        <Badge className={`text-xs ${getStatusColor(tool.status)}`}>
          {tool.status}
        </Badge>
      </div>
      <Progress
        value={Math.min(tool.lifePercentage, 100)}
        className="h-2"
        indicatorClassName={getProgressColor(tool.lifePercentage, tool.warningThreshold, tool.criticalThreshold)}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={tool.toolName}>
          {tool.toolName}
        </span>
        <span className="text-xs font-medium whitespace-nowrap">
          {formatNumber(tool.currentLife)} / {formatNumber(tool.maxLife)}
        </span>
      </div>
    </div>
  )
}
