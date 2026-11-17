import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton, Table, type TableColumnsType } from 'antd';
import { loadAdminReports } from '../../api';
import { adminMessages } from '../../i18n/adminMessages';
import { adminStatusLabel } from '../../help/helpStatus';
import { EmptyState } from '../../shell/EmptyState';
import { Pager } from '../../shell/Pager';
import { SoftSelect } from '../../shell/SoftSelect';
import { usePaging } from '../../shell/usePaging';
import type { AdminReportSummary, Page } from '../../types';
import { AdminLayout } from '../AdminLayout';
import { ReportStatusBadge } from '../adminBadges';
import { adminErrorText, formatDateTime, reportReasonLabel, targetTypeLabel } from '../adminFormat';

type Props = {
  token: string;
};

const STATUS_OPTIONS = [
  { value: '', label: adminMessages.reportsAllStatuses },
  { value: 'PENDING', label: adminStatusLabel('PENDING') },
  { value: 'PROCESSING', label: adminStatusLabel('PROCESSING') },
  { value: 'RESOLVED', label: adminStatusLabel('RESOLVED') },
  { value: 'REJECTED', label: adminStatusLabel('REJECTED') },
];

/** 举报队列：按状态筛选、按举报时间倒序、分页表格。 */
export function AdminReportsPage({ token }: Props) {
  const [status, setStatus] = useState('');
  const { page, size, setPage, setSize } = usePaging(status);
  const [data, setData] = useState<Page<AdminReportSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadAdminReports(token, { status, page, size })
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
  }, [token, status, page, size, reloadKey]);

  const columns: TableColumnsType<AdminReportSummary> = [
    {
      title: adminMessages.colCode,
      dataIndex: 'code',
      width: 88,
    },
    {
      title: adminMessages.colReporter,
      key: 'reporter',
      render: (_, report) => report.reporter.nickname,
    },
    {
      title: adminMessages.colReported,
      key: 'reported',
      render: (_, report) => report.reported_user?.nickname ?? adminMessages.reportedUserUnknown,
    },
    {
      title: adminMessages.colTarget,
      key: 'target',
      render: (_, report) =>
        `${targetTypeLabel(report.target_type)} · ${report.target_label ?? '—'}`,
    },
    {
      title: adminMessages.colReason,
      key: 'reason',
      render: (_, report) => reportReasonLabel(report.reason),
    },
    {
      title: adminMessages.colReportTime,
      key: 'createdAt',
      render: (_, report) => formatDateTime(report.created_at),
    },
    {
      title: adminMessages.colStatus,
      key: 'status',
      width: 108,
      render: (_, report) => <ReportStatusBadge status={report.status} />,
    },
    {
      title: adminMessages.colActions,
      key: 'actions',
      width: 108,
      render: (_, report) => (
        <a className="admin-link" href={`#/admin/reports/${report.id}`}>
          {adminMessages.viewDetail}
        </a>
      ),
    },
  ];

  return (
    <AdminLayout active="reports" title={adminMessages.reportsTitle}>
      <div className="admin-toolbar">
        <div className="admin-filter">
          <span className="admin-filter-label">{adminMessages.reportsStatusFilter}</span>
          <SoftSelect
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
            ariaLabel={adminMessages.reportsStatusFilter}
          />
        </div>
      </div>

      {error !== null && (
        <Alert
          type="error"
          showIcon
          title={adminMessages.loadFailed}
          description={adminErrorText(error)}
          action={
            <Button onClick={() => setReloadKey((previous) => previous + 1)}>
              {adminMessages.retry}
            </Button>
          }
        />
      )}

      {error === null && loading && data === null && (
        <Skeleton active paragraph={{ rows: 6 }} />
      )}

      {error === null && data !== null && data.items.length === 0 && !loading && (
        <EmptyState title={adminMessages.reportsEmpty} text={adminMessages.emptyHint} />
      )}

      {error === null && data !== null && data.items.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <Table<AdminReportSummary>
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={data.items}
              pagination={false}
            />
          </div>

          <div className="admin-card-list">
            {data.items.map((report) => (
              <article className="admin-card" key={report.id}>
                <div className="admin-card-head">
                  <b className="admin-code">{report.code}</b>
                  <ReportStatusBadge status={report.status} />
                </div>
                <dl className="admin-card-facts">
                  <div>
                    <dt>{adminMessages.colReporter}</dt>
                    <dd>{report.reporter.nickname}</dd>
                  </div>
                  <div>
                    <dt>{adminMessages.colReported}</dt>
                    <dd>{report.reported_user?.nickname ?? adminMessages.reportedUserUnknown}</dd>
                  </div>
                  <div>
                    <dt>{adminMessages.colTarget}</dt>
                    <dd>
                      {targetTypeLabel(report.target_type)} · {report.target_label ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>{adminMessages.colReason}</dt>
                    <dd>{reportReasonLabel(report.reason)}</dd>
                  </div>
                  <div>
                    <dt>{adminMessages.colReportTime}</dt>
                    <dd>{formatDateTime(report.created_at)}</dd>
                  </div>
                </dl>
                <a className="admin-link" href={`#/admin/reports/${report.id}`}>
                  {adminMessages.viewDetail}
                </a>
              </article>
            ))}
          </div>

          <Pager
            page={data.page}
            size={data.size}
            total={data.total}
            totalPages={data.total_pages}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        </>
      )}
    </AdminLayout>
  );
}