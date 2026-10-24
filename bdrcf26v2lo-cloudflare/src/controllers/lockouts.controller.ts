import { Request, Response, NextFunction } from 'express';
import { LockoutService } from '../services/lockout.service';
import {
  createLockoutSchema,
  confirmEquipmentSchema,
  confirmScadaStopSchema,
  confirmPhysicalLockoutSchema,
  positiveTestSchema,
  requestReleaseSchema,
  confirmReleaseSchema,
  rejectLockoutSchema,
} from '../validation/schemas';
import { ValidationError } from '../errors/api.error';

export class LockoutsController {
  constructor(private lockoutService: LockoutService) {}

  getLockout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const lockout = await this.lockoutService.getLockout(id);
      res.status(200).json({ data: lockout });
    } catch (err) {
      next(err);
    }
  };

  listLockouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lockouts = await this.lockoutService.listLockouts();
      res.status(200).json({ data: lockouts });
    } catch (err) {
      next(err);
    }
  };

  createLockout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createLockoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid lockout request payload', parsed.error.format()));
      }

      const lockout = await this.lockoutService.requestLockout(req.user!, parsed.data);
      res.status(201).json({ data: lockout });
    } catch (err) {
      next(err);
    }
  };

  confirmEquipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = confirmEquipmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid equipment confirmation parameters', parsed.error.format()));
      }

      const result = await this.lockoutService.confirmEquipment(id, req.user!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  confirmScadaStop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = confirmScadaStopSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid SCADA stop confirmation parameters', parsed.error.format()));
      }

      const result = await this.lockoutService.confirmScadaStop(id, req.user!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  confirmPhysicalLockout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = confirmPhysicalLockoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid physical isolation confirmation parameters', parsed.error.format()));
      }

      const result = await this.lockoutService.confirmPhysicalLockout(id, req.user!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  recordPositiveTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = positiveTestSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid positive test parameters', parsed.error.format()));
      }

      const result = await this.lockoutService.recordPositiveTest(id, req.user!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  requestRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = requestReleaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid release request parameters', parsed.error.format()));
      }

      const result = await this.lockoutService.requestRelease(id, req.user!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  confirmRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = confirmReleaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid release confirmation parameters', parsed.error.format()));
      }

      const result = await this.lockoutService.confirmRelease(id, req.user!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  rejectLockout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const parsed = rejectLockoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid rejection payload', parsed.error.format()));
      }

      const result = await this.lockoutService.rejectLockout(id, req.user!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
