import type {
  Shift, Operator, Part, ProductionLine, Station, LossCode, SkipReason,
  MisPart, MisProductionLine, DowntimeCategory, RejectionCategory,
  EarlyReplacementReason, ToolMaster, DefaultSlotConfig
} from '../types'
import { ShiftType, StationType, RejectionType } from '../types'

// ============= SHIFTS =============
// DB IDs: 1=A, 2=B, 3=C (matches ShiftType enum values)
export const SHIFTS: Shift[] = [
  { id: 1, type: ShiftType.A, name: 'Shift A', startTime: '07:00:00', endTime: '15:30:00', plannedMinutes: 510, breakMinutes: 30, isActive: true },
  { id: 2, type: ShiftType.B, name: 'Shift B', startTime: '15:30:00', endTime: '00:00:00', plannedMinutes: 510, breakMinutes: 30, isActive: true },
  { id: 3, type: ShiftType.C, name: 'Shift C', startTime: '00:00:00', endTime: '07:30:00', plannedMinutes: 450, breakMinutes: 30, isActive: true },
]

// ============= OPERATORS =============
export const OPERATORS: Operator[] = [
  { id: 1, badgeNumber: 'OP001', name: 'Rajesh Kumar', department: 'Production', isActive: true },
  { id: 2, badgeNumber: 'OP002', name: 'Amit Singh', department: 'Production', isActive: true },
  { id: 3, badgeNumber: 'OP003', name: 'Suresh Patel', department: 'Production', isActive: true },
  { id: 4, badgeNumber: 'OP004', name: 'Vikram Sharma', department: 'Production', isActive: true },
  { id: 5, badgeNumber: 'OP005', name: 'Anil Verma', department: 'Production', isActive: true },
  { id: 6, badgeNumber: 'OP006', name: 'Sanjay Yadav', department: 'Production', isActive: true },
  { id: 7, badgeNumber: 'OP007', name: 'Ramesh Gupta', department: 'Production', isActive: true },
  { id: 8, badgeNumber: 'OP008', name: 'Deepak Mishra', department: 'Production', isActive: true },
  { id: 9, badgeNumber: 'OP009', name: 'Ajay Tiwari', department: 'Production', isActive: true },
  { id: 10, badgeNumber: 'OP010', name: 'Ravi Pandey', department: 'Production', isActive: true },
  { id: 11, badgeNumber: 'OP011', name: 'Sandeep Chauhan', department: 'Production', isActive: true },
  { id: 12, badgeNumber: 'OP012', name: 'Mukesh Rawat', department: 'Production', isActive: true },
  { id: 13, badgeNumber: 'OP013', name: 'Priya Gupta', department: 'Quality', isActive: true },
  { id: 14, badgeNumber: 'OP014', name: 'Neha Joshi', department: 'Quality', isActive: true },
  { id: 15, badgeNumber: 'OP015', name: 'Pooja Sharma', department: 'Quality', isActive: true },
  { id: 16, badgeNumber: 'OP016', name: 'Anjali Verma', department: 'Quality', isActive: true },
  { id: 17, badgeNumber: 'OP017', name: 'Sunita Devi', department: 'Quality', isActive: true },
  { id: 18, badgeNumber: 'OP018', name: 'Manoj Kumar', department: 'Supervision', isActive: true },
  { id: 19, badgeNumber: 'OP019', name: 'Dinesh Agarwal', department: 'Supervision', isActive: true },
  { id: 20, badgeNumber: 'OP020', name: 'Rakesh Saxena', department: 'Supervision', isActive: true },
]

// ============= PARTS =============
export const PARTS: Part[] = [
  { id: 1, partNumber: 'CCRH-001', name: 'Crank Case SC MC R', description: 'Crank Case for SC MC R model - manufactured on CCRH line', idealCycleTimeSeconds: 45, isActive: true },
]

// ============= PRODUCTION LINES =============
export const PRODUCTION_LINES: ProductionLine[] = [
  { id: 1, code: 'CCRH', name: 'CCRH Production Line', description: 'Crank Case SC MC R production line with 18 stations', isActive: true },
]

// ============= STATIONS =============
// IDs 1-18 for the 18 stations on CCRH line
export const STATIONS: Station[] = [
  { id: 1, code: 'LASER', name: 'Laser Marking', sequence: 1, type: StationType.LaserMarking, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 10 },
  { id: 2, code: 'OP-10', name: 'OP-10 Machining', sequence: 2, type: StationType.CNC, cncMachineId: 'CNC-OP10', linkedQualityStationId: 3, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 45 },
  { id: 3, code: 'BK-10', name: 'BK-10 Quality Gate', sequence: 3, type: StationType.QualityGate, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 15 },
  { id: 4, code: 'OP-20', name: 'OP-20 Machining', sequence: 4, type: StationType.CNC, cncMachineId: 'CNC-OP20', linkedQualityStationId: 5, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 45 },
  { id: 5, code: 'BK-20', name: 'BK-20 Quality Gate', sequence: 5, type: StationType.QualityGate, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 15 },
  { id: 6, code: 'OP-30', name: 'OP-30 Facing & Reaming', sequence: 6, type: StationType.CNC, cncMachineId: 'CNC-OP30', linkedQualityStationId: 7, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 45 },
  { id: 7, code: 'BK-30', name: 'BK-30 Quality Gate', sequence: 7, type: StationType.QualityGate, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 15 },
  { id: 8, code: 'OP-40', name: 'OP-40 Facing & Reaming', sequence: 8, type: StationType.CNC, cncMachineId: 'CNC-OP40', linkedQualityStationId: 9, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 45 },
  { id: 9, code: 'BK-40', name: 'BK-40 Quality Gate', sequence: 9, type: StationType.QualityGate, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 15 },
  { id: 10, code: 'OP-50', name: 'OP-50 Machining', sequence: 10, type: StationType.CNC, cncMachineId: 'CNC-OP50', linkedQualityStationId: 11, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 45 },
  { id: 11, code: 'BK-50', name: 'BK-50 Quality Gate', sequence: 11, type: StationType.QualityGate, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 15 },
  { id: 12, code: 'OP-60', name: 'OP-60 Plug Pressing', sequence: 12, type: StationType.Manual, linkedQualityStationId: 13, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 30 },
  { id: 13, code: 'BK-60', name: 'BK-60 Quality Gate', sequence: 13, type: StationType.QualityGate, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 15 },
  { id: 14, code: 'OP-70', name: 'OP-70 Facing & Reaming', sequence: 14, type: StationType.CNC, cncMachineId: 'CNC-OP70', linkedQualityStationId: 15, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 45 },
  { id: 15, code: 'BK-70', name: 'BK-70 Quality Gate', sequence: 15, type: StationType.QualityGate, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 15 },
  { id: 16, code: 'OP-80', name: 'OP-80 Washing', sequence: 16, type: StationType.Washing, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 60 },
  { id: 17, code: 'OP-90', name: 'OP-90 Leak Test (ATEQ F600)', sequence: 17, type: StationType.LeakTest, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 30 },
  { id: 18, code: 'BK-80', name: 'BK-80 Final Inspection', sequence: 18, type: StationType.FinalInspection, productionLineId: 1, isActive: true, idealCycleTimeSeconds: 30 },
]

// ============= LOSS CODES =============
export const LOSS_CODES: LossCode[] = [
  { id: 1, code: '01', name: 'Tool Change', category: 'Setup', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 1, isActive: true },
  { id: 2, code: '02', name: 'Setup & Adjust', category: 'Setup', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 2, isActive: true },
  { id: 3, code: '03', name: 'Fixture Breakdown', category: 'Breakdown', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 3, isActive: true },
  { id: 4, code: '04', name: 'Machine Breakdown', category: 'Breakdown', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 4, isActive: true },
  { id: 5, code: '05', name: 'Setup Changeover', category: 'Setup', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 5, isActive: true },
  { id: 6, code: '06', name: 'No Material', category: 'Logistics', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 6, isActive: true },
  { id: 7, code: '07', name: 'No Operator', category: 'Logistics', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 7, isActive: true },
  { id: 8, code: '08', name: 'No Power', category: 'Utilities', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 8, isActive: true },
  { id: 9, code: '09', name: 'No Tool/Jig', category: 'Logistics', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 9, isActive: true },
  { id: 10, code: '10', name: 'No Coolant', category: 'Utilities', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 10, isActive: true },
  { id: 11, code: '11', name: 'No Air', category: 'Utilities', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 11, isActive: true },
  { id: 12, code: '12', name: 'Input Material NG', category: 'Quality', affectsAvailability: false, affectsPerformance: false, affectsQuality: true, displayOrder: 12, isActive: true },
  { id: 13, code: '13', name: 'Waiting for Inspection', category: 'Logistics', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 13, isActive: true },
  { id: 14, code: '14', name: 'Methods & Tryout', category: 'Engineering', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 14, isActive: true },
  { id: 15, code: '15', name: 'Defect & Rework Loss', category: 'Quality', affectsAvailability: false, affectsPerformance: false, affectsQuality: true, displayOrder: 15, isActive: true },
  { id: 16, code: '16', name: 'Minor Stoppage', category: 'Performance', affectsAvailability: false, affectsPerformance: true, affectsQuality: false, displayOrder: 16, isActive: true },
  { id: 17, code: '17', name: 'Speed Loss', category: 'Performance', affectsAvailability: false, affectsPerformance: true, affectsQuality: false, displayOrder: 17, isActive: true },
  { id: 18, code: '18', name: 'Distribution/Logistics', category: 'Logistics', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 18, isActive: true },
  { id: 19, code: '19', name: 'Start-up Loss', category: 'Performance', affectsAvailability: false, affectsPerformance: true, affectsQuality: false, displayOrder: 19, isActive: true },
  { id: 20, code: '20', name: 'Planned Stop', category: 'Planned', affectsAvailability: true, affectsPerformance: false, affectsQuality: false, displayOrder: 20, isActive: true },
]

// ============= SKIP REASONS =============
export const SKIP_REASONS: SkipReason[] = [
  { id: 1, code: 'SR01', name: 'Part in Transit', description: 'Part still moving between stations', isActive: true },
  { id: 2, code: 'SR02', name: 'Gauge Malfunction', description: 'Baker device not working', isActive: true },
  { id: 3, code: 'SR03', name: 'Operator Unavailable', description: 'No operator at quality station', isActive: true },
  { id: 4, code: 'SR04', name: 'Part Rejected Earlier', description: 'Part failed previous station', isActive: true },
  { id: 5, code: 'SR05', name: 'Rework in Progress', description: 'Part sent back for rework', isActive: true },
  { id: 6, code: 'SR06', name: 'Sample/Trial Part', description: 'Not production part', isActive: true },
  { id: 7, code: 'SR07', name: 'Shift Handover', description: 'Missed during shift change', isActive: true },
  { id: 8, code: 'SR08', name: 'Process Deviation', description: 'Authorized skip per NCR', isActive: true },
  { id: 9, code: 'SR09', name: 'Other', description: 'See notes for details', isActive: true },
]

// ============= DOWNTIME CATEGORIES =============
export const DOWNTIME_CATEGORIES: DowntimeCategory[] = [
  { id: 1, code: 'DT01', name: 'Development', isPlanned: true, displayOrder: 1, isActive: true },
  { id: 2, code: 'DT02', name: 'No Plan', isPlanned: true, displayOrder: 2, isActive: true },
  { id: 3, code: 'DT03', name: 'Preventive Maintenance', isPlanned: true, displayOrder: 3, isActive: true },
  { id: 4, code: 'DT04', name: 'No Material', isPlanned: false, displayOrder: 4, isActive: true },
  { id: 5, code: 'DT05', name: 'M/C Breakdown', isPlanned: false, displayOrder: 5, isActive: true },
  { id: 6, code: 'DT06', name: 'Fixture B/D', isPlanned: false, displayOrder: 6, isActive: true },
  { id: 7, code: 'DT07', name: 'No Power', isPlanned: false, displayOrder: 7, isActive: true },
  { id: 8, code: 'DT08', name: 'No Operator', isPlanned: false, displayOrder: 8, isActive: true },
  { id: 9, code: 'DT09', name: 'M/C Setting', isPlanned: false, displayOrder: 9, isActive: true },
  { id: 10, code: 'DT10', name: 'Tool Change', isPlanned: false, displayOrder: 10, isActive: true },
  { id: 11, code: 'DT11', name: 'No Coolant', isPlanned: false, displayOrder: 11, isActive: true },
  { id: 12, code: 'DT12', name: 'No Air', isPlanned: false, displayOrder: 12, isActive: true },
  { id: 13, code: 'DT13', name: 'Waiting for Inspection', isPlanned: false, displayOrder: 13, isActive: true },
  { id: 14, code: 'DT14', name: 'Input Material Defect', isPlanned: false, displayOrder: 14, isActive: true },
  { id: 15, code: 'DT15', name: 'Meeting/Training', isPlanned: false, displayOrder: 15, isActive: true },
  { id: 16, code: 'DT16', name: 'Slow Material', isPlanned: false, displayOrder: 16, isActive: true },
  { id: 17, code: 'DT17', name: 'IPP Sample', isPlanned: false, displayOrder: 17, isActive: true },
  { id: 18, code: 'DT18', name: 'No Tool/Jig', isPlanned: false, displayOrder: 18, isActive: true },
  { id: 19, code: 'DT19', name: 'U/S O/S Correction', isPlanned: false, displayOrder: 19, isActive: true },
]

// ============= REJECTION CATEGORIES =============
// Machining (17) IDs 1-17, Casting (20) IDs 18-37
export const REJECTION_CATEGORIES: RejectionCategory[] = [
  { id: 1, code: 'MR01', name: 'Dia O/S', type: RejectionType.Machining, displayOrder: 1, isActive: true },
  { id: 2, code: 'MR02', name: 'Dia U/S', type: RejectionType.Machining, displayOrder: 2, isActive: true },
  { id: 3, code: 'MR03', name: 'Tool Broken', type: RejectionType.Machining, displayOrder: 3, isActive: true },
  { id: 4, code: 'MR04', name: 'Tap Broken', type: RejectionType.Machining, displayOrder: 4, isActive: true },
  { id: 5, code: 'MR05', name: 'Power Cut', type: RejectionType.Machining, displayOrder: 5, isActive: true },
  { id: 6, code: 'MR06', name: 'Setting Scrap', type: RejectionType.Machining, displayOrder: 6, isActive: true },
  { id: 7, code: 'MR07', name: 'Wrong Loading', type: RejectionType.Machining, displayOrder: 7, isActive: true },
  { id: 8, code: 'MR08', name: 'Tap NG', type: RejectionType.Machining, displayOrder: 8, isActive: true },
  { id: 9, code: 'MR09', name: 'Chattering Mark', type: RejectionType.Machining, displayOrder: 9, isActive: true },
  { id: 10, code: 'MR10', name: 'Tool Mark', type: RejectionType.Machining, displayOrder: 10, isActive: true },
  { id: 11, code: 'MR11', name: 'Flatness NG', type: RejectionType.Machining, displayOrder: 11, isActive: true },
  { id: 12, code: 'MR12', name: 'Handling Dent', type: RejectionType.Machining, displayOrder: 12, isActive: true },
  { id: 13, code: 'MR13', name: 'Pin Leak', type: RejectionType.Machining, displayOrder: 13, isActive: true },
  { id: 14, code: 'MR14', name: 'Back Face Dim NG', type: RejectionType.Machining, displayOrder: 14, isActive: true },
  { id: 15, code: 'MR15', name: 'Dim NG', type: RejectionType.Machining, displayOrder: 15, isActive: true },
  { id: 16, code: 'MR16', name: 'CD NG', type: RejectionType.Machining, displayOrder: 16, isActive: true },
  { id: 17, code: 'MR17', name: 'Other', type: RejectionType.Machining, displayOrder: 17, isActive: true },
  { id: 18, code: 'CR01', name: 'Blow Hole', type: RejectionType.Casting, displayOrder: 1, isActive: true },
  { id: 19, code: 'CR02', name: 'Non Filling', type: RejectionType.Casting, displayOrder: 2, isActive: true },
  { id: 20, code: 'CR03', name: 'Hard Particle', type: RejectionType.Casting, displayOrder: 3, isActive: true },
  { id: 21, code: 'CR04', name: 'Unclean', type: RejectionType.Casting, displayOrder: 4, isActive: true },
  { id: 22, code: 'CR05', name: 'Bush O/S', type: RejectionType.Casting, displayOrder: 5, isActive: true },
  { id: 23, code: 'CR06', name: 'Anchor Pin NG', type: RejectionType.Casting, displayOrder: 6, isActive: true },
  { id: 24, code: 'CR07', name: 'Chip Off', type: RejectionType.Casting, displayOrder: 7, isActive: true },
  { id: 25, code: 'CR08', name: 'Crack', type: RejectionType.Casting, displayOrder: 8, isActive: true },
  { id: 26, code: 'CR09', name: 'Body Leak', type: RejectionType.Casting, displayOrder: 9, isActive: true },
  { id: 27, code: 'CR10', name: 'Dent/Damage', type: RejectionType.Casting, displayOrder: 10, isActive: true },
  { id: 28, code: 'CR11', name: 'Bend', type: RejectionType.Casting, displayOrder: 11, isActive: true },
  { id: 29, code: 'CR12', name: 'Broken', type: RejectionType.Casting, displayOrder: 12, isActive: true },
  { id: 30, code: 'CR13', name: 'Over Filling', type: RejectionType.Casting, displayOrder: 13, isActive: true },
  { id: 31, code: 'CR14', name: 'Extra Material Bush', type: RejectionType.Casting, displayOrder: 14, isActive: true },
  { id: 32, code: 'CR15', name: 'Ejector Pin Down', type: RejectionType.Casting, displayOrder: 15, isActive: true },
  { id: 33, code: 'CR16', name: 'PDC Sample', type: RejectionType.Casting, displayOrder: 16, isActive: true },
  { id: 34, code: 'CR17', name: 'Thickness Uneven', type: RejectionType.Casting, displayOrder: 17, isActive: true },
  { id: 35, code: 'CR18', name: 'Buffing Rej', type: RejectionType.Casting, displayOrder: 18, isActive: true },
  { id: 36, code: 'CR19', name: 'Paint Rej', type: RejectionType.Casting, displayOrder: 19, isActive: true },
  { id: 37, code: 'CR20', name: 'Oxidised', type: RejectionType.Casting, displayOrder: 20, isActive: true },
]

// ============= EARLY REPLACEMENT REASONS =============
export const EARLY_REPLACEMENT_REASONS: EarlyReplacementReason[] = [
  { id: 1, code: 'ER01', name: 'Tool Breakage', displayOrder: 1, isActive: true },
  { id: 2, code: 'ER02', name: 'Chipping', displayOrder: 2, isActive: true },
  { id: 3, code: 'ER03', name: 'Excessive Wear', displayOrder: 3, isActive: true },
  { id: 4, code: 'ER04', name: 'Dimension Out', displayOrder: 4, isActive: true },
  { id: 5, code: 'ER05', name: 'Surface Finish NG', displayOrder: 5, isActive: true },
  { id: 6, code: 'ER06', name: 'Built-up Edge', displayOrder: 6, isActive: true },
  { id: 7, code: 'ER07', name: 'Coolant Issue', displayOrder: 7, isActive: true },
  { id: 8, code: 'ER08', name: 'Other', displayOrder: 8, isActive: true },
]

// ============= MIS PARTS & LINES =============
// 39 parts, 55 production lines
const MIS_PARTS_DATA: [string, number][] = [
  ['Crank Case LH, Jupiter', 3],
  ['Crank Case RH, Jupiter', 3],
  ['Gear Case Jupiter 125', 4],
  ['Cylinder Block RIDER', 2],
  ['Cylinder Block REDEON', 3],
  ['Cylinder Block-MOPED', 1],
  ['Cylinder Block-U279', 2],
  ['Cylinder Block-N282', 2],
  ['Crank Case N49 LH 3W', 1],
  ['Crank Case N49 RH 3W', 1],
  ['Crank Case U123 CCL 3W', 1],
  ['Battery Housing U546 R', 2],
  ['Battery Housing U546 L', 1],
  ['Top Cover U546', 1],
  ['Bottom Cover U546', 1],
  ['AV Unit Cover U546', 1],
  ['Ather Top Cover', 1],
  ['Cover Clutch Comp', 3],
  ['Rider Footrest R', 1],
  ['Cover Cylinder Head', 2],
  ['Rider Footrest L', 1],
  ['Rider CCLH', 1],
  ['Rider CCRH', 1],
  ['Cyl Blk Ntorq Line-2', 1],
  ['Apache 2V CCLH', 1],
  ['Apache 2V CCRH', 1],
  ['HLX 125 - CCLH', 1],
  ['HLX 125 - CCRH', 1],
  ['Apache 4V CCLH', 1],
  ['Apache 4V CCRH', 1],
  ['Star Sports - CCLH', 1],
  ['Star Sports - CCRH', 1],
  ['CCLH N 604', 1],
  ['CCRH N 604', 1],
  ['Cover Magneto HLX Silver', 1],
  ['Cover Differential N604', 1],
  ['Cylinder Block N604', 1],
  ['Brake Drum', 2],
  ['Clutch Hub', 1],
]

function buildMisData() {
  const parts: MisPart[] = []
  const lines: MisProductionLine[] = []
  let partId = 1
  let lineId = 1

  for (const [name, lineCount] of MIS_PARTS_DATA) {
    parts.push({ id: partId, name, lineCount, isActive: true, createdAt: new Date().toISOString() })
    for (let i = 1; i <= lineCount; i++) {
      lines.push({
        id: lineId,
        name: `${name} - Line ${i}`,
        lineNumber: i,
        misPartId: partId,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
      lineId++
    }
    partId++
  }
  return { parts, lines }
}

const misData = buildMisData()
export const MIS_PARTS: MisPart[] = misData.parts
export const MIS_PRODUCTION_LINES: MisProductionLine[] = misData.lines

// ============= TOOL MASTERS =============
// 15 tools across CNC stations (OP-10, OP-20, OP-30, OP-40, OP-50, OP-70)
export const TOOL_MASTERS: ToolMaster[] = [
  { id: 1, toolCode: 'CNTOINS1540353', name: 'SPL Burr Free Insert Cutter (Sandvik)', plannedLifePerCorner: 50000, totalCorners: 4, displayOrder: 1, isActive: true, stationId: 2, stationCode: 'OP-10', stationName: 'OP-10 Machining' },
  { id: 2, toolCode: 'CNTOINS1540387', name: 'Face Mill Insert CNMG120408', plannedLifePerCorner: 40000, totalCorners: 4, displayOrder: 2, isActive: true, stationId: 2, stationCode: 'OP-10', stationName: 'OP-10 Machining' },
  { id: 3, toolCode: 'CNTODRL1540201', name: 'Carbide Drill 8.5mm', plannedLifePerCorner: 30000, totalCorners: 2, displayOrder: 3, isActive: true, stationId: 2, stationCode: 'OP-10', stationName: 'OP-10 Machining' },
  { id: 4, toolCode: 'CNTOBOR2040102', name: 'Boring Bar CCMT09T304', plannedLifePerCorner: 35000, totalCorners: 4, displayOrder: 1, isActive: true, stationId: 4, stationCode: 'OP-20', stationName: 'OP-20 Machining' },
  { id: 5, toolCode: 'CNTORMS2040205', name: 'Reamer 12H7 Carbide', plannedLifePerCorner: 45000, totalCorners: 1, displayOrder: 2, isActive: true, stationId: 4, stationCode: 'OP-20', stationName: 'OP-20 Machining' },
  { id: 6, toolCode: 'CNTOINS2040310', name: 'End Mill 10mm 4-Flute', plannedLifePerCorner: 25000, totalCorners: 4, displayOrder: 3, isActive: true, stationId: 4, stationCode: 'OP-20', stationName: 'OP-20 Machining' },
  { id: 7, toolCode: 'CNTOINS3040150', name: 'Face Mill Insert WNMG080408', plannedLifePerCorner: 40000, totalCorners: 4, displayOrder: 1, isActive: true, stationId: 6, stationCode: 'OP-30', stationName: 'OP-30 Facing & Reaming' },
  { id: 8, toolCode: 'CNTORMS3040220', name: 'Chamfer Tool 45deg', plannedLifePerCorner: 60000, totalCorners: 2, displayOrder: 2, isActive: true, stationId: 6, stationCode: 'OP-30', stationName: 'OP-30 Facing & Reaming' },
  { id: 9, toolCode: 'CNTOINS4040180', name: 'Threading Insert 16ER1.5ISO', plannedLifePerCorner: 20000, totalCorners: 3, displayOrder: 1, isActive: true, stationId: 8, stationCode: 'OP-40', stationName: 'OP-40 Facing & Reaming' },
  { id: 10, toolCode: 'CNTODRL4040290', name: 'Spot Drill 10mm', plannedLifePerCorner: 80000, totalCorners: 2, displayOrder: 2, isActive: true, stationId: 8, stationCode: 'OP-40', stationName: 'OP-40 Facing & Reaming' },
  { id: 11, toolCode: 'CNTOINS5040125', name: 'Boring Insert TCMT110204', plannedLifePerCorner: 35000, totalCorners: 3, displayOrder: 1, isActive: true, stationId: 10, stationCode: 'OP-50', stationName: 'OP-50 Machining' },
  { id: 12, toolCode: 'CNTODRL5040280', name: 'Drill 6.8mm HSS-Co', plannedLifePerCorner: 15000, totalCorners: 2, displayOrder: 2, isActive: true, stationId: 10, stationCode: 'OP-50', stationName: 'OP-50 Machining' },
  { id: 13, toolCode: 'CNTOINS7040160', name: 'Face Mill Insert SEMT13T3', plannedLifePerCorner: 45000, totalCorners: 4, displayOrder: 1, isActive: true, stationId: 14, stationCode: 'OP-70', stationName: 'OP-70 Facing & Reaming' },
  { id: 14, toolCode: 'CNTORMS7040240', name: 'Reamer 8H7 Carbide', plannedLifePerCorner: 40000, totalCorners: 1, displayOrder: 2, isActive: true, stationId: 14, stationCode: 'OP-70', stationName: 'OP-70 Facing & Reaming' },
  { id: 15, toolCode: 'CNTOTAP7040350', name: 'Tap M10x1.5 Spiral Flute', plannedLifePerCorner: 20000, totalCorners: 1, displayOrder: 3, isActive: true, stationId: 14, stationCode: 'OP-70', stationName: 'OP-70 Facing & Reaming' },
]

// ============= DEFAULT SLOT CONFIGS =============
export const DEFAULT_SLOT_CONFIGS: DefaultSlotConfig[] = [
  {
    shiftId: 1, shiftName: 'Shift A',
    slots: [
      { slotIndex: 0, timeRange: '7:00-8:00', defaultAvailableTime: 3300 },
      { slotIndex: 1, timeRange: '8:00-9:00', defaultAvailableTime: 3600 },
      { slotIndex: 2, timeRange: '9:00-10:00', defaultAvailableTime: 3000 },
      { slotIndex: 3, timeRange: '10:00-11:00', defaultAvailableTime: 3600 },
      { slotIndex: 4, timeRange: '11:00-12:00', defaultAvailableTime: 3600 },
      { slotIndex: 5, timeRange: '12:00-1:00', defaultAvailableTime: 1800 },
      { slotIndex: 6, timeRange: '1:00-2:00', defaultAvailableTime: 3600 },
      { slotIndex: 7, timeRange: '2:00-3:00', defaultAvailableTime: 3600 },
      { slotIndex: 8, timeRange: '3:00-3:30', defaultAvailableTime: 1800 },
    ],
  },
  {
    shiftId: 2, shiftName: 'Shift B',
    slots: [
      { slotIndex: 0, timeRange: '3:30-4:30', defaultAvailableTime: 3600 },
      { slotIndex: 1, timeRange: '4:30-5:30', defaultAvailableTime: 3000 },
      { slotIndex: 2, timeRange: '5:30-6:30', defaultAvailableTime: 3600 },
      { slotIndex: 3, timeRange: '6:30-7:30', defaultAvailableTime: 2700 },
      { slotIndex: 4, timeRange: '7:30-8:30', defaultAvailableTime: 3600 },
      { slotIndex: 5, timeRange: '8:30-9:30', defaultAvailableTime: 1800 },
      { slotIndex: 6, timeRange: '9:30-10:30', defaultAvailableTime: 3600 },
      { slotIndex: 7, timeRange: '10:30-11:30', defaultAvailableTime: 3000 },
      { slotIndex: 8, timeRange: '11:30-12:00', defaultAvailableTime: 1800 },
    ],
  },
  {
    shiftId: 3, shiftName: 'Shift C',
    slots: [
      { slotIndex: 0, timeRange: '12:00-1:00', defaultAvailableTime: 3600 },
      { slotIndex: 1, timeRange: '1:00-2:00', defaultAvailableTime: 3600 },
      { slotIndex: 2, timeRange: '2:00-3:00', defaultAvailableTime: 3600 },
      { slotIndex: 3, timeRange: '3:00-4:00', defaultAvailableTime: 3000 },
      { slotIndex: 4, timeRange: '4:00-5:00', defaultAvailableTime: 3600 },
      { slotIndex: 5, timeRange: '5:00-6:00', defaultAvailableTime: 3600 },
      { slotIndex: 6, timeRange: '6:00-7:00', defaultAvailableTime: 3000 },
    ],
  },
]
