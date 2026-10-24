import { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/sync.service';
import { syncPayloadSchema } from '../validation/schemas';
import { ValidationError } from '../errors/api.error';

export class SyncController {
  constructor(private syncService: SyncService) {}

  processSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = syncPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new ValidationError('Invalid sync payload', parsed.error.format()));
      }

      const results = await this.syncService.processSync(req.user!, parsed.data.operations);
      res.status(200).json({ data: results });
    } catch (err) {
      next(err);
    }
  };
}
