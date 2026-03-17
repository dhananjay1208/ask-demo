import { useState, useEffect, useMemo } from 'react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  FileSpreadsheet,
  Save,
  Trash2,
  Lock,
  CalendarDays,
  Factory,
  Gauge,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Download,
} from 'lucide-react'
import type {
  MisPart,
  DowntimeCategory,
  RejectionCategory,
  DailyProductionReport,
  DailyReportListItem,
  MonthlySummary,
} from '@/types'

type ViewMode = 'entry' | 'daily' | 'monthly'

export function MisReportPage() {
  // State for selectors
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('entry')

  // Master data
  const [parts, setParts] = useState<MisPart[]>([])
  const [downtimeCategories, setDowntimeCategories] = useState<DowntimeCategory[]>([])
  const [rejectionCategories, setRejectionCategories] = useState<RejectionCategory[]>([])

  // Report data
  const [currentReport, setCurrentReport] = useState<DailyProductionReport | null>(null)
  const [reportList, setReportList] = useState<DailyReportListItem[]>([])
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    cycleTimeSeconds: 0,
    prodPlanSob: 0,
    totalProduced: 0,
    hoursWorked: 22,
    numberOfLinesRunning: 1,
    efficiencyFactor: 0.88,  // Default 88% matching Excel $J$2
    operatorName: '',
    notes: '',
  })
  const [downtimeHours, setDowntimeHours] = useState<Record<number, number>>({})  // Changed from Minutes to Hours
  const [rejectionCounts, setRejectionCounts] = useState<Record<number, number>>({})

  // UI state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load master data on mount
  useEffect(() => {
    loadMasterData()
  }, [])

  // Load report when date/part changes (in entry mode)
  useEffect(() => {
    if (viewMode === 'entry' && selectedDate && selectedPartId) {
      loadReportByDate()
    }
  }, [selectedDate, selectedPartId, viewMode])

  // Load report list or monthly summary when view mode changes
  useEffect(() => {
    if (viewMode === 'daily') {
      loadReportList()
    } else if (viewMode === 'monthly') {
      loadMonthlySummary()
    }
  }, [viewMode, selectedDate, selectedPartId])

  const loadMasterData = async () => {
    try {
      const [partsData, downtimeData, rejectionData] = await Promise.all([
        api.getMisParts(),
        api.getDowntimeCategories(),
        api.getRejectionCategories(),
      ])
      setParts(partsData)
      setDowntimeCategories(downtimeData)
      setRejectionCategories(rejectionData)
    } catch (err) {
      setError('Failed to load master data')
      console.error(err)
    }
  }

  const loadReportByDate = async () => {
    if (!selectedDate || !selectedPartId) return
    setLoading(true)
    setError(null)

    try {
      const report = await api.getDailyReportByDate(selectedDate, selectedPartId)
      setCurrentReport(report)
      populateFormFromReport(report)
    } catch {
      // Report doesn't exist - clear form for new entry
      setCurrentReport(null)
      clearForm()
    } finally {
      setLoading(false)
    }
  }

  const loadReportList = async () => {
    setLoading(true)
    try {
      const date = new Date(selectedDate)
      const reports = await api.getDailyReports({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        partId: selectedPartId || undefined,
      })
      setReportList(reports)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlySummary = async () => {
    setLoading(true)
    try {
      const date = new Date(selectedDate)
      const summary = await api.getMonthlySummary(
        date.getMonth() + 1,
        date.getFullYear(),
        selectedPartId || undefined
      )
      setMonthlySummary(summary)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const populateFormFromReport = (report: DailyProductionReport) => {
    setFormData({
      cycleTimeSeconds: report.cycleTimeSeconds,
      prodPlanSob: report.prodPlanSob,
      totalProduced: report.totalProduced,
      hoursWorked: report.hoursWorked,
      numberOfLinesRunning: report.numberOfLinesRunning || 1,
      efficiencyFactor: report.efficiencyFactor || 0.88,
      operatorName: report.operatorName || '',
      notes: report.notes || '',
    })

    // Populate downtime (in HOURS)
    const dtMap: Record<number, number> = {}
    report.downtimes?.forEach((d) => {
      dtMap[d.downtimeCategoryId] = d.hours
    })
    setDowntimeHours(dtMap)

    // Populate rejections
    const rjMap: Record<number, number> = {}
    report.rejections?.forEach((r) => {
      rjMap[r.rejectionCategoryId] = r.count
    })
    setRejectionCounts(rjMap)
  }

  const clearForm = () => {
    // Get default number of lines from selected part
    const selectedPart = parts.find(p => p.id === selectedPartId)
    const defaultLines = selectedPart?.lineCount || 1

    setFormData({
      cycleTimeSeconds: 0,
      prodPlanSob: 0,
      totalProduced: 0,
      hoursWorked: 22,
      numberOfLinesRunning: defaultLines,
      efficiencyFactor: 0.88,
      operatorName: '',
      notes: '',
    })
    setDowntimeHours({})
    setRejectionCounts({})
  }

  const handleSave = async () => {
    if (!selectedDate || !selectedPartId) {
      setError('Please select a date and part')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    const request = {
      reportDate: selectedDate,
      misPartId: selectedPartId,
      ...formData,
      downtimes: Object.entries(downtimeHours)
        .filter(([, hours]) => hours > 0)
        .map(([id, hours]) => ({
          downtimeCategoryId: parseInt(id),
          hours,
        })),
      rejections: Object.entries(rejectionCounts)
        .filter(([, count]) => count > 0)
        .map(([id, count]) => ({
          rejectionCategoryId: parseInt(id),
          count,
        })),
    }

    try {
      if (currentReport) {
        await api.updateDailyReport(currentReport.id, request)
        setSuccessMessage('Report updated successfully')
      } else {
        const result = await api.createDailyReport(request)
        setSuccessMessage('Report created successfully')
        // Reload to get the full report with calculated values
        const newReport = await api.getDailyReport(result.id)
        setCurrentReport(newReport)
        populateFormFromReport(newReport)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save report')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    if (!currentReport) return
    if (!confirm('Are you sure you want to finalize this report? It cannot be edited after.')) {
      return
    }

    try {
      await api.finalizeDailyReport(currentReport.id)
      setCurrentReport({ ...currentReport, isFinalized: true })
      setSuccessMessage('Report finalized')
    } catch (err) {
      setError('Failed to finalize report')
    }
  }

  // Calculate live metrics (matching Excel formulas)
  const calculatedMetrics = useMemo(() => {
    const totalMachining = Object.entries(rejectionCounts)
      .filter(([id]) => {
        const cat = rejectionCategories.find((c) => c.id === parseInt(id))
        return cat?.type === 1 // Machining
      })
      .reduce((sum, [, count]) => sum + count, 0)

    const totalCasting = Object.entries(rejectionCounts)
      .filter(([id]) => {
        const cat = rejectionCategories.find((c) => c.id === parseInt(id))
        return cat?.type === 2 // Casting
      })
      .reduce((sum, [, count]) => sum + count, 0)

    // Downtime in HOURS (matching Excel)
    const plannedDT = Object.entries(downtimeHours)
      .filter(([id]) => {
        const cat = downtimeCategories.find((c) => c.id === parseInt(id))
        return cat?.isPlanned
      })
      .reduce((sum, [, hrs]) => sum + hrs, 0)

    const unplannedDT = Object.entries(downtimeHours)
      .filter(([id]) => {
        const cat = downtimeCategories.find((c) => c.id === parseInt(id))
        return !cat?.isPlanned
      })
      .reduce((sum, [, hrs]) => sum + hrs, 0)

    // OK Parts = Total - Machining Rejections - Casting Rejections (matching Excel)
    const okParts = formData.totalProduced - totalMachining - totalCasting

    // Match Excel formulas (all times in HOURS):
    // GrossTime = Hour/Day × Lines
    const grossTime = formData.hoursWorked * formData.numberOfLinesRunning
    // PlannedTime = GrossTime - PlannedDT (Excel: =(C4*D4)-SUM(W4:Y4))
    const plannedTime = grossTime - plannedDT
    // AvailableTime = PlannedTime - UnplannedDT (Excel: =E4-SUM(Z4:AO4))
    const availableTime = plannedTime - unplannedDT
    // PlannedQty = (AvailableTime × 3600 / CycleTime) × EfficiencyFactor
    // Excel: =IFERROR(F4*60*60/H4,)*$J$2 where J2=88%
    const plannedQty =
      formData.cycleTimeSeconds > 0
        ? (availableTime * 3600 / formData.cycleTimeSeconds) * formData.efficiencyFactor
        : 0

    const performance = plannedQty > 0 ? (formData.totalProduced / plannedQty) * 100 : 0
    const quality =
      formData.totalProduced > 0
        ? ((formData.totalProduced - totalMachining) / formData.totalProduced) * 100
        : 0
    // Availability = AvailableTime / PlannedTime × 100
    const availability =
      plannedTime > 0 ? (availableTime / plannedTime) * 100 : 0
    const oee = (performance * quality * availability) / 10000

    const machiningPpm =
      formData.totalProduced > 0 ? (totalMachining / formData.totalProduced) * 1000000 : 0
    const castingPercent =
      formData.totalProduced > 0 ? (totalCasting / formData.totalProduced) * 100 : 0

    return {
      totalMachining,
      totalCasting,
      plannedDT,
      unplannedDT,
      okParts,
      grossTime,
      plannedTime,
      availableTime,
      plannedQty,
      performance,
      quality,
      availability,
      oee,
      machiningPpm,
      castingPercent,
    }
  }, [formData, downtimeHours, rejectionCounts, downtimeCategories, rejectionCategories])

  // Filter categories
  const plannedDowntime = downtimeCategories.filter((c) => c.isPlanned)
  const unplannedDowntime = downtimeCategories.filter((c) => !c.isPlanned)
  const machiningRejections = rejectionCategories.filter((c) => c.type === 1)
  const castingRejections = rejectionCategories.filter((c) => c.type === 2)

  const getOeeColor = (value: number) => {
    if (value >= 85) return 'text-green-600'
    if (value >= 70) return 'text-lime-600'
    if (value >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8" />
            Production MIS
          </h1>
          <p className="text-muted-foreground">
            Daily production tracking and OEE metrics
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      {/* Selectors */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Part Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Part
              </Label>
              <Select
                value={selectedPartId?.toString() || ''}
                onValueChange={(v) => setSelectedPartId(v ? parseInt(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select part..." />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((part) => (
                    <SelectItem key={part.id} value={part.id.toString()}>
                      {part.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="space-y-2">
              <Label>View</Label>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Data Entry</SelectItem>
                  <SelectItem value="daily">Daily View</SelectItem>
                  <SelectItem value="monthly">Monthly Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Entry Mode */}
      {viewMode === 'entry' && selectedPartId && (
        <>
          {/* Finalized Badge */}
          {currentReport?.isFinalized && (
            <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <Lock className="h-5 w-5" />
              This report is finalized and cannot be edited
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="production">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="production">Production</TabsTrigger>
                  <TabsTrigger value="downtime">Downtime</TabsTrigger>
                  <TabsTrigger value="machining">Mach. Rej</TabsTrigger>
                  <TabsTrigger value="casting">Cast. Rej</TabsTrigger>
                </TabsList>

                {/* Production Tab */}
                <TabsContent value="production">
                  <Card>
                    <CardHeader>
                      <CardTitle>Production Data</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Cycle Time (seconds)</Label>
                        <Input
                          type="number"
                          value={formData.cycleTimeSeconds || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cycleTimeSeconds: parseInt(e.target.value) || 0,
                            })
                          }
                          disabled={currentReport?.isFinalized}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prod Plan SOB</Label>
                        <Input
                          type="number"
                          value={formData.prodPlanSob || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              prodPlanSob: parseInt(e.target.value) || 0,
                            })
                          }
                          disabled={currentReport?.isFinalized}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Produced</Label>
                        <Input
                          type="number"
                          value={formData.totalProduced || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              totalProduced: parseInt(e.target.value) || 0,
                            })
                          }
                          disabled={currentReport?.isFinalized}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hours/Day</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={formData.hoursWorked || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hoursWorked: parseFloat(e.target.value) || 0,
                            })
                          }
                          disabled={currentReport?.isFinalized}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Number of Lines Running</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.numberOfLinesRunning || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numberOfLinesRunning: parseInt(e.target.value) || 1,
                            })
                          }
                          disabled={currentReport?.isFinalized}
                        />
                        <p className="text-xs text-muted-foreground">
                          Default for this part: {parts.find(p => p.id === selectedPartId)?.lineCount || 1} lines
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Efficiency Factor (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={formData.efficiencyFactor || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              efficiencyFactor: parseFloat(e.target.value) || 0.88,
                            })
                          }
                          disabled={currentReport?.isFinalized}
                        />
                        <p className="text-xs text-muted-foreground">
                          Default 0.88 (88%) - matches Excel $J$2
                        </p>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          disabled={currentReport?.isFinalized}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Downtime Tab */}
                <TabsContent value="downtime">
                  <Card>
                    <CardHeader>
                      <CardTitle>Downtime (hours) - matching Excel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Planned */}
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-600">
                          Planned Downtime (hours)
                        </h4>
                        <div className="grid gap-3 md:grid-cols-3">
                          {plannedDowntime.map((cat) => (
                            <div key={cat.id} className="space-y-1">
                              <Label className="text-xs">{cat.name}</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={downtimeHours[cat.id] || ''}
                                onChange={(e) =>
                                  setDowntimeHours({
                                    ...downtimeHours,
                                    [cat.id]: parseFloat(e.target.value) || 0,
                                  })
                                }
                                disabled={currentReport?.isFinalized}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Unplanned */}
                      <div>
                        <h4 className="font-semibold mb-3 text-red-600">
                          Unplanned Downtime (hours)
                        </h4>
                        <div className="grid gap-3 md:grid-cols-4">
                          {unplannedDowntime.map((cat) => (
                            <div key={cat.id} className="space-y-1">
                              <Label className="text-xs">{cat.name}</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={downtimeHours[cat.id] || ''}
                                onChange={(e) =>
                                  setDowntimeHours({
                                    ...downtimeHours,
                                    [cat.id]: parseFloat(e.target.value) || 0,
                                  })
                                }
                                disabled={currentReport?.isFinalized}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Machining Rejections Tab */}
                <TabsContent value="machining">
                  <Card>
                    <CardHeader>
                      <CardTitle>Machining Rejections (count)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-4">
                        {machiningRejections.map((cat) => (
                          <div key={cat.id} className="space-y-1">
                            <Label className="text-xs">
                              {cat.code}: {cat.name}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={rejectionCounts[cat.id] || ''}
                              onChange={(e) =>
                                setRejectionCounts({
                                  ...rejectionCounts,
                                  [cat.id]: parseInt(e.target.value) || 0,
                                })
                              }
                              disabled={currentReport?.isFinalized}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Casting Rejections Tab */}
                <TabsContent value="casting">
                  <Card>
                    <CardHeader>
                      <CardTitle>Casting Rejections (count)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-4">
                        {castingRejections.map((cat) => (
                          <div key={cat.id} className="space-y-1">
                            <Label className="text-xs">
                              {cat.code}: {cat.name}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={rejectionCounts[cat.id] || ''}
                              onChange={(e) =>
                                setRejectionCounts({
                                  ...rejectionCounts,
                                  [cat.id]: parseInt(e.target.value) || 0,
                                })
                              }
                              disabled={currentReport?.isFinalized}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving || currentReport?.isFinalized}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : currentReport ? 'Update Report' : 'Save Report'}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearForm}
                  disabled={currentReport?.isFinalized}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
                {currentReport && !currentReport.isFinalized && (
                  <Button
                    variant="secondary"
                    onClick={handleFinalize}
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Finalize
                  </Button>
                )}
              </div>
            </div>

            {/* Live Metrics Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Live OEE Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* OEE */}
                  <div className="text-center p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">OEE</p>
                    <p className={cn('text-4xl font-bold', getOeeColor(calculatedMetrics.oee))}>
                      {calculatedMetrics.oee.toFixed(1)}%
                    </p>
                  </div>

                  {/* Components */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 border rounded">
                      <p className="text-xs text-muted-foreground">Performance</p>
                      <p className="font-bold text-green-600">
                        {calculatedMetrics.performance.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="text-xs text-muted-foreground">Quality</p>
                      <p className="font-bold text-purple-600">
                        {calculatedMetrics.quality.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="text-xs text-muted-foreground">Availability</p>
                      <p className="font-bold text-blue-600">
                        {calculatedMetrics.availability.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Production Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>OK Parts:</span>
                      <span className="font-bold">{calculatedMetrics.okParts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Planned Qty:</span>
                      <span className="font-bold">{calculatedMetrics.plannedQty.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gross Time:</span>
                      <span className="font-bold">{calculatedMetrics.grossTime.toFixed(1)} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Planned Time:</span>
                      <span className="font-bold">{calculatedMetrics.plannedTime.toFixed(1)} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available Time:</span>
                      <span className="font-bold">{calculatedMetrics.availableTime.toFixed(1)} hrs</span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span>M/R Total:</span>
                      <span className="font-bold text-orange-600">
                        {calculatedMetrics.totalMachining}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>M/R PPM:</span>
                      <span className="font-bold">
                        {calculatedMetrics.machiningPpm.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>C/R Total:</span>
                      <span className="font-bold text-red-600">
                        {calculatedMetrics.totalCasting}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>C/R %:</span>
                      <span className="font-bold">
                        {calculatedMetrics.castingPercent.toFixed(2)}%
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span>Planned DT:</span>
                      <span className="font-bold text-blue-600">
                        {calculatedMetrics.plannedDT} hrs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unplanned DT:</span>
                      <span className="font-bold text-red-600">
                        {calculatedMetrics.unplannedDT} hrs
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Daily View Mode */}
      {viewMode === 'daily' && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Reports - {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : reportList.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No reports found for this month</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead className="text-right">Total Produced</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportList.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.reportDate}</TableCell>
                      <TableCell>{report.misPart?.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {report.totalProduced}
                      </TableCell>
                      <TableCell>
                        {report.isFinalized ? (
                          <Badge variant="secondary">
                            <Lock className="h-3 w-3 mr-1" />
                            Finalized
                          </Badge>
                        ) : (
                          <Badge variant="outline">Draft</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary Mode */}
      {viewMode === 'monthly' && (
        <>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : !monthlySummary || monthlySummary.totalDays === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No data found for this month. Select a different month or add daily reports.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Export Button */}
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => {
                    const date = new Date(selectedDate)
                    api.exportToExcel(date.getMonth() + 1, date.getFullYear())
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to Excel
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Production</p>
                        <p className="text-2xl font-bold">{monthlySummary.totalProduced.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">OK Parts</p>
                        <p className="text-2xl font-bold">{monthlySummary.totalOkParts.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Gauge className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Average OEE</p>
                        <p className={cn('text-2xl font-bold', getOeeColor(monthlySummary.averageOee))}>
                          {monthlySummary.averageOee.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Downtime</p>
                        <p className="text-2xl font-bold">
                          {monthlySummary.totalPlannedDowntime + monthlySummary.totalUnplannedDowntime} hrs
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* OEE Components */}
              <Card>
                <CardHeader>
                  <CardTitle>Average OEE Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Performance</p>
                      <p className="text-3xl font-bold text-green-600">
                        {monthlySummary.averagePerformance.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Quality</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {monthlySummary.averageQuality.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Availability</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {monthlySummary.averageAvailability.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">M/R PPM</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {monthlySummary.averageMachiningPpm.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Breakdown Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Part</TableHead>
                        <TableHead className="text-right">Plan SOB</TableHead>
                        <TableHead className="text-right">Produced</TableHead>
                        <TableHead className="text-right">OK Parts</TableHead>
                        <TableHead className="text-right">M/R</TableHead>
                        <TableHead className="text-right">C/R</TableHead>
                        <TableHead className="text-right">OEE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySummary.dailyBreakdown.map((day, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{day.reportDate}</TableCell>
                          <TableCell>{day.partName}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {day.prodPlanSob}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {day.totalProduced}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {day.okParts}
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-600">
                            {day.totalMachiningRejections}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {day.totalCastingRejections}
                          </TableCell>
                          <TableCell className={cn('text-right font-bold', getOeeColor(day.oeePercent))}>
                            {day.oeePercent.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Prompt to select part */}
      {viewMode === 'entry' && !selectedPartId && (
        <Card>
          <CardContent className="py-12 text-center">
            <Factory className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              Select a part to enter daily report data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
