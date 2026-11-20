"use client";

import { useState } from "react";

type Point = { label: string; full: string; value: number };

/**
 * Biểu đồ cột "đơn tư vấn 14 ngày" — SVG thuần, 1 series.
 * Spec: cột mảnh bo đầu 4px neo baseline, khe 2px, grid chìm, tooltip hover.
 */
export default function LeadsChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = 180;
  const PAD_L = 28;
  const PAD_B = 22;
  const PAD_T = 12;
  const plotW = W - PAD_L - 8;
  const plotH = H - PAD_T - PAD_B;
  const max = Math.max(4, ...data.map((d) => d.value));
  const step = plotW / data.length;
  const barW = Math.min(28, step - 6);
  const y = (v: number) => PAD_T + plotH - (v / max) * plotH;

  const gridVals = [max, Math.round(max / 2)];

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Đơn tư vấn 14 ngày qua">
        {/* grid chìm */}
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - 8} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={PAD_L - 6} y={y(v) + 3.5} className="chart-tick" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <line x1={PAD_L} x2={W - 8} y1={PAD_T + plotH} y2={PAD_T + plotH} className="chart-axis" />

        {data.map((d, i) => {
          const cx = PAD_L + i * step + step / 2;
          return (
            <g key={i}>
              {/* cột dữ liệu: bo đầu trên, neo baseline */}
              {d.value > 0 && (
                <path
                  className={`chart-bar${hover === i ? " is-hover" : ""}`}
                  d={`M${cx - barW / 2},${PAD_T + plotH}
                      V${y(d.value) + 4}
                      Q${cx - barW / 2},${y(d.value)} ${cx - barW / 2 + 4},${y(d.value)}
                      H${cx + barW / 2 - 4}
                      Q${cx + barW / 2},${y(d.value)} ${cx + barW / 2},${y(d.value) + 4}
                      V${PAD_T + plotH} Z`}
                />
              )}
              {d.value === 0 && (
                <rect className="chart-bar-zero" x={cx - barW / 2} y={PAD_T + plotH - 2} width={barW} height={2} rx={1} />
              )}
              {/* vùng hover rộng hơn cột */}
              <rect
                x={PAD_L + i * step}
                y={PAD_T}
                width={step}
                height={plotH + PAD_B}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              <text x={cx} y={H - 6} className={`chart-tick${i % 2 ? " chart-tick-alt" : ""}`} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="chart-tooltip"
          style={{ left: `${((PAD_L + hover * step + step / 2) / W) * 100}%` }}
        >
          <b>{data[hover].value}</b> đơn · {data[hover].full}
        </div>
      )}
    </div>
  );
}
