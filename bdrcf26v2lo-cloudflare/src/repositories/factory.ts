import { IReportsRepository } from './interfaces/reports.repository.interface';
import { ILockoutsRepository } from './interfaces/lockouts.repository.interface';
import { IEquipmentRepository } from './interfaces/equipment.repository.interface';
import { ISyncRepository } from './interfaces/sync.repository.interface';
import { IUsersRepository } from './interfaces/users.repository.interface';

import { D1ReportsRepository } from './d1/reports.repository';
import { D1LockoutsRepository } from './d1/lockouts.repository';
import { D1EquipmentRepository } from './d1/equipment.repository';
import { D1SyncRepository } from './d1/sync.repository';
import { D1UsersRepository } from './d1/users.repository';

import { D1ArtisansRepository } from './d1/artisans.repository';
import { D1JobTicketsRepository } from './d1/tickets.repository';
import { D1AuditRepository } from './d1/audit.repository';
import { D1NotificationsRepository } from './d1/notifications.repository';

export const reportsRepository: IReportsRepository = new D1ReportsRepository();
export const lockoutsRepository: ILockoutsRepository = new D1LockoutsRepository();
export const equipmentRepository: IEquipmentRepository = new D1EquipmentRepository();
export const syncRepository: ISyncRepository = new D1SyncRepository();
export const usersRepository: IUsersRepository = new D1UsersRepository();
export const artisansRepository = new D1ArtisansRepository();
export const jobTicketsRepository = new D1JobTicketsRepository();
export const auditRepository = new D1AuditRepository();
export const notificationsRepository = new D1NotificationsRepository();

