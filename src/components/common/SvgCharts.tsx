import React, { useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  tooltipText?: string;
}

interface AreaTrendChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  fillOpacity?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  showPoints?: boolean;
}

export const AreaTrendChart: React.FC<AreaTrendChartProps> = ({
  data,
  height = 190,
  color = '#7155E8',
  fillOpacity = 0.14,
  valuePrefix = '',
  valueSuffix = '',
  showPoints = true
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-neutral-400">
        No data points available
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const paddingX = 28;
  const paddingTop = 28;
  const paddingBottom = 26;
  const chartWidth = 560;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = Math.max(60, height - paddingTop - paddingBottom);

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? chartWidth / 2
        : paddingX + (i / (data.length - 1)) * usableWidth;
    const y = paddingTop + usableHeight - ((d.value - minVal) / range) * usableHeight;
    return { x, y, ...d };
  });

  // Smooth cubic bezier curve or clean polyline
  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const baselineY = height - paddingBottom + 4;
  const areaD = `${pathD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  const gradId = `areaGrad-${color.replace(/[^a-zA-Z0-9]/g, '')}-${data.length}`;

  // Prevent X-axis label collisions when many points exist
  const labelStep = data.length > 8 ? Math.ceil(data.length / 6) : 1;

  // Clamped tooltip horizontal percentage so it never clips off card edges
  const rawLeftPct =
    hoverIndex !== null && points[hoverIndex]
      ? (points[hoverIndex].x / chartWidth) * 100
      : 50;
  const clampedLeftPct = Math.max(12, Math.min(88, rawLeftPct));

  return (
    <div className="relative w-full pt-2 select-none">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto block overflow-visible"
        style={{ maxHeight: height + 16 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity * 2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Subtle horizontal gridlines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingTop + usableHeight * ratio;
          return (
            <line
              key={idx}
              x1={paddingX}
              y1={y}
              x2={chartWidth - paddingX}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        {/* Shaded Area */}
        {points.length > 1 && <path d={areaD} fill={`url(#${gradId})`} />}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover crosshair */}
        {hoverIndex !== null && points[hoverIndex] && (
          <g className="pointer-events-none">
            <line
              x1={points[hoverIndex].x}
              y1={paddingTop - 4}
              x2={points[hoverIndex].x}
              y2={baselineY}
              stroke="#94a3b8"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            <circle
              cx={points[hoverIndex].x}
              cy={points[hoverIndex].y}
              r="6"
              fill={color}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          </g>
        )}

        {/* Interactive hit targets & visible points */}
        {showPoints &&
          points.map((pt, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => setHoverIndex(hoverIndex === i ? null : i)}
            >
              {/* Larger invisible hit circle for easy touch/hover */}
              <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === i ? 5.5 : 4}
                fill="#ffffff"
                stroke={color}
                strokeWidth="2.2"
                className="transition-transform duration-150"
              />
            </g>
          ))}

        {/* X-axis labels (collision-free) */}
        {points.map((pt, i) => {
          const shouldRender = i % labelStep === 0 || i === points.length - 1;
          if (!shouldRender) return null;
          return (
            <text
              key={i}
              x={pt.x}
              y={height - 6}
              textAnchor="middle"
              className="text-[11px] fill-neutral-500 font-medium font-mono select-none"
            >
              {pt.label}
            </text>
          );
        })}
      </svg>

      {/* Clamped Floating Tooltip - Never clips or overlaps title above */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div
          className="absolute z-20 pointer-events-none top-0 -translate-x-1/2 bg-[#171717] text-white px-3 py-1.5 rounded-xl shadow-lg text-xs whitespace-nowrap animate-fade-in"
          style={{ left: `${clampedLeftPct}%` }}
        >
          <div className="font-bold text-white leading-tight">
            {valuePrefix}
            <span className="tabular-nums font-mono">
              {points[hoverIndex].value.toLocaleString()}
            </span>
            {valueSuffix}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono leading-tight mt-0.5">
            {points[hoverIndex].label}
          </div>
        </div>
      )}
    </div>
  );
};

interface BarComparisonChartProps {
  data: { label: string; value: number; maxValue?: number; category?: string }[];
  height?: number;
  barColor?: string;
  valueSuffix?: string;
  valuePrefix?: string;
}

export const BarComparisonChart: React.FC<BarComparisonChartProps> = ({
  data,
  height = 170,
  barColor = '#10B981',
  valueSuffix = '',
  valuePrefix = ''
}) => {
  const max = Math.max(...data.map((d) => d.maxValue || d.value), 1);

  return (
    <div className="flex items-end justify-between gap-2 pt-2 pb-1" style={{ height }}>
      {data.map((item, idx) => {
        const heightPct = Math.max(8, Math.min(100, Math.round((item.value / max) * 100)));
        return (
          <div
            key={idx}
            className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end group"
          >
            <span className="text-[10px] font-mono tabular-nums text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 whitespace-nowrap">
              {valuePrefix}
              {item.value}
              {valueSuffix}
            </span>
            <div className="w-full bg-neutral-100 rounded-t-lg flex-1 min-h-0 flex items-end overflow-hidden max-w-[40px]">
              <div
                className="w-full transition-all duration-300 ease-out rounded-t-lg group-hover:brightness-110"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: barColor
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-neutral-600 truncate max-w-full shrink-0">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

interface RadialGaugeProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  percentage,
  size = 110,
  strokeWidth = 10,
  color = '#10B981',
  label,
  sublabel
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="text-xl font-bold font-mono tabular-nums text-neutral-900 leading-none">
          {Math.round(clamped)}%
        </span>
        {label && <span className="text-[10px] font-medium text-neutral-500 mt-0.5 truncate max-w-full">{label}</span>}
        {sublabel && <span className="text-[9px] text-neutral-400 truncate max-w-full">{sublabel}</span>}
      </div>
    </div>
  );
};
