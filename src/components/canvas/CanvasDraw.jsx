import React from 'react';

export function CanvasDraw({ strokes }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {strokes.map(stroke => {
        if (!stroke.points || stroke.points.length < 2) return null;
        const d = stroke.points.map((p, i) =>
          i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
        ).join(' ');

        const strokeWidth = stroke.tool === 'highlighter' ? (stroke.width || 8) * 2
          : stroke.tool === 'marker' ? (stroke.width || 3) * 1.5
          : stroke.width || 3;

        const opacity = stroke.tool === 'highlighter' ? 0.35 : 0.9;

        return (
          <path
            key={stroke.id}
            d={d}
            fill="none"
            stroke={stroke.color || '#000'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity}
          />
        );
      })}
    </g>
  );
}
