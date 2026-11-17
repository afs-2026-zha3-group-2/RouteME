import { describe, expect, it } from 'vitest';
import { accountStatusNotice } from './accountStatusNoticeModel';

describe('accountStatusNotice', () => {
  it('returns nothing for ACTIVE accounts', () => {
    expect(accountStatusNotice('ACTIVE', null, null)).toBeNull();
    expect(accountStatusNotice(undefined, null, null)).toBeNull();
    expect(accountStatusNotice(null, 'HARASSMENT', '2035-01-01T04:00:00Z')).toBeNull();
  });

  it('explains a ban with the localized reason and expiry', () => {
    const notice = accountStatusNotice('BANNED', 'ILLEGAL_CONTENT', '2026-12-17T22:07:00Z');

    expect(notice).not.toBeNull();
    expect(notice?.tone).toBe('error');
    expect(notice?.title).toBe('账号已被封禁');
    expect(notice?.body).toContain('只能浏览内容');
    expect(notice?.reason).toBe('违法违规内容');
    expect(notice?.until).toBe('2026-12-17T22:07:00Z');
  });

  it('keeps the notice but shows a dash when the ban reason is missing', () => {
    const notice = accountStatusNotice('BANNED', null, null);

    expect(notice?.reason).toBe('—');
    expect(notice?.until).toBeNull();
  });

  it('warns a suspended account without exposing a reason', () => {
    const notice = accountStatusNotice('SUSPENDED', null, null);

    expect(notice?.tone).toBe('warning');
    expect(notice?.title).toBe('账号已被暂停');
    expect(notice?.reason).toBeUndefined();
    expect(notice?.until).toBeUndefined();
  });
});