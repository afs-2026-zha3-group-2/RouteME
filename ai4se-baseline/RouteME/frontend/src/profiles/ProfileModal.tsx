import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Space, Spin, Typography } from 'antd';
import { loadUserProfile } from '../api';
import { profileMessages } from '../i18n/profileMessages';
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
    loadUserProfile(userId)
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
  }, [userId]);

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

  return (
    <div className="profile-body">
      <div className="profile-top">
        <Avatar user={profile} size="xl" />
        <span className="profile-identity">
          <span className="profile-name">
            {profile.nickname}
            {isMe && <span className="badge dusk no-dot">{profileMessages.thisIsYou}</span>}
          </span>
          <span className="profile-school">{profile.school}</span>
          <span className="profile-joined">
            {profileMessages.joinedPrefix} {formatJoinedAt(profile.joined_at, new Date())}
          </span>
        </span>
      </div>

      <p className="profile-bio">{profile.bio}</p>

      <div className="profile-tags">
        {profile.interests.map((interest) => (
          <span key={interest} className={shared.includes(interest) ? 'tag hit' : 'tag'}>
            {interest}
          </span>
        ))}
      </div>

      {shared.length > 0 && (
        <p className="profile-shared">
          {profileMessages.sharedInterests}
          {shared.join('、')}
        </p>
      )}

      <div className="profile-stats">
        <span className="profile-stat">
          <b>{profile.stats.published}</b>
          <span>{profileMessages.statsPublished}</span>
        </span>
        <span className="profile-stat">
          <b>{profile.stats.completed}</b>
          <span>{profileMessages.statsCompleted}</span>
        </span>
        <span className="profile-stat">
          <b>{profile.stats.joined}</b>
          <span>{profileMessages.statsJoined}</span>
        </span>
        <span className="profile-stat">
          <b>{profile.stats.shared}</b>
          <span>{profileMessages.statsShared}</span>
        </span>
      </div>

      <p className="privacy-note">{profileMessages.privacyNote}</p>
    </div>
  );
}
