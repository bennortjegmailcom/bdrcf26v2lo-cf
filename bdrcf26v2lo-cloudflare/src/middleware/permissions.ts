import { Role } from '../domain/types';
import { authorize } from './authorize';

export const managePeople = authorize([Role.ADMIN]);
export const manageOperations = authorize([
  Role.ADMIN, Role.COORDINATOR, Role.FOREMAN, Role.OPS_FOREMAN,
  Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR,
  Role.INST_SUPERVISOR,
]);
export const manageLockouts = authorize([
  Role.ADMIN, Role.FOREMAN, Role.OPS_FOREMAN,
  Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR, Role.TECH_SUPERVISOR,
  Role.INST_SUPERVISOR,
]);
export const confirmOperations = authorize([Role.ADMIN, Role.OPS_FOREMAN]);
export const confirmMaintenance = authorize([
  Role.ADMIN, Role.FOREMAN, Role.MECH_SUPERVISOR, Role.ELEC_SUPERVISOR,
  Role.TECH_SUPERVISOR, Role.INST_SUPERVISOR,
]);
