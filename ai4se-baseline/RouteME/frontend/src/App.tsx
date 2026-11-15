import { useEffect, useState } from 'react';
import { Alert, Button, Layout, Select, Space, Spin, Typography } from 'antd';
import { loadUsers } from './api';
import { HomePage } from './home/HomePage';
import { tripMessages } from './i18n/tripMessages';
import { IdentityGate } from './identity/IdentityGate';
import { parseRoute, routeToHash, type Route } from './route';
import type { DemoUser } from './types';

const CURRENT_USER_KEY = 'routeme.currentUserId';
const { Content, Header } = Layout;

function readStoredUserId(): number | null {
  const raw = window.localStorage.getItem(CURRENT_USER_KEY);
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

export function App() {
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(readStoredUserId);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    loadUsers()
      .then((loaded) => setUsers(loaded))
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'UNKNOWN_ERROR');
      });
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const currentUser = users?.find((user) => user.id === currentUserId) ?? null;

  const selectUser = (user: DemoUser) => {
    setCurrentUserId(user.id);
    window.localStorage.setItem(CURRENT_USER_KEY, String(user.id));
  };

  if (loadError !== null) {
    return (
      <main className="home-page">
        <Alert
          type="error"
          showIcon
          message={tripMessages.failedTitle}
          description={loadError}
          action={<Button onClick={() => window.location.reload()}>{tripMessages.retry}</Button>}
        />
      </main>
    );
  }

  if (users === null) {
    return (
      <main className="home-page">
        <Space size="small">
          <Spin size="small" />
          <Typography.Text>{tripMessages.loading}</Typography.Text>
        </Space>
      </main>
    );
  }

  if (currentUser === null) {
    return <IdentityGate users={users} onSelect={selectUser} />;
  }

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <a className="brand" href={routeToHash({ name: 'home' })}>
          {tripMessages.appName}
        </a>
        <Space size="middle">
          <Button onClick={() => (window.location.hash = routeToHash({ name: 'create' }))}>
            {tripMessages.publish}
          </Button>
          <Select
            value={currentUser.id}
            aria-label={tripMessages.identitySwitch}
            options={users.map((user) => ({ value: user.id, label: user.nickname }))}
            onChange={(id) => {
              const next = users.find((user) => user.id === id);
              if (next !== undefined) {
                selectUser(next);
              }
            }}
          />
        </Space>
      </Header>
      <Content>
        {route.name === 'home' && <HomePage />}
        {route.name === 'create' && <PlaceholderPage text={tripMessages.createTitle} />}
        {route.name === 'detail' && <PlaceholderPage text={tripMessages.detailTitle} />}
        {route.name === 'notFound' && <PlaceholderPage text={tripMessages.detailNotFound} />}
      </Content>
    </Layout>
  );
}

function PlaceholderPage({ text }: { text: string }) {
  return (
    <main className="home-page">
      <Typography.Title level={3}>{text}</Typography.Title>
    </main>
  );
}