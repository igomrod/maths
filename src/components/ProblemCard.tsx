import React, { useState, useEffect } from 'react';
import { StoredProblem } from '../types/problem';
import { VisualBlock } from './VisualBlock';
import { Lightbulb, BookOpen, CheckCircle2, Clock } from 'lucide-react';

interface ProblemCardProps {
  storedProblem: StoredProblem;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({ storedProblem }) => {
  const [showHint, setShowHint] = useState(false);
  const { problem, status } = storedProblem;

  // Reset hint when switching problems
  useEffect(() => {
    setShowHint(false);
  }, [storedProblem.id]);

  return (
    <article
      data-testid="problem-card"
      className="relative overflow-hidden rounded-3xl border-4 border-sky-200 bg-white p-6 shadow-lg sm:p-8"
    >
      {/* Top Status & Paper Reminder Banner */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-extrabold text-amber-900">
          <BookOpen className="h-4 w-4 text-amber-600" />
          <span>¡Haz las cuentas en tu cuaderno de papel! 📝</span>
        </div>

        {status === 'solved' ? (
          <span
            data-testid="problem-status-badge"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-extrabold text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ¡Problema Resuelto! ⭐
          </span>
        ) : (
          <span
            data-testid="problem-status-badge"
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-4 py-1.5 text-sm font-extrabold text-sky-800"
          >
            <Clock className="h-4 w-4 text-sky-600" />
            Pendiente de resolver
          </span>
        )}
      </div>

      {/* Problem Title */}
      <h2
        data-testid="problem-title"
        className="font-display text-2xl font-bold text-indigo-950 sm:text-3xl"
      >
        {problem.title}
      </h2>

      {/* Story Text */}
      <p
        data-testid="problem-story"
        className="mt-4 text-xl leading-relaxed font-semibold text-slate-700 sm:text-2xl"
      >
        {problem.story}
      </p>

      {/* Dynamic SVG / Visual Block */}
      {problem.visual && <VisualBlock visual={problem.visual} />}

      {/* Highlighted Question */}
      <div className="mt-5 rounded-2xl border-2 border-pink-200 bg-pink-50/80 p-4 sm:p-5">
        <p
          data-testid="problem-question"
          className="font-display text-xl font-bold text-pink-950 sm:text-2xl"
        >
          ❓ {problem.question}
        </p>
      </div>

      {/* Hint Button & Box */}
      {problem.hint && (
        <div className="mt-4">
          <button
            type="button"
            data-testid="toggle-hint-btn"
            onClick={() => setShowHint((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-900 transition hover:bg-amber-100 active:scale-95"
          >
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span>{showHint ? 'Ocultar pista' : '💡 ¿Necesitas una pista?'}</span>
          </button>

          {showHint && (
            <div
              data-testid="problem-hint"
              className="mt-3 rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 text-base font-bold text-amber-950"
            >
              💡 <strong>Pista mágica:</strong> {problem.hint}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
