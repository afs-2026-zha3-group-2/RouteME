import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Space, Spin, Typography } from 'antd';
import { loadUserProfile } from '../api';
import { profileMessages } from '../i18n/profileMessages';
import { creditLine, creditTone } from '../profile/creditDisplay';
import { Avatar } from '../shell/Avatar';
import type { DemoUser, UserProfile } from '../types';
import { formatJoinedAt, sharedInterests } from './profileFormat';

type Props = {
  currentUser: DemoUser;
  /** null 表示弹窗关闭；每次打开都会重新读取，不保留上一次的资料。 */
  userId: number | null;
  onClose: () => void;
};

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; profile: UserProfile }
  | { status: 'failed'; code: string };

export function ProfileModal({ currentUser, userId, onClose }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });

  useEffect(() => {
    if (userId === null) {
      setState({ status: 'idle' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    loadUserProfile(userId, currentUser.id)
      .then((profile) => {
        if (active) {
          setState({ status: 'ready', profile });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'failed',
            code: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [userId, currentUser.id]);

  return (
    <Modal
      open={userId !== null}
      title={profileMessages.title}
      onCancel={onClose}
      footer={<Button onClick={onClose}>{profileMessages.close}</Button>}
      width={480}
      centered
    >
      {state.status === 'loading' && (
        <Space size="small">
          <Spin size="small" />
          <Typography.Text>{profileMessages.loading}</Typography.Text>
        </Space>
      )}
      {state.status === 'failed' && (
        <Alert
          type="error"
          showIcon
          title={
            state.code === 'USER_NOT_FOUND'
              ? profileMessages.userNotFound
              : profileMessages.loadFailed
          }
          description={state.code === 'USER_NOT_FOUND' ? undefined : state.code}
        />
      )}
      {state.status === 'ready' && (
        <ProfileBody currentUser={currentUser} profile={state.profile} />
      )}
    </Modal>
  );
}

function ProfileBody({ currentUser, profile }: { currentUser: DemoUser; profile: UserProfile }) {
  const isMe = currentUser.id === profile.id;
  const shared = sharedInterests(currentUser, profile);
  const identity = [profile.school, profile.major, profile.job, profile.mbti]
    .map((value) => (value ?? '').trim())
    .filter((value) => value !== '')
    .join(' · ');
  const stats = profile.stats ?? { published: 0, completed: 0, joined: 0, shared: 0 };

  return (
    <div className="profile-modal">
      <div className="profile-modal-top">
        <Avatar user={profile} size="xl" />
        <span className="profile-modal-identity">
          <span className="profile-modal-name">
            {profile.nickname}
            {isMe && <span className="badge dusk no-dot">{profileMessages.thisIsYou}</span>}
          </span>
          {identity !== '' && <span className="profile-modal-meta">{identity}</span>}
          <span className={`profile-credit is-compact ${creditTone(profile.credit_level)}`}>
            {creditLine(profile.credit_score, profile.credit_level)}
          </span>
          {profile.joined_at !== null && profile.joined_at !== undefined && (
            <span className="profile-modal-joined">
              {profileMessages.joinedPrefix} {formatJoinedAt(profile.joined_at, new Date())}
            </span>
          )}
        </span>
      </div>

      {profile.bio !== null && profile.bio !== undefined && profile.bio !== '' && (
        <p className="profile-modal-bio">{profile.bio}</p>
      )}

      {profile.interests.length > 0 && (
        <div className="profile-modal-tags">
          {profile.interests.map((interest) => (
            <span key={interest} className={shared.includes(interest) ? 'tag hit' : 'tag'}>
              {interest}
            </span>
          ))}
        </div>
      )}

      {shared.length > 0 && (
        <p className="profile-modal-shared">
          {profileMessages.sharedInterests}
          {shared.join('、')}
        </p>
      )}

      <div className="profile-stats">
        <span className="profile-stat">
          <b>{stats.published}</b>
          <span>{profileMessages.statsPublished}</span>
        </span>
        <span className="profile-stat">
          <b>{stats.completed}</b>
          <span>{profileMessages.statsCompleted}</span>
        </span>
        <span className="profile-stat">
          <b>{stats.joined}</b>
          <span>{profileMessages.statsJoined}</span>
        </span>
        <span className="profile-stat">
          <b>{stats.shared}</b>
          <span>{profileMessages.statsShared}</span>
        </span>
      </div>

      <p className="privacy-note">{profileMessages.privacyNote}</p>
    </div>
  );
}
