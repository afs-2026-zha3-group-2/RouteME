import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Skeleton, Space, Typography } from 'antd';
import { loadMessages, loadTrip, loadUsers, sendMessage } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { ReportModal } from '../safety/ReportModal';
import { SafetyNote } from '../safety/SafetyNote';
import { Avatar } from '../shell/Avatar';
import type { ChatMessage, DemoUser, TripDetail } from '../types';

const POLL_INTERVAL_MS = 5000;
const MAX_CONTENT_LENGTH = 500;

type Props = {
  currentUser: DemoUser;
  tripId: number;
  otherUserId: number;
};

export function ChatPage({ currentUser, tripId, otherUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [otherUser, setOtherUser] = useState<DemoUser | null>(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

    const reload = useCallback(() => {
      loadMessages(currentUser.id, tripId, otherUserId)
        .then((loaded) => {
          setMessages(loaded);
        })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
      });
  }, [currentUser.id, tripId, otherUserId]);

  useEffect(() => {
    let active = true;
    reload();
    loadTrip(currentUser.id, tripId)
      .then((loadedTrip) => {
        if (active) {
          setTrip(loadedTrip);
          setCompleted(loadedTrip.status === 'completed');
        }
      })
      .catch(() => undefined);
    loadUsers()
      .then((loadedUsers) => {
        if (active) {
          setOtherUser(loadedUsers.find((user) => user.id === otherUserId) ?? null);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentUser.id, tripId, otherUserId, reload]);

  useEffect(() => {
    if (completed) {
      return;
    }
    const timer = window.setInterval(reload, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [completed, reload]);

  const send = async () => {
    const trimmed = content.trim();
    if (trimmed === '') {
      return;
    }
    setSending(true);
    setError(null);
    try {
      const saved = await sendMessage(currentUser.id, tripId, otherUserId, trimmed);
      setMessages((previous) => [...(previous ?? []), saved]);
      setContent('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
    } finally {
      setSending(false);
    }
  };

  if (error !== null && messages === null) {
    return (
      <main className="form-page">
        <Alert
          type="error"
          showIcon
          title={tripMessages.chatFailed}
          description={error === 'CHAT_NOT_ALLOWED' ? tripMessages.chatNotAllowed : error}
          action={
            <Button onClick={() => (window.location.hash = `#/trips/${tripId}`)}>
              {tripMessages.detailTitle}
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main className="form-page">
      <Space orientation="vertical" size="middle" className="detail-stack">
        <a href={`#/trips/${tripId}`} className="detail-back">
          {tripMessages.detailTitle}
        </a>
        <Card className="panel chat-panel">
          <Space orientation="vertical" size="small" className="home-stack">
            <div className="chat-head">
              {otherUser !== null && <Avatar user={otherUser} size="lg" />}
              <div className="chat-head-text">
                <Typography.Title level={3} className="trip-title chat-title">
                  {otherUser?.nickname ?? '同行者'}
                </Typography.Title>
                <p className="chat-head-meta">
                  {trip !== null && <span>{trip.title}</span>}
                  {otherUser !== null && <span>{otherUser.school}</span>}
                </p>
                {otherUser !== null && otherUser.interests.length > 0 && (
                  <p className="chat-head-tags">
                    {otherUser.interests.map((interest) => (
                      <span key={interest} className="tag">
                        {interest}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>

            <SafetyNote onReport={() => setReportOpen(true)} />

            {completed && <Alert type="info" showIcon title={tripMessages.chatReadOnly} />}

            {error !== null && messages !== null && (
              <Alert type="error" showIcon title={tripMessages.chatSendFailed} description={error} />
            )}

            {messages === null && <Skeleton active paragraph={{ rows: 4 }} />}

            {messages !== null && messages.length === 0 && (
              <Typography.Text type="secondary">{tripMessages.chatEmpty}</Typography.Text>
            )}

            {messages !== null && messages.length > 0 && (
              <div className="chat-list">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-bubble ${message.sender_id === currentUser.id ? 'mine' : ''}`}
                  >
                    <span className="chat-author">
                      {message.sender_id === currentUser.id
                        ? `${currentUser.nickname}（我）`
                        : (otherUser?.nickname ?? '同行者')}
                    </span>
                    <Typography.Text>{message.content}</Typography.Text>
                    <div className="chat-meta">{new Date(message.sent_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}

            <Space size="small" wrap>
              <Button size="small" onClick={reload}>
                {tripMessages.chatRefresh}
              </Button>
            </Space>

            {!completed && (
              <Space.Compact style={{ width: '100%' }}>
                <Input.TextArea
                  value={content}
                  rows={2}
                  maxLength={MAX_CONTENT_LENGTH}
                  showCount
                  placeholder={tripMessages.chatPlaceholder}
                  onChange={(event) => setContent(event.target.value)}
                />
                <Button type="primary" loading={sending} onClick={send}>
                  {tripMessages.chatSend}
                </Button>
              </Space.Compact>
            )}
          </Space>
        </Card>
      </Space>

      <ReportModal
        userId={currentUser.id}
        open={reportOpen}
        targetType="user"
        targetId={otherUserId}
        onClose={() => setReportOpen(false)}
      />
    </main>
  );
}