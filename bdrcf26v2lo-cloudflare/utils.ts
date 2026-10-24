
export const sanitizeInput = (input: string, maxLength: number = 500): string => {
    if (!input) return '';
    // Remove potential script tags and trim whitespace
    let sanitized = input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '');
    sanitized = sanitized.replace(/[<>]/g, ''); // Basic character escaping for tags
    return sanitized.trim().slice(0, maxLength);
};

export type TimePeriod =
  | '1 hour'
  | '4 hours'
  | '8 hours'
  | '12 hours'
  | '1 day'
  | '2 days'
  | '3 days'
  | '7 days'
  | '30 days'
  | 'All';

export const TIME_PERIODS: TimePeriod[] = [
  '1 hour',
  '4 hours',
  '8 hours',
  '12 hours',
  '1 day',
  '2 days',
  '3 days',
  '7 days',
  '30 days',
  'All',
];

export const TIME_PERIOD_HOURS: Partial<Record<TimePeriod, number>> = {
  '1 hour': 1,
  '4 hours': 4,
  '8 hours': 8,
  '12 hours': 12,
};

export const TIME_PERIOD_DAYS: Partial<Record<TimePeriod, number>> = {
  '1 day': 1,
  '2 days': 2,
  '3 days': 3,
  '7 days': 7,
  '30 days': 30,
};

export const getProductionDayStart = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setHours(6, 0, 0, 0);
  // If the current time is before 06:00, the production day started yesterday at 06:00
  if (date < start) {
    start.setDate(start.getDate() - 1);
  }
  return start;
};

export const getProductionDayEnd = (productionStart: Date): Date => {
    const end = new Date(productionStart);
    end.setDate(end.getDate() + 1);
    return end;
}

export const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
}

export const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const calculateDuration = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return '-';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    
    if (diffMs < 0) return '-';
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs >= 24) {
        const days = Math.floor(diffHrs / 24);
        const remainingHrs = diffHrs % 24;
        return `${days}d ${remainingHrs}h`;
    }
    
    if (diffHrs > 0) {
        return `${diffHrs}h ${diffMins}m`;
    }
    return `${diffMins}m`;
};

import { User, Role, BreakdownReport, Status, Responsibility } from './types';

export const isMaintenanceForeman = (user: User): boolean => {
  return [
    Role.FOREMAN, 
    Role.MECH_SUPERVISOR, 
    Role.ELEC_SUPERVISOR, 
    Role.TECH_SUPERVISOR,
    Role.INST_SUPERVISOR
  ].includes(user.role) || !!user.discipline;
};

export const getUserDiscipline = (user: User): string | null => {
  // Check explicit supervisor roles first
  if (user.role === Role.MECH_SUPERVISOR) return 'Mechanical';
  if (user.role === Role.ELEC_SUPERVISOR) return 'Electrical';
  if (user.role === Role.TECH_SUPERVISOR) return 'Technicians';
  if (user.role === Role.INST_SUPERVISOR) return 'Instrumentation';
  if (user.discipline) return user.discipline;

  // Check if workGroup matches a maintenance discipline
  if (user.workGroup && ['Mechanical', 'Electrical', 'Technicians', 'Instrumentation'].some(
    d => d.toLowerCase() === user.workGroup?.toLowerCase()
  )) {
    return user.workGroup;
  }

  // Check if name contains discipline keywords
  const lowerName = (user.name || '').toLowerCase();
  if (lowerName.includes('mech')) return 'Mechanical';
  if (lowerName.includes('elec')) return 'Electrical';
  if (lowerName.includes('instrument')) return 'Instrumentation';
  if (lowerName.includes('tech')) return 'Technicians';

  // Default for Maintenance Shift Foreman if not explicitly specified
  if (user.role === Role.FOREMAN) return 'Mechanical';

  return null;
};

export const isHandoverReport = (report: BreakdownReport): boolean => {
  return report.status !== Status.COMPLETED && (
    report.resolutionStatus === 'Hand Over' ||
    report.resolutionStatus === 'Given to dayshift' ||
    report.isNextShift === true ||
    !!report.handoverSection
  );
};

export const matchesDisciplineHandover = (
  report: BreakdownReport,
  discipline: string,
  user?: User
): boolean => {
  if (!discipline) return true;
  const dNorm = discipline.trim().toLowerCase();

  // 1. Match on handoverSection (exact or fuzzy)
  if (report.handoverSection) {
    const sec = report.handoverSection.trim().toLowerCase();
    if (sec === dNorm) return true;
    if (dNorm === 'electrical' && sec.includes('elec')) return true;
    if (dNorm === 'mechanical' && sec.includes('mech')) return true;
    if ((dNorm === 'technicians' || dNorm === 'instrumentation') && (sec.includes('tech') || sec.includes('inst'))) return true;
  }

  // 2. Direct recipient match
  if (user && (
    report.handoverRecipientId === user.id ||
    (report.handoverRecipientName && report.handoverRecipientName.trim().toLowerCase() === user.name.trim().toLowerCase())
  )) {
    return true;
  }

  // 3. Handover trade / responsibility match
  const isHandover = report.resolutionStatus === 'Hand Over' ||
                     report.resolutionStatus === 'Given to dayshift' ||
                     report.isNextShift === true ||
                     !!report.handoverSection;

  if (isHandover && report.assignments && report.assignments.length > 0) {
    if (dNorm === 'mechanical') {
      return report.assignments.some(a => 
        [Responsibility.FITTER, Responsibility.MILLWRIGHT, Responsibility.PLATER].includes(a.responsibility)
      );
    }
    if (dNorm === 'electrical') {
      return report.assignments.some(a => 
        [Responsibility.ELECTRICIAN].includes(a.responsibility)
      );
    }
    if (dNorm === 'instrumentation' || dNorm === 'technicians') {
      return report.assignments.some(a => 
        [Responsibility.INSTRUMENTATION, Responsibility.TECHNICIAN].includes(a.responsibility)
      );
    }
  }

  return false;
};

// Check if a report belongs to a discipline either by assignment trade or by handover
export const matchesDiscipline = (
  report: BreakdownReport,
  discipline: string,
  user?: User
): boolean => {
  if (!discipline) return true;
  if (matchesDisciplineHandover(report, discipline, user)) return true;

  const dNorm = discipline.trim().toLowerCase();
  if (report.assignments && report.assignments.length > 0) {
    if (dNorm === 'mechanical') {
      return report.assignments.some(a => 
        [Responsibility.FITTER, Responsibility.MILLWRIGHT, Responsibility.PLATER].includes(a.responsibility)
      );
    }
    if (dNorm === 'electrical') {
      return report.assignments.some(a => 
        [Responsibility.ELECTRICIAN].includes(a.responsibility)
      );
    }
    if (dNorm === 'instrumentation' || dNorm === 'technicians') {
      return report.assignments.some(a => 
        [Responsibility.INSTRUMENTATION, Responsibility.TECHNICIAN].includes(a.responsibility)
      );
    }
  }
  return false;
};

export const compressImage = (fileOrUrl: File | string, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = (err) => {
      reject(err);
    };

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('FileReader failed'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrUrl);
    }
  });
};

import { AppPermission, JobTicket } from './types';

/**
 * Enterprise Strict Role-Based Access Control (RBAC) Policy Evaluator.
 * Evaluates whether a user is authorized to perform a security-sensitive action.
 */
export const canPerformAction = (
  user: User | null | undefined,
  permission: AppPermission,
  context?: { report?: BreakdownReport; ticket?: JobTicket }
): boolean => {
  if (!user) return false;
  if (user.role === Role.GUEST) return false; // Guest is strictly read-only
  if (user.role === Role.ADMIN) return true;  // Admin has root bypass

  const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const hasAnyRole = (roles: Role[]) => userRoles.some(r => roles.includes(r));

  switch (permission) {
    case 'admin:access':
      return hasAnyRole([Role.ADMIN]);

    case 'report:create':
      return hasAnyRole([
        Role.REPORTER,
        Role.FOREMAN,
        Role.OPS_FOREMAN,
        Role.SCHEDULER,
        Role.COORDINATOR,
        Role.MECH_SUPERVISOR,
        Role.ELEC_SUPERVISOR,
        Role.TECH_SUPERVISOR,
        Role.INST_SUPERVISOR
      ]);

    case 'report:assign':
      return hasAnyRole([
        Role.SCHEDULER,
        Role.FOREMAN,
        Role.MECH_SUPERVISOR,
        Role.ELEC_SUPERVISOR,
        Role.TECH_SUPERVISOR,
        Role.INST_SUPERVISOR
      ]);

    case 'report:resolve':
      return hasAnyRole([
        Role.SCHEDULER,
        Role.COORDINATOR,
        Role.FOREMAN,
        Role.OPS_FOREMAN,
        Role.MECH_SUPERVISOR,
        Role.ELEC_SUPERVISOR,
        Role.TECH_SUPERVISOR,
        Role.INST_SUPERVISOR,
        Role.REPORTER
      ]);

    case 'report:complete':
      // Foremen can complete their own reports; reporters in workGroup can complete; schedulers can complete
      if (hasAnyRole([Role.SCHEDULER, Role.COORDINATOR, Role.OPS_FOREMAN])) return true;
      if (context?.report && user.workGroup && context.report.workGroup === user.workGroup) return true;
      return false;

    case 'report:handover_ack':
      if (hasAnyRole([
        Role.SCHEDULER,
        Role.COORDINATOR,
        Role.FOREMAN,
        Role.OPS_FOREMAN,
        Role.MECH_SUPERVISOR,
        Role.ELEC_SUPERVISOR,
        Role.TECH_SUPERVISOR,
        Role.INST_SUPERVISOR
      ])) return true;
      if (context?.report) {
        if (context.report.handoverRecipientId === user.id) return true;
        if (context.report.handoverRecipientName && context.report.handoverRecipientName.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
      }
      return false;

    case 'report:approve_draft':
      if (hasAnyRole([Role.OPS_FOREMAN, Role.SCHEDULER])) return true;
      if (context?.report && user.role === Role.REPORTER && user.workGroup === context.report.workGroup) return true;
      return false;

    case 'lockout:request':
      return hasAnyRole([
        Role.REPORTER,
        Role.FOREMAN,
        Role.OPS_FOREMAN,
        Role.SCHEDULER,
        Role.COORDINATOR,
        Role.MECH_SUPERVISOR,
        Role.ELEC_SUPERVISOR,
        Role.TECH_SUPERVISOR,
        Role.INST_SUPERVISOR
      ]);

    case 'lockout:scada_confirm':
      // SCADA stop can only be acknowledged by Control Room roles
      return hasAnyRole([
        Role.COORDINATOR,
        Role.SCHEDULER,
        Role.OPS_FOREMAN,
        Role.FOREMAN
      ]);

    case 'lockout:physical_lock':
      return hasAnyRole([
        Role.REPORTER,
        Role.FOREMAN,
        Role.OPS_FOREMAN,
        Role.MECH_SUPERVISOR,
        Role.ELEC_SUPERVISOR,
        Role.TECH_SUPERVISOR,
        Role.INST_SUPERVISOR
      ]);

    case 'lockout:positive_test':
      return true; // Two-way test involving both field and control room

    case 'lockout:release':
      return hasAnyRole([
        Role.REPORTER,
        Role.FOREMAN,
        Role.OPS_FOREMAN,
        Role.SCHEDULER,
        Role.MECH_SUPERVISOR,
        Role.ELEC_SUPERVISOR,
        Role.TECH_SUPERVISOR,
        Role.INST_SUPERVISOR
      ]);

    default:
      return false;
  }
};


