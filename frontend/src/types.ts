export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
export type WorkshopStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

export interface SessionUser { id: string; email: string; name: string; role: Role }
export interface User extends SessionUser { isActive: boolean; createdAt: string }

export interface Workshop {
  id: string;
  code: string;
  title: string;
  instructor: string;
  location: string | null;
  description: string | null;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  status: WorkshopStatus;
  activeCount: number;
  availableSeats: number;
}

export interface Registration {
  id: string;
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
  status: 'ACTIVE' | 'CANCELLED';
  registeredAt: string;
  registeredBy: { id: string; name: string } | null;
  cancelledAt: string | null;
  cancelledBy: { id: string; name: string } | null;
  cancelReason: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  createdAt: string;
  actor: { id: string; name: string; email: string };
}

export interface Page<T> { items: T[]; total: number }
