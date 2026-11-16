import { useEffect, useState } from 'react';
import { Alert, Button, ConfigProvider, Space, Spin, Typography } from 'antd';
import { loadDemoUsers, loadSessionUser, loadUsers, logoutAccount } from './api';
import { ChatPage } from './chat/ChatPage';
import { ShareExperiencePage } from './experiences/ShareExperiencePage';
import { HomePage } from './home/HomePage';
import { tripMessages } from './i18n/tripMessages';
import { IdentityGate } from './identity/IdentityGate';
import { MyTripsPage } from './mine/MyTripsPage';
import { ProfileProvider } from './profiles/ProfileContext';
import { parseRoute, routeToHash, type Route } from './route';
import { AppShell } from './shell/AppShell';
import { useColorMode } from './shell/useColorMode';
import { buildTheme } from './theme';
import { TripCreatePage } from './trips/TripCreatePage';
import { TripDetailPage } from './trips/TripDetailPage';
import { ApplicationsPage } from './trips/ApplicationsPage';
import type { AuthSession, DemoUser } from './types';

const CURRENT_USER_KEY = 'routeme.currentUserId';
const AUTH_TOKEN_KEY = 'routeme.authToken';

function readStoredUserId(): number | null {
  const raw = window.localStorage.getItem(CURRENT_USER_KEY);
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

function readStoredToken(): string | null {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  return token === null || token === '' ? null : token;
}

function mergeUser(list: DemoUser[] | null, user: DemoUser): DemoUser[] {
  const rest = (list ?? []).filter((item) => item.id !== user.id);
  return [...rest, user].sort((left, right) => left.id - right.id);
}

export function App() {
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(readStoredUserId);
  const [authToken, setAuthToken] = useState<string | null>(readStoredToken);
  const [restoring, setRestoring] = useState<boolean>(() => readStoredToken() !== null);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const { mode, toggleMode } = useColorMode();

  useEffect(() => {
    Promise.all([loadUsers(), loadDemoUsers()])
      .then(([loadedUsers, loadedDemoUsers]) => {
        setUsers(loadedUsers);
        setDemoUsers(loadedDemoUsers);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'UNKNOWN_ERROR');
      });
  }, []);

  useEffect(() => {
    const token = readStoredToken();
    if (token === null) {
      setRestoring(false);
      return;
    }
    let active = true;
    loadSessionUser(token)
      .then((user) => {
        if (!active) {
          return;
        }
        setUsers((previous) => mergeUser(previous, user));
        setCurrentUserId(user.id);
        window.localStorage.setItem(CURRENT_USER_KEY, String(user.id));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken(null);
      })
      .finally(() => {
        if (active) {
          setRestoring(false);
        }
      });
    return () => {
      active = false;
    };
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
    if (authToken !== null) {
      void logoutAccount(authToken).catch(() => undefined);
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      setAuthToken(null);
    }
    setCurrentUserId(user.id);
    window.localStorage.setItem(CURRENT_USER_KEY, String(user.id));
  };

  const handleAuthenticated = (session: AuthSession) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
    window.localStorage.setItem(CURRENT_USER_KEY, String(session.user.id));
    setAuthToken(session.token);
    setUsers((previous) => mergeUser(previous, session.user));
    setCurrentUserId(session.user.id);
  };

  const logout = () => {
    if (authToken !== null) {
      void logoutAccount(authToken).catch(() => undefined);
    }
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(CURRENT_USER_KEY);
    setAuthToken(null);
    setCurrentUserId(null);
    window.location.hash = '#/';
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

    if (users === null || demoUsers === null || restoring) {
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
      return (
        <IdentityGate
          users={demoUsers}
          onSelect={selectUser}
          onAuthenticated={handleAuthenticated}
        />
      );
    }

    return (
      <ProfileProvider currentUser={currentUser}>
        <AppShell
          currentUser={currentUser}
          demoUsers={demoUsers}
          isAuthenticated={authToken !== null}
          onLogout={logout}
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
      </ProfileProvider>
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