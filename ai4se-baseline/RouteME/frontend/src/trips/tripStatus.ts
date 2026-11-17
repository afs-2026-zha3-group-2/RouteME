import { tripMessages } from '../i18n/tripMessages';
import type { TripStatus } from '../types';

export function statusLabel(status: TripStatus): string {
  if (status === 'full') {
    return tripMessages.statusFull;
  }
  if (status === 'ongoing') {
    return tripMessages.statusOngoing;
  }
  if (status === 'completed') {
    return tripMessages.statusCompleted;
  }
  if (status === 'cancelled') {
    return tripMessages.statusCancelled;
  }
  return tripMessages.statusRecruiting;
}

export type StatusTone = 'surf' | 'amber' | 'jade' | 'muted' | 'danger';

export function statusTone(status: TripStatus): StatusTone {
  if (status === 'full') {
    return 'amber';
  }
  if (status === 'ongoing') {
    return 'jade';
  }
  if (status === 'completed') {
    return 'muted';
  }
  if (status === 'cancelled') {
    return 'danger';
  }
  return 'surf';
}

export function statusColor(status: TripStatus): string {
  if (status === 'full') {
    return 'orange';
  }
  if (status === 'ongoing') {
    return 'green';
  }
  if (status === 'completed') {
    return 'default';
  }
  if (status === 'cancelled') {
    return 'red';
  }
  return 'blue';
}