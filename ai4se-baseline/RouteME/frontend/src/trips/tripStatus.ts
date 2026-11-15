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

export function statusColor(status: TripStatus): string {
  if (status === 'full') {
    return 'orange';
  }
  if (status === 'completed') {
    return 'default';
  }
  return 'blue';
}