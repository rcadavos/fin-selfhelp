"use client";

import { useCallback, useMemo, type PointerEvent } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { localPoint } from "@visx/event";
import { useTooltip } from "@visx/tooltip";
import { extent } from "d3-array";
import { AMOUNT_MASK } from "@/lib/constants/dashboard";
import { cn, formatCurrency } from "@/lib/utils";

export type NetBalancePoint = { date: string; balance: number };

/** Left and right leave room for half a day label, so the first and last sit centred under their points. */
const MARGIN = { top: 10, right: 18, bottom: 22, left: 18 };
/** Half the widest tooltip, so it stays inside the card at either end of the line. */
const TOOLTIP_HALF_WIDTH = 60;

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** `11/22`, the tick under each day. */
function tickLabel(ymd: string): string {
  const date = parseYmd(ymd);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** `Nov 22`. */
export function shortDayLabel(ymd: string): string {
  return parseYmd(ymd).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TrendChart({
  width,
  height,
  series,
  hideAmounts,
}: {
  width: number;
  height: number;
  series: NetBalancePoint[];
  hideAmounts: boolean;
}) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft = 0 } = useTooltip<NetBalancePoint>();

  const xScale = useMemo(
    () => scalePoint<string>({ domain: series.map((d) => d.date), range: [0, innerWidth] }),
    [series, innerWidth],
  );

  // A line reads as a trend, so the axis hugs the week's range instead of starting
  // at zero. A flat week still gets a band around it, which centres the line.
  const yScale = useMemo(() => {
    const [min = 0, max = 0] = extent(series, (d) => d.balance);
    const pad = Math.max(1, (max - min) * 0.15);
    return scaleLinear<number>({ domain: [min - pad, max + pad], range: [innerHeight, 0] });
  }, [series, innerHeight]);

  const getX = useCallback((d: NetBalancePoint) => xScale(d.date) ?? 0, [xScale]);
  const getY = useCallback((d: NetBalancePoint) => yScale(d.balance), [yScale]);

  const handlePointer = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point || series.length === 0) return;
      const step = series.length > 1 ? innerWidth / (series.length - 1) : 0;
      const index =
        step > 0 ? Math.max(0, Math.min(series.length - 1, Math.round((point.x - MARGIN.left) / step))) : 0;
      const nearest = series[index];
      showTooltip({ tooltipData: nearest, tooltipLeft: getX(nearest) + MARGIN.left });
    },
    [series, innerWidth, getX, showTooltip],
  );

  if (width < 10 || height < 10 || series.length === 0) return null;

  const first = series[0];
  const last = series[series.length - 1];
  const label = hideAmounts
    ? `Net balance from ${shortDayLabel(first.date)} to ${shortDayLabel(last.date)}.`
    : `Net balance from ${shortDayLabel(first.date)} to ${shortDayLabel(last.date)}: ${formatCurrency(first.balance)} to ${formatCurrency(last.balance)}.`;

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} role="img" aria-label={label}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <AreaClosed
            data={series}
            x={getX}
            y={getY}
            yScale={yScale}
            curve={curveMonotoneX}
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
          />
          <LinePath
            data={series}
            x={getX}
            y={getY}
            curve={curveMonotoneX}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {tooltipData && (
            <line
              x1={getX(tooltipData)}
              x2={getX(tooltipData)}
              y1={0}
              y2={innerHeight}
              stroke="hsl(var(--hairline-strong))"
              strokeDasharray="3 3"
            />
          )}
          {/* Today, or the day being pointed at. */}
          <circle
            cx={getX(tooltipData ?? last)}
            cy={getY(tooltipData ?? last)}
            r={4}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--card))"
            strokeWidth={2}
          />

          {series.map((d, i) => {
            const isLast = i === series.length - 1;
            return (
              <text
                key={d.date}
                x={getX(d)}
                y={innerHeight + 17}
                textAnchor="middle"
                className={cn(
                  "font-mono text-[11px]",
                  isLast ? "fill-foreground font-medium" : "fill-muted-foreground",
                )}
              >
                {tickLabel(d.date)}
              </text>
            );
          })}

          {/* pan-y: a finger dragged along the line reads the days, a vertical swipe still scrolls the page. */}
          <rect
            x={-MARGIN.left}
            y={-MARGIN.top}
            width={width}
            height={innerHeight + MARGIN.top}
            fill="transparent"
            style={{ touchAction: "pan-y" }}
            onPointerDown={handlePointer}
            onPointerMove={handlePointer}
            onPointerLeave={hideTooltip}
          />
        </Group>
      </svg>

      {tooltipData && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
          style={{
            left: Math.min(Math.max(tooltipLeft, TOOLTIP_HALF_WIDTH), Math.max(TOOLTIP_HALF_WIDTH, width - TOOLTIP_HALF_WIDTH)),
          }}
        >
          <span className="font-medium">{shortDayLabel(tooltipData.date)}</span> <span aria-hidden>•</span>{" "}
          <span className="figure">{hideAmounts ? AMOUNT_MASK : formatCurrency(tooltipData.balance)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * The Net Balance over the last few days as a line, with the day under each point.
 * Pointing at, or dragging along, the line shows that day's balance.
 */
export function NetBalanceTrend({
  series,
  hideAmounts,
  className,
}: {
  series: NetBalancePoint[];
  hideAmounts: boolean;
  className?: string;
}) {
  return (
    <div className={cn("h-28", className)}>
      <ParentSize>
        {({ width, height }) => (
          <TrendChart width={width} height={height} series={series} hideAmounts={hideAmounts} />
        )}
      </ParentSize>
    </div>
  );
}
