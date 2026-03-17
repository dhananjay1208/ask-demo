import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Badge } from '@/components/ui/badge'
import {
  XCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react'
import type {
  Shift,
  MisPart,
  MisProductionLine,
  Operator,
  RejectionCategory,
  StationRejectionSummary,
  QualityStation,
} from '@/types'
import { RejectionType } from '@/types'

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

export function RecordRejectsPage() {
  // Selection state - cascading flow: Part → Line → Show stations
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
  const [qualityStations, setQualityStations] = useState<QualityStation[]>([])
  const [rejectionCategories, setRejectionCategories] = useState<RejectionCategory[]>([])

  // Summary data for cards
  const [stationSummary, setStationSummary] = useState<StationRejectionSummary[]>([])

  // Sheet/form state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedStation, setSelectedStation] = useState<QualityStation | null>(null)

  // Form fields
  const [formDate, setFormDate] = useState(selectedDate)
  const [formShiftId, setFormShiftId] = useState<number | null>(null)
  const [formSlotIndex, setFormSlotIndex] = useState<number | null>(null)
  const [formSlotTimeRange, setFormSlotTimeRange] = useState('')
  const [formOperatorId, setFormOperatorId] = useState<number | null>(null)
  const [formRejectionType, setFormRejectionType] = useState<RejectionType>(RejectionType.Machining)
  const [formRejectionCategoryId, setFormRejectionCategoryId] = useState<number | null>(null)
  const [formRejectCount, setFormRejectCount] = useState(1)
  const [formNotes, setFormNotes] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
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

  // Load quality stations and summary when line changes
  useEffect(() => {
    if (selectedLineId) {
      loadQualityStations()
      loadSummary()
    } else {
      setQualityStations([])
      setStationSummary([])
    }
  }, [selectedLineId, selectedDate])

  const loadMasterData = async () => {
    try {
      const [shiftsData, misPartsData, operatorsData, categoriesData] = await Promise.all([
        api.getShifts(),
        api.getMisParts(),
        api.getOperators(),
        api.getRejectionCategories(),
      ])
      setShifts(shiftsData)
      setMisParts(misPartsData)
      setOperators(operatorsData)
      setRejectionCategories(categoriesData)

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

  const loadQualityStations = async () => {
    try {
      // Get all production lines to find the first one (CCRH)
      const productionLines = await api.getProductionLines()
      if (productionLines.length > 0) {
        const stationsData = await api.getQualityStations(productionLines[0].id)
        setQualityStations(stationsData)
      }
    } catch (err) {
      console.error('Failed to load quality stations:', err)
    }
  }

  const loadSummary = async () => {
    if (!selectedLineId || !selectedDate) return
    setLoading(true)
    try {
      const summaryData = await api.getStationRejectionSummary(selectedDate, selectedLineId)
      setStationSummary(summaryData)
    } catch (err) {
      console.error('Failed to load summary:', err)
      setStationSummary([])
    } finally {
      setLoading(false)
    }
  }

  const handleStationClick = async (station: QualityStation) => {
    setSelectedStation(station)
    setFormDate(selectedDate)
    setFormRejectCount(1)
    setFormNotes('')
    setFormRejectionCategoryId(null)
    setError(null)
    setSuccessMessage(null)

    // Try to auto-populate operator from assignment
    if (selectedLineId && formShiftId) {
      try {
        const assignments = await api.getStationAssignments({
          date: selectedDate,
          shiftId: formShiftId,
          misLineId: selectedLineId,
          stationId: station.id,
        })
        if (assignments.length > 0) {
          setFormOperatorId(assignments[0].operatorId)
        } else {
          setFormOperatorId(null)
        }
      } catch {
        setFormOperatorId(null)
      }
    }

    setSheetOpen(true)
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

  const handleRejectionTypeChange = (type: RejectionType) => {
    setFormRejectionType(type)
    setFormRejectionCategoryId(null)
  }

  const handleSubmit = async () => {
    if (!selectedStation || !selectedLineId || !formShiftId || formSlotIndex === null || !formRejectionCategoryId) {
      setError('Please fill in all required fields')
      return
    }

    if (formRejectCount <= 0) {
      setError('Reject count must be greater than 0')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await api.createStationRejection({
        date: formDate,
        shiftId: formShiftId,
        slotIndex: formSlotIndex,
        slotTimeRange: formSlotTimeRange,
        stationId: selectedStation.id,
        misLineId: selectedLineId,
        operatorId: formOperatorId ?? undefined,
        rejectionCategoryId: formRejectionCategoryId,
        rejectCount: formRejectCount,
        notes: formNotes || undefined,
      })

      setSuccessMessage(`Recorded ${formRejectCount} rejection(s) at ${selectedStation.code}`)
      setSheetOpen(false)
      loadSummary() // Refresh the summary
    } catch (err: any) {
      setError(err.message || 'Failed to record rejection')
      console.error(err)
    } finally {
      setSaving(false)
    }
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

  // Get filtered rejection categories
  const filteredCategories = rejectionCategories.filter(c => c.type === formRejectionType)

  // Get rejection count for a station
  const getStationRejectCount = (stationId: number) => {
    const summary = stationSummary.find(s => s.stationId === stationId)
    return summary?.totalRejects ?? 0
  }

  // Format time for display
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
            <XCircle className="h-6 w-6" />
            Record Rejects
          </h1>
          <p className="text-muted-foreground">
            Record rejections at Quality Gate stations
          </p>
        </div>
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

      {/* Quality Gate Stations */}
      {selectedLineId && (
        <Card>
          <CardHeader>
            <CardTitle>Quality Gate Stations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading stations...</p>
              </div>
            ) : qualityStations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No Quality Gate stations found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {qualityStations.map((station) => {
                  const rejectCount = getStationRejectCount(station.id)
                  return (
                    <Card
                      key={station.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleStationClick(station)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="font-bold text-lg">{station.code}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {station.name}
                        </div>
                        <Badge
                          variant={rejectCount > 0 ? 'destructive' : 'secondary'}
                          className="text-sm"
                        >
                          {rejectCount} rej
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entry Form Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Record Rejection
            </SheetTitle>
            <SheetDescription>
              {selectedStation && (
                <span>
                  Recording rejection at <strong>{selectedStation.code}</strong> - {selectedStation.name}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Context Info */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground">Part:</span>{' '}
                <span className="font-medium">{misParts.find(p => p.id === selectedPartId)?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Line:</span>{' '}
                <span className="font-medium">{misLines.find(l => l.id === selectedLineId)?.name}</span>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="form-date">Date</Label>
              <input
                type="date"
                id="form-date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Shift */}
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select
                value={formShiftId?.toString() || ''}
                onValueChange={(val) => handleShiftChange(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
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
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Select
                value={formSlotIndex !== null ? `${formSlotIndex}` : ''}
                onValueChange={(val) => {
                  const index = parseInt(val)
                  const slots = getSlots()
                  const slot = slots.find(s => s.index === index)
                  if (slot) {
                    handleSlotChange(index, slot.range)
                  }
                }}
                disabled={!formShiftId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
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

            {/* Operator */}
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select
                value={formOperatorId?.toString() || ''}
                onValueChange={(val) => setFormOperatorId(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id.toString()}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {op.badgeNumber}
                        </Badge>
                        {op.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto-populated from station assignment if available
              </p>
            </div>

            {/* Rejection Type */}
            <div className="space-y-2">
              <Label>Rejection Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formRejectionType === RejectionType.Machining ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleRejectionTypeChange(RejectionType.Machining)}
                >
                  Machining
                </Button>
                <Button
                  type="button"
                  variant={formRejectionType === RejectionType.Casting ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleRejectionTypeChange(RejectionType.Casting)}
                >
                  Casting
                </Button>
              </div>
            </div>

            {/* Reject Reason */}
            <div className="space-y-2">
              <Label>Reject Reason</Label>
              <Select
                value={formRejectionCategoryId?.toString() || ''}
                onValueChange={(val) => setFormRejectionCategoryId(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {cat.code}
                        </Badge>
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reject Count */}
            <div className="space-y-2">
              <Label htmlFor="reject-count">Reject Count</Label>
              <Input
                id="reject-count"
                type="number"
                min="1"
                value={formRejectCount}
                onChange={(e) => setFormRejectCount(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Error in sheet */}
            {error && sheetOpen && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={saving || !formShiftId || formSlotIndex === null || !formRejectionCategoryId}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Rejection
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
