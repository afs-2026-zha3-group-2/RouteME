import { useEffect, useState } from 'react';
import { Alert, Button, ConfigProvider, Space, Spin, Typography } from 'antd';
import { loadUsers } from './api';
import { ChatPage } from './chat/ChatPage';
import { ShareExperiencePage } from './experiences/ShareExperiencePage';
import { HomePage } from './home/HomePage';
import { tripMessages } from './i18n/tripMessages';
import { IdentityGate } from './identity/IdentityGate';
import { MyTripsPage } from './mine/MyTripsPage';
import { parseRoute, routeToHash, type Route } from './route';
import { AppShell } from './shell/AppShell';
import { useColorMode } from './shell/useColorMode';
import { buildTheme } from './theme';
import { TripCreatePage } from './trips/TripCreatePage';
import { TripDetailPage } from './trips/TripDetailPage';
import { ApplicationsPage } from './trips/ApplicationsPage';
import type { DemoUser } from './types';

const CURRENT_USER_KEY = 'routeme.currentUserId';

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
  const { mode, toggleMode } = useColorMode();

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

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  const currentUser = users?.find((user) => user.id === currentUserId) ?? null;

  const selectUser = (user: DemoUser) => {
    setCurrentUserId(user.id);
    window.localStorage.setItem(CURRENT_USER_KEY, String(user.id));
  };

  const renderContent = () => {
    if (loadError !== null) {
      return (
        <main className="trip-page">
          <Alert
            type="error"
            showIcon
            title={tripMessages.failedTitle}
            description={loadError}
            action={<Button onClick={() => window.location.reload()}>{tripMessages.retry}</Button>}
          />
        </main>
      );
    }

    if (users === null) {
      return (
        <main className="trip-page">
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
      <AppShell
        currentUser={currentUser}
        users={users}
        route={route}
        mode={mode}
        onToggleMode={toggleMode}
        onSelectUser={selectUser}
      >
        {route.name === 'home' && <HomePage currentUser={currentUser} />}
        {route.name === 'create' && (
          <TripCreatePage currentUser={currentUser} fromTripId={route.fromTripId} />
        )}
        {route.name === 'share' && (
          <ShareExperiencePage currentUser={currentUser} tripId={route.tripId} />
        )}
        {route.name === 'detail' && (
          <TripDetailPage currentUser={currentUser} tripId={route.tripId} />
        )}
        {route.name === 'applications' && (
          <ApplicationsPage currentUser={currentUser} tripId={route.tripId} />
        )}
        {route.name === 'mine' && <MyTripsPage currentUser={currentUser} />}
        {route.name === 'chat' && (
          <ChatPage
            currentUser={currentUser}
            tripId={route.tripId}
            otherUserId={route.userId}
          />
        )}
        {route.name === 'notFound' && <PlaceholderPage text={tripMessages.detailNotFound} />}
      </AppShell>
    );
  };

  return <ConfigProvider theme={buildTheme(mode)}>{renderContent()}</ConfigProvider>;
}

function PlaceholderPage({ text }: { text: string }) {
  return (
    <main className="trip-page">
      <Typography.Title level={2} className="page-title">
        {text}
      </Typography.Title>
      <a className="ghost-link" href={routeToHash({ name: 'home' })}>
        {tripMessages.backHome}
      </a>
    </main>
  );
}