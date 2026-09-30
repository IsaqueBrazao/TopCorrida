'use client';

import React, { useMemo } from 'react';
import { RoadSegment, CombatRacer } from '@/lib/types';

interface TrackMinimapProps {
  segments: RoadSegment[];
  playerZ: number;
  playerColor: string;
  rivals: CombatRacer[];
  totalSegments: number;
  width?: number;
  height?: number;
}

export function TrackMinimap({
  segments,
  playerZ,
  playerColor,
  rivals,
  totalSegments,
  width = 130,
  height = 95,
}: TrackMinimapProps) {
  // Pre-calculate normalized 2D circuit smooth closed path based on track segment curves
  const pathPoints = useMemo(() => {
    if (!segments || segments.length === 0) return [];
    const count = segments.length;
    const raw: Array<{ x: number; y: number }> = [];
    let currX = 0;
    let currY = 0;
    let angle = 0;

    for (let i = 0; i < count; i++) {
      const seg = segments[i];
      angle += seg.curve * 0.022;
      currX += Math.sin(angle);
      currY -= Math.cos(angle);
      raw.push({ x: currX, y: currY });
    }

    const errX = raw[count - 1].x - raw[0].x;
    const errY = raw[count - 1].y - raw[0].y;

    const adjusted: Array<{ x: number; y: number }> = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < count; i++) {
      const factor = i / (count - 1);
      const x = raw[i].x - errX * factor;
      const y = raw[i].y - errY * factor;
      adjusted.push({ x, y });
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const padding = 14;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const scale = Math.min(innerW / rangeX, innerH / rangeY);
    const offsetX = padding + (innerW - rangeX * scale) / 2 - minX * scale;
    const offsetY = padding + (innerH - rangeY * scale) / 2 - minY * scale;

    return adjusted.map((pt) => ({
      x: Math.round((pt.x * scale + offsetX) * 10) / 10,
      y: Math.round((pt.y * scale + offsetY) * 10) / 10,
    }));
  }, [segments, width, height]);

  // Convert track Z coordinate into (x, y) coordinate on minimap path
  const getCoordinatesForZ = (z: number) => {
    if (pathPoints.length === 0) return { x: width / 2, y: height / 2 };
    const trackLength = totalSegments * 200;
    const progress = (((z % trackLength) + trackLength) % trackLength) / trackLength;
    const count = pathPoints.length;
    const exactIndex = progress * count;
    const idx = Math.floor(exactIndex) % count;
    const nextIdx = (idx + 1) % count;
    const sub = exactIndex - Math.floor(exactIndex);

    const p1 = pathPoints[idx];
    const p2 = pathPoints[nextIdx];

    return {
      x: p1.x + (p2.x - p1.x) * sub,
      y: p1.y + (p2.y - p1.y) * sub,
    };
  };

  const svgPathD = useMemo(() => {
    if (pathPoints.length < 3) return '';
    // Build smooth closed path using quadratic bezier midpoints
    let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 0; i < pathPoints.length; i++) {
      const pCurrent = pathPoints[i];
      const pNext = pathPoints[(i + 1) % pathPoints.length];
      const midX = (pCurrent.x + pNext.x) / 2;
      const midY = (pCurrent.y + pNext.y) / 2;
      d += ` Q ${pCurrent.x} ${pCurrent.y}, ${midX} ${midY}`;
    }
    return d + ' Z';
  }, [pathPoints]);

  const playerPos = getCoordinatesForZ(playerZ);
  const startLinePos = pathPoints[0] || { x: width / 2, y: height / 2 };

  return (
    <div className="relative bg-black/75 backdrop-blur-xs border border-white/15 rounded-lg p-1.5 shadow-xl flex flex-col items-center">
      <div className="w-full flex justify-between items-center px-1 mb-0.5 text-[9px] font-speed font-bold text-slate-300 tracking-wider">
        <span>MAP</span>
        <span className="text-[8px] text-amber-400 font-mono">CIRCUIT</span>
      </div>

      <svg width={width} height={height} className="overflow-visible">
        {/* Track Outline Background Glow */}
        <path
          d={svgPathD}
          fill="none"
          stroke="#1e293b"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Track Asphalt Line */}
        <path
          d={svgPathD}
          fill="none"
          stroke="#475569"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Center Guide Dashed Line */}
        <path
          d={svgPathD}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="2,3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />

        {/* Finish Line Checkered Dot */}
        <circle
          cx={startLinePos.x}
          cy={startLinePos.y}
          r="3"
          fill="#f8fafc"
          stroke="#000"
          strokeWidth="1"
        />

        {/* Rival Cars (Color-Coded) */}
        {rivals.map((rival) => {
          const pos = getCoordinatesForZ(rival.z);
          return (
            <g key={rival.id}>
              {/* Drop Shadow */}
              <circle cx={pos.x} cy={pos.y + 0.5} r="3.2" fill="#000000" opacity="0.6" />
              {/* Colored Rival Dot */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="3"
                fill={rival.bikeColor}
                stroke="#09090b"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Player Car (Glowing Indicator) */}
        <g>
          {/* Animated Pulsing Halo */}
          <circle
            cx={playerPos.x}
            cy={playerPos.y}
            r="6"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
            className="animate-ping origin-center"
            opacity="0.75"
          />
          {/* Outer Ring */}
          <circle
            cx={playerPos.x}
            cy={playerPos.y}
            r="4.5"
            fill="#ffffff"
            stroke="#0284c7"
            strokeWidth="1.2"
          />
          {/* Inner Player Color Dot */}
          <circle
            cx={playerPos.x}
            cy={playerPos.y}
            r="3.2"
            fill={playerColor || '#ef4444'}
          />
        </g>
      </svg>
    </div>
  );
}
