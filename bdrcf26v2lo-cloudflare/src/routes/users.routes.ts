import { Router, Request, Response, NextFunction } from 'express';
import { usersRepository } from '../repositories/factory';
import { authorize } from '../middleware/authorize';
import { authenticate } from '../middleware/authenticate';
import { User, Role } from '../domain/types';

const router = Router();

// List all users
router.get('/users', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await usersRepository.listUsers();
    res.status(200).json({ data: users });
  } catch (err) {
    next(err);
  }
});

// Get user by id
router.get('/users/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = await usersRepository.getUserById(id);
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `User ${id} not found` } });
      return;
    }
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
});

// Create or register user
router.post('/users', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    if (!body.name || !Object.values(Role).includes(body.role)) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Name and role are required' } });
      return;
    }
    const id = body.id || body.uid || crypto.randomUUID();
    const user: User = {
      id,
      uid: body.uid || id,
      name: body.name,
      email: body.email || '',
      role: body.role as Role,
      roles: body.roles || [body.role as Role],
      workGroup: body.workGroup,
      discipline: body.discipline,
      employeeNumber: body.employeeNumber,
      shift: body.shift,
      username: body.username,
      isApproved: body.isApproved ?? true,
      hoursToShow: body.hoursToShow ?? 72,
      notificationSound: body.notificationSound,
      lastLoginAt: body.lastLoginAt,
      lastAuthMethod: body.lastAuthMethod,
      webAuthnCredentialId: body.webAuthnCredentialId,
    };
    await usersRepository.saveUser(user);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
});

// Update user
router.patch('/users/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await usersRepository.getUserById(id);
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `User ${id} not found` } });
      return;
    }

    if (req.user!.role !== Role.ADMIN) {
      const allowed = new Set(['employeeNumber', 'hoursToShow', 'notificationSound', 'shift']);
      if (existing.id !== req.user!.id || Object.keys(req.body).some(k => !allowed.has(k))) {
        res.status(403).json({ error: { code: 'UNAUTHORIZED', message: 'Administrator permission required' } });
        return;
      }
    }
    if (req.user!.role === Role.ADMIN && req.body.role && !Object.values(Role).includes(req.body.role)) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Invalid role' } });
      return;
    }
    const updatedUser: User = {
      ...existing,
      ...req.body,
      id: existing.id,
      uid: existing.uid,
    };

    await usersRepository.saveUser(updatedUser);
    res.status(200).json({ data: updatedUser });
  } catch (err) {
    next(err);
  }
});

// Delete user
router.delete('/users/:id', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await usersRepository.deleteUser(id);
    res.status(200).json({ data: { success: true, id } });
  } catch (err) {
    next(err);
  }
});

export default router;
