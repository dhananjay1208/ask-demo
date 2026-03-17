// Enums
export enum StationType {
  LaserMarking = 1,
  CNC = 2,
  QualityGate = 3,
  Washing = 4,
  LeakTest = 5,
  FinalInspection = 6,
  Manual = 7
}

export enum StationStatus {
  Idle = 0,
  Running = 1,
  Stopped = 2,
  Alarm = 3,
  Offline = 4,
  Setup = 5,
  Maintenance = 6
}

export enum ShiftType {
  A = 1,
  B = 2,
  C = 3
}

export enum QualityStatus {
  Pending = 0,
  Pass = 1,
  Fail = 2,
  Rework = 3,
  Scrap = 4
}

export enum PartInstanceStatus {
  InProgress = 0,
  Completed = 1,
  Rejected = 2,
  Scrapped = 3,
  Rework = 4
}

// DTOs
export interface Shift {
  id: number
  type: ShiftType
  name: string
  startTime: string
  endTime: string
  plannedMinutes: number
  breakMinutes: number
  isActive: boolean
}

export interface Operator {
  id: number
  badgeNumber: string
  name: string
  department?: string
  isActive: boolean
}

export interface Part {
  id: number
  partNumber: string
  name: string
  description?: string
  idealCycleTimeSeconds: number
  isActive: boolean
}

export interface ProductionLine {
  id: number
  code: string
  name: string
  description?: string
  isActive: boolean
}

export interface Station {
  id: number
  code: string
  name: string
  sequence: number
  type: StationType
  cncMachineId?: string
  linkedQualityStationId?: number
  idealCycleTimeSeconds?: number
  productionLineId: number
  isActive: boolean
}

export interface LossCode {
  id: number
  code: string
  name: string
  description?: string
  category: string
  affectsAvailability: boolean
  affectsPerformance: boolean
  affectsQuality: boolean
  displayOrder: number
  isActive: boolean
}

export interface ProductionOrder {
  id: number
  orderNumber: string
  date: string
  targetQuantity: number
  completedQuantity: number
  rejectedQuantity: number
  isActive: boolean
  partId: number
  productionLineId: number
  shiftId: number
  part?: Part
  productionLine?: ProductionLine
  shift?: Shift
}

export interface PartInstance {
  id: number
  serialNumber: string
  status: PartInstanceStatus
  currentStationId?: number
  createdAt: string
  completedAt?: string
  rejectReason?: string
  rejectedAtStationId?: number
  partId: number
  productionOrderId?: number
  misProductionLineId?: number
  shiftId?: number
}

export interface PartStationRecord {
  id: number
  entryTime: string
  exitTime?: string
  cycleTimeSeconds?: number
  qualityStatus: QualityStatus
  notes?: string
  cncPartCount?: number
  cncAlarmCount?: number
  cncProgramNumber?: string
  partInstanceId: number
  stationId: number
  operatorId?: number
}

export interface QualityResult {
  id: number
  status: QualityStatus
  inspectionTime: string
  dimension1?: number
  dimension2?: number
  dimension3?: number
  dimension4?: number
  dimension1Name?: string
  dimension2Name?: string
  dimension3Name?: string
  dimension4Name?: string
  leakTestPressure?: number
  leakTestPass?: boolean
  failureReason?: string
  rejectCode?: string
  notes?: string
  partInstanceId: number
  stationId: number
  operatorId?: number
}

export interface DowntimeEvent {
  id: number
  startTime: string
  endTime?: string
  durationMinutes: number
  status: number
  reason?: string
  resolution?: string
  isPlanned: boolean
  cncAlarmCode?: string
  cncAlarmMessage?: string
  stationId: number
  lossCodeId: number
  operatorId?: number
  productionOrderId?: number
  lossCode?: LossCode
}

export interface ToolLifeRecord {
  id: number
  toolNumber: number
  toolName?: string
  maxLife: number
  currentLife: number
  warningThreshold: number
  criticalThreshold: number
  lastResetAt: string
  lastUpdatedAt?: string
  notes?: string
  stationId: number
  lifePercentage: number
  isWarning: boolean
  isCritical: boolean
}

export interface HourlyProduction {
  id: number
  date: string
  hour: number
  targetQuantity: number
  actualQuantity: number
  rejectedQuantity: number
  downtimeMinutes: number
  notes?: string
  productionOrderId: number
  stationId: number
  goodQuantity: number
  targetAchievement: number
}

export interface StationSnapshot {
  id: number
  timestamp: string
  status: StationStatus
  partCount?: number
  spindleSpeed?: number
  spindleLoad?: number
  feedRate?: number
  feedOverride?: number
  spindleOverride?: number
  activeProgram?: string
  mode?: string
  runState?: string
  emergencyStop?: boolean
  activeAlarms?: string
  stationId: number
}

// Real-time station data
export interface StationLiveData {
  stationId: number
  stationCode: string
  status: StationStatus
  partCount: number
  spindleSpeed?: number
  spindleLoad?: number
  feedRate?: number
  activeProgram?: string
  mode?: string
  runState?: string
  hasAlarm: boolean
  alarmMessage?: string
  lastUpdated: string
}

// OEE Data
export interface OeeData {
  availability: number
  performance: number
  quality: number
  oee: number
  plannedTime: number
  runTime: number
  downtime: number
  totalParts: number
  goodParts: number
  rejectedParts: number
  idealCycleTime: number
}

// Session context
export interface SessionContext {
  operator: Operator | null
  shift: Shift | null
  productionLine: ProductionLine | null
  part: Part | null
  productionOrder: ProductionOrder | null
}

// Quality Skip Detection
export interface SkipReason {
  id: number
  code: string
  name: string
  description?: string
  isActive: boolean
}

export interface QualitySkipDetectionResult {
  date: string
  shiftId: number
  shiftName: string
  misLineId: number
  lineName: string
  stations: QualitySkipStation[]
  totalSkipCount: number
  stationsWithSkips: number
}

export interface QualitySkipStation {
  cncStationId: number
  cncStationCode: string
  qualityStationId: number
  qualityStationCode: string
  opCount: number
  bkCount: number
  skipCount: number
  hasSkips: boolean
  operatorName: string | null
  operatorId: number | null
  assignedReasons: QualitySkipAssignedReason[]
  totalAssigned: number
  isFullyAssigned: boolean
}

export interface QualitySkipAssignedReason {
  id: number
  skipCount: number
  skipReasonId: number | null
  skipReasonCode: string | null
  skipReasonName: string | null
  notes: string | null
}

export interface QualitySkipAssignRequest {
  date: string
  shiftId: number
  misLineId: number
  cncStationId: number
  qualityStationId: number
  opCount: number
  bkCount: number
  totalSkipCount: number
  reasons: Array<{ count: number; skipReasonId: number; notes?: string }>
}

// ============= MIS Report Types =============

export enum RejectionType {
  Machining = 1,
  Casting = 2
}

export interface MisPart {
  id: number
  name: string
  code?: string
  lineCount: number
  isActive: boolean
  createdAt: string
}

export interface MisProductionLine {
  id: number
  name: string
  lineNumber: number
  misPartId: number
  misPart?: MisPart
  isActive: boolean
  createdAt: string
}

export interface DowntimeCategory {
  id: number
  code: string
  name: string
  description?: string
  isPlanned: boolean
  displayOrder: number
  isActive: boolean
}

export interface RejectionCategory {
  id: number
  code: string
  name: string
  description?: string
  type: RejectionType
  displayOrder: number
  isActive: boolean
}

export interface DailyDowntimeEntry {
  id: number
  downtimeCategoryId: number
  categoryCode: string
  categoryName: string
  isPlanned: boolean
  hours: number  // Changed from minutes to hours (matching Excel)
}

export interface DailyRejectionEntry {
  id: number
  rejectionCategoryId: number
  categoryCode: string
  categoryName: string
  type: RejectionType
  count: number
}

export interface DailyProductionReport {
  id: number
  reportDate: string
  misPartId: number
  partName: string
  partLineCount: number
  cycleTimeSeconds: number
  prodPlanSob: number
  totalProduced: number
  hoursWorked: number
  numberOfLinesRunning: number
  efficiencyFactor: number  // Default 0.88 (88%) - matches Excel $J$2
  operatorName?: string
  notes?: string
  isFinalized: boolean
  // Totals
  totalMachiningRejections: number
  totalCastingRejections: number
  totalPlannedDowntimeHours: number   // Changed from Minutes to Hours
  totalUnplannedDowntimeHours: number // Changed from Minutes to Hours
  // Calculated metrics (matching Excel)
  okParts: number
  grossTimeHours: number      // Changed from Minutes to Hours
  plannedTimeHours: number    // Changed from Minutes to Hours
  availableTimeHours: number  // Changed from Minutes to Hours
  plannedQuantity: number
  performanceRate: number
  qualityRate: number
  availabilityRate: number
  oeePercent: number
  machiningRejectionPpm: number
  castingRejectionPercent: number
  // Details
  downtimes?: DailyDowntimeEntry[]
  rejections?: DailyRejectionEntry[]
}

export interface DailyReportListItem {
  id: number
  reportDate: string
  misPartId: number
  misPart: {
    name: string
  }
  totalProduced: number
  isFinalized: boolean
}

export interface MonthlySummary {
  month: number
  year: number
  totalDays: number
  totalProduced: number
  totalOkParts: number
  totalMachiningRejections: number
  totalCastingRejections: number
  totalPlannedDowntime: number
  totalUnplannedDowntime: number
  totalHoursWorked: number
  averageOee: number
  averagePerformance: number
  averageQuality: number
  averageAvailability: number
  averageMachiningPpm: number
  averageCastingPercent: number
  dailyBreakdown: Array<{
    reportDate: string
    partName: string
    prodPlanSob: number
    totalProduced: number
    okParts: number
    totalMachiningRejections: number
    totalCastingRejections: number
    oeePercent: number
  }>
}

export interface DailyReportRequest {
  reportDate: string
  misPartId: number
  cycleTimeSeconds: number
  prodPlanSob: number
  totalProduced: number
  hoursWorked: number
  numberOfLinesRunning: number
  efficiencyFactor: number  // Default 0.88 (88%) - matches Excel $J$2
  operatorName?: string
  notes?: string
  submittedByOperatorId?: number
  downtimes?: Array<{ downtimeCategoryId: number; hours: number }>  // Changed from minutes to hours
  rejections?: Array<{ rejectionCategoryId: number; count: number }>
}

// ============= Station Assignment Types =============

export interface StationAssignment {
  id: number
  date: string
  shiftId: number
  shiftName: string
  stationId: number
  stationCode: string
  stationName: string
  stationSequence: number
  misProductionLineId: number
  misLineName: string
  operatorId: number
  operatorName: string
  operatorBadge: string
  createdAt: string
}

export interface StationAssignmentRequest {
  date: string
  shiftId: number
  misLineId: number
  stationId: number
  operatorId: number
}

export interface BulkStationAssignmentRequest {
  date: string
  shiftId: number
  misLineId: number
  assignments: Array<{ stationId: number; operatorId: number }>
}

// ============= Hourly Production Planning Types =============

export interface HourlyProductionPlan {
  id: number
  date: string
  misProductionLineId: number
  misLineName: string
  cycleTimeSeconds: number
  slots: HourlySlot[]
  createdAt: string
  updatedAt?: string
}

export interface HourlySlot {
  id: number
  shiftId: number
  shiftName: string
  slotIndex: number
  timeRange: string
  availableTimeSeconds: number
  productionTarget: number
}

export interface HourlyPlanRequest {
  date: string
  misLineId: number
  cycleTimeSeconds: number
  slots: Array<{
    shiftId: number
    slotIndex: number
    timeRange: string
    availableTimeSeconds: number
  }>
}

export interface DefaultSlotConfig {
  shiftId: number
  shiftName: string
  slots: Array<{
    slotIndex: number
    timeRange: string
    defaultAvailableTime: number
  }>
}

// ============= Station Rejection Types =============

export interface StationRejection {
  id: number
  date: string
  shiftId: number
  shiftName: string
  slotIndex: number
  slotTimeRange: string
  stationId: number
  stationCode: string
  stationName: string
  misProductionLineId: number
  misLineName: string
  operatorId?: number
  operatorName?: string
  rejectionCategoryId: number
  categoryCode: string
  categoryName: string
  rejectionType: number  // 1=Machining, 2=Casting
  rejectCount: number
  notes?: string
  createdAt: string
}

export interface StationRejectionRequest {
  date: string
  shiftId: number
  slotIndex: number
  slotTimeRange: string
  stationId: number
  misLineId: number
  operatorId?: number
  rejectionCategoryId: number
  rejectCount: number
  notes?: string
}

export interface CurrentShiftSlot {
  shiftId: number
  shiftName: string
  slotIndex: number
  slotTimeRange: string
}

export interface StationRejectionSummary {
  stationId: number
  stationCode: string
  totalRejects: number
  machiningRejects: number
  castingRejects: number
}

export interface QualityStation {
  id: number
  code: string
  name: string
  sequence: number
  productionLineId: number
}

// ============= Station Downtime Types =============

export enum StationDowntimeStatus {
  Unassigned = 0,
  Assigned = 1,
  Manual = 2
}

export interface StationDowntime {
  id: number
  date: string
  shiftId: number
  shiftName: string
  slotIndex: number
  slotTimeRange: string
  stationId: number
  stationCode: string
  stationName: string
  misProductionLineId: number
  misLineName: string
  operatorId?: number
  operatorName?: string
  lossCodeId?: number
  lossCodeName?: string
  lossCodeCode?: string
  downtimeMinutes: number
  status: StationDowntimeStatus
  isAutoLogged: boolean
  notes?: string
  createdAt: string
}

export interface StationDowntimeRequest {
  date: string
  shiftId: number
  slotIndex: number
  slotTimeRange: string
  stationId: number
  misLineId: number
  operatorId?: number
  lossCodeId?: number
  downtimeMinutes: number
  notes?: string
}

export interface StationDowntimeUpdateRequest {
  lossCodeId?: number
  downtimeMinutes?: number
  operatorId?: number
  notes?: string
}

export interface DowntimeAssignRequest {
  lossCodeId: number
  operatorId?: number
  notes?: string
}

export interface StationDowntimeSummary {
  stationId: number
  stationCode: string
  totalMinutes: number
  unassignedCount: number
  assignedCount: number
  totalEntries: number
}

export interface OpStation {
  id: number
  code: string
  name: string
  sequence: number
  productionLineId: number
  type: number
}

// ============= Hourly Report Types =============

export interface HourlyReportData {
  date: string
  partName: string
  lineName: string
  stationCode: string
  stationName: string
  machineId: string | null
  cycleTimeSeconds: number
  shifts: HourlyReportShift[]
  summary: HourlyReportSummary
  lossCodes: Array<{ code: string; name: string }>
}

export interface HourlyReportShift {
  shiftId: number
  shiftName: string
  operatorName: string | null
  slots: HourlyReportSlot[]
  totals: HourlyReportSlotTotals
  lossDetails: HourlyReportLossDetail[]
  cumulativeCount: number
}

export interface HourlyReportSlot {
  slotIndex: number
  timeRange: string
  productionTarget: number
  actualProduction: number
  castingRejection: number
  machiningRejection: number
  netOkQty: number
  lossCodes: string | null
  lossTimeMinutes: number
}

export interface HourlyReportSlotTotals {
  productionTarget: number
  actualProduction: number
  castingRejection: number
  machiningRejection: number
  netOkQty: number
  lossTimeMinutes: number
}

export interface HourlyReportLossDetail {
  lossMinutes: number
  partCount: number
  reason: string
  lossCode: string
}

export interface HourlyReportSummary {
  cycleTimeSeconds: number
  totalProductionTarget: number
  totalProduction: number
  totalRejection: number
  totalOk: number
}

// ============= Line Dashboard Types =============

export interface LineDashboardData {
  date: string
  partName: string
  lineName: string
  misLineId: number
  currentShiftId: number
  currentShiftName: string
  cycleTimeSeconds: number
  lineKpis: LineDashboardKpis
  stations: LineDashboardStation[]
}

export interface LineDashboardKpis {
  oee: number
  availability: number
  performance: number
  quality: number
  totalProduced: number
  totalTarget: number
  totalRejects: number
  totalDowntimeMinutes: number
}

export interface LineDashboardStation {
  stationId: number
  stationCode: string
  stationName: string
  stationType: number
  cncMachineId: string | null
  status: 'Running' | 'Down' | 'Idle'
  oee: number
  availability: number
  performance: number
  quality: number
  totalProduced: number
  productionTarget: number
  downtimeMinutes: number
  totalRejects: number
  operatorName: string | null
  programNo: string | null
}

// ============= Plant Overview Types =============

export interface PlantOverviewData {
  date: string
  currentShiftId: number
  currentShiftName: string
  plantKpis: PlantOverviewKpis
  lines: PlantOverviewLine[]
}

export interface PlantOverviewKpis {
  oee: number
  availability: number
  performance: number
  quality: number
  totalProduced: number
  totalTarget: number
  totalRejects: number
  totalDowntimeMinutes: number
  activeLineCount: number
}

export interface PlantOverviewLine {
  misLineId: number
  lineName: string
  partName: string
  cycleTimeSeconds: number
  oee: number
  availability: number
  performance: number
  quality: number
  totalProduced: number
  totalTarget: number
  totalRejects: number
  totalDowntimeMinutes: number
  status: 'Running' | 'Down' | 'Idle'
  stationCount: number
  runningStationCount: number
}

// ============= OEE Analytics Types =============

export interface OeeAnalyticsData {
  period: string
  dateFrom: string
  dateTo: string
  level: 'plant' | 'line' | 'station'
  misLineId: number | null
  lineName: string | null
  stationId: number | null
  stationName: string | null
  oee: number
  availability: number
  performance: number
  quality: number
  totalProduced: number
  totalTarget: number
  totalRejects: number
  totalDowntimeMinutes: number
  plannedMinutes: number
  topDowntimeReasons: OeeDowntimeReason[]
  topRejectReasons: OeeRejectReason[]
  stationBreakdown: OeeStationBreakdown[]
  shiftBreakdown: OeeShiftBreakdown[]
  trendData: OeeTrendPoint[]
}

export interface OeeDowntimeReason {
  lossCodeId: number
  lossCode: string
  lossName: string
  category: string
  totalMinutes: number
  percentage: number
  affectsAvailability: boolean
  affectsPerformance: boolean
  affectsQuality: boolean
}

export interface OeeRejectReason {
  rejectionCategoryId: number
  categoryCode: string
  categoryName: string
  type: string
  totalCount: number
  percentage: number
}

export interface OeeStationBreakdown {
  stationId: number
  stationCode: string
  stationName: string
  oee: number
  availability: number
  performance: number
  quality: number
  produced: number
  target: number
  rejects: number
  downtimeMinutes: number
}

export interface OeeShiftBreakdown {
  shiftId: number
  shiftName: string
  oee: number
  availability: number
  performance: number
  quality: number
}

export interface OeeTrendPoint {
  label: string
  oee: number
  availability: number
  performance: number
  quality: number
}

// ============= Tool Life Management Types =============

export interface ToolMaster {
  id: number
  toolCode: string
  name: string
  plannedLifePerCorner: number
  totalCorners: number
  displayOrder: number
  isActive: boolean
  stationId: number
  stationCode: string
  stationName: string
}

export interface EarlyReplacementReason {
  id: number
  code: string
  name: string
  description?: string
  displayOrder: number
  isActive: boolean
}

export interface ToolChangeRecord {
  id: number
  serialNumber: number
  date: string
  shiftId: number
  shiftName: string
  edgeNumber: number
  planLife: number
  actualLife?: number
  productionOperatorId?: number
  productionOperatorName?: string
  dimensionDiameter?: string
  dimensionDepth?: string
  dimensionRoughness?: string
  qaOperatorId?: number
  qaOperatorName?: string
  isEarlyReplacement: boolean
  earlyReplacementReasonId?: number
  earlyReplacementReasonName?: string
  remarks?: string
  toolMasterId: number
  toolCode: string
  toolName: string
  stationCode: string
  misProductionLineId: number
  misLineName: string
  isSimulated: boolean
  createdAt: string
}

export interface ToolChangeRecordRequest {
  date: string
  shiftId: number
  toolMasterId: number
  misLineId: number
  edgeNumber: number
  planLife: number
  actualLife?: number
  productionOperatorId?: number
  dimensionDiameter?: string
  dimensionDepth?: string
  dimensionRoughness?: string
  qaOperatorId?: number
  isEarlyReplacement: boolean
  earlyReplacementReasonId?: number
  remarks?: string
}

export interface ToolChangeRecordUpdateRequest {
  actualLife?: number
  productionOperatorId?: number
  dimensionDiameter?: string
  dimensionDepth?: string
  dimensionRoughness?: string
  qaOperatorId?: number
  isEarlyReplacement?: boolean
  earlyReplacementReasonId?: number
  remarks?: string
}

// ============= Tool Life Dashboard Types =============

export type ToolLifeStatus = 'OK' | 'Warning' | 'Critical' | 'Exceeded'

export interface ToolLifeDashboardData {
  misLineId: number
  partName: string
  lineName: string
  lastUpdatedAt: string | null
  summary: ToolLifeDashboardSummary
  stations: ToolLifeDashboardStation[]
}

export interface ToolLifeDashboardSummary {
  totalTools: number
  okCount: number
  warningCount: number
  criticalCount: number
  exceededCount: number
}

export interface ToolLifeDashboardStation {
  id: number
  stationCode: string
  stationName: string
  cncMachineId: string | null
  toolCount: number
  warningCount: number
  criticalCount: number
  exceededCount: number
  tools: ToolLifeDashboardTool[]
}

export interface ToolLifeDashboardTool {
  toolMasterId: number
  toolCode: string
  toolName: string
  plannedLifePerCorner: number
  totalCorners: number
  toolLifeRecordId: number | null
  toolNumber: number
  maxLife: number
  currentLife: number
  lifePercentage: number
  warningThreshold: number
  criticalThreshold: number
  status: ToolLifeStatus
  lastResetAt: string | null
  lastUpdatedAt: string | null
  notes: string | null
}

// ============= Part Scanning Types =============

export interface PartScanResponse {
  id: number
  serialNumber: string
  status: string
  stationCode: string
  shiftName: string
  scannedAt: string
  completedAt?: string
  message: string
}

export interface FinalInspectionResponse {
  id: number
  serialNumber: string
  result: string
  loadedAt: string
  inspectedAt: string
  totalProductionTimeSeconds: number
  stationCode: string
  shiftName: string
  message: string
}

export interface PartLoadingScanRequest {
  serialNumber: string
  misLineId: number
  operatorId?: number
}

export interface FinalInspectionScanRequest {
  serialNumber: string
  misLineId: number
  operatorId?: number
  pass: boolean
  dimension1?: number
  dimension2?: number
  dimension3?: number
  dimension4?: number
  failureReason?: string
  notes?: string
}

export interface PartScanLookup {
  id: number
  serialNumber: string
  status: string
  shiftName?: string
  misLineName?: string
  loadedAt: string
  loadingStation: string
  elapsedSeconds: number
  elapsedFormatted: string
  isInspected: boolean
  completedAt?: string
  rejectReason?: string
}

export interface RecentPartScan {
  id: number
  serialNumber: string
  status: string
  shiftName: string
  scannedAt: string
  completedAt?: string
}

export interface RecentInspection {
  id: number
  serialNumber: string
  result: string
  loadedAt: string
  inspectedAt: string
  totalProductionTimeSeconds: number
  shiftName: string
  dimension1?: number
  dimension2?: number
  dimension3?: number
  dimension4?: number
  failureReason?: string
}

// ============= Traceability Types =============

export interface TraceabilityData {
  partInstance: TraceabilityPartInstance
  stationRecords: TraceabilityStationRecord[]
  qualityResults: TraceabilityQualityResult[]
}

export interface TraceabilityPartInstance {
  id: number
  serialNumber: string
  status: number
  statusName: string
  partName: string
  lineName: string | null
  shiftName: string | null
  createdAt: string
  completedAt: string | null
  totalTimeSeconds: number | null
  rejectReason: string | null
  currentStationCode: string | null
}

export interface TraceabilityStationRecord {
  id: number
  stationCode: string
  stationName: string
  stationType: number
  stationSequence: number
  entryTime: string
  exitTime: string | null
  cycleTimeSeconds: number | null
  qualityStatus: number
  qualityStatusName: string
  cncProgramNumber: string | null
  cncPartCount: number | null
  cncAlarmCount: number | null
  operatorName: string | null
  notes: string | null
}

export interface TraceabilityQualityResult {
  id: number
  stationCode: string
  stationName: string
  status: number
  statusName: string
  inspectionTime: string
  dimension1: number | null
  dimension1Name: string | null
  dimension2: number | null
  dimension2Name: string | null
  dimension3: number | null
  dimension3Name: string | null
  dimension4: number | null
  dimension4Name: string | null
  leakTestPressure: number | null
  leakTestPass: boolean | null
  failureReason: string | null
  rejectCode: string | null
  operatorName: string | null
  notes: string | null
}
