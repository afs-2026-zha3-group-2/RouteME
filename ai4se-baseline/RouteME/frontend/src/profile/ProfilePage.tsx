import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton, Typography } from 'antd';
import { loadUserProfile } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import type { DemoUser, UserProfile } from '../types';
import { AccountStatusBanner } from './AccountStatusBanner';
import {
  ageZodiacLabel,
  hasPublicContent,
  publisherSummary,
  schoolMajor,
} from './profileDisplay';
import { creditLine, creditRestrictionNote, creditRestrictedBadge, creditTone } from './creditDisplay';
import { interestLabel } from './profileOptions';
import { routeCompletionLine } from './routeCompletionDisplay';

type Props = {
  currentUser: DemoUser;
  userId: number;
  /** 只有带有效会话的本人可以编辑；无会话时只读。 */
  canEdit: boolean;
};

/**
 * 个人主页（`#/users/{id}`）：本人可编辑，他人只读；
 * 资料未完善时展示已有字段与提示，不伪造空行。
 */
export function ProfilePage({ currentUser, userId, canEdit }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setError(null);
    loadUserProfile(userId, currentUser.id)
      .then((loaded) => {
        if (active) {
          setProfile(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser.id, userId]);

  if (error !== null) {
    return (
      <main className="profile-page profile-public">
        <Alert
          type="error"
          showIcon
          title={
            error === 'USER_NOT_FOUND'
              ? tripMessages.profileNotFound
              : tripMessages.profileLoadFailed
          }
          description={error}
          action={
            <Button onClick={() => (window.location.hash = '#/')}>
              {tripMessages.backHome}
            </Button>
          }
        />
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="profile-page profile-public">
        <div className="profile-card">
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        </div>
      </main>
    );
  }

  const isSelf = profile.id === currentUser.id;
  const ageZodiac = ageZodiacLabel(profile);
  const schoolAndMajor = schoolMajor(profile);
  const summary = publisherSummary(profile);
  const completion = routeCompletionLine(profile.route_completion_state, profile.route_completion_rate);
  const interests = profile.interests;
  const hasFacts =
    schoolAndMajor !== '' ||
    (profile.job ?? '') !== '' ||
    (profile.mbti ?? '') !== '' ||
    (profile.travel_style ?? '') !== '';

  return (
    <main className="profile-page profile-public">
      <header className="profile-hero profile-card">
        <Avatar user={profile} size="xl" />
        <div className="profile-hero-main">
          <Typography.Title level={2} className="profile-name">
            {profile.nickname}
            {profile.profile_complete ? (
              <span className="badge jade">{tripMessages.profileCompleteBadge}</span>
            ) : (
              <span className="badge muted">{tripMessages.profileIncompleteBadge}</span>
            )}
          </Typography.Title>
          <p className="profile-hero-meta">
            {ageZodiac !== '' && <span>{ageZodiac}</span>}
            {(profile.city ?? '') !== '' && <span>{profile.city}</span>}
            {(profile.gender ?? '') !== '' && <span>{profile.gender}</span>}
          </p>
          <p className={`profile-credit ${creditTone(profile.credit_level)}`}>
            {creditLine(profile.credit_score, profile.credit_level)}
            {profile.credit_restricted && (
              <span className="badge danger credit-restricted-badge">
                {creditRestrictedBadge(profile.credit_restricted)}
              </span>
            )}
          </p>
          <p className={`profile-completion ${completion.tone}`}>{completion.text}</p>
          {isSelf && profile.credit_restricted && (
            <p className="restriction-note">
              {creditRestrictionNote(profile.credit_restriction_reason)}
            </p>
          )}
          {(schoolAndMajor !== '' ||
            (profile.job ?? '') !== '' ||
            (profile.mbti ?? '') !== '' ||
            (profile.travel_style ?? '') !== '') && (
            <div className="profile-chips">
              {schoolAndMajor !== '' && <span className="chip">{schoolAndMajor}</span>}
              {(profile.job ?? '') !== '' && <span className="chip">{profile.job}</span>}
              {(profile.mbti ?? '') !== '' && <span className="chip">{profile.mbti}</span>}
              {(profile.travel_style ?? '') !== '' && (
                <span className="chip">{profile.travel_style}</span>
              )}
            </div>
          )}
        </div>
        {isSelf && canEdit && (
          <Button onClick={() => (window.location.hash = '#/profile/setup')}>
            {tripMessages.profileEditEntry}
          </Button>
        )}
      </header>

      {/* 本人受限时顶栏已有同一条提示，避免同一页重复两次。 */}
      {!isSelf && (
        <AccountStatusBanner
          status={profile.status}
          banReasonCode={profile.ban_reason_code}
          banExpiresAt={profile.ban_expires_at}
        />
      )}

      {!profile.profile_complete && (
        <Alert
          type="info"
          showIcon
          className="profile-incomplete-notice"
          title={tripMessages.profileIncompleteNoticeTitle}
          description={tripMessages.profileIncompleteNoticeBody}
        />
      )}

      {!hasPublicContent(profile) ? (
        <p className="profile-empty profile-card">{tripMessages.profileEmpty}</p>
      ) : (
        <div className="profile-body">
          {profile.profile_complete && hasFacts && (
            <section className="profile-card">
              <h3 className="profile-section-title">{tripMessages.profileAbout}</h3>
              <dl className="profile-facts">
                {schoolAndMajor !== '' && (
                  <div className="profile-fact">
                    <dt>{tripMessages.profileFactsSchool}</dt>
                    <dd>{schoolAndMajor}</dd>
                  </div>
                )}
                {(profile.job ?? '') !== '' && (
                  <div className="profile-fact">
                    <dt>{tripMessages.profileFactsJob}</dt>
                    <dd>{profile.job}</dd>
                  </div>
                )}
                {(profile.mbti ?? '') !== '' && (
                  <div className="profile-fact">
                    <dt>{tripMessages.profileFactsMbti}</dt>
                    <dd>{profile.mbti}</dd>
                  </div>
                )}
                {(profile.travel_style ?? '') !== '' && (
                  <div className="profile-fact">
                    <dt>{tripMessages.profileFactsTravelStyle}</dt>
                    <dd>{profile.travel_style}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {!profile.profile_complete && (
            <section className="profile-card">
              <h3 className="profile-section-title">{tripMessages.profileFilledSection}</h3>
              <dl className="profile-facts">
                {summary !== '' && (
                  <div className="profile-fact">
                    <dt>{tripMessages.profileFactsSummary}</dt>
                    <dd>{summary}</dd>
                  </div>
                )}
                {(profile.city ?? '') !== '' && (
                  <div className="profile-fact">
                    <dt>{tripMessages.profileFactsCity}</dt>
                    <dd>{profile.city}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {interests.length > 0 && (
            <section className="profile-card">
              <h3 className="profile-section-title">{tripMessages.profileInterestsSection}</h3>
              <div className="profile-tag-row">
                {interests.map((interest) => (
                  <span key={interest} className="chip">
                    {interestLabel(interest)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {(profile.bio ?? '') !== '' && (
            <section className="profile-card">
              <h3 className="profile-section-title">{tripMessages.profileBioSection}</h3>
              <p className="profile-bio">{profile.bio}</p>
            </section>
          )}
        </div>
      )}
    </main>
  );
}