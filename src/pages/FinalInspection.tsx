import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  ScanBarcode,
  Clock,
} from 'lucide-react'
import type {
  MisPart,
  MisProductionLine,
  Operator,
  CurrentShiftSlot,
  PartScanLookup,
  FinalInspectionResponse,
  RecentInspection,
} from '@/types'

const STORAGE_KEY = 'finalInspection'

function loadSaved<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}.${key}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSetting(key: string, value: unknown) {
  localStorage.setItem(`${STORAGE_KEY}.${key}`, JSON.stringify(value))
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}h ${rm}m ${s}s`
  }
  return `${m}m ${s}s`
}

type Phase = 'scan' | 'inspect' | 'result'

export function FinalInspectionPage() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  // Selection state (persisted)
  const [selectedPartId, setSelectedPartId] = useState<number | null>(loadSaved('partId'))
  const [selectedLineId, setSelectedLineId] = useState<number | null>(loadSaved('lineId'))
  const [selectedOperatorId, setSelectedOperatorId] = useState<number | null>(loadSaved('operatorId'))

  // Master data
  const [misParts, setMisParts] = useState<MisPart[]>([])
  const [misLines, setMisLines] = useState<MisProductionLine[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [currentShift, setCurrentShift] = useState<CurrentShiftSlot | null>(null)

  // Phase state
  const [phase, setPhase] = useState<Phase>('scan')
  const [serialInput, setSerialInput] = useState('')
  const [lookupData, setLookupData] = useState<PartScanLookup | null>(null)
  const [inspectionResult, setInspectionResult] = useState<FinalInspectionResponse | null>(null)

  // Dimension inputs
  const [dim1, setDim1] = useState('')
  const [dim2, setDim2] = useState('')
  const [dim3, setDim3] = useState('')
  const [dim4, setDim4] = useState('')

  // Reject reason
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectReason, setShowRejectReason] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load master data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [parts, ops, shift] = await Promise.all([
          api.getMisParts(),
          api.getOperators(),
          api.getCurrentShiftSlot(),
        ])
        setMisParts(parts)
        setOperators(ops)
        setCurrentShift(shift)
      } catch (err) {
        console.error('Failed to load master data:', err)
      }
    }
    loadData()
  }, [])

  // Load lines when part changes
  useEffect(() => {
    if (selectedPartId) {
      api.getMisPartLines(selectedPartId).then(setMisLines).catch(console.error)
    } else {
      setMisLines([])
    }
  }, [selectedPartId])

  // Auto-focus input on phase change
  useEffect(() => {
    if (phase === 'scan') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase])

  // Recent inspections query
  const { data: recentInspections } = useQuery({
    queryKey: ['recentInspections', selectedLineId],
    queryFn: () => selectedLineId ? api.getRecentPartScans(selectedLineId, 'inspection', 20) as Promise<RecentInspection[]> : Promise.resolve([]),
    enabled: !!selectedLineId,
    refetchInterval: 5000,
  })

  const handlePartChange = (value: string) => {
    const id = parseInt(value)
    setSelectedPartId(id)
    saveSetting('partId', id)
    setSelectedLineId(null)
    saveSetting('lineId', null)
  }

  const handleLineChange = (value: string) => {
    const id = parseInt(value)
    setSelectedLineId(id)
    saveSetting('lineId', id)
  }

  const handleOperatorChange = (value: string) => {
    const id = parseInt(value)
    setSelectedOperatorId(id)
    saveSetting('operatorId', id)
  }

  const resetToScan = () => {
    setPhase('scan')
    setSerialInput('')
    setLookupData(null)
    setInspectionResult(null)
    setDim1('')
    setDim2('')
    setDim3('')
    setDim4('')
    setRejectReason('')
    setShowRejectReason(false)
    setError(null)
  }

  const handleLookup = async () => {
    const serial = serialInput.trim()
    if (!serial) return

    setLoading(true)
    setError(null)

    try {
      const data = await api.partScanLookup(serial)
      setLookupData(data)

      if (data.isInspected) {
        setError('Part has already been inspected')
        setPhase('scan')
      } else {
        setPhase('inspect')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Part not found. Must be scanned at OP-10 first.')
      setLookupData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLookup()
    }
  }

  const handleInspection = async (pass: boolean) => {
    if (!lookupData || !selectedLineId) return

    if (!pass && !showRejectReason) {
      setShowRejectReason(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await api.partFinalInspection({
        serialNumber: lookupData.serialNumber,
        misLineId: selectedLineId,
        operatorId: selectedOperatorId ?? undefined,
        pass,
        dimension1: dim1 ? parseFloat(dim1) : undefined,
        dimension2: dim2 ? parseFloat(dim2) : undefined,
        dimension3: dim3 ? parseFloat(dim3) : undefined,
        dimension4: dim4 ? parseFloat(dim4) : undefined,
        failureReason: pass ? undefined : rejectReason || undefined,
        notes: undefined,
      })

      setInspectionResult(result)
      setPhase('result')
      queryClient.invalidateQueries({ queryKey: ['recentInspections'] })

      // Auto-reset after 3 seconds
      setTimeout(() => resetToScan(), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Inspection failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulate = async () => {
    if (!selectedLineId) return
    setSimulating(true)
    setSuccessMessage(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const result = await api.simulatePartScans(today, selectedLineId, 50)
      setSuccessMessage(`Simulated ${result.generated} parts`)
      queryClient.invalidateQueries({ queryKey: ['recentInspections'] })
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setSimulating(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center px-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ASK</span>
            </div>
            <span className="font-semibold text-lg">Final Inspection (BK-80)</span>
          </div>
          <div className="ml-auto">
            {currentShift && (
              <Badge className="text-sm px-3 py-1 bg-blue-600">
                {currentShift.shiftName}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Selection Row */}
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedPartId?.toString() ?? ''} onValueChange={handlePartChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Part" />
            </SelectTrigger>
            <SelectContent>
              {misParts.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLineId?.toString() ?? ''} onValueChange={handleLineChange} disabled={!selectedPartId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Line" />
            </SelectTrigger>
            <SelectContent>
              {misLines.map(l => (
                <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedOperatorId?.toString() ?? ''} onValueChange={handleOperatorChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Operator" />
            </SelectTrigger>
            <SelectContent>
              {operators.map(o => (
                <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scan Input (always visible) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              SCAN SERIAL NUMBER
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Position cursor here and scan barcode..."
                className="text-2xl font-mono h-14 flex-1"
                disabled={!selectedLineId || loading || phase === 'inspect'}
                autoFocus
              />
              <Button
                onClick={handleLookup}
                disabled={!serialInput.trim() || !selectedLineId || loading || phase === 'inspect'}
                className="h-14 px-8 text-lg"
              >
                {loading && phase === 'scan' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'SCAN'}
              </Button>
            </div>
            {!selectedLineId && (
              <p className="text-sm text-muted-foreground mt-2">Select Part and Line above to begin scanning</p>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-red-400 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Part Info (shown after lookup) */}
        {lookupData && phase === 'inspect' && (
          <>
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">PART INFO</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Serial:</span>
                    <p className="font-mono font-bold text-lg">{lookupData.serialNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Loaded at:</span>
                    <p className="font-medium">{lookupData.loadingStation} at {formatTime(lookupData.loadedAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Elapsed:</span>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {lookupData.elapsedFormatted}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shift:</span>
                    <p className="font-medium">{lookupData.shiftName ?? 'Unknown'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Baker Dimensions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">BAKER DIMENSIONS (manual entry)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="dim1">Dimension 1</Label>
                    <Input id="dim1" type="number" step="0.01" value={dim1} onChange={(e) => setDim1(e.target.value)} placeholder="0.00" className="mt-1 font-mono" />
                  </div>
                  <div>
                    <Label htmlFor="dim2">Dimension 2</Label>
                    <Input id="dim2" type="number" step="0.01" value={dim2} onChange={(e) => setDim2(e.target.value)} placeholder="0.00" className="mt-1 font-mono" />
                  </div>
                  <div>
                    <Label htmlFor="dim3">Dimension 3</Label>
                    <Input id="dim3" type="number" step="0.01" value={dim3} onChange={(e) => setDim3(e.target.value)} placeholder="0.00" className="mt-1 font-mono" />
                  </div>
                  <div>
                    <Label htmlFor="dim4">Dimension 4</Label>
                    <Input id="dim4" type="number" step="0.01" value={dim4} onChange={(e) => setDim4(e.target.value)} placeholder="0.00" className="mt-1 font-mono" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pass / Reject Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleInspection(true)}
                disabled={loading}
                className="h-20 text-xl bg-green-600 hover:bg-green-700"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
                PASS
              </Button>
              <Button
                onClick={() => handleInspection(false)}
                disabled={loading}
                className="h-20 text-xl bg-red-600 hover:bg-red-700"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <XCircle className="h-6 w-6 mr-2" />}
                REJECT
              </Button>
            </div>

            {/* Reject Reason (shown when rejecting) */}
            {showRejectReason && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <Label htmlFor="rejectReason">Reject Reason</Label>
                  <Textarea
                    id="rejectReason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reject reason..."
                    className="mt-2 bg-white"
                  />
                  <Button
                    onClick={() => handleInspection(false)}
                    disabled={loading}
                    className="mt-3 bg-red-600 hover:bg-red-700"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Reject
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" onClick={resetToScan} className="w-full">
              Cancel & Scan Another
            </Button>
          </>
        )}

        {/* Result Banner */}
        {inspectionResult && phase === 'result' && (
          <Card className={inspectionResult.result === 'PASS'
            ? 'border-green-400 bg-green-50'
            : 'border-red-400 bg-red-50'
          }>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                {inspectionResult.result === 'PASS'
                  ? <CheckCircle2 className="h-12 w-12 text-green-600" />
                  : <XCircle className="h-12 w-12 text-red-600" />
                }
                <div>
                  <p className={`text-2xl font-bold ${inspectionResult.result === 'PASS' ? 'text-green-800' : 'text-red-800'}`}>
                    RESULT: {inspectionResult.result}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-mono font-medium">{inspectionResult.serialNumber}</span>
                    {' | '}Total Time: {formatDuration(inspectionResult.totalProductionTimeSeconds)}
                    {' | '}4 dimensions recorded
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {successMessage && (
          <Card className="border-green-400 bg-green-50">
            <CardContent className="py-4">
              <p className="text-green-800 font-medium">{successMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Recent Inspections */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                RECENT INSPECTIONS ({recentInspections?.length ?? 0})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulate}
                disabled={!selectedLineId || simulating}
              >
                {simulating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Simulate Data
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentInspections && recentInspections.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Loaded At</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Shift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInspections.map((insp) => (
                    <TableRow key={insp.id}>
                      <TableCell className="font-mono font-medium">{insp.serialNumber}</TableCell>
                      <TableCell>
                        {insp.result === 'PASS' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">PASS</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">REJECT</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatTime(insp.loadedAt)}</TableCell>
                      <TableCell>{formatDuration(insp.totalProductionTimeSeconds)}</TableCell>
                      <TableCell>{insp.shiftName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {selectedLineId ? 'No recent inspections. Scan a part or simulate data.' : 'Select a line to see recent inspections.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
