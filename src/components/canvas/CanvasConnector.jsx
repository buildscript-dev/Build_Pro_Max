import React from 'react';
import { getAnchorPoint, buildConnectorPath } from '../../services/canvasEngine';

export function CanvasConnector({ connectors, elements }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {connectors.map(conn => {
        const fromEl = elements.find(e => e.id === conn.fromId);
        const toEl = elements.find(e => e.id === conn.toId);
        if (!fromEl || !toEl) return null;

        const from = getAnchorPoint(fromEl, conn.fromAnchor || 'right');
        const to = getAnchorPoint(toEl, conn.toAnchor || 'left');
        const d = buildConnectorPath(from, to);

        return (
          <g key={conn.id}>
            <path
              d={d}
              fill="none"
              stroke={conn.color || 'var(--ink-3)'}
              strokeWidth={conn.width || 2}
              strokeDasharray={conn.style === 'dashed' ? '6,4' : conn.style === 'dotted' ? '2,3' : 'none'}
            />
            <polygon
              fill={conn.color || 'var(--ink-3)'}
              transform={`translate(${to.x}, ${to.y})`}
              points="0,-5 8,0 0,5"
            />
          </g>
        );
      })}
    </g>
  );
}
