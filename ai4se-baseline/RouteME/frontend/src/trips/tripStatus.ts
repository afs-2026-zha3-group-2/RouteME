import { tripMessages } from '../i18n/tripMessages';
import type { TripStatus } from '../types';

export function statusLabel(status: TripStatus): string {
  if (status === 'full') {
    return tripMessages.statusFull;
  }
  if (status === 'completed') {
    return tripMessages.statusCompleted;
  }
  return tripMessages.statusRecruiting;
}

export type StatusTone = 'surf' | 'amber' | 'muted';

export function statusTone(status: TripStatus): StatusTone {
  if (status === 'full') {
    return 'amber';
  }
  if (status === 'completed') {
    return 'muted';
  }
  return 'surf';
}

export function statusColor(status: TripStatus): string {
  if (status === 'full') {
    return 'orange';
  }
  if (status === 'completed') {
    return 'default';
  }
  return 'blue';
}