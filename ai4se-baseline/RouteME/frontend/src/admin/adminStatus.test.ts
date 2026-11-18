import { describe, expect, it } from 'vitest';
import {
  accountStatusLabel,
  accountStatusTone,
  availableActions,
  effectiveAccountStatus,
  serviceStatusLabel,
  serviceStatusTone,
} from './adminStatus';

const NOW = Date.parse('2026-11-16T09:00:00Z');

describe('effectiveAccountStatus', () => {
  it('keeps a ban that expires in the future', () => {
    expect(effectiveAccountStatus('BANNED', '2026-11-16T10:00:00Z', NOW)).toBe('BANNED');
  });

  it('treats an expired ban as active', () => {
    expect(effectiveAccountStatus('BANNED', '2026-11-16T09:00:00Z', NOW)).toBe('ACTIVE');
    expect(effectiveAccountStatus('BANNED', '2026-11-16T08:00:00Z', NOW)).toBe('ACTIVE');
  });

  it('leaves the other states untouched', () => {
    expect(effectiveAccountStatus('ACTIVE', null, NOW)).toBe('ACTIVE');
    expect(effectiveAccountStatus('SUSPENDED', null, NOW)).toBe('SUSPENDED');
  });
});

describe('account status presentation', () => {
  it('labels and tones every state', () => {
    expect(accountStatusLabel('ACTIVE')).toBe('正常');
    expect(accountStatusLabel('SUSPENDED')).toBe('已暂停');
    expect(accountStatusLabel('BANNED')).toBe('已封禁');
    expect(accountStatusTone('ACTIVE')).toBe('jade');
    expect(accountStatusTone('SUSPENDED')).toBe('amber');
    expect(accountStatusTone('BANNED')).toBe('danger');
  });

  it('exposes only legal transitions', () => {
    expect(availableActions('ACTIVE')).toEqual(['SUSPEND', 'BAN']);
    expect(availableActions('SUSPENDED')).toEqual(['BAN', 'RESTORE']);
    expect(availableActions('BANNED')).toEqual([]);
  });

  it('labels every customer service state', () => {
    expect(serviceStatusLabel('WAITING')).toBe('等待接入');
    expect(serviceStatusLabel('HANDLING')).toBe('处理中');
    expect(serviceStatusLabel('CLOSED')).toBe('已结束');
    expect(serviceStatusTone('WAITING')).toBe('amber');
    expect(serviceStatusTone('HANDLING')).toBe('surf');
    expect(serviceStatusLabel('RESOLVED')).toBe('待用户确认');
    expect(serviceStatusTone('RESOLVED')).toBe('jade');
    expect(serviceStatusTone('CLOSED')).toBe('muted');
  });
});