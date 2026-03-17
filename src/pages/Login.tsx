import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useSessionStore } from '@/hooks/useSessionStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const navigate = useNavigate()
  const {
    operator,
    shift,
    productionLine,
    part,
    setOperator,
    setShift,
    setProductionLine,
    setPart,
  } = useSessionStore()

  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('')
  const [selectedShiftId, setSelectedShiftId] = useState<string>('')
  const [selectedLineId, setSelectedLineId] = useState<string>('')
  const [selectedPartId, setSelectedPartId] = useState<string>('')

  const { data: operators = [] } = useQuery({
    queryKey: ['operators'],
    queryFn: api.getOperators,
  })

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: api.getShifts,
  })

  const { data: lines = [] } = useQuery({
    queryKey: ['lines'],
    queryFn: api.getProductionLines,
  })

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: api.getParts,
  })

  // Pre-fill from stored session
  useEffect(() => {
    if (operator) setSelectedOperatorId(operator.id.toString())
    if (shift) setSelectedShiftId(shift.id.toString())
    if (productionLine) setSelectedLineId(productionLine.id.toString())
    if (part) setSelectedPartId(part.id.toString())
  }, [operator, shift, productionLine, part])

  const handleLogin = () => {
    const selectedOperator = operators.find(o => o.id.toString() === selectedOperatorId)
    const selectedShift = shifts.find(s => s.id.toString() === selectedShiftId)
    const selectedLine = lines.find(l => l.id.toString() === selectedLineId)
    const selectedPart = parts.find(p => p.id.toString() === selectedPartId)

    if (selectedOperator && selectedShift && selectedLine && selectedPart) {
      setOperator(selectedOperator)
      setShift(selectedShift)
      setProductionLine(selectedLine)
      setPart(selectedPart)
      navigate('/dashboard')
    }
  }

  const isFormValid = selectedOperatorId && selectedShiftId && selectedLineId && selectedPartId

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">ASK</span>
          </div>
          <CardTitle className="text-2xl">Production System</CardTitle>
          <CardDescription>
            Select your shift details to begin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="operator">Operator</Label>
            <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
              <SelectTrigger id="operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id.toString()}>
                    {op.badgeNumber} - {op.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
              <SelectTrigger id="shift">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="line">Production Line</Label>
            <Select value={selectedLineId} onValueChange={setSelectedLineId}>
              <SelectTrigger id="line">
                <SelectValue placeholder="Select production line" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>
                    {l.code} - {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="part">Part</Label>
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger id="part">
                <SelectValue placeholder="Select part" />
              </SelectTrigger>
              <SelectContent>
                {parts.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.partNumber} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleLogin}
            disabled={!isFormValid}
          >
            Start Shift
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            ASK Automotive CCRH Line Production System
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
