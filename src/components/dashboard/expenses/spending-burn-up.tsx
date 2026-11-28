"use client";

import { useCallback, useMemo, type PointerEvent, type ReactNode } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { localPoint } from "@visx/event";
import { useTooltip } from "@visx/tooltip";
import { formatCompactNumber } from "@/lib/shared/number-format";
import { cn, formatCurrency } from "@/lib/utils";
import type { CumulativeSpendPoint } from "@/lib/expenses/pace";

const MARGIN = { top: 6, right: 6, bottom: 2, left: 6 };
/** Half the widest tooltip, so it stays inside the panel at either end of the line. */
const TOOLTIP_HALF_WIDTH = 64;
/** Headroom above the highest line, so it never touches the top edge. */
const Y_HEADROOM = 1.08;
/** The panel's amber, the same one the pace bar turns when the month is running hot. */
const PROJECTION_STROKE = "hsl(39 67% 62%)";

type ChartProps = {
  width: number;
  height: number;
  series: CumulativeSpendPoint[];
  daysInMonth: number;
  usualMonth: number | null;
  projected: number | null;
  monthShort: string;
  currency: string;
};

function BurnUpChart({
  width,
  height,
  series,
  daysInMonth,
  usualMonth,
  projected,
  monthShort,
  currency,
}: ChartProps) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft = 0 } = useTooltip<CumulativeSpendPoint>();
  const last = series[series.length - 1];

  const xScale = useMemo(
    () => scaleLinear<number>({ domain: [0, daysInMonth], range: [0, innerWidth] }),
    [daysInMonth, innerWidth],
  );

  // A running total starts at nothing, so unlike the balance trend this axis starts at zero.
  const yScale = useMemo(() => {
    const top = Math.max(last?.total ?? 0, usualMonth ?? 0, projected ?? 0) * Y_HEADROOM;
    return scaleLinear<number>({ domain: [0, top > 0 ? top : 1], range: [innerHeight, 0], nice: true });
  }, [last, usualMonth, projected, innerHeight]);

  const getX = useCallback((d: CumulativeSpendPoint) => xScale(d.day), [xScale]);
  const getY = useCallback((d: CumulativeSpendPoint) => yScale(d.total), [yScale]);

  const handlePointer = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point || !last || last.day < 1) return;
      const day = Math.round(xScale.invert(point.x - MARGIN.left));
      const nearest = series[Math.max(1, Math.min(last.day, day))];
      showTooltip({ tooltipData: nearest, tooltipLeft: getX(nearest) + MARGIN.left });
    },
    [last, series, xScale, getX, showTooltip],
  );

  if (width < 10 || height < 10 || !last) return null;

  const ticks = yScale.ticks(3).filter((t) => t > 0);
  const label = [
    `Running total for the month: ${formatCurrency(last.total, currency)} by day ${last.day} of ${daysInMonth}.`,
    usualMonth !== null ? `A usual month is ${formatCurrency(usualMonth, currency)}.` : "",
    projected !== null ? `On pace for ${formatCurrency(projected, currency)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} role="img" aria-label={label}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={0}
                x2={innerWidth}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="hsl(var(--panel-foreground) / 0.1)"
              />
              <text x={0} y={yScale(t) - 5} className="fill-panel-muted font-mono text-[10.5px]">
                {formatCompactNumber(t)}
              </text>
            </g>
          ))}
          <line
            x1={0}
            x2={innerWidth}
            y1={innerHeight}
            y2={innerHeight}
            stroke="hsl(var(--panel-foreground) / 0.22)"
          />

          {series.length > 1 && (
            <AreaClosed
              data={series}
              x={getX}
              y={getY}
              yScale={yScale}
              curve={curveMonotoneX}
              fill="hsl(var(--panel-accent))"
              fillOpacity={0.16}
            />
          )}
          {usualMonth !== null && (
            <line
              x1={xScale(0)}
              y1={yScale(0)}
              x2={xScale(daysInMonth)}
              y2={yScale(usualMonth)}
              stroke="hsl(var(--panel-foreground) / 0.6)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
          )}
          {series.length > 1 && (
            <LinePath
              data={series}
              x={getX}
              y={getY}
              curve={curveMonotoneX}
              stroke="hsl(var(--panel-accent))"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {projected !== null && last.day < daysInMonth && (
            <line
              x1={getX(last)}
              y1={getY(last)}
              x2={xScale(daysInMonth)}
              y2={yScale(projected)}
              stroke={PROJECTION_STROKE}
              strokeWidth={2.5}
              strokeDasharray="1 5"
              strokeLinecap="round"
            />
          )}

          {tooltipData && (
            <line
              x1={getX(tooltipData)}
              x2={getX(tooltipData)}
              y1={0}
              y2={innerHeight}
              stroke="hsl(var(--panel-foreground) / 0.35)"
              strokeDasharray="3 3"
            />
          )}
          {/* Today, or the day being pointed at. */}
          <circle
            cx={getX(tooltipData ?? last)}
            cy={getY(tooltipData ?? last)}
            r={4.5}
            fill="hsl(var(--panel-accent))"
            stroke="hsl(var(--panel))"
            strokeWidth={3}
          />

          {/* pan-y: a finger dragged along the line reads the days, a vertical swipe still scrolls the page. */}
          <rect
            x={-MARGIN.left}
            y={-MARGIN.top}
            width={width}
            height={height}
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
            left: Math.min(
              Math.max(tooltipLeft, TOOLTIP_HALF_WIDTH),
              Math.max(TOOLTIP_HALF_WIDTH, width - TOOLTIP_HALF_WIDTH),
            ),
          }}
        >
          <span className="font-medium">
            {tooltipData.day} {monthShort}
          </span>{" "}
          <span aria-hidden>•</span> <span className="figure">{formatCurrency(tooltipData.total, currency)}</span>
        </div>
      )}
    </div>
  );
}

function LegendKey({ lineClassName, children }: { lineClassName: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("w-4", lineClassName)} />
      {children}
    </span>
  );
}

/**
 * The month as a running total against a usual month. The solid line is what you
 * have spent so far, the dashed one is where an even usual month would be by each
 * day, and the dotted one carries today's pace on to the end of the month. Lives
 * on the dark pace panel. Pointing at, or dragging along, the line reads each day.
 */
export function SpendingBurnUp({
  caption,
  series,
  daysInMonth,
  usualMonth,
  projected,
  monthShort,
  currency,
  className,
}: {
  caption: string;
  series: CumulativeSpendPoint[];
  daysInMonth: number;
  /** Null without enough history: the dashed line is left out. */
  usualMonth: number | null;
  /** Null for a finished month, or without history: the dotted line is left out. */
  projected: number | null;
  /** "Nov", for the day labels under the chart. */
  monthShort: string;
  currency: string;
  className?: string;
}) {
  return (
    <figure className={cn("m-0 flex min-w-0 flex-col gap-3", className)}>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-panel-muted">
          {caption}
        </span>
        <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-panel-muted">
          <LegendKey lineClassName="border-t-[2.5px] border-panel-accent">Spent</LegendKey>
          {usualMonth !== null && (
            <LegendKey lineClassName="border-t-2 border-dashed border-panel-foreground/60">Usual pace</LegendKey>
          )}
          {projected !== null && (
            <LegendKey lineClassName="border-t-2 border-dotted border-[hsl(39_67%_62%)]">Projected</LegendKey>
          )}
        </span>
      </figcaption>
      <div className="h-32 sm:h-44">
        <ParentSize>
          {({ width, height }) => (
            <BurnUpChart
              width={width}
              height={height}
              series={series}
              daysInMonth={daysInMonth}
              usualMonth={usualMonth}
              projected={projected}
              monthShort={monthShort}
              currency={currency}
            />
          )}
        </ParentSize>
      </div>
      <div aria-hidden className="flex justify-between font-mono text-[10.5px] text-panel-muted">
        <span>1 {monthShort}</span>
        <span>15 {monthShort}</span>
        <span>
          {daysInMonth} {monthShort}
        </span>
      </div>
    </figure>
  );
}
