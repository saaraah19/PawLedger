export function Paw({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="16.5" rx="5.2" ry="4.2" />
      <ellipse cx="4.8" cy="10.8" rx="2.1" ry="2.8" transform="rotate(-18 4.8 10.8)" />
      <ellipse cx="9.3" cy="6.4" rx="2.1" ry="2.9" transform="rotate(-6 9.3 6.4)" />
      <ellipse cx="14.7" cy="6.4" rx="2.1" ry="2.9" transform="rotate(6 14.7 6.4)" />
      <ellipse cx="19.2" cy="10.8" rx="2.1" ry="2.8" transform="rotate(18 19.2 10.8)" />
    </svg>
  );
}
