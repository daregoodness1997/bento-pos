import { useMemo, useState } from 'react';

import { DashboardLayout } from 'layouts';
import {
  AppInput,
  AppSelect,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  RecordTable,
} from 'components';
import type { TableColumn } from 'components';
import { useStore } from 'context';
import type { AuditAction, AuditEvent } from 'types/store';

type ActionFilter = 'all' | AuditAction;

const ACTION_FILTERS: { id: ActionFilter; label: string }[] = [
  { id: 'all', label: 'All actions' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' },
  { id: 'setting', label: 'Setting' },
  { id: 'role', label: 'Role' },
];

const badgeClassForAction = (action: AuditAction) => {
  if (action === 'delete') {
    return 'badge badge--bad';
  }
  if (action === 'create' || action === 'edit') {
    return 'badge badge--good';
  }
  return 'badge badge--warn';
};

const Activity = () => {
  const { data, currentUser } = useStore();
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<ActionFilter>('all');

  const canView =
    currentUser?.role === 'Owner' ||
    currentUser?.role === 'Manager' ||
    currentUser?.role === 'Auditor';

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.auditEvents
      .filter((event) => action === 'all' || event.action === action)
      .filter((event) => {
        if (!normalizedQuery) {
          return true;
        }
        return [
          event.timestamp,
          event.actorName,
          event.action,
          event.entity,
          event.summary,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [action, data.auditEvents, query]);

  const columns: TableColumn<AuditEvent>[] = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (row) => (
        <time className="tabular" dateTime={row.timestamp}>
          {new Date(row.timestamp).toLocaleString()}
        </time>
      ),
    },
    { key: 'actorName', label: 'Actor' },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <span className={badgeClassForAction(row.action)}>{row.action}</span>
      ),
    },
    { key: 'entity', label: 'Entity' },
    { key: 'summary', label: 'Summary' },
  ];

  if (!canView) {
    return (
      <DashboardLayout>
        <PageHeader
          subtitle="A record of changes made in the register."
          title="Activity log"
        />
        <Panel title="Access restricted">
          <EmptyState
            message="The activity log is available to owners, managers and auditors. Ask a manager if you need access."
            title="Your role cannot view this log"
          />
        </Panel>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        subtitle="Every change made in the register, newest first."
        title="Activity log"
      />

      <div className="admin-form">
        <Panel
          subtitle="Narrow the log by text or action type."
          title="Filters"
        >
          <div className="field-grid">
            <Field label="Search">
              <AppInput
                aria-label="Search activity"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Actor, entity, or summary"
                type="search"
                value={query}
              />
            </Field>
            <Field label="Action">
              <AppSelect
                aria-label="Action filter"
                onValueChange={(value) => setAction(value as ActionFilter)}
                options={ACTION_FILTERS.map((entry) => ({
                  key: String(entry.id),
                  label: entry.label,
                }))}
                value={action}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          subtitle={`${visibleEvents.length} matching event${
            visibleEvents.length === 1 ? '' : 's'
          }`}
          title="Events"
        >
          <RecordTable
            columns={columns}
            emptyMessage="Try clearing the search or choosing another action."
            emptyTitle="No matching activity"
            getKey={(row) => row.id}
            rows={visibleEvents}
          />
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default Activity;
