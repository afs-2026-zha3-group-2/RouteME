import { describe, expect, it } from 'vitest';
import { errorMessage, phase, quizProgress, toViewModel } from './learningState';
import type { LearningQuestion, LearningResult, LearningSession } from '../types';

const QUESTIONS: LearningQuestion[] = [
  {
    id: 'travel_safety-1',
    category: 'travel_safety',
    question: '出发前，最应该先把行程信息同步给谁？',
    options: ['社交平台的公开动态', '至少一位紧急联系人', '同行者的朋友', '不需要同步'],
  },
  {
    id: 'stranger_companion-1',
    category: 'stranger_companion',
    question: '与线上约定的同行者首次见面，地点应选在？',
    options: ['对方住处', '人少的郊外', '车站、咖啡厅等公共场所', '任意地点均可'],
  },
  {
    id: 'platform_rules-1',
    category: 'platform_rules',
    question: '临时无法出行时，正确做法是？',
    options: ['直接失联', '提前取消行程并说明原因', '让同行者自行猜测', '把行程改成已结束'],
  },
  {
    id: 'privacy-1',
    category: 'privacy',
    question: '与同行者沟通时，不应发送的是？',
    options: ['集合地点', '大交通班次', '身份证或银行卡照片', '行程偏好'],
  },
];

function session(overrides: Partial<LearningSession> = {}): LearningSession {
  return {
    session_id: 11,
    questions: QUESTIONS,
    exam_used: 1,
    exam_limit: 2,
    month: '2026-11',
    learning_completed: true,
    ...overrides,
  };
}

function result(overrides: Partial<LearningResult> = {}): LearningResult {
  return {
    session_id: 11,
    passed: true,
    score: 8,
    pass_line: 8,
    details: QUESTIONS.map((question) => ({ question_id: question.id, correct: true })),
    recovery_applied: true,
    credit_score: 60,
    credit_level: 'fair',
    ...overrides,
  };
}

describe('phase', () => {
  it('starts at intro for a low score before any session exists', () => {
    expect(phase({ creditScore: 45, session: null, result: null })).toBe('intro');
  });

  it('marks eligible once the score reaches the publish threshold', () => {
    expect(phase({ creditScore: 59, session: null, result: null })).toBe('intro');
    expect(phase({ creditScore: 60, session: null, result: null })).toBe('eligible');
    expect(phase({ creditScore: 62, session: null, result: null })).toBe('eligible');
  });

  it('requires the lessons before the quiz becomes reachable', () => {
    expect(phase({ creditScore: 45, session: session({ learning_completed: false }), result: null })).toBe(
      'intro',
    );
    expect(phase({ creditScore: 45, session: session(), result: null })).toBe('quiz');
  });

  it('shows done only when this submission actually applied the recovery', () => {
    expect(phase({ creditScore: 60, session: session(), result: result() })).toBe('done');
    expect(
      phase({
        creditScore: 45,
        session: session(),
        result: result({ recovery_applied: false, credit_score: 45 }),
      }),
    ).toBe('result');
  });

  it('keeps a partial recovery in result instead of claiming done', () => {
    expect(
      phase({
        creditScore: 55,
        session: session(),
        result: result({ score: 8, recovery_applied: true, credit_score: 55 }),
      }),
    ).toBe('result');
  });

  it('returns result for a failed attempt without claiming a recovery', () => {
    const failed = result({ passed: false, score: 7, recovery_applied: false, credit_score: 45 });
    expect(phase({ creditScore: 45, session: session(), result: failed })).toBe('result');
  });
});

describe('toViewModel', () => {
  it('exposes the session quota and localized category labels', () => {
    const view = toViewModel(session({ exam_used: 2 }));
    expect(view.sessionId).toBe(11);
    expect(view.total).toBe(4);
    expect(view.examLeft).toBe(0);
    expect(view.questions.map((question) => question.categoryLabel)).toEqual([
      '旅行安全',
      '陌生人同行',
      '平台行为规范',
      '隐私保护',
    ]);
    expect(view.questions[0].options).toHaveLength(4);
  });
});

describe('quizProgress', () => {
  it('reports the 1-based position and the filled ratio', () => {
    expect(quizProgress(0, 10)).toEqual({ current: 1, total: 10, percent: 10 });
    expect(quizProgress(4, 10)).toEqual({ current: 5, total: 10, percent: 50 });
    expect(quizProgress(9, 10)).toEqual({ current: 10, total: 10, percent: 100 });
  });

  it('clamps out-of-range input instead of showing impossible progress', () => {
    expect(quizProgress(-3, 10).current).toBe(1);
    expect(quizProgress(99, 10).percent).toBe(100);
    expect(quizProgress(0, 0)).toEqual({ current: 1, total: 0, percent: 0 });
  });
});

describe('errorMessage', () => {
  const CODES = [
    'CREDIT_SCORE_BELOW_60',
    'LEARNING_NOT_ELIGIBLE',
    'LEARNING_EXAM_QUOTA_EXCEEDED',
    'LEARNING_RECOVERY_QUOTA_EXCEEDED',
    'LEARNING_NOT_COMPLETED',
    'LEARNING_SESSION_NOT_FOUND',
  ];

  it('has distinct copy for every contract error code', () => {
    const messages = CODES.map((code) => errorMessage(code));
    messages.forEach((text) => expect(text).toBeTruthy());
    expect(new Set(messages).size).toBe(CODES.length);
  });

  it('falls back to a generic message for unknown codes and null for no error', () => {
    expect(errorMessage('SOMETHING_ELSE')).toBeTruthy();
    expect(errorMessage(undefined)).toBeNull();
  });
});
