import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
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
  UserCog,
  Calendar,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type {
  Shift,
  MisPart,
  MisProductionLine,
  Station,
  Operator,
  StationAssignment,
} from '@/types'

export function OperatorAssignmentPage() {
  // Selection state - cascading flow: Date → Shift → Part → Line → Station → Operator
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null)
  const [selectedOperatorId, setSelectedOperatorId] = useState<number | null>(null)

  // Master data
  const [shifts, setShifts] = useState<Shift[]>([])
  const [misParts, setMisParts] = useState<MisPart[]>([])
  const [misLines, setMisLines] = useState<MisProductionLine[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [operators, setOperators] = useState<Operator[]>([])

  // Assignments data
  const [assignments, setAssignments] = useState<StationAssignment[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<StationAssignment | null>(null)

  // Load master data on mount
  useEffect(() => {
    loadMasterData()
  }, [])

  // Load assignments when date, shift, or line changes
  useEffect(() => {
    if (selectedDate && selectedShiftId && selectedLineId) {
      loadAssignments()
    } else {
      setAssignments([])
    }
  }, [selectedDate, selectedShiftId, selectedLineId])

  // Load MIS lines when part changes
  useEffect(() => {
    if (selectedPartId) {
      loadMisLines()
    } else {
      setMisLines([])
      setSelectedLineId(null)
    }
  }, [selectedPartId])

  // Load stations when line changes
  useEffect(() => {
    if (selectedLineId) {
      loadStations()
    } else {
      setStations([])
      setSelectedStationId(null)
    }
  }, [selectedLineId])

  // Clear downstream selections when upstream changes
  useEffect(() => {
    setSelectedPartId(null)
    setSelectedLineId(null)
    setSelectedStationId(null)
    setSelectedOperatorId(null)
  }, [selectedShiftId])

  useEffect(() => {
    setSelectedLineId(null)
    setSelectedStationId(null)
    setSelectedOperatorId(null)
  }, [selectedPartId])

  useEffect(() => {
    setSelectedStationId(null)
    setSelectedOperatorId(null)
  }, [selectedLineId])

  const loadMasterData = async () => {
    try {
      const [shiftsData, misPartsData, operatorsData] = await Promise.all([
        api.getShifts(),
        api.getMisParts(),
        api.getOperators(),
      ])
      setShifts(shiftsData)
      setMisParts(misPartsData)
      setOperators(operatorsData)
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

  const loadStations = async () => {
    if (!selectedLineId) return
    try {
      // Get stations from the main production line (CCRH - lineId 1)
      // MIS lines are for organizational purposes; stations come from actual production line
      const productionLines = await api.getProductionLines()
      if (productionLines.length > 0) {
        const stationsData = await api.getStations(productionLines[0].id)
        setStations(stationsData)
      }
    } catch (err) {
      console.error('Failed to load stations:', err)
    }
  }

  const loadAssignments = async () => {
    if (!selectedDate || !selectedShiftId || !selectedLineId) return
    setLoading(true)
    setError(null)

    try {
      const data = await api.getStationAssignments({
        date: selectedDate,
        shiftId: selectedShiftId,
        misLineId: selectedLineId,
      })
      setAssignments(data)
    } catch (err) {
      console.error('Failed to load assignments:', err)
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedDate || !selectedShiftId || !selectedLineId || !selectedStationId || !selectedOperatorId) {
      setError('Please select all required fields')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await api.createStationAssignment({
        date: selectedDate,
        shiftId: selectedShiftId,
        misLineId: selectedLineId,
        stationId: selectedStationId,
        operatorId: selectedOperatorId,
      })
      setSuccessMessage('Assignment created successfully')
      setSelectedStationId(null)
      setSelectedOperatorId(null)
      loadAssignments()
    } catch (err: any) {
      if (err.message?.includes('Conflict')) {
        setError('Assignment already exists for this station. Delete it first to reassign.')
      } else {
        setError('Failed to create assignment')
      }
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!assignmentToDelete) return

    setSaving(true)
    setError(null)

    try {
      await api.deleteStationAssignment(assignmentToDelete.id)
      setSuccessMessage('Assignment deleted successfully')
      loadAssignments()
    } catch (err) {
      setError('Failed to delete assignment')
      console.error(err)
    } finally {
      setSaving(false)
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
    }
  }

  const confirmDelete = (assignment: StationAssignment) => {
    setAssignmentToDelete(assignment)
    setDeleteDialogOpen(true)
  }

  // Get available stations (not yet assigned)
  const availableStations = stations.filter(
    (station) => !assignments.some((a) => a.stationId === station.id)
  )

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
            <UserCog className="h-6 w-6" />
            Operator Assignment
          </h1>
          <p className="text-muted-foreground">
            Assign operators to stations for a specific date and shift
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Selection Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {/* Shift */}
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select
                value={selectedShiftId?.toString() || ''}
                onValueChange={(val) => setSelectedShiftId(parseInt(val))}
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

            {/* Part */}
            <div className="space-y-2">
              <Label>Part</Label>
              <Select
                value={selectedPartId?.toString() || ''}
                onValueChange={(val) => setSelectedPartId(parseInt(val))}
                disabled={!selectedShiftId}
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

            {/* Divider */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Assignment
              </h3>

              {/* Station */}
              <div className="space-y-2">
                <Label>Station</Label>
                <Select
                  value={selectedStationId?.toString() || ''}
                  onValueChange={(val) => setSelectedStationId(parseInt(val))}
                  disabled={!selectedLineId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStations.map((station) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.code} - {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLineId && availableStations.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    All stations have been assigned
                  </p>
                )}
              </div>

              {/* Operator */}
              <div className="space-y-2 mt-4">
                <Label>Operator</Label>
                <Select
                  value={selectedOperatorId?.toString() || ''}
                  onValueChange={(val) => setSelectedOperatorId(parseInt(val))}
                  disabled={!selectedStationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
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
              </div>

              {/* Assign Button */}
              <Button
                className="w-full mt-4"
                onClick={handleAssign}
                disabled={!selectedStationId || !selectedOperatorId || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Operator
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current Assignments
              </span>
              {assignments.length > 0 && (
                <Badge variant="secondary">
                  {assignments.length} assigned
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedLineId ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a date, shift, part, and line to view assignments</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading assignments...</p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No assignments for this date, shift, and line</p>
                <p className="text-sm mt-1">Use the form on the left to add assignments</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments
                    .sort((a, b) => a.stationSequence - b.stationSequence)
                    .map((assignment, index) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-mono text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{assignment.stationCode}</span>
                            <span className="text-xs text-muted-foreground">
                              {assignment.stationName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {assignment.operatorName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {assignment.operatorBadge}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(assignment)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      {selectedLineId && assignments.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedDate}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <span className="text-muted-foreground">Shift:</span>
                <span className="font-medium">
                  {shifts.find((s) => s.id === selectedShiftId)?.name}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <span className="text-muted-foreground">Line:</span>
                <span className="font-medium">
                  {misLines.find((l) => l.id === selectedLineId)?.name}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">
                  {assignments.length} / {stations.length} stations assigned
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium">{assignmentToDelete?.operatorName}</span> from{' '}
              <span className="font-medium">{assignmentToDelete?.stationCode}</span>?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
