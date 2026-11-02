import React from 'react';
import { ProblemVisual } from '../types/problem';

interface VisualBlockProps {
  visual: ProblemVisual;
}

export const VisualBlock: React.FC<VisualBlockProps> = ({ visual }) => {
  if (!visual) return null;

  return (
    <div
      data-testid="problem-visual"
      className="my-5 rounded-3xl border-4 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/90 p-5 shadow-inner"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-indigo-600">
        <span>🎨 Pista Visual</span>
        {visual.caption && (
          <span className="font-semibold normal-case text-slate-600">
            — {visual.caption}
          </span>
        )}
      </div>

      {/* 1. Grouped Items Visual */}
      {visual.type === 'grouped_items' && visual.groups && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {visual.groups.map((group, idx) => {
            const safeCount = Math.min(Math.max(Number(group.count) || 1, 1), 15);
            return (
              <div
                key={idx}
                className="flex flex-col items-center rounded-2xl border-2 border-indigo-200 bg-white p-3 shadow-sm"
              >
                <span className="mb-2 rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-800">
                  {group.label}
                </span>
                <div className="flex flex-wrap justify-center gap-1.5 py-1 text-2xl">
                  {Array.from({ length: safeCount }).map((_, i) => (
                    <span key={i} role="img" aria-label={group.label}>
                      {group.emoji || '⭐'}
                    </span>
                  ))}
                </div>
                <span className="mt-1 text-xs font-bold text-slate-500">
                  ({group.count})
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Bar Model SVG Visual (Singapore Math style) */}
      {visual.type === 'bar_model' && visual.barModel && (
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 500 130"
            className="w-full max-w-lg overflow-visible"
            role="img"
            aria-label={visual.caption || 'Diagrama de barras del problema'}
          >
            {/* Total Bracket & Label */}
            <text
              x="250"
              y="22"
              textAnchor="middle"
              className="fill-indigo-900 text-base font-extrabold"
              style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '18px' }}
            >
              {visual.barModel.totalLabel}
            </text>
            <path
              d="M 25 42 Q 25 32 35 32 L 240 32 Q 250 32 250 25 Q 250 32 260 32 L 465 32 Q 475 32 475 42"
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Bar Segments */}
            {(() => {
              const parts = visual.barModel?.parts || [];
              const count = Math.max(parts.length, 1);
              const totalWidth = 450;
              const segWidth = totalWidth / count;
              const defaultColors = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24'];

              return parts.map((part, idx) => {
                const x = 25 + idx * segWidth;
                const fill = part.color || defaultColors[idx % defaultColors.length];
                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={50}
                      width={segWidth - 4}
                      height={58}
                      rx={12}
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth="3"
                    />
                    <text
                      x={x + segWidth / 2}
                      y={75}
                      textAnchor="middle"
                      fill="#ffffff"
                      style={{
                        fontFamily: 'Fredoka, sans-serif',
                        fontSize: '15px',
                        fontWeight: 700,
                      }}
                    >
                      {part.label}
                    </text>
                    <text
                      x={x + segWidth / 2}
                      y={98}
                      textAnchor="middle"
                      fill="#ffffff"
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '18px',
                        fontWeight: 800,
                      }}
                    >
                      {part.value}
                    </text>
                  </g>
                );
              });
            })()}
          </svg>
        </div>
      )}

      {/* 3. Price Tag Shop Visual */}
      {visual.type === 'price_tag_shop' && visual.shopItems && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visual.shopItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-2xl border-2 border-amber-300 bg-amber-50/70 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{item.emoji || '🏷️'}</span>
                <span className="font-bold text-slate-800">{item.name}</span>
              </div>
              <span className="rounded-xl bg-amber-400 px-3 py-1 font-display text-base font-bold text-amber-950 shadow-xs">
                {item.price}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 4. Grid Array Visual */}
      {visual.type === 'grid_array' && visual.grid && (
        <div className="flex flex-col items-center">
          <div className="inline-flex flex-col gap-2 rounded-2xl border-2 border-sky-200 bg-white p-4 shadow-xs">
            {Array.from({
              length: Math.min(Math.max(Number(visual.grid.rows) || 2, 1), 8),
            }).map((_, rIdx) => (
              <div key={rIdx} className="flex items-center gap-2.5">
                <span className="w-14 text-right text-xs font-bold text-slate-400">
                  Fila {rIdx + 1}
                </span>
                <div className="flex gap-2 rounded-xl bg-sky-50 px-3 py-1.5 text-2xl">
                  {Array.from({
                    length: Math.min(Math.max(Number(visual.grid?.cols) || 2, 1), 10),
                  }).map((__, cIdx) => (
                    <span key={cIdx}>{visual.grid?.emoji || '🌟'}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {visual.grid.label && (
            <p className="mt-2 text-xs font-bold text-sky-700">{visual.grid.label}</p>
          )}
        </div>
      )}
    </div>
  );
};
