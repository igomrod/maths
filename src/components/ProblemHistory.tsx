import React from 'react';
import { StoredProblem } from '../types/problem';
import { groupProblemsByDate } from '../services/storage';
import { Calendar, CheckCircle2, Clock, Trash2, Lock } from 'lucide-react';

interface ProblemHistoryProps {
  problems: StoredProblem[];
  activeProblemId: string | null;
  onSelectProblem: (problemId: string) => void;
  onDeletePendingProblem: (problemId: string) => void;
}

export const ProblemHistory: React.FC<ProblemHistoryProps> = ({
  problems,
  activeProblemId,
  onSelectProblem,
  onDeletePendingProblem,
}) => {
  const dateGroups = groupProblemsByDate(problems);

  return (
    <aside
      data-testid="problem-history"
      aria-label="Historial de problemas por fecha"
      className="rounded-3xl border-4 border-purple-200 bg-white/95 p-5 shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-purple-600" />
          <h2 className="font-display text-xl font-bold text-slate-800">
            Mis Problemas por Día
          </h2>
        </div>
        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-extrabold text-purple-900">
          {problems.length} en total
        </span>
      </div>

      <p className="mb-4 text-xs font-semibold text-slate-500">
        🌟 Los problemas resueltos se guardan para siempre como trofeos. Solo puedes borrar los que están pendientes.
      </p>

      {dateGroups.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-400">
          Todavía no hay problemas guardados. ¡Pulsa en &quot;¡Nuevo Problema!&quot; para empezar!
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {dateGroups.map((group) => (
            <div
              key={group.dateKey}
              data-testid={`date-group-${group.dateKey}`}
              className="rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-3.5"
            >
              {/* Date Group Header */}
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <h3
                  data-testid="date-group-header"
                  className="font-display text-base font-bold text-indigo-950 capitalize"
                >
                  📅 {group.label}
                </h3>
                <div className="flex items-center gap-2 text-xs font-extrabold">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-800">
                    ⭐ {group.solvedCount} resueltos
                  </span>
                  {group.pendingCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-800">
                      ⏳ {group.pendingCount} pendientes
                    </span>
                  )}
                </div>
              </div>

              {/* Problems list for this date */}
              <ul className="flex flex-col gap-2">
                {group.problems.map((item) => {
                  const isActive = item.id === activeProblemId;
                  const isSolved = item.status === 'solved';

                  return (
                    <li
                      key={item.id}
                      data-testid={`history-item-${item.id}`}
                      data-status={item.status}
                      className={`group flex items-center justify-between gap-2 rounded-xl border-2 p-3 transition-all ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50/90 shadow-xs'
                          : 'border-white bg-white hover:border-indigo-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProblem(item.id)}
                        className="flex flex-1 items-start gap-2.5 text-left"
                      >
                        <div className="mt-0.5 shrink-0">
                          {isSolved ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-bold text-slate-800">
                            {item.problem.title}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            {isSolved ? (
                              <span className="text-emerald-700">
                                ✅ Resuelto: &quot;{item.finalAnswer}&quot;
                              </span>
                            ) : (
                              <span className="text-amber-700">⏳ Pendiente de resolver</span>
                            )}
                          </p>
                        </div>
                      </button>

                      {/* Action: Delete only allowed if pending; Solved shows permanent trophy lock */}
                      {isSolved ? (
                        <span
                          data-testid={`locked-solved-${item.id}`}
                          title="Problema resuelto guardado para siempre"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Trofeo</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          data-testid={`delete-problem-${item.id}`}
                          aria-label={`Borrar problema pendiente ${item.problem.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePendingProblem(item.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Borrar</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};
