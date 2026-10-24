import { z } from 'zod';

export const createReportSchema = z.object({
  equipment: z.string().min(1, 'Equipment name is required').max(100),
  equipmentNumber: z.string().min(1, 'Equipment number is required').max(50),
  reportedFault: z.string().min(1, 'Reported fault description is required').max(1000),
  urgency: z.number().int().min(1).max(10),
  workGroup: z.string().min(1, 'Workgroup is required'),
  details: z.string().optional(),
  operatorName: z.string().optional(),
  safetyConcern: z.boolean().optional().default(false),
  source: z.enum(['field-report', 'bdr-app']).optional().default('bdr-app'),
  audioNote: z.string().optional(),
  defectImages: z.array(z.string()).optional().default([]),
}).refine(value => value.defectImages.length === 0 && !value.audioNote, {
  message: 'Attachments are disabled until authenticated R2 storage is configured',
});

export const updateReportSchema = z.object({
  equipment: z.string().min(1).max(100).optional(),
  equipmentNumber: z.string().min(1).max(50).optional(),
  reportedFault: z.string().min(1).max(1000).optional(),
  urgency: z.number().int().min(1).max(10).optional(),
  workGroup: z.string().optional(),
  details: z.string().optional(),
  operatorName: z.string().optional(),
  safetyConcern: z.boolean().optional(),
  status: z.enum(['Active', 'Assigned', 'Resolved', 'Completed']).optional(),
  whatWasWrong: z.string().optional(),
  resolutionStatus: z.string().optional(),
});

export const createLockoutSchema = z.object({
  equipment: z.string().min(1, 'Equipment name is required').max(100),
  equipmentNumber: z.string().min(1, 'Equipment tag is required').max(50),
  workGroup: z.string().min(1, 'Work group is required'),
  workType: z.string().optional().default('Breakdown / Unplanned Repair'),
  relatedReportId: z.string().optional(),
  bookedDurationMinutes: z.number().nullable().optional().default(null),
  lockoutComments: z.string().max(2000).optional().default(''),
});

export const confirmEquipmentSchema = z.object({
  employeeNumber: z.string().optional(),
  qrVerified: z.boolean().optional().default(false),
  scannedQrCode: z.string().optional(),
  confirmationMethod: z.enum(['IN_PERSON', 'RADIO', 'PHONE', 'VERBAL', 'QR', 'SCADA_OBSERVATION', 'OTHER']).optional(),
});

export const confirmScadaStopSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  comments: z.string().max(1000).optional().default(''),
  confirmationMethod: z.enum(['IN_PERSON', 'RADIO', 'PHONE', 'VERBAL', 'QR', 'SCADA_OBSERVATION', 'OTHER']).optional().default('VERBAL'),
});

export const confirmPhysicalLockoutSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  comments: z.string().max(1000).optional().default(''),
  isolationPoints: z.array(z.string()).optional(),
  confirmationMethod: z.enum(['IN_PERSON', 'RADIO', 'PHONE', 'VERBAL', 'QR', 'SCADA_OBSERVATION', 'OTHER']).optional().default('IN_PERSON'),
});

export const positiveTestSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  result: z.enum(['PASS', 'FAIL']),
  comments: z.string().max(1000).optional().default(''),
  confirmationMethod: z.enum(['IN_PERSON', 'RADIO', 'PHONE', 'VERBAL', 'QR', 'SCADA_OBSERVATION', 'OTHER']).optional().default('IN_PERSON'),
});

export const requestReleaseSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  comments: z.string().max(1000).optional().default(''),
  confirmationMethod: z.enum(['IN_PERSON', 'RADIO', 'PHONE', 'VERBAL', 'QR', 'SCADA_OBSERVATION', 'OTHER']).optional().default('IN_PERSON'),
});

export const confirmReleaseSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  comments: z.string().max(1000).optional().default(''),
  confirmationMethod: z.enum(['IN_PERSON', 'RADIO', 'PHONE', 'VERBAL', 'QR', 'SCADA_OBSERVATION', 'OTHER']).optional().default('IN_PERSON'),
});

export const rejectLockoutSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  reason: z.string().min(1, 'Rejection reason is required').max(1000),
  confirmationMethod: z.enum(['IN_PERSON', 'RADIO', 'PHONE', 'VERBAL', 'QR', 'SCADA_OBSERVATION', 'OTHER']).optional().default('IN_PERSON'),
});

export const syncPayloadSchema = z.object({
  operations: z.array(
    z.object({
      operationId: z.string().min(1, 'operationId is required'),
      type: z.enum(['CREATE_REPORT', 'REQUEST_LOCKOUT']),
      payload: z.any(),
    })
  ),
});
