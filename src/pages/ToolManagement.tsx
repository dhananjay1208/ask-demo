import { useState, useEffect, useMemo } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Wrench,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Zap,
  Download,
  ArrowLeft,
} from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import type {
  Shift,
  MisPart,
  MisProductionLine,
  Operator,
  OpStation,
  ToolMaster,
  EarlyReplacementReason,
  ToolChangeRecord,
} from '@/types'

export function ToolManagementPage() {
  // Cascading selection
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null)
  const [selectedToolId, setSelectedToolId] = useState<number | null>(null)

  // Master data
  const [shifts, setShifts] = useState<Shift[]>([])
  const [misParts, setMisParts] = useState<MisPart[]>([])
  const [misLines, setMisLines] = useState<MisProductionLine[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [opStations, setOpStations] = useState<OpStation[]>([])
  const [toolMasters, setToolMasters] = useState<ToolMaster[]>([])
  const [earlyReasons, setEarlyReasons] = useState<EarlyReplacementReason[]>([])

  // Records
  const [records, setRecords] = useState<ToolChangeRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ToolChangeRecord | null>(null)

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formShiftId, setFormShiftId] = useState<number | null>(null)
  const [formEdgeNumber, setFormEdgeNumber] = useState(1)
  const [formPlanLife, setFormPlanLife] = useState(0)
  const [formActualLife, setFormActualLife] = useState<string>('')
  const [formProdOperatorId, setFormProdOperatorId] = useState<number | null>(null)
  const [formQaOperatorId, setFormQaOperatorId] = useState<number | null>(null)
  const [formDiameter, setFormDiameter] = useState('')
  const [formDepth, setFormDepth] = useState('')
  const [formRoughness, setFormRoughness] = useState('')
  const [formIsEarly, setFormIsEarly] = useState(false)
  const [formReasonId, setFormReasonId] = useState<number | null>(null)
  const [formRemarks, setFormRemarks] = useState('')

  // UI state
  const [saving, setSaving] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Derived data
  const prodOperators = useMemo(() => operators.filter(o => o.department === 'Production'), [operators])
  const qaOperators = useMemo(() => operators.filter(o => o.department === 'Quality'), [operators])
  const cncStations = useMemo(() => opStations.filter(s => s.type === 2), [opStations])
  const selectedTool = useMemo(() => toolMasters.find(t => t.id === selectedToolId), [toolMasters, selectedToolId])

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

  // Load stations when line changes
  useEffect(() => {
    if (selectedLineId) {
      loadOpStations()
    } else {
      setOpStations([])
      setSelectedStationId(null)
    }
  }, [selectedLineId])

  // Load tools when station changes
  useEffect(() => {
    if (selectedStationId) {
      loadToolMasters()
    } else {
      setToolMasters([])
      setSelectedToolId(null)
    }
  }, [selectedStationId])

  // Load records when tool changes
  useEffect(() => {
    if (selectedToolId) {
      loadRecords()
    } else {
      setRecords([])
    }
  }, [selectedToolId])

  const loadMasterData = async () => {
    try {
      const [shiftsData, misPartsData, operatorsData, reasonsData] = await Promise.all([
        api.getShifts(),
        api.getMisParts(),
        api.getOperators(),
        api.getEarlyReplacementReasons(),
      ])
      setShifts(shiftsData)
      setMisParts(misPartsData)
      setOperators(operatorsData)
      setEarlyReasons(reasonsData)
    } catch (err) {
      setError('Failed to load master data')
      console.error(err)
    }
  }

  const loadMisLines = async () => {
    if (!selectedPartId) return
    try {
      const lines = await api.getMisPartLines(selectedPartId)
      setMisLines(lines)
      if (lines.length === 1) setSelectedLineId(lines[0].id)
    } catch (err) {
      console.error(err)
    }
  }

  const loadOpStations = async () => {
    try {
      const stations = await api.getOpStations()
      setOpStations(stations)
    } catch (err) {
      console.error(err)
    }
  }

  const loadToolMasters = async () => {
    if (!selectedStationId) return
    try {
      const tools = await api.getToolMasters(selectedStationId)
      setToolMasters(tools)
    } catch (err) {
      console.error(err)
    }
  }

  const loadRecords = async () => {
    if (!selectedToolId) return
    setRecordsLoading(true)
    try {
      const data = await api.getToolChangeRecords({ toolMasterId: selectedToolId })
      setRecords(data)
    } catch (err) {
      console.error(err)
    } finally {
      setRecordsLoading(false)
    }
  }

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    if (!records.length) return { total: 0, avgLife: 0, utilization: 0, earlyCount: 0 }
    const withActual = records.filter(r => r.actualLife != null)
    const avgLife = withActual.length > 0
      ? Math.round(withActual.reduce((sum, r) => sum + (r.actualLife ?? 0), 0) / withActual.length)
      : 0
    const planLife = selectedTool?.plannedLifePerCorner ?? 1
    const utilization = planLife > 0 && avgLife > 0 ? Math.round((avgLife / planLife) * 100) : 0
    return {
      total: records.length,
      avgLife,
      utilization,
      earlyCount: records.filter(r => r.isEarlyReplacement).length,
    }
  }, [records, selectedTool])

  const openAddDialog = () => {
    setEditingRecord(null)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormShiftId(shifts[0]?.id ?? null)
    setFormEdgeNumber(1)
    setFormPlanLife(selectedTool?.plannedLifePerCorner ?? 0)
    setFormActualLife('')
    setFormProdOperatorId(null)
    setFormQaOperatorId(null)
    setFormDiameter('')
    setFormDepth('')
    setFormRoughness('')
    setFormIsEarly(false)
    setFormReasonId(null)
    setFormRemarks('')
    setDialogOpen(true)
  }

  const openEditDialog = (record: ToolChangeRecord) => {
    setEditingRecord(record)
    setFormDate(record.date)
    setFormShiftId(record.shiftId)
    setFormEdgeNumber(record.edgeNumber)
    setFormPlanLife(record.planLife)
    setFormActualLife(record.actualLife?.toString() ?? '')
    setFormProdOperatorId(record.productionOperatorId ?? null)
    setFormQaOperatorId(record.qaOperatorId ?? null)
    setFormDiameter(record.dimensionDiameter ?? '')
    setFormDepth(record.dimensionDepth ?? '')
    setFormRoughness(record.dimensionRoughness ?? '')
    setFormIsEarly(record.isEarlyReplacement)
    setFormReasonId(record.earlyReplacementReasonId ?? null)
    setFormRemarks(record.remarks ?? '')
    setDialogOpen(true)
  }

  // Auto-detect early replacement
  useEffect(() => {
    const actualNum = formActualLife ? parseInt(formActualLife) : null
    if (actualNum != null && !isNaN(actualNum) && actualNum < formPlanLife) {
      setFormIsEarly(true)
    }
  }, [formActualLife, formPlanLife])

  const handleSave = async () => {
    if (!selectedToolId || !selectedLineId || !formShiftId) return

    if (formIsEarly && !formReasonId) {
      setError('Early replacement reason is required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const actualLife = formActualLife ? parseInt(formActualLife) : undefined

      if (editingRecord) {
        await api.updateToolChangeRecord(editingRecord.id, {
          actualLife,
          productionOperatorId: formProdOperatorId ?? undefined,
          dimensionDiameter: formDiameter || undefined,
          dimensionDepth: formDepth || undefined,
          dimensionRoughness: formRoughness || undefined,
          qaOperatorId: formQaOperatorId ?? undefined,
          isEarlyReplacement: formIsEarly,
          earlyReplacementReasonId: formIsEarly ? formReasonId ?? undefined : undefined,
          remarks: formRemarks || undefined,
        })
        setSuccessMessage('Record updated successfully')
      } else {
        await api.createToolChangeRecord({
          date: formDate,
          shiftId: formShiftId,
          toolMasterId: selectedToolId,
          misLineId: selectedLineId,
          edgeNumber: formEdgeNumber,
          planLife: formPlanLife,
          actualLife,
          productionOperatorId: formProdOperatorId ?? undefined,
          dimensionDiameter: formDiameter || undefined,
          dimensionDepth: formDepth || undefined,
          dimensionRoughness: formRoughness || undefined,
          qaOperatorId: formQaOperatorId ?? undefined,
          isEarlyReplacement: formIsEarly,
          earlyReplacementReasonId: formIsEarly ? formReasonId ?? undefined : undefined,
          remarks: formRemarks || undefined,
        })
        setSuccessMessage('Record created successfully')
      }
      setDialogOpen(false)
      loadRecords()
    } catch (err: any) {
      setError(err.message || 'Failed to save record')
    } finally {
      setSaving(false)
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this record?')) return
    try {
      await api.deleteToolChangeRecord(id)
      loadRecords()
      setSuccessMessage('Record deleted')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSimulate = async () => {
    if (!selectedLineId) return
    setSimulating(true)
    setError(null)
    try {
      const today = new Date()
      const dateFrom = new Date(today)
      dateFrom.setDate(dateFrom.getDate() - 7)
      const result = await api.simulateToolChanges(
        dateFrom.toISOString().split('T')[0],
        today.toISOString().split('T')[0],
        selectedLineId
      )
      setSuccessMessage(`Simulated ${result.generated} tool change records`)
      if (selectedToolId) loadRecords()
    } catch (err: any) {
      setError(err.message || 'Simulation failed')
    } finally {
      setSimulating(false)
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const handleExport = () => {
    if (!selectedToolId) return
    api.exportToolChangeRecords(selectedToolId)
  }

  // Clear messages on timeout
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t) }
  }, [error])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tool Life Management</h1>
          <p className="text-muted-foreground">
            Track tool changes, replacements, and dimensional checks
          </p>
        </div>
        <div className="flex gap-2">
          {selectedLineId && (
            <Button variant="outline" onClick={handleSimulate} disabled={simulating}>
              {simulating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Simulate Data
            </Button>
          )}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md text-sm">{error}</div>
      )}
      {successMessage && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-md text-sm">{successMessage}</div>
      )}

      {/* Selection Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Part */}
            <div>
              <Label>Part</Label>
              <Select
                value={selectedPartId?.toString() ?? ''}
                onValueChange={(v) => {
                  setSelectedPartId(parseInt(v))
                  setSelectedLineId(null)
                  setSelectedStationId(null)
                  setSelectedToolId(null)
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select Part" /></SelectTrigger>
                <SelectContent>
                  {misParts.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Line */}
            <div>
              <Label>Line</Label>
              <Select
                value={selectedLineId?.toString() ?? ''}
                onValueChange={(v) => {
                  setSelectedLineId(parseInt(v))
                  setSelectedStationId(null)
                  setSelectedToolId(null)
                }}
                disabled={!selectedPartId}
              >
                <SelectTrigger><SelectValue placeholder="Select Line" /></SelectTrigger>
                <SelectContent>
                  {misLines.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Station */}
            <div>
              <Label>Station (CNC)</Label>
              <Select
                value={selectedStationId?.toString() ?? ''}
                onValueChange={(v) => {
                  setSelectedStationId(parseInt(v))
                  setSelectedToolId(null)
                }}
                disabled={!selectedLineId}
              >
                <SelectTrigger><SelectValue placeholder="Select Station" /></SelectTrigger>
                <SelectContent>
                  {cncStations.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.code} - {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tool */}
            <div>
              <Label>Tool</Label>
              <Select
                value={selectedToolId?.toString() ?? ''}
                onValueChange={(v) => setSelectedToolId(parseInt(v))}
                disabled={!selectedStationId}
              >
                <SelectTrigger><SelectValue placeholder="Select Tool" /></SelectTrigger>
                <SelectContent>
                  {toolMasters.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.toolCode} - {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Cards View - when Part + Line selected but no Station */}
      {selectedLineId && !selectedStationId && (
        <div>
          <h2 className="text-xl font-semibold mb-4">CNC Stations</h2>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {cncStations.map(station => (
              <Card
                key={station.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedStationId(station.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{station.code}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{station.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Click to view tools</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tool Cards View - when Station selected but no Tool */}
      {selectedStationId && !selectedToolId && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedStationId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Stations
            </Button>
            <h2 className="text-xl font-semibold">
              Tools at {cncStations.find(s => s.id === selectedStationId)?.code}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {toolMasters.map(tool => (
              <Card
                key={tool.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedToolId(tool.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-mono">{tool.toolCode}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{tool.name}</p>
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    <p>Life/Corner: {formatNumber(tool.plannedLifePerCorner)}</p>
                    <p>Corners: {tool.totalCorners}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {toolMasters.length === 0 && (
              <p className="text-muted-foreground col-span-full">No tools configured for this station.</p>
            )}
          </div>
        </div>
      )}

      {/* Records View - when Tool selected */}
      {selectedToolId && selectedTool && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedToolId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tools
            </Button>
            <div>
              <h2 className="text-xl font-semibold">{selectedTool.toolCode}</h2>
              <p className="text-sm text-muted-foreground">{selectedTool.name}</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold">{summaryMetrics.total}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Life</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold">{formatNumber(summaryMetrics.avgLife)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Life Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <span className={cn(
                  'text-3xl font-bold',
                  summaryMetrics.utilization >= 90 ? 'text-green-600' :
                    summaryMetrics.utilization >= 70 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {summaryMetrics.utilization}%
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Early Replacements</CardTitle>
              </CardHeader>
              <CardContent>
                <span className={cn(
                  'text-3xl font-bold',
                  summaryMetrics.earlyCount > 0 ? 'text-yellow-600' : 'text-green-600'
                )}>
                  {summaryMetrics.earlyCount}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={records.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          {/* Records Table */}
          {recordsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No records yet. Click "Add Record" or "Simulate Data" to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">S.No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-center">Edge</TableHead>
                    <TableHead className="text-right">Plan Life</TableHead>
                    <TableHead className="text-right">Actual Life</TableHead>
                    <TableHead>PRDN Sign</TableHead>
                    <TableHead>Diameter</TableHead>
                    <TableHead>Depth</TableHead>
                    <TableHead>Roughness</TableHead>
                    <TableHead>QA Sign</TableHead>
                    <TableHead className="text-center">Early?</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(record => (
                    <TableRow
                      key={record.id}
                      className={cn(
                        record.isEarlyReplacement && 'bg-yellow-50',
                        !record.actualLife && 'border-l-4 border-l-green-500'
                      )}
                    >
                      <TableCell className="font-mono">{record.serialNumber}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.shiftName}</TableCell>
                      <TableCell className="text-center">{record.edgeNumber}</TableCell>
                      <TableCell className="text-right">{formatNumber(record.planLife)}</TableCell>
                      <TableCell className="text-right">
                        {record.actualLife != null ? formatNumber(record.actualLife) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{record.productionOperatorName ?? '-'}</TableCell>
                      <TableCell className="text-sm">{record.dimensionDiameter ?? '-'}</TableCell>
                      <TableCell className="text-sm">{record.dimensionDepth ?? '-'}</TableCell>
                      <TableCell className="text-sm">{record.dimensionRoughness ?? '-'}</TableCell>
                      <TableCell className="text-sm">{record.qaOperatorName ?? '-'}</TableCell>
                      <TableCell className="text-center">
                        {record.isEarlyReplacement && (
                          <Badge variant="destructive" className="text-xs">Yes</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{record.earlyReplacementReasonName ?? '-'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{record.remarks ?? '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(record)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Prompt when nothing selected */}
      {!selectedPartId && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Select a Part and Line to get started</p>
            <p className="text-sm mt-1">Then choose a CNC station and tool to view change records</p>
          </CardContent>
        </Card>
      )}

      {selectedPartId && !selectedLineId && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p>Select a Line to continue</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Tool Change Record' : 'Add Tool Change Record'}</DialogTitle>
            <DialogDescription>
              {selectedTool?.toolCode} - {selectedTool?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Row 1: Date, Shift, Edge */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  disabled={!!editingRecord}
                />
              </div>
              <div>
                <Label>Shift</Label>
                <Select
                  value={formShiftId?.toString() ?? ''}
                  onValueChange={(v) => setFormShiftId(parseInt(v))}
                  disabled={!!editingRecord}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {shifts.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Edge Number</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedTool?.totalCorners ?? 10}
                  value={formEdgeNumber}
                  onChange={(e) => setFormEdgeNumber(parseInt(e.target.value) || 1)}
                  disabled={!!editingRecord}
                />
              </div>
            </div>

            {/* Row 2: Plan Life, Actual Life */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Life</Label>
                <Input
                  type="number"
                  value={formPlanLife}
                  onChange={(e) => setFormPlanLife(parseInt(e.target.value) || 0)}
                  disabled={!!editingRecord}
                />
              </div>
              <div>
                <Label>Actual Life (leave empty if active)</Label>
                <Input
                  type="number"
                  value={formActualLife}
                  onChange={(e) => setFormActualLife(e.target.value)}
                  placeholder="Empty = still active"
                />
              </div>
            </div>

            {/* Row 3: Operators */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Production Operator</Label>
                <Select
                  value={formProdOperatorId?.toString() ?? 'none'}
                  onValueChange={(v) => setFormProdOperatorId(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- None --</SelectItem>
                    {prodOperators.map(o => (
                      <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>QA Operator</Label>
                <Select
                  value={formQaOperatorId?.toString() ?? 'none'}
                  onValueChange={(v) => setFormQaOperatorId(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- None --</SelectItem>
                    {qaOperators.map(o => (
                      <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Dimensional Check */}
            <div>
              <Label className="text-sm font-semibold">Dimensional Check</Label>
              <div className="grid grid-cols-3 gap-4 mt-1">
                <div>
                  <Label className="text-xs">Diameter</Label>
                  <Input
                    value={formDiameter}
                    onChange={(e) => setFormDiameter(e.target.value)}
                    placeholder="e.g. 12.05"
                  />
                </div>
                <div>
                  <Label className="text-xs">Depth</Label>
                  <Input
                    value={formDepth}
                    onChange={(e) => setFormDepth(e.target.value)}
                    placeholder="e.g. 8.02"
                  />
                </div>
                <div>
                  <Label className="text-xs">Roughness</Label>
                  <Input
                    value={formRoughness}
                    onChange={(e) => setFormRoughness(e.target.value)}
                    placeholder="e.g. Ra 1.6"
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Early Replacement */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="early-replacement"
                  checked={formIsEarly}
                  onChange={(e) => {
                    setFormIsEarly(e.target.checked)
                    if (!e.target.checked) setFormReasonId(null)
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="early-replacement" className="cursor-pointer">
                  Early Replacement (actual life &lt; plan life)
                </Label>
              </div>
              {formIsEarly && (
                <div>
                  <Label>Reason *</Label>
                  <Select
                    value={formReasonId?.toString() ?? ''}
                    onValueChange={(v) => setFormReasonId(parseInt(v))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      {earlyReasons.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.code} - {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Row 6: Remarks */}
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingRecord ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
