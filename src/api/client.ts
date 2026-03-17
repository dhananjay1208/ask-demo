import type {
  Shift, Operator, Part, ProductionLine, Station, LossCode,
  ProductionOrder, PartInstance, DowntimeEvent, QualityResult,
  HourlyProduction, ToolLifeRecord, OeeData, SkipReason,
  QualitySkipDetectionResult, QualitySkipAssignRequest,
  MisPart, MisProductionLine, DowntimeCategory, RejectionCategory,
  DailyProductionReport, DailyReportListItem, MonthlySummary,
  DailyReportRequest, StationAssignment, StationAssignmentRequest,
  BulkStationAssignmentRequest, HourlyProductionPlan, HourlyPlanRequest,
  DefaultSlotConfig, StationRejection, StationRejectionRequest,
  CurrentShiftSlot, StationRejectionSummary, QualityStation,
  StationDowntime, StationDowntimeRequest, StationDowntimeUpdateRequest,
  DowntimeAssignRequest, StationDowntimeSummary, OpStation,
  HourlyReportData, LineDashboardData, PlantOverviewData,
  ToolMaster, EarlyReplacementReason, ToolChangeRecord,
  ToolChangeRecordRequest, ToolChangeRecordUpdateRequest,
  OeeAnalyticsData, ToolLifeDashboardData, PartScanResponse,
  FinalInspectionResponse, PartLoadingScanRequest,
  FinalInspectionScanRequest, PartScanLookup, RecentPartScan,
  RecentInspection, TraceabilityData, HourlyReportShift,
  HourlyReportSlot, HourlyReportLossDetail,
  LineDashboardStation,
  PlantOverviewLine, PlantOverviewKpis,
  ToolLifeDashboardStation, ToolLifeDashboardTool,
  QualitySkipStation, QualitySkipAssignedReason,
  OeeTrendPoint,
  ToolLifeStatus
} from '../types'
import { StationType, RejectionType, StationDowntimeStatus, PartInstanceStatus, QualityStatus } from '../types'
import { store } from './store'
import {
  SHIFTS, OPERATORS, PARTS, PRODUCTION_LINES, STATIONS, LOSS_CODES,
  SKIP_REASONS, DOWNTIME_CATEGORIES, REJECTION_CATEGORIES,
  EARLY_REPLACEMENT_REASONS, MIS_PARTS, MIS_PRODUCTION_LINES,
  TOOL_MASTERS, DEFAULT_SLOT_CONFIGS
} from './seed'
import { getCurrentShiftSlot as getShiftSlot, getEligibleShiftIds, getSlotsForShift, getShiftName, formatDate, randomInt, randomChoice } from './shift-utils'

// Small delay for realistic loading states
const delay = (ms = 50) => new Promise(r => setTimeout(r, ms))

// Auto-seed on first load
if (!store.isSeeded()) {
  store.markSeeded()
}

// ============= HELPER FUNCTIONS =============

function getOpStationsForLine(_lineId?: number): OpStation[] {
  // OP stations: CNC(2), Manual(7), Washing(4), LeakTest(5)
  const opTypes = [StationType.CNC, StationType.Manual, StationType.Washing, StationType.LeakTest]
  return STATIONS
    .filter(s => opTypes.includes(s.type))
    .map(s => ({ id: s.id, code: s.code, name: s.name, sequence: s.sequence, productionLineId: s.productionLineId, type: s.type }))
    .sort((a, b) => a.sequence - b.sequence)
}

function getQualityStationsForLine(_lineId?: number): QualityStation[] {
  return STATIONS
    .filter(s => s.type === StationType.QualityGate)
    .map(s => ({ id: s.id, code: s.code, name: s.name, sequence: s.sequence, productionLineId: s.productionLineId }))
    .sort((a, b) => a.sequence - b.sequence)
}

function enrichStationRejection(r: any): StationRejection {
  const shift = SHIFTS.find(s => s.id === r.shiftId)
  const station = STATIONS.find(s => s.id === r.stationId)
  const cat = REJECTION_CATEGORIES.find(c => c.id === r.rejectionCategoryId)
  const misLine = MIS_PRODUCTION_LINES.find(l => l.id === r.misProductionLineId)
  const op = r.operatorId ? OPERATORS.find(o => o.id === r.operatorId) : null
  return {
    ...r,
    shiftName: shift?.name || '',
    stationCode: station?.code || '',
    stationName: station?.name || '',
    misLineName: misLine?.name || '',
    operatorName: op?.name,
    categoryCode: cat?.code || '',
    categoryName: cat?.name || '',
    rejectionType: cat?.type || 1,
  }
}

function enrichStationDowntime(d: any): StationDowntime {
  const shift = SHIFTS.find(s => s.id === d.shiftId)
  const station = STATIONS.find(s => s.id === d.stationId)
  const misLine = MIS_PRODUCTION_LINES.find(l => l.id === d.misProductionLineId)
  const op = d.operatorId ? OPERATORS.find(o => o.id === d.operatorId) : null
  const lc = d.lossCodeId ? LOSS_CODES.find(l => l.id === d.lossCodeId) : null
  return {
    ...d,
    shiftName: shift?.name || '',
    stationCode: station?.code || '',
    stationName: station?.name || '',
    misLineName: misLine?.name || '',
    operatorName: op?.name,
    lossCodeName: lc?.name,
    lossCodeCode: lc?.code,
  }
}

function enrichAssignment(a: any): StationAssignment {
  const shift = SHIFTS.find(s => s.id === a.shiftId)
  const station = STATIONS.find(s => s.id === a.stationId)
  const misLine = MIS_PRODUCTION_LINES.find(l => l.id === a.misProductionLineId)
  const op = OPERATORS.find(o => o.id === a.operatorId)
  return {
    ...a,
    shiftName: shift?.name || '',
    stationCode: station?.code || '',
    stationName: station?.name || '',
    stationSequence: station?.sequence || 0,
    misLineName: misLine?.name || '',
    operatorName: op?.name || '',
    operatorBadge: op?.badgeNumber || '',
  }
}

function enrichToolChangeRecord(r: any): ToolChangeRecord {
  const shift = SHIFTS.find(s => s.id === r.shiftId)
  const tm = TOOL_MASTERS.find(t => t.id === r.toolMasterId)
  const misLine = MIS_PRODUCTION_LINES.find(l => l.id === r.misProductionLineId)
  const prodOp = r.productionOperatorId ? OPERATORS.find(o => o.id === r.productionOperatorId) : null
  const qaOp = r.qaOperatorId ? OPERATORS.find(o => o.id === r.qaOperatorId) : null
  const reason = r.earlyReplacementReasonId ? EARLY_REPLACEMENT_REASONS.find(e => e.id === r.earlyReplacementReasonId) : null
  return {
    ...r,
    shiftName: shift?.name || '',
    toolCode: tm?.toolCode || '',
    toolName: tm?.name || '',
    stationCode: tm?.stationCode || '',
    misLineName: misLine?.name || '',
    productionOperatorName: prodOp?.name,
    qaOperatorName: qaOp?.name,
    earlyReplacementReasonName: reason?.name,
  }
}

// ============= MAIN API OBJECT =============

export const api = {
  // Health
  health: async () => { await delay(); return { status: 'ok', timestamp: new Date().toISOString() } },

  // Shifts
  getShifts: async (): Promise<Shift[]> => { await delay(); return SHIFTS },

  // Operators
  getOperators: async (): Promise<Operator[]> => { await delay(); return OPERATORS },

  // Parts
  getParts: async (): Promise<Part[]> => { await delay(); return PARTS },

  // Production Lines
  getProductionLines: async (): Promise<ProductionLine[]> => { await delay(); return PRODUCTION_LINES },

  // Stations
  getStations: async (_lineId: number): Promise<Station[]> => { await delay(); return STATIONS },

  // Loss Codes
  getLossCodes: async (): Promise<LossCode[]> => { await delay(); return LOSS_CODES },

  // Production Orders (stub - returns empty/mock)
  getProductionOrders: async (_date?: string, _shiftId?: number, _lineId?: number): Promise<ProductionOrder[]> => {
    await delay(); return []
  },
  getProductionOrder: async (_id: number): Promise<ProductionOrder> => {
    await delay(); throw new Error('Not found')
  },
  createProductionOrder: async (data: Partial<ProductionOrder>): Promise<ProductionOrder> => {
    await delay(); return { id: 1, orderNumber: 'ORD-001', date: formatDate(), targetQuantity: 100, completedQuantity: 0, rejectedQuantity: 0, isActive: true, partId: 1, productionLineId: 1, shiftId: 1, ...data } as ProductionOrder
  },

  // Part Instances
  getPartInstances: async (_orderId?: number, _status?: number): Promise<PartInstance[]> => {
    await delay()
    return store.getAll<PartInstance>('part-instances')
  },
  getPartInstance: async (id: number): Promise<PartInstance> => {
    await delay()
    const item = store.getById<PartInstance>('part-instances', id)
    if (!item) throw new Error('Not found')
    return item
  },
  getPartInstanceBySerial: async (serial: string): Promise<PartInstance> => {
    await delay()
    const item = store.getAll<PartInstance>('part-instances').find(p => p.serialNumber === serial)
    if (!item) throw new Error('Not found')
    return item
  },
  scanPart: async (data: { serialNumber: string; stationId: number; operatorId?: number }): Promise<PartInstance> => {
    await delay()
    const pi = store.create<PartInstance>('part-instances', {
      serialNumber: data.serialNumber,
      status: PartInstanceStatus.InProgress,
      currentStationId: data.stationId,
      createdAt: new Date().toISOString(),
      partId: 1,
    } as any)
    return pi
  },

  // Quality
  recordQualityResult: async (data: Partial<QualityResult>): Promise<QualityResult> => {
    await delay()
    return store.create<QualityResult>('quality-results', { ...data, inspectionTime: new Date().toISOString() } as any)
  },
  getQualityResults: async (_partInstanceId: number): Promise<QualityResult[]> => {
    await delay()
    return store.getAll<QualityResult>('quality-results', r => r.partInstanceId === _partInstanceId)
  },

  // Downtime (legacy)
  startDowntime: async (data: { stationId: number; lossCodeId: number; operatorId?: number; productionOrderId?: number; reason?: string }): Promise<DowntimeEvent> => {
    await delay()
    return store.create<DowntimeEvent>('downtime-events', { ...data, startTime: new Date().toISOString(), durationMinutes: 0, status: 0, isPlanned: false } as any)
  },
  endDowntime: async (id: number, _resolution?: string): Promise<DowntimeEvent> => {
    await delay()
    const item = store.update<DowntimeEvent>('downtime-events', id, { endTime: new Date().toISOString(), status: 1 } as any)
    if (!item) throw new Error('Not found')
    return item
  },
  getActiveDowntime: async (_stationId?: number): Promise<DowntimeEvent[]> => { await delay(); return [] },
  getDowntimeHistory: async (_stationId?: number, _date?: string): Promise<DowntimeEvent[]> => { await delay(); return [] },

  // Hourly Production (legacy)
  getHourlyProduction: async (_orderId: number, _stationId?: number): Promise<HourlyProduction[]> => { await delay(); return [] },

  // Tool Life (legacy)
  getToolLife: async (_stationId: number): Promise<ToolLifeRecord[]> => {
    await delay()
    return store.getAll<ToolLifeRecord>('tool-life-records', r => r.stationId === _stationId)
  },
  resetTool: async (id: number): Promise<ToolLifeRecord> => {
    await delay()
    const item = store.update<ToolLifeRecord>('tool-life-records', id, { currentLife: 0, lastResetAt: new Date().toISOString() } as any)
    if (!item) throw new Error('Not found')
    return item
  },

  // OEE (legacy)
  getOee: async (_orderId: number, _stationId?: number): Promise<OeeData> => {
    await delay()
    return { availability: 85, performance: 90, quality: 98, oee: 75, plannedTime: 480, runTime: 408, downtime: 72, totalParts: 500, goodParts: 490, rejectedParts: 10, idealCycleTime: 45 }
  },
  getLineOee: async (_lineId: number, _date?: string, _shiftId?: number): Promise<OeeData> => {
    await delay()
    return { availability: 85, performance: 90, quality: 98, oee: 75, plannedTime: 480, runTime: 408, downtime: 72, totalParts: 500, goodParts: 490, rejectedParts: 10, idealCycleTime: 45 }
  },

  // Traceability
  getPartHistory: async (serialNumber: string): Promise<TraceabilityData> => {
    await delay()
    const pi = store.getAll<any>('part-instances').find(p => p.serialNumber === serialNumber)
    if (!pi) throw new Error(`Part "${serialNumber}" not found`)
    const records = store.getAll<any>('part-station-records').filter(r => r.partInstanceId === pi.id)
    const qResults = store.getAll<any>('quality-results').filter(r => r.partInstanceId === pi.id)

    const misLine = pi.misProductionLineId ? MIS_PRODUCTION_LINES.find(l => l.id === pi.misProductionLineId) : null
    const shift = pi.shiftId ? SHIFTS.find(s => s.id === pi.shiftId) : null

    const statusNames: Record<number, string> = { 0: 'In Progress', 1: 'Completed', 2: 'Rejected', 3: 'Scrapped', 4: 'Rework' }
    const qualityNames: Record<number, string> = { 0: 'Pending', 1: 'Pass', 2: 'Fail', 3: 'Rework', 4: 'Scrap' }

    return {
      partInstance: {
        id: pi.id,
        serialNumber: pi.serialNumber,
        status: pi.status,
        statusName: statusNames[pi.status] || 'Unknown',
        partName: 'Crank Case SC MC R',
        lineName: misLine?.name || null,
        shiftName: shift?.name || null,
        createdAt: pi.createdAt,
        completedAt: pi.completedAt || null,
        totalTimeSeconds: pi.completedAt ? Math.floor((new Date(pi.completedAt).getTime() - new Date(pi.createdAt).getTime()) / 1000) : null,
        rejectReason: pi.rejectReason || null,
        currentStationCode: pi.currentStationId ? (STATIONS.find(s => s.id === pi.currentStationId)?.code || null) : null,
      },
      stationRecords: records.map((r: any) => {
        const st = STATIONS.find(s => s.id === r.stationId)
        const op = r.operatorId ? OPERATORS.find(o => o.id === r.operatorId) : null
        return {
          id: r.id,
          stationCode: st?.code || '',
          stationName: st?.name || '',
          stationType: st?.type || 0,
          stationSequence: st?.sequence || 0,
          entryTime: r.entryTime,
          exitTime: r.exitTime || null,
          cycleTimeSeconds: r.cycleTimeSeconds || null,
          qualityStatus: r.qualityStatus,
          qualityStatusName: qualityNames[r.qualityStatus] || 'Unknown',
          cncProgramNumber: r.cncProgramNumber || null,
          cncPartCount: r.cncPartCount || null,
          cncAlarmCount: r.cncAlarmCount || null,
          operatorName: op?.name || null,
          notes: r.notes || null,
        }
      }).sort((a: any, b: any) => a.stationSequence - b.stationSequence),
      qualityResults: qResults.map((r: any) => {
        const st = STATIONS.find(s => s.id === r.stationId)
        const op = r.operatorId ? OPERATORS.find(o => o.id === r.operatorId) : null
        return {
          id: r.id,
          stationCode: st?.code || '',
          stationName: st?.name || '',
          status: r.status,
          statusName: qualityNames[r.status] || 'Unknown',
          inspectionTime: r.inspectionTime,
          dimension1: r.dimension1 ?? null,
          dimension1Name: r.dimension1Name ?? null,
          dimension2: r.dimension2 ?? null,
          dimension2Name: r.dimension2Name ?? null,
          dimension3: r.dimension3 ?? null,
          dimension3Name: r.dimension3Name ?? null,
          dimension4: r.dimension4 ?? null,
          dimension4Name: r.dimension4Name ?? null,
          leakTestPressure: r.leakTestPressure ?? null,
          leakTestPass: r.leakTestPass ?? null,
          failureReason: r.failureReason || null,
          rejectCode: r.rejectCode || null,
          operatorName: op?.name || null,
          notes: r.notes || null,
        }
      }),
    }
  },

  simulateTraceability: async (misLineId: number, count?: number): Promise<{ success: boolean; generated: number }> => {
    await delay()
    const n = count || 10
    const shift = getShiftSlot()
    const shiftId = shift?.shiftId || 1
    const now = new Date()

    // Delete existing TRACE- parts
    store.deleteWhere<any>('part-instances', p => p.serialNumber?.startsWith('TRACE-'))
    store.deleteWhere<any>('part-station-records', r => {
      const pi = store.getById<any>('part-instances', r.partInstanceId)
      return pi?.serialNumber?.startsWith('TRACE-')
    })

    const opStations = STATIONS.filter(s => [StationType.CNC, StationType.Manual, StationType.Washing, StationType.LeakTest].includes(s.type)).sort((a, b) => a.sequence - b.sequence)
    const bk80 = STATIONS.find(s => s.code === 'BK-80')!
    const op10 = STATIONS.find(s => s.code === 'OP-10')!

    for (let i = 0; i < n; i++) {
      const serial = `TRACE-${String(i + 1).padStart(4, '0')}`
      const startTime = new Date(now.getTime() - (n - i) * 300000)
      const passed = Math.random() < 0.85

      const pi = store.create<any>('part-instances', {
        serialNumber: serial,
        status: passed ? PartInstanceStatus.Completed : PartInstanceStatus.Rejected,
        currentStationId: bk80.id,
        createdAt: startTime.toISOString(),
        completedAt: new Date(startTime.getTime() + 240000).toISOString(),
        rejectReason: passed ? undefined : 'Dimension out of tolerance',
        partId: 1,
        misProductionLineId: misLineId,
        shiftId: shiftId,
      })

      // OP-10 record (Part Loading)
      store.create<any>('part-station-records', {
        partInstanceId: pi.id,
        stationId: op10.id,
        entryTime: startTime.toISOString(),
        exitTime: new Date(startTime.getTime() + 10000).toISOString(),
        cycleTimeSeconds: 10,
        qualityStatus: QualityStatus.Pass,
        operatorId: randomChoice(OPERATORS.filter(o => o.department === 'Production')).id,
      })

      // Records for each OP station
      let t = startTime.getTime() + 15000
      for (const st of opStations) {
        if (st.id === op10.id) continue
        const ct = st.idealCycleTimeSeconds || 45
        store.create<any>('part-station-records', {
          partInstanceId: pi.id,
          stationId: st.id,
          entryTime: new Date(t).toISOString(),
          exitTime: new Date(t + ct * 1000).toISOString(),
          cycleTimeSeconds: ct,
          qualityStatus: QualityStatus.Pass,
          cncProgramNumber: st.type === StationType.CNC ? `O${1000 + st.sequence}` : undefined,
          cncPartCount: st.type === StationType.CNC ? randomInt(100, 500) : undefined,
        })
        t += ct * 1000 + 5000
      }

      // BK-80 Final Inspection
      store.create<any>('part-station-records', {
        partInstanceId: pi.id,
        stationId: bk80.id,
        entryTime: new Date(t).toISOString(),
        exitTime: new Date(t + 30000).toISOString(),
        cycleTimeSeconds: 30,
        qualityStatus: passed ? QualityStatus.Pass : QualityStatus.Fail,
      })

      // Quality result
      store.create<any>('quality-results', {
        partInstanceId: pi.id,
        stationId: bk80.id,
        status: passed ? QualityStatus.Pass : QualityStatus.Fail,
        inspectionTime: new Date(t + 30000).toISOString(),
        dimension1: 12.0 + Math.random() * 0.1,
        dimension1Name: 'Bore Diameter',
        dimension2: 25.0 + Math.random() * 0.05,
        dimension2Name: 'Depth',
        failureReason: passed ? undefined : 'Dimension out of tolerance',
        operatorId: randomChoice(OPERATORS.filter(o => o.department === 'Quality')).id,
      })
    }

    return { success: true, generated: n }
  },

  // Station Live Data (stub)
  getStationLiveData: async (_lineId: number): Promise<Map<number, any>> => { await delay(); return new Map() },

  // Quality Skip Detection
  getSkipReasons: async (): Promise<SkipReason[]> => { await delay(); return SKIP_REASONS },

  detectQualitySkips: async (date: string, shiftId: number, misLineId: number): Promise<QualitySkipDetectionResult> => {
    await delay()
    const shift = SHIFTS.find(s => s.id === shiftId)!
    const misLine = MIS_PRODUCTION_LINES.find(l => l.id === misLineId)!

    // Get OP stations with linked BK stations
    const cncStations = STATIONS.filter(s => s.type === StationType.CNC && s.linkedQualityStationId)

    const stations: QualitySkipStation[] = cncStations.map(op => {
      const bk = STATIONS.find(s => s.id === op.linkedQualityStationId)!

      // Sum actuals for OP and BK
      const opActuals = store.getAll<any>('hourly-actuals', a => a.date === date && a.shiftId === shiftId && a.stationId === op.id && a.misProductionLineId === misLineId)
      const bkActuals = store.getAll<any>('hourly-actuals', a => a.date === date && a.shiftId === shiftId && a.stationId === bk.id && a.misProductionLineId === misLineId)

      const opCount = opActuals.reduce((sum: number, a: any) => sum + (a.actualQuantity || 0), 0)
      const bkCount = bkActuals.reduce((sum: number, a: any) => sum + (a.actualQuantity || 0), 0)
      const skipCount = Math.max(0, opCount - bkCount)

      // Get assignment
      const assignment = store.getAll<any>('station-assignments').find(
        (a: any) => a.date === date && a.shiftId === shiftId && a.stationId === op.id && a.misProductionLineId === misLineId
      )
      const operator = assignment ? OPERATORS.find(o => o.id === assignment.operatorId) : null

      // Get existing skip events
      const skipEvents = store.getAll<any>('quality-skip-events', e =>
        e.date === date && e.shiftId === shiftId && e.misProductionLineId === misLineId && e.cncStationId === op.id
      )
      const assignedReasons: QualitySkipAssignedReason[] = skipEvents.map((e: any) => {
        const reason = e.skipReasonId ? SKIP_REASONS.find(r => r.id === e.skipReasonId) : null
        return {
          id: e.id,
          skipCount: e.skipCount || 0,
          skipReasonId: e.skipReasonId || null,
          skipReasonCode: reason?.code || null,
          skipReasonName: reason?.name || null,
          notes: e.notes || null,
        }
      })
      const totalAssigned = assignedReasons.reduce((sum, r) => sum + r.skipCount, 0)

      return {
        cncStationId: op.id,
        cncStationCode: op.code,
        qualityStationId: bk.id,
        qualityStationCode: bk.code,
        opCount,
        bkCount,
        skipCount,
        hasSkips: skipCount > 0,
        operatorName: operator?.name || null,
        operatorId: operator?.id || null,
        assignedReasons,
        totalAssigned,
        isFullyAssigned: skipCount > 0 ? totalAssigned >= skipCount : true,
      }
    })

    return {
      date,
      shiftId,
      shiftName: shift.name,
      misLineId,
      lineName: misLine.name,
      stations,
      totalSkipCount: stations.reduce((sum, s) => sum + s.skipCount, 0),
      stationsWithSkips: stations.filter(s => s.hasSkips).length,
    }
  },

  assignSkipReason: async (data: QualitySkipAssignRequest): Promise<{ success: boolean; reasonsAssigned: number }> => {
    await delay()
    // Delete existing events for this station pair
    store.deleteWhere<any>('quality-skip-events', e =>
      e.date === data.date && e.shiftId === data.shiftId && e.misProductionLineId === data.misLineId &&
      e.cncStationId === data.cncStationId && e.qualityStationId === data.qualityStationId
    )
    // Create new events
    for (const reason of data.reasons) {
      store.create<any>('quality-skip-events', {
        date: data.date,
        shiftId: data.shiftId,
        misProductionLineId: data.misLineId,
        cncStationId: data.cncStationId,
        qualityStationId: data.qualityStationId,
        skipReasonId: reason.skipReasonId,
        skipCount: reason.count,
        notes: reason.notes,
      })
    }
    return { success: true, reasonsAssigned: data.reasons.length }
  },

  simulateQualitySkips: async (date: string, misLineId: number): Promise<{ success: boolean; opStationsSimulated: number; bkStationsSimulated: number; totalSkipsGenerated: number }> => {
    await delay()
    const eligibleShifts = getEligibleShiftIds(date)
    const cncStations = STATIONS.filter(s => s.type === StationType.CNC && s.linkedQualityStationId)

    // Delete existing simulated actuals for OP and BK stations
    store.deleteWhere<any>('hourly-actuals', a => a.date === date && a.misProductionLineId === misLineId && a.isSimulated)

    let totalSkips = 0
    for (const shiftId of eligibleShifts) {
      const slots = getSlotsForShift(shiftId)
      let prevOpActual = 0

      for (const op of cncStations) {
        const bk = STATIONS.find(s => s.id === op.linkedQualityStationId)!

        for (const slot of slots) {
          const target = Math.round(slot.availableTimeSeconds / 45)
          const opActual = prevOpActual === 0 ? randomInt(Math.floor(target * 0.85), target) : Math.min(prevOpActual, randomInt(Math.floor(target * 0.85), target))
          const bkActual = Math.max(0, opActual - randomInt(0, 5))
          totalSkips += opActual - bkActual
          prevOpActual = opActual

          store.create<any>('hourly-actuals', { date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange, stationId: op.id, misProductionLineId: misLineId, actualQuantity: opActual, isSimulated: true })
          store.create<any>('hourly-actuals', { date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange, stationId: bk.id, misProductionLineId: misLineId, actualQuantity: bkActual, isSimulated: true })
        }
      }
    }

    return { success: true, opStationsSimulated: cncStations.length, bkStationsSimulated: cncStations.length, totalSkipsGenerated: totalSkips }
  },

  // ============= MIS Report Endpoints =============
  getMisParts: async (): Promise<MisPart[]> => { await delay(); return MIS_PARTS },
  getMisPartLines: async (partId: number): Promise<MisProductionLine[]> => { await delay(); return MIS_PRODUCTION_LINES.filter(l => l.misPartId === partId) },
  getMisLines: async (): Promise<MisProductionLine[]> => { await delay(); return MIS_PRODUCTION_LINES },
  getDowntimeCategories: async (): Promise<DowntimeCategory[]> => { await delay(); return DOWNTIME_CATEGORIES },
  getRejectionCategories: async (type?: RejectionType): Promise<RejectionCategory[]> => {
    await delay()
    return type !== undefined ? REJECTION_CATEGORIES.filter(r => r.type === type) : REJECTION_CATEGORIES
  },

  getDailyReports: async (filters?: { date?: string; partId?: number; month?: number; year?: number }): Promise<DailyReportListItem[]> => {
    await delay()
    let reports = store.getAll<any>('daily-reports')
    if (filters?.date) reports = reports.filter(r => r.reportDate === filters.date)
    if (filters?.partId) reports = reports.filter(r => r.misPartId === filters.partId)
    if (filters?.month) reports = reports.filter(r => new Date(r.reportDate).getMonth() + 1 === filters.month)
    if (filters?.year) reports = reports.filter(r => new Date(r.reportDate).getFullYear() === filters.year)
    return reports.map(r => {
      const part = MIS_PARTS.find(p => p.id === r.misPartId)
      return { id: r.id, reportDate: r.reportDate, misPartId: r.misPartId, misPart: { name: part?.name || '' }, totalProduced: r.totalProduced, isFinalized: r.isFinalized }
    })
  },

  getDailyReport: async (id: number): Promise<DailyProductionReport> => {
    await delay()
    const r = store.getById<any>('daily-reports', id)
    if (!r) throw new Error('Not found')
    return r
  },

  getDailyReportByDate: async (date: string, partId: number): Promise<DailyProductionReport> => {
    await delay()
    const r = store.getAll<any>('daily-reports').find(r => r.reportDate === date && r.misPartId === partId)
    if (!r) throw new Error('Not found')
    return r
  },

  createDailyReport: async (data: DailyReportRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    const part = MIS_PARTS.find(p => p.id === data.misPartId)!
    const totalMach = (data.rejections || []).filter(r => REJECTION_CATEGORIES.find(c => c.id === r.rejectionCategoryId)?.type === RejectionType.Machining).reduce((s, r) => s + r.count, 0)
    const totalCast = (data.rejections || []).filter(r => REJECTION_CATEGORIES.find(c => c.id === r.rejectionCategoryId)?.type === RejectionType.Casting).reduce((s, r) => s + r.count, 0)
    const totalPlannedDT = (data.downtimes || []).filter(d => DOWNTIME_CATEGORIES.find(c => c.id === d.downtimeCategoryId)?.isPlanned).reduce((s, d) => s + d.hours, 0)
    const totalUnplannedDT = (data.downtimes || []).filter(d => !DOWNTIME_CATEGORIES.find(c => c.id === d.downtimeCategoryId)?.isPlanned).reduce((s, d) => s + d.hours, 0)

    const okParts = data.totalProduced - totalMach - totalCast
    const grossTime = data.hoursWorked * data.numberOfLinesRunning
    const plannedTime = grossTime - totalPlannedDT
    const availableTime = plannedTime - totalUnplannedDT
    const plannedQty = data.cycleTimeSeconds > 0 ? Math.round((availableTime * 3600 / data.cycleTimeSeconds) * data.efficiencyFactor) : 0
    const perf = plannedQty > 0 ? (data.totalProduced / plannedQty) * 100 : 0
    const qual = data.totalProduced > 0 ? (okParts / data.totalProduced) * 100 : 0
    const avail = plannedTime > 0 ? (availableTime / plannedTime) * 100 : 0
    const oee = perf * qual * avail / 10000

    const report = store.create<any>('daily-reports', {
      ...data,
      reportDate: data.reportDate,
      partName: part.name,
      partLineCount: part.lineCount,
      isFinalized: false,
      totalMachiningRejections: totalMach,
      totalCastingRejections: totalCast,
      totalPlannedDowntimeHours: totalPlannedDT,
      totalUnplannedDowntimeHours: totalUnplannedDT,
      okParts, grossTimeHours: grossTime, plannedTimeHours: plannedTime, availableTimeHours: availableTime,
      plannedQuantity: plannedQty, performanceRate: perf, qualityRate: qual, availabilityRate: avail, oeePercent: oee,
      machiningRejectionPpm: data.totalProduced > 0 ? (totalMach / data.totalProduced) * 1000000 : 0,
      castingRejectionPercent: data.totalProduced > 0 ? (totalCast / data.totalProduced) * 100 : 0,
      downtimes: (data.downtimes || []).map((d, i) => {
        const cat = DOWNTIME_CATEGORIES.find(c => c.id === d.downtimeCategoryId)!
        return { id: i + 1, downtimeCategoryId: d.downtimeCategoryId, categoryCode: cat.code, categoryName: cat.name, isPlanned: cat.isPlanned, hours: d.hours }
      }),
      rejections: (data.rejections || []).map((r, i) => {
        const cat = REJECTION_CATEGORIES.find(c => c.id === r.rejectionCategoryId)!
        return { id: i + 1, rejectionCategoryId: r.rejectionCategoryId, categoryCode: cat.code, categoryName: cat.name, type: cat.type, count: r.count }
      }),
    })
    return { id: report.id, success: true }
  },

  updateDailyReport: async (id: number, data: DailyReportRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    // Recalculate same as create
    const result = await api.createDailyReport(data)
    store.delete('daily-reports', id)
    return { id: result.id, success: true }
  },

  finalizeDailyReport: async (id: number): Promise<{ id: number; isFinalized: boolean; message: string }> => {
    await delay()
    store.update<any>('daily-reports', id, { isFinalized: true })
    return { id, isFinalized: true, message: 'Report finalized' }
  },

  getMonthlySummary: async (month: number, year: number, partId?: number): Promise<MonthlySummary> => {
    await delay()
    let reports = store.getAll<any>('daily-reports').filter(r => {
      const d = new Date(r.reportDate)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    })
    if (partId) reports = reports.filter(r => r.misPartId === partId)

    const totalDays = reports.length
    return {
      month, year, totalDays,
      totalProduced: reports.reduce((s, r) => s + (r.totalProduced || 0), 0),
      totalOkParts: reports.reduce((s, r) => s + (r.okParts || 0), 0),
      totalMachiningRejections: reports.reduce((s, r) => s + (r.totalMachiningRejections || 0), 0),
      totalCastingRejections: reports.reduce((s, r) => s + (r.totalCastingRejections || 0), 0),
      totalPlannedDowntime: reports.reduce((s, r) => s + (r.totalPlannedDowntimeHours || 0), 0),
      totalUnplannedDowntime: reports.reduce((s, r) => s + (r.totalUnplannedDowntimeHours || 0), 0),
      totalHoursWorked: reports.reduce((s, r) => s + (r.hoursWorked || 0), 0),
      averageOee: totalDays > 0 ? reports.reduce((s, r) => s + (r.oeePercent || 0), 0) / totalDays : 0,
      averagePerformance: totalDays > 0 ? reports.reduce((s, r) => s + (r.performanceRate || 0), 0) / totalDays : 0,
      averageQuality: totalDays > 0 ? reports.reduce((s, r) => s + (r.qualityRate || 0), 0) / totalDays : 0,
      averageAvailability: totalDays > 0 ? reports.reduce((s, r) => s + (r.availabilityRate || 0), 0) / totalDays : 0,
      averageMachiningPpm: totalDays > 0 ? reports.reduce((s, r) => s + (r.machiningRejectionPpm || 0), 0) / totalDays : 0,
      averageCastingPercent: totalDays > 0 ? reports.reduce((s, r) => s + (r.castingRejectionPercent || 0), 0) / totalDays : 0,
      dailyBreakdown: reports.map(r => ({
        reportDate: r.reportDate, partName: r.partName || '', prodPlanSob: r.prodPlanSob || 0,
        totalProduced: r.totalProduced || 0, okParts: r.okParts || 0,
        totalMachiningRejections: r.totalMachiningRejections || 0,
        totalCastingRejections: r.totalCastingRejections || 0, oeePercent: r.oeePercent || 0,
      })),
    }
  },

  exportToExcel: (_month: number, _year: number) => {
    window.alert('Excel export is not available in demo mode.')
  },

  // ============= Station Assignment =============
  getStationAssignments: async (filters?: { date?: string; shiftId?: number; misLineId?: number; stationId?: number }): Promise<StationAssignment[]> => {
    await delay()
    let items = store.getAll<any>('station-assignments')
    if (filters?.date) items = items.filter(a => a.date === filters.date)
    if (filters?.shiftId) items = items.filter(a => a.shiftId === filters.shiftId)
    if (filters?.misLineId) items = items.filter(a => a.misProductionLineId === filters.misLineId)
    if (filters?.stationId) items = items.filter(a => a.stationId === filters.stationId)
    return items.map(enrichAssignment)
  },

  getStationAssignment: async (id: number): Promise<StationAssignment> => {
    await delay()
    const item = store.getById<any>('station-assignments', id)
    if (!item) throw new Error('Not found')
    return enrichAssignment(item)
  },

  createStationAssignment: async (data: StationAssignmentRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    // Check for duplicate
    const existing = store.getAll<any>('station-assignments').find(
      a => a.date === data.date && a.shiftId === data.shiftId && a.stationId === data.stationId && a.misProductionLineId === data.misLineId
    )
    if (existing) {
      store.update<any>('station-assignments', existing.id, { operatorId: data.operatorId })
      return { id: existing.id, success: true }
    }
    const item = store.create<any>('station-assignments', {
      date: data.date, shiftId: data.shiftId, stationId: data.stationId,
      misProductionLineId: data.misLineId, operatorId: data.operatorId,
      createdAt: new Date().toISOString(),
    })
    return { id: item.id, success: true }
  },

  updateStationAssignment: async (id: number, operatorId: number): Promise<{ id: number; success: boolean }> => {
    await delay()
    store.update<any>('station-assignments', id, { operatorId })
    return { id, success: true }
  },

  deleteStationAssignment: async (id: number): Promise<{ success: boolean }> => {
    await delay()
    store.delete('station-assignments', id)
    return { success: true }
  },

  bulkCreateStationAssignments: async (data: BulkStationAssignmentRequest): Promise<{ created: number; skipped: number; success: boolean }> => {
    await delay()
    let created = 0, skipped = 0
    for (const a of data.assignments) {
      const existing = store.getAll<any>('station-assignments').find(
        e => e.date === data.date && e.shiftId === data.shiftId && e.stationId === a.stationId && e.misProductionLineId === data.misLineId
      )
      if (existing) { skipped++; continue }
      store.create<any>('station-assignments', {
        date: data.date, shiftId: data.shiftId, stationId: a.stationId,
        misProductionLineId: data.misLineId, operatorId: a.operatorId,
        createdAt: new Date().toISOString(),
      })
      created++
    }
    return { created, skipped, success: true }
  },

  // ============= Hourly Production Planning =============
  getHourlyPlan: async (date: string, misLineId: number): Promise<HourlyProductionPlan | null> => {
    await delay()
    const plan = store.getAll<any>('hourly-plans').find(p => p.date === date && p.misProductionLineId === misLineId)
    if (!plan) return null
    const misLine = MIS_PRODUCTION_LINES.find(l => l.id === misLineId)
    return { ...plan, misLineName: misLine?.name || '' }
  },

  saveHourlyPlan: async (data: HourlyPlanRequest): Promise<{ id: number; success: boolean; message: string }> => {
    await delay()
    // Delete existing plan
    store.deleteWhere<any>('hourly-plans', p => p.date === data.date && p.misProductionLineId === data.misLineId)
    const slots = data.slots.map(s => {
      const target = data.cycleTimeSeconds > 0 ? Math.round(s.availableTimeSeconds / data.cycleTimeSeconds) : 0
      const shift = SHIFTS.find(sh => sh.id === s.shiftId)
      return { ...s, id: store.nextId('hourly-slots'), shiftName: shift?.name || '', productionTarget: target }
    })
    const plan = store.create<any>('hourly-plans', {
      date: data.date, misProductionLineId: data.misLineId, cycleTimeSeconds: data.cycleTimeSeconds,
      slots, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    return { id: plan.id, success: true, message: 'Plan saved' }
  },

  getDefaultSlots: async (): Promise<DefaultSlotConfig[]> => { await delay(); return DEFAULT_SLOT_CONFIGS },

  // ============= Station Rejections =============
  getStationRejections: async (filters?: { date?: string; shiftId?: number; stationId?: number; misLineId?: number; rejectionCategoryId?: number }): Promise<StationRejection[]> => {
    await delay()
    let items = store.getAll<any>('station-rejections')
    if (filters?.date) items = items.filter(r => r.date === filters.date)
    if (filters?.shiftId) items = items.filter(r => r.shiftId === filters.shiftId)
    if (filters?.stationId) items = items.filter(r => r.stationId === filters.stationId)
    if (filters?.misLineId) items = items.filter(r => r.misProductionLineId === filters.misLineId)
    if (filters?.rejectionCategoryId) items = items.filter(r => r.rejectionCategoryId === filters.rejectionCategoryId)
    return items.map(enrichStationRejection)
  },

  createStationRejection: async (data: StationRejectionRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    const item = store.create<any>('station-rejections', {
      date: data.date, shiftId: data.shiftId, slotIndex: data.slotIndex, slotTimeRange: data.slotTimeRange,
      stationId: data.stationId, misProductionLineId: data.misLineId, operatorId: data.operatorId,
      rejectionCategoryId: data.rejectionCategoryId, rejectCount: data.rejectCount, notes: data.notes,
      createdAt: new Date().toISOString(),
    })
    return { id: item.id, success: true }
  },

  updateStationRejection: async (id: number, data: StationRejectionRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    store.update<any>('station-rejections', id, {
      date: data.date, shiftId: data.shiftId, slotIndex: data.slotIndex, slotTimeRange: data.slotTimeRange,
      stationId: data.stationId, misProductionLineId: data.misLineId, operatorId: data.operatorId,
      rejectionCategoryId: data.rejectionCategoryId, rejectCount: data.rejectCount, notes: data.notes,
    })
    return { id, success: true }
  },

  deleteStationRejection: async (id: number): Promise<{ success: boolean }> => {
    await delay(); store.delete('station-rejections', id); return { success: true }
  },

  getStationRejectionSummary: async (date: string, misLineId: number): Promise<StationRejectionSummary[]> => {
    await delay()
    const rejections = store.getAll<any>('station-rejections').filter(r => r.date === date && r.misProductionLineId === misLineId)
    const bkStations = getQualityStationsForLine()
    return bkStations.map(s => {
      const stRej = rejections.filter(r => r.stationId === s.id)
      return {
        stationId: s.id, stationCode: s.code,
        totalRejects: stRej.reduce((sum: number, r: any) => sum + r.rejectCount, 0),
        machiningRejects: stRej.filter(r => { const cat = REJECTION_CATEGORIES.find(c => c.id === r.rejectionCategoryId); return cat?.type === RejectionType.Machining }).reduce((sum: number, r: any) => sum + r.rejectCount, 0),
        castingRejects: stRej.filter(r => { const cat = REJECTION_CATEGORIES.find(c => c.id === r.rejectionCategoryId); return cat?.type === RejectionType.Casting }).reduce((sum: number, r: any) => sum + r.rejectCount, 0),
      }
    })
  },

  getQualityStations: async (lineId?: number): Promise<QualityStation[]> => { await delay(); return getQualityStationsForLine(lineId) },

  getCurrentShiftSlot: async (): Promise<CurrentShiftSlot | null> => { await delay(); return getShiftSlot() },

  // ============= Station Downtime =============
  getStationDowntimes: async (filters?: { date?: string; shiftId?: number; stationId?: number; misLineId?: number; status?: number }): Promise<StationDowntime[]> => {
    await delay()
    let items = store.getAll<any>('station-downtimes')
    if (filters?.date) items = items.filter(d => d.date === filters.date)
    if (filters?.shiftId) items = items.filter(d => d.shiftId === filters.shiftId)
    if (filters?.stationId) items = items.filter(d => d.stationId === filters.stationId)
    if (filters?.misLineId) items = items.filter(d => d.misProductionLineId === filters.misLineId)
    if (filters?.status !== undefined) items = items.filter(d => d.status === filters.status)
    return items.map(enrichStationDowntime)
  },

  createStationDowntime: async (data: StationDowntimeRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    const item = store.create<any>('station-downtimes', {
      date: data.date, shiftId: data.shiftId, slotIndex: data.slotIndex, slotTimeRange: data.slotTimeRange,
      stationId: data.stationId, misProductionLineId: data.misLineId, operatorId: data.operatorId,
      lossCodeId: data.lossCodeId, downtimeMinutes: data.downtimeMinutes,
      status: data.lossCodeId ? StationDowntimeStatus.Manual : StationDowntimeStatus.Unassigned,
      isAutoLogged: false, notes: data.notes, createdAt: new Date().toISOString(),
    })
    return { id: item.id, success: true }
  },

  updateStationDowntime: async (id: number, data: StationDowntimeUpdateRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    store.update<any>('station-downtimes', id, data)
    return { id, success: true }
  },

  assignStationDowntime: async (id: number, data: DowntimeAssignRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    store.update<any>('station-downtimes', id, { lossCodeId: data.lossCodeId, operatorId: data.operatorId, notes: data.notes, status: StationDowntimeStatus.Assigned })
    return { id, success: true }
  },

  deleteStationDowntime: async (id: number): Promise<{ success: boolean }> => {
    await delay(); store.delete('station-downtimes', id); return { success: true }
  },

  getStationDowntimeSummary: async (date: string, misLineId: number): Promise<StationDowntimeSummary[]> => {
    await delay()
    const downtimes = store.getAll<any>('station-downtimes').filter(d => d.date === date && d.misProductionLineId === misLineId)
    const opStations = getOpStationsForLine()
    return opStations.map(s => {
      const stDt = downtimes.filter(d => d.stationId === s.id)
      return {
        stationId: s.id, stationCode: s.code,
        totalMinutes: stDt.reduce((sum: number, d: any) => sum + d.downtimeMinutes, 0),
        unassignedCount: stDt.filter(d => d.status === StationDowntimeStatus.Unassigned).length,
        assignedCount: stDt.filter(d => d.status !== StationDowntimeStatus.Unassigned).length,
        totalEntries: stDt.length,
      }
    })
  },

  getOpStations: async (lineId?: number): Promise<OpStation[]> => { await delay(); return getOpStationsForLine(lineId) },

  simulateDowntime: async (date: string, misLineId: number): Promise<{ generated: number; success: boolean }> => {
    await delay()
    store.deleteWhere<any>('station-downtimes', d => d.date === date && d.misProductionLineId === misLineId && d.isAutoLogged)
    const eligibleShifts = getEligibleShiftIds(date)
    const opStations = getOpStationsForLine()
    let generated = 0

    for (const station of opStations) {
      const count = randomInt(2, 5)
      for (let i = 0; i < count; i++) {
        const shiftId = randomChoice(eligibleShifts)
        const slots = getSlotsForShift(shiftId)
        const slot = randomChoice(slots)
        const minutes = randomInt(1, 11) * 5
        const assigned = Math.random() < 0.4

        store.create<any>('station-downtimes', {
          date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange,
          stationId: station.id, misProductionLineId: misLineId,
          lossCodeId: assigned ? randomChoice(LOSS_CODES).id : null,
          downtimeMinutes: minutes,
          status: assigned ? StationDowntimeStatus.Assigned : StationDowntimeStatus.Unassigned,
          isAutoLogged: true, createdAt: new Date().toISOString(),
        })
        generated++
      }
    }
    return { generated, success: true }
  },

  // ============= Hourly Report =============
  getHourlyReport: async (date: string, stationId: number, misLineId: number): Promise<HourlyReportData> => {
    await delay()
    const station = STATIONS.find(s => s.id === stationId)!
    const misLine = MIS_PRODUCTION_LINES.find(l => l.id === misLineId)!
    const misPart = MIS_PARTS.find(p => p.id === misLine.misPartId)!
    const plan = store.getAll<any>('hourly-plans').find(p => p.date === date && p.misProductionLineId === misLineId)
    const cycleTime = plan?.cycleTimeSeconds || 45

    const linkedBk = station.linkedQualityStationId ? STATIONS.find(s => s.id === station.linkedQualityStationId) : null

    let cumulativeCount = 0
    const shifts: HourlyReportShift[] = SHIFTS.map(shift => {
      const slots = getSlotsForShift(shift.id)
      const assignment = store.getAll<any>('station-assignments').find(
        a => a.date === date && a.shiftId === shift.id && a.stationId === stationId && a.misProductionLineId === misLineId
      )
      const operator = assignment ? OPERATORS.find(o => o.id === assignment.operatorId) : null

      const reportSlots: HourlyReportSlot[] = slots.map(slot => {
        const planSlot = plan?.slots?.find((s: any) => s.shiftId === shift.id && s.slotIndex === slot.slotIndex)
        const target = planSlot?.productionTarget || 0

        const actual = store.getAll<any>('hourly-actuals').find(
          a => a.date === date && a.shiftId === shift.id && a.slotIndex === slot.slotIndex && a.stationId === stationId && a.misProductionLineId === misLineId
        )
        const actualProd = actual?.actualQuantity || 0

        const rejections = linkedBk ? store.getAll<any>('station-rejections').filter(
          r => r.date === date && r.shiftId === shift.id && r.slotIndex === slot.slotIndex && r.stationId === linkedBk.id && r.misProductionLineId === misLineId
        ) : []
        const castRej = rejections.filter(r => { const cat = REJECTION_CATEGORIES.find(c => c.id === r.rejectionCategoryId); return cat?.type === RejectionType.Casting }).reduce((s: number, r: any) => s + r.rejectCount, 0)
        const machRej = rejections.filter(r => { const cat = REJECTION_CATEGORIES.find(c => c.id === r.rejectionCategoryId); return cat?.type === RejectionType.Machining }).reduce((s: number, r: any) => s + r.rejectCount, 0)

        const downtimes = store.getAll<any>('station-downtimes').filter(
          d => d.date === date && d.shiftId === shift.id && d.slotIndex === slot.slotIndex && d.stationId === stationId && d.misProductionLineId === misLineId
        )
        const lossTime = downtimes.reduce((s: number, d: any) => s + d.downtimeMinutes, 0)
        const lossCodes = downtimes.filter(d => d.lossCodeId).map(d => {
          const lc = LOSS_CODES.find(l => l.id === d.lossCodeId)
          return lc?.code || ''
        }).filter(Boolean).join(', ') || null

        return {
          slotIndex: slot.slotIndex, timeRange: slot.timeRange,
          productionTarget: target, actualProduction: actualProd,
          castingRejection: castRej, machiningRejection: machRej,
          netOkQty: actualProd - castRej - machRej,
          lossCodes, lossTimeMinutes: lossTime,
        }
      })

      const totals = {
        productionTarget: reportSlots.reduce((s, sl) => s + sl.productionTarget, 0),
        actualProduction: reportSlots.reduce((s, sl) => s + sl.actualProduction, 0),
        castingRejection: reportSlots.reduce((s, sl) => s + sl.castingRejection, 0),
        machiningRejection: reportSlots.reduce((s, sl) => s + sl.machiningRejection, 0),
        netOkQty: reportSlots.reduce((s, sl) => s + sl.netOkQty, 0),
        lossTimeMinutes: reportSlots.reduce((s, sl) => s + sl.lossTimeMinutes, 0),
      }

      cumulativeCount += totals.actualProduction

      // Loss details
      const shiftDowntimes = store.getAll<any>('station-downtimes').filter(
        d => d.date === date && d.shiftId === shift.id && d.stationId === stationId && d.misProductionLineId === misLineId && d.lossCodeId
      )
      const lossMap = new Map<number, { minutes: number; code: string; name: string }>()
      for (const d of shiftDowntimes) {
        const lc = LOSS_CODES.find(l => l.id === d.lossCodeId)
        if (!lc) continue
        const existing = lossMap.get(d.lossCodeId) || { minutes: 0, code: lc.code, name: lc.name }
        existing.minutes += d.downtimeMinutes
        lossMap.set(d.lossCodeId, existing)
      }
      const lossDetails: HourlyReportLossDetail[] = Array.from(lossMap.values()).map(l => ({
        lossMinutes: l.minutes,
        partCount: cycleTime > 0 ? Math.round((l.minutes * 60) / cycleTime) : 0,
        reason: l.name, lossCode: l.code,
      }))

      return { shiftId: shift.id, shiftName: shift.name, operatorName: operator?.name || null, slots: reportSlots, totals, lossDetails, cumulativeCount }
    })

    const allLossCodes = LOSS_CODES.map(l => ({ code: l.code, name: l.name }))
    const summary = {
      cycleTimeSeconds: cycleTime,
      totalProductionTarget: shifts.reduce((s, sh) => s + sh.totals.productionTarget, 0),
      totalProduction: shifts.reduce((s, sh) => s + sh.totals.actualProduction, 0),
      totalRejection: shifts.reduce((s, sh) => s + sh.totals.castingRejection + sh.totals.machiningRejection, 0),
      totalOk: shifts.reduce((s, sh) => s + sh.totals.netOkQty, 0),
    }

    return {
      date, partName: misPart.name, lineName: misLine.name,
      stationCode: station.code, stationName: station.name,
      machineId: station.cncMachineId || null,
      cycleTimeSeconds: cycleTime, shifts, summary, lossCodes: allLossCodes,
    }
  },

  simulateHourlyReport: async (date: string, stationId: number, misLineId: number): Promise<{ success: boolean; generated: { actualProduction: number; downtimeEntries: number; rejectionEntries: number } }> => {
    await delay()
    const station = STATIONS.find(s => s.id === stationId)!
    const plan = store.getAll<any>('hourly-plans').find(p => p.date === date && p.misProductionLineId === misLineId)
    const cycleTime = plan?.cycleTimeSeconds || 45
    const linkedBk = station.linkedQualityStationId ? STATIONS.find(s => s.id === station.linkedQualityStationId) : null
    const eligibleShifts = getEligibleShiftIds(date)

    store.deleteWhere<any>('hourly-actuals', a => a.date === date && a.stationId === stationId && a.misProductionLineId === misLineId && a.isSimulated)
    store.deleteWhere<any>('station-downtimes', d => d.date === date && d.stationId === stationId && d.misProductionLineId === misLineId && d.isAutoLogged)
    if (linkedBk) {
      store.deleteWhere<any>('station-rejections', r => r.date === date && r.stationId === linkedBk.id && r.misProductionLineId === misLineId && r.createdAt?.includes('simulated'))
    }

    let actualCount = 0, dtCount = 0, rejCount = 0

    for (const shiftId of eligibleShifts) {
      const slots = getSlotsForShift(shiftId)
      for (const slot of slots) {
        const planSlot = plan?.slots?.find((s: any) => s.shiftId === shiftId && s.slotIndex === slot.slotIndex)
        const target = planSlot?.productionTarget || Math.round(slot.availableTimeSeconds / cycleTime)
        const actual = randomInt(Math.floor(target * 0.8), target)

        store.create<any>('hourly-actuals', { date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange, stationId, misProductionLineId: misLineId, actualQuantity: actual, isSimulated: true })
        actualCount++

        // Random downtime (30% chance)
        if (Math.random() < 0.3) {
          const mins = randomInt(1, 6) * 5
          const assigned = Math.random() < 0.4
          store.create<any>('station-downtimes', {
            date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange,
            stationId, misProductionLineId: misLineId,
            lossCodeId: assigned ? randomChoice(LOSS_CODES).id : null,
            downtimeMinutes: mins,
            status: assigned ? StationDowntimeStatus.Assigned : StationDowntimeStatus.Unassigned,
            isAutoLogged: true, createdAt: new Date().toISOString(),
          })
          dtCount++
        }

        // Random rejection at linked BK (20% chance)
        if (linkedBk && Math.random() < 0.2) {
          const cat = randomChoice(REJECTION_CATEGORIES)
          store.create<any>('station-rejections', {
            date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange,
            stationId: linkedBk.id, misProductionLineId: misLineId,
            rejectionCategoryId: cat.id, rejectCount: randomInt(1, 3),
            createdAt: 'simulated-' + new Date().toISOString(),
          })
          rejCount++
        }
      }
    }

    return { success: true, generated: { actualProduction: actualCount, downtimeEntries: dtCount, rejectionEntries: rejCount } }
  },

  exportHourlyReport: (_date: string, _stationId: number, _misLineId: number) => {
    window.alert('Excel export is not available in demo mode.')
  },

  // ============= Line Dashboard =============
  getLineDashboard: async (date: string, misLineId: number): Promise<LineDashboardData> => {
    await delay()
    const misLine = MIS_PRODUCTION_LINES.find(l => l.id === misLineId)!
    const misPart = MIS_PARTS.find(p => p.id === misLine.misPartId)!
    const plan = store.getAll<any>('hourly-plans').find(p => p.date === date && p.misProductionLineId === misLineId)
    const cycleTime = plan?.cycleTimeSeconds || 45
    const currentShift = getShiftSlot()
    const shiftId = currentShift?.shiftId || 1

    const opStations = getOpStationsForLine()

    const stations: LineDashboardStation[] = opStations.map(s => {
      const fullStation = STATIONS.find(st => st.id === s.id)!
      const actuals = store.getAll<any>('hourly-actuals').filter(
        a => a.date === date && a.shiftId === shiftId && a.stationId === s.id && a.misProductionLineId === misLineId
      )
      const totalProduced = actuals.reduce((sum: number, a: any) => sum + (a.actualQuantity || 0), 0)

      const planSlots = plan?.slots?.filter((sl: any) => sl.shiftId === shiftId) || []
      const productionTarget = planSlots.reduce((sum: number, sl: any) => sum + (sl.productionTarget || 0), 0)

      const downtimes = store.getAll<any>('station-downtimes').filter(
        d => d.date === date && d.shiftId === shiftId && d.stationId === s.id && d.misProductionLineId === misLineId
      )
      const dtMinutes = downtimes.reduce((sum: number, d: any) => sum + d.downtimeMinutes, 0)

      const linkedBk = fullStation.linkedQualityStationId
      const rejections = linkedBk ? store.getAll<any>('station-rejections').filter(
        r => r.date === date && r.shiftId === shiftId && r.stationId === linkedBk && r.misProductionLineId === misLineId
      ) : []
      const totalRejects = rejections.reduce((sum: number, r: any) => sum + r.rejectCount, 0)

      const assignment = store.getAll<any>('station-assignments').find(
        a => a.date === date && a.shiftId === shiftId && a.stationId === s.id && a.misProductionLineId === misLineId
      )
      const operator = assignment ? OPERATORS.find(o => o.id === assignment.operatorId) : null

      // OEE calculation
      const plannedMins = SHIFTS.find(sh => sh.id === shiftId)?.plannedMinutes || 480
      const avail = plannedMins > 0 ? Math.max(0, Math.min(100, ((plannedMins - dtMinutes) / plannedMins) * 100)) : 0
      const perf = productionTarget > 0 ? Math.max(0, Math.min(150, (totalProduced / productionTarget) * 100)) : 0
      const qual = totalProduced > 0 ? Math.max(0, Math.min(100, ((totalProduced - totalRejects) / totalProduced) * 100)) : 100
      const oee = avail * perf * qual / 10000

      let status: 'Running' | 'Down' | 'Idle' = 'Idle'
      if (totalProduced > 0) status = 'Running'
      else if (dtMinutes > 0) status = 'Down'

      return {
        stationId: s.id, stationCode: s.code, stationName: s.name, stationType: s.type,
        cncMachineId: fullStation.cncMachineId || null,
        status, oee, availability: avail, performance: perf, quality: qual,
        totalProduced, productionTarget, downtimeMinutes: dtMinutes, totalRejects,
        operatorName: operator?.name || null, programNo: fullStation.cncMachineId ? `O${1000 + fullStation.sequence}` : null,
      }
    })

    // Line KPIs: target = station target (same for all), actual = last station's output
    const lastStation = stations[stations.length - 1]
    const totalTarget = stations.length > 0 ? stations[0].productionTarget : 0
    const totalProduced = lastStation?.totalProduced || 0
    const totalRejects = stations.reduce((s, st) => s + st.totalRejects, 0)
    const totalDT = stations.reduce((s, st) => s + st.downtimeMinutes, 0)

    const avgAvail = stations.length > 0 ? stations.reduce((s, st) => s + st.availability, 0) / stations.length : 0
    const avgPerf = stations.length > 0 ? stations.reduce((s, st) => s + st.performance, 0) / stations.length : 0
    const avgQual = stations.length > 0 ? stations.reduce((s, st) => s + st.quality, 0) / stations.length : 0
    const lineOee = avgAvail * avgPerf * avgQual / 10000

    return {
      date, partName: misPart.name, lineName: misLine.name, misLineId,
      currentShiftId: shiftId, currentShiftName: getShiftName(shiftId), cycleTimeSeconds: cycleTime,
      lineKpis: { oee: lineOee, availability: avgAvail, performance: avgPerf, quality: avgQual, totalProduced, totalTarget, totalRejects, totalDowntimeMinutes: totalDT },
      stations,
    }
  },

  simulateLineDashboard: async (date: string, misLineId: number): Promise<{ success: boolean; stationsSimulated: number }> => {
    await delay()
    const eligibleShifts = getEligibleShiftIds(date)
    const opStations = getOpStationsForLine()
    const plan = store.getAll<any>('hourly-plans').find(p => p.date === date && p.misProductionLineId === misLineId)
    const cycleTime = plan?.cycleTimeSeconds || 45

    // Clean existing simulated data
    store.deleteWhere<any>('hourly-actuals', a => a.date === date && a.misProductionLineId === misLineId && a.isSimulated)
    store.deleteWhere<any>('station-downtimes', d => d.date === date && d.misProductionLineId === misLineId && d.isAutoLogged)
    store.deleteWhere<any>('station-rejections', r => r.date === date && r.misProductionLineId === misLineId && r.createdAt?.includes('simulated'))

    for (const shiftId of eligibleShifts) {
      const slots = getSlotsForShift(shiftId)

      for (const slot of slots) {
        const planSlot = plan?.slots?.find((s: any) => s.shiftId === shiftId && s.slotIndex === slot.slotIndex)
        const target = planSlot?.productionTarget || Math.round(slot.availableTimeSeconds / cycleTime)

        let prevActual = 0
        for (let i = 0; i < opStations.length; i++) {
          const st = opStations[i]
          const fullStation = STATIONS.find(s => s.id === st.id)!

          let actual: number
          if (i === 0) {
            actual = randomInt(Math.floor(target * 0.85), target)
          } else {
            actual = Math.max(0, prevActual - randomInt(0, 2))
          }
          prevActual = actual

          store.create<any>('hourly-actuals', {
            date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange,
            stationId: st.id, misProductionLineId: misLineId, actualQuantity: actual, isSimulated: true,
          })

          // Random downtime (20% chance per station)
          if (Math.random() < 0.2) {
            const mins = randomInt(1, 6) * 5
            const assigned = Math.random() < 0.4
            store.create<any>('station-downtimes', {
              date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange,
              stationId: st.id, misProductionLineId: misLineId,
              lossCodeId: assigned ? randomChoice(LOSS_CODES).id : null,
              downtimeMinutes: mins,
              status: assigned ? StationDowntimeStatus.Assigned : StationDowntimeStatus.Unassigned,
              isAutoLogged: true, createdAt: new Date().toISOString(),
            })
          }

          // Rejection at linked BK (15% chance)
          if (fullStation.linkedQualityStationId && Math.random() < 0.15) {
            const cat = randomChoice(REJECTION_CATEGORIES)
            store.create<any>('station-rejections', {
              date, shiftId, slotIndex: slot.slotIndex, slotTimeRange: slot.timeRange,
              stationId: fullStation.linkedQualityStationId, misProductionLineId: misLineId,
              rejectionCategoryId: cat.id, rejectCount: randomInt(1, 3),
              createdAt: 'simulated-' + new Date().toISOString(),
            })
          }
        }
      }
    }

    return { success: true, stationsSimulated: opStations.length }
  },

  // ============= Plant Overview =============
  getPlantOverview: async (date: string): Promise<PlantOverviewData> => {
    await delay()
    const currentShift = getShiftSlot()
    const shiftId = currentShift?.shiftId || 1

    const lines: PlantOverviewLine[] = MIS_PRODUCTION_LINES.slice(0, 10).map(misLine => {
      const misPart = MIS_PARTS.find(p => p.id === misLine.misPartId)!
      const plan = store.getAll<any>('hourly-plans').find(p => p.date === date && p.misProductionLineId === misLine.id)
      const cycleTime = plan?.cycleTimeSeconds || 45

      const actuals = store.getAll<any>('hourly-actuals').filter(
        a => a.date === date && a.shiftId === shiftId && a.misProductionLineId === misLine.id
      )
      const totalProduced = actuals.reduce((s: number, a: any) => s + (a.actualQuantity || 0), 0)

      const planSlots = plan?.slots?.filter((sl: any) => sl.shiftId === shiftId) || []
      const totalTarget = planSlots.reduce((s: number, sl: any) => s + (sl.productionTarget || 0), 0)

      const downtimes = store.getAll<any>('station-downtimes').filter(
        d => d.date === date && d.shiftId === shiftId && d.misProductionLineId === misLine.id
      )
      const dtMinutes = downtimes.reduce((s: number, d: any) => s + d.downtimeMinutes, 0)

      const rejections = store.getAll<any>('station-rejections').filter(
        r => r.date === date && r.shiftId === shiftId && r.misProductionLineId === misLine.id
      )
      const totalRejects = rejections.reduce((s: number, r: any) => s + r.rejectCount, 0)

      const plannedMins = SHIFTS.find(s => s.id === shiftId)?.plannedMinutes || 480
      const avail = plannedMins > 0 ? Math.min(100, ((plannedMins - dtMinutes) / plannedMins) * 100) : 0
      const perf = totalTarget > 0 ? Math.min(150, (totalProduced / totalTarget) * 100) : 0
      const qual = totalProduced > 0 ? Math.min(100, ((totalProduced - totalRejects) / totalProduced) * 100) : 100
      const oee = avail * perf * qual / 10000

      let status: 'Running' | 'Down' | 'Idle' = 'Idle'
      if (totalProduced > 0) status = 'Running'
      else if (dtMinutes > 0) status = 'Down'

      return {
        misLineId: misLine.id, lineName: misLine.name, partName: misPart.name,
        cycleTimeSeconds: cycleTime, oee, availability: avail, performance: perf, quality: qual,
        totalProduced, totalTarget, totalRejects, totalDowntimeMinutes: dtMinutes,
        status, stationCount: STATIONS.length, runningStationCount: totalProduced > 0 ? randomInt(6, 10) : 0,
      }
    })

    const activeLines = lines.filter(l => l.status === 'Running')
    const plantKpis: PlantOverviewKpis = {
      oee: activeLines.length > 0 ? activeLines.reduce((s, l) => s + l.oee, 0) / activeLines.length : 0,
      availability: activeLines.length > 0 ? activeLines.reduce((s, l) => s + l.availability, 0) / activeLines.length : 0,
      performance: activeLines.length > 0 ? activeLines.reduce((s, l) => s + l.performance, 0) / activeLines.length : 0,
      quality: activeLines.length > 0 ? activeLines.reduce((s, l) => s + l.quality, 0) / activeLines.length : 0,
      totalProduced: lines.reduce((s, l) => s + l.totalProduced, 0),
      totalTarget: lines.reduce((s, l) => s + l.totalTarget, 0),
      totalRejects: lines.reduce((s, l) => s + l.totalRejects, 0),
      totalDowntimeMinutes: lines.reduce((s, l) => s + l.totalDowntimeMinutes, 0),
      activeLineCount: activeLines.length,
    }

    return { date, currentShiftId: shiftId, currentShiftName: getShiftName(shiftId), plantKpis, lines }
  },

  simulatePlantOverview: async (date: string): Promise<{ success: boolean; linesSimulated: number }> => {
    await delay()
    // Simulate line dashboard for first 5 MIS lines
    const linesToSimulate = MIS_PRODUCTION_LINES.slice(0, 5)
    for (const line of linesToSimulate) {
      await api.simulateLineDashboard(date, line.id)
    }
    return { success: true, linesSimulated: linesToSimulate.length }
  },

  // ============= OEE Analytics =============
  getOeeAnalytics: async (params: { period: string; date: string; shiftId?: number; misLineId?: number; stationId?: number }): Promise<OeeAnalyticsData> => {
    await delay()
    const misLine = params.misLineId ? MIS_PRODUCTION_LINES.find(l => l.id === params.misLineId) : null
    const station = params.stationId ? STATIONS.find(s => s.id === params.stationId) : null

    let level: 'plant' | 'line' | 'station' = 'plant'
    if (params.stationId) level = 'station'
    else if (params.misLineId) level = 'line'

    // Basic aggregation from hourly actuals
    const actuals = store.getAll<any>('hourly-actuals').filter(a => {
      if (params.misLineId && a.misProductionLineId !== params.misLineId) return false
      if (params.stationId && a.stationId !== params.stationId) return false
      if (params.shiftId && a.shiftId !== params.shiftId) return false
      return true
    })

    const totalProduced = actuals.reduce((s: number, a: any) => s + (a.actualQuantity || 0), 0)
    const totalTarget = Math.max(totalProduced, Math.round(totalProduced * 1.1))
    const totalRejects = store.getAll<any>('station-rejections').filter(r => {
      if (params.misLineId && r.misProductionLineId !== params.misLineId) return false
      return true
    }).reduce((s: number, r: any) => s + r.rejectCount, 0)

    const dtMinutes = store.getAll<any>('station-downtimes').filter(d => {
      if (params.misLineId && d.misProductionLineId !== params.misLineId) return false
      if (params.stationId && d.stationId !== params.stationId) return false
      return true
    }).reduce((s: number, d: any) => s + d.downtimeMinutes, 0)

    const plannedMins = 480 * 3
    const avail = plannedMins > 0 ? Math.min(100, ((plannedMins - dtMinutes) / plannedMins) * 100) : 85
    const perf = totalTarget > 0 ? Math.min(100, (totalProduced / totalTarget) * 100) : 88
    const qual = totalProduced > 0 ? Math.min(100, ((totalProduced - totalRejects) / totalProduced) * 100) : 97
    const oee = avail * perf * qual / 10000

    // Generate trend data
    const trendData: OeeTrendPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      trendData.push({
        label: d.toISOString().slice(5, 10),
        oee: oee * (0.9 + Math.random() * 0.2),
        availability: avail * (0.9 + Math.random() * 0.2),
        performance: perf * (0.9 + Math.random() * 0.2),
        quality: qual * (0.95 + Math.random() * 0.1),
      })
    }

    return {
      period: params.period, dateFrom: params.date, dateTo: params.date,
      level, misLineId: params.misLineId || null, lineName: misLine?.name || null,
      stationId: params.stationId || null, stationName: station?.name || null,
      oee, availability: avail, performance: perf, quality: qual,
      totalProduced, totalTarget, totalRejects, totalDowntimeMinutes: dtMinutes, plannedMinutes: plannedMins,
      topDowntimeReasons: LOSS_CODES.slice(0, 5).map((lc, i) => ({
        lossCodeId: lc.id, lossCode: lc.code, lossName: lc.name, category: lc.category,
        totalMinutes: Math.max(0, dtMinutes - i * 10), percentage: 20 - i * 3,
        affectsAvailability: lc.affectsAvailability, affectsPerformance: lc.affectsPerformance, affectsQuality: lc.affectsQuality,
      })),
      topRejectReasons: REJECTION_CATEGORIES.slice(0, 5).map((rc, i) => ({
        rejectionCategoryId: rc.id, categoryCode: rc.code, categoryName: rc.name,
        type: rc.type === RejectionType.Machining ? 'Machining' : 'Casting',
        totalCount: Math.max(0, totalRejects - i * 2), percentage: 20 - i * 3,
      })),
      stationBreakdown: getOpStationsForLine().slice(0, 5).map(s => ({
        stationId: s.id, stationCode: s.code, stationName: s.name,
        oee: oee * (0.9 + Math.random() * 0.2), availability: avail * (0.95 + Math.random() * 0.1),
        performance: perf * (0.9 + Math.random() * 0.2), quality: qual * (0.95 + Math.random() * 0.1),
        produced: Math.round(totalProduced / 5), target: Math.round(totalTarget / 5),
        rejects: Math.round(totalRejects / 5), downtimeMinutes: Math.round(dtMinutes / 5),
      })),
      shiftBreakdown: SHIFTS.map(s => ({
        shiftId: s.id, shiftName: s.name,
        oee: oee * (0.9 + Math.random() * 0.2), availability: avail * (0.95 + Math.random() * 0.1),
        performance: perf * (0.9 + Math.random() * 0.2), quality: qual * (0.95 + Math.random() * 0.1),
      })),
      trendData,
    }
  },

  // ============= Tool Life Management =============
  getToolMasters: async (stationId: number): Promise<ToolMaster[]> => {
    await delay()
    return TOOL_MASTERS.filter(t => t.stationId === stationId)
  },

  getEarlyReplacementReasons: async (): Promise<EarlyReplacementReason[]> => { await delay(); return EARLY_REPLACEMENT_REASONS },

  getToolChangeRecords: async (filters?: { toolMasterId?: number; dateFrom?: string; dateTo?: string; misLineId?: number; stationId?: number }): Promise<ToolChangeRecord[]> => {
    await delay()
    let items = store.getAll<any>('tool-change-records')
    if (filters?.toolMasterId) items = items.filter(r => r.toolMasterId === filters.toolMasterId)
    if (filters?.stationId) items = items.filter(r => { const tm = TOOL_MASTERS.find(t => t.id === r.toolMasterId); return tm?.stationId === filters.stationId })
    if (filters?.misLineId) items = items.filter(r => r.misProductionLineId === filters.misLineId)
    if (filters?.dateFrom) items = items.filter(r => r.date >= filters.dateFrom!)
    if (filters?.dateTo) items = items.filter(r => r.date <= filters.dateTo!)
    return items.map(enrichToolChangeRecord)
  },

  createToolChangeRecord: async (data: ToolChangeRecordRequest): Promise<{ id: number; success: boolean; serialNumber: number }> => {
    await delay()
    const existing = store.getAll<any>('tool-change-records').filter(r => r.toolMasterId === data.toolMasterId)
    const serialNumber = existing.length > 0 ? Math.max(...existing.map((r: any) => r.serialNumber)) + 1 : 1
    const isEarly = data.actualLife !== undefined && data.actualLife < data.planLife
    const item = store.create<any>('tool-change-records', {
      ...data, serialNumber, isEarlyReplacement: isEarly || data.isEarlyReplacement,
      misProductionLineId: data.misLineId, isSimulated: false, createdAt: new Date().toISOString(),
    })
    return { id: item.id, success: true, serialNumber }
  },

  updateToolChangeRecord: async (id: number, data: ToolChangeRecordUpdateRequest): Promise<{ id: number; success: boolean }> => {
    await delay()
    const existing = store.getById<any>('tool-change-records', id)
    if (existing && data.actualLife !== undefined) {
      const isEarly = data.actualLife < existing.planLife
      store.update<any>('tool-change-records', id, { ...data, isEarlyReplacement: data.isEarlyReplacement ?? isEarly })
    } else {
      store.update<any>('tool-change-records', id, data)
    }
    return { id, success: true }
  },

  deleteToolChangeRecord: async (id: number): Promise<{ success: boolean }> => {
    await delay(); store.delete('tool-change-records', id); return { success: true }
  },

  simulateToolChanges: async (dateFrom: string, dateTo: string, misLineId: number): Promise<{ success: boolean; generated: number }> => {
    await delay()
    store.deleteWhere<any>('tool-change-records', r => r.misProductionLineId === misLineId && r.isSimulated)

    let generated = 0
    const start = new Date(dateFrom)
    const end = new Date(dateTo)

    for (const tm of TOOL_MASTERS) {
      let edge = 1
      let serial = store.getAll<any>('tool-change-records').filter(r => r.toolMasterId === tm.id).length + 1

      const d = new Date(start)
      while (d <= end) {
        const changes = randomInt(0, 2)
        for (let i = 0; i < changes; i++) {
          const planLife = tm.plannedLifePerCorner
          const actualLife = Math.round(planLife * (0.7 + Math.random() * 0.4))
          const isEarly = actualLife < planLife

          store.create<any>('tool-change-records', {
            date: d.toISOString().slice(0, 10),
            shiftId: randomChoice([1, 2, 3]),
            toolMasterId: tm.id,
            misProductionLineId: misLineId,
            edgeNumber: edge,
            planLife, actualLife, isEarlyReplacement: isEarly,
            earlyReplacementReasonId: isEarly ? randomChoice(EARLY_REPLACEMENT_REASONS).id : undefined,
            productionOperatorId: randomChoice(OPERATORS.filter(o => o.department === 'Production')).id,
            qaOperatorId: Math.random() < 0.5 ? randomChoice(OPERATORS.filter(o => o.department === 'Quality')).id : undefined,
            dimensionDiameter: (12 + Math.random() * 0.1).toFixed(2),
            dimensionDepth: (25 + Math.random() * 0.05).toFixed(2),
            serialNumber: serial,
            isSimulated: true, createdAt: new Date().toISOString(),
          })
          serial++
          edge = edge >= tm.totalCorners ? 1 : edge + 1
          generated++
        }
        d.setDate(d.getDate() + 1)
      }
    }

    return { success: true, generated }
  },

  exportToolChangeRecords: (_toolMasterId: number, _dateFrom?: string, _dateTo?: string) => {
    window.alert('Excel export is not available in demo mode.')
  },

  // ============= Tool Life Dashboard =============
  getToolLifeDashboard: async (misLineId: number): Promise<ToolLifeDashboardData> => {
    await delay()
    const misLine = MIS_PRODUCTION_LINES.find(l => l.id === misLineId)!
    const misPart = MIS_PARTS.find(p => p.id === misLine.misPartId)!

    const cncStations = STATIONS.filter(s => s.type === StationType.CNC)
    const toolLifeRecords = store.getAll<any>('tool-life-records')

    let okCount = 0, warningCount = 0, criticalCount = 0, exceededCount = 0

    const stations: ToolLifeDashboardStation[] = cncStations.map(st => {
      const tools = TOOL_MASTERS.filter(t => t.stationId === st.id)
      let stWarning = 0, stCritical = 0, stExceeded = 0

      const dashTools: ToolLifeDashboardTool[] = tools.map(tm => {
        const record = toolLifeRecords.find((r: any) => r.toolMasterId === tm.id)
        const maxLife = tm.plannedLifePerCorner * tm.totalCorners
        const currentLife = record?.currentLife || 0
        const pct = maxLife > 0 ? (currentLife / maxLife) * 100 : 0

        let status: ToolLifeStatus = 'OK'
        if (pct > 100) { status = 'Exceeded'; stExceeded++; exceededCount++ }
        else if (pct >= 95) { status = 'Critical'; stCritical++; criticalCount++ }
        else if (pct >= 80) { status = 'Warning'; stWarning++; warningCount++ }
        else { okCount++ }

        return {
          toolMasterId: tm.id, toolCode: tm.toolCode, toolName: tm.name,
          plannedLifePerCorner: tm.plannedLifePerCorner, totalCorners: tm.totalCorners,
          toolLifeRecordId: record?.id || null, toolNumber: tm.displayOrder,
          maxLife, currentLife, lifePercentage: pct,
          warningThreshold: 80, criticalThreshold: 95, status,
          lastResetAt: record?.lastResetAt || null, lastUpdatedAt: record?.lastUpdatedAt || null,
          notes: record?.notes || null,
        }
      })

      return {
        id: st.id, stationCode: st.code, stationName: st.name, cncMachineId: st.cncMachineId || null,
        toolCount: dashTools.length, warningCount: stWarning, criticalCount: stCritical, exceededCount: stExceeded,
        tools: dashTools,
      }
    })

    const totalTools = TOOL_MASTERS.length
    const lastRecord = toolLifeRecords.length > 0 ? toolLifeRecords[toolLifeRecords.length - 1] : null

    return {
      misLineId, partName: misPart.name, lineName: misLine.name,
      lastUpdatedAt: lastRecord?.lastUpdatedAt || null,
      summary: { totalTools, okCount, warningCount, criticalCount, exceededCount },
      stations,
    }
  },

  simulateToolLifeDashboard: async (_misLineId: number): Promise<{ success: boolean; generated: number }> => {
    await delay()
    store.deleteWhere<any>('tool-life-records', r => r.isSimulated)

    for (const tm of TOOL_MASTERS) {
      const maxLife = tm.plannedLifePerCorner * tm.totalCorners
      const rand = Math.random()
      let pct: number
      if (rand < 0.6) pct = 0.1 + Math.random() * 0.6           // 60% OK (10-70%)
      else if (rand < 0.8) pct = 0.8 + Math.random() * 0.14     // 20% Warning (80-94%)
      else if (rand < 0.95) pct = 0.95 + Math.random() * 0.05   // 15% Critical (95-100%)
      else pct = 1.01 + Math.random() * 0.14                     // 5% Exceeded (101-115%)

      const currentLife = Math.round(maxLife * pct)

      store.create<any>('tool-life-records', {
        toolMasterId: tm.id, stationId: tm.stationId,
        toolNumber: tm.displayOrder, toolName: tm.name,
        maxLife, currentLife, warningThreshold: 80, criticalThreshold: 95,
        lifePercentage: pct * 100, isWarning: pct >= 0.8, isCritical: pct >= 0.95,
        lastResetAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(),
        isSimulated: true,
      })
    }

    return { success: true, generated: TOOL_MASTERS.length }
  },

  // ============= Part Scanning =============
  partLoadingScan: async (data: PartLoadingScanRequest): Promise<PartScanResponse> => {
    await delay()
    const currentShift = getShiftSlot()
    const op10 = STATIONS.find(s => s.code === 'OP-10')!

    // Check if already exists
    const existing = store.getAll<any>('part-instances').find(p => p.serialNumber === data.serialNumber)
    if (existing) throw new Error(`Part ${data.serialNumber} already scanned`)

    const pi = store.create<any>('part-instances', {
      serialNumber: data.serialNumber,
      status: PartInstanceStatus.InProgress,
      currentStationId: op10.id,
      createdAt: new Date().toISOString(),
      partId: 1,
      misProductionLineId: data.misLineId,
      shiftId: currentShift?.shiftId || 1,
    })

    store.create<any>('part-station-records', {
      partInstanceId: pi.id, stationId: op10.id,
      entryTime: new Date().toISOString(),
      qualityStatus: QualityStatus.Pass,
      operatorId: data.operatorId,
    })

    return {
      id: pi.id, serialNumber: pi.serialNumber, status: 'InProgress',
      stationCode: op10.code, shiftName: currentShift?.shiftName || 'Shift A',
      scannedAt: pi.createdAt, message: `Part ${data.serialNumber} loaded successfully`,
    }
  },

  partScanLookup: async (serial: string): Promise<PartScanLookup> => {
    await delay()
    const pi = store.getAll<any>('part-instances').find(p => p.serialNumber === serial)
    if (!pi) throw new Error(`Part "${serial}" not found`)

    const shift = pi.shiftId ? SHIFTS.find(s => s.id === pi.shiftId) : null
    const misLine = pi.misProductionLineId ? MIS_PRODUCTION_LINES.find(l => l.id === pi.misProductionLineId) : null
    const op10 = STATIONS.find(s => s.code === 'OP-10')!
    const elapsed = Math.floor((Date.now() - new Date(pi.createdAt).getTime()) / 1000)

    const statusNames: Record<number, string> = { 0: 'InProgress', 1: 'Completed', 2: 'Rejected' }
    const isInspected = pi.status === PartInstanceStatus.Completed || pi.status === PartInstanceStatus.Rejected

    return {
      id: pi.id, serialNumber: pi.serialNumber, status: statusNames[pi.status] || 'InProgress',
      shiftName: shift?.name, misLineName: misLine?.name,
      loadedAt: pi.createdAt, loadingStation: op10.code,
      elapsedSeconds: elapsed, elapsedFormatted: `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`,
      isInspected, completedAt: pi.completedAt, rejectReason: pi.rejectReason,
    }
  },

  partFinalInspection: async (data: FinalInspectionScanRequest): Promise<FinalInspectionResponse> => {
    await delay()
    const pi = store.getAll<any>('part-instances').find(p => p.serialNumber === data.serialNumber)
    if (!pi) throw new Error(`Part "${data.serialNumber}" not found`)

    const bk80 = STATIONS.find(s => s.code === 'BK-80')!
    const now = new Date().toISOString()
    const currentShift = getShiftSlot()

    store.update<any>('part-instances', pi.id, {
      status: data.pass ? PartInstanceStatus.Completed : PartInstanceStatus.Rejected,
      currentStationId: bk80.id,
      completedAt: now,
      rejectReason: data.pass ? undefined : (data.failureReason || 'Failed inspection'),
    })

    store.create<any>('part-station-records', {
      partInstanceId: pi.id, stationId: bk80.id,
      entryTime: now, exitTime: now, cycleTimeSeconds: 30,
      qualityStatus: data.pass ? QualityStatus.Pass : QualityStatus.Fail,
      operatorId: data.operatorId,
    })

    store.create<any>('quality-results', {
      partInstanceId: pi.id, stationId: bk80.id,
      status: data.pass ? QualityStatus.Pass : QualityStatus.Fail,
      inspectionTime: now,
      dimension1: data.dimension1, dimension2: data.dimension2,
      dimension3: data.dimension3, dimension4: data.dimension4,
      failureReason: data.pass ? undefined : data.failureReason,
      notes: data.notes, operatorId: data.operatorId,
    })

    const totalTime = Math.floor((Date.now() - new Date(pi.createdAt).getTime()) / 1000)

    return {
      id: pi.id, serialNumber: pi.serialNumber,
      result: data.pass ? 'Pass' : 'Fail',
      loadedAt: pi.createdAt, inspectedAt: now,
      totalProductionTimeSeconds: totalTime,
      stationCode: bk80.code, shiftName: currentShift?.shiftName || 'Shift A',
      message: data.pass ? `Part ${data.serialNumber} passed inspection` : `Part ${data.serialNumber} failed: ${data.failureReason || 'Failed'}`,
    }
  },

  getRecentPartScans: async (misLineId: number, type: 'loading' | 'inspection', limit?: number): Promise<RecentPartScan[] | RecentInspection[]> => {
    await delay()
    const parts = store.getAll<any>('part-instances')
      .filter(p => p.misProductionLineId === misLineId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit || 20)

    if (type === 'inspection') {
      return parts
        .filter(p => p.status === PartInstanceStatus.Completed || p.status === PartInstanceStatus.Rejected)
        .map(p => {
          const shift = p.shiftId ? SHIFTS.find(s => s.id === p.shiftId) : null
          return {
            id: p.id, serialNumber: p.serialNumber,
            result: p.status === PartInstanceStatus.Completed ? 'Pass' : 'Fail',
            loadedAt: p.createdAt, inspectedAt: p.completedAt || p.createdAt,
            totalProductionTimeSeconds: p.completedAt ? Math.floor((new Date(p.completedAt).getTime() - new Date(p.createdAt).getTime()) / 1000) : 0,
            shiftName: shift?.name || 'Shift A',
          }
        }) as RecentInspection[]
    }

    return parts.map(p => {
      const shift = p.shiftId ? SHIFTS.find(s => s.id === p.shiftId) : null
      const statusNames: Record<number, string> = { 0: 'InProgress', 1: 'Completed', 2: 'Rejected' }
      return {
        id: p.id, serialNumber: p.serialNumber, status: statusNames[p.status] || 'InProgress',
        shiftName: shift?.name || 'Shift A', scannedAt: p.createdAt, completedAt: p.completedAt,
      }
    }) as RecentPartScan[]
  },

  simulatePartScans: async (date: string, misLineId: number, count?: number): Promise<{ success: boolean; generated: number }> => {
    await delay()
    const n = count || 20
    const shift = getShiftSlot()
    const shiftId = shift?.shiftId || 1
    const op10 = STATIONS.find(s => s.code === 'OP-10')!
    const bk80 = STATIONS.find(s => s.code === 'BK-80')!

    store.deleteWhere<any>('part-instances', p => p.serialNumber?.startsWith('SIM-'))

    for (let i = 0; i < n; i++) {
      const serial = `SIM-${date.replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`
      const startTime = new Date(`${date}T08:00:00`)
      startTime.setMinutes(startTime.getMinutes() + i * 3)
      const passed = Math.random() < 0.85

      const pi = store.create<any>('part-instances', {
        serialNumber: serial,
        status: passed ? PartInstanceStatus.Completed : PartInstanceStatus.Rejected,
        currentStationId: bk80.id,
        createdAt: startTime.toISOString(),
        completedAt: new Date(startTime.getTime() + 240000).toISOString(),
        rejectReason: passed ? undefined : 'Dimension out of tolerance',
        partId: 1, misProductionLineId: misLineId, shiftId,
      })

      store.create<any>('part-station-records', {
        partInstanceId: pi.id, stationId: op10.id,
        entryTime: startTime.toISOString(), qualityStatus: QualityStatus.Pass,
      })

      store.create<any>('part-station-records', {
        partInstanceId: pi.id, stationId: bk80.id,
        entryTime: new Date(startTime.getTime() + 240000).toISOString(),
        exitTime: new Date(startTime.getTime() + 270000).toISOString(),
        cycleTimeSeconds: 30,
        qualityStatus: passed ? QualityStatus.Pass : QualityStatus.Fail,
      })

      store.create<any>('quality-results', {
        partInstanceId: pi.id, stationId: bk80.id,
        status: passed ? QualityStatus.Pass : QualityStatus.Fail,
        inspectionTime: new Date(startTime.getTime() + 270000).toISOString(),
        dimension1: 12.0 + Math.random() * 0.1,
        dimension1Name: 'Bore Diameter',
        failureReason: passed ? undefined : 'Dimension out of tolerance',
      })
    }

    return { success: true, generated: n }
  },
}
