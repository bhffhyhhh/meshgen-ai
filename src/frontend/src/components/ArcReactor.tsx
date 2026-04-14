import { memo } from "react";

interface ArcReactorProps {
  size?: number;
  className?: string;
  showLabel?: boolean;
}

const ArcReactor = memo(function ArcReactor({
  size = 48,
  className = "",
  showLabel = false,
}: ArcReactorProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  return (
    <div className={`relative flex flex-col items-center gap-1 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label="Arc Reactor"
        role="img"
        className="drop-shadow-[0_0_8px_oklch(0.80_0.18_90/0.9)]"
      >
        {/* Outer glow filter */}
        <defs>
          <filter id="arc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id="arc-glow-blue"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="core-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd700" stopOpacity="1" />
            <stop offset="40%" stopColor="#1e90ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0a2d6e" stopOpacity="0.6" />
          </radialGradient>
          <radialGradient id="inner-ring-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e90ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffd700" stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {/* Background circle */}
        <circle cx={cx} cy={cy} r={r} fill="#0a1628" opacity="0.9" />

        {/* Outer rotating ring */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: "ring-rotate 8s linear infinite",
          }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={r * 0.92}
            fill="none"
            stroke="#1e90ff"
            strokeWidth={size * 0.025}
            strokeDasharray={`${r * 0.92 * 2 * Math.PI * 0.7} ${r * 0.92 * 2 * Math.PI * 0.3}`}
            opacity="0.8"
            filter="url(#arc-glow-blue)"
          />
        </g>

        {/* Middle ring (counter-rotating) */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: "ring-rotate-reverse 5s linear infinite",
          }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={r * 0.72}
            fill="none"
            stroke="#ffd700"
            strokeWidth={size * 0.02}
            strokeDasharray={`${r * 0.72 * 2 * Math.PI * 0.5} ${r * 0.72 * 2 * Math.PI * 0.5}`}
            opacity="0.75"
            filter="url(#arc-glow)"
          />
        </g>

        {/* Static structural ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.55}
          fill="none"
          stroke="#1e90ff"
          strokeWidth={size * 0.015}
          opacity="0.4"
        />

        {/* Hex detail lines */}
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = cx + Math.cos(rad) * r * 0.45;
          const y1 = cy + Math.sin(rad) * r * 0.45;
          const x2 = cx + Math.cos(rad) * r * 0.58;
          const y2 = cy + Math.sin(rad) * r * 0.58;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#ffd700"
              strokeWidth={size * 0.015}
              opacity="0.6"
            />
          );
        })}

        {/* Inner pulsing core */}
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.35}
          fill="url(#core-gradient)"
          className="pulse-reactor"
          filter="url(#arc-glow)"
        />

        {/* Center dot */}
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.12}
          fill="#ffd700"
          opacity="0.95"
          className="pulse-reactor"
        />
      </svg>

      {showLabel && (
        <span className="text-[10px] font-mono text-primary/70 tracking-widest uppercase">
          ARC REACTOR
        </span>
      )}
    </div>
  );
});

export default ArcReactor;
