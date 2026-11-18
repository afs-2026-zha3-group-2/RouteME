import { useState } from 'react';
import { Button, Modal } from 'antd';
import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser } from '../types';
import { canUseCoreActions } from './studentVerification';

/** 认证盾牌图标：认证页、门槛弹窗与徽标共用。 */
export function StudentShield({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? 'chsi-shield small' : 'chsi-shield'} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.8 20 5.6v5.9c0 4.6-3.3 7.9-8 9.7-4.7-1.8-8-5.1-8-9.7V5.6z" />
        <path d="m8.6 11.8 2.3 2.3 4.5-4.7" />
      </svg>
    </span>
  );
}

/**
 * 核心动作门槛：未认证时弹出说明，已认证 / 管理员直接执行。
 * 页面把返回的 `prompt` 渲染在根节点即可。
 */
export function useStudentGate(currentUser: DemoUser) {
  const [promptOpen, setPromptOpen] = useState(false);
  const allowed = canUseCoreActions(currentUser);

  const requireVerified = (action: () => void) => {
    if (allowed) {
      action();
      return;
    }
    setPromptOpen(true);
  };

  const prompt = (
    <Modal
      open={promptOpen}
      centered
      title={tripMessages.studentVerifyGateTitle}
      okText={tripMessages.studentVerifyGateGo}
      cancelText={tripMessages.studentVerifyGateLater}
      onCancel={() => setPromptOpen(false)}
      onOk={() => {
        setPromptOpen(false);
        window.location.hash = '#/verify/student';
      }}
    >
      <div className="chsi-gate-body">
        <StudentShield />
        <p>{tripMessages.studentVerifyGateBody}</p>
      </div>
    </Modal>
  );

  return { allowed, requireVerified, prompt };
}

/** 直接深链进入受保护页面（发布 / 分享体验）时的整页提示。 */
export function StudentVerificationRequiredNotice({ currentUser }: { currentUser: DemoUser }) {
  return (
    <main className="form-page">
      <section className="chsi-required-card">
        <StudentShield />
        <h1>{tripMessages.studentVerifyRequiredTitle}</h1>
        <p>{tripMessages.studentVerifyRequiredBody}</p>
        <div className="chsi-required-actions">
          <Button type="primary" size="large" onClick={() => (window.location.hash = '#/verify/student')}>
            {tripMessages.studentVerifyGateGo}
          </Button>
          <Button size="large" onClick={() => (window.location.hash = '#/')}>
            {tripMessages.backHome}
          </Button>
        </div>
        <span className="chsi-required-user">当前身份：{currentUser.nickname}</span>
      </section>
    </main>
  );
}
