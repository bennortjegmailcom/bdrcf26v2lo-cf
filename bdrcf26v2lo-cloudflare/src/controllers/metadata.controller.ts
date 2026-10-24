import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/d1';

const defaults: Record<string, unknown[]> = {
  workgroups: [{ id: 'wg-1', name: 'Electrical' }, { id: 'wg-2', name: 'Mechanical' }, { id: 'wg-3', name: 'Instrumentation' }, { id: 'wg-4', name: 'Matimba' }],
  resolutionStatuses: [{ id: 'rs-1', name: 'Fixed / Cleared' }, { id: 'rs-2', name: 'Monitoring' }, { id: 'rs-3', name: 'Deferred to Next Shift' }],
  sections: ['Electrical', 'Mechanical', 'Technicians', 'Instrumentation', 'Operations', 'Services'].map((name, i) => ({ id: String(i + 1), name })),
  operators: [],
};

export async function putMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const key = req.params.key as string;
    if (!(key in defaults) || !Array.isArray(req.body?.value) || req.body.value.length > 2000 ||
        req.body.value.some((item: unknown) => !item || typeof item !== 'object' ||
          typeof (item as any).id !== 'string' || typeof (item as any).name !== 'string')) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Invalid shared setting' } });
      return;
    }
    const db = getDb(req.env);
    await db.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind(key, JSON.stringify(req.body.value), new Date().toISOString()).run();
    res.json({ data: req.body.value });
  } catch (err) { next(err); }
}

export async function getMetadata(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDb(req.env);
    const { results } = await db.prepare('SELECT key, value FROM app_settings').all();
    const data: Record<string, unknown[]> = { ...defaults };
    for (const row of results) if (row.key in defaults) data[row.key] = JSON.parse(row.value);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
