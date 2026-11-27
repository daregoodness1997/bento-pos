interface Props {
  className?: string;
}

const ResturantIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="20"
    viewBox="0 0 20 20"
    width="20"
  >
    <path
      d="M3 17V3.75C3 3.336 3.336 3 3.75 3h12.5c.414 0 .75.336.75.75V17"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M3 12.5h14M6.5 6.5h7M6.5 9.25h7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

ResturantIcon.defaultProps = { className: '' };

export default ResturantIcon;
