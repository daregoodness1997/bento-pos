interface Props {
  className?: string;
}

const HomeIcon = ({ className = '' }: Props) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="20"
    viewBox="0 0 20 20"
    width="20"
  >
    <path
      d="M2.75 8.5 10 2.75l7.25 5.75v8.25a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V8.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M7.75 17.25v-5h4.5v5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

HomeIcon.defaultProps = { className: '' };

export default HomeIcon;
