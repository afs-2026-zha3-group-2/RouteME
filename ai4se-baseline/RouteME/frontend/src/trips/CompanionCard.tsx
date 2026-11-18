import { GrowthBadge } from '../growth/GrowthBadge';
import { publisherSummary } from '../profile/profileDisplay';
import { Avatar } from '../shell/Avatar';
import type { DemoUser, UserGrowthEntry } from '../types';
import { tripMessages } from '../i18n/tripMessages';

type Props = {
  member: DemoUser;
  /** 批量读取的成长等级；缺失时不展示。 */
  growth?: UserGrowthEntry;
  canChat: boolean;
  chatHref: string;
  onOpenProfile: (userId: number) => void;
};

/**
 * 同行者资料卡：排版类复用发布者卡片（`.publisher-*`），保证两处信息密度一致。
 * 改发布者卡片字号 / 间距时会同时影响这里，这是有意为之，不要另起一套同义类名。
 */
export function CompanionCard({ member, growth, canChat, chatHref, onOpenProfile }: Props) {
  const summary = publisherSummary(member);
  return (
    <li className="companion-card">
      <button
        type="button"
        className="publisher-row publisher-button"
        aria-label={`查看 ${member.nickname} 的资料`}
        onClick={() => onOpenProfile(member.id)}
      >
        <Avatar user={member} size="lg" />
        <span className="publisher-body">
          <span className="publisher-name">
            {member.nickname}
            {summary !== '' && ` · ${summary}`}
          </span>
          {growth !== undefined && <GrowthBadge level={growth.level} />}
          {member.bio !== '' && <span className="publisher-bio">{member.bio}</span>}
          {member.interests.length > 0 && (
            <span className="publisher-tags">
              {member.interests.map((interest) => (
                <span key={interest} className="tag">
                  {interest}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
      {canChat && (
        <a className="ghost-link companion-chat" href={chatHref}>
          {tripMessages.mineChatEntry}
        </a>
      )}
    </li>
  );
}
