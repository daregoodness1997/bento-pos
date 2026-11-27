interface Props {
  className?: string;
}

export const PlusIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
    />
  </svg>
);

export const MinusIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      d="M3 8h10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
    />
  </svg>
);

export const TrashIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      d="M3.5 4.5h9M6.25 4.5V3h3.5v1.5M4.75 4.5l.5 8h5.5l.5-8M6.75 7v3.25M9.25 7v3.25"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

export const ClockIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="14"
    viewBox="0 0 16 16"
    width="14"
  >
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M8 5v3l2 1.25"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

export const CashIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <rect
      height="8"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.4"
      width="13"
      x="1.5"
      y="4"
    />
    <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M3.5 6.5h.01M12.5 9.5h.01"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
    />
  </svg>
);

export const CardIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <rect
      height="9"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.4"
      width="13"
      x="1.5"
      y="3.5"
    />
    <path
      d="M1.5 6.5h13M4 10h3"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.4"
    />
  </svg>
);

export const CheckIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="24"
    viewBox="0 0 24 24"
    width="24"
  >
    <path
      d="m5 12.5 4.5 4.5L19 7.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const ReceiptIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      d="M4 2.5h8v11l-2-1.25-2 1.25-2-1.25L4 13.5v-11Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
    <path
      d="M6 5.5h4M6 8h4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.4"
    />
  </svg>
);

export const LockIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="24"
    viewBox="0 0 24 24"
    width="24"
  >
    <rect
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.7"
      width="14"
      x="5"
      y="10"
    />
    <path
      d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.7"
    />
  </svg>
);

export const BackspaceIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="20"
    viewBox="0 0 20 20"
    width="20"
  >
    <path
      d="M7.5 4.5h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8L2 10l5.5-5.5Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="m9 8 4 4m0-4-4 4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);

export const ArrowLeftIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      d="M12.5 8h-9M7 3.5 2.5 8 7 12.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

PlusIcon.defaultProps = { className: '' };
MinusIcon.defaultProps = { className: '' };
TrashIcon.defaultProps = { className: '' };
ClockIcon.defaultProps = { className: '' };
CashIcon.defaultProps = { className: '' };
CardIcon.defaultProps = { className: '' };
CheckIcon.defaultProps = { className: '' };
ReceiptIcon.defaultProps = { className: '' };
LockIcon.defaultProps = { className: '' };
BackspaceIcon.defaultProps = { className: '' };
ArrowLeftIcon.defaultProps = { className: '' };
