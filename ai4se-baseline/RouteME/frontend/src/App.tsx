import { useEffect, useState } from 'react';
import { Alert, Button, ConfigProvider, Space, Spin, Typography, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AdminDashboardPage } from './admin/dashboard/AdminDashboardPage';
import { AdminGuard } from './admin/AdminGuard';
import { AdminReportDetailPage } from './admin/reports/AdminReportDetailPage';
import { AdminReportsPage } from './admin/reports/AdminReportsPage';
import { AdminServiceDetailPage } from './admin/service/AdminServiceDetailPage';
import { AdminServicePage } from './admin/service/AdminServicePage';
import { AdminUserDetailPage } from './admin/users/AdminUserDetailPage';
import { AdminUsersPage } from './admin/users/AdminUsersPage';
import { loadSessionUser, loadUsers, logoutAccount } from './api';
import { ChatPage } from './chat/ChatPage';
import { CreditProvider } from './credit/CreditContext';
import { ShareExperiencePage } from './experiences/ShareExperiencePage';
import { HelpPage } from './help/HelpPage';
import { HomePage } from './home/HomePage';
import { tripMessages } from './i18n/tripMessages';
import { IdentityGate } from './identity/IdentityGate';
import { MyTripsPage } from './mine/MyTripsPage';
import { MapExplorerPage } from './pages/MapExplorerPage';
import { AiPlannerPage } from './pages/AiPlannerPage';
import { ProfilePage } from './profile/ProfilePage';
import { ProfileProvider } from './profiles/ProfileContext';
import { profileToUser } from './profile/profileDisplay';
import { ProfileSetupPage } from './profile/ProfileSetupPage';
import { parseRoute, routeToHash, type Route } from './route';
import { AppShell } from './shell/AppShell';
import { buildTheme } from './theme';
import { TripCreatePage } from './trips/TripCreatePage';
import { TripDetailPage } from './trips/TripDetailPage';
import { ApplicationsPage } from './trips/ApplicationsPage';
import type { AuthSession, DemoUser, UserProfile } from './types';

const CURRENT_USER_KEY = 'routeme.currentUserId';
const AUTH_TOKEN_KEY = 'routeme.authToken';
const APP_THEME = buildTheme();

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(readStoredUserId);
  const [authToken, setAuthToken] = useState<string | null>(readStoredToken);
  const [restoring, setRestoring] = useState<boolean>(() => readStoredToken() !== null);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    loadUsers()
      .then(setUsers)
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

  const handleAuthenticated = (session: AuthSession) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
    window.localStorage.setItem(CURRENT_USER_KEY, String(session.user.id));
    setAuthToken(session.token);
    setUsers((previous) => mergeUser(previous, session.user));
    setCurrentUserId(session.user.id);
    // 只在登录/注册这一跳引导；其余路由不做全局守卫（RV-2 / RV-7）。
    if (!session.user.profile_complete) {
      window.location.hash = '#/profile/setup';
    }
  };

  const handleProfileSaved = (profile: UserProfile) => {
    setUsers((previous) => mergeUser(previous, profileToUser(profile)));
  };

  const logout = () => {
    const token = authToken;
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(CURRENT_USER_KEY);
    setAuthToken(null);
    setCurrentUserId(null);
    window.location.hash = '#/';
    if (token !== null) {
      void logoutAccount(token).catch(() => {
        message.warning(tripMessages.authLogoutWarning);
      });
    }
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

    if (users === null || restoring) {
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
        <IdentityGate onAuthenticated={handleAuthenticated} />
      );
    }

    return (
      <ProfileProvider currentUser={currentUser}>
        <CreditProvider currentUser={currentUser}>
          <AppShell currentUser={currentUser} onLogout={logout} route={route}>
            {route.name === 'home' && <HomePage currentUser={currentUser} />}
            {route.name === 'create' && (
              <TripCreatePage
                currentUser={currentUser}
                fromTripId={route.fromTripId}
                aiItineraryId={route.aiItineraryId}
              />
            )}
            {route.name === 'aiPlanner' && <AiPlannerPage currentUser={currentUser} />}
            {route.name === 'share' && (
              <ShareExperiencePage currentUser={currentUser} tripId={route.tripId} />
            )}
            {route.name === 'detail' && (
              <TripDetailPage currentUser={currentUser} tripId={route.tripId} />
            )}
            {route.name === 'applications' && (
              <ApplicationsPage currentUser={currentUser} tripId={route.tripId} />
            )}
            {route.name === 'mine' && (
              <MyTripsPage currentUser={currentUser} />
            )}
            {route.name === 'map' && (
              <MapExplorerPage provinceCode={route.provinceCode} cityCode={route.cityCode} />
            )}
            {route.name === 'profileSetup' && (
              <ProfileSetupPage
                currentUser={currentUser}
                token={authToken}
                onSaved={handleProfileSaved}
              />
            )}
            {route.name === 'userProfile' && (
              <ProfilePage
                currentUser={currentUser}
                userId={route.userId}
                canEdit={authToken !== null}
              />
            )}
            {route.name === 'chat' && (
              <ChatPage
                currentUser={currentUser}
                tripId={route.tripId}
                otherUserId={route.userId}
              />
            )}
            {route.name === 'help' && <HelpPage currentUser={currentUser} token={authToken} />}
            {route.name === 'adminDashboard' && (
              <AdminGuard currentUser={currentUser} token={authToken}>
                {(token) => <AdminDashboardPage token={token} />}
              </AdminGuard>
            )}
            {route.name === 'adminUsers' && (
              <AdminGuard currentUser={currentUser} token={authToken}>
                {(token) => <AdminUsersPage token={token} />}
              </AdminGuard>
            )}
            {route.name === 'adminUserDetail' && (
              <AdminGuard currentUser={currentUser} token={authToken}>
                {(token) => (
                  <AdminUserDetailPage
                    token={token}
                    userId={route.userId}
                    currentUser={currentUser}
                  />
                )}
              </AdminGuard>
            )}
            {route.name === 'adminReports' && (
              <AdminGuard currentUser={currentUser} token={authToken}>
                {(token) => <AdminReportsPage token={token} />}
              </AdminGuard>
            )}
            {route.name === 'adminReportDetail' && (
              <AdminGuard currentUser={currentUser} token={authToken}>
                {(token) => <AdminReportDetailPage token={token} reportId={route.reportId} />}
              </AdminGuard>
            )}
            {route.name === 'adminService' && (
              <AdminGuard currentUser={currentUser} token={authToken}>
                {(token) => <AdminServicePage token={token} currentUser={currentUser} />}
              </AdminGuard>
            )}
            {route.name === 'adminServiceDetail' && (
              <AdminGuard currentUser={currentUser} token={authToken}>
                {(token) => (
                  <AdminServiceDetailPage
                    token={token}
                    currentUser={currentUser}
                    sessionId={route.sessionId}
                  />
                )}
              </AdminGuard>
            )}
            {route.name === 'notFound' && <PlaceholderPage text={tripMessages.detailNotFound} />}
          </AppShell>
        </CreditProvider>
      </ProfileProvider>
    );
  };

  return (
    <ConfigProvider theme={APP_THEME} locale={zhCN}>
      {renderContent()}
    </ConfigProvider>
  );
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