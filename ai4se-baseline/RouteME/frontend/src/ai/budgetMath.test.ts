import { describe, expect, it } from 'vitest';
import type { AiBudget } from '../types';
import { aiMessages } from './aiMessages';
import { centsToYuan, overBudgetCents, sumBudgetCents } from './budgetMath';

const budget460: AiBudget = {
  transport_cents: 8000,
  tickets_cents: 15000,
  food_cents: 18000,
  other_cents: 5000,
  total_cents: 46000,
};

const budget580: AiBudget = {
  transport_cents: 10000,
  tickets_cents: 20000,
  food_cents: 20000,
  other_cents: 8000,
  total_cents: 58000,
};

describe('sumBudgetCents', () => {
  it('sums the four estimate items', () => {
    expect(sumBudgetCents(budget460)).toBe(46000);
    expect(sumBudgetCents(budget580)).toBe(58000);
  });

  it('recomputes the total instead of trusting the AI field', () => {
    expect(sumBudgetCents({ ...budget460, total_cents: 1 })).toBe(46000);
  });
});

describe('overBudgetCents', () => {
  it('returns the overshoot when the estimate exceeds the user budget', () => {
    expect(overBudgetCents(budget580, 50000)).toBe(8000);
  });

  it('returns null within budget or without a user budget', () => {
    expect(overBudgetCents(budget460, 50000)).toBeNull();
    expect(overBudgetCents(budget580, null)).toBeNull();
    expect(overBudgetCents(budget460, 46000)).toBeNull();
  });
});

describe('centsToYuan', () => {
  it('converts cents back to yuan for display', () => {
    expect(centsToYuan(46000)).toBe(460);
    expect(centsToYuan(8000)).toBe(80);
    expect(centsToYuan(50)).toBe(0.5);
  });
});

describe('budget copy', () => {
  it('always labels estimates as AI 估算', () => {
    expect(aiMessages.aiEstimate).toBe('AI 估算');
  });

  it('renders the overshoot message in yuan', () => {
    expect(aiMessages.overBudget(8000)).toBe('预计超过预算 80 元');
  });
});