interface Props {
  className?: string;
}

const AnalyticsIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="20"
    viewBox="0 0 20 20"
    width="20"
  >
    <path
      d="M3 17h14M5.5 13.5v-4M9 13.5v-7M12.5 13.5V6M16 13.5v-3"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

AnalyticsIcon.defaultProps = { className: '' };

export default AnalyticsIcon;
