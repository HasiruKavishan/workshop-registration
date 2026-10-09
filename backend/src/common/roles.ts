import { SetMetadata } from '@nestjs/common';

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
/** Every non-public route MUST declare its roles; the RolesGuard denies by default. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ALL_ROLES = [Role.ADMIN, Role.MANAGER, Role.STAFF];
/** Roles that may see workshops / registrations (per the client's permission table). */
export const FRONT_OFFICE = [Role.MANAGER, Role.STAFF];
