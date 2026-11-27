import React, { FC, memo } from 'react';

interface Props {
  label: string;
  value: string;
  delta: string;
  sparkline: number[];
  negative?: boolean;
}

const StatCard: FC<Props> = ({
  label,
  value,
  delta,
  sparkline,
  negative = false,
}) => {
  const peak = Math.max(...sparkline);

  return (
    <article className="stat-panel">
      <div className="stat-panel__label">{label}</div>
      <div className="stat-panel__value">{value}</div>
      <div className={`stat-panel__delta ${negative ? 'is-negative' : ''}`}>
        {delta}
      </div>
      <div className="sparkline" aria-hidden="true">
        {sparkline.map((point) => (
          <span
            className={point === peak ? 'is-peak' : ''}
            key={point}
            style={{ height: `${point}%` }}
          />
        ))}
      </div>
    </article>
  );
};

export default memo(StatCard);

StatCard.defaultProps = {
  negative: false,
};
