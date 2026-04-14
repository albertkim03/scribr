interface Props {
  size?: number
  className?: string
}

export default function ScribrLogo({ size = 32, className = '' }: Props) {
  // Use a unique gradient ID per instance to avoid SVG defs collisions across the page
  const gradId = `scribr-grad-${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Scribr"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#1D6DD4" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />

      {/* Fountain pen nib — diamond silhouette */}
      <path
        d="M16 26 L6 14.5 L16 6 L26 14.5 Z"
        fill="white"
        fillOpacity="0.18"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Center slit */}
      <line
        x1="16" y1="26"
        x2="16" y2="15.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Ink vent holes */}
      <circle cx="12.5" cy="14" r="1.3" fill="white" fillOpacity="0.9" />
      <circle cx="19.5" cy="14" r="1.3" fill="white" fillOpacity="0.9" />
    </svg>
  )
}
