import React, { useEffect, useMemo, useState } from 'react';
import { Pagination } from '@nextui-org/react';

export * from './controls';

const DEFAULT_PAGE_SIZE = 10;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => (
  <div className="page-header">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
);

PageHeader.defaultProps = {
  subtitle: undefined,
  actions: undefined,
};

interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Panel = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: PanelProps) => (
  <section className={`panel admin-panel ${className}`}>
    {(title || actions) && (
      <div className="admin-panel__head">
        <div>
          {title && <h2 className="panel-title">{title}</h2>}
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

Panel.defaultProps = {
  title: undefined,
  subtitle: undefined,
  actions: undefined,
  className: '',
};

interface SidePanelProps {
  label: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const SidePanel = ({
  label,
  title,
  subtitle,
  onClose,
  children,
}: SidePanelProps) => (
  <aside aria-label={label} className="ticket-rail">
    <div className="ticket-header">
      <div className="ticket-eyebrow">
        <span>{label}</span>
        <button
          aria-label="Close panel"
          className="text-button"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      <h2 className="ticket-title">{title}</h2>
      {subtitle && <p className="ticket-type">{subtitle}</p>}
    </div>
    <div className="ticket-scroll">{children}</div>
  </aside>
);

SidePanel.defaultProps = {
  subtitle: undefined,
};

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative';
}

export const StatTile = ({
  label,
  value,
  hint,
  tone = 'default',
}: StatTileProps) => (
  <div className={`stat-tile stat-tile--${tone}`}>
    <span>{label}</span>
    <strong className="tabular">{value}</strong>
    {hint && <small>{hint}</small>}
  </div>
);

StatTile.defaultProps = {
  hint: undefined,
  tone: 'default',
};

export const StatGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="stat-grid">{children}</div>
);

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export const Field = ({ label, hint, error, children }: FieldProps) => (
  <div className="admin-field">
    <span>{label}</span>
    {children}
    {error ? (
      <small className="field-error">{error}</small>
    ) : (
      hint && <small>{hint}</small>
    )}
  </div>
);

Field.defaultProps = {
  hint: undefined,
  error: undefined,
};

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

export const Tabs = ({ tabs, value, onChange, label }: TabsProps) => (
  <div className="admin-tabs" aria-label={label} role="tablist">
    {tabs.map((tab) => (
      <button
        aria-selected={value === tab.id}
        className={value === tab.id ? 'is-active' : ''}
        key={tab.id}
        onClick={() => onChange(tab.id)}
        role="tab"
        type="button"
      >
        {tab.label}
      </button>
    ))}
  </div>
);

Tabs.defaultProps = {
  label: undefined,
};

export const EmptyState = ({
  title,
  message,
}: {
  title: string;
  message?: string;
}) => (
  <div className="ticket-empty">
    <strong>{title}</strong>
    {message && <p>{message}</p>}
  </div>
);

EmptyState.defaultProps = {
  message: undefined,
};

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface RecordTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getKey: (row: T, index: number) => string;
  emptyTitle?: string;
  emptyMessage?: string;
  pageSize?: number;
}

export const RecordTable = <T,>({
  columns,
  rows,
  getKey,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  pageSize = DEFAULT_PAGE_SIZE,
}: RecordTableProps<T>) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [rows]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const visibleRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, rows],
  );
  const start = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, rows.length);

  return (
    <>
      <div className="table-wrap">
        <table className="data-table admin-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className={
                    column.align === 'right' ? 'align-right' : undefined
                  }
                  key={column.key}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={getKey(row, index)}>
                {columns.map((column) => (
                  <td
                    className={
                      column.align === 'right'
                        ? 'tabular align-right'
                        : undefined
                    }
                    key={column.key}
                  >
                    {column.render
                      ? column.render(row)
                      : String(
                          (row as Record<string, unknown>)[column.key] ?? '',
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      )}
      {rows.length > pageSize && (
        <div className="table-pagination">
          <span>
            Showing {start}–{end} of {rows.length}
          </span>
          <Pagination
            color="primary"
            onChange={setPage}
            page={page}
            radius="sm"
            showControls
            size="sm"
            total={pageCount}
            variant="flat"
          />
        </div>
      )}
    </>
  );
};

RecordTable.defaultProps = {
  emptyTitle: 'Nothing here yet',
  emptyMessage: undefined,
  pageSize: DEFAULT_PAGE_SIZE,
};

export const FormActions = ({
  submitLabel = 'Save',
  secondaryLabel = 'Reset',
  onSecondary,
}: {
  submitLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) => (
  <div className="form-actions">
    {onSecondary && (
      <button className="secondary-button" onClick={onSecondary} type="button">
        {secondaryLabel}
      </button>
    )}
    <button className="primary-button" type="submit">
      {submitLabel}
    </button>
  </div>
);

FormActions.defaultProps = {
  submitLabel: 'Save',
  secondaryLabel: 'Reset',
  onSecondary: undefined,
};
