import { tripMessages } from '../i18n/tripMessages';
import type { LearningCategory, LearningResult, LearningSession } from '../types';

/**
 * 发布阈值：只用于界面提示与无资格态判定，服务端仍是唯一判据。
 * 与 `CreditLearningConstant.PUBLISH_MIN_SCORE` 同值，改动须同步契约。
 */
export const PUBLISH_MIN_SCORE = 60;

export type LearningPhase = 'intro' | 'quiz' | 'result' | 'done' | 'eligible';

export type PhaseInput = {
  creditScore: number;
  session: LearningSession | null;
  result: LearningResult | null;
};

/**
 * 五态判定：未通过落在 result（可重考）；通过、本次记了恢复且分数已到 60 才进 done。
 * 部分恢复（如 8 题 +10，45→55）仍留在 result，避免提前播报「已恢复」。
 */
export function phase({ creditScore, session, result }: PhaseInput): LearningPhase {
  if (result !== null) {
    return result.passed && result.recovery_applied && result.credit_score >= PUBLISH_MIN_SCORE
      ? 'done'
      : 'result';
  }
  if (session === null) {
    return creditScore >= PUBLISH_MIN_SCORE ? 'eligible' : 'intro';
  }
  return session.learning_completed ? 'quiz' : 'intro';
}

export type QuizQuestionView = {
  index: number;
  id: string;
  categoryLabel: string;
  question: string;
  options: string[];
};

export type LearningViewModel = {
  sessionId: number;
  total: number;
  examUsed: number;
  examLimit: number;
  examLeft: number;
  month: string;
  questions: QuizQuestionView[];
};

const CATEGORY_LABELS: Record<LearningCategory, string> = {
  travel_safety: tripMessages.creditLearningCategoryTravelSafety,
  stranger_companion: tripMessages.creditLearningCategoryStrangerCompanion,
  platform_rules: tripMessages.creditLearningCategoryPlatformRules,
  privacy: tripMessages.creditLearningCategoryPrivacy,
};

function categoryLabel(category: LearningCategory | string): string {
  return CATEGORY_LABELS[category as LearningCategory] ?? String(category);
}

/** 会话 → 视图模型：只做展示派生，不改任何服务端字段。 */
export function toViewModel(session: LearningSession): LearningViewModel {
  return {
    sessionId: session.session_id,
    total: session.questions.length,
    examUsed: session.exam_used,
    examLimit: session.exam_limit,
    examLeft: Math.max(0, session.exam_limit - session.exam_used),
    month: session.month,
    questions: session.questions.map((question, index) => ({
      index,
      id: question.id,
      categoryLabel: categoryLabel(question.category),
      question: question.question,
      options: question.options,
    })),
  };
}

export type QuizProgress = {
  current: number;
  total: number;
  percent: number;
};

/** 进度：`current` 为 1 基题号，`percent` 为已作答段占比。 */
export function quizProgress(index: number, total: number): QuizProgress {
  if (total <= 0) {
    return { current: 1, total: 0, percent: 0 };
  }
  const clamped = Math.max(0, Math.min(total - 1, Math.trunc(index)));
  return {
    current: clamped + 1,
    total,
    percent: Math.round(((clamped + 1) / total) * 100),
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  CREDIT_SCORE_BELOW_60: tripMessages.creditLearningErrorBelow,
  LEARNING_NOT_ELIGIBLE: tripMessages.creditLearningErrorEligible,
  LEARNING_EXAM_QUOTA_EXCEEDED: tripMessages.creditLearningErrorExamQuota,
  LEARNING_RECOVERY_QUOTA_EXCEEDED: tripMessages.creditLearningErrorRecoveryQuota,
  LEARNING_NOT_COMPLETED: tripMessages.creditLearningErrorNotCompleted,
  LEARNING_SESSION_NOT_FOUND: tripMessages.creditLearningErrorSessionNotFound,
};

/** 错误码 → 中文文案；未知码退回通用提示，无错误时返回 null。 */
export function errorMessage(code: string | null | undefined): string | null {
  if (code === null || code === undefined || code === '') {
    return null;
  }
  return ERROR_MESSAGES[code] ?? tripMessages.creditLearningErrorUnknown;
}

/** 逐题判定文案：正确 / 错误。 */
export function answerVerdict(correct: boolean): string {
  return correct ? tripMessages.creditLearningAnswerRight : tripMessages.creditLearningAnswerWrong;
}

/** 本题是否能提交：所有题目都作答后才允许（A11 的禁用态）。 */
export function isReadyToSubmit(answers: Array<number | null>): boolean {
  return answers.length > 0 && answers.every((answer) => answer !== null && answer >= 0);
}

/** 未作答题数，用于禁用态提示。 */
export function unansweredCount(answers: Array<number | null>): number {
  return answers.filter((answer) => answer === null || answer < 0).length;
}
