import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Save, RefreshCw } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Default slot configurations (matches backend defaults)
const DEFAULT_SLOTS = {
  shiftA: [
    { slotIndex: 0, timeRange: '7:00-8:00', defaultTime: 3300 },
    { slotIndex: 1, timeRange: '8:00-9:00', defaultTime: 3600 },
    { slotIndex: 2, timeRange: '9:00-10:00', defaultTime: 3000 },
    { slotIndex: 3, timeRange: '10:00-11:00', defaultTime: 3600 },
    { slotIndex: 4, timeRange: '11:00-12:00', defaultTime: 3600 },
    { slotIndex: 5, timeRange: '12:00-1:00', defaultTime: 1800 },
    { slotIndex: 6, timeRange: '1:00-2:00', defaultTime: 3600 },
    { slotIndex: 7, timeRange: '2:00-3:00', defaultTime: 3600 },
    { slotIndex: 8, timeRange: '3:00-3:30', defaultTime: 1800 },
  ],
  shiftB: [
    { slotIndex: 0, timeRange: '3:30-4:30', defaultTime: 3600 },
    { slotIndex: 1, timeRange: '4:30-5:30', defaultTime: 3000 },
    { slotIndex: 2, timeRange: '5:30-6:30', defaultTime: 3600 },
    { slotIndex: 3, timeRange: '6:30-7:30', defaultTime: 2700 },
    { slotIndex: 4, timeRange: '7:30-8:30', defaultTime: 3600 },
    { slotIndex: 5, timeRange: '8:30-9:30', defaultTime: 1800 },
    { slotIndex: 6, timeRange: '9:30-10:30', defaultTime: 3600 },
    { slotIndex: 7, timeRange: '10:30-11:30', defaultTime: 3000 },
    { slotIndex: 8, timeRange: '11:30-12:00', defaultTime: 1800 },
  ],
  shiftC: [
    { slotIndex: 0, timeRange: '12:00-1:00', defaultTime: 3600 },
    { slotIndex: 1, timeRange: '1:00-2:00', defaultTime: 3600 },
    { slotIndex: 2, timeRange: '2:00-3:00', defaultTime: 3600 },
    { slotIndex: 3, timeRange: '3:00-4:00', defaultTime: 3000 },
    { slotIndex: 4, timeRange: '4:00-5:00', defaultTime: 3600 },
    { slotIndex: 5, timeRange: '5:00-6:00', defaultTime: 3600 },
    { slotIndex: 6, timeRange: '6:00-7:00', defaultTime: 3000 },
  ],
}

interface SlotState {
  shiftId: number
  slotIndex: number
  timeRange: string
  availableTimeSeconds: number
}

export function HourlyPlanningPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  // Form state
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [cycleTimeSeconds, setCycleTimeSeconds] = useState<number>(135)
  const [slots, setSlots] = useState<SlotState[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch MIS parts
  const { data: misParts = [] } = useQuery({
    queryKey: ['misParts'],
    queryFn: api.getMisParts,
  })

  // Fetch lines for selected part
  const { data: misLines = [] } = useQuery({
    queryKey: ['misPartLines', selectedPartId],
    queryFn: () => api.getMisPartLines(selectedPartId!),
    enabled: !!selectedPartId,
  })

  // Fetch shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: api.getShifts,
  })

  // Fetch existing plan
  const { data: existingPlan, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['hourlyPlan', selectedDate, selectedLineId],
    queryFn: () => api.getHourlyPlan(selectedDate, selectedLineId!),
    enabled: !!selectedLineId && !!selectedDate,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: api.saveHourlyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hourlyPlan', selectedDate, selectedLineId] })
      setHasChanges(false)
    },
  })

  // Get shift IDs from shifts data
  const shiftA = shifts.find(s => s.name === 'Shift A')
  const shiftB = shifts.find(s => s.name === 'Shift B')
  const shiftC = shifts.find(s => s.name === 'Shift C')

  // Initialize slots when line is selected or plan is loaded
  useEffect(() => {
    if (!selectedLineId || !shiftA || !shiftB || !shiftC) return

    if (existingPlan) {
      // Load from existing plan
      setCycleTimeSeconds(existingPlan.cycleTimeSeconds)
      setSlots(existingPlan.slots.map(s => ({
        shiftId: s.shiftId,
        slotIndex: s.slotIndex,
        timeRange: s.timeRange,
        availableTimeSeconds: s.availableTimeSeconds,
      })))
      setHasChanges(false)
    } else {
      // Initialize with defaults
      const defaultSlots: SlotState[] = [
        ...DEFAULT_SLOTS.shiftA.map(s => ({
          shiftId: shiftA.id,
          slotIndex: s.slotIndex,
          timeRange: s.timeRange,
          availableTimeSeconds: s.defaultTime,
        })),
        ...DEFAULT_SLOTS.shiftB.map(s => ({
          shiftId: shiftB.id,
          slotIndex: s.slotIndex,
          timeRange: s.timeRange,
          availableTimeSeconds: s.defaultTime,
        })),
        ...DEFAULT_SLOTS.shiftC.map(s => ({
          shiftId: shiftC.id,
          slotIndex: s.slotIndex,
          timeRange: s.timeRange,
          availableTimeSeconds: s.defaultTime,
        })),
      ]
      setSlots(defaultSlots)
      setHasChanges(false)
    }
  }, [selectedLineId, existingPlan, shiftA, shiftB, shiftC])

  // Reset line when part changes
  useEffect(() => {
    setSelectedLineId(null)
    setSlots([])
  }, [selectedPartId])

  // Update slot available time
  const updateSlotTime = (shiftId: number, slotIndex: number, value: number) => {
    setSlots(prev => prev.map(s =>
      s.shiftId === shiftId && s.slotIndex === slotIndex
        ? { ...s, availableTimeSeconds: value }
        : s
    ))
    setHasChanges(true)
  }

  // Calculate production target for a slot (round to nearest integer)
  const calculateTarget = (availableTimeSeconds: number) => {
    if (cycleTimeSeconds <= 0) return 0
    return Math.round(availableTimeSeconds / cycleTimeSeconds)
  }

  // Get slots for a specific shift
  const getSlotsForShift = (shiftId: number) => {
    return slots.filter(s => s.shiftId === shiftId).sort((a, b) => a.slotIndex - b.slotIndex)
  }

  // Calculate shift total
  const getShiftTotal = (shiftId: number) => {
    return getSlotsForShift(shiftId).reduce((sum, s) => sum + calculateTarget(s.availableTimeSeconds), 0)
  }

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return slots.reduce((sum, s) => sum + calculateTarget(s.availableTimeSeconds), 0)
  }, [slots, cycleTimeSeconds])

  // Handle save
  const handleSave = () => {
    if (!selectedLineId || !selectedDate) return

    saveMutation.mutate({
      date: selectedDate,
      misLineId: selectedLineId,
      cycleTimeSeconds,
      slots: slots.map(s => ({
        shiftId: s.shiftId,
        slotIndex: s.slotIndex,
        timeRange: s.timeRange,
        availableTimeSeconds: s.availableTimeSeconds,
      })),
    })
  }

  // Reset to defaults
  const handleResetToDefaults = () => {
    if (!shiftA || !shiftB || !shiftC) return

    const defaultSlots: SlotState[] = [
      ...DEFAULT_SLOTS.shiftA.map(s => ({
        shiftId: shiftA.id,
        slotIndex: s.slotIndex,
        timeRange: s.timeRange,
        availableTimeSeconds: s.defaultTime,
      })),
      ...DEFAULT_SLOTS.shiftB.map(s => ({
        shiftId: shiftB.id,
        slotIndex: s.slotIndex,
        timeRange: s.timeRange,
        availableTimeSeconds: s.defaultTime,
      })),
      ...DEFAULT_SLOTS.shiftC.map(s => ({
        shiftId: shiftC.id,
        slotIndex: s.slotIndex,
        timeRange: s.timeRange,
        availableTimeSeconds: s.defaultTime,
      })),
    ]
    setSlots(defaultSlots)
    setHasChanges(true)
  }

  // Shift table component
  const ShiftTable = ({ shiftId, shiftName, color }: { shiftId: number; shiftName: string; color: string }) => {
    const shiftSlots = getSlotsForShift(shiftId)
    const shiftTotal = getShiftTotal(shiftId)

    if (shiftSlots.length === 0) return null

    return (
      <Card className="mb-4">
        <CardHeader className={`py-3 ${color}`}>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white text-lg">{shiftName}</CardTitle>
            <span className="text-white font-semibold">Total: {shiftTotal}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium w-24">Time</th>
                {shiftSlots.map(slot => (
                  <th key={slot.slotIndex} className="px-2 py-2 text-center font-medium min-w-[80px]">
                    {slot.timeRange}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-2 font-medium text-muted-foreground">Avail (s)</td>
                {shiftSlots.map(slot => (
                  <td key={slot.slotIndex} className="px-1 py-2 text-center">
                    <Input
                      type="number"
                      value={slot.availableTimeSeconds}
                      onChange={(e) => updateSlotTime(shiftId, slot.slotIndex, parseInt(e.target.value) || 0)}
                      className="w-full text-center h-8 text-sm"
                      min={0}
                      max={3600}
                    />
                  </td>
                ))}
              </tr>
              <tr className="bg-muted/30">
                <td className="px-3 py-2 font-medium text-muted-foreground">Target</td>
                {shiftSlots.map(slot => (
                  <td key={slot.slotIndex} className="px-2 py-2 text-center font-semibold">
                    {calculateTarget(slot.availableTimeSeconds)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Hourly Production Planning
          </h1>
          <p className="text-muted-foreground">
            Plan production targets across shifts
          </p>
        </div>
      </div>

      {/* Selection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Part Selector */}
            <div className="space-y-2">
              <Label>Part</Label>
              <Select
                value={selectedPartId?.toString() || ''}
                onValueChange={(v) => setSelectedPartId(parseInt(v))}
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

            {/* Line Selector */}
            <div className="space-y-2">
              <Label>Line</Label>
              <Select
                value={selectedLineId?.toString() || ''}
                onValueChange={(v) => setSelectedLineId(parseInt(v))}
                disabled={!selectedPartId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select line..." />
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

            {/* Cycle Time */}
            <div className="space-y-2">
              <Label>Cycle Time (sec)</Label>
              <Input
                type="number"
                value={cycleTimeSeconds}
                onChange={(e) => {
                  setCycleTimeSeconds(parseInt(e.target.value) || 0)
                  setHasChanges(true)
                }}
                min={1}
                placeholder="e.g., 135"
              />
            </div>

            {/* Save Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                disabled={!selectedLineId}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedLineId || !hasChanges || saveMutation.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Plan'}
              </Button>
            </div>
          </div>

          {/* Status Messages */}
          {saveMutation.isSuccess && (
            <p className="text-green-600 text-sm mt-2">Plan saved successfully!</p>
          )}
          {saveMutation.isError && (
            <p className="text-red-600 text-sm mt-2">Error saving plan. Please try again.</p>
          )}
          {existingPlan && !hasChanges && (
            <p className="text-muted-foreground text-sm mt-2">
              Loaded existing plan (last updated: {new Date(existingPlan.updatedAt || existingPlan.createdAt).toLocaleString()})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Shift Tables */}
      {selectedLineId && slots.length > 0 && (
        <>
          {/* Shift A - Blue */}
          {shiftA && (
            <ShiftTable
              shiftId={shiftA.id}
              shiftName="SHIFT A (07:00 - 15:30)"
              color="bg-blue-600"
            />
          )}

          {/* Shift B - Green */}
          {shiftB && (
            <ShiftTable
              shiftId={shiftB.id}
              shiftName="SHIFT B (15:30 - 00:00)"
              color="bg-green-600"
            />
          )}

          {/* Shift C - Purple */}
          {shiftC && (
            <ShiftTable
              shiftId={shiftC.id}
              shiftName="SHIFT C (00:00 - 07:30)"
              color="bg-purple-600"
            />
          )}

          {/* Grand Total */}
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">GRAND TOTAL</span>
                <span className="font-bold text-2xl">{grandTotal} units</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!selectedLineId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a date, part, and line to view or create an hourly production plan.</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {selectedLineId && isLoadingPlan && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
            <p>Loading plan...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
