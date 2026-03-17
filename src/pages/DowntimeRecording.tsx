import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Timer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Zap,
  Tag,
  Trash2,
} from 'lucide-react'
import type {
  Shift,
  MisPart,
  MisProductionLine,
  Operator,
  LossCode,
  StationDowntimeSummary,
  StationDowntime,
  OpStation,
} from '@/types'
import { StationDowntimeStatus } from '@/types'

// Slot definitions for each shift
const SHIFT_A_SLOTS = [
  { index: 0, range: '7:00-8:00' },
  { index: 1, range: '8:00-9:00' },
  { index: 2, range: '9:00-10:00' },
  { index: 3, range: '10:00-11:00' },
  { index: 4, range: '11:00-12:00' },
  { index: 5, range: '12:00-1:00' },
  { index: 6, range: '1:00-2:00' },
  { index: 7, range: '2:00-3:00' },
  { index: 8, range: '3:00-3:30' },
]

const SHIFT_B_SLOTS = [
  { index: 0, range: '3:30-4:30' },
  { index: 1, range: '4:30-5:30' },
  { index: 2, range: '5:30-6:30' },
  { index: 3, range: '6:30-7:30' },
  { index: 4, range: '7:30-8:30' },
  { index: 5, range: '8:30-9:30' },
  { index: 6, range: '9:30-10:30' },
  { index: 7, range: '10:30-11:30' },
  { index: 8, range: '11:30-12:00' },
]

const SHIFT_C_SLOTS = [
  { index: 0, range: '12:00-1:00' },
  { index: 1, range: '1:00-2:00' },
  { index: 2, range: '2:00-3:00' },
  { index: 3, range: '3:00-4:00' },
  { index: 4, range: '4:00-5:00' },
  { index: 5, range: '5:00-6:00' },
  { index: 6, range: '6:00-7:00' },
]

export function DowntimeRecordingPage() {
  // Selection state
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)

  // Master data
  const [shifts, setShifts] = useState<Shift[]>([])
  const [misParts, setMisParts] = useState<MisPart[]>([])
  const [misLines, setMisLines] = useState<MisProductionLine[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [lossCodes, setLossCodes] = useState<LossCode[]>([])
  const [opStations, setOpStations] = useState<OpStation[]>([])

  // Summary data for cards
  const [stationSummary, setStationSummary] = useState<StationDowntimeSummary[]>([])

  // Sheet state - shows entries for selected station
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedStation, setSelectedStation] = useState<OpStation | null>(null)
  const [stationEntries, setStationEntries] = useState<StationDowntime[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigningEntry, setAssigningEntry] = useState<StationDowntime | null>(null)
  const [assignLossCodeId, setAssignLossCodeId] = useState<number | null>(null)
  const [assignNotes, setAssignNotes] = useState('')

  // Manual entry form state
  const [showManualForm, setShowManualForm] = useState(false)
  const [formShiftId, setFormShiftId] = useState<number | null>(null)
  const [formSlotIndex, setFormSlotIndex] = useState<number | null>(null)
  const [formSlotTimeRange, setFormSlotTimeRange] = useState('')
  const [formOperatorId, setFormOperatorId] = useState<number | null>(null)
  const [formLossCodeId, setFormLossCodeId] = useState<number | null>(null)
  const [formDowntimeMinutes, setFormDowntimeMinutes] = useState(15)
  const [formNotes, setFormNotes] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load master data on mount
  useEffect(() => {
    loadMasterData()
  }, [])

  // Load MIS lines when part changes
  useEffect(() => {
    if (selectedPartId) {
      loadMisLines()
    } else {
      setMisLines([])
      setSelectedLineId(null)
    }
  }, [selectedPartId])

  // Load OP stations and summary when line changes
  useEffect(() => {
    if (selectedLineId) {
      loadOpStations()
      loadSummary()
    } else {
      setOpStations([])
      setStationSummary([])
    }
  }, [selectedLineId, selectedDate])

  const loadMasterData = async () => {
    try {
      const [shiftsData, misPartsData, operatorsData, lossCodesData] = await Promise.all([
        api.getShifts(),
        api.getMisParts(),
        api.getOperators(),
        api.getLossCodes(),
      ])
      setShifts(shiftsData)
      setMisParts(misPartsData)
      setOperators(operatorsData)
      setLossCodes(lossCodesData)

      // Try to get current shift/slot for defaults
      try {
        const currentSlot = await api.getCurrentShiftSlot()
        if (currentSlot) {
          setFormShiftId(currentSlot.shiftId)
          setFormSlotIndex(currentSlot.slotIndex)
          setFormSlotTimeRange(currentSlot.slotTimeRange)
        }
      } catch {
        // Ignore if not in any shift
      }
    } catch (err) {
      setError('Failed to load master data')
      console.error(err)
    }
  }

  const loadMisLines = async () => {
    if (!selectedPartId) return
    try {
      const linesData = await api.getMisPartLines(selectedPartId)
      setMisLines(linesData)
    } catch (err) {
      console.error('Failed to load MIS lines:', err)
    }
  }

  const loadOpStations = async () => {
    try {
      const productionLines = await api.getProductionLines()
      if (productionLines.length > 0) {
        const stationsData = await api.getOpStations(productionLines[0].id)
        setOpStations(stationsData)
      }
    } catch (err) {
      console.error('Failed to load OP stations:', err)
    }
  }

  const loadSummary = async () => {
    if (!selectedLineId || !selectedDate) return
    setLoading(true)
    try {
      const summaryData = await api.getStationDowntimeSummary(selectedDate, selectedLineId)
      setStationSummary(summaryData)
    } catch (err) {
      console.error('Failed to load summary:', err)
      setStationSummary([])
    } finally {
      setLoading(false)
    }
  }

  const loadStationEntries = async (stationId: number) => {
    if (!selectedLineId || !selectedDate) return
    setEntriesLoading(true)
    try {
      const entries = await api.getStationDowntimes({
        date: selectedDate,
        stationId,
        misLineId: selectedLineId,
      })
      setStationEntries(entries)
    } catch (err) {
      console.error('Failed to load station entries:', err)
      setStationEntries([])
    } finally {
      setEntriesLoading(false)
    }
  }

  const handleStationClick = (station: OpStation) => {
    setSelectedStation(station)
    setShowManualForm(false)
    setError(null)
    setSuccessMessage(null)
    loadStationEntries(station.id)
    setSheetOpen(true)
  }

  const handleSimulate = async () => {
    if (!selectedLineId || !selectedDate) return
    setSimulating(true)
    setError(null)
    try {
      const result = await api.simulateDowntime(selectedDate, selectedLineId)
      setSuccessMessage(`Simulated ${result.generated} downtime entries`)
      loadSummary()
      // Refresh sheet entries if open
      if (selectedStation) {
        loadStationEntries(selectedStation.id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to simulate downtime')
      console.error(err)
    } finally {
      setSimulating(false)
    }
  }

  const handleAssignClick = (entry: StationDowntime) => {
    setAssigningEntry(entry)
    setAssignLossCodeId(null)
    setAssignNotes('')
    setAssignDialogOpen(true)
  }

  const handleAssignConfirm = async () => {
    if (!assigningEntry || !assignLossCodeId) return
    setSaving(true)
    try {
      await api.assignStationDowntime(assigningEntry.id, {
        lossCodeId: assignLossCodeId,
        notes: assignNotes || undefined,
      })
      setAssignDialogOpen(false)
      setAssigningEntry(null)
      // Refresh entries and summary
      if (selectedStation) {
        loadStationEntries(selectedStation.id)
      }
      loadSummary()
    } catch (err: any) {
      setError(err.message || 'Failed to assign loss code')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await api.deleteStationDowntime(entryId)
      if (selectedStation) {
        loadStationEntries(selectedStation.id)
      }
      loadSummary()
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry')
      console.error(err)
    }
  }

  const handleManualSubmit = async () => {
    if (!selectedStation || !selectedLineId || !formShiftId || formSlotIndex === null) {
      setError('Please fill in all required fields')
      return
    }
    if (formDowntimeMinutes <= 0) {
      setError('Downtime minutes must be greater than 0')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await api.createStationDowntime({
        date: selectedDate,
        shiftId: formShiftId,
        slotIndex: formSlotIndex,
        slotTimeRange: formSlotTimeRange,
        stationId: selectedStation.id,
        misLineId: selectedLineId,
        operatorId: formOperatorId ?? undefined,
        lossCodeId: formLossCodeId ?? undefined,
        downtimeMinutes: formDowntimeMinutes,
        notes: formNotes || undefined,
      })

      setShowManualForm(false)
      setFormDowntimeMinutes(15)
      setFormLossCodeId(null)
      setFormNotes('')
      // Refresh entries and summary
      loadStationEntries(selectedStation.id)
      loadSummary()
    } catch (err: any) {
      setError(err.message || 'Failed to create downtime entry')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleShiftChange = (shiftId: number) => {
    setFormShiftId(shiftId)
    setFormSlotIndex(null)
    setFormSlotTimeRange('')
  }

  const handleSlotChange = (slotIndex: number, timeRange: string) => {
    setFormSlotIndex(slotIndex)
    setFormSlotTimeRange(timeRange)
  }

  // Get slots for selected shift
  const getSlots = () => {
    const shift = shifts.find(s => s.id === formShiftId)
    if (!shift) return []
    switch (shift.type) {
      case 1: return SHIFT_A_SLOTS
      case 2: return SHIFT_B_SLOTS
      case 3: return SHIFT_C_SLOTS
      default: return []
    }
  }

  // Get summary data for a station
  const getStationSummary = (stationId: number) => {
    return stationSummary.find(s => s.stationId === stationId)
  }

  // Get card color based on downtime status
  const getCardColor = (stationId: number) => {
    const summary = getStationSummary(stationId)
    if (!summary || summary.totalEntries === 0) return 'border-green-500/50 bg-green-500/5'
    if (summary.unassignedCount > 0) return 'border-red-500/50 bg-red-500/5'
    return 'border-yellow-500/50 bg-yellow-500/5'
  }

  // Status badge for entries
  const getStatusBadge = (status: StationDowntimeStatus) => {
    switch (status) {
      case StationDowntimeStatus.Unassigned:
        return <Badge variant="destructive">Unassigned</Badge>
      case StationDowntimeStatus.Assigned:
        return <Badge className="bg-green-600">Assigned</Badge>
      case StationDowntimeStatus.Manual:
        return <Badge className="bg-blue-600">Manual</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    return `${hours}:${minutes}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="h-6 w-6" />
            Downtime Recording
          </h1>
          <p className="text-muted-foreground">
            Record and assign loss codes to downtime at OP stations
          </p>
        </div>
        {selectedLineId && (
          <Button
            onClick={handleSimulate}
            disabled={simulating}
            variant="outline"
            className="gap-2"
          >
            {simulating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Simulate Downtime
          </Button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-destructive">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-green-500">{successMessage}</span>
        </div>
      )}

      {/* Selection Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Part */}
            <div className="space-y-2">
              <Label>Part</Label>
              <Select
                value={selectedPartId?.toString() || ''}
                onValueChange={(val) => setSelectedPartId(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select part" />
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

            {/* Line */}
            <div className="space-y-2">
              <Label>Production Line</Label>
              <Select
                value={selectedLineId?.toString() || ''}
                onValueChange={(val) => setSelectedLineId(parseInt(val))}
                disabled={!selectedPartId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select line" />
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
          </div>
        </CardContent>
      </Card>

      {/* OP Station Cards */}
      {selectedLineId && (
        <Card>
          <CardHeader>
            <CardTitle>OP Stations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading stations...</p>
              </div>
            ) : opStations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No OP stations found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {opStations.map((station) => {
                  const summary = getStationSummary(station.id)
                  const totalMinutes = summary?.totalMinutes ?? 0
                  const unassigned = summary?.unassignedCount ?? 0
                  return (
                    <Card
                      key={station.id}
                      className={`cursor-pointer hover:border-primary transition-colors ${getCardColor(station.id)}`}
                      onClick={() => handleStationClick(station)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="font-bold text-lg">{station.code}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {station.name}
                        </div>
                        <div className="space-y-1">
                          <Badge
                            variant={totalMinutes > 0 ? 'default' : 'secondary'}
                            className="text-sm"
                          >
                            {totalMinutes} min
                          </Badge>
                          {unassigned > 0 && (
                            <div>
                              <Badge variant="destructive" className="text-xs">
                                {unassigned} unassigned
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Color legend */}
            {opStations.length > 0 && (
              <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-green-500/50 bg-green-500/20" />
                  No downtime
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-red-500/50 bg-red-500/20" />
                  Has unassigned
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-yellow-500/50 bg-yellow-500/20" />
                  All assigned
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Station Entries Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] sm:w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Downtime Entries
            </SheetTitle>
            <SheetDescription>
              {selectedStation && (
                <span>
                  <strong>{selectedStation.code}</strong> - {selectedStation.name}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Context Info */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                <span className="font-medium">{selectedDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Line:</span>{' '}
                <span className="font-medium">{misLines.find(l => l.id === selectedLineId)?.name}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowManualForm(!showManualForm)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Manual Entry
              </Button>
            </div>

            {/* Manual Entry Form */}
            {showManualForm && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-4">
                  <div className="font-medium text-sm">New Manual Entry</div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Shift */}
                    <div className="space-y-1">
                      <Label className="text-xs">Shift</Label>
                      <Select
                        value={formShiftId?.toString() || ''}
                        onValueChange={(val) => handleShiftChange(parseInt(val))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id.toString()}>
                              {shift.name} ({formatTime(shift.startTime)} - {formatTime(shift.endTime)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Slot */}
                    <div className="space-y-1">
                      <Label className="text-xs">Time Slot</Label>
                      <Select
                        value={formSlotIndex !== null ? `${formSlotIndex}` : ''}
                        onValueChange={(val) => {
                          const index = parseInt(val)
                          const slots = getSlots()
                          const slot = slots.find(s => s.index === index)
                          if (slot) handleSlotChange(index, slot.range)
                        }}
                        disabled={!formShiftId}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSlots().map((slot) => (
                            <SelectItem key={slot.index} value={slot.index.toString()}>
                              {slot.range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Minutes */}
                    <div className="space-y-1">
                      <Label className="text-xs">Downtime (min)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={formDowntimeMinutes}
                        onChange={(e) => setFormDowntimeMinutes(parseInt(e.target.value) || 1)}
                        className="h-9"
                      />
                    </div>

                    {/* Operator */}
                    <div className="space-y-1">
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={formOperatorId?.toString() || ''}
                        onValueChange={(val) => setFormOperatorId(parseInt(val))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.id} value={op.id.toString()}>
                              {op.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Loss Code */}
                  <div className="space-y-1">
                    <Label className="text-xs">Loss Code (optional)</Label>
                    <Select
                      value={formLossCodeId?.toString() || ''}
                      onValueChange={(val) => setFormLossCodeId(parseInt(val))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select loss code" />
                      </SelectTrigger>
                      <SelectContent>
                        {lossCodes.map((code) => (
                          <SelectItem key={code.id} value={code.id.toString()}>
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {code.code}
                              </Badge>
                              {code.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      placeholder="Optional notes..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowManualForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleManualSubmit}
                      disabled={saving || !formShiftId || formSlotIndex === null}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Add Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Entries Table */}
            {entriesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
              </div>
            ) : stationEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Timer className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No downtime entries for this station</p>
                <p className="text-xs mt-1">Click "Simulate Downtime" to generate demo data</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Loss Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{entry.shiftName}</TableCell>
                      <TableCell className="text-sm">{entry.slotTimeRange}</TableCell>
                      <TableCell className="font-medium">{entry.downtimeMinutes}</TableCell>
                      <TableCell>
                        {entry.lossCodeName ? (
                          <span className="text-sm">
                            <Badge variant="outline" className="font-mono text-xs mr-1">
                              {entry.lossCodeCode}
                            </Badge>
                            {entry.lossCodeName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {entry.status === StationDowntimeStatus.Unassigned && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleAssignClick(entry)}
                            >
                              <Tag className="h-3 w-3" />
                              Assign
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Error in sheet */}
            {error && sheetOpen && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{error}</span>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Assign Loss Code Dialog */}
      <AlertDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Assign Loss Code
            </AlertDialogTitle>
            <AlertDialogDescription>
              {assigningEntry && (
                <span>
                  Assign a loss code to <strong>{assigningEntry.downtimeMinutes} min</strong> downtime at{' '}
                  <strong>{assigningEntry.stationCode}</strong> ({assigningEntry.slotTimeRange})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            {/* Loss Code Select */}
            <div className="space-y-2">
              <Label>Loss Code</Label>
              <Select
                value={assignLossCodeId?.toString() || ''}
                onValueChange={(val) => setAssignLossCodeId(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loss code" />
                </SelectTrigger>
                <SelectContent>
                  {lossCodes.map((code) => (
                    <SelectItem key={code.id} value={code.id.toString()}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {code.code}
                        </Badge>
                        {code.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Additional notes..."
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssignConfirm}
              disabled={!assignLossCodeId || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Assign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
