interface Props {
  className?: string;
}

const SettingsIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="20"
    viewBox="0 0 20 20"
    width="20"
  >
    <path
      d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="m16.25 11.7 1.02.83a.75.75 0 0 1 .16.96l-1.1 1.9a.75.75 0 0 1-.88.36l-1.26-.34a6.5 6.5 0 0 1-1.1.64l-.23 1.3a.75.75 0 0 1-.74.61h-2.2a.75.75 0 0 1-.74-.61l-.23-1.3a6.5 6.5 0 0 1-1.1-.64l-1.26.34a.75.75 0 0 1-.88-.36l-1.1-1.9a.75.75 0 0 1 .16-.96l1.02-.83a6.4 6.4 0 0 1 0-1.4l-1.02-.83a.75.75 0 0 1-.16-.96l1.1-1.9a.75.75 0 0 1 .88-.36l1.26.34c.34-.26.71-.47 1.1-.64l.23-1.3a.75.75 0 0 1 .74-.61h2.2a.75.75 0 0 1 .74.61l.23 1.3c.39.17.76.38 1.1.64l1.26-.34a.75.75 0 0 1 .88.36l1.1 1.9a.75.75 0 0 1-.16.96l-1.02.83c.04.46.04.94 0 1.4Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

SettingsIcon.defaultProps = { className: '' };

export default SettingsIcon;
