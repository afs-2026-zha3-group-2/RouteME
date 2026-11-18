import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import {
  ApiError,
  completeLearningLessons,
  loadUserCredits,
  startLearningSession,
  submitLearningAnswers,
} from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { creditLabel, creditTone } from '../profile/creditDisplay';
import { useMyCredit } from './CreditContext';
import './learningPage.css';
import type { DemoUser, LearningResult, LearningSession, UserCreditEntry } from '../types';
import {
  answerVerdict,
  errorMessage,
  isReadyToSubmit,
  phase,
  PUBLISH_MIN_SCORE,
  quizProgress,
  toViewModel,
  unansweredCount,
} from './learningState';

const DRAFT_KEY = 'routeme.creditLearningDraft';

type Draft = {
  session: LearningSession;
  answers: Array<number | null>;
  index: number;
  baseline: number;
};

function readDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (parsed.session === undefined || !Array.isArray(parsed.answers)) {
      return null;
    }
    return {
      session: parsed.session,
      answers: parsed.answers,
      index: typeof parsed.index === 'number' ? parsed.index : 0,
      baseline: typeof parsed.baseline === 'number' ? parsed.baseline : 0,
    };
  } catch {
    return null;
  }
}

function describeError(cause: unknown): string {
  const code = cause instanceof ApiError ? cause.code : null;
  return errorMessage(code) ?? tripMessages.creditLearningErrorUnknown;
}

type Props = {
  currentUser: DemoUser;
};

/**
 * 安全学习页（`#/credit/learning`）：学习 → 答题 → 判分 → 恢复，五态由 `learningState.phase` 决定。
 * 正常入口只在发布行程被 403 拦截时出现；其余功能不会跳转到这里（proposal D6）。
 */
export function LearningPage({ currentUser }: Props) {
  // 恢复后同步全局受限状态：回到发布页时按钮应直接恢复可用。
  const { refresh: refreshGlobalCredit } = useMyCredit();
  const [credit, setCredit] = useState<UserCreditEntry | null>(null);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [result, setResult] = useState<LearningResult | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [index, setIndex] = useState(0);
  const [baseline, setBaseline] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);

  const refreshCredit = useCallback(async () => {
    const entries = await loadUserCredits([currentUser.id], currentUser.id);
    setCredit(entries[0] ?? null);
  }, [currentUser.id]);

  useEffect(() => {
    let active = true;
    const draft = readDraft();
    loadUserCredits([currentUser.id], currentUser.id)
      .then((entries) => {
        if (!active) {
          return;
        }
        setCredit(entries[0] ?? null);
        if (draft !== null) {
          setSession(draft.session);
          setAnswers(draft.answers);
          setIndex(Math.min(Math.max(0, draft.index), Math.max(0, draft.answers.length - 1)));
          setBaseline(draft.baseline);
          setRestored(true);
        }
      })
      .catch(() => {
        if (active) {
          setError(tripMessages.creditLearningFailed);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (session === null || result !== null) {
      return;
    }
    const draft: Draft = { session, answers, index, baseline };
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // 隐私模式下写入失败不影响本次作答。
    }
  }, [session, answers, index, baseline, result]);

  const start = async (scoreBefore: number) => {
    setBusy(true);
    setError(null);
    try {
      const created = await startLearningSession(currentUser.id);
      const learned = created.learning_completed
        ? created
        : await completeLearningLessons(currentUser.id, created.session_id);
      setSession(learned);
      setResult(null);
      setAnswers(Array<number | null>(learned.questions.length).fill(null));
      setIndex(0);
      setBaseline(scoreBefore);
      setRestored(false);
    } catch (cause: unknown) {
      setError(describeError(cause));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (session === null || !isReadyToSubmit(answers)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const judged = await submitLearningAnswers(
        currentUser.id,
        session.session_id,
        answers.map((answer) => answer ?? 0),
      );
      setResult(judged);
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // 同上：清不掉也不影响判分结果。
      }
      await refreshCredit().catch(() => undefined);
      refreshGlobalCredit();
    } catch (cause: unknown) {
      setError(describeError(cause));
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    const scoreBefore = credit?.credit_score ?? baseline;
    setSession(null);
    setResult(null);
    setAnswers([]);
    setIndex(0);
    try {
      window.sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    await start(scoreBefore);
  };

  const view = useMemo(() => (session === null ? null : toViewModel(session)), [session]);
  const score = credit?.credit_score ?? 0;
  const current = phase({ creditScore: score, session, result });
  const recoveredThisMonth = result?.recovery_applied === true;
  const answerCount = answers.filter((answer) => answer !== null && answer >= 0).length;

  const creditCard = (
    <section className={`cl-card cl-credit ${creditTone(credit?.credit_level)}`}>
      <div className="cl-credit-top">
        <h2>{tripMessages.creditLearningCreditTitle}</h2>
        <p className="cl-credit-num">
          <span>{score}</span>
          <small> / 100</small>
        </p>
      </div>
      <p className="cl-credit-level">{creditLabel(credit?.credit_level)}</p>
      <div
        className="cl-credit-track"
        role="img"
        aria-label={`${tripMessages.creditPrefix}：${score} / 100 · ${creditLabel(credit?.credit_level)}`}
      >
        <i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
        <u aria-hidden="true" />
      </div>
      <div className="cl-credit-scale">
        <span>{tripMessages.creditLearningScaleLow}</span>
        <span>{tripMessages.creditLearningScaleMid}</span>
        <span>{tripMessages.creditLearningScaleHigh}</span>
      </div>
    </section>
  );

  const rulesCard = (
    <section className="cl-card cl-rules">
      <h2>{tripMessages.creditLearningRulesTitle}</h2>
      <div className="cl-rule">
        <b>01</b>
        <p>{tripMessages.creditLearningRule1}</p>
      </div>
      <div className="cl-rule">
        <b>02</b>
        <p>{tripMessages.creditLearningRule2}</p>
      </div>
      <div className="cl-rule">
        <b>03</b>
        <p>{tripMessages.creditLearningRule3}</p>
      </div>
      <div className="cl-rule">
        <b>04</b>
        <p>{tripMessages.creditLearningRule4}</p>
      </div>
      <p className="cl-note">{tripMessages.creditLearningRulesNote}</p>
    </section>
  );

  const renderIntro = () => (
    <>
      <div>
        <span className="cl-kicker">{tripMessages.creditLearningKickerIntro}</span>
        <h2 className="cl-title">{tripMessages.creditLearningIntroTitle}</h2>
        <p className="cl-lede">{tripMessages.creditLearningIntroLede}</p>
      </div>
      <div className="cl-points">
        <div className="cl-point">
          <h3>
            <i />
            {tripMessages.creditLearningCategoryTravelSafety}
          </h3>
          <p>{tripMessages.creditLearningPointTravelSafety}</p>
        </div>
        <div className="cl-point">
          <h3>
            <i />
            {tripMessages.creditLearningCategoryStrangerCompanion}
          </h3>
          <p>{tripMessages.creditLearningPointStrangerCompanion}</p>
        </div>
        <div className="cl-point">
          <h3>
            <i />
            {tripMessages.creditLearningCategoryPlatformRules}
          </h3>
          <p>{tripMessages.creditLearningPointPlatformRules}</p>
        </div>
        <div className="cl-point">
          <h3>
            <i />
            {tripMessages.creditLearningCategoryPrivacy}
          </h3>
          <p>{tripMessages.creditLearningPointPrivacy}</p>
        </div>
      </div>
      <div className="cl-actions">
        <span className="cl-hint">{tripMessages.creditLearningLearnHint}</span>
        <Button type="primary" loading={busy} onClick={() => void start(score)}>
          {tripMessages.creditLearningStart}
        </Button>
      </div>
    </>
  );

  const renderQuiz = () => {
    if (view === null) {
      return null;
    }
    const question = view.questions[index];
    if (question === undefined) {
      return null;
    }
    const progress = quizProgress(index, view.total);
    const picked = answers[index] ?? null;
    const missing = unansweredCount(answers);
    return (
      <>
        <div className="cl-steps">
          <div
            className="cl-bar"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={view.total}
            aria-valuenow={progress.current}
            aria-label={tripMessages.creditLearningKickerQuiz}
          >
            {view.questions.map((item) => (
              <i
                key={item.id}
                className={item.index < index ? 'is-done' : item.index === index ? 'is-now' : ''}
              />
            ))}
          </div>
          <span className="cl-step-num">
            <b>{progress.current}</b> / {view.total}
          </span>
        </div>

        <div>
          <span className="cl-q-cat">{question.categoryLabel}</span>
          <p className="cl-q">{question.question}</p>
        </div>

        <div className="cl-opts" role="group" aria-label={question.question}>
          {question.options.map((option, optionIndex) => (
            <button
              key={option}
              type="button"
              className={picked === optionIndex ? 'cl-opt is-checked' : 'cl-opt'}
              aria-pressed={picked === optionIndex}
              onClick={() => {
                const next = [...answers];
                next[index] = optionIndex;
                setAnswers(next);
              }}
            >
              <span className="cl-opt-dot" aria-hidden="true" />
              <span className="cl-opt-text">{option}</span>
            </button>
          ))}
        </div>

        <div className="cl-actions">
          <span className="cl-hint">
            {tripMessages.creditLearningQuizHint
              .replace('{answered}', String(answerCount))
              .replace('{total}', String(view.total))}
            {missing > 0 ? ` · ${tripMessages.creditLearningQuizNeedAll.replace('{n}', String(missing))}` : ''}
          </span>
          <Button disabled={index === 0 || busy} onClick={() => setIndex(Math.max(0, index - 1))}>
            {tripMessages.creditLearningPrev}
          </Button>
          {index < view.total - 1 ? (
            <Button
              type="primary"
              disabled={picked === null || busy}
              onClick={() => setIndex(Math.min(view.total - 1, index + 1))}
            >
              {tripMessages.creditLearningNext}
            </Button>
          ) : (
            <Button
              type="primary"
              loading={busy}
              disabled={!isReadyToSubmit(answers)}
              onClick={() => void submit()}
            >
              {busy ? tripMessages.creditLearningSubmitting : tripMessages.creditLearningSubmit}
            </Button>
          )}
        </div>
      </>
    );
  };

  const renderResult = () => {
    if (result === null || view === null) {
      return null;
    }
    const passed = result.passed;
    const delta = Math.max(0, result.credit_score - baseline);
    const reachedTarget = result.credit_score >= PUBLISH_MIN_SCORE;
    return (
      <>
        <div className={`cl-result ${passed ? 'is-pass' : 'is-fail'}`}>
          <span className="cl-result-badge">
            {result.score}/{view.total}
          </span>
          <div>
            <h2>
              {passed
                ? reachedTarget
                  ? tripMessages.creditLearningResultPass
                  : tripMessages.creditLearningResultPartialTitle.replace(
                      '{score}',
                      String(result.credit_score),
                    )
                : tripMessages.creditLearningResultFail}
            </h2>
            <p>
              {passed
                ? reachedTarget
                  ? tripMessages.creditLearningResultPassText
                      .replace('{delta}', String(delta))
                      .replace('{after}', String(result.credit_score))
                  : tripMessages.creditLearningResultPartialText
                      .replace('{score}', String(result.score))
                      .replace('{delta}', String(delta))
                : tripMessages.creditLearningResultFailText
                    .replace('{score}', String(result.score))
                    .replace('{passLine}', String(result.pass_line))
                    .replace('{left}', String(Math.max(0, view.examLimit - view.examUsed)))}
            </p>
          </div>
        </div>

        <div>
          <span className="cl-kicker">{tripMessages.creditLearningKickerResult}</span>
          <h2 className="cl-title">{tripMessages.creditLearningDetailsTitle}</h2>
          <div className="cl-rules cl-details">
            {result.details.map((detail, detailIndex) => {
              const question = view.questions[detailIndex];
              return (
                <div
                  key={detail.question_id}
                  className={detail.correct ? 'cl-rule is-right' : 'cl-rule is-wrong'}
                >
                  <b>{String(detailIndex + 1).padStart(2, '0')}</b>
                  <p>
                    {answerVerdict(detail.correct)} · {question?.question ?? detail.question_id}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cl-actions">
          {!passed && <span className="cl-hint">{tripMessages.creditLearningLearnHint}</span>}
          {passed && reachedTarget ? (
            <Button type="primary" href="#/trips/new">
              {tripMessages.creditLearningGoPublish}
            </Button>
          ) : passed ? (
            <Button type="primary" href="#/">
              {tripMessages.creditLearningBackHome}
            </Button>
          ) : (
            <Button type="primary" loading={busy} onClick={() => void retry()}>
              {tripMessages.creditLearningRetry}
            </Button>
          )}
        </div>
      </>
    );
  };

  const renderDone = () => {
    const delta = Math.max(0, (result?.credit_score ?? 60) - baseline);
    return (
      <>
        <div>
          <span className="cl-kicker">{tripMessages.creditLearningKickerDone}</span>
          <h2 className="cl-title">{tripMessages.creditLearningDoneTitle}</h2>
          <p className="cl-lede">{tripMessages.creditLearningDoneLede}</p>
        </div>
        <div className="cl-done">
          <div className="cl-done-score">
            <b>{result?.credit_score ?? 60}</b>
            <span>/ 100</span>
            <span className="cl-done-tag">{creditLabel(result?.credit_level)}</span>
          </div>
          <p>
            {tripMessages.creditLearningDoneRecord
              .replace('{before}', String(baseline))
              .replace('{delta}', String(delta))
              .replace('{after}', String(result?.credit_score ?? 60))}
          </p>
        </div>
        <div className="cl-actions">
          <span className="cl-hint">{tripMessages.creditLearningDoneHint}</span>
          <Button type="primary" href="#/trips/new">
            {tripMessages.creditLearningGoPublish}
          </Button>
        </div>
      </>
    );
  };

  const renderEligible = () => (
    <>
      <div>
        <span className="cl-kicker">{tripMessages.creditLearningKickerEligible}</span>
        <h2 className="cl-title">
          {tripMessages.creditLearningEligibleTitle.replace('{score}', String(score))}
        </h2>
        <p className="cl-lede">{tripMessages.creditLearningEligibleLede}</p>
      </div>
      <div className="cl-result is-pass">
        <span className="cl-result-badge">{score}</span>
        <div>
          <h2>{tripMessages.creditLearningEligibleCan}</h2>
          <p>{tripMessages.creditLearningEligibleText}</p>
        </div>
      </div>
      <div className="cl-actions">
        <span className="cl-hint">{tripMessages.creditLearningEligibleHint}</span>
        <Button href="#/trips/new">{tripMessages.creditLearningBack}</Button>
      </div>
    </>
  );

  const body = (() => {
    if (loading) {
      return (
        <div className="cl-loading">
          <Spin size="small" />
          <span>{tripMessages.creditLearningLoading}</span>
        </div>
      );
    }
    if (current === 'eligible') {
      return renderEligible();
    }
    if (current === 'done') {
      return renderDone();
    }
    if (current === 'result') {
      return renderResult();
    }
    if (current === 'quiz') {
      return renderQuiz();
    }
    return renderIntro();
  })();

  return (
    <main className="cl-page">
      <header className="cl-head">
        <div>
          <h1>{tripMessages.creditLearningTitle}</h1>
          <p>{tripMessages.creditLearningSubtitle}</p>
        </div>
        <div className="cl-quota">
          <span>
            {tripMessages.creditLearningQuotaExam} <b>{session?.exam_used ?? 0}</b> /{' '}
            {session?.exam_limit ?? 2}
          </span>
          <span className={recoveredThisMonth ? 'is-spent' : undefined}>
            {tripMessages.creditLearningQuotaRecovery} <b>{recoveredThisMonth ? 1 : 0}</b> / 1
          </span>
        </div>
      </header>

      {error !== null && (
        <Alert
          className="cl-alert"
          type="error"
          showIcon
          title={tripMessages.creditLearningFailed}
          description={error}
        />
      )}
      {restored && (
        <Alert
          className="cl-alert"
          type="info"
          showIcon
          title={tripMessages.creditLearningResumeHint}
          description={tripMessages.creditLearningSaveHint}
        />
      )}

      <div className="cl-grid">
        <section className="cl-card cl-main" aria-live="polite">
          {body}
        </section>
        <aside className="cl-side">
          {creditCard}
          {rulesCard}
        </aside>
      </div>
    </main>
  );
}
