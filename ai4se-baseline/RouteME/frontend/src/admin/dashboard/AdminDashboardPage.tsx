import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { loadAdminDashboard } from '../../api';
import { adminStatusLabel } from '../../help/helpStatus';
import { adminMessages } from '../../i18n/adminMessages';
import type { AdminDashboard } from '../../types';
import { AdminLayout } from '../AdminLayout';
import { adminErrorText, formatDateTime } from '../adminFormat';
import { AdminMetricCard, DonutChart, NewWindowMeter, StackBar } from './AdminMetricCard';
import { formatCount } from './dashboardFormat';

type Props = {
  token: string;
};

const USER_ROLE_ORDER = ['USER', 'ADMIN'];
const USER_STATUS_ORDER = ['ACTIVE', 'SUSPENDED', 'BANNED'];
const TRIP_STATUS_ORDER = ['recruiting', 'full', 'ongoing', 'completed', 'cancelled'];
const APPLICATION_STATUS_ORDER = ['pending', 'accepted', 'rejected', 'cancelled', 'left'];
const REPORT_STATUS_ORDER = ['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'];
const SERVICE_SESSION_STATUS_ORDER = ['WAITING', 'HANDLING', 'CLOSED'];

const ROLE_LABELS: Record<string, string> = {
  USER: adminMessages.dashRoleUser,
  ADMIN: adminMessages.dashRoleAdmin,
};

const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: adminMessages.dashStatusActive,
  SUSPENDED: adminMessages.dashStatusSuspended,
  BANNED: adminMessages.dashStatusBanned,
};

const TRIP_STATUS_LABELS: Record<string, string> = {
  recruiting: adminMessages.dashTripRecruiting,
  full: adminMessages.dashTripFull,
  ongoing: adminMessages.dashTripOngoing,
  completed: adminMessages.dashTripCompleted,
  cancelled: adminMessages.dashTripCancelled,
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: adminMessages.dashAppPending,
  accepted: adminMessages.dashAppAccepted,
  rejected: adminMessages.dashAppRejected,
  cancelled: adminMessages.dashAppCancelled,
  left: adminMessages.dashAppLeft,
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: adminStatusLabel('PENDING'),
  PROCESSING: adminStatusLabel('PROCESSING'),
  RESOLVED: adminStatusLabel('RESOLVED'),
  REJECTED: adminStatusLabel('REJECTED'),
};

const SERVICE_SESSION_STATUS_LABELS: Record<string, string> = {
  WAITING: adminMessages.sessionWaiting,
  HANDLING: adminMessages.sessionHandling,
  CLOSED: adminMessages.sessionClosed,
};

function distributionLabel(
  name: string,
  counts: Record<string, number>,
  order: readonly string[],
  labels: Record<string, string>,
): string {
  const items = order.map((key) => `${labels[key] ?? key} ${counts[key] ?? 0}`).join('，');
  return `${name}：${items}`;
}

/**
 * 后台概览：一次请求一个时刻的只读快照。
 *
 * <p>只在首次进入与手动刷新时请求，不轮询；计数 0 原样显示 0；图表只表达本次分布，
 * 不含任何趋势或时间序列。</p>
 */
export function AdminDashboardPage({ token }: Props) {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadAdminDashboard(token)
      .then((loaded) => {
        if (active) {
          setData(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'UNKNOWN_ERROR');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token, reloadKey]);

  const refresh = () => setReloadKey((previous) => previous + 1);
  const ready = data !== null && error === null && !loading;

  return (
    <AdminLayout
      active="dashboard"
      title={adminMessages.dashboardTitle}
      subtitle={adminMessages.dashboardSubtitle}
    >
      <div className="admin-dashboard-bar">
        {ready ? (
          <p className="admin-dashboard-updated" data-testid="dashboard-updated-at">
            {adminMessages.dashboardUpdatedAt}：{formatDateTime(data.generated_at)}
          </p>
        ) : (
          <span />
        )}
        <Button data-testid="dashboard-refresh" onClick={refresh} loading={loading}>
          {adminMessages.dashboardRefresh}
        </Button>
      </div>

      {error !== null && (
        <div data-testid="dashboard-error">
          <Alert
            type="error"
            showIcon
            title={adminMessages.dashboardLoadFailed}
            description={adminErrorText(error)}
            action={
              <Button data-testid="dashboard-retry" onClick={refresh}>
                {adminMessages.retry}
              </Button>
            }
          />
        </div>
      )}

      {error === null && loading && <Skeleton active paragraph={{ rows: 8 }} />}

      {ready && data !== null && (
        <div className="admin-dashboard-grid" data-testid="dashboard-page">
          <AdminMetricCard
            testId="dashboard-card-users"
            title={adminMessages.dashboardUsers}
            total={data.users.total}
            href="#/admin/users"
            hrefLabel={`${adminMessages.dashboardUsers} ${adminMessages.viewDetail}`}
          >
            <StackBar
              counts={data.users.by_role}
              order={USER_ROLE_ORDER}
              labels={ROLE_LABELS}
              ariaLabel={distributionLabel('用户角色分布', data.users.by_role, USER_ROLE_ORDER, ROLE_LABELS)}
              testId="dashboard-chart-users-role"
            />
            <StackBar
              counts={data.users.by_status}
              order={USER_STATUS_ORDER}
              labels={USER_STATUS_LABELS}
              ariaLabel={distributionLabel(
                '用户状态分布',
                data.users.by_status,
                USER_STATUS_ORDER,
                USER_STATUS_LABELS,
              )}
              testId="dashboard-chart-users-status"
            />
            <div className="admin-metric-foot">
              <span>
                {adminMessages.dashboardNew7}
                <b>{formatCount(data.users.new_last_7_days)}</b>
              </span>
              <span>
                {adminMessages.dashboardNew30}
                <b>{formatCount(data.users.new_last_30_days)}</b>
              </span>
            </div>
          </AdminMetricCard>

          <AdminMetricCard
            testId="dashboard-card-trips"
            title={adminMessages.dashboardTrips}
            total={data.trips.total}
          >
            <StackBar
              counts={data.trips.by_status}
              order={TRIP_STATUS_ORDER}
              labels={TRIP_STATUS_LABELS}
              ariaLabel={distributionLabel(
                '行程状态分布',
                data.trips.by_status,
                TRIP_STATUS_ORDER,
                TRIP_STATUS_LABELS,
              )}
            />
            <div className="admin-metric-foot">
              <span>
                {adminMessages.dashboardNew7}
                <b>{formatCount(data.trips.new_last_7_days)}</b>
              </span>
              <span>
                {adminMessages.dashboardNew30}
                <b>{formatCount(data.trips.new_last_30_days)}</b>
              </span>
            </div>
          </AdminMetricCard>

          <AdminMetricCard
            testId="dashboard-card-applications"
            title={adminMessages.dashboardApplications}
            total={data.applications.total}
          >
            <StackBar
              counts={data.applications.by_status}
              order={APPLICATION_STATUS_ORDER}
              labels={APPLICATION_STATUS_LABELS}
              ariaLabel={distributionLabel(
                '同行申请状态分布',
                data.applications.by_status,
                APPLICATION_STATUS_ORDER,
                APPLICATION_STATUS_LABELS,
              )}
            />
          </AdminMetricCard>

          <AdminMetricCard
            testId="dashboard-card-experiences"
            title={adminMessages.dashboardExperiences}
            total={data.experiences.total}
          >
            <NewWindowMeter
              label={adminMessages.dashboardNew7}
              value={data.experiences.new_last_7_days}
              windowDays={7}
              tone={1}
            />
            <NewWindowMeter
              label={adminMessages.dashboardNew30}
              value={data.experiences.new_last_30_days}
              windowDays={30}
              tone={2}
            />
          </AdminMetricCard>

          <AdminMetricCard
            testId="dashboard-card-reports"
            title={adminMessages.dashboardReports}
            total={data.reports.total}
            href="#/admin/reports"
            hrefLabel={`${adminMessages.dashboardReports} ${adminMessages.viewDetail}`}
          >
            <DonutChart
              counts={data.reports.by_status}
              order={REPORT_STATUS_ORDER}
              labels={REPORT_STATUS_LABELS}
              centerValue={data.reports.by_status.PENDING ?? 0}
              centerLabel={adminMessages.dashboardPending}
              ariaLabel={distributionLabel(
                '举报状态分布',
                data.reports.by_status,
                REPORT_STATUS_ORDER,
                REPORT_STATUS_LABELS,
              )}
            />
          </AdminMetricCard>

          <AdminMetricCard
            testId="dashboard-card-service"
            title={adminMessages.dashboardService}
            total={data.service_sessions.total}
            href="#/admin/service"
            hrefLabel={`${adminMessages.dashboardService} ${adminMessages.viewDetail}`}
          >
            <DonutChart
              counts={data.service_sessions.by_status}
              order={SERVICE_SESSION_STATUS_ORDER}
              labels={SERVICE_SESSION_STATUS_LABELS}
              centerValue={data.service_sessions.by_status.WAITING ?? 0}
              centerLabel={adminMessages.dashboardWaiting}
              ariaLabel={distributionLabel(
                '客服会话状态分布',
                data.service_sessions.by_status,
                SERVICE_SESSION_STATUS_ORDER,
                SERVICE_SESSION_STATUS_LABELS,
              )}
            />
          </AdminMetricCard>
        </div>
      )}
    </AdminLayout>
  );
}