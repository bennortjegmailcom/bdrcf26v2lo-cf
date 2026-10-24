
import { User, Role, BreakdownReport, Status, Responsibility, Artisan, Shift } from './types';

export const SECTION_COLORS: string[] = [
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#14b8a6',
];

export const getSectionColor = (name: string, color?: string): string => {
  if (color) return color;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return SECTION_COLORS[hash % SECTION_COLORS.length];
};

export const INITIAL_WORK_GROUPS: { id: string, name: string }[] = [
    { id: 'GG', name: 'GG' },
    { id: 'IPC', name: 'IPC' },
    { id: 'Matimba', name: 'Matimba' },
    { id: 'Process', name: 'Process' },
    { id: 'Services', name: 'Services' },
    { id: 'Infrastructure', name: 'Infrastructure' },
    { id: 'Plant 1', name: 'Plant 1' },
    { id: 'Plant 2', name: 'Plant 2' },
    { id: 'SMC', name: 'SMC' },
    { id: 'Logistics', name: 'Logistics' },
    { id: 'Mining', name: 'Mining' },
    { id: 'Operations', name: 'Operations' },
    { id: 'Workshop', name: 'Workshop' },
];

export const USERS: User[] = [
  { id: '1', name: 'GG 1', role: Role.REPORTER, roles: [Role.REPORTER], workGroup: 'GG', email: 'reporter@bdr.com', password: 'Password1' },
  { id: '2', name: 'IPC 6', role: Role.REPORTER, roles: [Role.REPORTER], workGroup: 'IPC' },
  { id: '3', name: 'Bob (Maintenance Office)', role: Role.COORDINATOR, roles: [Role.COORDINATOR] },
  { id: '4', name: 'Admin User', role: Role.ADMIN, roles: [Role.ADMIN, Role.ELEC_SUPERVISOR, Role.MECH_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.SCHEDULER, Role.COORDINATOR, Role.FOREMAN, Role.OPS_FOREMAN, Role.REPORTER], email: 'admin@bdr.com', password: 'Password1' },
  { id: 'ben-nortje', name: 'Ben Nortje', email: 'Ben.nortje@exxaro.com', password: 'Password1', role: Role.ADMIN, roles: [Role.ADMIN, Role.ELEC_SUPERVISOR, Role.MECH_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.SCHEDULER, Role.COORDINATOR, Role.FOREMAN, Role.OPS_FOREMAN, Role.REPORTER], workGroup: 'GG' },
  { id: '5', name: 'Sam (Scheduler)', role: Role.SCHEDULER, roles: [Role.SCHEDULER], email: 'scheduler@bdr.com', password: 'Password1' },
  { id: '6', name: 'Jim (Maint. Foreman)', role: Role.FOREMAN, roles: [Role.FOREMAN, Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.SCHEDULER, Role.REPORTER], shift: Shift.A, discipline: 'Mechanical', workGroup: 'GG', email: 'foreman@bdr.com', password: 'Password1' },
  { id: '7', name: 'Lee (Ops. Foreman)', role: Role.OPS_FOREMAN, roles: [Role.OPS_FOREMAN, Role.SCHEDULER, Role.REPORTER], shift: Shift.A, workGroup: 'GG' },
  { id: '8', name: 'Dave (Elec. Supervisor)', role: Role.ELEC_SUPERVISOR, roles: [Role.ELEC_SUPERVISOR, Role.MECH_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.FOREMAN, Role.SCHEDULER, Role.REPORTER], shift: Shift.A, discipline: 'Electrical', workGroup: 'GG' },
  { id: '9', name: 'Mark (Mech. Supervisor)', role: Role.MECH_SUPERVISOR, roles: [Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR, Role.FOREMAN, Role.SCHEDULER, Role.REPORTER], shift: Shift.A, discipline: 'Mechanical', workGroup: 'GG' },
  { id: '10', name: 'Ian (Inst. Supervisor)', role: Role.INST_SUPERVISOR, roles: [Role.INST_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.MECH_SUPERVISOR, Role.TECH_SUPERVISOR, Role.FOREMAN, Role.SCHEDULER, Role.REPORTER], shift: Shift.A, discipline: 'Instrumentation', workGroup: 'GG' },
  // Responsibility-specific test users (Password1)
  { id: 'test-elec', name: 'Electrician Test', role: Role.FOREMAN, roles: [Role.FOREMAN, Role.REPORTER], discipline: 'Electrical', email: 'electrician@bdr.com', password: 'Password1', workGroup: 'GG' },
  { id: 'test-fit', name: 'Fitter Test', role: Role.FOREMAN, roles: [Role.FOREMAN, Role.REPORTER], discipline: 'Mechanical', email: 'fitter@bdr.com', password: 'Password1', workGroup: 'GG' },
  { id: 'test-mill', name: 'Millwright Test', role: Role.FOREMAN, roles: [Role.FOREMAN, Role.REPORTER], discipline: 'Mechanical', email: 'millwright@bdr.com', password: 'Password1', workGroup: 'GG' },
  { id: 'test-inst', name: 'Instrumentation Test', role: Role.INST_SUPERVISOR, roles: [Role.INST_SUPERVISOR, Role.REPORTER], discipline: 'Instrumentation', email: 'instrumentation@bdr.com', password: 'Password1', workGroup: 'GG' },
  { id: 'test-plat', name: 'Plater Test', role: Role.FOREMAN, roles: [Role.FOREMAN, Role.REPORTER], discipline: 'Mechanical', email: 'plater@bdr.com', password: 'Password1', workGroup: 'GG' },
  { id: 'test-aide', name: 'Artisan Aide Test', role: Role.REPORTER, roles: [Role.REPORTER], email: 'aide@bdr.com', password: 'Password1', workGroup: 'GG' },
  { id: 'test-tech', name: 'Technician Test', role: Role.TECH_SUPERVISOR, roles: [Role.TECH_SUPERVISOR, Role.REPORTER], discipline: 'Technicians', email: 'technician@bdr.com', password: 'Password1', workGroup: 'GG' },
];


export const INITIAL_ARTISANS: Artisan[] = [
    // Shift B (Original)
    { id: 'artisan-1', name: 'Mike', responsibility: Responsibility.MILLWRIGHT, shift: Shift.B },
    { id: 'artisan-2', name: 'David', responsibility: Responsibility.ELECTRICIAN, shift: Shift.B },
    { id: 'artisan-3', name: 'Sarah', responsibility: Responsibility.FITTER, shift: Shift.B },
    { id: 'artisan-4', name: 'Emily', responsibility: Responsibility.INSTRUMENTATION, shift: Shift.B },
    
    // Shift A
    { id: 'artisan-5', name: 'Chris', responsibility: Responsibility.MILLWRIGHT, shift: Shift.A },
    { id: 'artisan-6', name: 'Frank', responsibility: Responsibility.ELECTRICIAN, shift: Shift.A },
    { id: 'artisan-7', name: 'Alex', responsibility: Responsibility.PLATER, shift: Shift.A },
    
    // Shift C
    { id: 'artisan-8', name: 'Grace', responsibility: Responsibility.FITTER, shift: Shift.C },
    { id: 'artisan-9', name: 'Henry', responsibility: Responsibility.INSTRUMENTATION, shift: Shift.C },
    { id: 'artisan-10', name: 'Liam', responsibility: Responsibility.ELECTRICIAN, shift: Shift.C },

    // Shift D
    { id: 'artisan-11', name: 'Ivy', responsibility: Responsibility.PLATER, shift: Shift.D },
    { id: 'artisan-12', name: 'Jack', responsibility: Responsibility.ARTISAN_AIDE, shift: Shift.D },
    { id: 'artisan-13', name: 'Noah', responsibility: Responsibility.MILLWRIGHT, shift: Shift.D },
];


export const INITIAL_REPORTS: BreakdownReport[] = [
    {
        id: '1',
        equipment: 'Conveyor Belt A',
        equipmentNumber: 'CV-101',
        reportedFault: 'Belt is slipping under load.',
        reportingTime: new Date(Date.now() - 3600000).toISOString(),
        urgency: 8,
        reporter: USERS[0],
        workGroup: 'GG',
        status: Status.ACTIVE,
    },
    {
        id: '2',
        equipment: 'Pump Station 3',
        equipmentNumber: 'PS-03',
        reportedFault: 'Motor tripping on overload.',
        reportingTime: new Date(Date.now() - 7200000).toISOString(),
        urgency: 10,
        reporter: USERS[1],
        workGroup: 'IPC',
        status: Status.ASSIGNED,
        notificationNumber: 'N-5501',
        assignments: [{ artisanId: 'artisan-2', artisanName: 'David', responsibility: Responsibility.ELECTRICIAN }],
        assignedTime: new Date(Date.now() - 7000000).toISOString(),
    },
    {
        id: '3',
        equipment: 'Crusher Unit 1',
        equipmentNumber: 'CR-01',
        reportedFault: 'High vibration detected.',
        reportingTime: new Date(Date.now() - 86400000).toISOString(),
        urgency: 7,
        reporter: USERS[0],
        workGroup: 'GG',
        status: Status.RESOLVED,
        notificationNumber: 'N-5499',
        assignments: [{ artisanId: 'artisan-1', artisanName: 'Mike', responsibility: Responsibility.MILLWRIGHT }],
        assignedTime: new Date(Date.now() - 86000000).toISOString(),
        whatWasWrong: 'Bearing failure on main shaft.',
        resolutionStatus: 'Repaired and back in production',
        resolutionTime: new Date(Date.now() - 43200000).toISOString(),
    },
    {
        id: '4',
        equipment: 'Screen Deck B',
        equipmentNumber: 'SD-02B',
        reportedFault: 'Screen mesh torn.',
        reportingTime: new Date(Date.now() - 172800000).toISOString(),
        urgency: 5,
        reporter: USERS[1],
        workGroup: 'IPC',
        status: Status.COMPLETED,
        notificationNumber: 'N-5490',
        assignments: [{ artisanId: 'artisan-3', artisanName: 'Sarah', responsibility: Responsibility.FITTER }],
        assignedTime: new Date(Date.now() - 170000000).toISOString(),
        whatWasWrong: 'Fatigue crack caused mesh failure.',
        resolutionStatus: 'Repaired and back in production',
        resolutionTime: new Date(Date.now() - 129600000).toISOString(),
        completedTime: new Date(Date.now() - 120000000).toISOString(),
    },
    {
        id: '5',
        equipment: 'Substation Feeder 2',
        equipmentNumber: 'SUB-02',
        reportedFault: 'Overcurrent protection trip on feeder 2 transformer.',
        reportingTime: new Date(Date.now() - 14400000).toISOString(),
        urgency: 9,
        reporter: USERS[0],
        workGroup: 'GG',
        status: Status.RESOLVED,
        notificationNumber: 'N-5510',
        assignments: [{ artisanId: 'artisan-6', artisanName: 'Frank', responsibility: Responsibility.ELECTRICIAN }],
        assignedTime: new Date(Date.now() - 12000000).toISOString(),
        whatWasWrong: 'Auxiliary contactor burned out; insulation resistance test required.',
        resolutionStatus: 'Hand Over',
        handoverSection: 'Electrical',
        handoverRecipientName: 'Dave (Elec. Supervisor)',
        resolutionTime: new Date(Date.now() - 7200000).toISOString(),
    },
    {
        id: '6',
        equipment: 'Ball Mill 1 Lubrication System',
        equipmentNumber: 'BM-01',
        reportedFault: 'Lube pump pressure switch failing intermittently.',
        reportingTime: new Date(Date.now() - 28800000).toISOString(),
        urgency: 8,
        reporter: USERS[0],
        workGroup: 'GG',
        status: Status.RESOLVED,
        notificationNumber: 'N-5508',
        assignments: [{ artisanId: 'artisan-5', artisanName: 'Chris', responsibility: Responsibility.MILLWRIGHT }],
        assignedTime: new Date(Date.now() - 26000000).toISOString(),
        whatWasWrong: 'Shaft seal degraded, oil weeping into electrical junction box.',
        resolutionStatus: 'Hand Over',
        handoverSection: 'Mechanical',
        handoverRecipientName: 'Jim (Maint. Foreman)',
        resolutionTime: new Date(Date.now() - 18000000).toISOString(),
    },
    {
        id: '7',
        equipment: 'Thickener Underflow Pump Motor',
        equipmentNumber: 'TK-04',
        reportedFault: 'Variable speed drive fault code F002 (over-voltage).',
        reportingTime: new Date(Date.now() - 18000000).toISOString(),
        urgency: 7,
        reporter: USERS[1],
        workGroup: 'IPC',
        status: Status.RESOLVED,
        notificationNumber: 'N-5515',
        assignments: [{ artisanId: 'artisan-2', artisanName: 'David', responsibility: Responsibility.ELECTRICIAN }],
        assignedTime: new Date(Date.now() - 16000000).toISOString(),
        whatWasWrong: 'Dynamic braking unit resistor blown; replacement needed.',
        resolutionStatus: 'Hand Over',
        handoverSection: 'Electrical',
        handoverRecipientName: 'Dave (Elec. Supervisor)',
        resolutionTime: new Date(Date.now() - 10800000).toISOString(),
    },
    {
        id: '8',
        equipment: 'Secondary Screen Vibrator',
        equipmentNumber: 'SD-02',
        reportedFault: 'Eccentric shaft weights loose causing severe rattle.',
        reportingTime: new Date(Date.now() - 21600000).toISOString(),
        urgency: 6,
        reporter: USERS[1],
        workGroup: 'IPC',
        status: Status.RESOLVED,
        notificationNumber: 'N-5518',
        assignments: [{ artisanId: 'artisan-7', artisanName: 'Alex', responsibility: Responsibility.PLATER }],
        assignedTime: new Date(Date.now() - 19000000).toISOString(),
        whatWasWrong: 'Keyway sheared on drive shaft; requires boilermaker weld build-up.',
        resolutionStatus: 'Hand Over',
        handoverSection: 'Mechanical',
        handoverRecipientName: 'Jim (Maint. Foreman)',
        resolutionTime: new Date(Date.now() - 14000000).toISOString(),
    }
];