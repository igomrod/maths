import React, { useState } from 'react';
import { KeyRound, Sparkles } from 'lucide-react';

interface FamilyCodeModalProps {
  isOpen: boolean;
  initialCode?: string;
  errorMessage?: string | null;
  onSaveCode: (code: string) => void;
  onClose?: () => void;
}

export const FamilyCodeModal: React.FC<FamilyCodeModalProps> = ({
  isOpen,
  initialCode = '',
  errorMessage,
  onSaveCode,
  onClose,
}) => {
  const [code, setCode] = useState(initialCode);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onSaveCode(code.trim());
  };

  return (
    <div
      data-testid="family-code-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-3xl border-4 border-pink-300 bg-white p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-3xl">
          🔑
        </div>
        <h2 className="font-display text-2xl font-bold text-indigo-950">
          Contraseña Mágica Familiar
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Introduce la palabra secreta de casa para desbloquear la magia. ¡Se quedará guardada en
          tu tablet para siempre!
        </p>

        {errorMessage && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="relative">
            <KeyRound className=" absolute top-4 left-4 h-5 w-5 text-slate-400" />
            <input
              type="password"
              data-testid="family-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Escribe la clave secreta..."
              autoFocus
              className="w-full rounded-2xl border-3 border-slate-200 bg-slate-50 py-3.5 pr-4 pl-12 text-lg font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border-2 border-slate-200 py-3 font-display text-base font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              data-testid="save-family-code-btn"
              disabled={!code.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-500 py-3.5 font-display text-base font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" />
              <span>¡Guardar en mi Tablet!</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
