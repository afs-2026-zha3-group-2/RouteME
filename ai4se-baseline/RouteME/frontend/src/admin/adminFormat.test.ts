import { describe, expect, it } from 'vitest';
import { reportTargetHref } from './adminFormat';

describe('reportTargetHref', () => {
  it('routes a user target to the admin user detail', () => {
    expect(reportTargetHref('user', 1244, true)).toBe('#/admin/users/1244');
  });

  it('routes a trip target to the trip detail', () => {
    expect(reportTargetHref('trip', 285, true)).toBe('#/trips/285');
  });

  it('routes an experience target to the share page of its trip', () => {
    expect(reportTargetHref('experience', 285, true)).toBe('#/share/285');
  });

  it('returns null when the target no longer exists', () => {
    expect(reportTargetHref('trip', 285, false)).toBeNull();
  });
});