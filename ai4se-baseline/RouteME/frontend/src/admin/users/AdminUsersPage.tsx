import { useEffect, useState } from 'react';
import { Alert, Button, Input, Skeleton, Table, type TableColumnsType } from 'antd';
import { loadAdminUsers } from '../../api';
import { adminMessages } from '../../i18n/adminMessages';
import { EmptyState } from '../../shell/EmptyState';
import { Pager } from '../../shell/Pager';
import { SoftSelect } from '../../shell/SoftSelect';
import { usePaging } from '../../shell/usePaging';
import { Avatar } from '../../shell/Avatar';
import type { AdminUserSummary, Page } from '../../types';
import { AdminLayout } from '../AdminLayout';
import { AccountStatusBadge } from '../adminBadges';
import { adminErrorText, formatDateTime } from '../adminFormat';

type Props = {
  token: string;
};

const STATUS_OPTIONS = [
  { value: '', label: adminMessages.usersAllStatuses },
  { value: 'ACTIVE', label: adminMessages.accountActive },
  { value: 'SUSPENDED', label: adminMessages.accountSuspended },
  { value: 'BANNED', label: adminMessages.accountBanned },
];

/** 用户管理：按 ID / 昵称 / 邮箱搜索、按状态筛选、分页表格。 */
export function AdminUsersPage({ token }: Props) {
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const { page, size, setPage, setSize } = usePaging(`${query}|${status}`);

  const [data, setData] = useState<Page<AdminUserSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadAdminUsers(token, { q: query, status, page, size })
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
  }, [token, query, status, page, size, reloadKey]);

  const submitSearch = () => setQuery(draftQuery.trim());
  const resetFilters = () => {
    setDraftQuery('');
    setQuery('');
    setStatus('');
  };

  const columns: TableColumnsType<AdminUserSummary> = [
    {
      title: adminMessages.colId,
      dataIndex: 'id',
      width: 76,
    },
    {
      title: adminMessages.colUser,
      key: 'user',
      render: (_, user) => (
        <span className="admin-user-cell">
          <Avatar user={user} size="sm" />
          <span className="admin-user-name">{user.nickname}</span>
          {user.role === 'ADMIN' && (
            <span className="badge dusk no-dot">{adminMessages.roleAdmin}</span>
          )}
        </span>
      ),
    },
    {
      title: adminMessages.colEmail,
      key: 'email',
      render: (_, user) =>
        user.email === null || user.email === undefined || user.email === ''
          ? adminMessages.emailMissing
          : user.email,
    },
    {
      title: adminMessages.colCreatedAt,
      key: 'createdAt',
      render: (_, user) => formatDateTime(user.created_at),
    },
    {
      title: adminMessages.colStatus,
      key: 'status',
      width: 108,
      render: (_, user) => <AccountStatusBadge status={user.status} />,
    },
    {
      title: adminMessages.colActions,
      key: 'actions',
      width: 108,
      render: (_, user) => (
        <a className="admin-link" href={`#/admin/users/${user.id}`}>
          {adminMessages.viewDetail}
        </a>
      ),
    },
  ];

  return (
    <AdminLayout active="users" title={adminMessages.usersTitle}>
      <div className="admin-toolbar">
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <Input
            value={draftQuery}
            allowClear
            placeholder={adminMessages.usersSearchPlaceholder}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <Button type="primary" htmlType="submit">
            {adminMessages.usersSearch}
          </Button>
        </form>

        <div className="admin-filter">
          <span className="admin-filter-label">{adminMessages.usersStatusFilter}</span>
          <SoftSelect
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
            ariaLabel={adminMessages.usersStatusFilter}
          />
        </div>

        <Button type="text" onClick={resetFilters}>
          {adminMessages.reset}
        </Button>
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
        <EmptyState title={adminMessages.usersEmpty} text={adminMessages.emptyHint} />
      )}

      {error === null && data !== null && data.items.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <Table<AdminUserSummary>
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={data.items}
              pagination={false}
            />
          </div>

          <div className="admin-card-list">
            {data.items.map((user) => (
              <article className="admin-card" key={user.id}>
                <div className="admin-card-head">
                  <Avatar user={user} size="sm" />
                  <span className="admin-user-name">{user.nickname}</span>
                  <AccountStatusBadge status={user.status} />
                </div>
                <dl className="admin-card-facts">
                  <div>
                    <dt>{adminMessages.colId}</dt>
                    <dd>{user.id}</dd>
                  </div>
                  <div>
                    <dt>{adminMessages.colEmail}</dt>
                    <dd>
                      {user.email === null || user.email === undefined || user.email === ''
                        ? adminMessages.emailMissing
                        : user.email}
                    </dd>
                  </div>
                  <div>
                    <dt>{adminMessages.colCreatedAt}</dt>
                    <dd>{formatDateTime(user.created_at)}</dd>
                  </div>
                </dl>
                <a className="admin-link" href={`#/admin/users/${user.id}`}>
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