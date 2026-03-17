import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Zap,
} from 'lucide-react'
import type {
  MisPart,
  MisProductionLine,
  Operator,
  CurrentShiftSlot,
  RecentPartScan,
  PartScanResponse,
} from '@/types'

const STORAGE_KEY = 'partLoadingScan'

function loadSaved<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}.${key}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSetting(key: string, value: unknown) {
  localStorage.setItem(`${STORAGE_KEY}.${key}`, JSON.stringify(value))
}

export function PartLoadingScanPage() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  // Selection state (persisted in localStorage)
  const [selectedPartId, setSelectedPartId] = useState<number | null>(loadSaved('partId'))
  const [selectedLineId, setSelectedLineId] = useState<number | null>(loadSaved('lineId'))
  const [selectedOperatorId, setSelectedOperatorId] = useState<number | null>(loadSaved('operatorId'))

  // Master data
  const [misParts, setMisParts] = useState<MisPart[]>([])
  const [misLines, setMisLines] = useState<MisProductionLine[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [currentShift, setCurrentShift] = useState<CurrentShiftSlot | null>(null)

  // Scan state
  const [serialInput, setSerialInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<PartScanResponse | null>(null)
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

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [selectedLineId])

  // Recent scans query
  const { data: recentScans } = useQuery({
    queryKey: ['recentPartScans', selectedLineId],
    queryFn: () => selectedLineId ? api.getRecentPartScans(selectedLineId, 'loading', 20) as Promise<RecentPartScan[]> : Promise.resolve([]),
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

  const handleScan = async () => {
    const serial = serialInput.trim()
    if (!serial || !selectedLineId) return

    setScanning(true)
    setError(null)
    setScanResult(null)

    try {
      const result = await api.partLoadingScan({
        serialNumber: serial,
        misLineId: selectedLineId,
        operatorId: selectedOperatorId ?? undefined,
      })
      setScanResult(result)
      setSerialInput('')
      queryClient.invalidateQueries({ queryKey: ['recentPartScans'] })

      // Auto-clear result after 5 seconds
      setTimeout(() => setScanResult(null), 5000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleScan()
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
      queryClient.invalidateQueries({ queryKey: ['recentPartScans'] })
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'InProgress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>
      case 'Completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>
      case 'Rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
            <span className="font-semibold text-lg">Part Loading Scan (OP-10)</span>
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

        {/* Scan Input */}
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
                disabled={!selectedLineId || scanning}
                autoFocus
              />
              <Button
                onClick={handleScan}
                disabled={!serialInput.trim() || !selectedLineId || scanning}
                className="h-14 px-8 text-lg"
              >
                {scanning ? <Loader2 className="h-5 w-5 animate-spin" /> : 'SCAN'}
              </Button>
            </div>
            {!selectedLineId && (
              <p className="text-sm text-muted-foreground mt-2">Select Part and Line above to begin scanning</p>
            )}
          </CardContent>
        </Card>

        {/* Scan Result */}
        {scanResult && (
          <Card className={scanResult.status === 'AlreadyScanned'
            ? 'border-yellow-400 bg-yellow-50'
            : 'border-green-400 bg-green-50'
          }>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                {scanResult.status === 'AlreadyScanned'
                  ? <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  : <CheckCircle2 className="h-8 w-8 text-green-600" />
                }
                <div>
                  <p className={`text-xl font-bold ${scanResult.status === 'AlreadyScanned' ? 'text-yellow-800' : 'text-green-800'}`}>
                    {scanResult.status === 'AlreadyScanned' ? 'ALREADY SCANNED' : 'SUCCESS'}
                    <span className="ml-3 font-mono">{scanResult.serialNumber}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {scanResult.shiftName} | {scanResult.stationCode} | {formatTime(scanResult.scannedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-400 bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-800 font-medium">{error}</p>
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

        {/* Recent Scans */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                RECENT SCANS ({recentScans?.length ?? 0})
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
            {recentScans && recentScans.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Scanned At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentScans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell className="font-mono font-medium">{scan.serialNumber}</TableCell>
                      <TableCell>{getStatusBadge(scan.status)}</TableCell>
                      <TableCell>{scan.shiftName}</TableCell>
                      <TableCell>{formatTime(scan.scannedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {selectedLineId ? 'No recent scans. Scan a part or simulate data.' : 'Select a line to see recent scans.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
