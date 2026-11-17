export const MAX_CHAT_LENGTH = 500;

export type EnterKeyEvent = {
  key: string;
  shiftKey: boolean;
  isComposing?: boolean;
};

/** Enter 发送，Shift+Enter 换行；输入法组字中不发送。 */
export function shouldSendOnEnter(event: EnterKeyEvent): boolean {
  return event.key === 'Enter' && !event.shiftKey && event.isComposing !== true;
}

/** 空白不发；trim 后超过 500 字不发。 */
export function canSendMessage(content: string): boolean {
  const trimmed = content.trim();
  return trimmed !== '' && trimmed.length <= MAX_CHAT_LENGTH;
}
