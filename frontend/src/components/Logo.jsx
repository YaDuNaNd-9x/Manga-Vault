export default function Logo({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      className="text-purple-400"
    >
      <path d="M50 5 L65 15 L80 10 L85 25 L95 30 L90 45 L95 60 L80 65 L75 80 L60 78 L50 90 L40 78 L25 80 L20 65 L5 60 L10 45 L5 30 L15 25 L20 10 L35 15 Z" />
      <rect x="35" y="35" width="10" height="15" rx="2" fill="#1a1a2e"/>
      <rect x="55" y="35" width="10" height="15" rx="2" fill="#1a1a2e"/>
      <rect x="38" y="55" width="24" height="6" rx="2" fill="#1a1a2e"/>
      <rect x="44" y="48" width="12" height="8" rx="1" fill="#1a1a2e"/>
    </svg>
  )
}