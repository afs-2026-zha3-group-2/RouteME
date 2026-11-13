import { Alert, Button, Card, Space, Spin, Tag, Typography } from 'antd';
import { messages } from '../i18n/messages';
import { useGreeting } from './useGreeting';

export function HomePage() {
  const { state, reload } = useGreeting();

  return (
    <main className="home-page">
      <Card className="home-card">
        <Space orientation="vertical" size="middle" className="home-stack">
          <Typography.Text type="secondary">{messages.eyebrow}</Typography.Text>
          {state.status === 'loading' && (
            <Space size="small">
              <Spin size="small" />
              <Typography.Text>{messages.loading}</Typography.Text>
            </Space>
          )}
          {state.status === 'failed' && (
            <Alert
              type="error"
              showIcon
              message={messages.failedTitle}
              description={state.code}
              action={
                <Button size="small" onClick={reload}>
                  {messages.retry}
                </Button>
              }
            />
          )}
          {state.status === 'ready' && (
            <Space orientation="vertical" size="small">
              <Typography.Title level={1} className="home-greeting">
                {state.greeting.message}
              </Typography.Title>
              <Tag color="blue">{messages.sourceTag}</Tag>
            </Space>
          )}
          <Typography.Paragraph type="secondary" className="home-description">
            {messages.description}
          </Typography.Paragraph>
        </Space>
      </Card>
    </main>
  );
}
