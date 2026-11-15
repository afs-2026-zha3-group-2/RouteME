import { Button, Card, Space, Typography } from 'antd';
import { tripMessages } from '../i18n/tripMessages';
import type { DemoUser } from '../types';

type Props = {
  users: DemoUser[];
  onSelect: (user: DemoUser) => void;
};

export function IdentityGate({ users, onSelect }: Props) {
  return (
    <main className="gate-page">
      <Card className="gate-card">
        <Space orientation="vertical" size="middle" className="home-stack">
          <Typography.Title level={2}>{tripMessages.identityTitle}</Typography.Title>
          <Typography.Text type="secondary">{tripMessages.identityHint}</Typography.Text>
          <Space orientation="vertical" size="small" className="gate-list">
            {users.map((user) => (
              <Button key={user.id} block size="large" onClick={() => onSelect(user)}>
                {user.nickname} · {user.school}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>
    </main>
  );
}