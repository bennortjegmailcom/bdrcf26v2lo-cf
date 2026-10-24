import { Request, Response, NextFunction } from 'express';
import { ReportsService } from '../services/reports.service';
import { createReportSchema, updateReportSchema } from '../validation/schemas';
import { ValidationError } from '../errors/api.error';

export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  getReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const report = await this.reportsService.getReport(id);
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  };

  listReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hours = parseInt(req.query.hours as string, 10) || 72; // default 72 hours
      const limitCount = parseInt(req.query.limit as string, 10) || 1000;
      const reports = await this.reportsService.listReports(hours, limitCount);
      res.status(200).json({ data: reports });
    } catch (err) {
      next(err);
    }
  };

  createReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid report creation data', parsed.error.format()));
      }

      const report = await this.reportsService.createReport(req.user!, parsed.data);
      res.status(201).json({ data: report });
    } catch (err) {
      next(err);
    }
  };

  updateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = updateReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid report update data', parsed.error.format()));
      }

      const report = await this.reportsService.updateReport(id, req.user!, parsed.data as any);
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  };

  deleteReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.reportsService.deleteReport(id);
      res.status(200).json({ data: { success: true, id } });
    } catch (err) {
      next(err);
    }
  };

  purgeReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cutoffDate = (req.body?.cutoffDate || req.query?.cutoffDate) as string;
      if (!cutoffDate) {
        res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'cutoffDate is required' } });
        return;
      }
      const count = await this.reportsService.purgeReports(cutoffDate);
      res.status(200).json({ data: { purgedCount: count } });
    } catch (err) {
      next(err);
    }
  };
}

