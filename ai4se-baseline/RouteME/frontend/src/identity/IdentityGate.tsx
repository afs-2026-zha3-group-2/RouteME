import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import type { AuthSession, DemoUser } from '../types';
import { AuthPanel } from './AuthPanel';

const LOOP_STEPS = ['旅行灵感', '发布行程', '发现同行者', '建立连接', '一起旅行', '分享体验'];

type Props = {
  users: DemoUser[];
  onSelect: (user: DemoUser) => void;
  onAuthenticated: (session: AuthSession) => void;
};

export function IdentityGate({ users, onSelect, onAuthenticated }: Props) {
  return (
    <main className="gate">
      <div className="gate-inner">
        <div className="gate-cols">
          <div className="gate-hero">
            <div className="gate-brand">
              <span className="brand-mark" aria-hidden="true">
                <svg viewBox="0 0 32 32">
                  <path
                    d="M5 24c5-13 17-13 22 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="16" cy="10" r="3.4" fill="currentColor" />
                </svg>
              </span>
              <span className="brand-text">
                <b>RouteMe</b>
                <i>路觅</i>
              </span>
            </div>

            <h1 className="gate-title">
              先有一条想走的路，
              <br />
              再遇到<em>同路的人</em>。
            </h1>

            <p className="gate-sub">
              RouteMe 不是交友软件，也不是攻略平台。这里以真实旅行计划为媒介：看到别人的路线获得灵感，
              发布自己的行程，按目的地、日期和兴趣找到同行者，双方同意后才开始沟通，
              旅行结束再把体验留给下一个人。
            </p>

            <div className="gate-loop">
              {LOOP_STEPS.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
          </div>

          <div className="gate-side">
            <div className="gate-auth">
              <AuthPanel onAuthenticated={onAuthenticated} />
            </div>
          </div>
        </div>

        <p className="gate-divider">{tripMessages.authDivider}</p>

        <div className="gate-cards">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className="gate-card"
              onClick={() => onSelect(user)}
            >
              <Avatar user={user} size="xl" />
              <span className="gate-name-block">
                <span className="gate-name">{user.nickname}</span>
                <span className="gate-school">{user.school}</span>
              </span>
              <span className="gate-bio">{user.bio}</span>
              <span className="gate-tags">
                {user.interests.map((interest) => (
                  <span key={interest} className="tag">
                    {interest}
                  </span>
                ))}
              </span>
              <span className="gate-cta">以 {user.nickname} 的身份进入</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}