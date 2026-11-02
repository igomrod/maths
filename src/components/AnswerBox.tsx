import React, { useState, useEffect } from 'react';
import { StoredProblem } from '../types/problem';
import { Send, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';

interface AnswerBoxProps {
  storedProblem: StoredProblem;
  onSubmitAnswer: (answerText: string) => Promise<void>;
  isValidating: boolean;
}

export const AnswerBox: React.FC<AnswerBoxProps> = ({
  storedProblem,
  onSubmitAnswer,
  isValidating,
}) => {
  const [answerText, setAnswerText] = useState('');
  const isSolved = storedProblem.status === 'solved';
  const lastAttempt =
    storedProblem.attempts.length > 0
      ? storedProblem.attempts[storedProblem.attempts.length - 1]
      : null;

  useEffect(() => {
    if (storedProblem.status === 'solved' && storedProblem.finalAnswer) {
      setAnswerText(storedProblem.finalAnswer);
    } else {
      setAnswerText('');
    }
  }, [storedProblem.id, storedProblem.status, storedProblem.finalAnswer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || isValidating || isSolved) return;
    await onSubmitAnswer(answerText.trim());
  };

  return (
    <section
      aria-label="Tu respuesta"
      className="rounded-3xl border-4 border-emerald-200 bg-white p-6 shadow-lg sm:p-8"
    >
      <h3 className="font-display text-xl font-bold text-slate-800 sm:text-2xl">
        2. Escribe aquí tu solución ✍️
      </h3>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        Cuando termines la cuenta en tu papel, escribe el resultado con tus palabras (por ejemplo:
        &quot;42 magdalenas&quot; o &quot;Le quedan 42&quot;).
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <textarea
          data-testid="answer-input"
          rows={2}
          disabled={isSolved || isValidating}
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Escribe aquí tu respuesta..."
          className="w-full rounded-2xl border-3 border-slate-300 bg-slate-50 p-4 text-xl font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:bg-emerald-50/50 disabled:text-emerald-900"
        />

        {!isSolved && (
          <div className="flex justify-end">
            <button
              type="submit"
              data-testid="submit-answer-btn"
              disabled={!answerText.trim() || isValidating}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 font-display text-lg font-bold text-white shadow-md transition hover:brightness-105 active:scale-95 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
              <span>
                {isValidating ? 'La profe mágica está corrigiendo...' : '¡Comprobar Respuesta!'}
              </span>
            </button>
          </div>
        )}
      </form>

      {/* Feedback Banner */}
      {lastAttempt && (
        <div
          data-testid="validation-feedback"
          className={`mt-6 rounded-2xl border-3 p-5 transition-all ${
            lastAttempt.validation.isCorrect
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : lastAttempt.validation.status === 'partial'
                ? 'border-amber-300 bg-amber-50 text-amber-950'
                : 'border-rose-200 bg-rose-50 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {lastAttempt.validation.isCorrect ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              ) : lastAttempt.validation.status === 'partial' ? (
                <Sparkles className="h-7 w-7 text-amber-500" />
              ) : (
                <HelpCircle className="h-7 w-7 text-rose-500" />
              )}
            </div>
            <div>
              <p className="font-display text-lg font-bold">
                {lastAttempt.validation.encouragement}
              </p>
              <p className="mt-1 text-base font-semibold leading-relaxed">
                {lastAttempt.validation.feedback}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
