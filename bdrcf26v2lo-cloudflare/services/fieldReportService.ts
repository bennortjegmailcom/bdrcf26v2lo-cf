import { BdrApiClient } from '../src/repositories/api/BdrApiClient';
import { FieldReportInput, Status, Role, BreakdownReport } from '../types';
import { sanitizeInput } from '../utils';

let isSubmitting = false;
let lastSubmissionTime = 0;

export interface SubmitFieldReportResult {
  id: string;
  reportNumber: string;
  timestamp: string;
}

export const validateAttachment = (dataUrl: string, type: 'image' | 'audio'): boolean => {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  
  if (type === 'image') {
    if (!dataUrl.startsWith('data:image/')) return false;
    if (dataUrl.length > 4 * 1024 * 1024) return false;
    return true;
  }

  if (type === 'audio') {
    if (!dataUrl.startsWith('data:audio/')) return false;
    if (dataUrl.length > 7 * 1024 * 1024) return false;
    return true;
  }

  return false;
};

export const submitFieldReport = async (input: FieldReportInput): Promise<SubmitFieldReportResult> => {
  const now = Date.now();
  if (isSubmitting) {
    throw new Error('A report submission is already in progress. Please wait.');
  }

  if (now - lastSubmissionTime < 3000) {
    throw new Error('Please wait a moment before submitting another report.');
  }

  const reporterName = sanitizeInput(input.reporterName || '', 100);
  if (!reporterName || reporterName.length < 2) {
    throw new Error('Please enter a valid reporter name (at least 2 characters).');
  }

  const equipment = sanitizeInput(input.equipment || '', 100);
  if (!equipment) {
    throw new Error('Please select or specify the equipment.');
  }

  const equipmentNumber = sanitizeInput(input.equipmentNumber || '', 50);
  if (!equipmentNumber) {
    throw new Error('Please enter the machine or FG number.');
  }

  const reportedFault = sanitizeInput(input.reportedFault || '', 300);
  if (!reportedFault || reportedFault.length < 3) {
    throw new Error('Please describe the reported fault in detail.');
  }

  const employeeNumber = input.employeeNumber ? sanitizeInput(input.employeeNumber, 30) : undefined;
  const area = sanitizeInput(input.area || 'Plant', 50);
  const details = input.details ? sanitizeInput(input.details, 1000) : '';
  const urgency = Math.min(10, Math.max(1, Math.round(Number(input.urgency) || 5)));
  const safetyConcern = Boolean(input.safetyConcern);

  const validImages: string[] = [];
  if (Array.isArray(input.defectImages)) {
    for (const img of input.defectImages.slice(0, 5)) {
      if (validateAttachment(img, 'image')) {
        validImages.push(img);
      }
    }
  }

  let validAudio: string | undefined = undefined;
  if (input.audioNote && validateAttachment(input.audioNote, 'audio')) {
    validAudio = input.audioNote;
  }

  isSubmitting = true;

  try {
    const reportingTime = new Date().toISOString();
    const reporterId = employeeNumber ? `emp-${employeeNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}` : `field-${Date.now()}`;
    const generatedId = Math.random().toString(36).substring(2, 12);

    let finalDetails = details;
    if (safetyConcern) {
      finalDetails = `⚠️ [SAFETY CONCERN FLAGGED BY OPERATOR]\n${details}`.trim();
    }

    const reportDocument: BreakdownReport = {
      id: generatedId,
      equipment,
      equipmentNumber,
      reportedFault,
      details: finalDetails || undefined,
      urgency,
      workGroup: area,
      reportingTime,
      status: Status.DRAFT,
      source: 'field-report',
      isFieldReport: true,
      isDraft: true,
      safetyConcern,
      defectImages: validImages.length > 0 ? validImages : undefined,
      audioNote: validAudio,
      reporter: {
        id: reporterId,
        name: reporterName,
        role: Role.REPORTER,
        employeeNumber: employeeNumber || undefined,
        workGroup: area,
      },
      changeLog: [
        {
          field: 'created',
          oldValue: '',
          newValue: `Draft reported via Field QR Portal by ${reporterName}${employeeNumber ? ` (Emp #${employeeNumber})` : ''} - Awaiting Reporter Verification`,
          timestamp: reportingTime,
          changedBy: reporterName
        }
      ]
    };

    const saved = await new BdrApiClient().request<BreakdownReport>('/reports', {
      method: 'POST',
      body: JSON.stringify({ ...reportDocument, operatorName: reporterName }),
    });
    // Cache only the authoritative server response.
    reportDocument.id = saved.id;
    // Save to localStorage reports cache
    try {
      const cachedReports = JSON.parse(localStorage.getItem('cache_reports') || '[]');
      cachedReports.unshift(saved);
      localStorage.setItem('cache_reports', JSON.stringify(cachedReports));
    } catch (e) {}

    const reportNumber = `BDR-${saved.id.slice(-6).toUpperCase()}`;
    lastSubmissionTime = Date.now();

    return {
      id: saved.id,
      reportNumber,
      timestamp: reportingTime,
    };
  } finally {
    isSubmitting = false;
  }
};
