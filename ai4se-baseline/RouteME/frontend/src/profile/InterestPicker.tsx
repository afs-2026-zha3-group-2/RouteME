import { useState } from 'react';
import { Button, Input, Typography } from 'antd';
import { tripMessages } from '../i18n/tripMessages';
import {
  addInterest,
  removeInterest,
  type InterestResult,
} from './profileForm';
import {
  interestLabel,
  MAX_INTEREST_LENGTH,
  MAX_INTERESTS,
  PRESET_INTERESTS,
} from './profileOptions';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
};

/**
 * 旅行兴趣选择器：预设规范值 + 自定义标签。
 * 取消自定义标签后仍保留为未选卡片，可再次选择（E13）。
 */
export function InterestPicker({ value, onChange, error, disabled = false }: Props) {
  const [customTags, setCustomTags] = useState<string[]>(() =>
    value.filter((tag) => !PRESET_INTERESTS.some((option) => option.value === tag)),
  );
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const full = value.length >= MAX_INTERESTS;

  const toggle = (tag: string) => {
    if (disabled) {
      return;
    }
    if (value.includes(tag)) {
      onChange(removeInterest(value, tag));
      return;
    }
    if (full) {
      return;
    }
    onChange([...value, tag]);
  };

  const addCustom = () => {
    const tag = draft.trim();
    if (tag === '') {
      setDraftError(tripMessages.profileInterestEmpty);
      return;
    }
    if (value.includes(tag) || customTags.includes(tag)) {
      setDraftError(tripMessages.profileErrorInterestsDuplicate);
      return;
    }
    const result: InterestResult = addInterest(value, tag);
    if (result.error !== null) {
      setDraftError(result.error);
      return;
    }
    setCustomTags((previous) => [...previous, tag]);
    onChange(result.interests);
    setDraft('');
    setDraftError(null);
  };

  const options = [...PRESET_INTERESTS.map((option) => option.value), ...customTags];

  /** 自定义输入的错误优先；否则显示表单级校验错误，保证只有一条提示。 */
  const message = draftError ?? error;

  return (
    <div className={error === undefined ? 'profile-field wide' : 'profile-field wide invalid'}>
      <div className="form-label-row">
        <span className="form-label">
          {tripMessages.profileFieldInterests} <span className="profile-required">*</span>
        </span>
        <span className={full ? 'interest-count full' : 'interest-count'}>
          {value.length} / {MAX_INTERESTS}
        </span>
      </div>
      <div className="interest-picker">
        <div className="interest-grid" role="group" aria-label={tripMessages.profileFieldInterests}>
          {options.map((tag) => {
            const selected = value.includes(tag);
            const atMax = !selected && full;
            return (
              <button
                key={tag}
                type="button"
                className={['interest-card', selected ? 'on' : '', atMax ? 'at-max' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={selected}
                disabled={disabled}
                title={
                  selected
                    ? `取消 ${interestLabel(tag)}`
                    : atMax
                      ? '已达 5 个上限'
                      : `选择 ${interestLabel(tag)}`
                }
                onClick={() => toggle(tag)}
              >
                {selected && (
                  <span className="interest-tick" aria-hidden="true">
                    ✓
                  </span>
                )}
                <span>{interestLabel(tag)}</span>
              </button>
            );
          })}
        </div>
        <div className="interest-custom">
          <Input
            value={draft}
            maxLength={MAX_INTEREST_LENGTH}
            disabled={disabled || full}
            status={draftError === null ? undefined : 'error'}
            placeholder={
              full ? tripMessages.profileInterestFull : tripMessages.profileInterestPlaceholder
            }
            aria-label={tripMessages.profileInterestPlaceholder}
            onChange={(event) => {
              setDraft(event.target.value);
              setDraftError(null);
            }}
            onPressEnter={addCustom}
          />
          <Button className="interest-add" disabled={disabled || full} onClick={addCustom}>
            {tripMessages.profileInterestAdd}
          </Button>
        </div>
      </div>
      <Typography.Text type="secondary" className="auth-hint">
        {tripMessages.profileInterestHint}
      </Typography.Text>
      {message !== undefined && (
        <Typography.Text type="danger" role="alert">
          {message}
        </Typography.Text>
      )}
    </div>
  );
}