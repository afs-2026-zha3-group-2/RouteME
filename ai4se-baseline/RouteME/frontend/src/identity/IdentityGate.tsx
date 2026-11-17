import { BrandMark } from '../shell/BrandMark';
import type { AuthSession } from '../types';
import { AuthPanel } from './AuthPanel';
import { GateScene } from './GateScene';

const LOOP_STEPS = ['旅行灵感', '发布行程', '发现同行者', '建立连接', '一起旅行', '分享体验'];

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

export function IdentityGate({ onAuthenticated }: Props) {
  return (
    <main className="gate">
      <GateScene />
      <div className="gate-inner">
        <div className="gate-cols">
          <div className="gate-hero">
            <div className="gate-brand">
              <BrandMark />
              <span className="brand-text">
                <b>
                  Route<span className="brand-me">Me</span>
                </b>
                <i>路觅</i>
              </span>
            </div>

            <p className="gate-tagline">Travel Together, Discover More</p>

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
      </div>
    </main>
  );
}