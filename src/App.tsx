import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { GeneratedProblem, OperationType, StoredProblem, ValidationResult } from './types/problem';
import {
  addGeneratedProblem,
  deletePendingProblem,
  getSavedAccessCode,
  loadStoredProblems,
  recordProblemAttempt,
  saveAccessCode,
} from './services/storage';
import { OperationPicker } from './components/OperationPicker';
import { ProblemCard } from './components/ProblemCard';
import { AnswerBox } from './components/AnswerBox';
import { ProblemHistory } from './components/ProblemHistory';
import { FamilyCodeModal } from './components/FamilyCodeModal';
import { Star, Trophy, Sparkles, KeyRound } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedOperation, setSelectedOperation] = useState<OperationType>('addition');
  const [problems, setProblems] = useState<StoredProblem[]>(() => loadStoredProblems());
  const [activeProblemId, setActiveProblemId] = useState<string | null>(() => {
    const initial = loadStoredProblems();
    return initial.length > 0 ? initial[0].id : null;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [familyCode, setFamilyCode] = useState<string>(() => getSavedAccessCode());
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState<string | null>(null);

  const activeProblem = problems.find((p) => p.id === activeProblemId) || problems[0] || null;
  const totalSolved = problems.filter((p) => p.status === 'solved').length;

  useEffect(() => {
    if (!activeProblemId && problems.length > 0) {
      setActiveProblemId(problems[0].id);
    }
  }, [problems, activeProblemId]);

  const handleSaveFamilyCode = (newCode: string) => {
    saveAccessCode(newCode);
    setFamilyCode(newCode);
    setCodeErrorMessage(null);
    setIsCodeModalOpen(false);
    setErrorBanner(null);
  };

  const handleGenerateProblem = useCallback(async () => {
    setIsGenerating(true);
    setErrorBanner(null);

    try {
      const recentThemes = problems.slice(0, 8).map((p) => p.problem.title);
      const response = await fetch('/api/generate-problem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-family-code': getSavedAccessCode(),
        },
        body: JSON.stringify({
          operations: [selectedOperation],
          difficulty: '4.º de Primaria (9 años)',
          recentThemes,
        }),
      });

      if (response.status === 401) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        setCodeErrorMessage(
          errData.error || 'Introduce la Contraseña Mágica Familiar para continuar.'
        );
        setIsCodeModalOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error('No se pudo crear el problema en este momento.');
      }

      const generated = (await response.json()) as GeneratedProblem;
      const saved = addGeneratedProblem(generated, [selectedOperation]);
      const refreshed = loadStoredProblems();
      setProblems(refreshed);
      setActiveProblemId(saved.id);
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : '¡Ups! Ocurrió un error al inventar el problema.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [selectedOperation, problems]);

  const handleSubmitAnswer = async (userAnswer: string) => {
    if (!activeProblem) return;
    setIsValidating(true);
    setErrorBanner(null);

    try {
      const response = await fetch('/api/validate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-family-code': getSavedAccessCode(),
        },
        body: JSON.stringify({
          problem: activeProblem.problem,
          userAnswer,
        }),
      });

      if (response.status === 401) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        setCodeErrorMessage(
          errData.error || 'Introduce la Contraseña Mágica Familiar para comprobar tu respuesta.'
        );
        setIsCodeModalOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error('No se pudo comprobar tu respuesta ahora mismo.');
      }

      const validation = (await response.json()) as ValidationResult;
      const updatedList = recordProblemAttempt(activeProblem.id, userAnswer, validation);
      setProblems(updatedList);

      if (validation.isCorrect) {
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignore confetti errors in headless browsers
        }
      }
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : '¡Ups! No pudimos validar la respuesta.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeletePending = (problemId: string) => {
    const result = deletePendingProblem(problemId);
    if (!result.deleted && result.reason) {
      setErrorBanner(result.reason);
      return;
    }
    setProblems(result.problems);
    if (activeProblemId === problemId) {
      setActiveProblemId(result.problems[0]?.id || null);
    }
  };

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <FamilyCodeModal
        isOpen={isCodeModalOpen}
        initialCode={familyCode}
        errorMessage={codeErrorMessage}
        onSaveCode={handleSaveFamilyCode}
        onClose={() => setIsCodeModalOpen(false)}
      />

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Fun Kid-Friendly Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-4 border-pink-300 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-4 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-4xl" role="img" aria-label="Unicornio matemático">
              🦄
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
                Mates Mágicas ✨
              </h1>
              <p className="text-sm font-bold text-pink-100">
                ¡Lee en tu tablet, calcula en tu cuaderno y gana estrellas!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="open-family-code-btn"
              onClick={() => {
                setCodeErrorMessage(null);
                setIsCodeModalOpen(true);
              }}
              title="Configurar Contraseña Mágica Familiar"
              className="flex items-center gap-1.5 rounded-2xl border-2 border-white/30 bg-white/15 px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-white/25"
            >
              <KeyRound className="h-4 w-4" />
              <span>{familyCode ? 'Clave Guardada' : 'Clave Mágica'}</span>
            </button>

            {/* Stars / Solved Trophy Counter */}
            <div
              data-testid="solved-counter"
              className="flex items-center gap-2.5 rounded-2xl border-2 border-amber-300 bg-amber-400/95 px-5 py-2.5 text-amber-950 shadow-md"
            >
              <Trophy className="h-6 w-6 text-amber-800" />
              <div className="text-left">
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                  Problemas Resueltos
                </p>
                <p className="font-display text-xl font-bold leading-none">
                  ⭐ {totalSolved} {totalSolved === 1 ? 'estrella' : 'estrellas'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Operation Picker Bar */}
        <OperationPicker
          selected={selectedOperation}
          onSelect={setSelectedOperation}
          onGenerate={handleGenerateProblem}
          isGenerating={isGenerating}
        />

        {errorBanner && (
          <div
            role="alert"
            className="rounded-2xl border-2 border-rose-300 bg-rose-50 px-5 py-3 font-bold text-rose-800"
          >
            {errorBanner}
          </div>
        )}

        {/* Main Tablet Split Layout: Active Problem on Left (7 cols), Date-Grouped History on Right (5 cols) */}
        <main className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {activeProblem ? (
              <>
                <ProblemCard storedProblem={activeProblem} />
                <AnswerBox
                  storedProblem={activeProblem}
                  onSubmitAnswer={handleSubmitAnswer}
                  isValidating={isValidating}
                />
              </>
            ) : (
              <div
                data-testid="empty-problem-state"
                className="flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-indigo-200 bg-white/90 p-10 text-center shadow-md"
              >
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-4xl">
                  🚀
                </div>
                <h2 className="font-display text-2xl font-bold text-indigo-950">
                  ¡Preparada para un nuevo reto!
                </h2>
                <p className="mt-2 max-w-md text-lg font-semibold text-slate-600">
                  Prepara tu lápiz y tu cuaderno de papel. Elige arriba qué operación quieres
                  practicar y pulsa en <strong>&quot;¡Nuevo Problema!&quot;</strong>.
                </p>
                <button
                  type="button"
                  data-testid="empty-generate-btn"
                  onClick={handleGenerateProblem}
                  disabled={isGenerating}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-7 py-4 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110 active:scale-95"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>{isGenerating ? 'Inventando...' : '¡Crear mi primer problema!'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <ProblemHistory
              problems={problems}
              activeProblemId={activeProblem?.id || null}
              onSelectProblem={(id) => setActiveProblemId(id)}
              onDeletePendingProblem={handleDeletePending}
            />
          </div>
        </main>

        <footer className="py-4 text-center text-xs font-bold text-slate-400">
          <span className="inline-flex items-center gap-1">
            Hecho con <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> para aprender
            matemáticas divirtiéndose (4.º de Primaria)
          </span>
        </footer>
      </div>
    </div>
  );
};

export default App;
