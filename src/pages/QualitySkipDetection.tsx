import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, Search, Loader2, Zap, Plus, Trash2 } from 'lucide-react'
import type {
  MisPart,
  MisProductionLine,
  Shift,
  QualitySkipDetectionResult,
  QualitySkipStation,
} from '@/types'

interface ReasonEntry {
  count: string
  skipReasonId: string
  notes: string
}

const emptyEntry = (): ReasonEntry => ({ count: '', skipReasonId: '', notes: '' })

export function QualitySkipDetectionPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  // Selection state
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)

  // Master data
  const [misParts, setMisParts] = useState<MisPart[]>([])
  const [misLines, setMisLines] = useState<MisProductionLine[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])

  // UI state
  const [simulating, setSimulating] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [detectionResult, setDetectionResult] = useState<QualitySkipDetectionResult | null>(null)

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignStation, setAssignStation] = useState<QualitySkipStation | null>(null)
  const [reasonEntries, setReasonEntries] = useState<ReasonEntry[]>([emptyEntry()])
  const [assigning, setAssigning] = useState(false)

  // Load skip reasons
  const { data: skipReasons } = useQuery({
    queryKey: ['skipReasons'],
    queryFn: api.getSkipReasons,
  })

  // Load master data on mount
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [parts, shiftsData] = await Promise.all([
          api.getMisParts(),
          api.getShifts(),
        ])
        setMisParts(parts)
        setShifts(shiftsData.filter(s => s.isActive))
      } catch (err) {
        setError('Failed to load master data')
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

  // Clear detection result when selection changes
  useEffect(() => {
    setDetectionResult(null)
  }, [selectedDate, selectedLineId, selectedShiftId])

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const canDetect = selectedDate && selectedLineId && selectedShiftId

  const handleDetect = async () => {
    if (!canDetect) return
    setDetecting(true)
    setError(null)
    try {
      const result = await api.detectQualitySkips(selectedDate, selectedShiftId!, selectedLineId!)
      setDetectionResult(result)
    } catch (err: any) {
      setError(err.message || 'Failed to detect quality skips')
    } finally {
      setDetecting(false)
    }
  }

  const handleSimulate = async () => {
    if (!selectedLineId) return
    setSimulating(true)
    setError(null)
    try {
      const result = await api.simulateQualitySkips(selectedDate, selectedLineId)
      setSuccessMessage(
        `Simulated ${result.opStationsSimulated} OP + ${result.bkStationsSimulated} BK stations, ${result.totalSkipsGenerated} total skips generated`
      )
      if (selectedShiftId) {
        const detection = await api.detectQualitySkips(selectedDate, selectedShiftId, selectedLineId)
        setDetectionResult(detection)
      }
      queryClient.invalidateQueries({ queryKey: ['qualitySkipDetection'] })
    } catch (err: any) {
      setError(err.message || 'Simulation failed')
    } finally {
      setSimulating(false)
    }
  }

  const openAssignDialog = (station: QualitySkipStation) => {
    setAssignStation(station)
    // Pre-populate from existing assigned reasons
    if (station.assignedReasons.length > 0) {
      setReasonEntries(station.assignedReasons.map(r => ({
        count: r.skipCount.toString(),
        skipReasonId: r.skipReasonId?.toString() || '',
        notes: r.notes || '',
      })))
    } else {
      setReasonEntries([emptyEntry()])
    }
    setAssignDialogOpen(true)
  }

  const closeAssignDialog = () => {
    setAssignDialogOpen(false)
    setAssignStation(null)
    setReasonEntries([emptyEntry()])
  }

  const addReasonEntry = () => {
    setReasonEntries(prev => [...prev, emptyEntry()])
  }

  const removeReasonEntry = (index: number) => {
    setReasonEntries(prev => prev.filter((_, i) => i !== index))
  }

  const updateReasonEntry = (index: number, field: keyof ReasonEntry, value: string) => {
    setReasonEntries(prev => prev.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    ))
  }

  const totalAssigning = reasonEntries.reduce((sum, e) => sum + (parseInt(e.count) || 0), 0)
  const remaining = (assignStation?.skipCount || 0) - totalAssigning

  const canSubmit = reasonEntries.every(e => e.count && parseInt(e.count) > 0 && e.skipReasonId)
    && totalAssigning > 0
    && remaining >= 0

  const handleAssignReasons = async () => {
    if (!assignStation || !selectedDate || !selectedShiftId || !selectedLineId) return

    // Validate SR09 notes
    for (const entry of reasonEntries) {
      const reason = skipReasons?.find(r => r.id === parseInt(entry.skipReasonId))
      if (reason?.code === 'SR09' && !entry.notes.trim()) {
        setError('Notes are required when selecting "Other" (SR09) as reason')
        return
      }
    }

    setAssigning(true)
    setError(null)
    try {
      await api.assignSkipReason({
        date: selectedDate,
        shiftId: selectedShiftId,
        misLineId: selectedLineId,
        cncStationId: assignStation.cncStationId,
        qualityStationId: assignStation.qualityStationId,
        opCount: assignStation.opCount,
        bkCount: assignStation.bkCount,
        totalSkipCount: assignStation.skipCount,
        reasons: reasonEntries.map(e => ({
          count: parseInt(e.count),
          skipReasonId: parseInt(e.skipReasonId),
          notes: e.notes || undefined,
        })),
      })
      closeAssignDialog()
      setSuccessMessage('Skip reasons assigned successfully')

      // Re-fetch detection results
      const result = await api.detectQualitySkips(selectedDate, selectedShiftId, selectedLineId)
      setDetectionResult(result)
    } catch (err: any) {
      setError(err.message || 'Failed to assign reasons')
    } finally {
      setAssigning(false)
    }
  }

  const hasSkips = detectionResult && detectionResult.totalSkipCount > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quality Skip Detection</h1>
          <p className="text-muted-foreground">
            Compare parts processed at OP stations vs tested at BK stations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSimulate}
            disabled={!selectedLineId || simulating}
          >
            {simulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {simulating ? 'Simulating...' : 'Simulate Data'}
          </Button>
          <Button
            onClick={handleDetect}
            disabled={!canDetect || detecting}
            size="lg"
          >
            {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {detecting ? 'Detecting...' : 'Detect Skips'}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button className="ml-2 font-bold" onClick={() => setError(null)}>x</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Selection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Part</label>
              <Select
                value={selectedPartId?.toString() || ''}
                onValueChange={(v) => {
                  setSelectedPartId(parseInt(v))
                  setSelectedLineId(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select part..." />
                </SelectTrigger>
                <SelectContent>
                  {misParts.map((part) => (
                    <SelectItem key={part.id} value={part.id.toString()}>
                      {part.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Line</label>
              <Select
                value={selectedLineId?.toString() || ''}
                onValueChange={(v) => setSelectedLineId(parseInt(v))}
                disabled={!selectedPartId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedPartId ? 'Select line...' : 'Select part first'} />
                </SelectTrigger>
                <SelectContent>
                  {misLines.map((line) => (
                    <SelectItem key={line.id} value={line.id.toString()}>
                      {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Shift</label>
              <div className="flex gap-2">
                {shifts.map((shift) => (
                  <Button
                    key={shift.id}
                    variant={selectedShiftId === shift.id ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedShiftId(shift.id)}
                  >
                    {shift.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detection Results */}
      {detectionResult && (
        <>
          {/* Summary */}
          <Card className={hasSkips ? 'border-yellow-500 border-2' : 'border-green-500 border-2'}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                {hasSkips ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    {detectionResult.totalSkipCount} Parts Skipped Quality Check
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    All Parts Tested - No Skips
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {detectionResult.lineName} | {detectionResult.shiftName} | {detectionResult.date} | {detectionResult.stationsWithSkips} station(s) with skips
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Results Table */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OP Station</TableHead>
                    <TableHead>BK Station</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Tested</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead>Reasons</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detectionResult.stations.map((station) => (
                    <TableRow
                      key={station.cncStationId}
                      className={
                        station.hasSkips
                          ? station.isFullyAssigned
                            ? 'bg-green-50'
                            : station.totalAssigned > 0
                              ? 'bg-blue-50'
                              : 'bg-yellow-50'
                          : ''
                      }
                    >
                      <TableCell className="font-medium">{station.cncStationCode}</TableCell>
                      <TableCell>{station.qualityStationCode}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {station.operatorName || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{station.opCount}</TableCell>
                      <TableCell className="text-right font-mono">{station.bkCount}</TableCell>
                      <TableCell className="text-right">
                        {station.skipCount > 0 ? (
                          <Badge variant="destructive" className="font-mono">{station.skipCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground font-mono">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!station.hasSkips && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            OK
                          </Badge>
                        )}
                        {station.hasSkips && station.assignedReasons.length === 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            Needs Reason
                          </Badge>
                        )}
                        {station.assignedReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {station.assignedReasons.map((r, i) => (
                              <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-300 font-mono text-xs">
                                {r.skipReasonCode}: {r.skipCount}
                              </Badge>
                            ))}
                            {station.hasSkips && !station.isFullyAssigned && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                                +{station.skipCount - station.totalAssigned} unassigned
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {station.hasSkips && (
                          <Button
                            variant={station.totalAssigned > 0 ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => openAssignDialog(station)}
                          >
                            {station.totalAssigned > 0 ? 'Edit' : 'Assign'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Instructions when no detection run yet */}
      {!detectionResult && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Detect Quality Skips</h3>
            <p className="text-muted-foreground max-w-md">
              Select a date, part, line, and shift, then click "Detect Skips" to compare
              part counts between OP and BK stations. Use "Simulate Data" to generate demo data first.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Skip Reasons Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skip Reason Codes</CardTitle>
          <CardDescription>Use these codes when assigning reasons for skipped quality checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {skipReasons?.map((reason) => (
              <div key={reason.id} className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{reason.code}</Badge>
                <span className="text-muted-foreground">{reason.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assign Reasons Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => { if (!open) closeAssignDialog() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Assign Skip Reasons
            </DialogTitle>
            <DialogDescription>
              {assignStation?.cncStationCode} → {assignStation?.qualityStationCode}: {assignStation?.skipCount} parts skipped
              {assignStation?.operatorName && ` | Operator: ${assignStation.operatorName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {reasonEntries.map((entry, index) => (
              <div key={index} className="space-y-2 border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Reason {index + 1}</span>
                  {reasonEntries.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeReasonEntry(index)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground">Count</label>
                    <Input
                      type="number"
                      min="1"
                      max={assignStation?.skipCount || 999}
                      value={entry.count}
                      onChange={(e) => updateReasonEntry(index, 'count', e.target.value)}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Reason</label>
                    <Select value={entry.skipReasonId} onValueChange={(v) => updateReasonEntry(index, 'skipReasonId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {skipReasons?.map((reason) => (
                          <SelectItem key={reason.id} value={reason.id.toString()}>
                            {reason.code} - {reason.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {skipReasons?.find(r => r.id === parseInt(entry.skipReasonId))?.code === 'SR09' && (
                  <div>
                    <label className="text-xs text-muted-foreground">Notes (required for SR09)</label>
                    <Textarea
                      value={entry.notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateReasonEntry(index, 'notes', e.target.value)}
                      placeholder="Describe the reason..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addReasonEntry} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Another Reason
            </Button>

            {/* Running total */}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">
                Total skips: <span className="font-mono font-medium text-foreground">{assignStation?.skipCount}</span>
              </span>
              <span className="text-muted-foreground">
                Assigned: <span className={`font-mono font-medium ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-green-600' : 'text-foreground'}`}>{totalAssigning}</span>
                {remaining > 0 && <span className="text-yellow-600 ml-2">({remaining} remaining)</span>}
                {remaining < 0 && <span className="text-red-600 ml-2">(exceeds by {Math.abs(remaining)})</span>}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAssignDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignReasons}
              disabled={!canSubmit || assigning}
            >
              {assigning ? 'Saving...' : 'Assign Reasons'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
