import React from 'react';

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
  children: React.ReactNode;
}

export const Field = ({ label, hint, children }: FieldProps) => (
  <div className="admin-field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </div>
);

Field.defaultProps = {
  hint: undefined,
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
}

export const RecordTable = <T,>({
  columns,
  rows,
  getKey,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
}: RecordTableProps<T>) => (
  <>
    <div className="table-wrap">
      <table className="data-table admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={column.align === 'right' ? 'align-right' : undefined}
                key={column.key}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getKey(row, index)}>
              {columns.map((column) => (
                <td
                  className={
                    column.align === 'right' ? 'tabular align-right' : undefined
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
  </>
);

RecordTable.defaultProps = {
  emptyTitle: 'Nothing here yet',
  emptyMessage: undefined,
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
