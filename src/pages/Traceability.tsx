import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDuration } from '@/lib/utils'
import { Search, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, Beaker, Package } from 'lucide-react'
import type { TraceabilityData, MisPart, MisProductionLine } from '@/types'

export function TraceabilityPage() {
  const [searchSerial, setSearchSerial] = useState('')
  const [searchedSerial, setSearchedSerial] = useState('')
  const [showSimulate, setShowSimulate] = useState(false)
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [simulateHint, setSimulateHint] = useState('')
  const queryClient = useQueryClient()

  const { data: traceData, isLoading, isError } = useQuery({
    queryKey: ['traceability', searchedSerial],
    queryFn: () => api.getPartHistory(searchedSerial),
    enabled: !!searchedSerial,
    retry: false,
  })

  // Simulate data
  const { data: misParts } = useQuery({
    queryKey: ['misParts'],
    queryFn: () => api.getMisParts(),
    enabled: showSimulate,
  })

  const { data: misLines } = useQuery({
    queryKey: ['misPartLines', selectedPartId],
    queryFn: () => api.getMisPartLines(selectedPartId!),
    enabled: showSimulate && !!selectedPartId,
  })

  const simulateMutation = useMutation({
    mutationFn: () => api.simulateTraceability(selectedLineId!, 5),
    onSuccess: (_data) => {
      const today = new Date()
      const dateStr = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`
      setSimulateHint(`TRACE-${dateStr}-L${selectedLineId}-0001`)
      setShowSimulate(false)
      queryClient.invalidateQueries({ queryKey: ['traceability'] })
    },
  })

  const handleSearch = () => {
    if (searchSerial.trim()) {
      setSearchedSerial(searchSerial.trim())
      setSimulateHint('')
    }
  }

  const getStatusBadge = (data: TraceabilityData) => {
    const status = data.partInstance.status
    const statusName = data.partInstance.statusName
    if (status === 1) return <Badge variant="success">Completed</Badge>
    if (status === 2) return <Badge variant="destructive">Rejected</Badge>
    if (status === 0) return <Badge variant="warning">In Progress</Badge>
    return <Badge variant="secondary">{statusName}</Badge>
  }

  const getTimelineDotColor = (qualityStatus: number) => {
    if (qualityStatus === 1) return 'bg-green-500' // Pass
    if (qualityStatus === 2) return 'bg-red-500'   // Fail
    return 'bg-yellow-500'                          // Pending
  }

  const getQualityIcon = (qualityStatus: number) => {
    if (qualityStatus === 1) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (qualityStatus === 2) return <XCircle className="h-4 w-4 text-red-500" />
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Part Traceability</h1>
        <p className="text-muted-foreground">
          Search for a part by serial number to view its complete manufacturing history
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter serial number..."
              className="font-mono text-lg"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSimulate(!showSimulate)}
            >
              <Beaker className="h-4 w-4 mr-2" />
              Simulate
            </Button>
          </div>

          {simulateHint && (
            <p className="text-xs text-muted-foreground mt-2">
              Try searching: <button
                className="font-mono text-primary underline cursor-pointer"
                onClick={() => {
                  setSearchSerial(simulateHint)
                  setSearchedSerial(simulateHint)
                  setSimulateHint('')
                }}
              >
                {simulateHint}
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Simulate Panel */}
      {showSimulate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Demo Traceability Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Part</label>
                <Select
                  value={selectedPartId?.toString() ?? ''}
                  onValueChange={(v) => { setSelectedPartId(Number(v)); setSelectedLineId(null) }}
                >
                  <SelectTrigger><SelectValue placeholder="Select part..." /></SelectTrigger>
                  <SelectContent>
                    {misParts?.map((p: MisPart) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Line</label>
                <Select
                  value={selectedLineId?.toString() ?? ''}
                  onValueChange={(v) => setSelectedLineId(Number(v))}
                  disabled={!selectedPartId}
                >
                  <SelectTrigger><SelectValue placeholder="Select line..." /></SelectTrigger>
                  <SelectContent>
                    {misLines?.map((l: MisProductionLine) => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => simulateMutation.mutate()}
                disabled={!selectedLineId || simulateMutation.isPending}
              >
                {simulateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Beaker className="h-4 w-4 mr-2" />
                )}
                Generate 5 Parts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Searching...</p>
          </CardContent>
        </Card>
      )}

      {/* Not Found */}
      {isError && searchedSerial && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No part found</p>
            <p className="text-muted-foreground">
              No manufacturing history found for serial number: <span className="font-mono">{searchedSerial}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {traceData && (
        <>
          {/* Part Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Part Information
                {getStatusBadge(traceData)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Serial Number</p>
                  <p className="font-mono font-bold text-lg">{traceData.partInstance.serialNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Part</p>
                  <p className="font-medium">{traceData.partInstance.partName}</p>
                </div>
                {traceData.partInstance.lineName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Line</p>
                    <p className="font-medium">{traceData.partInstance.lineName}</p>
                  </div>
                )}
                {traceData.partInstance.shiftName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Shift</p>
                    <p className="font-medium">{traceData.partInstance.shiftName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="font-medium">{formatTime(traceData.partInstance.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {traceData.partInstance.status === 0 ? 'Currently At' : 'Completed'}
                  </p>
                  <p className="font-medium">
                    {traceData.partInstance.status === 0
                      ? traceData.partInstance.currentStationCode ?? 'Unknown'
                      : traceData.partInstance.completedAt
                        ? formatTime(traceData.partInstance.completedAt)
                        : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="font-medium">
                    {traceData.partInstance.totalTimeSeconds
                      ? formatDuration(traceData.partInstance.totalTimeSeconds)
                      : '-'}
                  </p>
                </div>
                {traceData.partInstance.rejectReason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reject Reason</p>
                    <p className="font-medium text-red-600">{traceData.partInstance.rejectReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manufacturing Journey */}
          {traceData.stationRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-4">
                    {traceData.stationRecords.map((record) => {
                      const isRejected = record.qualityStatus === 2
                      // OP-10 is the Part Loading confirmation station — show "Loaded" instead of quality status
                      const isLoadingStation = record.stationCode === 'OP-10' && record.stationType === 2
                      const displayStatus = isLoadingStation ? 'Loaded' : record.qualityStatusName
                      return (
                        <div key={record.id} className="relative flex gap-4 pl-10">
                          {/* Timeline dot */}
                          <div
                            className={`absolute left-2.5 w-3 h-3 rounded-full ${getTimelineDotColor(record.qualityStatus)}`}
                          />

                          <div className={`flex-1 p-3 border rounded-lg bg-card ${isRejected ? 'border-red-300 bg-red-50/50' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{record.stationCode}</span>
                                <span className="text-sm text-muted-foreground">
                                  {isLoadingStation ? 'Part Loading' : record.stationName}
                                </span>
                                {getQualityIcon(record.qualityStatus)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(record.entryTime).toLocaleTimeString('en-IN', { hour12: false })}
                                {record.exitTime && (
                                  <> → {new Date(record.exitTime).toLocaleTimeString('en-IN', { hour12: false })}</>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm">
                              {record.cycleTimeSeconds != null && (
                                <div>
                                  <span className="text-muted-foreground">Cycle: </span>
                                  <span className="font-medium">{record.cycleTimeSeconds}s</span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Status: </span>
                                <span className={`font-medium ${isRejected ? 'text-red-600' : ''}`}>
                                  {displayStatus}
                                </span>
                              </div>
                              {record.cncProgramNumber && (
                                <div>
                                  <span className="text-muted-foreground">Program: </span>
                                  <span className="font-mono">{record.cncProgramNumber}</span>
                                </div>
                              )}
                              {record.cncPartCount != null && (
                                <div>
                                  <span className="text-muted-foreground">Parts: </span>
                                  <span className="font-medium">{record.cncPartCount}</span>
                                </div>
                              )}
                              {record.operatorName && (
                                <div>
                                  <span className="text-muted-foreground">Operator: </span>
                                  <span className="font-medium">{record.operatorName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quality Results */}
          {traceData.qualityResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quality Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {traceData.qualityResults.map((qr) => {
                  const isPass = qr.status === 1
                  const hasDimensions = qr.dimension1 != null || qr.dimension2 != null || qr.dimension3 != null || qr.dimension4 != null
                  const hasLeakTest = qr.leakTestPressure != null

                  return (
                    <div
                      key={qr.id}
                      className={`p-4 border rounded-lg ${isPass ? 'border-green-200' : 'border-red-200 bg-red-50/50'}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-bold">{qr.stationCode}</span>
                        <span className="text-sm text-muted-foreground">{qr.stationName}</span>
                        <Badge variant={isPass ? 'success' : 'destructive'}>
                          {qr.statusName}
                        </Badge>
                        {qr.operatorName && (
                          <span className="text-sm text-muted-foreground ml-auto">
                            Operator: {qr.operatorName}
                          </span>
                        )}
                      </div>

                      {hasDimensions && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { value: qr.dimension1, name: qr.dimension1Name ?? 'Dimension 1' },
                            { value: qr.dimension2, name: qr.dimension2Name ?? 'Dimension 2' },
                            { value: qr.dimension3, name: qr.dimension3Name ?? 'Dimension 3' },
                            { value: qr.dimension4, name: qr.dimension4Name ?? 'Dimension 4' },
                          ].filter(d => d.value != null).map((dim, idx) => (
                            <div key={idx} className="p-3 border rounded-lg text-center bg-background">
                              <p className="text-xs text-muted-foreground">{dim.name}</p>
                              <p className="text-xl font-bold font-mono">{dim.value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {hasLeakTest && (
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-sm text-muted-foreground">Pressure: </span>
                            <span className="font-mono font-medium">{qr.leakTestPressure} bar</span>
                          </div>
                          <Badge variant={qr.leakTestPass ? 'success' : 'destructive'}>
                            {qr.leakTestPass ? 'Leak Test Passed' : 'Leak Test Failed'}
                          </Badge>
                        </div>
                      )}

                      {qr.failureReason && (
                        <p className="text-sm text-red-600 mt-2">
                          Failure: {qr.failureReason}
                        </p>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
