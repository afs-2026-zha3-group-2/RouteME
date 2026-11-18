import { describe, expect, it } from 'vitest';
import {
  feeOf,
  interestOf,
  loanStatusOf,
  money,
  netOf,
  overdueDaysOf,
  penaltyOf,
} from './financeFormat';

describe('feeOf', () => {
  it('charges 5% of the base amount in cents', () => {
    expect(feeOf(1_000)).toBe(50);
    expect(feeOf(2_000)).toBe(100);
    expect(feeOf(500)).toBe(25);
    expect(feeOf(100_000)).toBe(5_000);
  });

  it('rounds to the nearest cent so fees never drift', () => {
    expect(feeOf(2_010)).toBe(101);
    expect(feeOf(10)).toBe(1);
  });
});

describe('netOf', () => {
  it('deducts the fee from the principal', () => {
    expect(netOf(100_000)).toBe(95_000);
    expect(netOf(10_000)).toBe(9_500);
  });
});

describe('interestOf', () => {
  it('charges 0.05% of the principal per day of the term', () => {
    expect(interestOf(100_000, 14)).toBe(700);
    expect(interestOf(100_000, 7)).toBe(350);
    expect(interestOf(100_000, 30)).toBe(1_500);
  });

  it('rounds to the nearest cent', () => {
    expect(interestOf(10_000, 7)).toBe(35);
    expect(interestOf(12_345, 7)).toBe(43);
  });
});

describe('penaltyOf', () => {
  it('charges 0.1% of the principal per started overdue day', () => {
    expect(penaltyOf(100_000, 6)).toBe(600);
    expect(penaltyOf(100_000, 1)).toBe(100);
    expect(penaltyOf(200_000, 2)).toBe(400);
  });

  it('never charges a penalty on time', () => {
    expect(penaltyOf(100_000, 0)).toBe(0);
    expect(penaltyOf(100_000, -1)).toBe(0);
  });
});

describe('overdueDaysOf', () => {
  const dueAt = '2026-11-15T09:00:00Z';

  it('stays at zero before the due instant', () => {
    expect(overdueDaysOf(dueAt, new Date('2026-11-15T09:00:00Z'))).toBe(0);
    expect(overdueDaysOf(dueAt, new Date('2026-11-15T08:59:59Z'))).toBe(0);
  });

  it('counts any started day as a full overdue day', () => {
    expect(overdueDaysOf(dueAt, new Date('2026-11-15T09:00:01Z'))).toBe(1);
    expect(overdueDaysOf(dueAt, new Date('2026-11-16T08:59:59Z'))).toBe(1);
    expect(overdueDaysOf(dueAt, new Date('2026-11-16T09:00:00Z'))).toBe(1);
    expect(overdueDaysOf(dueAt, new Date('2026-11-16T09:00:01Z'))).toBe(2);
  });
});

describe('money', () => {
  it('formats integer cents as yuan with two decimals', () => {
    expect(money(1_000_000)).toBe('¥10,000.00');
    expect(money(998_950)).toBe('¥9,989.50');
    expect(money(5)).toBe('¥0.05');
    expect(money(0)).toBe('¥0.00');
  });

  it('keeps the thousands separator for large amounts', () => {
    expect(money(5_000_000)).toBe('¥50,000.00');
    expect(money(123_456_789)).toBe('¥1,234,567.89');
  });
});

describe('loanStatusOf', () => {
  const loan = {
    status: 'active' as const,
    due_at: '2026-11-30T09:00:00Z',
  };

  it('keeps an open loan active before the due instant', () => {
    expect(loanStatusOf(loan, new Date('2026-11-30T08:59:59Z'))).toBe('active');
  });

  it('derives overdue once the due instant has passed', () => {
    expect(loanStatusOf(loan, new Date('2026-11-30T09:00:01Z'))).toBe('overdue');
  });

  it('always reports repaid for settled loans', () => {
    expect(
      loanStatusOf({ status: 'repaid', due_at: '2000-01-01T00:00:00Z' }, new Date()),
    ).toBe('repaid');
  });
});