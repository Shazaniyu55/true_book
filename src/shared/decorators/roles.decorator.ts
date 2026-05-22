import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../types/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Convenience shortcuts mirror Laravel middleware aliases
export const PassengerOnly = () => Roles(UserRole.PASSENGER);
export const DriverOnly = () => Roles(UserRole.DRIVER);
export const AdminOnly = () => Roles(UserRole.ADMIN);
export const AgentOnly = () => Roles(UserRole.AGENT);
