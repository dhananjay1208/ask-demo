import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn, formatNumber, formatPercent } from '@/lib/utils'
import {
  Factory,
  Activity,
  CheckCircle,
  AlertTriangle,
  Timer,
  Gauge,
  Zap,
  Loader2,
} from 'lucide-react'
import type { PlantOverviewData, PlantOverviewLine } from '@/types'

const statusConfig = {
  Running: { color: 'bg-green-500', icon: Activity, label: 'Running', border: 'border-green-500' },
  Down: { color: 'bg-red-500', icon: AlertTriangle, label: 'Down', border: 'border-red-500' },
  Idle: { color: 'bg-gray-400', icon: Timer, label: 'Idle', border: 'border-gray-300' },
} as const

export function PlantOverviewPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { data, isLoading } = useQuery<PlantOverviewData>({
    queryKey: ['plant-overview', today],
    queryFn: () => api.getPlantOverview(today),
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleSimulate = async () => {
    setSimulating(true)
    setError(null)
    try {
      const result = await api.simulatePlantOverview(today)
      setSuccessMessage(`Simulated data for ${result.linesSimulated} production lines`)
      queryClient.invalidateQueries({ queryKey: ['plant-overview'] })
    } catch (err) {
      setError('Failed to simulate data')
      console.error(err)
    } finally {
      setSimulating(false)
    }
  }

  const handleLineClick = (line: PlantOverviewLine) => {
    navigate('/line-dashboard', { state: { misLineId: line.misLineId, partName: line.partName } })
  }

  const kpis = data?.plantKpis
  const lines = data?.lines ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plant Overview</h1>
          <p className="text-muted-foreground">
            {data ? `${data.currentShiftName} | ${today} | ${kpis?.activeLineCount ?? 0} active lines` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">{error}</div>
      )}
      {successMessage && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-md text-sm">{successMessage}</div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Summary Cards */}
      {kpis && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OEE</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(kpis.oee)}</div>
              <Progress value={kpis.oee} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                A: {kpis.availability}% | P: {kpis.performance}% | Q: {kpis.quality}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Production</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(kpis.totalProduced)} / {formatNumber(kpis.totalTarget)}
              </div>
              <Progress
                value={kpis.totalTarget > 0 ? (kpis.totalProduced / kpis.totalTarget) * 100 : 0}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalTarget > 0 ? formatPercent((kpis.totalProduced / kpis.totalTarget) * 100) : '0%'} of target
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejects</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatNumber(kpis.totalRejects)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalProduced > 0
                  ? `${formatPercent((kpis.totalRejects / kpis.totalProduced) * 100)} reject rate`
                  : 'No production'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Downtime</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(kpis.totalDowntimeMinutes)}
                <span className="text-sm font-normal text-muted-foreground"> min</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all lines
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Lines</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.activeLineCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lines with production data
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Line Cards */}
      {!isLoading && lines.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active production lines. Use "Simulate Data" to generate demo data.
          </CardContent>
        </Card>
      )}

      {lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {lines.map((line) => (
                <LineCard key={line.misLineId} line={line} onClick={() => handleLineClick(line)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LineCard({ line, onClick }: { line: PlantOverviewLine; onClick: () => void }) {
  const config = statusConfig[line.status] ?? statusConfig.Idle
  return (
    <div
      className={cn(
        'p-3 rounded-lg border-2 transition-all hover:scale-[1.02] cursor-pointer',
        config.border
      )}
      onClick={onClick}
    >
      {/* Top row: status dot + line name */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', config.color)} />
        <h3 className="font-semibold text-sm truncate">{line.lineName}</h3>
      </div>
      <p className="text-xs text-muted-foreground truncate pl-4">{line.partName}</p>

      {/* OEE + Production - 2 col prominent */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className={cn(
          'rounded-md px-2 py-1.5 text-center',
          line.oee >= 85 ? 'bg-green-50' : line.oee >= 60 ? 'bg-yellow-50' : 'bg-red-50'
        )}>
          <div className="text-[10px] text-muted-foreground">OEE</div>
          <div className={cn(
            'text-base font-bold',
            line.oee >= 85 ? 'text-green-600' : line.oee >= 60 ? 'text-yellow-600' : 'text-red-600'
          )}>
            {line.oee}%
          </div>
        </div>
        <div className="rounded-md px-2 py-1.5 text-center bg-blue-50">
          <div className="text-[10px] text-muted-foreground">Produced</div>
          <div className="text-base font-bold text-blue-600">
            {formatNumber(line.totalProduced)}
            <span className="text-[10px] font-normal text-muted-foreground">/{formatNumber(line.totalTarget)}</span>
          </div>
        </div>
      </div>

      {/* Downtime & Rejects - prominent */}
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <div className={cn(
          'rounded-md px-2 py-1.5 text-center',
          line.totalDowntimeMinutes > 0 ? 'bg-red-50' : 'bg-secondary'
        )}>
          <div className="text-[10px] text-muted-foreground">Downtime</div>
          <div className={cn(
            'text-base font-bold',
            line.totalDowntimeMinutes > 0 ? 'text-red-600' : 'text-foreground'
          )}>
            {line.totalDowntimeMinutes}m
          </div>
        </div>
        <div className={cn(
          'rounded-md px-2 py-1.5 text-center',
          line.totalRejects > 0 ? 'bg-orange-50' : 'bg-secondary'
        )}>
          <div className="text-[10px] text-muted-foreground">Rejects</div>
          <div className={cn(
            'text-base font-bold',
            line.totalRejects > 0 ? 'text-orange-600' : 'text-foreground'
          )}>
            {line.totalRejects}
          </div>
        </div>
      </div>
    </div>
  )
}
