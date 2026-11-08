export function Logo({ className = "size-8" }: { className?: string }) {
  // Marca original de Sparring IA: dos bocadillos de diálogo enfrentados (práctica a dos voces).
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="sp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#05cc93" />
          <stop offset="1" stopColor="#006750" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#sp-g)" />
      <path d="M8 9.5h9a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5h-5l-3.5 3v-3H8A2.5 2.5 0 0 1 5.5 16v-4A2.5 2.5 0 0 1 8 9.5Z" fill="#fff" />
      <path d="M24 13.5h-2.5V16a4 4 0 0 1-4 4h-3v.5A2.5 2.5 0 0 0 17 23h4l3.5 3v-3a2.5 2.5 0 0 0 2-2.45V16a2.5 2.5 0 0 0-2.5-2.5Z" fill="#fff" fillOpacity=".55" />
    </svg>
  );
}
