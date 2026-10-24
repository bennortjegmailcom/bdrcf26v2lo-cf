import { Request, Response, NextFunction } from 'express';

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json({
      data: req.user,
    });
  } catch (err) {
    next(err);
  }
}
