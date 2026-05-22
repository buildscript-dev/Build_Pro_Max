import React from 'react';

const CX = 150, CY = 150;

const CONNECTIONS = [
  // [id, color, endX, endY, delay, duration]
  [1, '#3b82f6', 150, 12,  0.0, 2.4],
  [2, '#eab308', 268, 48,  0.4, 3.1],
  [3, '#ec4899', 288, 150, 0.8, 2.7],
  [4, '#22c55e', 268, 252, 1.2, 2.9],
  [5, '#f97316', 150, 288, 0.6, 3.3],
  [6, '#06b6d4',  32, 252, 1.0, 2.6],
  [7, '#f8fafc',  12, 150, 1.4, 3.0],
  [8, '#f43f5e',  32,  48, 0.2, 2.8],
];

let _uid = 0;

export function CpuArchitecture({
  text = 'HERMES',
  showCpuConnections = true,
  animateMarkers = true,
  lineMarkerSize = 6,
  style = {},
  className = '',
}) {
  const uid = React.useRef(`cpu${++_uid}`).current;

  return (
    <svg
      viewBox="0 0 300 300"
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      className={className}
      aria-label="Hermes AI CPU architecture"
    >
      <defs>
        {/* Path definitions for animateMotion */}
        {CONNECTIONS.map(([id, , ex, ey]) => (
          <path
            key={`def-${id}`}
            id={`${uid}-p${id}`}
            d={`M ${CX},${CY} L ${ex},${ey}`}
            fill="none"
          />
        ))}

        {/* Glow filter */}
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle radial gradient for chip bg */}
        <radialGradient id={`${uid}-chipbg`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="rgba(40,40,40,0.95)" />
          <stop offset="100%" stopColor="rgba(10,10,10,0.98)" />
        </radialGradient>
      </defs>

      {/* Connection lines */}
      {showCpuConnections && CONNECTIONS.map(([id, color, ex, ey]) => (
        <line
          key={`ln-${id}`}
          x1={CX} y1={CY}
          x2={ex} y2={ey}
          stroke={color}
          strokeWidth="0.75"
          strokeOpacity="0.22"
          strokeDasharray="3 6"
        />
      ))}

      {/* Endpoint nodes */}
      {CONNECTIONS.map(([id, color, ex, ey]) => (
        <circle key={`ep-${id}`} cx={ex} cy={ey} r="3.5" fill={color} opacity="0.65" />
      ))}

      {/* CPU chip body */}
      <rect
        x="102" y="102" width="96" height="96" rx="10"
        fill={`url(#${uid}-chipbg)`}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="0.75"
      />

      {/* CPU inner grid lines */}
      {[0, 1, 2, 3].map(i => (
        <React.Fragment key={`g${i}`}>
          <line
            x1="110" y1={118 + i * 20} x2="190" y2={118 + i * 20}
            stroke="rgba(255,255,255,0.055)" strokeWidth="0.5"
          />
          <line
            x1={118 + i * 20} y1="110" x2={118 + i * 20} y2="190"
            stroke="rgba(255,255,255,0.055)" strokeWidth="0.5"
          />
        </React.Fragment>
      ))}

      {/* Corner pins */}
      {[[108,108],[192,108],[192,192],[108,192]].map(([px,py], i) => (
        <rect key={`pin${i}`} x={px-3} y={py-3} width="6" height="6" rx="1.5"
          fill="rgba(255,255,255,0.18)" />
      ))}

      {/* CPU text label */}
      <text x="150" y="139" textAnchor="middle"
        fontSize="8" fontFamily="monospace" letterSpacing="2.5"
        fill="rgba(255,255,255,0.38)">
        CPU
      </text>
      <text x="150" y="155" textAnchor="middle"
        fontSize="13" fontFamily="monospace" fontWeight="700" letterSpacing="1"
        fill="#f06b1c">
        {text}
      </text>
      <text x="150" y="169" textAnchor="middle"
        fontSize="7" fontFamily="monospace" letterSpacing="1.8"
        fill="rgba(255,255,255,0.22)">
        AI ENGINE
      </text>

      {/* Animated light markers */}
      {animateMarkers && CONNECTIONS.map(([id, color, , , delay, duration]) => (
        <circle
          key={`mk-${id}`}
          r={lineMarkerSize / 2}
          fill={color}
          filter={`url(#${uid}-glow)`}
        >
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.05;0.12;0.88;1"
            dur={`${duration}s`}
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
          <animateMotion
            dur={`${duration}s`}
            begin={`${delay}s`}
            repeatCount="indefinite"
            calcMode="linear"
          >
            <mpath href={`#${uid}-p${id}`} />
          </animateMotion>
        </circle>
      ))}
    </svg>
  );
}
