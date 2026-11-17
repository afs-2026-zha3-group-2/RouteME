import { adminMessages, banReasonLabel } from '../i18n/adminMessages';
import type { BanReasonCode } from '../types';

/** 规格中的 8 项封禁理由，顺序与契约枚举一致。 */
export const BAN_REASONS: BanReasonCode[] = [
  'HARASSMENT',
  'FAKE_TRIP',
  'FRAUD_RISK',
  'ILLEGAL_CONTENT',
  'IMPERSONATION',
  'NO_SHOW_DISRUPTION',
  'PRIVACY_LEAK',
  'OTHER',
];

/** 下拉选项带一个空占位，避免未选择时静默落到第一项。 */
export const BAN_REASON_OPTIONS = [
  { value: '', label: adminMessages.fieldBanReasonPlaceholder },
  ...BAN_REASONS.map((code) => ({ value: code, label: banReasonLabel(code) })),
];